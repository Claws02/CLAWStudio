import React from 'react';
import { font, palette, seriesColor, type } from '../design/tokens';
import { useLayout, useType } from '../design/layout';
import { Meter, Panel, Reveal, Heading, Tag } from '../components/primitives';
import { Stage } from '../components/Chrome';
import type { Video } from '../content/types';

/** Two contenders, criterion by criterion, with the gap made visible. */
export const Versus: React.FC<{ video: Video; a: string; b: string; title?: string }> = ({
  video,
  a,
  b,
  title,
}) => {
  const t = useType();
  const l = useLayout();

  const ia = video.contenders.findIndex((c) => c.id === a);
  const ib = video.contenders.findIndex((c) => c.id === b);
  const ca = video.contenders[ia];
  const cb = video.contenders[ib];
  if (!ca || !cb) return null;

  const colorA = ca.color ?? seriesColor(ia);
  const colorB = cb.color ?? seriesColor(ib);

  return (
    <Stage>
      <Heading eyebrow="head to head" title={title ?? `${ca.name} vs ${cb.name}`} />

      <div style={{ display: 'flex', gap: t(16), marginBottom: t(26) }}>
        {[
          { c: ca, color: colorA },
          { c: cb, color: colorB },
        ].map(({ c, color }, i) => (
          <Reveal key={c.id} index={i} style={{ flex: 1 }}>
            <Panel accent={color} style={{ padding: t(20), paddingLeft: t(28) }}>
              <div style={{ fontSize: t(type.h3), fontWeight: 650, color, lineHeight: 1.05 }}>{c.name}</div>
              {c.tagline ? (
                <div style={{ fontSize: t(type.micro), color: palette.inkMid, marginTop: t(8) }}>{c.tagline}</div>
              ) : null}
            </Panel>
          </Reveal>
        ))}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: t(l.isVertical ? 22 : 16) }}>
        {video.criteria.map((cr, i) => {
          const ra = (ca.ratings[cr.id] ?? 0) / 5;
          const rb = (cb.ratings[cr.id] ?? 0) / 5;
          const leader = ra === rb ? null : ra > rb ? 'a' : 'b';
          return (
            <Reveal key={cr.id} index={i + 2} delayFrames={2}>
              <div style={{ display: 'flex', alignItems: 'center', gap: t(14) }}>
                {/* left bar grows right-to-left so the two mirror each other */}
                <div style={{ flex: 1, transform: 'scaleX(-1)' }}>
                  <Meter value={ra} color={colorA} index={i} height={t(18)} />
                </div>
                <div
                  style={{
                    width: t(l.isHorizontal ? 300 : 250),
                    flexShrink: 0,
                    textAlign: 'center',
                    fontFamily: font.mono,
                    fontSize: t(type.micro),
                    letterSpacing: 1.4,
                    textTransform: 'uppercase',
                    color: leader === null ? palette.inkMid : leader === 'a' ? colorA : colorB,
                  }}
                >
                  {cr.name}
                </div>
                <div style={{ flex: 1 }}>
                  <Meter value={rb} color={colorB} index={i} height={t(18)} />
                </div>
              </div>
            </Reveal>
          );
        })}
      </div>

      <Reveal index={video.criteria.length + 3} delayFrames={2}>
        <Tag style={{ marginTop: t(18) }}>ratings are editorial · 1–5 per criterion</Tag>
      </Reveal>
    </Stage>
  );
};
