#!/usr/bin/env python3
"""
particles — a SUBTLE drifting-particle overlay (Leo: "subtle particle animations" to make it look
good). Renders a transparent, loopable bokeh layer (soft dots gently rising + twinkling) as a qtrle
.mov with alpha, to composite over the video at low opacity.

  python3 scripts/video-editor/particles.py --out particles.mov --dur 8 --color "#f5c451"
  # then overlay (loops to fill the video):
  ffmpeg -i video.mp4 -stream_loop -1 -i particles.mov -filter_complex \
    "[1:v]format=rgba,colorchannelmixer=aa=0.5[p];[0:v][p]overlay=shortest=1" out.mp4

Defaults are deliberately faint — particles should whisper, not shout.
"""
import argparse, math, os, random, subprocess, sys, tempfile
from PIL import Image

ap = argparse.ArgumentParser()
ap.add_argument("--out", required=True)
ap.add_argument("--dur", type=float, default=8.0)
ap.add_argument("--fps", type=int, default=30)
ap.add_argument("--w", type=int, default=1920)
ap.add_argument("--h", type=int, default=1080)
ap.add_argument("--count", type=int, default=70)
ap.add_argument("--color", default="#f5c451", help="particle tint (gold default; try #21d07a green or #ffffff)")
ap.add_argument("--opacity", type=float, default=0.5, help="global opacity 0..1 (kept low — subtle)")
ap.add_argument("--seed", type=int, default=7)
a = ap.parse_args()
W, H = a.w, a.h
COL = tuple(int(a.color.lstrip("#")[i:i + 2], 16) for i in (0, 2, 4))
random.seed(a.seed)

# one soft radial dot sprite (reused + scaled per particle — fast)
SPR = 64
sprite = Image.new("RGBA", (SPR, SPR), (0, 0, 0, 0))
cx = (SPR - 1) / 2
px = sprite.load()
for yy in range(SPR):
    for xx in range(SPR):
        dn = math.hypot(xx - cx, yy - cx) / (SPR / 2)
        al = max(0.0, 1.0 - dn) ** 2.2          # soft falloff to the edge
        px[xx, yy] = COL + (int(255 * al),)

# each particle: start position, rise speed, gentle horizontal sway, size, brightness, twinkle.
# For a SEAMLESS loop every period must be an INTEGER multiple of --dur: the particle rises a whole
# number of wrap-spans, and the sway/twinkle advance a whole number of cycles, over [0,dur].
if a.dur <= 0:
    sys.exit("particles: --dur must be > 0")
PAD = 160
parts = []
for _ in range(a.count):
    parts.append(dict(
        x0=random.uniform(0, W), y0=random.uniform(-PAD, H + PAD),
        rise=random.randint(1, 3) * (H + 2 * PAD) / a.dur,       # k whole screen-spans per loop
        amp=random.uniform(6, 26), sway=random.randint(1, 2) * 2 * math.pi / a.dur,   # k whole cycles
        size=random.randint(10, 46), bright=random.uniform(0.35, 1.0),
        ph=random.uniform(0, 2 * math.pi), tw=random.randint(1, 3) * 2 * math.pi / a.dur,
    ))

tmp = tempfile.mkdtemp(prefix="particles_")
nf = max(1, int(round(a.dur * a.fps)))
for f in range(nf):
    t = f / a.fps
    frame = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    for p in parts:
        y = ((p["y0"] - p["rise"] * t) % (H + 2 * PAD)) - PAD          # rise + seamless wrap
        x = p["x0"] + math.sin(p["ph"] + p["sway"] * t) * p["amp"]    # sway*t over [0,dur] = whole cycles
        twk = 0.55 + 0.45 * math.sin(p["ph"] + p["tw"] * t)           # twinkle (whole cycles → seamless)
        al = max(0.0, min(1.0, p["bright"] * twk * a.opacity))
        if al <= 0.01:
            continue
        sz = p["size"]
        spr = sprite.resize((sz, sz), Image.BILINEAR)
        spr.putalpha(spr.getchannel("A").point(lambda v: int(v * al)))
        frame.alpha_composite(spr, (int(x - sz / 2), int(y - sz / 2)))
    frame.save(os.path.join(tmp, f"{f:04d}.png"))

# qtrle keeps the alpha channel so it can be overlaid
enc = ["ffmpeg", "-y", "-hide_banner", "-loglevel", "error", "-framerate", str(a.fps),
       "-i", os.path.join(tmp, "%04d.png"), "-t", f"{nf / a.fps:.4f}", "-c:v", "qtrle", a.out]
r = subprocess.run(enc, capture_output=True)
if r.returncode != 0:
    sys.exit("particles FFMPEG FAIL:\n" + r.stderr.decode()[-1500:])
if not os.path.exists(a.out) or os.path.getsize(a.out) < 2000:
    sys.exit(f"particles: empty output ({a.out})")
print(f"✓ {a.out}  ({a.count} particles, {nf / a.fps:.1f}s loop @ {a.fps}fps, {a.color} @ {a.opacity:.0%})")
