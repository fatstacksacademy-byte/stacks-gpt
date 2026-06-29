# Per-format style philosophies (`--style`)

A config layer **above** the single global brand kit (`lib/brand.json`).

The brand kit answers *"what does Fat Stacks Academy look like?"* (colors, fonts,
lockup) — it never changes between videos. A **style** answers the next question
down: *"what does **this kind** of video feel like?"* — pacing, how often we
zoom-punch, how loud the SFX, how dense the emphasis captions, which motion-gfx
templates to favor, the default grade tint, the music mood.

So a HYSA-defection video and a bonus-walkthrough share one brand but inherit a
different *feel*, and every new video of a type starts from the look that already
works for that type instead of being hand-tuned from scratch.

## How it plugs in

`build-plan.ts --style <name>` loads `styles/<name>.json` and **biases the plan it
emits** — it does **not** render anything and it does **not** touch the proven
planner/aligner. With no `--style`, output is byte-identical to today's.

Two concrete, measurable biases happen here; the rest is **recorded into
`plan.meta.style`** so the downstream renderers (`render-cards.ts`,
`build_resolve.py`, `preview-full.py`, `build-broll.py`) can read the intent
without this script having to know about rendering:

| Field | Type at build-plan (a bias) | Read downstream as a hint |
|---|---|---|
| `zoom_frequency` | thins/keeps EDL `fx: zoom` tokens by a min-gap | overall zoom cadence |
| `emphasis_density` | thins/keeps the emphasis caption track | caption load |
| `pacing` | — | b-roll dwell, cut rhythm |
| `sfx_intensity` | — | which SFX fire / how hot (`build_resolve.py`, `make_sfx.py`) |
| `favored_gfx` | recorded list | which `motion-gfx.py` templates to reach for first |
| `tint_default` | recorded | default `--tint` / LUT lean |
| `music_mood` | recorded | which bed `preview-full.py --music` picks |

## Schema

A style file is a small flat JSON object. All fields are optional except `name`;
an omitted field means "don't bias that axis" (today's behavior on that axis).

```jsonc
{
  "name": "hysa-defection",        // must match the filename stem; identifies the style
  "pacing": "deliberate",          // deliberate | measured | energetic | rapid  (cut rhythm / dwell)
  "zoom_frequency": "low",         // off | low | normal | high                  (zoom-punch cadence)
  "sfx_intensity": "subtle",       // off | subtle | normal | punchy             (SFX hotness)
  "emphasis_density": "sparse",    // off | sparse | normal | dense              (emphasis-caption load)
  "favored_gfx": ["bignum","bars"],// motion-gfx templates to reach for first
                                   //   (value | steps | bars | bignum | checklist)
  "tint_default": "cool",          // neutral | cool | warm | neg | pos          (grade lean)
  "music_mood": "inspired"         // free text mood → maps to a bed downstream
}
```

### Value scales (how the two active biases read them)

- `zoom_frequency` → minimum seconds between kept `zoom` beats:
  `off` drops every zoom, `low` ≈ 24s apart, `normal` ≈ 12s, `high` keeps them all.
  (Mirrors the README's "reveals ≥18s apart" zoom rule — `low` is stricter, `high` lets the EDL decide.)
- `emphasis_density` → keep-fraction of the emphasis caption track:
  `off` = no emphasis captions, `sparse` ≈ keep every other one, `normal`/`dense` = keep all.
  (`captions.srt` — the YouTube-CC / MagicSubtitle source — is **always full** regardless; this only thins the sparse on-screen burn track.)

The unknown/free-text axes (`pacing`, `sfx_intensity`, `favored_gfx`, `tint_default`,
`music_mood`) are validated as present-and-typed, then passed through verbatim into
`plan.meta.style` for the renderers to interpret.

## Add a new style

1. Copy one of the three examples to `styles/<your-name>.json`, set `name` to match the stem.
2. Tune the axes. Keep it a *philosophy*, not a per-video override — anything truly
   one-off still belongs in that video's EDL `FX` column.
3. `npx tsx build-plan.ts --edl … --transcript … --out … --style <your-name>`.

## Examples shipped

- **`bonus-walkthrough`** — the house "punchy money" default feel (dense, high zoom, gold on every number). Best-cards / single-bonus deep dives.
- **`hysa-defection`** — calm-but-urgent documentary look; the payload is the proof, so fewer gimmicks. The 262K-median lane.
- **`demo`** — product/tool walkthrough; the screen is the star, explainer graphics over zoom theatrics. Stacks OS demo.
