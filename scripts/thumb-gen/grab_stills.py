#!/usr/bin/env python3
"""
grab_stills — pull candidate face stills from a YouTube video + a labeled contact
sheet to pick the best expression for a thumbnail. Grabs frames straight from the
stream (no full download) via yt-dlp -g + ffmpeg seek.

  python3 scripts/thumb-gen/grab_stills.py <videoId> [t1 t2 ...]
  → /tmp/state-sweep/stills/<id>/f<t>.jpg  + contact.jpg
"""
import sys, os, subprocess
from PIL import Image, ImageDraw, ImageFont

vid = sys.argv[1]
times = [int(x) for x in sys.argv[2:]] or [5, 11, 18, 27, 40, 60, 95, 160, 300]
out = f"/tmp/state-sweep/stills/{vid}"
os.makedirs(out, exist_ok=True)

g = subprocess.run(["yt-dlp", "-g", "-f",
                    "bestvideo[height<=1080][ext=mp4]/bestvideo[height<=1080]/best[height<=1080]",
                    f"https://youtu.be/{vid}"], capture_output=True, text=True)
url = (g.stdout.strip().splitlines() or [""])[0]
if not url:
    print(f"NO URL for {vid}: {g.stderr[:160]}"); sys.exit(1)

frames = []
for t in times:
    p = f"{out}/f{t}.jpg"
    subprocess.run(["ffmpeg", "-y", "-ss", str(t), "-i", url, "-frames:v", "1", "-q:v", "3", p],
                   capture_output=True)
    if os.path.exists(p) and os.path.getsize(p) > 2500:
        frames.append((t, p))

cols = 3
rows = (len(frames) + cols - 1) // cols
tw, th = 360, 202
sheet = Image.new("RGB", (cols * tw, rows * th), (18, 18, 18))
d = ImageDraw.Draw(sheet)
try: f = ImageFont.truetype("/System/Library/Fonts/Supplemental/Arial Bold.ttf", 30)
except Exception: f = ImageFont.load_default()
for i, (t, p) in enumerate(frames):
    im = Image.open(p).convert("RGB").resize((tw, th))
    sheet.paste(im, ((i % cols) * tw, (i // cols) * th))
    d.text(((i % cols) * tw + 10, (i // cols) * th + 8), f"{t}s", fill=(255, 230, 0), font=f, stroke_width=3, stroke_fill=(0, 0, 0))
sheet.save(f"{out}/contact.jpg")
print(f"{out}/contact.jpg ({len(frames)} frames)")
