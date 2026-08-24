import type { ModelKind } from './kinds';

/**
 * What the shell knows about a model without opening it. Produced by the build
 * and shipped in the generated index, so the file tree renders instantly and
 * offline.
 */
export interface ModelMeta {
  id: string;
  kind: ModelKind;
  /** Repo-relative path. The identity of the file, everywhere. */
  path: string;
  title: string;
  subtitle?: string;
  /** Refs this model points at. Used to detect dangling refs at build time. */
  refs?: string[];
}

/** A problem found by a compiler. Same shape for every kind — one report. */
export interface Diagnostic {
  /** `error` fails the build; `warn` is printed and shipped to the shell. */
  level: 'error' | 'warn';
  /** Repo-relative path the problem belongs to. */
  path: string;
  message: string;
  /**
   * True when the check is about meaning rather than syntax — a verdict that
   * contradicts its own weights, a budget whose lines don't sum, a sim whose
   * results are stale. These are the checks worth having.
   */
  semantic?: boolean;
}

export interface WorkspaceIndex {
  models: ModelMeta[];
  diagnostics: Diagnostic[];
  /** Commit the index was built from, when the build knows it. */
  commit?: string;
  builtAt: string;
}
