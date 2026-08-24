import { lazy, type ComponentType, type LazyExoticComponent } from 'react';

/**
 * The room registry.
 *
 * Every room is a lazy chunk. The measured video-only bundle was 488 KB raw /
 * 153 KB gzipped before any of this existed — six rooms in one bundle would be
 * punishing over cellular, so the shell loads a room when you enter it and
 * never before.
 *
 * Rooms marked `live: false` are phases that haven't been built. They're listed
 * on purpose: the rail is the plan, and a greyed room is more honest than a
 * missing one.
 */
export interface RoomSpec {
  id: string;
  label: string;
  glyph: string;
  live: boolean;
  /** What this room will do, shown while it's still unbuilt. */
  blurb?: string;
  phase?: string;
  component?: LazyExoticComponent<ComponentType>;
}

export const ROOMS: RoomSpec[] = [
  {
    id: 'code',
    label: 'Code',
    glyph: '⌘',
    live: true,
    component: lazy(() => import('../rooms/code/CodeRoom').then((m) => ({ default: m.CodeRoom }))),
  },
  {
    id: 'video',
    label: 'Video',
    glyph: '▶',
    live: true,
    component: lazy(() => import('../rooms/video/VideoRoom').then((m) => ({ default: m.VideoRoom }))),
  },
  {
    id: 'sheet',
    label: 'Sheet',
    glyph: '▦',
    live: false,
    phase: 'Phase 1',
    blurb:
      'A calc surface with units as first-class values, budgets as an idiom, and cells that reference a simulation result. Source is *.sheet.yaml, so it diffs and reviews.',
  },
  {
    id: 'sim',
    label: 'Sim',
    glyph: '∿',
    live: false,
    phase: 'Phase 2',
    blurb:
      'A TypeScript ODE solver in a Worker for control loops, thermal and motion; ngspice-WASM for circuits. Every run writes a committed result file the other rooms can read.',
  },
  {
    id: 'doc',
    label: 'Doc',
    glyph: '¶',
    live: false,
    phase: 'Phase 3',
    blurb:
      'Markdown source, WYSIWYG editing, PDF via paged media and DOCX in CI. A spec sheet whose figures are the sim and whose revision block is the git log.',
  },
  {
    id: 'design',
    label: 'Design',
    glyph: '◫',
    live: false,
    phase: 'Phase 4',
    blurb:
      'Parametric SVG artboards for panels, faceplates and pinouts — component library, real dimensions, BOM into the Sheet, DXF for the shop. A looser drawing mode comes after.',
  },
];

export const roomById = (id: string): RoomSpec | undefined => ROOMS.find((r) => r.id === id);
