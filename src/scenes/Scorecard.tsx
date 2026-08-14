import React from 'react';
import { font, palette, seriesColor, radius, type } from '../design/tokens';
import { useLayout, useType } from '../design/layout';
import { Reveal, Heading, Tag } from '../components/primitives';
import { Stage } from '../components/Chrome';
import { scoreOf, winnerOf } from '../content/scoring';
import type { Video } from '../content/types';

/**
 * The payoff frame: every contender × every scenario, at a glance. This is the
 * screenshot people save — it's the whole "it depends" argument in one grid.
 */
export const Scorecard: React.FC<{ video: Video; title?: string }> = ({ video, title }) => {
  const t = useType();
  const l = useLayout();

  const nameCol = t(l.isVertical ? 260 : 330);
  const cellH = t(l.isVertical ? 62 : 66);

  return (
    <Stage>
      <Heading eyebrow="the whole answer" title={title ?? 'It depends — here’s on what'} />

      {/* header row: scenarios */}
      <div style={{ display: 'flex', gap: t(8), marginBottom: t(10) }}>
        <div style={{ width: nameCol, flexShrink: 0 }} />
        {video.scenarios.map((s, i) => (
          <Reveal key={s.id} index={i} style={{ flex: 1 }}>
            <div
              style={{
                fontFamily: font.mono,
                fontSize: t(type.micro),
                letterSpacing: 1.2,
                textTransform: 'uppercase',
                color: palette.inkDim,
                textAlign: 'center',
                lineHeight: 1.2,
                minHeight: t(52),
              }}
            >
              {s.name}
            </div>
          </Reveal>
        ))}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: t(8) }}>
        {video.contenders.map((c, ci) => {
          const color = c.color ?? seriesColor(ci);
          return (
            <Reveal key={c.id} index={ci + 2} delayFrames={3}>
              <div style={{ display: 'flex', gap: t(8), alignItems: 'stretch' }}>
                <div
                  style={{
                    width: nameCol,
                    flexShrink: 0,
                    display: 'flex',
                    alignItems: 'center',
                    fontSize: t(type.label),
                    fontWeight: 600,
                    color,
                    borderLeft: `4px solid ${color}`,
                    paddingLeft: t(14),
                    lineHeight: 1.12,
                  }}
                >
                  {c.name}
                </div>

                {video.scenarios.map((s) => {
                  const score = scoreOf(c, s, video.criteria);
                  const isWinner = winnerOf(video, s) === c.id;
                  return (
                    <div
                      key={s.id}
                      style={{
                        flex: 1,
                        height: cellH,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        borderRadius: radius.sm,
                        background: isWinner ? color : palette.panel,
                        border: `2px solid ${isWinner ? color : palette.panelEdge}`,
                        color: isWinner ? palette.bg : palette.inkMid,
                        fontFamily: font.mono,
                        fontSize: t(type.body),
                        fontWeight: isWinner ? 700 : 400,
                        fontVariantNumeric: 'tabular-nums',
                      }}
                    >
                      {Math.round(score * 100)}
                    </div>
                  );
                })}
              </div>
            </Reveal>
          );
        })}
      </div>

      <Reveal index={video.contenders.length + 4}>
        <Tag style={{ marginTop: t(16) }}>
          score = Σ(weight × rating) ÷ max · highlighted cell = the pick
        </Tag>
      </Reveal>
    </Stage>
  );
};
