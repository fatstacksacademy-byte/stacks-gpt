#!/usr/bin/env python3
"""
cut_still — face-detected head-and-shoulders cutout from a video frame.

Detects the largest face (OpenCV Haar), crops a head+shoulders box around it
(so the desk / guitar / wall props are excluded), removes the background (rembg),
and keeps only the largest blob. Run with the venv python (rembg + cv2 + scipy).

  /tmp/state-sweep/tg-venv/bin/python scripts/thumb-gen/cut_still.py <id> <timestamp> [shoulder_mult]
  → assets/still-<id>.png
"""
import sys, os, numpy as np, cv2
from rembg import remove
from PIL import Image
from scipy import ndimage

vid, t = sys.argv[1], sys.argv[2]
shoulder = float(sys.argv[3]) if len(sys.argv) > 3 else 2.6  # how far below the face to include (× face height)
src = f"/tmp/state-sweep/stills/{vid}/f{t}.jpg"

bgr = cv2.imread(src); Hh, Ww = bgr.shape[:2]
gray = cv2.cvtColor(bgr, cv2.COLOR_BGR2GRAY)
casc = cv2.CascadeClassifier(cv2.data.haarcascades + "haarcascade_frontalface_default.xml")
faces = casc.detectMultiScale(gray, 1.1, 6, minSize=(110, 110))
if len(faces):
    x, y, w, h = sorted(faces, key=lambda f: f[2] * f[3])[-1]
    box = (max(0, x - int(w * 0.85)), max(0, y - int(h * 0.8)),
           min(Ww, x + w + int(w * 0.85)), min(Hh, y + h + int(h * shoulder)))
    print(f"  face @ ({x},{y},{w},{h}) → box {box}")
else:
    box = (0, 0, Ww, Hh); print("  no face detected — using full frame")

cut = remove(Image.open(src).convert("RGBA").crop(box))
arr = np.array(cut); mask = arr[..., 3] > 40
lbl, n = ndimage.label(mask)
if n > 1:
    sizes = ndimage.sum(mask, lbl, range(1, n + 1)); keep = int(np.argmax(sizes)) + 1
    arr[..., 3] = np.where(lbl == keep, arr[..., 3], 0); cut = Image.fromarray(arr)
bb = cut.getbbox()
if bb: cut = cut.crop(bb)
out = f"assets/still-{vid}.png"
cut.save(out); print(f"{out} {cut.size}")
