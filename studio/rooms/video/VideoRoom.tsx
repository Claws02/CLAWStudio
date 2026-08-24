import { useEffect, useMemo, useState } from 'react';
import { Player } from '@remotion/player';
import { brand, videos } from '../../../src/content/generated';
import { ComparisonVideo, type VideoProps } from '../../../src/Video';
import { buildTimeline, scenesFor } from '../../../src/content/timeline';
import { ALL_FORMATS, FORMATS } from '../../../src/design/layout';
import { FPS } from '../../../src/Root';
import { Empty } from '../../shell/ui';
import type { FormatKind, Timeline } from '../../../src/content/types';

/**
 * The preview that already existed, now a room.
 *
 * D11: Remotion is confined to this file and to CI. Its company licence is
 * per-seat above three people, so no other room imports it — a licence change
 * costs one room, not the studio.
 */
const FORMAT_LABEL: Record<FormatKind, string> = {
  vertical: '9:16 Shorts',
  horizontal: '16:9 YouTube',
  square: '1:1 Feed',
};

const MAX_WIDTH: Record<FormatKind, number> = { horizontal: 1100, square: 620, vertical: 460 };

export const VideoRoom: React.FC = () => {
  const [videoId, setVideoId] = useState(videos[0]?.id ?? '');
  const [format, setFormat] = useState<FormatKind>('vertical');
  const [timeline, setTimeline] = useState<Timeline | null>(null);

  const video = useMemo(() => videos.find((v) => v.id === videoId), [videoId]);
  const formats = video?.formats ?? ALL_FORMATS;
  const spec = FORMATS[formats.includes(format) ? format : (formats[0] as FormatKind)];

  useEffect(() => {
    if (!video) return;
    let cancelled = false;
    setTimeline(null);
    buildTimeline(video, brand, FPS, spec.kind).then((t) => {
      if (!cancelled) setTimeline(t);
    });
    return () => {
      cancelled = true;
    };
  }, [video, spec.kind]);

  if (!video) {
    return (
      <Empty title="No videos yet">
        Nothing in <code>content/videos/</code>. Run <code>npm run new -- &lt;id&gt; "&lt;Subject&gt;"
        "&lt;Title&gt;"</code> to scaffold one, or write the YAML in the Code room.
      </Empty>
    );
  }

  const inputProps: VideoProps = {
    video,
    brand,
    timeline: timeline ?? { fps: FPS, total: FPS, entries: [] },
  };

  return (
    <>
      <div className="head">
        <h1>{video.title}</h1>
        <span className="sub">{video.subject}</span>
        <span className="grow" />
        <span className="sub">
          {spec.width}×{spec.height}
        </span>
      </div>

      <div className="room-body" style={{ padding: '14px 16px 28px', display: 'grid', gap: 16 }}>
        {videos.length > 1 ? (
          <div className="row">
            {videos.map((v) => (
              <button
                key={v.id}
                className="chip"
                aria-pressed={v.id === videoId}
                onClick={() => setVideoId(v.id)}
              >
                {v.title}
              </button>
            ))}
          </div>
        ) : null}

        <div className="row">
          {formats.map((f) => (
            <button key={f} className="chip" aria-pressed={f === spec.kind} onClick={() => setFormat(f)}>
              {FORMAT_LABEL[f]}
            </button>
          ))}
        </div>

        <div
          style={{
            background: 'var(--panel)',
            border: '1px solid var(--edge)',
            borderRadius: 14,
            padding: 12,
            display: 'flex',
            justifyContent: 'center',
          }}
        >
          {timeline ? (
            <Player
              key={`${video.id}-${spec.kind}`}
              component={ComparisonVideo}
              inputProps={inputProps}
              durationInFrames={timeline.total}
              fps={FPS}
              compositionWidth={spec.width}
              compositionHeight={spec.height}
              controls
              doubleClickToFullscreen
              style={{
                width: '100%',
                maxWidth: MAX_WIDTH[spec.kind],
                aspectRatio: `${spec.width} / ${spec.height}`,
                borderRadius: 8,
                overflow: 'hidden',
              }}
            />
          ) : (
            <div style={{ padding: 60, color: 'var(--dim)', fontSize: 14 }}>measuring voiceover…</div>
          )}
        </div>

        {timeline ? (
          <div
            style={{
              fontFamily: 'var(--mono)',
              fontSize: 12,
              color: 'var(--dim)',
              display: 'flex',
              gap: 18,
              flexWrap: 'wrap',
            }}
          >
            <span>runtime {(timeline.total / FPS).toFixed(1)}s</span>
            <span>{timeline.entries.length} scenes in this cut</span>
            <span>
              {timeline.entries.filter((e) => e.voice).length}/{timeline.entries.length} voiced
            </span>
          </div>
        ) : null}

        <ol style={{ listStyle: 'none', padding: 0, margin: 0, display: 'grid', gap: 6 }}>
          {scenesFor(video, spec.kind).map(({ scene: s }, i) => {
            const e = timeline?.entries[i];
            return (
              <li
                key={`${s.type}-${i}`}
                style={{
                  display: 'flex',
                  gap: 14,
                  alignItems: 'baseline',
                  fontSize: 13,
                  color: 'var(--dim)',
                  borderBottom: '1px solid var(--edge)',
                  padding: '8px 2px',
                  fontFamily: 'var(--mono)',
                }}
              >
                <span style={{ width: 26, color: 'var(--edge)' }}>{String(i + 1).padStart(2, '0')}</span>
                <span style={{ width: 90, color: 'var(--ink)' }}>{s.type}</span>
                <span style={{ width: 60 }}>{e ? `${(e.durationInFrames / FPS).toFixed(1)}s` : '—'}</span>
                <span style={{ color: e?.voice ? 'var(--accent)' : 'var(--edge)' }}>
                  {e?.voice ? 'voiced' : 'estimated'}
                </span>
              </li>
            );
          })}
        </ol>
      </div>
    </>
  );
};
