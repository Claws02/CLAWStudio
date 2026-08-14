import React from 'react';
import { font, palette, type } from '../design/tokens';
import { useLayout, useType } from '../design/layout';
import { Reveal, Tag } from '../components/primitives';
import { Stage } from '../components/Chrome';
import type { Brand, Video } from '../content/types';

export const Hook: React.FC<{
  video: Video;
  brand: Brand;
  text: string;
  sub?: string;
}> = ({ video, brand, text, sub }) => {
  const t = useType();
  const l = useLayout();
  const accent = brand.accent ?? palette.accent;
  const words = text.split(' ');

  return (
    <Stage center>
      <Reveal from="left">
        <Tag color={accent}>{video.subject}</Tag>
      </Reveal>
      <div
        style={{
          fontSize: t(l.isHorizontal ? type.h1 : type.mega),
          fontWeight: 700,
          lineHeight: 1.02,
          letterSpacing: -2,
          marginTop: t(24),
          maxWidth: l.isHorizontal ? '78%' : '100%',
        }}
      >
        {words.map((w, i) => (
          <Reveal key={i} index={i} delayFrames={2} style={{ display: 'inline-block', marginRight: '0.28em' }}>
            {w}
          </Reveal>
        ))}
      </div>
      {sub ? (
        <Reveal index={words.length + 2} delayFrames={2}>
          <div
            style={{
              marginTop: t(36),
              fontSize: t(type.body),
              color: palette.inkMid,
              lineHeight: 1.35,
              maxWidth: l.isHorizontal ? '60%' : '92%',
              borderLeft: `3px solid ${accent}`,
              paddingLeft: t(24),
              fontFamily: font.sans,
            }}
          >
            {sub}
          </div>
        </Reveal>
      ) : null}
    </Stage>
  );
};
