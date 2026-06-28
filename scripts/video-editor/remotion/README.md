# Remotion motion graphics — code-driven, alpha-channel overlays (zero-token)

A **self-contained** sub-project that authors motion graphics as React/TypeScript
components and renders them **headlessly** to **transparent (alpha) `.mov` overlays**.
Drop the output on a Resolve **V2–V5** track or composite it over the face with ffmpeg.

This closes the gap the main pipeline documents as **GUI-only** — animated zoom /
reveals / transitions (the MagicZoom/MagicSubtitle/MagicAnimate hero pass). Here those
are **spring/keyframe animations in code**, rendered locally with **no API calls**
(zero-token at render time). The look is the same Fat Stacks Academy brand as the
thumbnails and the Python cards: colors/fonts/lockup are imported from
[`../lib/brand.json`](../lib/brand.json) via [`src/brand.ts`](src/brand.ts), so nothing
drifts from one identity.

> Isolated from the repo: this dir has its **own `package.json`**. `remotion`/`react`
> are **not** added to the repo root. Run `npm install` **inside this directory only**.

## Compositions

| `comp` | What it is | Mirrors |
|---|---|---|
| **Callout** | The gold `$/%` number **chip** that springs in and **counts up** (`value` + small `label`). Transparent — the overlay chip itself. | the gold callout on every `$ / % / 100K` + `motion-gfx.py` result number |
| **Value** | The **A × B = C** worth explainer; result **pops + counts up** in gold, factors stagger in. | `motion-gfx.py --type value` |
| **Bars** | A 2–4 value **comparison**; bars grow + values count up, last bar = gold. | `motion-gfx.py --type bars` |

All three paint a **transparent background**, so rendered to **ProRes 4444** (`.mov`)
they carry an **alpha channel** for overlay use. They render in the proven **1920×1080**
brand coordinate space at **30fps** (same as `motion-gfx.py`).

## Install (this directory only)

```bash
cd scripts/video-editor/remotion
npm install
```

Remotion downloads a headless Chromium on first render (cached under the package). This
is the heaviest step; it needs network + a few hundred MB.

## Render — `render.mjs` (spec JSON → alpha .mov)

`render.mjs` takes a spec `{comp, props}` and writes a transparent `.mov`. It copies the
brand TTFs into `public/fonts/` so headless Chromium can load Anton/Archivo Black, then
bundles + renders via `@remotion/renderer`.

```bash
# Callout — the gold bonus chip, 2s
node render.mjs \
  --spec '{"comp":"Callout","props":{"value":"$1,500","label":"bonus"}}' \
  --duration 2 --out out/callout.mov

# Value — A × B = C, result counts up, 4s
node render.mjs \
  --spec '{"comp":"Value","props":{"label":"what the bonus is worth","a":"100,000 pts","b":"1.5¢ / pt","c":"$1,500"}}' \
  --duration 4 --out out/value.mov

# Bars — comparison, last bar gold, 4s
node render.mjs \
  --spec '{"comp":"Bars","props":{"title":"Best-ever bonus","items":[{"label":"Usual","value":75000},{"label":"Right now","value":100000}]}}' \
  --duration 4 --out out/bars.mov

# spec from a file (ProRes 4444 is the default, verified-alpha overlay codec)
node render.mjs --spec @spec.json --out out/clip.mov
```

There's also `npm run smoke` (a 2s Callout) for a one-command sanity render.

**Flags:** `--spec` (inline JSON or `@file`) · `--out` · `--duration` (seconds) ·
`--fps` (default 30) · `--codec prores|vp9|vp8` (default **prores** = ProRes 4444 `.mov`,
the verified-alpha overlay; `vp9`/`vp8` write a smaller `.webm`, but whether their alpha is
readable depends on your ffmpeg build — prores is the safe path) ·
`--scale` (1 = proven 1080, 2 = native 4K — mirrors the pipeline's `RENDER_SCALE`).

### Verify the alpha channel

```bash
ffprobe -v error -select_streams v:0 -show_entries stream=codec_name,pix_fmt -of default=nw=1 out/callout.mov
#   codec_name=prores   pix_fmt=yuva444p10le   ← the 'a' / 'yuva' means alpha is present
# qtrle reports: codec_name=qtrle  pix_fmt=argb
```

## Drop it onto the edit

**Resolve (the overlay tracks):** import the `.mov` and place it on **V2–V5** above the
face — the transparent background lets the chip/explainer float over your A-roll exactly
where you say the number. (Same role the Python `motion-gfx` cards play, but pre-animated.)

**ffmpeg composite (no Resolve):** overlay the alpha .mov onto a clip for a quick taste —
a real face clip with a detectable face lives at `../build/stacksos-demo/raw.mp4`:

```bash
ffmpeg -i face.mp4 -i out/callout.mov \
  -filter_complex "[0:v][1:v]overlay=shortest=0:enable='between(t,3,5)'" \
  -c:a copy composited.mp4
```

## Edit / extend

- **Brand:** never hand-edit colors here — change [`../lib/brand.json`](../lib/brand.json)
  (the one source of truth) and every composition + the thumbnails + the Python cards
  update together. `src/brand.ts` only *bridges* that json into CSS strings.
- **New composition:** add `src/Foo.tsx` (export a component + `fooDefaults`), register it
  in [`src/Root.tsx`](src/Root.tsx), and it's renderable by `--spec '{"comp":"Foo",...}'`.
- **Preview interactively:** `npm run studio` opens the Remotion Studio to scrub/tweak
  props live (great for dialing spring `damping`/`stiffness`).
- **Fonts:** Anton (`FSA Display`) + Archivo Black (`FSA Heavy`) load via the `FontFace`
  web API (`src/fonts.tsx`) — the same base64/headless-safe approach as `lib/brand.ts`.
  If a TTF is missing, text falls back to the system body stack instead of blanking.
