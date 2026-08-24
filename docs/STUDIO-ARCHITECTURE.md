# CLAW Studio — Architecture Deep Dive

> **Status:** Phase 0 is built (see §10). Everything from Phase 1 on is still a
> proposal. Written 2026-08-24 against commit `1549889`.
> **Question it answers:** can design, simulation, video, spreadsheet, documents,
> and a code editor live in *one* studio that runs from an iPad — and if so, what
> is the shape of the thing?
>
> **Short answer:** yes, and the current repo is already 80% of the right skeleton.
> But not as six apps behind one sidebar. As **one compiler with six back-ends.**

---

## 1. What this repo actually is today

It looks like a video tool. It isn't. Strip the subject matter away and the
pipeline is:

```
content/*.yaml
   → zod schema validation + cross-reference checks + editorial checks
   → src/content/generated.ts   (typed, committed-adjacent build artifact)
   → React renderers that read the model and never hard-code a value
   → GitHub Actions produces the heavy artifact (MP4)
   → a browser preview reads the same model and renders it live
```

Nothing in that chain is video-specific except the eight scene types. The
validation pass, the generated-module pattern, the "browser previews / CI
renders" split, the `formats:` mechanism that yields three real cuts from one
source — all of it generalises.

The single best thing in the codebase is the check in `scripts/build-content.mjs`
that warns when your declared winner contradicts your own weights:

```
! scenario "field-logger": you called "ind-arduino" the winner but your own
  weights rank "plc" first — fix the ratings, the weights, or the take
```

That is a *semantic* check, not a syntax check. It knows what the document is
supposed to mean. Every surface in the studio should have one of those, and that
principle is what makes this a studio rather than a launcher.

---

## 2. The organising idea: Models and Surfaces

Two nouns. Everything follows from them.

**A model** is a plain-text, schema-validated file describing something real:
a comparison, a circuit, a control loop, a panel layout, a cost budget, a
document. It lives in git. It diffs. It reviews.

**A surface** is a way of looking at a model: a video, a spreadsheet grid, a
printed page, a design canvas, a chart, a text buffer.

> The studio is: **models in git, surfaces in the browser, heavy work in CI.**

The test of whether you've built one studio or six apps is a single question:

> Can a number computed by the thermal simulation appear — without copy-paste,
> and updating automatically — as a cell in the cost sheet, a figure in the spec
> document, a dimension in the panel design, and an animated readout in the
> YouTube short?

If yes, it's a studio. If no, it's a launcher with a nice sidebar. Everything in
section 4 exists to make the answer yes.

### 2.1 The reference protocol

One resolver, used by every surface. Any model can point into any other:

```yaml
# in a sheet cell, a doc paragraph, a design label, or a video scene
=REF("sim://thermal-budget#steady.T_case")
=REF("sheet://cost-model#Totals!B12")
=REF("video://machine-control-platform#scenario.line-retrofit.winner")
```

Resolution lives in exactly one place (`spine/resolve.ts`) and runs in two
contexts: at build time (so CI can fail on a dangling ref, the same way it
already fails on an unknown criterion id) and at edit time (so the iPad shows
live values). Cycles are detected the same way the sheet detects circular
references — one algorithm, one error message format.

**This is the whole trick.** It is the same trick the repo already plays: a
scenario re-weights criteria and every scene re-derives itself. Scale that from
"scenes within a video" to "surfaces within a project" and you have the studio.

---

## 3. The iPad constraint decides the architecture

Everything below is downstream of one fact: **an iPad cannot run Node, ffmpeg, a
SPICE binary, or a Verilog toolchain.** That isn't a limitation to work around,
it's the forcing function that produces a clean design. Four compute tiers:

| Tier | Where | Budget | What runs there |
|---|---|---|---|
| **0 — Instant** | Browser, main thread | < 16 ms | Formula eval, scoring, layout, chart draw, ref resolution |
| **1 — Interactive** | Browser, Web Worker | < 2 s | ODE integration (RK4), small-circuit transient/DC, Monte Carlo ≤ 1e5, sheet recalc of large tables |
| **2 — Deferred** | GitHub Actions | 1–60 min | Video renders, parameter sweeps, Verilog sims, Python/numpy, high-fidelity PDF/DOCX/XLSX export |
| **3 — Heavy iron** | Self-hosted runner (his desktop) | hours | FPGA place & route, long sims, anything needing a licensed toolchain |

**The rule that keeps this honest: the iPad never starts anything that can fail
slowly.** If a job can't finish in two seconds, it is not a button that spins —
it is a CI job that produces a result file. Tier 2 and Tier 3 share one
interface; the only difference is `runs-on:`.

Tier 2 is already proven in this repo: `render.yml` is a `workflow_dispatch` job
that emits a downloadable artifact. That exact pattern becomes the generic
"deferred job" mechanism. From the iPad it's one authenticated POST.

### 3.1 Verified iPad-specific findings

These changed the design, so they're recorded with sources:

- **Code editor: CodeMirror 6, not Monaco.** Monaco is effectively unusable on
  iOS — it reads input through a hidden `textarea`, and iOS doesn't fire key
  events for arrow/function keys from external keyboards. CodeMirror 6 was
  rewritten specifically for touch and uses native `contentEditable`.
  ([Replit's writeup](https://blog.replit.com/codemirror),
  [monaco-editor#293](https://github.com/microsoft/monaco-editor/issues/293))
- **Offline storage works: OPFS is supported on iPadOS Safari**, with an origin
  quota up to ~60% of disk for browser apps since Safari 17. It is *the* storage
  API available there (the wider File System Access API is not). Unavailable in
  Private Browsing.
  ([WebKit storage policy](https://webkit.org/blog/14403/updates-to-storage-policy/),
  [MDN](https://developer.mozilla.org/en-US/docs/Web/API/File_System_API/Origin_private_file_system))
- **Don't ship Pyodide to the iPad.** Multi-MB runtime before packages, SciPy is
  heavy and failure-prone, WASM memory caps around 2 GB, and iOS has shipped
  broken `wasm-gc` that passes Pyodide's own feature detection. Python belongs in
  Tier 2. ([Pyodide changelog](https://pyodide.org/en/stable/project/changelog.html),
  [MS DevBlog on Pyodide limits](https://devblogs.microsoft.com/python/feasibility-use-cases-and-limitations-of-pyodide/))
- **Browser SPICE is real.** ngspice compiled to WASM ships as
  [`eecircuit-engine`](https://github.com/eelab-dev/EEcircuit-engine) on npm,
  taking standard ngspice netlists. Lazy-load it only when a circuit model opens.

---

## 4. How the iPad writes back to git

This is the load-bearing plumbing decision, and it has one non-obvious finding.

**`isomorphic-git` cannot push from a browser without your own CORS proxy.**
GitHub's git endpoints don't send CORS headers; the public
`cors.isomorphic-git.org` proxy only accepts requests from isomorphic-git's own
origin. Running your own proxy means running a server that sees every request in
cleartext relative to your token.
([isomorphic-git/cors-proxy](https://github.com/isomorphic-git/cors-proxy),
[isomorphic-git#780](https://github.com/isomorphic-git/isomorphic-git/issues/780))

**The GitHub REST API is CORS-enabled and needs no proxy.** So:

| Operation | Mechanism |
|---|---|
| Read models fast | Fetch the deployed build bundle from the studio origin |
| Read a file for editing | `GET /repos/{o}/{r}/contents/{path}` |
| Save one file | `PUT /repos/{o}/{r}/contents/{path}` |
| Save several atomically | Git Data API: blob → tree → commit → update-ref |
| Trigger a Tier-2 job | `POST /repos/{o}/{r}/actions/workflows/{id}/dispatches` |
| Collect results | Poll runs, download artifact, or read the committed `*.result.json` |

**Local-first, not cloud-only.** Every edit lands in OPFS *first* and syncs to
GitHub after. This is not a nicety — Safari on iPadOS kills tabs under memory
pressure, and losing twenty minutes of spreadsheet work once will make the whole
studio untrustworthy. OPFS as a write-ahead log means a killed tab costs nothing.

### 4.1 The risk I'd watch first

**Auth.** To write from the iPad browser you need a credential in the browser. A
fine-grained PAT (contents: write, this repo only) in `localStorage` is the
zero-infrastructure option and it works today — but any script injection on that
origin becomes repo write access, and this app renders user content by design.

Mitigations if you take that path: strict CSP with no third-party scripts, the
token scoped to one repo, short expiry, and *never* serve untrusted preview
content from the studio's own origin — sandbox previews into a separate origin.

The upgrade path is a GitHub App with an OAuth device flow, which needs one
serverless function to hold the client secret. That single requirement is why
**hosting should move to Cloudflare Pages** (see below): same vendor gives you
the Worker for free when you want it.

Everything else in this document is a rendering problem you can iterate on. This
is the one decision that is expensive to retrofit.

### 4.2 Hosting: move off GitHub Pages

The README already flags it — **Pages on a private repo requires a paid plan**,
and `preview.yml` will fail at the deploy step on a free private repo. That
paywall now sits in front of the entire studio, not just a video preview.

**Decided: Cloudflare Pages, repo stays private.** Free tier, private repos
fine, custom domain, and it unlocks the Workers-based auth broker above without
adding a vendor. Settings are in [DEPLOY.md](DEPLOY.md). `preview.yml` is now
manual-dispatch only, so it can't sit permanently red; Validate still builds the
studio bundle on every push.

**Why not just make the repo public?** It would genuinely work — Pages is free
there and Actions minutes become unlimited, which matters for Tier-2 renders.
It's still the wrong trade: this repo is about to hold cost models, BOMs, spec
sheets and unreleased video takes with your editorial ratings in them. Staying
private costs the 2,000 free Actions minutes a month (roughly 30–60 renders); if
that binds, buying minutes is far cheaper than publishing the work.

---

## 5. The six rooms

Each room is a lazy-loaded route over the same spine. None of them owns data;
they all read and write models.

### 5.1 Code — the escape hatch under everything

CodeMirror 6 over repo files, with YAML/TS/Markdown modes and schema-aware
completion driven by the *same* zod schemas the build uses. Every model in the
studio is editable as text here. When a visual surface can't express something,
you drop to text — and the build still validates it. This room is why the studio
never traps you.

**Build first.** It's the smallest room and it makes every other room debuggable.

### 5.2 Sheet — "my own Excel"

Source format `*.sheet.yaml`: named tables, typed columns, formulas as strings.
Diffs cleanly. Reviews in a PR. Doesn't corrupt.

**Write the calc engine.** ~800 lines: tokenizer → AST → dependency graph →
topological recalc, plus a function library. That sounds like a lot until you
look at the alternatives:

- **HyperFormula is GPLv3-or-commercial.** Its GPL terms require your entire
  application to be open source, or you buy a proprietary licence. That poisons a
  commercial CLAW product.
  ([HyperFormula licensing](https://hyperformula.handsontable.com/docs/guide/licensing.html))
- **SheetJS CE is Apache-2.0 but has left npm** — the registry copy is stale at
  0.18.5, current builds come from `cdn.sheetjs.com`. It's a file-format toolkit,
  not a calc engine, so it belongs at the export boundary anyway (vendored, not
  npm-installed). ([SheetJS CDN](https://cdn.sheetjs.com/),
  [reporting on the npm exit](https://www.bleepingcomputer.com/news/software/npm-package-with-14m-weekly-downloads-ditches-npmjscom-for-own-cdn/))

The differentiator isn't function count — it's the three things Excel can't do:

1. **Cells that reference the spine.** `=REF("sim://thermal#steady.T_case")`,
   `=RATING("plc","determinism")`. The sheet recomputes when the sim re-runs.
2. **Units as first-class values.** `12 N·m`, `3.3 V`, `450 mA`. Adding volts to
   amps is a build error, not a silent wrong answer. This alone justifies the room
   for an engineering practice.
3. **Budgets as an idiom.** Power budget, error budget, cost roll-up, tolerance
   stack-up with RSS and worst-case columns computed for you.

Semantic check for this surface: circular refs, unit mismatch, a budget whose
line items don't sum to its stated total, a tolerance stack with no margin.

### 5.3 Doc — "my own Word"

Source: Markdown + YAML front matter. Edited WYSIWYG via ProseMirror/Tiptap
(MIT), with a one-tap drop to raw text in the Code room.

- **PDF** via CSS paged media (headers, footers, page numbers, figure numbering).
- **DOCX** via the [`docx`](https://github.com/dolanmiu/docx) library (MIT, works
  in browser and Node) — run in CI for fidelity.

What Word can't do: a spec sheet whose torque table *is* the sheet's table, whose
efficiency figure *is* the sim's result, and whose revision block is the git log.
Change a rating, the document is already correct.

Semantic check: dangling refs, figures with no caption, a revision block that
doesn't match the commit.

### 5.4 Design — parametric first, freehand later

**Decided:** both, engineering first. The parametric surface gets built as
described below; a looser drawing mode for thumbnails and explainer diagrams
comes after it, on the same canvas, rather than as a second room.



Artboards as declarative SVG (`*.design.yaml` → SVG), with direct manipulation on
canvas. Component library, snapping, dimensions that can come from the spine.

**Avoid tldraw.** It requires preserving a "Made with tldraw" watermark unless
you buy a business licence, and in production (HTTPS, non-localhost,
`NODE_ENV=production`) the SDK requires a licence key.
([tldraw licence](https://tldraw.dev/community/license),
[license key docs](https://tldraw.dev/sdk-features/license-key))
Excalidraw (MIT) is a fine option *if* freehand sketching matters more than
parametric precision. For CLAW's actual work — control panel layouts, enclosure
faceplates, pinout diagrams, block diagrams — it doesn't.

The payoff of parametric: a panel layout where the cutout for a 22 mm pilot light
is 22 mm because the component library says so, the bill of materials falls out
of the artboard into the Sheet room, and the whole thing exports DXF for the shop.
That is a thing Figma and Illustrator structurally cannot do.

Semantic check: overlapping cutouts, components off the panel, clearance
violations, a BOM line with no part number.

### 5.5 Sim — the room that makes the rest interesting

Models declare state variables, parameters, equations, and stimuli. Solver is
TypeScript (RK4 with adaptive step) running in a Worker over typed arrays —
fast, small, deterministic, no download cliff, no licence.

| Model kind | Tier | Engine |
|---|---|---|
| Control loop, thermal, motion profile, fluid, lumped dynamics | 1 | Own TS ODE solver |
| Circuit (transient/DC/AC) | 1 | `eecircuit-engine` (ngspice WASM), lazy-loaded |
| Parameter sweeps, Monte Carlo > 1e5 | 2 | Same solver, in CI |
| Verilog / FPGA | 2/3 | Icarus or Verilator in Actions; toolchain on self-hosted |
| Anything needing numpy/scipy | 2 | Python in Actions — **not** Pyodide on the iPad |

Every run writes `*.result.json`: signals, metadata, the parameter set, and the
commit it ran against. That file is what the Sheet reads, the Doc charts, the
Design dimensions from, and the Video animates. **Results are committed
artifacts, not ephemeral state** — which means a video render in CI is
reproducible from the same commit, exactly like the fonts are vendored today.

Semantic check: unstable configurations, stiff systems the step size can't
handle, results whose parameters no longer match the model that produced them
(stale result detection — this is the one that saves you).

### 5.6 Video — extend, don't rebuild

Today's eight scene types stay. Add three that read the spine:

- `plot` — animate a sim signal over time, with the playhead as the sim clock.
- `sweep` — animate a parameter sweep, showing the design space moving.
- `schematic` — bring a Design artboard in with callout animation.

This is where "one studio" stops being an argument and becomes visible: run the
sim, and the chart animates in the short. Nobody else's toolchain does that
without an export/import dance.

**Isolate Remotion here.** Verified: the company licence is required for
for-profit orgs with **more than three people**, at $25/seat/month for the
creator tier. ([Remotion pricing](https://www.remotion.dev/docs/license/pricing),
[FAQ](https://www.remotion.dev/docs/license/faq)) That's fine at CLAW's current
size and it's already in the README — but keep Remotion out of the studio shell
and out of the other five rooms, so a future licence change costs you one room,
not the product.

---

## 6. What holds it together

```
studio/
  spine/            types, zod schemas, ref resolver, units, result cache
  compilers/        one per model kind, all implementing the same interface
  rooms/            code/ sheet/ doc/ design/ sim/ video/  (lazy-loaded routes)
  shell/            file tree, command palette, build report, sync status
projects/
  <project>/
    *.video.yaml  *.sheet.yaml  *.sim.yaml  *.design.yaml  *.doc.md
    results/*.result.json
```

**One build, many compilers.** `scripts/build-content.mjs` becomes `build.mjs`
with a registry keyed by file suffix. The existing script *is* the video
compiler — this is a rename plus an interface, not a rewrite. One validation
report format for all of them, in the `!` warning style that already exists.

**One bundle budget.** The video preview alone measures **488 KB raw / 153 KB
gzipped** today. Six rooms in one bundle would be punishing on cellular. Every
room lazy-loads; the shell stays under ~80 KB gzipped. ngspice-WASM, Tiptap, and
CodeMirror load on first use of their room and are cached thereafter.

**One design language.** `src/design/tokens.ts` — the instrument-panel palette
and IBM Plex — is already right and already vendored. It becomes the studio's
UI theme, not just the video's. The studio should look like the videos look.

---

## 7. Honest assessment

### Realistic
- Code room, Sheet room (engineering-grade), Sim room for lumped/ODE/circuit
  models, Doc room, Design room for parametric panel work, Video extensions.
- Full iPad operation for authoring, previewing, and dispatching heavy jobs.
- Cross-surface references. This is mostly resolver plumbing, and it's the part
  that makes the whole thing worth building.

### Stretch
- Real-time multiplayer editing (needs a server and CRDTs — different project).
- DXF export (doable); STEP export (much harder).
- Full SPICE device-model libraries within iPad memory.
- Offline sync with real conflict resolution rather than last-write-wins.

### Not viable — saying this plainly
- **"My own Excel" meaning Excel parity.** 400+ functions, pivot tables, a charting
  engine, and lossless xlsx round-trip is person-decades. What *is* viable is a
  calc surface that is **better than Excel for engineering** — units, budgets,
  live sim refs, git history — that reads and writes xlsx at the boundary.
- **"My own Word" meaning Word parity.** Same story, same answer: a document
  surface that produces better engineering documents than Word, and exports .docx.
- **3D CAD or FEA in an iPad browser** at useful fidelity. Route to Tier 3 or a
  desktop tool; the studio can hold the model and the results, not the solver.

### Realistic timeline (part-time, evenings and weekends)

| Phase | Scope | Estimate |
|---|---|---|
| 0 | Spine + shell + Code room + hosting move + write path | ~1 week |
| 1 | Sheet room (the formula engine is most of it) | 2–3 weeks |
| 2 | Sim room: TS solver, charts, result files | ~2 weeks |
| 2b | ngspice-WASM circuit backend | ~1 week |
| 3 | Doc room + PDF/DOCX export | ~2 weeks |
| 4 | Design room (direct manipulation is where the time goes) | 3–4 weeks |
| 5 | Cross-surface refs + new video scene types | 1–2 weeks |

**~3 months part-time to a V1 you'd actually use daily.** Not six weeks. The
Design room is the one most likely to overrun, because direct manipulation on
touch is fiddly in a way that doesn't show up in an estimate.

The sequencing matters more than the totals: **Phase 5 is what makes it a studio,
but it's only worth doing after two surfaces exist to connect.** Build Code →
Sheet → Sim, wire those three together, and you'll know within a month whether
the whole premise holds.

---

## 8. Decision register

| # | Decision | Because |
|---|---|---|
| D1 | One compiler, many back-ends — not six apps | The existing pipeline already is one; six apps can't share refs |
| D2 | Models are plain text in git; results are committed artifacts | Diffable, reviewable, reproducible renders |
| D3 | Four compute tiers; iPad never starts a slow-failing job | The only way an iPad-first studio stays honest |
| D4 | GitHub REST API for writes, not isomorphic-git | Verified: browser push needs your own CORS proxy |
| D5 | OPFS as write-ahead cache before every sync | Safari kills tabs; losing work once kills trust |
| D6 | Cloudflare Pages, repo stays private | Pages+private repo is paywalled; going public would expose cost models and unreleased takes |
| D7 | CodeMirror 6 for all text editing | Verified: Monaco is unusable on iPadOS |
| D8 | Write the formula engine; avoid HyperFormula | Verified: GPLv3-or-commercial poisons a commercial product |
| D9 | Parametric SVG for Design, freehand later; avoid tldraw | Panels and pinouts need precision; tldraw needs a watermark or licence key in production |
| D10 | Python and Verilog live in CI, never in the iPad | Verified: Pyodide is heavy and iOS wasm-gc is broken |
| D11 | Remotion stays confined to the Video room + CI | Licence is per-seat above 3 people; contain the blast radius |
| D12 | Every surface gets a semantic check, not just a schema check | It's the best idea already in this repo |

---

## 9. Phase 0 — what is actually built

Built and driven in a browser, not just written:

| Piece | Where | What it does |
|---|---|---|
| Spine | `studio/spine/` | Model kinds, the ref parser and resolver, cycle detection, the shared diagnostic shape |
| Build | `scripts/build.mjs` + `scripts/compilers/` | One compiler registry, one report, one exit code. The old `build-content.mjs` is now the video compiler, moved rather than rewritten |
| Ref checking | `scripts/build.mjs` | `video://…#…` refs are resolved at build time; a dangling one fails the build |
| Shell | `studio/shell/` | Rail, lazy room routing, status bar, token sheet. Rooms that aren't built say what they'll be |
| Write path | `studio/shell/fs/` | OPFS draft cache → GitHub REST (or the local checkout in dev). Draft state is broadcast so the status bar can't lie |
| Code room | `studio/rooms/code/` | CodeMirror 6, per-file language chunks, filter, draft indicators, commit and revert |
| Video room | `studio/rooms/video/` | The previous preview, now a room. Remotion imported nowhere else |
| Install | `web/index.html`, `public/` | Manifest, icons, standalone display — Add to Home Screen works |

Measured bundle after splitting: shell **71 KB gz**, Code room **132 KB gz**,
Video room **89 KB gz**, language packs 5–39 KB gz each and only fetched for the
file type you open.

**Not yet done in Phase 0:** dispatching a Tier-2 render from the studio. The
API call exists (`dispatchWorkflow` in `fs/github.ts`) and is unused — it wants a
jobs panel to be worth surfacing, which belongs with the Sim room in Phase 2.

---

## 10. Verified vs unverified

**Verified in this session**
- Repo built clean at `1549889` before any changes: `npm ci`, content build
  (1 video, 0 warnings), `tsc --noEmit`, `vite build` all exit 0. Baseline
  bundle measured at 487.83 KB raw / 153.20 KB gzipped.
- Phase 0 builds clean: `npm run build`, `npm run typecheck`, `vite build`.
- Phase 0 driven in headless Chromium at iPad viewport: all six rooms reachable,
  a YAML model opened and edited, the draft written to OPFS and counted in the
  status bar, **Save** written through to disk and the draft cleared, revert
  restoring the file, the video player mounting, and no console errors. At
  430 px wide the page does not scroll sideways.
- Every file in `src/`, `web/`, `scripts/`, `content/`, `.github/` read in full
  (~2,840 lines total).
- All external claims in §3.1, §4, §5 and §8 checked against current sources,
  linked inline: HyperFormula licensing, tldraw licensing, SheetJS distribution,
  CodeMirror vs Monaco on iOS, OPFS on iPadOS, isomorphic-git CORS, Pyodide on
  iOS, ngspice-WASM availability, Remotion pricing.

**Not verified — would need building or an iPad in hand**
- That the ~800-line formula engine estimate holds. It's from the shape of the
  problem, not from having written this one.
- Actual ngspice-WASM performance and memory footprint *on an iPad*, as opposed
  to on desktop Safari.
- Whether CodeMirror 6 + Tiptap + a canvas surface coexist comfortably within
  iPadOS Safari's per-tab memory ceiling. This is the technical risk I'd
  prototype earliest.
- Cloudflare Pages behaviour with this specific private repo and build.
- All timeline estimates. They're calibrated to the shape of the work, not to
  measured velocity on this codebase.
