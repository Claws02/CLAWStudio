#!/usr/bin/env node
/**
 * Renders one or more compositions to out/.
 *
 *   npm run render                          # every video, every format
 *   npm run render -- machine-control-platform
 *   npm run render -- machine-control-platform vertical
 *   npm run render -- --all --format vertical
 *
 * Set REMOTION_BROWSER_EXECUTABLE to reuse an existing Chromium instead of
 * letting Remotion download its own headless shell.
 */
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = join(ROOT, 'out');
const GENERATED = join(ROOT, 'src', 'content', 'generated.ts');

if (!existsSync(GENERATED)) {
  console.error('✗ src/content/generated.ts is missing — run `npm run content` first.');
  process.exit(1);
}

const ALL_FORMATS = ['vertical', 'horizontal', 'square'];

const argv = process.argv.slice(2);
const flags = {};
const positional = [];
for (let i = 0; i < argv.length; i += 1) {
  const a = argv[i];
  if (!a.startsWith('--')) {
    positional.push(a);
    continue;
  }
  const name = a.slice(2);
  const next = argv[i + 1];
  if (next && !next.startsWith('--')) {
    flags[name] = next;
    i += 1;
  } else {
    flags[name] = true;
  }
}

const norm = (v) => (typeof v === 'string' ? v : undefined);
const wantVideo = norm(flags.video) ?? positional.find((p) => !ALL_FORMATS.includes(p));
const wantFormat = norm(flags.format) ?? positional.find((p) => ALL_FORMATS.includes(p));

// Parse the generated file without a TS toolchain: it's plain JSON payloads.
const source = await import(pathToFileURL(GENERATED).href).catch(() => null);
let videos;
if (source?.videos) {
  videos = source.videos;
} else {
  const { readFileSync } = await import('node:fs');
  const text = readFileSync(GENERATED, 'utf8');
  const match = text.match(/export const videos: Video\[\] = ([\s\S]*?);\n\nexport const videoById/);
  if (!match) {
    console.error('✗ could not read videos out of generated.ts — run `npm run content`.');
    process.exit(1);
  }
  videos = JSON.parse(match[1]);
}

const jobs = [];
for (const v of videos) {
  if (wantVideo && v.id !== wantVideo) continue;
  for (const f of v.formats ?? ALL_FORMATS) {
    if (wantFormat && f !== wantFormat) continue;
    jobs.push({ id: `${v.id}--${f}`, file: `${v.id}-${f}.mp4` });
  }
}

if (jobs.length === 0) {
  console.error(`✗ nothing matched (video=${wantVideo ?? 'any'} format=${wantFormat ?? 'any'})`);
  console.error(`  known videos: ${videos.map((v) => v.id).join(', ') || '(none)'}`);
  process.exit(1);
}

mkdirSync(OUT, { recursive: true });

const browser = process.env.REMOTION_BROWSER_EXECUTABLE;
let failed = 0;

for (const job of jobs) {
  console.log(`\n▶ rendering ${job.id}`);
  const args = [
    'remotion',
    'render',
    'src/index.ts',
    job.id,
    join('out', job.file),
    '--codec=h264',
    '--log=info',
  ];
  if (browser) args.push(`--browser-executable=${browser}`);

  const res = spawnSync('npx', args, { stdio: 'inherit', cwd: ROOT, shell: false });
  if (res.status !== 0) {
    failed += 1;
    console.error(`✗ ${job.id} failed`);
  } else {
    console.log(`✓ out/${job.file}`);
  }
}

console.log(`\n${jobs.length - failed}/${jobs.length} rendered into out/`);
process.exit(failed === 0 ? 0 : 1);
