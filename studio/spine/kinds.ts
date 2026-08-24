/**
 * The model-kind registry.
 *
 * A "model" is a plain-text, schema-validated file describing something real.
 * A "surface" is a way of looking at one. This file is the only place that
 * knows which file suffixes exist, so adding a room later is a one-line change
 * here plus a compiler plus a room — never a change to the shell.
 */

export type ModelKind = 'video' | 'sheet' | 'sim' | 'design' | 'doc';

export interface KindSpec {
  kind: ModelKind;
  /** File suffix that identifies this kind. */
  suffix: string;
  label: string;
  /** Room id that edits this kind. */
  room: string;
  /** Series colour, from the instrument-panel palette. */
  color: string;
  /** False until the room that owns this kind is built. */
  live: boolean;
}

export const KINDS: Record<ModelKind, KindSpec> = {
  video: { kind: 'video', suffix: '.video.yaml', label: 'Video', room: 'video', color: '#FFB020', live: true },
  sheet: { kind: 'sheet', suffix: '.sheet.yaml', label: 'Sheet', room: 'sheet', color: '#3ED6D6', live: false },
  sim: { kind: 'sim', suffix: '.sim.yaml', label: 'Sim', room: 'sim', color: '#9B8CFF', live: false },
  design: { kind: 'design', suffix: '.design.yaml', label: 'Design', room: 'design', color: '#49D67F', live: false },
  doc: { kind: 'doc', suffix: '.doc.md', label: 'Doc', room: 'doc', color: '#FF7A5C', live: false },
};

export const ALL_KINDS: ModelKind[] = ['video', 'sheet', 'sim', 'design', 'doc'];

/** Which kind, if any, does this path declare itself to be? */
export const kindOfPath = (path: string): ModelKind | undefined =>
  ALL_KINDS.find((k) => path.endsWith(KINDS[k].suffix));

/**
 * Legacy path support: content/videos/<id>.yaml predates the .video.yaml
 * convention and is still the working format. Treat it as a video model rather
 * than forcing a rename that would break every existing reference.
 */
export const isLegacyVideoPath = (path: string): boolean =>
  /^content\/videos\/[^/]+\.ya?ml$/.test(path);

export const kindOf = (path: string): ModelKind | undefined =>
  kindOfPath(path) ?? (isLegacyVideoPath(path) ? 'video' : undefined);
