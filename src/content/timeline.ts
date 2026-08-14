import { getAudioDurationInSeconds } from '@remotion/media-utils';
import { staticFile } from 'remotion';
import type { Brand, FormatKind, Scene, Timeline, Video } from './types';

const MIN_SECONDS = 2.2;
const PAD_SECONDS = 0.55;

/** Rough word count of everything a scene puts on screen. */
const wordsIn = (scene: Scene, video: Video): number => {
  const parts: string[] = [];
  if ('text' in scene && scene.text) parts.push(scene.text);
  if ('sub' in scene && scene.sub) parts.push(scene.sub);
  if ('title' in scene && scene.title) parts.push(scene.title);
  if ('bullets' in scene && scene.bullets) parts.push(...scene.bullets);
  if (scene.type === 'scenario') {
    const s = video.scenarios.find((x) => x.id === scene.id);
    if (s) parts.push(s.name, s.context ?? '', s.verdict?.why ?? '', s.verdict?.avoidWhy ?? '');
  }
  if (scene.type === 'lineup') parts.push(...video.contenders.map((c) => `${c.name} ${c.tagline ?? ''}`));
  if (scene.type === 'spec') parts.push(...video.contenders.map((c) => Object.keys(c.specs ?? {}).join(' ')));
  if (scene.type === 'scorecard') parts.push(...video.scenarios.map((s) => s.name));
  return parts.join(' ').trim().split(/\s+/).filter(Boolean).length;
};

/** Floor per scene type, so a table gets time to be read even if it's terse. */
const floorFor = (scene: Scene): number => {
  switch (scene.type) {
    case 'spec':
    case 'scorecard':
      return 6;
    case 'scenario':
    case 'versus':
    case 'lineup':
      return 5;
    case 'takeaway':
      return 4.5;
    case 'outro':
      return 3;
    default:
      return MIN_SECONDS;
  }
};

const estimate = (scene: Scene, video: Video, brand: Brand): number => {
  const rate = brand.readingRate ?? 2.6;
  const spoken = wordsIn(scene, video) / rate + PAD_SECONDS;
  return Math.max(floorFor(scene), spoken);
};

/** Scenes that belong in this aspect ratio. No `formats:` means "all of them". */
export const scenesFor = (video: Video, format: FormatKind): { index: number; scene: Scene }[] =>
  video.scenes
    .map((scene, index) => ({ index, scene }))
    .filter(({ scene }) => !scene.formats || scene.formats.includes(format));

/**
 * Resolves each scene's length, in priority order:
 *   1. the voiceover file's real duration (recorded audio is the source of truth)
 *   2. an explicit `duration:` in the YAML
 *   3. an estimate from word count
 *
 * Runs inside Remotion's calculateMetadata, so the composition length always
 * matches the audio you actually recorded — no manual timeline nudging.
 */
export const buildTimeline = async (
  video: Video,
  brand: Brand,
  fps: number,
  format: FormatKind,
): Promise<Timeline> => {
  const entries: Timeline['entries'] = [];
  let cursor = 0;

  for (const { index, scene } of scenesFor(video, format)) {
    let seconds: number | null = null;
    let voice: string | undefined;

    if (scene.voice) {
      try {
        seconds = await getAudioDurationInSeconds(staticFile(scene.voice));
        voice = scene.voice;
      } catch {
        // Audio not in public/ yet — fall through to the estimate so the video
        // still previews while you're still writing.
        seconds = null;
      }
    }
    if (seconds === null) seconds = scene.duration ?? estimate(scene, video, brand);

    const durationInFrames = Math.max(1, Math.round(seconds * fps));
    entries.push({ index, from: cursor, durationInFrames, voice });
    cursor += durationInFrames;
  }

  return { fps, total: Math.max(1, cursor), entries };
};
