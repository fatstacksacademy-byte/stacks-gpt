# Virtual Editor — EDL → DaVinci Resolve, zero edit-tokens

> **QC toolkit:** see [`QC-TOOLKIT.md`](QC-TOOLKIT.md) — 9 gates that make Claude verify a cut
> (exact-frame, audio, overlay-timing, positions, safe file ops) **before you ever see it**.
> Background + rationale in `VIDEO-EDIT-PROCESS-AUDIT.md` (repo root). Run `verify-frames.py`
> + `qc-audio.py` before calling any cut done.

Turns a `VIDEO-EDL-*.md` + the spoken transcript into a fully-laid DaVinci Resolve
Studio timeline: branded title cards, full-screen earning graphics, transparent
lower-thirds, screen B-roll, **clean line captions, gold number callouts, SFX on
section/zoom beats, chapter + zoom markers, and a consistent grade** — all placed
at the moment you actually say each thing.

All graphics share one identity (the **brand kit**, `lib/brand.json` — "punchy money"
green/gold/navy, Anton + Archivo Black). The same file drives the thumbnail generator
(`scripts/thumb-gen`), so thumbnails and in-video graphics match. Effects the Resolve
API can't do (animated zooms, animated captions, transitions, ducking) are a short
GUI pass — see `HERO-POLISH.md` (uses MagicZoom / MagicSubtitle / MagicAnimate).

**Token cost:** Descript is used only to (1) export the transcript (free) and
(2) render the A-roll once (a render, *not* the AI agent). All editing is local
via Resolve's Python API + Playwright + ffmpeg. **No metered Descript AI tokens.**

## Recommended workflow (DaVinci Resolve 21 AI)

Resolve 21 Studio replaces the two parts this pipeline was weakest at — the cut and
the audio — with native, local, token-free AI. Verified working on this machine:

| Need | Resolve 21 tool | Scriptable? |
|---|---|---|
| The cut (best-take from script, filler/dead-space) | **AI IntelliScript** (Cut page) | UI-only (you run it) |
| Roomy/"underwater" recording audio | **Voice Isolation** | ✅ `SetVoiceIsolationState()` — wired into `build_resolve.py --voice-isolation N` |
| Captions | `CreateSubtitlesFromAudio` | ✅ `build_resolve.py --captions` |
| Vertical Shorts | **Smart Reframe** | ✅ `reframe-vertical.py` |
| Transcription | `TranscribeAudio()` | ✅ |
| B-roll placement | (no AI) — explicit cues or place by hand | — |

**The flow:**
1. Record (multiple takes OK — IntelliScript picks the best). Keep 30fps.
2. **IntelliScript** builds the cut from your script (UI) — replaces Descript + the local cutters below.
3. `build_resolve.py` layers graphics/lower-thirds/B-roll **and** turns on Voice Isolation.
4. `reframe-vertical.py` → a 9:16 Short.

> ⚠️ Resolve's default project frame rate is 24; the API can set the *timeline* rate to 30
> but **not** the *playback* rate, which then plays 30fps footage at 0.8x → audio sounds
> "underwater". Fix once: Resolve → set default project frame rate to 30 (Project Settings,
> Master, then save as default). Per-project: Master Settings → Playback frame rate → 30.

*Planned:* `build_resolve.py --onto-timeline <name>` to layer graphics onto an
IntelliScript-built timeline (instead of `--aroll <mp4>`).

### Cutting an AD-LIB recording — `cut-single.py` → colour-mark → `apply-marks.py`

IntelliScript conforms footage to a written *script*, so it over-cuts ad-lib delivery. If you
riff off bullets (not reading the prompter), use this instead — it cuts on **what you actually
said**, no script:

```bash
# first pass: transcribe + remove dead air / repeated takes / "excuse me" self-corrections
python3 scripts/video-editor/cut-single.py --export ~/Desktop/myrecording.mov
#   optional: --front-trim 6   --manual-cuts "40.7-42.1,157-161"   --slates "1240.8:8.5"
#   --dry writes keeps.json + review.md WITHOUT Resolve (preview the cut list first)
```
Builds a `<slug>-cut` timeline in the current Resolve project (video contiguous + one rendered
audio wav, lip-locked, Voice Isolation on). Then **review in Resolve and colour the clips**
(orange = cut + learn a rule · lime = cut just this once · teal = a clip you extended) and run
`apply-marks.py` to rebuild from your marks. Generic over any recording; it auto-transcribes with
Whisper (`--whisper-model`, default medium.en) and auto-extracts the silencedetect audio. Tune
`--max-pause` (0.30 punchy / 0.40 natural) and `--noise` (raise for a louder/roomier mic).

## Two flows (pre-Resolve-21, still available)

**A) OBS flow (target — no Descript at all):**
```
OBS raw .mkv ─► clean-aroll.ts ─► clean-aroll.mp4 ─► build-plan ─► render-cards ─► build_resolve ─► final
                (whisper word-stamps → remove silence/filler/retakes → ffmpeg cut)
```

**B) Descript flow (current):** export the A-roll + transcript from Descript, then run
build-plan → render-cards → build_resolve. (Descript = source only; no AI editing tokens.)

## A-roll cleanup (`clean-aroll.ts`) — Descript-free

Transcribes locally with Whisper (word timestamps) and removes long silences, filler
words, and repeated takes (last-take-wins), then renders a frame-accurate clean cut.
Everything is auditable in `review.md` before you trust it.

```bash
tsx scripts/video-editor/clean-aroll.ts \
  --in  <raw-obs-recording.mkv> \
  --out scripts/video-editor/build/<slug> \
  --min-silence 0.6 --pad 0.08 --fillers safe   # --fillers aggressive also cuts like/basically/…
  # --dry to see the cut list (review.md) without rendering
```
Output: `clean-aroll.mp4` + `cuts.json` + `review.md`. Whisper on a 20-min file takes a
few minutes on CPU (`--model base.en` fast; `small.en`/`medium.en` more accurate, slower).
The clean transcript it produces also feeds `build-plan` directly.

## Pipeline

```
Descript ──► transcript.md (export, free)
         └─► aroll.mp4     (publish/render, no AI tokens)

[1] lib/edl.ts          VIDEO-EDL-*.md   → structured beats (+ optional FX column)
[2] lib/transcript.ts   transcript + EDL → timecodes (idf fuzzy match, ad-lib tolerant)
[2b] lib/captions.ts    per-word stamps  → caption lines + SRT + gold callouts
[3] build-plan.ts       → build/<slug>/plan.json + review.md + captions.srt
[4] render-cards.ts     plan + brand kit → overlays/*.png + overlays/{captions,callouts}/*.png
[5] build_resolve.py    plan + aroll     → Resolve timeline:
        V1 face · V2 cards+broll · V3 lowers · V4 callouts · V5 captions(opt)
        A2 SFX · A3 music(opt) · chapter+zoom markers · grade · captions.srt
```

## Retention FX & the EDL `FX` column

Add an optional **`FX`** column to any beat table to drive per-beat effects (backward
compatible — omit it and nothing changes):

| Token | Effect |
|---|---|
| `zoom` | drops a yellow "punch-in" marker + a riser SFX here (apply MagicZoom in the hero pass) |
| `sfx` | (section starts already get a whoosh automatically) |
| `captions:off` | reserved — suppress captions over this beat |

Generated automatically from the transcript (no EDL needed): **clean line captions**
(`captions.srt` + burn-in PNGs), **gold callouts** on every `$ / % / 100K`, **whooshes**
at section starts, **chapter markers** per section, and an optional **grade**.

`build_resolve.py` flags: `--burn-captions` (no-plugin caption burn-in; default off —
use MagicSubtitle from `captions.srt` instead), `--no-callouts`, `--no-markers`,
`--sfx <dir>` (default `assets/sfx`), `--music <file>`, `--lut <file.cube>`, `--pop`
(mild scripted contrast+sat), `--voice-isolation N`.

## No-Resolve preview (fast taste check)

Render the whole "feel" — emphasis captions, gold callouts, **smooth eased zoom-punches**,
gated SFX, ducked music, LUT grade — with pure ffmpeg, no Resolve needed. This is the cheap
checkpoint: review the feel, then commit to the full Resolve build.

```bash
npx tsx scripts/video-editor/whisper-to-plan.ts clip.json plan.json     # whisper json → plan
npx tsx scripts/video-editor/render-cards.ts --plan plan.json           # caption/callout PNGs
python3 scripts/video-editor/preview-full.py --clip clip.mp4 --plan plan.json \
  --music assets/music/kmacleod-enchanted-valley.mp3 --lut assets/luts/Fennomenal_X1.cube --out preview.mp4
```

**Importance-weighted effects (Leo's rule — effects mark importance, not a metronome):**
- **Zoom-punch** is a continuous *sub-pixel* `scale`+`crop` ease (smoothstep ramp-in/hold/out),
  fired only on section openers + headline reveals ≥18s apart. (NOT `zoompan` — that stepped.)
- **SFX gating (Leo pillar 4):** whoosh on real **section/b-roll transitions**; **riser** (build) into a
  section-opening reveal; **hit** (release) on each headline-bonus reveal; soft **highlight** tick on emphasis
  captions; **drone** bed under a "downside/catch" word. A standalone reveal still zooms but is **silent** —
  never SFX on a bare zoom-emphasis. (SFX are stdlib placeholders in `make_sfx.py` — swap for licensed packs.)
- **Music moves:** ducked bed + a per-topic **dip** at each section start + a near-**pause** at the top reveal
  ("pause the music to elevate the moment").

> This Homebrew ffmpeg has **no libass/freetype/`timeout`**; `-loop` image inputs need an explicit
> `-t`; deep overlay chains are slow (emphasis captions keep counts low).

## `page-focus.py` — on-screen "guide attention" device (page / article inserts)

Put the **proof on screen** — a page/article screenshot framed large + centred — in one of two styles:

- **`--style focus`** (default): everything except the region softly blurred+darkened, the region kept
  crisp+bright (feathered edge, **no hard box**), a slow sub-pixel push. Braun/Leo "proof-on-the-page".
- **`--style highlight`**: page stays normal; an **animated yellow highlighter sweeps left→right** across
  the target line(s) as you talk about them (multiply blend = a real marker). Multi-line sweeps line by line.

Both frame the content into a 16:9 window (cropped from the native 2× screenshot → large, readable, no
dead space), and both take an optional **circle face-cam** bottom-left (Ø330, emerald `#0d7c5f` ring +
rotating comet — matches the uploaded videos) and a `--source` attribution pill.

```bash
# focus style (tight box from page-roi.py)
python3 scripts/video-editor/page-focus.py --image doc.png --roi 1005,726,962,40 \
  --source "Doctor of Credit" --face face.mp4 --dur 4 --out focus.mp4
# highlight style (per-line boxes drive the sweep)
python3 scripts/video-editor/page-focus.py --image doc.png --style highlight \
  --roi 1091,726,984,84 --lines "1411,726,664,40;1091,770,282,40" --face face.mp4 --out hl.mp4
```
`--roi`/`--lines` are `x,y,w,h` (source px) or `auto:fx,fy,fw,fh` (fractions). `--face` is square-cropped
by its **min dimension** (portrait-safe). Attention-guides (Leo's "6 ways"): `--annotate circle|arrow|underline`
(animated draw-on over the ROI) and `--tint neg|pos` (red=downside / green=win wash). Other flags: `--hl-color`,
`--hl-opacity`, `--sweep`, `--zoom`.

### `page-roi.py` — OCR the tight box (no dead space, lands on the words)

Don't hand-guess the ROI — OCR the screenshot (tesseract) and snap to the actual words. Returns the tight
`--roi` and per-line `--lines` for `page-focus.py`, so the highlight/focus hugs the text exactly.

```bash
python3 scripts/video-editor/page-roi.py --image doc.png \
  --phrase "10% anniversary bonus is ending in October 2026"
#   → --roi 1005,726,962,40   --lines 1411,726,664,40;1091,770,282,40
```

## Article finder (#6) — option-C hybrid auto-tag, *approve before placing*

When he references a **change** with no b-roll ("the 10% anniversary boost is going away"), surface a
real Doctor-of-Credit / Points-Guy article and highlight the passage with `page-focus.py`.

```bash
# 1) propose tags from the transcript (nothing is placed yet)
npx tsx scripts/video-editor/article-index.ts clip.json plan.json --out article-tags.json
#    → change-claims with status "proposed" (no b-roll nearby) | "covered", each with a search query

# 2) REVIEW article-tags.json: flip the ones you want to status:"approved", drop the rest

# 3) agent step per approved tag: WebSearch the `query` on doctorofcredit.com / thepointsguy.com,
#    pick the URL, screenshot it:
npx tsx scripts/video-editor/fetch-screenshots.ts --urls "boost=<url>" --out shots/articles

# 4) OCR the exact passage → tight box (no dead space)
python3 scripts/video-editor/page-roi.py --image shots/articles/boost--full.png \
  --phrase "the words he says about the change"

# 5) render the insert (focus OR highlight) with the boxes from step 4
python3 scripts/video-editor/page-focus.py --image shots/articles/boost--full.png --style highlight \
  --roi <roi> --lines "<lines>" --source "Doctor of Credit" --face face.mp4 --out insert.mp4
```
The detector flags candidates and best-effort names the card; **you approve** before any insert is built.

## Reusable asset library — `lib/asset-index.ts` (zero-token captioning)

A standing, searchable **bin** of assets you've already cleared (card art, logos, SFX, screenshots)
so the planner reuses a proven hero instead of re-sourcing every video. Captions + tags are generated
**zero-token**: from the folder + filename, plus a **tesseract OCR pass** for text-bearing art (a card
PNG that bakes in "CHASE SAPPHIRE PREFERRED" indexes itself). Dims come from a tiny stdlib header read
(no `sharp` dependency). It also **ingests** any `assets-manifest.json` from `fetch-assets.ts`, carrying
each item's **license + attribution** into the index so fetched-and-cleared assets join the same bin.

```bash
# index assets/library/** → assets/library/asset-index.json
npx tsx scripts/video-editor/lib/asset-index.ts build               # default root: assets/library
npx tsx scripts/video-editor/lib/asset-index.ts build /path/to/lib  # or a custom root
# rank library assets for a query (token overlap over caption + tags + filename)
npx tsx scripts/video-editor/lib/asset-index.ts find "chase sapphire" --n 5 [--kind image]
```
Library layout (one folder per kind keeps tags clean): `assets/library/cards/…`, `logos/…`, `sfx/…`.
`lookup(query, {minScore})` is exported for other tools; `draft-plan.ts` consults it (next section).

## Draft the b-roll plan — `draft-plan.ts` (content-matched, you approve)

Walks the cut's transcript and proposes a `broll-plan.json` matched to what you're saying, so it's
not hand-authored. Card mention → a `plain` circle-cam b-roll of that card's **offer page**; change
claim → a `highlight` article insert (DoC/TPG, agent fills the URL); site/tool mention → a `plain`
page b-roll. Segments are importance-spaced + non-overlapping, and **card intros outrank** site/change
beats so the backbone is never dropped. Every segment carries a `status` + `why` for your review.

```bash
# propose only (fast, no network) → draft-broll.json + draft-broll.md
npx tsx scripts/video-editor/draft-plan.ts --transcript face.json --face face.mp4 --out draft-broll.json
# --shots also captures the offer/site screenshots (fetch-screenshots) and OCRs tight ROIs (page-roi),
# so plain/focus/highlight segments come out 'ready':
npx tsx scripts/video-editor/draft-plan.ts --transcript face.json --face face.mp4 --out draft-broll.json --shots
# --use-library: before proposing a fresh offer-page screenshot, reuse a confident hero from the
# standing library (see asset-index.ts above) — a card intro then comes out 'ready' with no capture.
# Opt-in + no-ops when the library is empty/unbuilt; --library-root R, --library-min 0.6 (confidence bar).
npx tsx scripts/video-editor/draft-plan.ts --transcript face.json --face face.mp4 --out draft-broll.json --use-library
```
Status per segment: `ready` (screenshot + ROI filled) · `needs-screenshot` (bot-walled bank page — grab by
hand) · `needs-article` (find the DoC/TPG URL) · `needs-roi`. Review/trim, resolve the `needs-*`, then
`build-broll.py --plan draft-broll.json`. Tunables: `--seg-dur` (9s), `--min-gap` (4s breathing room).

## Assemble the b-roll — `build-broll.py` (generic, any video)

The video-agnostic replacement for the best-cards-specific `render-broll2.py`. Reads a per-video
`broll-plan.json`, renders each b-roll segment via `page-focus.py` (circle-cam + ring + the
plain/focus/highlight styles) plus the face spans between them, and assembles:
**video** = the parts concatenated (frame-snapped so they can't drift); **audio** = one continuous
A-roll track underneath (b-roll only swaps the picture, never the audio) + loudnorm to ‑14 LUFS.

```bash
python3 scripts/video-editor/build-broll.py --plan broll-plan.json
```
```jsonc
{
  "face": "~/Desktop/face.mp4", "out": "~/Desktop/VIDEO-BROLL.mp4", "fps": 24,
  "segments": [
    {"start": 27, "end": 59, "layout": "plain",     "hero":  "shots/sapphire_offer.png"},
    {"start": 96, "end": 100,"layout": "highlight",  "image": "shots/doc.png",
        "roi": "825,726,1482,84", "lines": "826,726,1481,40;825,770,770,40", "source": "Doctor of Credit"},
    {"start": 130,"end": 135,"layout": "focus",      "image": "shots/offer.png", "roi": "auto:0.2,0.5,0.5,0.06"}
  ]
}
```
`layout`: **plain** (full hero, top-anchored, + circle) · **focus** (blur + sharp region) · **highlight**
(animated marker) · **gfx** (full-screen animated explainer via `motion-gfx.py` — pass `gfx_type` +
`spec`, e.g. `{"layout":"gfx","gfx_type":"value","spec":{...}}`; A-roll audio plays under it). Relevance lives in the plan — for text moments use focus/highlight with a `page-roi.py`
box (content-matched to your words); use plain only with a deliberate ~16:9 hero (or give plain a `roi` to
frame a region). Guards: errors if `total` exceeds the face length, if a part comes up short, or if the face
has no audio.

> **Resolution — 4K by default.** `build-broll.py`, `page-focus.py`, and `motion-gfx.py` all honor
> `RENDER_SCALE` (default **2 = native 3840×2160**; set `RENDER_SCALE=1` for the fast/proven 1080 path).
> build-broll locks the same scale into its page-focus/motion-gfx children, so every segment matches.
> page-focus is *true* 4K (it crops your native-4K screenshots straight into the frame — no 1080
> downsample); motion-gfx upscales its flat brand graphics with lanczos (native-equivalent, zero layout
> risk). ⚠️ The **face/A-roll** portion is only true-4K if the source face is 4K — a 1080 face is scaled
> up to fill the frame. `fetch-screenshots.ts` already captures at 2× DPI (native 4K).

## Motion graphics — `motion-gfx.py` (animated explainers)

Leo's biggest lever for dense moments: "an animation explains a complicated thing crystal-clear and
fast" where a-roll/b-roll would be slow or confusing. Renders a full-screen, brand-styled animated card
(navy/green/gold, Anton + Archivo from `lib/brand.json`) to drop on the timeline at an explainer beat.

```bash
python3 scripts/video-editor/motion-gfx.py --type value --out v.mp4 --dur 4 \
  --spec '{"label":"what the bonus is worth","a":"100,000 pts","b":"1.5¢ / pt","c":"$1,500"}'
python3 scripts/video-editor/motion-gfx.py --type steps --out s.mp4 --dur 5 \
  --spec '{"title":"How to earn it","steps":["Apply for the card","Spend $5,000 in 3 months","Earn 100,000 points"]}'
python3 scripts/video-editor/motion-gfx.py --type bars --out b.mp4 --dur 4 \
  --spec '{"title":"Best-ever bonus","items":[{"label":"Usual","value":75000},{"label":"Right now","value":100000}]}'
```
`value` builds A × B = C and **counts up** the result; `steps` pops numbered steps in sequence; `bars`
grows a comparison (last bar = gold). `--spec` is inline JSON or `@file.json`. *(Planned: wire into
build-broll as a `gfx` segment so explainers auto-place; more templates — float timeline, comparison table.)*

## Polish layer (Leo gap-closers)

The retention details that make an edit feel pro — each importance-gated / off by default:

- **Split b-roll layout** — `build-broll` `{"layout":"split", "split_style":"focus", "image":…, "roi":…}`:
  a big portrait of you (emerald border) beside the page region. An alternate to the circle so cards
  don't all feel identical.
- **`page-focus --annotate circle|arrow|underline` + `--tint neg|pos`** — animated attention marks + a
  red-downside / green-win colour wash.
- **`page-focus --eyeline fx,fy`** — place the focused region at a consistent screen spot (match where
  your eyes sit in the A-roll) so a cut doesn't jump the viewer's gaze. Default `0.5,0.5` = centred.
- **Per-segment mood music** — `preview-full --music "a.mp3,b.mp3,c.mp3"` maps one song per subject and
  fades between; a `-` slot runs that section **silent** (e.g. `"inspired.mp3,-,carefree.mp3"`).
- **Music beat-sync** — the bed dips then **swells into each topic shift** (Leo: "the music picks up");
  `--beat-sync` snaps that swell to the song's **actual beats** (via librosa) instead of the section time.
- **SFX** (`make_sfx.py`): whoosh / riser / **hit** (release) / **highlight** / **drone** (suspense bed) /
  **pop** (soft "graphic appears" on each gold chip — swap `assets/sfx/pop.wav` for a sound you like).
- **`page-focus --glow 0..1`** — pulse a bloom on the focused subject (Leo's "make the subject glow"; 0 = off).
- **`particles.py`** — a subtle drifting-bokeh overlay (seamless loop, qtrle alpha). Overlay it faint:
  `ffmpeg -i v.mp4 -stream_loop -1 -i particles.mov -filter_complex "[1:v]colorchannelmixer=aa=0.5[p];[0:v][p]overlay=shortest=1" out.mp4`
- **`transition.py`** — a full-screen whip/wipe light-sweep to mask a cut (`--style whip|wipe`, `--dur 0.4`),
  overlaid at a section/b-roll change.
- **motion-gfx** also has **`bignum`** (one huge hero stat) and **`checklist`** (✓/✗ rows).

## Brand kit

`lib/brand.json` is the single source of truth (colors, fonts, lockup, asset paths),
typed via `lib/brand.ts`; all templates live in `lib/templates.ts`. Preview the whole
kit + a sample thumbnail set:

```bash
npx tsx scripts/video-editor/render-brand-sheet.ts   # → build/brand-kit/brand-sheet.png
```

## Run it

```bash
# 1. plan: align every EDL beat to a transcript timecode
npx tsx scripts/video-editor/build-plan.ts \
  --edl VIDEO-EDL-best-cards-june-2026.md \
  --transcript scripts/video-editor/data/best-cards-june-2026.transcript.md \
  --out scripts/video-editor/build/best-cards-june-2026
#    → review build/<slug>/review.md; flagged beats need your eyes

# 2. render the graphics (title cards, earning tables, lower-thirds)
npx tsx scripts/video-editor/render-cards.ts \
  --plan scripts/video-editor/build/best-cards-june-2026/plan.json

# 3. assemble in Resolve (Resolve must be open; Prefs ▸ System ▸ General ▸
#    External scripting using = Local). Add --until 120 for a fast pilot, --render to render.
python3 scripts/video-editor/build_resolve.py \
  --plan  scripts/video-editor/build/best-cards-june-2026/plan.json \
  --aroll scripts/video-editor/build/best-cards-june-2026/aroll.mp4
```

## Getting the A-roll out of Descript

The face recording lives in the Descript cloud (the desktop app's local cache is
the *old* account). Export it with the Descript MCP `publish_project` (a render,
no AI tokens) → download the `download_url` → save as `build/<slug>/aroll.mp4`.

⚠️ **Pick your A-roll source deliberately:**
- The **cleaned composition** (what we exported) may already contain B-roll/PiP
  you placed in Descript — the pipeline then only *adds* graphics/lowers/captions.
- The **raw face-only take** (`Nathaniel Booth-2`) lets the pipeline own *all*
  B-roll + PiP itself. Cleaner separation, but you re-do the splice here.

## Customizing

- **Card art / B-roll mapping:** `build-plan.ts` → `CARD_ART` and `BROLL`.
- **Brand (colors/fonts/lockup):** `lib/brand.json` — drives graphics *and* thumbnails.
- **Graphic templates:** `lib/templates.ts` (title / graphic / lower / caption / callout / chapter / outro).
- **Caption pacing / callout rules:** `lib/captions.ts` (`MAX_WORDS`, `NUM_RE`, `LABEL`).
- **Track layout / durations / FX stages:** `build_resolve.py` → `item_for` + the per-layout & FX blocks.
- **SFX:** drop files in `assets/sfx/` (`make_sfx.py` writes placeholders).

## What's scriptable vs the hero pass

The Resolve **API can't** keyframe Transform zooms, animate captions, add transitions,
or set audio levels (confirmed — see `effects-research/EFFECTS-COOKBOOK.md`). The pipeline
therefore does the scriptable spine and **marks** where the rest goes; `HERO-POLISH.md` is
the ~10-min GUI pass that applies MagicZoom (zooms), MagicSubtitle (captions from the SRT),
MagicAnimate/PowerMorph (transitions), and ducking.

## Known limitations (all hand-fixable in Resolve after)

- Animated zoom / captions / transitions / ducking are GUI-only → `HERO-POLISH.md`.
- PiP corner for SCREEN+PiP beats isn't auto-transformed yet (B-roll full-screen on V2).
- A b-roll clip can map to two adjacent beats — dedup by hand.
- Anchor & caption timing is interpolated within transcript paragraphs (±a second or two);
  feed `--words clean-words.json` (exact per-word stamps) for tight captions.
- Cold-open EDL beats won't match if you re-improvised the intro — they flag LOW_CONFIDENCE.
