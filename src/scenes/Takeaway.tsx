import React from 'react';
import { palette, type } from '../design/tokens';
import { useLayout, useType } from '../design/layout';
import { Reveal, Heading } from '../components/primitives';
import { Stage } from '../components/Chrome';

export const Takeaway: React.FC<{ title?: string; bullets: string[]; accent?: string }> = ({
  title,
  bullets,
  accent,
}) => {
  const t = useType();
  const l = useLayout();
  const color = accent ?? palette.accent;

  return (
    <Stage center={!l.isVertical}>
      <Heading eyebrow="what to actually do" title={title ?? 'Rules of thumb'} accent={color} />
      <div style={{ display: 'flex', flexDirection: 'column', gap: t(20) }}>
        {bullets.map((b, i) => (
          <Reveal key={i} index={i} delayFrames={4} from="left">
            <div style={{ display: 'flex', gap: t(20), alignItems: 'flex-start' }}>
              <div
                style={{
                  width: t(14),
                  height: t(14),
                  marginTop: t(14),
                  background: color,
                  flexShrink: 0,
                  transform: 'rotate(45deg)',
                }}
              />
              <div
                style={{
                  fontSize: t(l.isHorizontal ? type.h3 : type.body),
                  lineHeight: 1.3,
                  color: palette.ink,
                  maxWidth: l.isHorizontal ? '82%' : '100%',
                }}
              >
                {b}
              </div>
            </div>
          </Reveal>
        ))}
      </div>
    </Stage>
  );
};
