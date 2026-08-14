import React from 'react';
import { font, palette, seriesColor, type } from '../design/tokens';
import { useLayout, useType } from '../design/layout';
import { Meter, Panel, Reveal, Heading, Tag } from '../components/primitives';
import { Stage } from '../components/Chrome';
import { decidingCriteria, rankIn, winnerOf } from '../content/scoring';
import type { Video } from '../content/types';

/**
 * The "it depends" scene. Shows the situation, which criteria it promotes,
 * the resulting ranking, and your call — including the trap answer.
 */
export const ScenarioScene: React.FC<{ video: Video; scenarioId: string }> = ({ video, scenarioId }) => {
  const t = useType();
  const l = useLayout();

  const scenario = video.scenarios.find((s) => s.id === scenarioId);
  if (!scenario) return null;

  const ranked = rankIn(video, scenario);
  const winnerId = winnerOf(video, scenario);
  const deciding = decidingCriteria(video, scenario, l.isVertical ? 2 : 3);
  const indexOf = (id: string) => video.contenders.findIndex((c) => c.id === id);
  const colorOf = (id: string) => video.contenders[indexOf(id)]?.color ?? seriesColor(indexOf(id));

  const avoid = scenario.verdict?.avoid;

  return (
    <Stage>
      <Heading eyebrow="if you're doing this" title={scenario.name} />

      {scenario.context ? (
        <Reveal index={1}>
          <div
            style={{
              fontSize: t(type.body),
              color: palette.inkMid,
              lineHeight: 1.32,
              marginBottom: t(20),
              maxWidth: l.isHorizontal ? '70%' : '100%',
            }}
          >
            {scenario.context}
          </div>
        </Reveal>
      ) : null}

      <Reveal index={2}>
        <div style={{ display: 'flex', gap: t(10), flexWrap: 'wrap', marginBottom: t(24) }}>
          {deciding.map((c) => (
            <span
              key={c.id}
              style={{
                fontFamily: font.mono,
                fontSize: t(type.micro),
                letterSpacing: 1.6,
                textTransform: 'uppercase',
                color: palette.bg,
                background: palette.accent,
                padding: `${t(6)}px ${t(14)}px`,
                borderRadius: 999,
              }}
            >
              {c.name} ×{scenario.weights[c.id]}
            </span>
          ))}
          <span
            style={{
              fontFamily: font.mono,
              fontSize: t(type.micro),
              letterSpacing: 1.6,
              textTransform: 'uppercase',
              color: palette.inkDim,
              padding: `${t(6)}px ${t(4)}px`,
            }}
          >
            drives the call
          </span>
        </div>
      </Reveal>

      <div style={{ display: 'flex', flexDirection: 'column', gap: t(12), marginBottom: t(24) }}>
        {ranked.map((r, i) => {
          const isWinner = r.contender.id === winnerId;
          const color = colorOf(r.contender.id);
          return (
            <Reveal key={r.contender.id} index={i + 3} delayFrames={3}>
              <div style={{ display: 'flex', alignItems: 'center', gap: t(16), opacity: isWinner ? 1 : 0.72 }}>
                <div
                  style={{
                    width: t(l.isHorizontal ? 340 : 280),
                    flexShrink: 0,
                    fontSize: t(type.label),
                    fontWeight: isWinner ? 650 : 500,
                    color: isWinner ? color : palette.inkMid,
                    lineHeight: 1.15,
                  }}
                >
                  {r.contender.name}
                </div>
                <Meter value={r.score} color={color} index={i} showPct height={t(20)} />
              </div>
            </Reveal>
          );
        })}
      </div>

      {scenario.verdict ? (
        <Reveal index={ranked.length + 4} from="up">
          <Panel accent={palette.good} style={{ padding: t(24), paddingLeft: t(32) }}>
            <Tag color={palette.good}>use this</Tag>
            <div style={{ fontSize: t(type.h3), fontWeight: 650, marginTop: t(6), lineHeight: 1.1 }}>
              {video.contenders[indexOf(winnerId ?? '')]?.name ?? '—'}
            </div>
            <div style={{ fontSize: t(type.label), color: palette.inkMid, marginTop: t(12), lineHeight: 1.35 }}>
              {scenario.verdict.why}
            </div>
          </Panel>
        </Reveal>
      ) : null}

      {avoid ? (
        <Reveal index={ranked.length + 6} from="up">
          <Panel accent={palette.bad} style={{ padding: t(20), paddingLeft: t(32), marginTop: t(14) }}>
            <Tag color={palette.bad}>the trap</Tag>
            <div style={{ fontSize: t(type.label), marginTop: t(6), lineHeight: 1.3 }}>
              <strong style={{ color: palette.bad }}>
                {video.contenders[indexOf(avoid)]?.name ?? avoid}
              </strong>
              {scenario.verdict?.avoidWhy ? ` — ${scenario.verdict.avoidWhy}` : ''}
            </div>
          </Panel>
        </Reveal>
      ) : null}
    </Stage>
  );
};
