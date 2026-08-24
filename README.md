# CLAW Studio

One workspace for the whole job: models in git, surfaces in the browser, heavy
work in CI — and all of it drivable from an iPad.

Today two rooms are built. The rest are on the rail, greyed, with what they'll
be — because a plan you can see beats a plan in a document.

| Room | What it is | State |
|---|---|---|
| **Code** | CodeMirror 6 over every file in the repo. The escape hatch under everything. | built |
| **Video** | Data-driven comparison videos, rendered by Remotion. | built |
| **Sheet** | Units as first-class values, budgets as an idiom, cells that read a sim. | Phase 1 |
| **Sim** | TypeScript ODE solver in a Worker; ngspice-WASM for circuits. | Phase 2 |
| **Doc** | Markdown source, WYSIWYG editing, PDF and DOCX out. | Phase 3 |
| **Design** | Parametric SVG panels and pinouts; BOM into the Sheet, DXF for the shop. | Phase 4 |

The architecture, the decisions behind it and the honest scope assessment are in
**[docs/STUDIO-ARCHITECTURE.md](docs/STUDIO-ARCHITECTURE.md)**. Deployment and
the iPad setup are in **[docs/DEPLOY.md](docs/DEPLOY.md)**.

```bash
npm install
npm run web        # the studio — no token needed locally
npm run build      # compile + validate every model
npm run check      # build + typecheck
```

---

## How it holds together

A **model** is a plain-text, schema-validated file describing something real. A
**surface** is a way of looking at one. Every room reads and writes models; none
of them owns data.

```
content/*.yaml -> validate -> generated modules -> React surfaces -> CI artifact
```

Adding a room means adding a compiler to `scripts/build.mjs` and a room to
`studio/shell/rooms.tsx`. The shell, the checks and CI don't change.

Models can point at each other, and the build fails on a reference that doesn't
resolve:

```
video://machine-control-platform#scenario.line-retrofit.winner
```

That's what makes this one studio rather than six apps behind a sidebar.

### Editing from the iPad

Open the deployed studio, connect a fine-grained token in Settings, and edit.
Every keystroke lands in local storage (OPFS) before it goes anywhere, so a tab
Safari kills costs you nothing; **Commit** is a separate, deliberate act. See
[docs/DEPLOY.md](docs/DEPLOY.md).

---

## The video room

Faceless engineering comparison videos, where the whole point is that the answer
is **"it depends"**. You write a YAML file describing the parts, the criteria and
the situations; the studio computes which part wins *in each situation* and
renders it as an animated video — in 9:16, 16:9 and 1:1 — from that one file.

A normal spec-check video is a static table: here are the numbers, here's the
winner. That's not how engineering works.

This models the actual decision:

| Concept | What it is |
|---|---|
| **Criteria** | The axes that matter — determinism, ruggedness, cost, dev speed |
| **Contenders** | The parts, each rated 1–5 on every criterion (your editorial call) |
| **Scenarios** | A situation, which **re-weights** the criteria |
| **Verdict** | Your stated pick, plus the trap answer |

The score is just:

```
score = Σ(weight × rating) ÷ Σ(weight × 5)
```

A criterion weighted 0 in a scenario drops out entirely. That's the trick — a
part that's brilliant at something nobody needs *here* gets no credit for it.
Same four parts, four different winners.

**The build validates your take against your own math.** If you declare a
winner that your weights don't support, it tells you before you record:

```
! scenario "field-logger": you called "ind-arduino" the winner but your own
  weights rank "plc" first — fix the ratings, the weights, or the take
```

It also warns if every scenario has the same winner — because then there's no
"it depends" and the video has no premise.

---

## Working on an iPad

1. **Edit** the YAML in the studio's Code room — or GitHub's web editor, Working
   Copy, Textastic. It's plain YAML with no build step.
2. **Commit.** The `Validate` action checks it in about a minute.
3. **Preview** in the studio's Video room — real animation, real timing, all
   three aspect ratios.
4. **Render** when you're happy: Actions tab → *Render video* → Run workflow →
   pick the video and format → download the MP4 when it finishes.

## Working on a computer

```bash
npm install
npm run web       # the studio — the same thing the iPad gets
npm run studio    # Remotion Studio — scrub, inspect, tweak
npm run render    # every video, every format, into out/
npm run render -- machine-control-platform vertical
npm run check     # build + validate every model, then typecheck
```

`npm run new -- <id> "<Subject>" "<Title>"` scaffolds a new video file with the
structure already correct.

---

## Adding your voice

Faceless doesn't mean silent — narration is what carries a technical video.

1. Record one audio file per scene (phone voice memo is fine). Anything ffmpeg
   reads works: `.m4a`, `.mp3`, `.wav`.
2. Drop them in `public/voice/<video-id>/`.
3. Point each scene at its file:

```yaml
- type: scenario
  id: line-retrofit
  voice: voice/machine-control-platform/05-retrofit.m4a
```

**Scene length then snaps to the real audio length automatically.** You never
set a duration. Record a longer take, the scene gets longer; the animation and
the progress bar follow. Scenes without audio fall back to an estimate from
word count, so a half-written video still previews.

---

## One file, three real cuts

`formats:` on a scene keeps it out of the other aspect ratios:

```yaml
- type: spec
  formats: [horizontal]     # too dense for a 9:16 short
- type: scenario
  id: line-retrofit         # no formats = appears everywhere
```

The example video produces a **68-second** vertical short, a **2:53** YouTube
cut, and a **2:11** square post — from one file, with different scene lists,
not the same edit letterboxed three ways.

---

## Scene types

| Type | What it shows |
|---|---|
| `hook` | Big claim + stakes. Word-by-word entrance. |
| `lineup` | Every contender with its one-line identity. |
| `spec` | Spec table, filtered to the rows you chose. Reflows to blocks in 9:16. |
| `versus` | Two contenders, mirrored bars per criterion. |
| `scenario` | **The money scene** — situation, weights, ranking, verdict, trap. |
| `scorecard` | Full contenders × scenarios grid. The screenshot people save. |
| `takeaway` | Rules of thumb. |
| `outro` | CTA + channel mark. |

See `content/videos/machine-control-platform.yaml` for a fully worked example
and `content/AUTHORING.md` for the complete field reference.

---

## Layout

Everything derives from `src/design/layout.ts`. Each format has its own type
scale, padding, safe insets (9:16 reserves 190px top / 300px bottom so TikTok
and Reels chrome never covers content), and preferred stacking direction.
Scenes ask the layout what shape they're in and adapt — the spec table becomes
per-contender blocks in vertical, the head-to-head stacks, and so on.

Fonts (IBM Plex) are **vendored into `public/fonts`**, not fetched from Google
at render time. Renders are hermetic: same commit, same frames, no network.

## Licensing note

The video room is built on [Remotion](https://remotion.dev), which is free for
individuals and companies of up to 3 people but **requires a paid company
licence above that** (per developer seat). Worth knowing before CLAW Engineering
grows a team.

Remotion is deliberately confined to `src/`, the Video room and the render
workflow — no other room imports it, so a licence change costs one room rather
than the studio. Nothing else in the studio carries a copyleft or
watermark-bearing dependency, and that's a constraint the plan keeps
(see D8–D11 in the architecture doc).
