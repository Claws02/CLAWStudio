import type { Contender, Criterion, Scenario, Video } from './types';

/**
 * Weighted score, normalised to 0..1.
 *
 * score = Σ(weight × rating) / Σ(weight × 5)
 *
 * Criteria with weight 0 (or absent from the scenario) drop out entirely —
 * that is the whole trick. A part that wins on a criterion nobody cares about
 * in this situation gets no credit for it.
 */
export const scoreOf = (
  contender: Contender,
  scenario: Scenario,
  criteria: Criterion[],
): number => {
  let num = 0;
  let den = 0;
  for (const c of criteria) {
    const w = scenario.weights[c.id] ?? 0;
    if (w <= 0) continue;
    const r = contender.ratings[c.id] ?? 0;
    num += w * r;
    den += w * 5;
  }
  return den === 0 ? 0 : num / den;
};

export interface Ranked {
  contender: Contender;
  score: number;
  rank: number;
}

/** Contenders sorted best-first for a given scenario. */
export const rankIn = (video: Video, scenario: Scenario): Ranked[] =>
  video.contenders
    .map((contender) => ({ contender, score: scoreOf(contender, scenario, video.criteria) }))
    .sort((a, b) => b.score - a.score)
    .map((r, i) => ({ ...r, rank: i + 1 }));

/** The winner the math picks, ignoring any hand-written verdict. */
export const computedWinner = (video: Video, scenario: Scenario): string | undefined =>
  rankIn(video, scenario)[0]?.contender.id;

/** The winner the video shows: your stated call, else the math. */
export const winnerOf = (video: Video, scenario: Scenario): string | undefined =>
  scenario.verdict?.winner ?? computedWinner(video, scenario);

/**
 * Which criteria actually decided this scenario — the highest-weighted ones.
 * Used to caption the verdict with "because durability and serviceability
 * are what matter here".
 */
export const decidingCriteria = (video: Video, scenario: Scenario, take = 2): Criterion[] =>
  video.criteria
    .filter((c) => (scenario.weights[c.id] ?? 0) > 0)
    .sort((a, b) => (scenario.weights[b.id] ?? 0) - (scenario.weights[a.id] ?? 0))
    .slice(0, take);

/**
 * How much the answer actually changes across scenarios. If every scenario has
 * the same winner, the video's premise is weak and you should know before you
 * record. Surfaced as a build warning.
 */
export const verdictSpread = (video: Video): { winners: string[]; distinct: number } => {
  const winners = video.scenarios
    .map((s) => winnerOf(video, s))
    .filter((w): w is string => Boolean(w));
  return { winners, distinct: new Set(winners).size };
};

export const contenderById = (video: Video, id: string): Contender | undefined =>
  video.contenders.find((c) => c.id === id);

export const scenarioById = (video: Video, id: string): Scenario | undefined =>
  video.scenarios.find((s) => s.id === id);
