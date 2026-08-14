export { font } from './fonts';

/** Instrument-panel palette: dark chassis, backlit readouts, one hot accent. */
export const palette = {
  bg: '#07090B',
  bgLift: '#0C1015',
  panel: '#111922',
  panelEdge: '#1E2B38',
  grid: '#141E28',
  ink: '#E9EFF5',
  inkMid: '#9FB0C0',
  inkDim: '#61717F',
  accent: '#FFB020',
  cyan: '#3ED6D6',
  good: '#49D67F',
  bad: '#FF5F56',
  series: ['#FFB020', '#3ED6D6', '#9B8CFF', '#49D67F', '#FF7A5C', '#7FB2FF'],
};

export const seriesColor = (i: number): string =>
  palette.series[i % palette.series.length] as string;

export const radius = { sm: 6, md: 12, lg: 20 };

/** Base type scale in px, at 1080-wide vertical. Layout multiplies by scale. */
export const type = {
  mega: 116,
  h1: 78,
  h2: 56,
  h3: 42,
  body: 34,
  label: 26,
  micro: 21,
};

export const easing = {
  /** Mechanical: fast out, hard stop. Reads as a relay closing, not a bounce. */
  snap: [0.16, 1, 0.3, 1] as const,
};
