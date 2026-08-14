# Authoring reference

Everything a video shows comes from one YAML file in `content/videos/`.
This is the complete field list.

---

## Top level

```yaml
id: machine-control-platform     # kebab-case, must match how you refer to it
title: "PLC vs SBC vs Custom"    # shown in the preview picker
subject: Machine Control         # shown in the top-right corner of every frame
tagline: Optional one-liner.
formats: [vertical, horizontal, square]   # omit = all three
```

---

## `criteria`

The axes. Keep these to things that actually change a decision — five or six is
usually right. More than eight and the versus scene gets cramped.

```yaml
criteria:
  - id: determinism
    name: Determinism
    hint: Can you promise a worst-case scan time?   # optional
```

---

## `contenders`

```yaml
contenders:
  - id: plc
    name: Compact PLC
    tagline: The boring answer that keeps the line running
    color: "#FFB020"        # optional; defaults to a palette series color
    specs:                  # free-form; keys become spec-table row labels
      Scan time: Deterministic, sub-ms typical
      Unit cost: "$$$"
    ratings:                # 1-5 on every criterion. This drives everything.
      determinism: 5
      ruggedness: 5
    strengths: [...]        # optional, reserved for future scene types
    weaknesses: [...]
```

**Ratings are editorial.** They're your judgment, and the video says so on
screen. Rate honestly — the scorecard makes inconsistency obvious.

Every contender should have a rating for every criterion. A missing one is
treated as 0 and the build warns you.

---

## `scenarios`

The "it depends" unit.

```yaml
scenarios:
  - id: line-retrofit
    name: Production Line Retrofit
    context: Existing line, plant techs on shift, downtime costs dollars a minute.
    weights:
      determinism: 5      # 0-5. Higher = matters more here.
      ruggedness: 5
      unit-cost: 1
      # a criterion you omit entirely is weighted 0 — it drops out
    verdict:
      winner: plc         # optional; omit to let the weights decide
      why: One or two sentences in your voice.
      avoid: sbc          # optional "the trap" callout
      avoidWhy: short clause explaining the failure mode
```

### Weighting well

Weights are the whole argument. Some guidance:

- **Use the full range.** If everything is 3–5, nothing differentiates and every
  scenario picks the same winner.
- **Zero things out aggressively.** In a bench fixture, serviceability genuinely
  doesn't matter. Setting it to 0 is what makes the scenario distinct.
- **Write `context` first, then set weights to match it.** If the context says
  "downtime costs dollars a minute", cost had better be weighted low.

If your `winner` disagrees with what the weights compute, the build warns you.
That's a prompt to think, not a rule — but usually it means the weights don't
yet say what you believe.

---

## `scenes`

The running order. Every scene accepts these:

| Field | Effect |
|---|---|
| `voice: voice/foo/01.m4a` | Scene length snaps to the real audio duration |
| `duration: 6` | Force a length in seconds (ignored if `voice` is set) |
| `formats: [vertical]` | Scene only appears in those aspect ratios |

Priority for length: **voice → duration → estimate from word count.**

```yaml
scenes:
  - type: hook
    text: There is no best controller.       # required
    sub: One sentence of stakes.             # optional

  - type: lineup
    title: The four you'll actually consider # optional

  - type: spec
    title: Only the specs that matter
    rows: [Scan time, Environment]           # optional; omit = all spec rows

  - type: versus
    a: plc                                   # contender id
    b: sbc
    title: The argument everyone has

  - type: scenario
    id: line-retrofit                        # scenario id

  - type: scorecard
    title: Same four parts. Four winners.

  - type: takeaway
    title: How to actually pick
    bullets: [ "...", "..." ]                # required

  - type: outro
    text: Which one would you spec?
    sub: Tell me the constraint I got wrong.
```

---

## Cutting for each format

A 9:16 short should be one idea. A 16:9 cut can be the full argument.

A structure that works:

| Scene | Vertical | Square | Horizontal |
|---|:--:|:--:|:--:|
| `hook` | ✓ | ✓ | ✓ |
| `lineup` | | ✓ | ✓ |
| `spec` | | | ✓ |
| `versus` | | | ✓ |
| `scenario` ×2 (the sharpest contrast) | ✓ | ✓ | ✓ |
| `scenario` ×2 (the rest) | | partial | ✓ |
| `scorecard` | ✓ | ✓ | ✓ |
| `takeaway` | | ✓ | ✓ |
| `outro` | ✓ | ✓ | ✓ |

Pick the two scenarios with the *most different* winners for the short. The
whole hook of a 60-second video is "wait, the answer changed."

---

## What the build checks

Run `npm run content` (or push — CI runs it).

**Errors** (build fails):
- YAML that doesn't match the schema
- A rating or weight naming a criterion that doesn't exist
- A scene referencing an unknown contender or scenario
- A `spec` scene asking for a row no contender defines
- A scenario whose weights are all zero
- Duplicate video ids

**Warnings** (build passes, but read them):
- A contender missing a rating for some criterion
- A `voice:` file that isn't in `public/` yet
- A stated winner your weights don't support
- Every scenario having the same winner
