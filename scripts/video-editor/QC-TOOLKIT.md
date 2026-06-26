# Video QC Toolkit

The 9 fixes from `VIDEO-EDIT-PROCESS-AUDIT.md` (repo root), built + adversarially verified.
Purpose: **Claude verifies the cut before Nathaniel ever sees it** — stop the manual re-check loops.

All tools are stdlib + numpy + scipy + PIL + ffmpeg + tesseract + swiftc only (no pyyaml/skimage/imagehash/matplotlib). Config is JSON.

## The pre-delivery sequence (run before saying "done")

```bash
cd scripts/video-editor
V=~/Desktop/FILMING-KIT/biz-20apy/BIZ-20APY-PRODUCED-vN.mp4

# 1. exact-timecode frame check at every approved beat (regression list)
python3 verify-frames.py --video "$V" --manifest checks.biz-20apy.json     # exit 2 -> READ each sheet

# 9. audio invariants (loudness / hot VO / tail glitch / drift)
python3 qc-audio.py "$V"                                                    # exit 0 = pass

# (when overlays/positions changed this render:)
python3 check-overlays.py overlay-spec.json build/biz-20apy/cut-words.json  # #6 right-asset-right-moment
python3 roi-verify.py --plan roi-plan.json --out /tmp/roi.png              # #7 boxes land on face/number, not body
```
Only deliver when verify-frames sheets all pass (Claude has LOOKED) and qc-audio exits 0.

---

## #1 verify-frames.py — exact-timecode QC gate  ✅ built earlier
Extracts the frame at the user's *literal* timecode (+/-1s; END for inserts), tiles a labeled
contact sheet, exits 2 `NEEDS_VISION_CHECK`. Never substitute a round/nearby number.
```bash
python3 verify-frames.py --video V.mp4 --manifest checks.biz-20apy.json
python3 verify-frames.py --video V.mp4 --check 10:06 "tx methods: no right cutoff; hl on 2 lines" \
                                       --window 7:49 8:08 end "insert END: no center stamp"
```

## #2 checks.<slug>.json — approved-element regression list  ✅
The manifest verify-frames reads. **Add a row the instant Nathaniel approves something** — it then
guards that element on every future render. Anchor to phrases/sections (not raw seconds) for re-cuts.

## #3 framediff.py — catch silent edit no-ops
Proves an edit moved pixels (the 10:06 cutout "fix" silently no-op'd on a missed regex).
```bash
python3 framediff.py --img before.png after.png            # exit 0 CHANGED / 2 NO-OP / 3 err
python3 framediff.py --clip old.mp4 new.mp4 --at 10:06     # diff one moment across two renders
```
**HARD RULE: never sed/re.sub/awk an overlay or composite .py** — those fail silently on a missed
pattern and leave you re-rendering the identical frame at exit 0. Read-first `Edit`, then framediff.

## #4 build-clipmap.py + clipmap.biz-20apy.json — declarative compositor
Replaces the throwaway `/tmp/v8_p1.py`+`v8_p2.py` with one committed, diffable spec.
```bash
python3 build-clipmap.py --validate            # validate spec, audit inputs, print both filtergraphs
python3 build-clipmap.py --render --out1 /tmp/v9_clips.mp4 --out2 /tmp/v9_FINAL.mp4   # ~12 min
```

## #5 assert-clean-source.py — block dirty screenshots at capture
OCR (tesseract) for consent-banner phrases + PIL bar detection + edge-clipped-value check.
**Escalate to Nathaniel on first failure** instead of cropping/painting for hours (the Chase cookie box).
```bash
python3 assert-clean-source.py shot.png --expect-text '$400'   # positional image; exits nonzero on defect
```

## #6 check-overlays.py (+ lib/timemap.py) — anchor overlays to spoken phrases
Resolves each overlay to its anchor phrase in `cut-words.json` and FAILs if the asset-specific
distinguisher isn't actually *said* in that window (the 9:47 clawback / 10:56 APY-example bugs).
Generic words (bonus/apy/bank) can't satisfy a PASS; a declared `number` must match the spoken number.
```bash
python3 check-overlays.py overlay-spec.json build/biz-20apy/cut-words.json --waivers overlay-waivers.json
```

## #7 vision-roi.swift + measure-rois.py + roi-verify.py — measure, don't guess positions
macOS Vision face/body in source px (face was cropped off-center; titles landed on his body).
```bash
xcrun swiftc -O vision-roi.swift -o build/vision-roi          # build/ gitignored; .swift committed
python3 measure-rois.py --video V.mp4 --check "host,5,face" --out build/biz-20apy/rois.json
python3 roi-verify.py --plan roi-plan.json --out /tmp/roi-contact.png   # flags box-off-frame / on-face / missing-zoom
```

## #8 vsafe.py + PROTECTED.json + rm-guard.py — safe file ops
Recoverable trash (never unlink), protected globs, `--expect N` on wildcards, disk pre-flight +
atomic temp→promote render, version prune. **The `rm-guard.py` PreToolUse hook is installed** in
`.claude/settings.json` (project-scoped) — raw `rm` of build/broll/FILMING-KIT/deliverable paths is
blocked and redirected here; routine `/tmp` cleanup is untouched.
```bash
python3 vsafe.py rm '<glob>' --expect N           # wildcard must pin a count; media -> .vtrash
python3 vsafe.py prune --keep 3 --dry-run <dir>   # cap the master pileup (17 found!)
python3 vsafe.py doctor <dir>                      # df headroom, protected inventory, corrupt-deliverable scan
python3 vsafe.py render --out OUT.mp4 --est-gb 2 -- <ffmpeg args>   # df preflight + integrity gate
```

## #9 qc-audio.py + qc-spec.json — post-render audio invariants
Loudness (LUFS/TP vs YouTube -14), hot-window (eardrum VO), tail-glitch, A/V drift. Writes
`<master>.qc.json` + `<master>.qc.png`. **Caught that the v22 master is ~19 dB under -14 LUFS.**
```bash
python3 qc-audio.py MASTER.mp4 [--source RAW.wav] [--spec qc-spec.json]   # exit nonzero on FAIL
```
Note: thresholds in `qc-spec.json` (the default -6 dBFS hot-window is strict for a -14 LUFS target — tune per use).
