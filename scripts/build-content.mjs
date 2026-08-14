#!/usr/bin/env node
/**
 * Reads content/brand.yaml + content/videos/*.yaml, validates them, and emits
 * src/content/generated.ts.
 *
 * Runs before studio / web / render, so a bad content file fails loudly with a
 * line you can act on instead of rendering 40 seconds of broken video.
 */
import { readFileSync, writeFileSync, readdirSync, existsSync, mkdirSync, watch } from 'node:fs';
import { join, dirname, basename } from 'node:path';
import { fileURLToPath } from 'node:url';
import yaml from 'js-yaml';
import { z } from 'zod';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const VIDEO_DIR = join(ROOT, 'content', 'videos');
const BRAND_FILE = join(ROOT, 'content', 'brand.yaml');
const OUT_FILE = join(ROOT, 'src', 'content', 'generated.ts');

const id = z.string().regex(/^[a-z0-9][a-z0-9-]*$/, 'must be lower-case kebab-case');

const criterion = z.object({ id, name: z.string(), hint: z.string().optional() });

const contender = z.object({
  id,
  name: z.string(),
  tagline: z.string().optional(),
  specs: z.record(z.string(), z.string()).optional(),
  ratings: z.record(z.string(), z.number().min(1).max(5)),
  strengths: z.array(z.string()).optional(),
  weaknesses: z.array(z.string()).optional(),
  color: z.string().optional(),
});

const verdict = z.object({
  winner: z.string().optional(),
  why: z.string(),
  avoid: z.string().optional(),
  avoidWhy: z.string().optional(),
});

const scenario = z.object({
  id,
  name: z.string(),
  context: z.string().optional(),
  weights: z.record(z.string(), z.number().min(0).max(5)),
  verdict: verdict.optional(),
});

const base = {
  voice: z.string().optional(),
  duration: z.number().positive().optional(),
  formats: z.array(z.enum(['vertical', 'horizontal', 'square'])).optional(),
};

const scene = z.discriminatedUnion('type', [
  z.object({ type: z.literal('hook'), text: z.string(), sub: z.string().optional(), ...base }),
  z.object({ type: z.literal('lineup'), title: z.string().optional(), ...base }),
  z.object({ type: z.literal('spec'), title: z.string().optional(), rows: z.array(z.string()).optional(), ...base }),
  z.object({ type: z.literal('versus'), a: z.string(), b: z.string(), title: z.string().optional(), ...base }),
  z.object({ type: z.literal('scenario'), id: z.string(), ...base }),
  z.object({ type: z.literal('scorecard'), title: z.string().optional(), ...base }),
  z.object({ type: z.literal('takeaway'), title: z.string().optional(), bullets: z.array(z.string()), ...base }),
  z.object({ type: z.literal('outro'), text: z.string().optional(), sub: z.string().optional(), ...base }),
]);

const video = z.object({
  id,
  title: z.string(),
  subject: z.string(),
  tagline: z.string().optional(),
  formats: z.array(z.enum(['vertical', 'horizontal', 'square'])).optional(),
  criteria: z.array(criterion).min(1),
  contenders: z.array(contender).min(2),
  scenarios: z.array(scenario).min(1),
  scenes: z.array(scene).min(1),
});

const brand = z.object({
  name: z.string(),
  handle: z.string().optional(),
  tagline: z.string().optional(),
  accent: z.string().optional(),
  readingRate: z.number().positive().optional(),
});

const problems = [];
const warnings = [];

const fail = (file, msg) => problems.push(`${file}: ${msg}`);
const warn = (file, msg) => warnings.push(`${file}: ${msg}`);

/** Cross-field checks zod can't express: do the ids actually line up? */
const crossCheck = (v, file) => {
  const criterionIds = new Set(v.criteria.map((c) => c.id));
  const contenderIds = new Set(v.contenders.map((c) => c.id));
  const scenarioIds = new Set(v.scenarios.map((s) => s.id));

  for (const c of v.contenders) {
    for (const k of Object.keys(c.ratings)) {
      if (!criterionIds.has(k)) fail(file, `contender "${c.id}" rates unknown criterion "${k}"`);
    }
    for (const cr of v.criteria) {
      if (!(cr.id in c.ratings)) warn(file, `contender "${c.id}" has no rating for "${cr.id}" — treated as 0`);
    }
  }

  for (const s of v.scenarios) {
    for (const k of Object.keys(s.weights)) {
      if (!criterionIds.has(k)) fail(file, `scenario "${s.id}" weights unknown criterion "${k}"`);
    }
    if (Object.values(s.weights).every((w) => w <= 0)) {
      fail(file, `scenario "${s.id}" has no non-zero weights — every score would be 0`);
    }
    for (const key of ['winner', 'avoid']) {
      const ref = s.verdict?.[key];
      if (ref && !contenderIds.has(ref)) fail(file, `scenario "${s.id}" verdict.${key} refers to unknown contender "${ref}"`);
    }
  }

  for (const [i, sc] of v.scenes.entries()) {
    const where = `scene[${i}] (${sc.type})`;
    if (sc.type === 'versus') {
      for (const key of ['a', 'b']) {
        if (!contenderIds.has(sc[key])) fail(file, `${where} refers to unknown contender "${sc[key]}"`);
      }
    }
    if (sc.type === 'scenario' && !scenarioIds.has(sc.id)) {
      fail(file, `${where} refers to unknown scenario "${sc.id}"`);
    }
    if (sc.type === 'spec' && sc.rows) {
      const known = new Set(v.contenders.flatMap((c) => Object.keys(c.specs ?? {})));
      for (const r of sc.rows) if (!known.has(r)) fail(file, `${where} asks for spec row "${r}" that no contender defines`);
    }
    if (sc.voice && !existsSync(join(ROOT, 'public', sc.voice))) {
      warn(file, `${where} references voice "${sc.voice}" which isn't in public/ yet — timing will be estimated`);
    }
  }

  // Editorial check: does the video actually earn its premise?
  const score = (c, s) => {
    let num = 0;
    let den = 0;
    for (const cr of v.criteria) {
      const w = s.weights[cr.id] ?? 0;
      if (w <= 0) continue;
      num += w * (c.ratings[cr.id] ?? 0);
      den += w * 5;
    }
    return den === 0 ? 0 : num / den;
  };
  const winners = v.scenarios.map((s) => {
    const ranked = [...v.contenders].sort((a, b) => score(b, s) - score(a, s));
    const computed = ranked[0]?.id;
    if (s.verdict?.winner && s.verdict.winner !== computed) {
      warn(
        file,
        `scenario "${s.id}": you called "${s.verdict.winner}" the winner but your own weights rank "${computed}" first — fix the ratings, the weights, or the take`,
      );
    }
    return s.verdict?.winner ?? computed;
  });
  if (new Set(winners).size === 1 && v.scenarios.length > 1) {
    warn(file, `every scenario has the same winner ("${winners[0]}") — there's no "it depends" here yet`);
  }
};

const load = (file, schema, label) => {
  const raw = yaml.load(readFileSync(file, 'utf8'));
  const parsed = schema.safeParse(raw);
  if (!parsed.success) {
    for (const issue of parsed.error.issues) {
      fail(label, `${issue.path.join('.') || '(root)'} — ${issue.message}`);
    }
    return null;
  }
  return parsed.data;
};

const build = () => {
  problems.length = 0;
  warnings.length = 0;

  if (!existsSync(BRAND_FILE)) {
    console.error(`✗ missing ${BRAND_FILE}`);
    process.exit(1);
  }
  const brandData = load(BRAND_FILE, brand, 'brand.yaml');

  const files = existsSync(VIDEO_DIR)
    ? readdirSync(VIDEO_DIR).filter((f) => f.endsWith('.yaml') || f.endsWith('.yml')).sort()
    : [];

  const videos = [];
  const seen = new Set();
  for (const f of files) {
    const label = `videos/${f}`;
    const v = load(join(VIDEO_DIR, f), video, label);
    if (!v) continue;
    if (v.id !== basename(f).replace(/\.ya?ml$/, '')) {
      warn(label, `id "${v.id}" doesn't match the filename — the filename is ignored, the id is what's used`);
    }
    if (seen.has(v.id)) fail(label, `duplicate video id "${v.id}"`);
    seen.add(v.id);
    crossCheck(v, label);
    videos.push(v);
  }

  for (const w of warnings) console.warn(`  ! ${w}`);
  if (problems.length) {
    console.error('\n✗ content build failed:');
    for (const p of problems) console.error(`  - ${p}`);
    console.error('');
    return false;
  }

  mkdirSync(dirname(OUT_FILE), { recursive: true });
  writeFileSync(
    OUT_FILE,
    `// GENERATED by scripts/build-content.mjs — do not edit. Edit content/*.yaml instead.\n` +
      `import type { Brand, Video } from './types';\n\n` +
      `export const brand: Brand = ${JSON.stringify(brandData, null, 2)};\n\n` +
      `export const videos: Video[] = ${JSON.stringify(videos, null, 2)};\n\n` +
      `export const videoById = (id: string): Video | undefined => videos.find((v) => v.id === id);\n`,
    'utf8',
  );
  console.log(`✓ content: ${videos.length} video(s), ${warnings.length} warning(s) → src/content/generated.ts`);
  return true;
};

const ok = build();

if (process.argv.includes('--watch')) {
  console.log('… watching content/ for changes');
  let timer = null;
  const rerun = () => {
    clearTimeout(timer);
    timer = setTimeout(build, 80);
  };
  watch(join(ROOT, 'content'), { recursive: true }, rerun);
} else if (!ok) {
  process.exit(1);
}
