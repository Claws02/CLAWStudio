# CLAW Engineering Studio

A video studio for faceless engineering comparison videos, where the whole point
is that the answer is **"it depends"**.

You write a YAML file describing the parts, the criteria, and the situations.
The studio computes which part wins *in each situation* and renders it as an
animated video — in 9:16, 16:9, and 1:1 — from that one file.

No timeline scrubbing. No re-editing three versions. Change a rating, re-render.

---

## The idea

A normal spec-check video is a static table: here are the numbers, here's the
winner. That's not how engineering works.

This studio models the actual decision:

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

You never need to run a build on the iPad. The loop is:

1. **Edit** `content/videos/<id>.yaml` — GitHub's web editor, Working Copy,
   Textastic, anything. It's plain YAML with no build step.
2. **Push.** The `Validate` action checks it in ~1 minute and the preview site
   redeploys.
3. **Preview** in Safari on the GitHub Pages URL — real animation, real timing,
   all three aspect ratios.
4. **Render** when you're happy: Actions tab → *Render video* → Run workflow →
   pick the video and format → download the MP4 artifact when it finishes.

> **Pages on a private repo needs a paid GitHub plan.** If `Deploy preview`
> fails, that's why — everything else still works, and you can preview on a
> computer with `npm run web`. Make the repo public or upgrade if you want the
> iPad preview.

## Working on a computer

```bash
npm install
npm run studio    # Remotion Studio — scrub, inspect, tweak
npm run web       # the same preview player the iPad gets
npm run render    # every video, every format, into out/
npm run render -- machine-control-platform vertical
npm run check     # validate content + typecheck
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

This is built on [Remotion](https://remotion.dev), which is free for
individuals and companies of up to 3 people, but **requires a paid company
license above that**. Worth knowing before CLAW Engineering grows a team.
