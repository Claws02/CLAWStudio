#!/usr/bin/env node
/**
 * The studio build.
 *
 * One compiler per model kind, one report, one exit code. Adding a room later
 * means adding a compiler to the registry below — the shell, the checks and CI
 * don't change.
 *
 *   node scripts/build.mjs            # build once, fail on errors
 *   node scripts/build.mjs --watch    # rebuild on content changes
 */
import { readFileSync, writeFileSync, mkdirSync, existsSync, watch } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';
import { videoCompiler } from './compilers/video.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

/** Every compiler the studio has. Phases add to this list and nothing else. */
const COMPILERS = [videoCompiler];

const INDEX_FILE = join(ROOT, 'studio', 'generated', 'index.ts');

/* ------------------------------------------------------------------ refs -- */
/**
 * Cross-surface reference checking.
 *
 * The authority on this format is studio/spine/refs.ts; this is the build-time
 * half, kept deliberately small. If the two ever disagree, refs.ts wins and
 * this should be corrected to match.
 */
const REF_PATTERN = /\b([a-z]+):\/\/([a-z0-9][a-z0-9-]*)#([^\s"'`)\]},]+)/g;

const walk = (root, path) => {
  let cur = root;
  for (const part of path.split('.')) {
    if (cur === null || typeof cur !== 'object') return `"${part}" — nothing to read there`;
    if (Array.isArray(cur)) {
      const found = cur.find((x) => x && typeof x === 'object' && x.id === part);
      if (found === undefined) return `no item with id "${part}"`;
      cur = found;
      continue;
    }
    if (!(part in cur)) return `no field "${part}"`;
    cur = cur[part];
  }
  return null;
};

/** Derived video paths the resolver understands but that aren't fields. */
const DERIVED = { video: /^scenario\.[a-z0-9-]+\.(winner|runnerUp|score)$/ };

const checkRefs = (byKind, models, diagnostics) => {
  for (const model of models) {
    let text;
    try {
      text = readFileSync(join(ROOT, model.path), 'utf8');
    } catch {
      continue;
    }
    const refs = [...text.matchAll(REF_PATTERN)].map((m) => ({
      raw: m[0],
      kind: m[1],
      modelId: m[2],
      path: m[3],
    }));
    if (refs.length) model.refs = refs.map((r) => r.raw);

    for (const ref of refs) {
      const data = byKind[ref.kind];
      if (!data) {
        diagnostics.push({
          level: 'warn',
          path: model.path,
          message: `reference "${ref.raw}" points at the ${ref.kind} room, which isn't built yet`,
        });
        continue;
      }
      const target = data[ref.modelId];
      if (!target) {
        diagnostics.push({
          level: 'error',
          path: model.path,
          message: `reference "${ref.raw}" points at unknown ${ref.kind} model "${ref.modelId}"`,
        });
        continue;
      }
      if (DERIVED[ref.kind]?.test(ref.path)) continue;
      const problem = walk(target, ref.path);
      if (problem) {
        diagnostics.push({
          level: 'error',
          path: model.path,
          message: `reference "${ref.raw}" doesn't resolve — ${problem}`,
        });
      }
    }
  }
};

/* ----------------------------------------------------------------- write -- */
/** Only writes when the bytes changed, so --watch doesn't chase its own tail. */
const writeIfChanged = (absPath, contents) => {
  if (existsSync(absPath) && readFileSync(absPath, 'utf8') === contents) return false;
  mkdirSync(dirname(absPath), { recursive: true });
  writeFileSync(absPath, contents, 'utf8');
  return true;
};

const commit = () => {
  try {
    return execFileSync('git', ['rev-parse', '--short', 'HEAD'], { cwd: ROOT, encoding: 'utf8' }).trim();
  } catch {
    return undefined;
  }
};

/* ----------------------------------------------------------------- build -- */
const build = () => {
  const diagnostics = [];
  const models = [];
  const byKind = {};
  const emit = [];

  for (const compiler of COMPILERS) {
    const result = compiler.run(ROOT);
    diagnostics.push(...result.diagnostics);
    models.push(...result.models);
    emit.push(...result.emit);
    if (result.data) byKind[compiler.kind] = result.data;
  }

  checkRefs(byKind, models, diagnostics);

  const errors = diagnostics.filter((d) => d.level === 'error');
  const warnings = diagnostics.filter((d) => d.level === 'warn');

  for (const w of warnings) console.warn(`  ! ${w.path}: ${w.message}`);

  if (errors.length) {
    console.error('\n✗ build failed:');
    for (const e of errors) console.error(`  - ${e.path}: ${e.message}`);
    console.error('');
    return false;
  }

  for (const file of emit) writeIfChanged(join(ROOT, file.path), file.contents);

  const index = {
    models: models.sort((a, b) => a.path.localeCompare(b.path)),
    // Errors never reach here; warnings ship so the shell can show them.
    diagnostics: warnings,
    commit: commit(),
    builtAt: new Date().toISOString(),
  };
  writeIfChanged(
    INDEX_FILE,
    `// GENERATED by scripts/build.mjs — do not edit.\n` +
      `import type { WorkspaceIndex } from '../spine/model';\n\n` +
      `export const workspace: WorkspaceIndex = ${JSON.stringify(index, null, 2)};\n`,
  );

  const counts = COMPILERS.map((c) => {
    const n = models.filter((m) => m.kind === c.kind).length;
    return `${n} ${c.label}${n === 1 ? '' : 's'}`;
  }).join(', ');
  console.log(`✓ build: ${counts}, ${warnings.length} warning(s)`);
  return true;
};

const ok = build();

if (process.argv.includes('--watch')) {
  const dirs = [...new Set(COMPILERS.flatMap((c) => c.watches ?? []))];
  console.log(`… watching ${dirs.join(', ')} for changes`);
  let timer = null;
  const rerun = () => {
    clearTimeout(timer);
    timer = setTimeout(build, 80);
  };
  for (const d of dirs) {
    const abs = join(ROOT, d);
    if (existsSync(abs)) watch(abs, { recursive: true }, rerun);
  }
} else if (!ok) {
  process.exit(1);
}
