import { basicSetup } from 'codemirror';
import { EditorView, keymap } from '@codemirror/view';
import { EditorState, type Extension } from '@codemirror/state';
import { indentWithTab } from '@codemirror/commands';
import { HighlightStyle, syntaxHighlighting } from '@codemirror/language';
import { tags as t } from '@lezer/highlight';
import { tokens } from '../../shell/theme';

/**
 * CodeMirror 6, not Monaco (D7).
 *
 * Monaco reads input through a hidden textarea, and iOS doesn't fire key
 * events for arrow and function keys from an external keyboard — which makes it
 * unusable on the one device this studio exists to be driven from. CodeMirror 6
 * was rewritten for touch and edits through native contentEditable.
 */

const chrome = EditorView.theme(
  {
    '&': { color: tokens.ink, backgroundColor: tokens.bg, height: '100%' },
    '.cm-content': { caretColor: tokens.accent, padding: '14px 0 40vh' },
    '.cm-cursor, .cm-dropCursor': { borderLeftColor: tokens.accent, borderLeftWidth: '2px' },
    '&.cm-focused .cm-selectionBackground, .cm-selectionBackground, .cm-content ::selection': {
      backgroundColor: '#1E2B38',
    },
    '.cm-gutters': {
      backgroundColor: tokens.bg,
      color: tokens.inkDim,
      border: 'none',
      borderRight: `1px solid ${tokens.grid}`,
    },
    '.cm-activeLine': { backgroundColor: '#0C1015' },
    '.cm-activeLineGutter': { backgroundColor: '#0C1015', color: tokens.inkMid },
    '.cm-selectionMatch': { backgroundColor: '#1E2B38' },
    '.cm-panels': { backgroundColor: tokens.panel, color: tokens.ink, borderColor: tokens.edge },
    '.cm-searchMatch': { backgroundColor: 'rgba(255,176,32,.22)', outline: `1px solid ${tokens.accent}` },
    '.cm-tooltip': { backgroundColor: tokens.panel, border: `1px solid ${tokens.edge}`, color: tokens.ink },
    '.cm-tooltip-autocomplete ul li[aria-selected]': { backgroundColor: tokens.edge, color: tokens.accent },
    // iPad: never let the editor drive a horizontal page scroll
    '.cm-scroller': { overflow: 'auto', overscrollBehavior: 'contain' },
  },
  { dark: true },
);

/** Instrument-panel syntax colours: one hot accent, cyan data, muted structure. */
const highlight = HighlightStyle.define(
  [
    { tag: [t.comment, t.lineComment, t.blockComment], color: tokens.inkDim, fontStyle: 'italic' },
    { tag: [t.keyword, t.moduleKeyword, t.controlKeyword], color: tokens.violet },
    { tag: [t.string, t.special(t.string)], color: tokens.good },
    { tag: [t.number, t.bool, t.null], color: tokens.cyan },
    { tag: [t.propertyName, t.definition(t.propertyName)], color: tokens.accent },
    { tag: [t.typeName, t.className, t.namespace], color: tokens.cyan },
    { tag: [t.function(t.variableName), t.labelName], color: tokens.ink },
    { tag: [t.operator, t.punctuation, t.separator, t.bracket], color: tokens.inkDim },
    { tag: [t.heading], color: tokens.accent, fontWeight: '600' },
    { tag: [t.link, t.url], color: tokens.cyan, textDecoration: 'underline' },
    { tag: [t.emphasis], fontStyle: 'italic' },
    { tag: [t.strong], fontWeight: '600', color: tokens.ink },
    { tag: [t.invalid], color: tokens.bad },
  ],
  { themeType: 'dark' },
);

/**
 * Language packs are fetched per file type, not bundled into the room.
 *
 * The four of them together are most of this room's weight, and opening a YAML
 * model should not pay for the JavaScript parser. Each one is its own chunk,
 * loaded the first time you open a file of that kind and cached after.
 */
const languageFor = async (path: string): Promise<Extension[]> => {
  if (/\.ya?ml$/.test(path)) return [(await import('@codemirror/lang-yaml')).yaml()];
  if (/\.(tsx|ts)$/.test(path)) {
    const { javascript } = await import('@codemirror/lang-javascript');
    return [javascript({ typescript: true, jsx: path.endsWith('x') })];
  }
  if (/\.(jsx|js|mjs|cjs)$/.test(path)) {
    const { javascript } = await import('@codemirror/lang-javascript');
    return [javascript({ jsx: path.endsWith('x') })];
  }
  if (/\.md$/.test(path)) return [(await import('@codemirror/lang-markdown')).markdown()];
  if (/\.json$/.test(path)) return [(await import('@codemirror/lang-json')).json()];
  return [];
};

export interface EditorHandle {
  view: EditorView;
  destroy: () => void;
}

export const createEditor = async (opts: {
  parent: HTMLElement;
  path: string;
  doc: string;
  onChange: (text: string) => void;
}): Promise<EditorHandle> => {
  const language = await languageFor(opts.path);
  const view = new EditorView({
    parent: opts.parent,
    state: EditorState.create({
      doc: opts.doc,
      extensions: [
        basicSetup,
        keymap.of([indentWithTab]),
        ...language,
        chrome,
        syntaxHighlighting(highlight),
        EditorView.lineWrapping,
        EditorView.updateListener.of((u) => {
          if (u.docChanged) opts.onChange(u.state.doc.toString());
        }),
      ],
    }),
  });
  return { view, destroy: () => view.destroy() };
};
