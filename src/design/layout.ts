import { useVideoConfig } from 'remotion';
import type { FormatKind } from '../content/types';

export interface FormatSpec {
  kind: FormatKind;
  width: number;
  height: number;
}

export const FORMATS: Record<FormatKind, FormatSpec> = {
  vertical: { kind: 'vertical', width: 1080, height: 1920 },
  horizontal: { kind: 'horizontal', width: 1920, height: 1080 },
  square: { kind: 'square', width: 1080, height: 1080 },
};

export const ALL_FORMATS: FormatKind[] = ['vertical', 'horizontal', 'square'];

export interface Layout {
  kind: FormatKind;
  width: number;
  height: number;
  /** Multiply every type token by this. Shorts need bigger text. */
  scale: number;
  /** Page padding. */
  pad: number;
  /** Extra top/bottom insets to clear platform UI (TikTok/Reels chrome). */
  safeTop: number;
  safeBottom: number;
  /** Usable content box. */
  inner: { width: number; height: number };
  /** Preferred direction for two-up / n-up comparisons. */
  dir: 'row' | 'column';
  /** How many contender cards fit comfortably side by side. */
  columns: number;
  isVertical: boolean;
  isHorizontal: boolean;
}

const SPEC: Record<FormatKind, Omit<Layout, 'width' | 'height' | 'kind' | 'inner' | 'isVertical' | 'isHorizontal'>> = {
  vertical: { scale: 1.0, pad: 72, safeTop: 190, safeBottom: 300, dir: 'column', columns: 2 },
  horizontal: { scale: 0.9, pad: 96, safeTop: 60, safeBottom: 60, dir: 'row', columns: 4 },
  square: { scale: 0.95, pad: 72, safeTop: 60, safeBottom: 60, dir: 'column', columns: 2 },
};

export const kindFor = (width: number, height: number): FormatKind => {
  if (width > height) return 'horizontal';
  if (height > width) return 'vertical';
  return 'square';
};

export const layoutFor = (width: number, height: number): Layout => {
  const kind = kindFor(width, height);
  const s = SPEC[kind];
  return {
    ...s,
    kind,
    width,
    height,
    inner: {
      width: width - s.pad * 2,
      height: height - s.safeTop - s.safeBottom,
    },
    isVertical: kind === 'vertical',
    isHorizontal: kind === 'horizontal',
  };
};

export const useLayout = (): Layout => {
  const { width, height } = useVideoConfig();
  return layoutFor(width, height);
};

/** Scaled type helper: `t(type.h1)` in any scene. */
export const useType = (): ((px: number) => number) => {
  const { scale } = useLayout();
  return (px: number) => Math.round(px * scale);
};
