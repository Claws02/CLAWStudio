import React from 'react';
import { font, palette, seriesColor, type } from '../design/tokens';
import { useLayout, useType } from '../design/layout';
import { Reveal, Heading } from '../components/primitives';
import { Stage } from '../components/Chrome';
import type { Video } from '../content/types';

/**
 * The classic spec sheet — but only the rows you chose. `rows:` in the YAML is
 * the editorial filter: leave out the specs that don't change a decision.
 */
export const SpecTable: React.FC<{ video: Video; title?: string; rows?: string[] }> = ({
  video,
  title,
  rows,
}) => {
  const t = useType();
  const l = useLayout();

  const allRows = rows ?? [
    ...new Set(video.contenders.flatMap((c) => Object.keys(c.specs ?? {}))),
  ];

  // In 9:16 a wide table is unreadable, so flip to per-contender blocks.
  const asBlocks = l.isVertical && video.contenders.length > 2;

  const labelCol = t(l.isHorizontal ? 300 : 240);

  return (
    <Stage>
      <Heading eyebrow="on paper" title={title ?? 'The numbers that matter'} />

      {asBlocks ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: t(18) }}>
          {video.contenders.map((c, i) => {
            const color = c.color ?? seriesColor(i);
            return (
              <Reveal key={c.id} index={i}>
                <div style={{ borderTop: `2px solid ${color}`, paddingTop: t(12) }}>
                  <div style={{ fontSize: t(type.h3), fontWeight: 650, color, marginBottom: t(8) }}>
                    {c.name}
                  </div>
                  {allRows.map((r) => (
                    <div
                      key={r}
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        gap: t(20),
                        padding: `${t(7)}px 0`,
                        borderBottom: `1px solid ${palette.grid}`,
                        fontSize: t(type.label),
                      }}
                    >
                      <span style={{ color: palette.inkDim, fontFamily: font.mono, letterSpacing: 1 }}>{r}</span>
                      <span style={{ fontFamily: font.mono, color: palette.ink, textAlign: 'right' }}>
                        {c.specs?.[r] ?? '—'}
                      </span>
                    </div>
                  ))}
                </div>
              </Reveal>
            );
          })}
        </div>
      ) : (
        <div>
          <div style={{ display: 'flex', gap: t(16), paddingBottom: t(12) }}>
            <div style={{ width: labelCol, flexShrink: 0 }} />
            {video.contenders.map((c, i) => (
              <Reveal key={c.id} index={i} style={{ flex: 1 }}>
                <div
                  style={{
                    fontSize: t(type.label),
                    fontWeight: 650,
                    color: c.color ?? seriesColor(i),
                    borderBottom: `3px solid ${c.color ?? seriesColor(i)}`,
                    paddingBottom: t(8),
                    lineHeight: 1.15,
                  }}
                >
                  {c.name}
                </div>
              </Reveal>
            ))}
          </div>

          {allRows.map((r, ri) => (
            <Reveal key={r} index={ri + 2} delayFrames={2}>
              <div
                style={{
                  display: 'flex',
                  gap: t(16),
                  alignItems: 'baseline',
                  padding: `${t(11)}px 0`,
                  borderBottom: `1px solid ${palette.grid}`,
                }}
              >
                <div
                  style={{
                    width: labelCol,
                    flexShrink: 0,
                    fontFamily: font.mono,
                    fontSize: t(type.micro),
                    letterSpacing: 1.4,
                    textTransform: 'uppercase',
                    color: palette.inkDim,
                  }}
                >
                  {r}
                </div>
                {video.contenders.map((c) => (
                  <div
                    key={c.id}
                    style={{
                      flex: 1,
                      fontFamily: font.mono,
                      fontSize: t(type.body),
                      color: c.specs?.[r] ? palette.ink : palette.inkDim,
                      fontVariantNumeric: 'tabular-nums',
                    }}
                  >
                    {c.specs?.[r] ?? '—'}
                  </div>
                ))}
              </div>
            </Reveal>
          ))}
        </div>
      )}
    </Stage>
  );
};
