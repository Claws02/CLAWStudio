/**
 * The content model. Everything a video shows is derived from these types —
 * no scene hard-codes a name, a number, or a verdict.
 */

export type FormatKind = 'vertical' | 'horizontal' | 'square';

/** An axis you rate parts on. Shared across every contender in a video. */
export interface Criterion {
  id: string;
  name: string;
  /** One-line explanation shown under the criterion when there's room. */
  hint?: string;
}

/** A part / tool / approach being compared. */
export interface Contender {
  id: string;
  name: string;
  tagline?: string;
  /** Free-form spec rows shown in the spec table. Keys are row labels. */
  specs?: Record<string, string>;
  /** criterionId -> 1..5. Your editorial rating. This drives every verdict. */
  ratings: Record<string, number>;
  strengths?: string[];
  weaknesses?: string[];
  /** Optional override; defaults to a palette series color by index. */
  color?: string;
}

export interface Verdict {
  /** contender id. Omit to let the weights decide. */
  winner?: string;
  why: string;
  /** contender id that is a trap in this scenario. */
  avoid?: string;
  avoidWhy?: string;
}

/**
 * The "it depends" unit. A scenario re-weights the criteria, which re-ranks
 * the contenders. Same parts, different answer.
 */
export interface Scenario {
  id: string;
  name: string;
  /** The situation, in your voice. "Retrofit on a line that can't go down." */
  context?: string;
  /** criterionId -> weight. 0 or absent = doesn't matter here. */
  weights: Record<string, number>;
  verdict?: Verdict;
}

/**
 * Shared by every scene. `formats` limits a scene to certain aspect ratios —
 * that's how one content file yields a tight 9:16 short and a full 16:9 cut
 * instead of the same edit letterboxed three ways.
 */
interface SceneBase {
  voice?: string;
  duration?: number;
  formats?: FormatKind[];
}

export type Scene =
  | ({ type: 'hook'; text: string; sub?: string } & SceneBase)
  | ({ type: 'lineup'; title?: string } & SceneBase)
  | ({ type: 'spec'; title?: string; rows?: string[] } & SceneBase)
  | ({ type: 'versus'; a: string; b: string; title?: string } & SceneBase)
  | ({ type: 'scenario'; id: string } & SceneBase)
  | ({ type: 'scorecard'; title?: string } & SceneBase)
  | ({ type: 'takeaway'; title?: string; bullets: string[] } & SceneBase)
  | ({ type: 'outro'; text?: string; sub?: string } & SceneBase);

export type SceneType = Scene['type'];

export interface Video {
  id: string;
  title: string;
  subject: string;
  tagline?: string;
  /** Which aspect ratios to build compositions for. Defaults to all three. */
  formats?: FormatKind[];
  criteria: Criterion[];
  contenders: Contender[];
  scenarios: Scenario[];
  scenes: Scene[];
}

export interface Brand {
  name: string;
  handle?: string;
  tagline?: string;
  accent?: string;
  /** Words per second used to estimate scene length when there's no voiceover. */
  readingRate?: number;
}

/** Computed in calculateMetadata; each scene's start frame and length. */
export interface TimelineEntry {
  index: number;
  from: number;
  durationInFrames: number;
  /** Resolved staticFile-relative voice path, if the audio actually exists. */
  voice?: string;
}

export interface Timeline {
  fps: number;
  total: number;
  entries: TimelineEntry[];
}
