#!/usr/bin/env python3
"""
transition — a full-screen WHIP/SWIPE overlay to mask a cut (Leo: a full-screen transition makes a
cut seamless). Renders a short, soft-edged light streak that sweeps across the frame (peaking over
the cut), as a transparent qtrle .mov to overlay at a section/b-roll change.

  python3 scripts/video-editor/transition.py --out whip.mov --dur 0.4 --color "#ffffff"
  # overlay so the streak peaks AT the cut time (e.g. 30.94s):
  ffmpeg -i video.mp4 -i whip.mov -filter_complex \
    "[1:v]tpad=start_duration=30.74:color=black@0[w];[0:v][w]overlay=eof_action=pass" out.mp4
  # (start = cut - dur/2 so the white-out lands on the cut)

styles: --style whip (a directional light sweep, default) | wipe (a hard colour bar wipe).
Keep --dur short (0.3–0.5s) — a transition should be felt, not watched.
"""
import argparse, math, os, subprocess, sys, tempfile
from PIL import Image, ImageDraw

ap = argparse.ArgumentParser()
ap.add_argument("--out", required=True)
ap.add_argument("--dur", type=float, default=0.4)
ap.add_argument("--fps", type=int, default=30)
ap.add_argument("--w", type=int, default=1920)
ap.add_argument("--h", type=int, default=1080)
ap.add_argument("--color", default="#ffffff", help="streak colour (white default; try brand #21d07a / #0b1220)")
ap.add_argument("--style", choices=["whip", "wipe"], default="whip")
ap.add_argument("--direction", choices=["lr", "rl"], default="lr")
ap.add_argument("--opacity", type=float, default=0.92)
a = ap.parse_args()
W, H = a.w, a.h
COL = tuple(int(a.color.lstrip("#")[i:i + 2], 16) for i in (0, 2, 4))


def smooth(x):
    x = max(0.0, min(1.0, x)); return x * x * (3 - 2 * x)


if a.opacity <= 0:
    sys.exit("transition: --opacity must be > 0 (else the overlay is invisible)")
tmp = tempfile.mkdtemp(prefix="trans_")
nf = max(1, int(round(a.dur * a.fps)))
for f in range(nf):
    prog = smooth((f + 0.5) / nf)                              # 0→1 eased sweep (cell-centred)
    if a.direction == "rl":
        prog = 1.0 - prog
    env = math.sin(math.pi * (f + 0.5) / nf)                   # 0→1→0 over the clip, NEVER 0 (cell centres → works at nf=1,2)
    frame = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    if a.style == "wipe":
        # a hard colour bar that covers the frame at the midpoint (peaks fully opaque on the cut)
        peak = env
        d = ImageDraw.Draw(frame)
        bw = int(W * 0.7); bc = int(-0.35 * W + 1.7 * W * prog)
        d.rectangle([bc - bw // 2, 0, bc + bw // 2, H], fill=COL + (int(255 * peak * a.opacity),))
    else:
        # WHIP: a soft light streak (per-column gaussian) sweeping across, brightest mid-sweep
        peak = env * a.opacity
        bc = -0.3 * W + 1.6 * W * prog                          # streak centre
        bw = 0.20 * W
        d = ImageDraw.Draw(frame)
        for x in range(0, W, 2):
            al = math.exp(-((x - bc) / bw) ** 2) * peak
            if al > 0.01:
                d.line([(x, 0), (x, H)], fill=COL + (int(255 * al),), width=2)
    frame.save(os.path.join(tmp, f"{f:04d}.png"))

enc = ["ffmpeg", "-y", "-hide_banner", "-loglevel", "error", "-framerate", str(a.fps),
       "-i", os.path.join(tmp, "%04d.png"), "-t", f"{nf / a.fps:.4f}", "-c:v", "qtrle", a.out]
r = subprocess.run(enc, capture_output=True)
if r.returncode != 0:
    sys.exit("transition FFMPEG FAIL:\n" + r.stderr.decode()[-1500:])
if not os.path.exists(a.out) or os.path.getsize(a.out) < 2000:
    sys.exit(f"transition: empty output ({a.out})")
print(f"✓ {a.out}  ({a.style} {a.direction}, {nf / a.fps:.2f}s @ {a.fps}fps, {a.color})")
