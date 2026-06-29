#!/usr/bin/env python3
"""
page-scroll — animate a "scroll down/up the page + zoom into the thing" move on a tall page screenshot.
Crops a window that eases from START (x,y,w,h) to END (x,y,w,h) over the first ~72% of the clip, then
holds — so it reads like someone scrolling to and zooming on the relevant section. Output is sized to the
panel you'll drop it in (e.g. the split right panel).

  python3 scripts/video-editor/page-scroll.py --image page.png \
    --start 0,60,3840,3516 --end 660,1606,1700,1557 --dur 13 --fps 24 --size 1092x1000 --out scroll.mp4
"""
import argparse, os, subprocess, tempfile
from PIL import Image

ap = argparse.ArgumentParser()
ap.add_argument("--image", required=True)
ap.add_argument("--start", required=True, help="x,y,w,h source-px crop at clip start")
ap.add_argument("--end", required=True, help="x,y,w,h source-px crop at clip end")
ap.add_argument("--dur", type=float, default=10.0)
ap.add_argument("--fps", type=int, default=24)
ap.add_argument("--size", default="1092x1000", help="output WxH")
ap.add_argument("--move-frac", type=float, default=0.72, help="fraction of the clip spent moving (then hold)")
ap.add_argument("--out", required=True)
a = ap.parse_args()

img = Image.open(a.image).convert("RGB"); IW, IH = img.size
ow, oh = (int(v) for v in a.size.split("x"))
sx, sy, sw, sh = (float(v) for v in a.start.split(","))
ex, ey, ew, eh = (float(v) for v in a.end.split(","))
def sm(x): x = max(0.0, min(1.0, x)); return x * x * (3 - 2 * x)
nf = max(1, int(round(a.dur * a.fps)))
tmp = tempfile.mkdtemp(prefix="scroll_")
for f in range(nf):
    p = sm(min(1.0, (f / max(1, nf * a.move_frac))))
    x = sx + (ex - sx) * p; y = sy + (ey - sy) * p; w = sw + (ew - sw) * p; h = sh + (eh - sh) * p
    x = max(0, min(IW - 4, x)); y = max(0, min(IH - 4, y))
    w = max(8, min(IW - x, w)); h = max(8, min(IH - y, h))
    img.crop((int(x), int(y), int(x + w), int(y + h))).resize((ow, oh), Image.LANCZOS).save(f"{tmp}/{f:04d}.png")
subprocess.run(["ffmpeg", "-y", "-v", "error", "-framerate", str(a.fps), "-i", f"{tmp}/%04d.png",
                "-t", f"{nf / a.fps:.4f}", "-c:v", "libx264", "-crf", "20", "-pix_fmt", "yuv420p", a.out], check=True)
print(f"✓ {a.out}  ({nf} frames, scroll {a.start} → {a.end})")
