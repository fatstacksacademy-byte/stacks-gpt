#!/usr/bin/env python3
"""
framediff.py — prove an edit actually changed the pixels (catch silent no-op "fixes").

THE BUG THIS EXISTS FOR
  The 10:06 cutout "fix" silently no-op'd: a regex in an overlay/composite .py didn't
  match, so re.sub() rewrote nothing, ffmpeg re-rendered the IDENTICAL frame, exit code
  was 0, and the QC grid went green. "Rendered" is not "changed". The only honest proof
  that an edit landed is: the pixels at the clip's REAL timecode are different before vs
  after. This tool measures that difference and FAILS LOUD when they're identical.

WHAT IT DOES
  (a) --img A.png B.png
        PIL mean-absolute pixel diff over 0-255 (both images coerced to RGB and, if
        sizes differ, B is resized to A so the compare is defined).
        exit 0  -> CHANGED  (delta > --threshold, default 1.0)
        exit 2  -> NO-OP: frames identical (delta <= threshold)

  (b) --clip A.mp4 B.mp4 --at SEC
        extract ONE frame at SEC (accepts seconds like 606 or mm:ss like 10:06) from each
        clip via ffmpeg, then run the same mean-abs compare. Same exit codes.
        --at may be given as one timecode (same SEC in both clips) or as two
        ("--at 10:05 10:06") to diff two MOMENTS of a SINGLE clip (pass the same file
        twice) — useful to confirm a cut/overlay differs across a known boundary.

  Always prints the delta number. A defect (NO-OP) is a NONZERO exit so a pipeline /
  Makefile / CI step stops instead of marching on with an unchanged render.

EXIT CODES
  0  CHANGED  — delta > threshold, the edit moved pixels
  2  NO-OP    — delta <= threshold, frames are (effectively) identical
  3  usage / IO / ffmpeg error

USAGE
  # two stills:
  python3 framediff.py --img before.png after.png
  python3 framediff.py --img before.png after.png --threshold 2.5

  # one moment, two renders (the real regression guard for a "fix"):
  python3 framediff.py --clip render_old.mp4 render_new.mp4 --at 10:06

  # two moments of ONE clip (confirm a boundary actually differs):
  python3 framediff.py --clip out.mp4 out.mp4 --at 10:05 10:06

HARD RULE (carry this forward)
  Never mutate an overlay/composite .py with sed / re.sub / awk. Read-first Edit only,
  then run framediff at the clip's REAL timecode to confirm the pixels changed. A silent
  no-op regex is exactly how the 10:06 cutout "fix" passed QC while staying broken.
"""

import argparse
import os
import subprocess
import sys
import tempfile

import numpy as np
from PIL import Image


def eprint(*a, **k):
    print(*a, file=sys.stderr, **k)


def parse_tc(s):
    """Accept seconds ('606', '10.5') or mm:ss / hh:mm:ss ('10:06'). Return float seconds."""
    s = s.strip()
    if ":" in s:
        parts = s.split(":")
        if not all(p.strip() != "" for p in parts):
            raise ValueError("empty timecode field in %r" % s)
        parts = [float(p) for p in parts]
        sec = 0.0
        for p in parts:
            sec = sec * 60.0 + p
        return sec
    return float(s)


def load_rgb(path):
    if not os.path.isfile(path):
        raise FileNotFoundError(path)
    return Image.open(path).convert("RGB")


def mean_abs_diff(img_a, img_b):
    """Mean absolute per-pixel difference on a 0-255 scale.

    If sizes differ, B is resized to A's size (bilinear) so the compare is well defined;
    a resize counts as a real change, which is the honest answer for a QC gate.
    """
    if img_b.size != img_a.size:
        img_b = img_b.resize(img_a.size, Image.BILINEAR)
    a = np.asarray(img_a, dtype=np.float64)
    b = np.asarray(img_b, dtype=np.float64)
    return float(np.mean(np.abs(a - b)))


def extract_frame(clip, sec, out_png):
    """Extract one frame at `sec` from `clip` via ffmpeg. Raises on failure / no output."""
    if not os.path.isfile(clip):
        raise FileNotFoundError(clip)
    # -ss AFTER -i = frame-accurate (decode-then-seek). This MATTERS for a QC gate:
    # fast seek (-ss before -i) snaps to the nearest keyframe, so two timecodes a second
    # apart can decode the SAME frame and falsely report NO-OP. Slower, but honest.
    cmd = [
        "ffmpeg", "-v", "error", "-y",
        "-i", clip,
        "-ss", "%.4f" % sec,
        "-frames:v", "1",
        out_png,
    ]
    res = subprocess.run(cmd, capture_output=True, text=True)
    if res.returncode != 0:
        raise RuntimeError("ffmpeg failed for %s @ %.4fs:\n%s" % (clip, sec, res.stderr.strip()))
    if not os.path.isfile(out_png) or os.path.getsize(out_png) == 0:
        raise RuntimeError(
            "ffmpeg produced no frame for %s @ %.4fs (past end of clip?)" % (clip, sec)
        )


def report(delta, threshold, label_a, label_b):
    print("delta (mean-abs 0-255): %.6f   threshold: %.6f" % (delta, threshold))
    print("  A: %s" % label_a)
    print("  B: %s" % label_b)
    if delta > threshold:
        print("PASS CHANGED — pixels differ; the edit moved the frame.")
        return 0
    print("FAIL NO-OP: frames identical — the edit did NOT change these pixels.")
    print("            (silent no-op? check the regex/Edit actually matched.)")
    return 2


def run_img(args):
    try:
        a = load_rgb(args.img[0])
        b = load_rgb(args.img[1])
    except Exception as e:
        eprint("ERROR: %s" % e)
        return 3
    delta = mean_abs_diff(a, b)
    return report(delta, args.threshold, args.img[0], args.img[1])


def run_clip(args):
    ats = args.at
    if len(ats) == 1:
        sec_a = sec_b = parse_tc(ats[0])
    elif len(ats) == 2:
        sec_a = parse_tc(ats[0])
        sec_b = parse_tc(ats[1])
    else:
        eprint("ERROR: --at takes 1 or 2 timecodes, got %d" % len(ats))
        return 3

    tmpdir = tempfile.mkdtemp(prefix="framediff_")
    pa = os.path.join(tmpdir, "a.png")
    pb = os.path.join(tmpdir, "b.png")
    try:
        extract_frame(args.clip[0], sec_a, pa)
        extract_frame(args.clip[1], sec_b, pb)
        a = load_rgb(pa)
        b = load_rgb(pb)
    except Exception as e:
        eprint("ERROR: %s" % e)
        return 3
    delta = mean_abs_diff(a, b)
    label_a = "%s @ %.3fs" % (args.clip[0], sec_a)
    label_b = "%s @ %.3fs" % (args.clip[1], sec_b)
    rc = report(delta, args.threshold, label_a, label_b)
    if args.save:
        try:
            a.save(args.save + ".A.png")
            b.save(args.save + ".B.png")
            print("  saved extracted frames: %s.A.png / %s.B.png" % (args.save, args.save))
        except Exception as e:
            eprint("WARN: could not save frames: %s" % e)
    return rc


def main(argv=None):
    p = argparse.ArgumentParser(
        prog="framediff.py",
        description="Prove an edit changed pixels (catch silent no-op fixes). "
                    "exit 0=CHANGED, 2=NO-OP, 3=error.",
    )
    mode = p.add_mutually_exclusive_group(required=True)
    mode.add_argument("--img", nargs=2, metavar=("A.png", "B.png"),
                      help="compare two image files")
    mode.add_argument("--clip", nargs=2, metavar=("A.mp4", "B.mp4"),
                      help="compare a frame extracted from each clip (needs --at)")
    p.add_argument("--at", nargs="+", metavar="SEC",
                   help="timecode(s) for --clip: one (same in both) or two (per-clip). "
                        "Accepts seconds (606) or mm:ss (10:06).")
    p.add_argument("--threshold", type=float, default=1.0,
                   help="mean-abs delta above which frames count as CHANGED (default 1.0)")
    p.add_argument("--save", metavar="PREFIX",
                   help="(clip mode) save the two extracted frames as PREFIX.A.png/.B.png")
    args = p.parse_args(argv)

    if args.clip:
        if not args.at:
            eprint("ERROR: --clip requires --at SEC")
            return 3
        return run_clip(args)
    return run_img(args)


if __name__ == "__main__":
    sys.exit(main())
