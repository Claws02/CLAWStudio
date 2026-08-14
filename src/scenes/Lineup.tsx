import React from 'react';
import { font, palette, seriesColor, type } from '../design/tokens';
import { useLayout, useType } from '../design/layout';
import { Panel, Reveal, Heading, Tag } from '../components/primitives';
import { Stage } from '../components/Chrome';
import type { Video } from '../content/types';

/** Every contender, once, with its one-line identity. Sets up the whole video. */
export const Lineup: React.FC<{ video: Video; title?: string }> = ({ video, title }) => {
  const t = useType();
  const l = useLayout();
  const cols = Math.min(l.columns, video.contenders.length);
  const stacked = cols <= 1 || video.contenders.length > l.columns * 1.5;

  return (
    <Stage>
      <Heading eyebrow="the field" title={title ?? `${video.contenders.length} ways to do this`} />
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: stacked ? '1fr' : `repeat(${cols}, 1fr)`,
          gap: t(20),
          alignContent: 'start',
        }}
      >
        {video.contenders.map((c, i) => {
          const color = c.color ?? seriesColor(i);
          return (
            <Reveal key={c.id} index={i} from="up">
              <Panel accent={color} style={{ padding: t(26), paddingLeft: t(34), height: '100%' }}>
                <Tag color={color}>{String(i + 1).padStart(2, '0')}</Tag>
                <div
                  style={{
                    fontSize: t(l.isVertical ? type.h3 : type.h3),
                    fontWeight: 650,
                    marginTop: t(8),
                    lineHeight: 1.1,
                    letterSpacing: -0.6,
                  }}
                >
                  {c.name}
                </div>
                {c.tagline ? (
                  <div
                    style={{
                      marginTop: t(12),
                      fontSize: t(type.label),
                      color: palette.inkMid,
                      lineHeight: 1.35,
                      fontFamily: font.sans,
                    }}
                  >
                    {c.tagline}
                  </div>
                ) : null}
              </Panel>
            </Reveal>
          );
        })}
      </div>
    </Stage>
  );
};
