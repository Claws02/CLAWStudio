/**
 * Cross-surface references.
 *
 *   video://machine-control-platform#scenario.line-retrofit.winner
 *   sim://thermal-budget#steady.T_case
 *   sheet://cost-model#Totals!B12
 *
 * One parser and one resolver, used by every surface and by the build. The
 * build resolves them to fail on a dangling ref the same way it already fails
 * on an unknown criterion id; the shell resolves them to show live values.
 */
import { ALL_KINDS, type ModelKind } from './kinds';

export interface Ref {
  kind: ModelKind;
  modelId: string;
  /** Everything after the `#`. Interpretation is kind-specific. */
  path: string;
  /** The original string, for error messages. */
  raw: string;
}

const PATTERN = /^([a-z]+):\/\/([a-z0-9][a-z0-9-]*)#(.+)$/;

export const parseRef = (raw: string): Ref | undefined => {
  const m = PATTERN.exec(raw.trim());
  if (!m) return undefined;
  const [, kind, modelId, path] = m;
  if (!ALL_KINDS.includes(kind as ModelKind)) return undefined;
  return { kind: kind as ModelKind, modelId, path, raw: raw.trim() };
};

/** Every ref embedded in a blob of text. Used to build the reference graph. */
export const findRefs = (text: string): string[] => {
  const out = new Set<string>();
  for (const m of text.matchAll(/\b([a-z]+):\/\/([a-z0-9][a-z0-9-]*)#([^\s"'`)\]},]+)/g)) {
    if (parseRef(m[0])) out.add(m[0]);
  }
  return [...out];
};

export type Resolved =
  | { ok: true; value: unknown; formatted: string }
  | { ok: false; reason: string };

/**
 * A resolver knows how to read one kind of model. Rooms and the build register
 * theirs, so this module never imports a surface — which is what stops the
 * spine from turning into a dependency knot.
 */
export type KindResolver = (ref: Ref) => Resolved;

const resolvers = new Map<ModelKind, KindResolver>();

export const registerResolver = (kind: ModelKind, fn: KindResolver): void => {
  resolvers.set(kind, fn);
};

/** Walk a dotted path through plain data. Shared by most kind resolvers. */
export const walk = (root: unknown, path: string): Resolved => {
  let cur: unknown = root;
  for (const part of path.split('.')) {
    if (cur === null || typeof cur !== 'object') {
      return { ok: false, reason: `"${part}" — nothing to read there` };
    }
    if (Array.isArray(cur)) {
      const found = cur.find((x) => typeof x === 'object' && x && (x as { id?: string }).id === part);
      if (found === undefined) return { ok: false, reason: `no item with id "${part}"` };
      cur = found;
      continue;
    }
    if (!(part in (cur as Record<string, unknown>))) {
      return { ok: false, reason: `no field "${part}"` };
    }
    cur = (cur as Record<string, unknown>)[part];
  }
  return { ok: true, value: cur, formatted: format(cur) };
};

export const format = (value: unknown): string => {
  if (value === null || value === undefined) return '—';
  if (typeof value === 'number') return Number.isInteger(value) ? String(value) : value.toFixed(3);
  if (typeof value === 'string') return value;
  if (typeof value === 'boolean') return value ? 'yes' : 'no';
  return JSON.stringify(value);
};

export const resolveRef = (raw: string): Resolved => {
  const ref = parseRef(raw);
  if (!ref) return { ok: false, reason: `not a reference: "${raw}"` };
  const fn = resolvers.get(ref.kind);
  if (!fn) return { ok: false, reason: `no ${ref.kind} room is built yet` };
  return fn(ref);
};

/** Detects reference cycles. One algorithm, reused by the sheet's circular-ref check. */
export const findCycle = (graph: Map<string, string[]>): string[] | undefined => {
  const state = new Map<string, 'open' | 'done'>();
  const stack: string[] = [];

  const visit = (node: string): string[] | undefined => {
    const s = state.get(node);
    if (s === 'done') return undefined;
    if (s === 'open') return [...stack.slice(stack.indexOf(node)), node];
    state.set(node, 'open');
    stack.push(node);
    for (const next of graph.get(node) ?? []) {
      const cycle = visit(next);
      if (cycle) return cycle;
    }
    stack.pop();
    state.set(node, 'done');
    return undefined;
  };

  for (const node of graph.keys()) {
    const cycle = visit(node);
    if (cycle) return cycle;
  }
  return undefined;
};
