import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig } from 'remotion';
import { font, palette, type } from '../design/tokens';
import { useLayout, useType } from '../design/layout';
import type { Brand } from '../content/types';

/** Faint engineering grid + vignette. Sits under every scene. */
export const Backdrop: React.FC = () => {
  const l = useLayout();
  const cell = l.isHorizontal ? 80 : 72;
  return (
    <AbsoluteFill style={{ background: palette.bg }}>
      <AbsoluteFill
        style={{
          backgroundImage: `linear-gradient(${palette.grid} 1px, transparent 1px), linear-gradient(90deg, ${palette.grid} 1px, transparent 1px)`,
          backgroundSize: `${cell}px ${cell}px`,
          opacity: 0.55,
        }}
      />
      <AbsoluteFill
        style={{
          background: `radial-gradient(ellipse at 50% 38%, transparent 30%, ${palette.bg} 88%)`,
        }}
      />
    </AbsoluteFill>
  );
};

/** Persistent channel mark + progress rail. */
export const Chrome: React.FC<{ brand: Brand; subject: string }> = ({ brand, subject }) => {
  const l = useLayout();
  const t = useType();
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  const progress = interpolate(frame, [0, Math.max(1, durationInFrames - 1)], [0, 1], {
    extrapolateRight: 'clamp',
  });

  return (
    <AbsoluteFill style={{ pointerEvents: 'none' }}>
      <div
        style={{
          position: 'absolute',
          top: l.safeTop - t(58),
          left: l.pad,
          right: l.pad,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          fontFamily: font.mono,
          fontSize: t(type.micro),
          letterSpacing: 2.4,
          textTransform: 'uppercase',
          color: palette.inkDim,
        }}
      >
        <span style={{ color: brand.accent ?? palette.accent }}>{brand.name}</span>
        <span>{subject}</span>
      </div>

      <div
        style={{
          position: 'absolute',
          bottom: l.safeBottom - t(30),
          left: l.pad,
          right: l.pad,
          height: 4,
          background: palette.grid,
          borderRadius: 2,
        }}
      >
        <div
          style={{
            width: `${progress * 100}%`,
            height: '100%',
            background: brand.accent ?? palette.accent,
            borderRadius: 2,
          }}
        />
      </div>
    </AbsoluteFill>
  );
};

/** The content box every scene renders into, respecting platform-safe insets. */
export const Stage: React.FC<{ children: React.ReactNode; center?: boolean }> = ({ children }) => {
  const l = useLayout();
  return (
    <AbsoluteFill
      style={{
        paddingLeft: l.pad,
        paddingRight: l.pad,
        paddingTop: l.safeTop,
        paddingBottom: l.safeBottom,
        display: 'flex',
        flexDirection: 'column',
        // `safe center` centers short scenes in the frame (9:16 otherwise leaves
        // a dead bottom third) but degrades to top-aligned when a scene is
        // taller than the safe area, so nothing gets clipped off the top.
        justifyContent: 'safe center',
        fontFamily: font.sans,
        color: palette.ink,
      }}
    >
      {children}
    </AbsoluteFill>
  );
};
