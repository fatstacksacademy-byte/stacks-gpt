# Hero-polish pass (~10 min) — the GUI ceiling

The scripted pipeline (`build_resolve.py`) does everything the Resolve **API can do**:
captions data + SRT, gold callouts, SFX placement, a consistent grade, and **chapter +
zoom markers**. The things the API *can't* do — animated punch-in zooms, animated
captions, transitions, audio ducking — are GUI-only (see `effects-research/EFFECTS-COOKBOOK.md`).
This is the short manual pass that adds them for a flagship video, using the plugins now
installed under **Edit page → Effects**.

> Restart Resolve once after install so MagicZoom / MagicAnimate / MagicSubtitle load.

## 1. Animated captions — MagicSubtitle (replaces the burn-in floor) · ~2 min
The pipeline wrote **`captions.srt`** next to `plan.json`.
- Edit page → **Effects → Toolbox → Titles → MagicSubtitles** (or run the **TheSRTWhisperer** script).
- Point it at `captions.srt`, pick a clean style (white, bold, gold keyword highlight to match the brand), drop on the captions track.
- This is better than `--burn-captions`; only use the burn-in floor if you skip this.

## 2. Punch-in zooms — MagicZoom · ~3 min
The pipeline drops a **yellow "punch-in" marker** at every beat you tagged `zoom` in the EDL `FX` column.
- Jump marker-to-marker (↑/↓), select the A-roll clip under each, apply **Effects → MagicZoom** (≈8–12% scale).
- Use on emphasis numbers (the bonus, the spend) and section openers. Don't overdo it — 1 per ~30s.

## 3. Section transitions — MagicAnimate / PowerMorph · ~2 min
At each **blue chapter marker**, between the outgoing and incoming clip:
- **MagicAnimate** whip/zoom preset (free, installed), or **PowerMorph** morph (paid, optional) for a premium feel.
- Hard cuts are fine everywhere else — only the section boundaries need this.

## 4. Sound + music · ~2 min
- SFX are already placed on **A2** (section whooshes + zoom risers). Nudge levels to taste in Fairlight.
- Drop a music bed (`--music` places it on A3, or add manually), then **duck** it under the VO: select the music track → Fairlight → ducking / -18 to -24 dB under dialogue. (No audio-level API, so this step is manual.)
- Add a **J-cut** on the first section change or two (drag the incoming audio left under the outgoing video) to kill the "clunk."

## 5. Grade check · ~1 min
- If you didn't pass `--lut`/`--pop`, apply your PowerGrade/LUT on the Color page and **ripple to all** A-roll clips for the consistent look. Otherwise just eyeball the auto-grade.

---
**Skip-list when doing the hero pass** (so you don't double up with the scripted output):
- Run `build_resolve.py` **without** `--burn-captions` (MagicSubtitle does captions instead).
- Keep `--pop` *or* a Color-page grade, not both.
- Callouts (V4) and SFX (A2) stay — they complement the plugins, no conflict.
