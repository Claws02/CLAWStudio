/**
 * The studio's DOM styling.
 *
 * The palette and type are lifted straight from src/design/tokens.ts — the
 * instrument-panel look the videos already use. The studio should look like
 * the thing it makes, so this is deliberately not a separate design language.
 */
export const tokens = {
  bg: '#07090B',
  lift: '#0C1015',
  panel: '#111922',
  edge: '#1E2B38',
  grid: '#141E28',
  ink: '#E9EFF5',
  inkMid: '#9FB0C0',
  inkDim: '#61717F',
  accent: '#FFB020',
  cyan: '#3ED6D6',
  good: '#49D67F',
  bad: '#FF5F56',
  violet: '#9B8CFF',
} as const;

const CSS = `
:root {
  --bg:${tokens.bg}; --lift:${tokens.lift}; --panel:${tokens.panel}; --edge:${tokens.edge};
  --grid:${tokens.grid}; --ink:${tokens.ink}; --mid:${tokens.inkMid}; --dim:${tokens.inkDim};
  --accent:${tokens.accent}; --cyan:${tokens.cyan}; --good:${tokens.good}; --bad:${tokens.bad};
  --violet:${tokens.violet};
  --sans:"IBM Plex Sans", ui-sans-serif, system-ui, -apple-system, sans-serif;
  --mono:"IBM Plex Mono", ui-monospace, SFMono-Regular, Menlo, monospace;
  --rail: 68px;
  color-scheme: dark;
}
* { box-sizing: border-box; }
html, body, #root { height: 100%; }
body {
  margin:0; background:var(--bg); color:var(--ink); font-family:var(--sans);
  -webkit-text-size-adjust:100%; overscroll-behavior:none;
}
button, input, select, textarea { font-family:inherit; font-size:inherit; color:inherit; }
button { cursor:pointer; }
:focus-visible { outline:2px solid var(--accent); outline-offset:2px; border-radius:4px; }

/* ---------- shell frame ---------- */
.shell {
  display:grid; height:100%;
  grid-template-columns: var(--rail) 1fr;
  grid-template-rows: 1fr auto;
  grid-template-areas: "rail room" "rail status";
}
.rail {
  grid-area:rail; background:var(--lift); border-right:1px solid var(--edge);
  display:flex; flex-direction:column; align-items:center; gap:4px;
  padding: max(10px, env(safe-area-inset-top)) 0 10px;
}
.mark {
  font-family:var(--mono); font-size:10px; letter-spacing:.14em; color:var(--accent);
  writing-mode:vertical-rl; margin-bottom:8px; user-select:none;
}
.rail-btn {
  appearance:none; border:1px solid transparent; background:transparent; color:var(--dim);
  width:52px; padding:8px 0; border-radius:10px; display:flex; flex-direction:column;
  align-items:center; gap:4px; touch-action:manipulation; -webkit-tap-highlight-color:transparent;
  transition:color .12s, background .12s, border-color .12s;
}
.rail-btn .glyph { font-size:17px; line-height:1; }
.rail-btn .name { font-family:var(--mono); font-size:9px; letter-spacing:.1em; text-transform:uppercase; }
.rail-btn:hover:not(:disabled) { color:var(--mid); background:var(--panel); }
.rail-btn[aria-current="page"] { color:var(--accent); background:var(--panel); border-color:var(--edge); }
.rail-btn:disabled { opacity:.34; cursor:not-allowed; }
.rail-spacer { flex:1; }

.room { grid-area:room; min-width:0; min-height:0; overflow:hidden; display:flex; flex-direction:column; }
.room-body { flex:1; min-height:0; overflow:auto; -webkit-overflow-scrolling:touch; }

.status {
  grid-area:status; border-top:1px solid var(--edge); background:var(--lift);
  display:flex; align-items:center; gap:14px; flex-wrap:wrap;
  padding:7px 14px calc(7px + env(safe-area-inset-bottom));
  font-family:var(--mono); font-size:11.5px; color:var(--dim);
}
.status .sep { color:var(--edge); }
.status b { color:var(--mid); font-weight:500; }
.status .warn { color:var(--accent); }
.status .bad { color:var(--bad); }
.status .good { color:var(--good); }
.status button {
  appearance:none; background:transparent; border:1px solid var(--edge); color:var(--mid);
  border-radius:999px; padding:3px 10px; font-family:var(--mono); font-size:11px;
}
.status button:hover { border-color:var(--accent); color:var(--accent); }

@media (max-width: 720px) {
  .shell { grid-template-columns:1fr; grid-template-rows:1fr auto auto;
           grid-template-areas:"room" "status" "rail"; }
  .rail { flex-direction:row; justify-content:space-around; border-right:none;
          border-top:1px solid var(--edge); padding:6px 4px calc(6px + env(safe-area-inset-bottom)); }
  .mark { display:none; }
  .rail-spacer { display:none; }
  .rail-btn { width:auto; flex:1; }
  /* Too narrow for a path to earn its space — the filename alone is the label. */
  .tree .dir { display:none; }
  .tree .base { flex:0 1 auto; min-width:0; }
}

/* ---------- shared bits ---------- */
.head {
  display:flex; align-items:center; gap:12px; flex-wrap:wrap;
  padding: max(12px, env(safe-area-inset-top)) 16px 12px; border-bottom:1px solid var(--edge);
}
.head h1 { font-size:15px; font-weight:600; margin:0; letter-spacing:-.01em; }
.head .sub { font-family:var(--mono); font-size:11px; color:var(--dim); letter-spacing:.1em; text-transform:uppercase; }
.head .grow { flex:1; }

.btn {
  appearance:none; border:1px solid var(--edge); background:var(--panel); color:var(--ink);
  border-radius:8px; padding:8px 14px; font-size:13.5px; font-weight:500;
  touch-action:manipulation; -webkit-tap-highlight-color:transparent;
  transition:border-color .12s, background .12s, color .12s;
}
.btn:hover:not(:disabled) { border-color:var(--accent); }
.btn:disabled { opacity:.4; cursor:not-allowed; }
.btn.primary { background:var(--accent); border-color:var(--accent); color:#07090B; font-weight:600; }
.btn.primary:hover:not(:disabled) { filter:brightness(1.08); }
.btn.quiet { background:transparent; color:var(--mid); }

.chip {
  appearance:none; border:2px solid var(--edge); background:transparent; color:var(--ink);
  border-radius:999px; padding:9px 15px; font-size:13.5px; font-weight:600; letter-spacing:.3px;
  touch-action:manipulation; -webkit-tap-highlight-color:transparent;
}
.chip[aria-pressed="true"] { background:var(--accent); border-color:var(--accent); color:#07090B; }

.empty {
  display:flex; flex-direction:column; align-items:center; justify-content:center; gap:12px;
  height:100%; padding:40px 24px; text-align:center; color:var(--dim);
}
.empty h2 { color:var(--ink); font-size:19px; margin:0; font-weight:600; }
.empty p { margin:0; max-width:46ch; font-size:14.5px; line-height:1.6; }
.empty code { font-family:var(--mono); color:var(--accent); font-size:.9em; }

.sheet-backdrop {
  position:fixed; inset:0; background:rgba(4,6,8,.72); display:flex; justify-content:center;
  align-items:flex-start; padding:24px 16px; z-index:50; overflow:auto;
}
.sheet {
  background:var(--panel); border:1px solid var(--edge); border-radius:14px;
  width:min(520px, 100%); padding:22px; display:flex; flex-direction:column; gap:16px;
  margin-top:max(12px, env(safe-area-inset-top));
}
.sheet h2 { margin:0; font-size:17px; font-weight:600; }
.sheet .note { font-size:13px; color:var(--dim); line-height:1.6; margin:0; }
.sheet .note strong { color:var(--accent); font-weight:600; }
.field { display:flex; flex-direction:column; gap:6px; }
.field label { font-family:var(--mono); font-size:10.5px; letter-spacing:.16em; text-transform:uppercase; color:var(--dim); }
.field input {
  background:var(--bg); border:1px solid var(--edge); border-radius:8px; padding:10px 12px;
  font-family:var(--mono); font-size:13.5px;
}
.field input:focus { border-color:var(--accent); outline:none; }
.row { display:flex; gap:10px; flex-wrap:wrap; }
.row .grow { flex:1; }
.err {
  background:rgba(255,95,86,.1); border:1px solid rgba(255,95,86,.4); color:var(--bad);
  border-radius:8px; padding:10px 12px; font-size:13px; line-height:1.5;
}

/* ---------- code room ---------- */
.code-room { display:grid; grid-template-columns:min(300px, 40vw) 1fr; height:100%; min-height:0; }
.code-room.solo { grid-template-columns:1fr; }
.tree { border-right:1px solid var(--edge); display:flex; flex-direction:column; min-height:0; background:var(--lift); }
.tree .filter { padding:10px; border-bottom:1px solid var(--edge); }
.tree .filter input {
  width:100%; background:var(--bg); border:1px solid var(--edge); border-radius:8px;
  padding:8px 11px; font-family:var(--mono); font-size:12.5px;
}
.tree .filter input:focus { border-color:var(--accent); outline:none; }
.tree ul { list-style:none; margin:0; padding:6px; overflow-y:auto; overflow-x:hidden; flex:1;
  -webkit-overflow-scrolling:touch; }
/* overflow-x must be hidden, not auto: otherwise a long name widens the list and
   scrolls sideways instead of ellipsising. */
.tree li { margin:0; min-width:0; }
.tree button {
  width:100%; text-align:left; appearance:none; background:transparent; border:none;
  color:var(--mid); font-family:var(--mono); font-size:12.5px; padding:7px 9px; border-radius:6px;
  display:flex; align-items:center; gap:8px; touch-action:manipulation;
}
.tree button:hover { background:var(--panel); color:var(--ink); }
.tree button[aria-current="true"] { background:var(--panel); color:var(--accent); }
.tree .kind { width:6px; height:6px; border-radius:50%; flex:none; }
.tree .name { display:flex; min-width:0; flex:1; gap:0; align-items:baseline; }
/* The filename always survives; the directory is what gets clipped. */
.tree .dir { color:var(--dim); overflow:hidden; text-overflow:ellipsis; white-space:nowrap;
  flex:0 1 auto; min-width:0; }
/* The filename never shrinks — the directory is what gives way. Letting both
   compete for space costs you the extension, which is the half you scan by. */
.tree .base { flex:0 1 auto; min-width:0; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
.tree .dirty { color:var(--accent); flex:none; }
.tree .count {
  padding:8px 12px; font-family:var(--mono); font-size:10.5px; color:var(--dim);
  border-top:1px solid var(--edge); letter-spacing:.1em; text-transform:uppercase;
}
.editor { min-width:0; min-height:0; display:flex; flex-direction:column; }
.editor .host { flex:1; min-height:0; overflow:hidden; }
.cm-editor { height:100%; }
.cm-editor .cm-scroller { font-family:var(--mono); font-size:13.5px; line-height:1.6; }
.cm-editor.cm-focused { outline:none; }
`;

let mounted = false;

/** Injected once at boot. Rooms never ship their own <style>. */
export const mountTheme = (): void => {
  if (mounted) return;
  const el = document.createElement('style');
  el.id = 'claw-studio-theme';
  el.textContent = CSS;
  document.head.appendChild(el);
  mounted = true;
};
