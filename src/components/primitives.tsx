import React from 'react';
import { interpolate, spring, useCurrentFrame, useVideoConfig, Easing } from 'remotion';
import { palette, radius, font, type } from '../design/tokens';
import { useLayout, useType } from '../design/layout';

/** Staggered entrance. `i` is the item index; everything uses the same feel. */
export const useReveal = (i = 0, delayFrames = 3): number => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  return spring({
    frame: frame - i * delayFrames,
    fps,
    config: { damping: 200, mass: 0.6, stiffness: 120 },
    durationInFrames: Math.round(fps * 0.5),
  });
};

export const Reveal: React.FC<{
  index?: number;
  delayFrames?: number;
  from?: 'up' | 'left' | 'scale';
  style?: React.CSSProperties;
  children: React.ReactNode;
}> = ({ index = 0, delayFrames = 3, from = 'up', style, children }) => {
  const p = useReveal(index, delayFrames);
  const shift = interpolate(p, [0, 1], [from === 'left' ? -34 : 26, 0]);
  const transform =
    from === 'scale'
      ? `scale(${interpolate(p, [0, 1], [0.94, 1])})`
      : from === 'left'
        ? `translateX(${shift}px)`
        : `translateY(${shift}px)`;
  return <div style={{ opacity: p, transform, ...style }}>{children}</div>;
};

/** The chassis behind every readout. */
export const Panel: React.FC<{
  accent?: string;
  dim?: boolean;
  style?: React.CSSProperties;
  children: React.ReactNode;
}> = ({ accent, dim, style, children }) => (
  <div
    style={{
      background: dim ? 'transparent' : palette.panel,
      border: `2px solid ${accent ?? palette.panelEdge}`,
      borderRadius: radius.md,
      position: 'relative',
      overflow: 'hidden',
      opacity: dim ? 0.45 : 1,
      ...style,
    }}
  >
    {accent ? (
      <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 6, background: accent }} />
    ) : null}
    {children}
  </div>
);

/** Small monospace tag — criterion names, scenario ids, units. */
export const Tag: React.FC<{ color?: string; children: React.ReactNode; style?: React.CSSProperties }> = ({
  color,
  children,
  style,
}) => {
  const t = useType();
  return (
    <span
      style={{
        fontFamily: font.mono,
        fontSize: t(type.micro),
        letterSpacing: 2.2,
        textTransform: 'uppercase',
        color: color ?? palette.inkDim,
        ...style,
      }}
    >
      {children}
    </span>
  );
};

/** Animated horizontal meter, 0..1. The workhorse of every verdict. */
export const Meter: React.FC<{
  value: number;
  color: string;
  index?: number;
  height?: number;
  showPct?: boolean;
}> = ({ value, color, index = 0, height, showPct = false }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = useType();
  const h = height ?? t(22);
  const p = interpolate(frame - index * 4, [0, Math.round(fps * 0.75)], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: Easing.out(Easing.cubic),
  });
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: t(16), width: '100%' }}>
      <div
        style={{
          flex: 1,
          height: h,
          background: palette.grid,
          borderRadius: radius.sm,
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            width: `${Math.max(0, Math.min(1, value)) * p * 100}%`,
            height: '100%',
            background: color,
            borderRadius: radius.sm,
          }}
        />
      </div>
      {showPct ? (
        <span
          style={{
            fontFamily: font.mono,
            fontSize: t(type.label),
            color,
            width: t(80),
            textAlign: 'right',
            fontVariantNumeric: 'tabular-nums',
          }}
        >
          {Math.round(value * p * 100)}
        </span>
      ) : null}
    </div>
  );
};

/** Scene heading: eyebrow + title, consistent across every scene. */
export const Heading: React.FC<{ eyebrow?: string; title: string; accent?: string }> = ({
  eyebrow,
  title,
  accent,
}) => {
  const t = useType();
  const l = useLayout();
  return (
    <Reveal from="left">
      <div style={{ marginBottom: t(l.isVertical ? 40 : 28) }}>
        {eyebrow ? <Tag color={accent ?? palette.accent}>{eyebrow}</Tag> : null}
        <div
          style={{
            fontFamily: font.sans,
            fontWeight: 600,
            fontSize: t(l.isHorizontal ? type.h2 : type.h2),
            color: palette.ink,
            lineHeight: 1.08,
            marginTop: t(10),
            letterSpacing: -0.5,
          }}
        >
          {title}
        </div>
      </div>
    </Reveal>
  );
};
