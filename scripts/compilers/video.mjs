/**
 * The video compiler.
 *
 * Reads content/brand.yaml + content/videos/*.yaml, validates them, and emits
 * src/content/generated.ts. This is the compiler the whole studio pattern was
 * generalised from: schema check, then cross-reference check, then a semantic
 * check that knows what the document is supposed to *mean*.
 *
 * Compilers never print and never exit — they return models, diagnostics and
 * the files to emit. scripts/build.mjs owns the report and the exit code.
 */
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join, basename } from 'node:path';
import yaml from 'js-yaml';
import { z } from 'zod';

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

/** score = Σ(weight × rating) / Σ(weight × 5). Mirrors src/content/scoring.ts. */
const scoreOf = (contenderData, scenarioData, criteria) => {
  let num = 0;
  let den = 0;
  for (const c of criteria) {
    const w = scenarioData.weights[c.id] ?? 0;
    if (w <= 0) continue;
    num += w * (contenderData.ratings[c.id] ?? 0);
    den += w * 5;
  }
  return den === 0 ? 0 : num / den;
};

/** Cross-field checks zod can't express: do the ids actually line up? */
const crossCheck = (v, path, root, out) => {
  const fail = (message) => out.push({ level: 'error', path, message });
  const warn = (message, semantic = false) => out.push({ level: 'warn', path, message, semantic });

  const criterionIds = new Set(v.criteria.map((c) => c.id));
  const contenderIds = new Set(v.contenders.map((c) => c.id));
  const scenarioIds = new Set(v.scenarios.map((s) => s.id));

  for (const c of v.contenders) {
    for (const k of Object.keys(c.ratings)) {
      if (!criterionIds.has(k)) fail(`contender "${c.id}" rates unknown criterion "${k}"`);
    }
    for (const cr of v.criteria) {
      if (!(cr.id in c.ratings)) warn(`contender "${c.id}" has no rating for "${cr.id}" — treated as 0`);
    }
  }

  for (const s of v.scenarios) {
    for (const k of Object.keys(s.weights)) {
      if (!criterionIds.has(k)) fail(`scenario "${s.id}" weights unknown criterion "${k}"`);
    }
    if (Object.values(s.weights).every((w) => w <= 0)) {
      fail(`scenario "${s.id}" has no non-zero weights — every score would be 0`);
    }
    for (const key of ['winner', 'avoid']) {
      const ref = s.verdict?.[key];
      if (ref && !contenderIds.has(ref)) {
        fail(`scenario "${s.id}" verdict.${key} refers to unknown contender "${ref}"`);
      }
    }
  }

  for (const [i, sc] of v.scenes.entries()) {
    const where = `scene[${i}] (${sc.type})`;
    if (sc.type === 'versus') {
      for (const key of ['a', 'b']) {
        if (!contenderIds.has(sc[key])) fail(`${where} refers to unknown contender "${sc[key]}"`);
      }
    }
    if (sc.type === 'scenario' && !scenarioIds.has(sc.id)) {
      fail(`${where} refers to unknown scenario "${sc.id}"`);
    }
    if (sc.type === 'spec' && sc.rows) {
      const known = new Set(v.contenders.flatMap((c) => Object.keys(c.specs ?? {})));
      for (const r of sc.rows) {
        if (!known.has(r)) fail(`${where} asks for spec row "${r}" that no contender defines`);
      }
    }
    if (sc.voice && !existsSync(join(root, 'public', sc.voice))) {
      warn(`${where} references voice "${sc.voice}" which isn't in public/ yet — timing will be estimated`);
    }
  }

  // The semantic checks: does the video actually earn its premise?
  const winners = v.scenarios.map((s) => {
    const ranked = [...v.contenders].sort(
      (a, b) => scoreOf(b, s, v.criteria) - scoreOf(a, s, v.criteria),
    );
    const computed = ranked[0]?.id;
    if (s.verdict?.winner && s.verdict.winner !== computed) {
      warn(
        `scenario "${s.id}": you called "${s.verdict.winner}" the winner but your own weights rank ` +
          `"${computed}" first — fix the ratings, the weights, or the take`,
        true,
      );
    }
    return s.verdict?.winner ?? computed;
  });
  if (new Set(winners).size === 1 && v.scenarios.length > 1) {
    warn(`every scenario has the same winner ("${winners[0]}") — there's no "it depends" here yet`, true);
  }
};

const load = (file, schema, path, out) => {
  const raw = yaml.load(readFileSync(file, 'utf8'));
  const parsed = schema.safeParse(raw);
  if (!parsed.success) {
    for (const issue of parsed.error.issues) {
      out.push({ level: 'error', path, message: `${issue.path.join('.') || '(root)'} — ${issue.message}` });
    }
    return null;
  }
  return parsed.data;
};

export const videoCompiler = {
  kind: 'video',
  label: 'video',
  /** Directories this compiler watches, relative to the repo root. */
  watches: ['content'],

  run(root) {
    const diagnostics = [];
    const models = [];

    const brandFile = join(root, 'content', 'brand.yaml');
    if (!existsSync(brandFile)) {
      return {
        models,
        diagnostics: [{ level: 'error', path: 'content/brand.yaml', message: 'missing' }],
        emit: [],
      };
    }
    const brandData = load(brandFile, brand, 'content/brand.yaml', diagnostics);

    const dir = join(root, 'content', 'videos');
    const files = existsSync(dir)
      ? readdirSync(dir)
          .filter((f) => f.endsWith('.yaml') || f.endsWith('.yml'))
          .sort()
      : [];

    const videos = [];
    const seen = new Set();
    for (const f of files) {
      const path = `content/videos/${f}`;
      const v = load(join(dir, f), video, path, diagnostics);
      if (!v) continue;
      if (v.id !== basename(f).replace(/\.ya?ml$/, '')) {
        diagnostics.push({
          level: 'warn',
          path,
          message: `id "${v.id}" doesn't match the filename — the filename is ignored, the id is what's used`,
        });
      }
      if (seen.has(v.id)) {
        diagnostics.push({ level: 'error', path, message: `duplicate video id "${v.id}"` });
      }
      seen.add(v.id);
      crossCheck(v, path, root, diagnostics);
      videos.push(v);
      models.push({ id: v.id, kind: 'video', path, title: v.title, subtitle: v.subject });
    }

    const contents =
      `// GENERATED by scripts/build.mjs — do not edit. Edit content/*.yaml instead.\n` +
      `import type { Brand, Video } from './types';\n\n` +
      `export const brand: Brand = ${JSON.stringify(brandData, null, 2)};\n\n` +
      `export const videos: Video[] = ${JSON.stringify(videos, null, 2)};\n\n` +
      `export const videoById = (id: string): Video | undefined => videos.find((v) => v.id === id);\n`;

    return {
      models,
      diagnostics,
      emit: [{ path: 'src/content/generated.ts', contents }],
      /** Handed to the ref checker so `video://…` targets can be verified. */
      data: Object.fromEntries(videos.map((v) => [v.id, v])),
    };
  },
};
