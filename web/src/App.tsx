import { useEffect, useMemo, useState } from 'react';
import { Player } from '@remotion/player';
import { brand, videos } from '../../src/content/generated';
import { ComparisonVideo, type VideoProps } from '../../src/Video';
import { buildTimeline, scenesFor } from '../../src/content/timeline';
import { ALL_FORMATS, FORMATS } from '../../src/design/layout';
import { FPS } from '../../src/Root';
import type { FormatKind, Timeline } from '../../src/content/types';

const ink = '#E9EFF5';
const dim = '#61717F';
const accent = brand.accent ?? '#FFB020';
const panel = '#111922';
const edge = '#1E2B38';

const Chip: React.FC<{ active: boolean; onClick: () => void; children: React.ReactNode }> = ({
  active,
  onClick,
  children,
}) => (
  <button
    onClick={onClick}
    style={{
      appearance: 'none',
      border: `2px solid ${active ? accent : edge}`,
      background: active ? accent : 'transparent',
      color: active ? '#07090B' : ink,
      fontFamily: 'inherit',
      fontSize: 14,
      fontWeight: 600,
      letterSpacing: 0.4,
      padding: '10px 16px',
      borderRadius: 999,
      cursor: 'pointer',
      // keeps taps from being swallowed / double-firing on iPad
      touchAction: 'manipulation',
      WebkitTapHighlightColor: 'transparent',
    }}
  >
    {children}
  </button>
);

export const App: React.FC = () => {
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
    return <div style={{ padding: 40 }}>No videos in content/videos yet.</div>;
  }

  const inputProps: VideoProps = { video, brand, timeline: timeline ?? { fps: FPS, total: FPS, entries: [] } };

  return (
    <div
      style={{
        maxWidth: 1400,
        margin: '0 auto',
        padding: 'max(20px, env(safe-area-inset-top)) 20px 60px',
        display: 'flex',
        flexDirection: 'column',
        gap: 18,
      }}
    >
      <header style={{ display: 'flex', alignItems: 'baseline', gap: 14, flexWrap: 'wrap' }}>
        <span
          style={{
            fontFamily: 'IBM Plex Mono, ui-monospace, monospace',
            color: accent,
            letterSpacing: 3,
            textTransform: 'uppercase',
            fontSize: 13,
          }}
        >
          {brand.name}
        </span>
        <span style={{ color: dim, fontSize: 13 }}>studio preview</span>
      </header>

      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
        {videos.map((v) => (
          <Chip key={v.id} active={v.id === videoId} onClick={() => setVideoId(v.id)}>
            {v.title}
          </Chip>
        ))}
      </div>

      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
        {formats.map((f) => (
          <Chip key={f} active={f === spec.kind} onClick={() => setFormat(f)}>
            {f === 'vertical' ? '9:16 Shorts' : f === 'horizontal' ? '16:9 YouTube' : '1:1 Feed'}
          </Chip>
        ))}
      </div>

      <div
        style={{
          background: panel,
          border: `2px solid ${edge}`,
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
              maxWidth: spec.kind === 'horizontal' ? 1100 : spec.kind === 'square' ? 620 : 460,
              aspectRatio: `${spec.width} / ${spec.height}`,
              borderRadius: 8,
              overflow: 'hidden',
            }}
          />
        ) : (
          <div style={{ padding: 60, color: dim, fontSize: 14 }}>measuring voiceover…</div>
        )}
      </div>

      {timeline ? (
        <div
          style={{
            fontFamily: 'IBM Plex Mono, ui-monospace, monospace',
            fontSize: 12,
            color: dim,
            display: 'flex',
            gap: 18,
            flexWrap: 'wrap',
          }}
        >
          <span>
            runtime {(timeline.total / FPS).toFixed(1)}s
          </span>
          <span>{timeline.entries.length} scenes in this cut</span>
          <span>
            {timeline.entries.filter((e) => e.voice).length}/{timeline.entries.length} voiced
          </span>
          <span>
            {spec.width}×{spec.height}
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
                color: dim,
                borderBottom: `1px solid ${edge}`,
                padding: '8px 2px',
                fontFamily: 'IBM Plex Mono, ui-monospace, monospace',
              }}
            >
              <span style={{ width: 26, color: edge }}>{String(i + 1).padStart(2, '0')}</span>
              <span style={{ width: 90, color: ink }}>{s.type}</span>
              <span style={{ width: 60 }}>{e ? `${(e.durationInFrames / FPS).toFixed(1)}s` : '—'}</span>
              <span style={{ color: e?.voice ? accent : edge }}>{e?.voice ? 'voiced' : 'estimated'}</span>
            </li>
          );
        })}
      </ol>
    </div>
  );
};
