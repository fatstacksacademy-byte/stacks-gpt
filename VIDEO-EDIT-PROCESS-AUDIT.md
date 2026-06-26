# Video Editing Process Audit — biz-20apy (v6 → v22)

_Generated 2026-06-26 from a 23-agent audit of the full session transcript (59 of your real messages, 4 mining lenses → clustering → adversarial verification of every proposed fix)._

## The one-sentence finding

> **Nearly every wasted round traces to one missing step: I called fixes "done" before looking at the actual composited frame at *your* exact timecode — and when I did spot-check, I sampled round/nearby timecodes (t=600 to "prove" a 10:06 fix), so my QC looked green while the moment you flagged was still broken.**

You became the verification pass. That's why the same beats came back 5–10× ("Do you even look at this?", "are you even checking half of the stuff?", "for the fifth goddamn time"). Fix that one gate and the **majority of the 40+ re-checks disappear.** Everything else is a multiplier on top of it.

## Do these three first (90% of the relief)

1. **Verify-at-the-exact-frame gate** — before *any* "done", extract the frame at your literal timecode (+ neighbors, + the END of inserts) and actually look at it. **Built tonight** — see below.
2. **Locked-elements + golden-frame regression list** — approved things kept silently regressing because every render re-derived everything from memory. Persist each approved element + a golden frame; diff every new render against it. **Seeded tonight** (`checks.biz-20apy.json`).
3. **Ban sed/regex edits on overlay scripts** — the 10:06 cutout "fix" silently did nothing because a regex didn't match. Read-first `Edit` only, then prove the pixels changed.

## What I built tonight (ready to use now)

**`scripts/video-editor/verify-frames.py`** — the exact-timecode QC gate (committed to the repo, so it survives — unlike the `/tmp` scripts that vanished every reboot).

```bash
# from the version-controlled regression list (preferred):
python3 scripts/video-editor/verify-frames.py \
  --video ~/Desktop/FILMING-KIT/biz-20apy/BIZ-20APY-PRODUCED-v22.mp4 \
  --manifest scripts/video-editor/checks.biz-20apy.json

# or ad-hoc for a single note:
python3 scripts/video-editor/verify-frames.py --video out.mp4 \
  --check 10:06 "tx methods: full line, no right cutoff, highlight on the 2 lines" \
  --window 7:49 8:08 end "bed insert: thumbs-up freeze, small corner banner, NO center stamp"
```

What it does that the session never did:
- Parses your **literal** timecode (`8:51` → 531s), extracts that **exact** frame **± 1s**, never a round stand-in.
- For an insert/window, samples the **END** (where the stray "APPROVED" stamp lived) — not the start.
- Tiles each into a labeled contact sheet (timecode + what to check + the spoken line) and **exits non-zero with `NEEDS_VISION_CHECK`**, so the render can't be called done until the frames are actually looked at.
- Run from the **manifest**, the same approved checks re-run on every new cut → an approved element can't silently regress without its sheet showing it.

**`scripts/video-editor/checks.biz-20apy.json`** — the approved-element regression list for this video (cold-open whiteboard centered, Chase $400 no cookie box, 8:51 fee centered, 10:06 tx methods, 11:42 square→full cut, 12:06 green-screen monitor, bed-insert END, etc.). Add a row the moment you sign off on something; it then guards that element forever.

I ran it against v22 and visually confirmed the 8:51 and 10:06 sheets — the loop works end to end.

## Full ranked findings

| # | Cluster (root cause) | Re-checks it caused | Fix | Removes you from QA? |
|---|---|---|---|---|
| 1 | **Claimed "done" without viewing the exact frame** (ffmpeg exit-0 ≠ correct; spot-checked wrong/round timecodes) | ~35 | verify-frames.py gate ✅ built | **Yes** |
| 2 | **No locked-element model** — approved elements re-derived from memory each render, silently regressed | ~40 | golden-frame regression manifest ✅ seeded | **Yes** |
| 3 | **Silent edit failures** — sed/regex no-op'd but reported as applied (10:06) | ~9 | no-sed rule + before/after pixel-diff at the clip's real timecode | **Yes** |
| 4 | **Volatile `/tmp` pipeline** — no single version-controlled spec; 86 throwaway scripts, lost on reboot | ~15 | promote the per-video assembly (clip list, timecodes, crops, cuts) into one committed JSON | Partly |
| 5 | **Source defects cropped/painted instead of replaced** (Chase cookie box battled "all night") | ~6 | clean-source gate at capture: detect banner/cut-off value, escalate to you on first failure | **Yes** |
| 6 | **Overlay timing by approximate second / hand offset** (9:47 clawback, 10:56 APY-example, title #6 early, outro drift) | ~14 | anchor overlays to a spoken **phrase**, not a second; gate that on-screen asset matches what's *said* in that window | **Yes** |
| 7 | **Hand-guessed crop coordinates** (face off-center x730 vs x944, titles over body, $400 cut off, empty headroom) | ~9 | measure ROIs (face/body via Vision, text via OCR) + box-on-frame contact sheet before render | **Yes** |
| 8 | **Destructive file ops + no disk guard** (deleted the cap splits with `rm cap_*`; ENOSPC corrupted renders twice) | ~5 | trash-not-unlink for media, refuse bare wildcard `rm`, df pre-flight, atomic temp→promote, auto-prune old masters | **Yes** |
| 9 | **No post-render audio invariants** (music too loud ×2, hot insert VO, the mic glitch) | ~5 | audio QC gate: loudness target, music-under-VO (checked pre-mix), A/V drift, tail-glitch detector | **Yes** |

## Per-cluster detail (root cause → fix → honest caveat)

**1 — Verify at the exact frame.** _"it really doesn't look like he did anything at ten o six."_ Root cause: no gate between "rendered" and "delivered", and spot-checks used round timecodes. Fix: the gate built tonight. Caveat: it only protects what's in the manifest — discipline is to *add a check the moment you approve something.*

**2 — Lock approved elements.** _"do we just lose progress every time we upload a video every single time?"_ Root cause: each pass re-built the face PiP/ring, insert recipe, fee crop, "right side = end-screen" rule from memory, so fixing one broke another. Fix: persist approved params + a golden frame per element; diff each new render's same region. Caveat: the regression list must be anchored to **phrases/sections, not raw seconds** — any recut shifts seconds and would check the wrong frame. (For this video the timeline is locked, so seconds are fine now.)

**3 — No silent edits.** Root cause: `re.sub`/`sed` return success on zero matches; nothing diffed the result. Fix: read-first `Edit` only (it errors on no-match) + re-render the standalone clip and pixel-diff before/after at the clip's **real** timecode (tx_cutout plays at 593s, not the 600/606 I was checking).

**4 — One committed spec.** Root cause: the whole 12-min assembly lived in `/tmp/v8_p1.py`, `v8_p2.py`, `chase_panel.py`, etc. — non-git, reboot-volatile. Fix: move clip list + timecodes + crop keyframes + cut sets into one version-controlled JSON ("the formula"). Caveat (from the adversarial pass): the committed `scripts/video-editor/` pipeline is a *different, Resolve-based* one used for other videos; biz-20apy was pure ffmpeg. Pick one path per video and keep its spec in git.

**5 — Clean source.** _the Chase cookie box._ Root cause: dirty screenshot flowed downstream; defense became cropping + your eyeballs. Fix: prove the asset clean at capture (OCR for banner phrases, check the headline number isn't cut off) and **escalate to you on the first failure** instead of fighting it for hours.

**6 — Anchor overlays to words.** _"why are you showing that when I'm talking about the APY example?"_ Root cause: overlays placed by approximate second + a hand-applied offset. Fix: place by spoken phrase, and gate that the asset on screen is corroborated by what's *said* in that window — with **asset-specific** tokens and number-matching (generic words like "bonus"/"APY" can't satisfy it, since the failures were right-topic/wrong-asset).

**7 — Measure, don't guess, positions.** _"it feels like there's a lot of empty space above my head."_ Root cause: hardcoded crop literals. Fix: we now have macOS Vision (from the green-screen work) — use it to measure your face/body, place titles in the clear zones, and show a box-on-frame contact sheet before rendering.

**8 — Safe file ops.** _the accidental `rm cap_*` + two ENOSPC corruptions._ Fix: media deletes go to a 24h trash not `unlink`; wildcard `rm` requires an explicit expected count; check free space before a render; write to temp then atomically promote; auto-cap masters at the newest 3 (we hit 17).

**9 — Audio gate.** _"it sounds way louder, make sure it doesn't blow people's eardrums."_ Fix: a post-render audio check — integrated loudness to a target, music sitting ~10 LU under your VO (measured pre-mix), A/V drift, and a tail-glitch detector that would have flagged the mic glitch automatically.

## The honest caveats (what the adversarial pass caught)

The audit's own proposed fixes had real errors worth knowing before building the rest:
- Several fixes assumed the committed **Resolve** pipeline; biz-20apy was actually the **ffmpeg `/tmp`** pipeline. The verify gate works on the ffmpeg `.mp4` (proven tonight); a Resolve-only render would need frames exported first.
- `build/` is **gitignored** and `*.mp4/*.mov` are too — a regression manifest must live in a tracked path (I put `checks.*.json` directly in `scripts/video-editor/`, which is tracked).
- **PyYAML / scikit-image / imagehash are NOT installed** — anything built should stay on stdlib + Pillow + numpy + ffmpeg (what's actually here). verify-frames.py already does.
- Any check keyed to **raw seconds breaks on a recut** — anchor to phrases/sections for videos that will be re-cut.

## Status — ALL 9 BUILT ✅ (2026-06-26)

Every fix is built, self-tested on real artifacts, and adversarially verified. All live in
`scripts/video-editor/` — reference: `scripts/video-editor/QC-TOOLKIT.md`.

| # | Tool(s) | Status |
|---|---|---|
| 1 | `verify-frames.py` + `checks.biz-20apy.json` | ✅ built + tested |
| 2 | `checks.<slug>.json` regression list | ✅ seeded |
| 3 | `framediff.py` (+ no-sed rule) | ✅ built + tested |
| 4 | `build-clipmap.py` + `clipmap.biz-20apy.json` + `clipmap.schema.json` | ✅ built + validated |
| 5 | `assert-clean-source.py` + `data/consent-banlist.txt` | ✅ built + tested |
| 6 | `check-overlays.py` + `lib/timemap.py` | ✅ built + tested on real cut-words.json |
| 7 | `vision-roi.swift` + `measure-rois.py` + `roi-verify.py` | ✅ built + tested (one ordering bug fixed) |
| 8 | `vsafe.py` + `PROTECTED.json` + `rm-guard.py` hook | ✅ built + tested; **hook installed** (project `.claude/settings.json`) |
| 9 | `qc-audio.py` + `qc-spec.json` | ✅ built + tested |

**Live finding from #9:** the v22/4K master audio is **~-33 LUFS — about 19 dB under YouTube's -14 target** (plays back quiet). A naive loudnorm pass fixed the level but introduced ~107ms A/V drift (qc-audio caught that too), so it was rejected — a clean loudness master needs a careful sync-preserving pass. Flagged for your call before upload.
