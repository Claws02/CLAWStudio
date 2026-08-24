/**
 * Teaches the ref resolver how to read a video model.
 *
 * Two kinds of path work:
 *   scenarios.line-retrofit.verdict.why   — plain data, walked directly
 *   scenario.line-retrofit.winner         — derived, computed from the weights
 *
 * The derived paths matter: a reference should be able to ask for the thing the
 * video actually shows, which for a winner is your stated call *or* the maths,
 * not a field that may not be there.
 */
import { videoById } from '../../src/content/generated';
import { rankIn, scenarioById, winnerOf } from '../../src/content/scoring';
import { registerResolver, walk, type Ref, type Resolved } from './refs';

const derived = (video: NonNullable<ReturnType<typeof videoById>>, ref: Ref): Resolved | null => {
  const m = /^scenario\.([a-z0-9-]+)\.(winner|runnerUp|score)$/.exec(ref.path);
  if (!m) return null;
  const scenario = scenarioById(video, m[1]);
  if (!scenario) return { ok: false, reason: `no scenario "${m[1]}" in "${video.id}"` };

  if (m[2] === 'winner') {
    const id = winnerOf(video, scenario);
    return id ? { ok: true, value: id, formatted: id } : { ok: false, reason: 'no winner could be computed' };
  }
  const ranked = rankIn(video, scenario);
  if (m[2] === 'runnerUp') {
    const second = ranked[1]?.contender.id;
    return second ? { ok: true, value: second, formatted: second } : { ok: false, reason: 'only one contender' };
  }
  const top = ranked[0];
  return top
    ? { ok: true, value: top.score, formatted: `${(top.score * 100).toFixed(0)}%` }
    : { ok: false, reason: 'nothing to score' };
};

registerResolver('video', (ref) => {
  const video = videoById(ref.modelId);
  if (!video) return { ok: false, reason: `no video model "${ref.modelId}"` };
  return derived(video, ref) ?? walk(video, ref.path);
});
