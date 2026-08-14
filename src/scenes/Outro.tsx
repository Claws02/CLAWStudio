import React from 'react';
import { font, palette, type } from '../design/tokens';
import { useLayout, useType } from '../design/layout';
import { Reveal } from '../components/primitives';
import { Stage } from '../components/Chrome';
import type { Brand } from '../content/types';

export const Outro: React.FC<{ brand: Brand; text?: string; sub?: string }> = ({ brand, text, sub }) => {
  const t = useType();
  const l = useLayout();
  const accent = brand.accent ?? palette.accent;

  return (
    <Stage center>
      <Reveal from="scale">
        <div
          style={{
            fontSize: t(l.isHorizontal ? type.h1 : type.h1),
            fontWeight: 700,
            letterSpacing: -1.4,
            lineHeight: 1.05,
          }}
        >
          {text ?? 'Which one would you spec?'}
        </div>
      </Reveal>
      <Reveal index={3}>
        <div style={{ fontSize: t(type.body), color: palette.inkMid, marginTop: t(24), lineHeight: 1.35 }}>
          {sub ?? brand.tagline ?? ''}
        </div>
      </Reveal>
      <Reveal index={6}>
        <div
          style={{
            marginTop: t(48),
            display: 'inline-flex',
            alignItems: 'center',
            gap: t(16),
            alignSelf: 'flex-start',
          }}
        >
          <div style={{ width: t(56), height: 4, background: accent }} />
          <span
            style={{
              fontFamily: font.mono,
              fontSize: t(type.label),
              letterSpacing: 3,
              textTransform: 'uppercase',
              color: accent,
            }}
          >
            {brand.handle ?? brand.name}
          </span>
        </div>
      </Reveal>
    </Stage>
  );
};
