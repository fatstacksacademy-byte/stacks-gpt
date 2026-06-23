#!/usr/bin/env python3
"""
preview-burn — quick caption+callout preview WITHOUT Resolve. Overlays the rendered
caption + callout PNGs from a plan.json onto a clip with ffmpeg. Handy for eyeballing
the retention layer before the full Resolve build. (This ffmpeg has no libass, so we
burn the branded PNGs directly — same look the Resolve pipeline places.)

  python3 scripts/video-editor/preview-burn.py --clip clip.mp4 --plan plan.json --out preview.mp4
"""
import argparse, json, os, subprocess, sys

ap = argparse.ArgumentParser()
ap.add_argument("--clip", required=True)
ap.add_argument("--plan", required=True)
ap.add_argument("--out", required=True)
ap.add_argument("--callout-dur", type=float, default=2.2)
a = ap.parse_args()

plan = json.load(open(a.plan))
items = []  # (image, start, end)
for c in plan.get("captions", []):
    if c.get("image"):
        items.append((c["image"], c["t"], c["end"]))
for c in plan.get("callouts", []):
    if c.get("image"):
        items.append((c["image"], c["t"], c["t"] + a.callout_dur))
if not items:
    sys.exit("no caption/callout images in plan — run render-cards first (without --skip-captions)")

dur = float(subprocess.run(["ffprobe", "-v", "error", "-show_entries", "format=duration",
                            "-of", "csv=p=0", a.clip], capture_output=True, text=True).stdout.strip() or 0)

inputs = ["-i", a.clip]
for img, _, _ in items:
    inputs += ["-loop", "1", "-i", img]

fc, prev = [], "0:v"
for i, (_, s, e) in enumerate(items, start=1):
    out = f"v{i}"
    fc.append(f"[{prev}][{i}:v]overlay=0:0:enable='between(t,{s:.3f},{e:.3f})'[{out}]")
    prev = out
fc.append(f"[{prev}]format=yuv420p[vout]")

cmd = ["ffmpeg", "-y", *inputs, "-filter_complex", ";".join(fc),
       "-map", "[vout]", "-map", "0:a?", "-t", f"{dur:.3f}",
       "-c:v", "libx264", "-crf", "19", "-preset", "veryfast", "-c:a", "aac", a.out]
print(f"burning {len(items)} overlays over {dur:.1f}s → {a.out}")
r = subprocess.run(cmd, stderr=subprocess.PIPE)
if r.returncode != 0:
    sys.exit(r.stderr.decode()[-1800:])
print(f"✓ {a.out}")
