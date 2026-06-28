#!/usr/bin/env python3
"""
make-placeholder-villain.py — draw a cartoon 'greedy banker' cutout (transparent PNG)
to STAND IN for a real cutout until you drop one in. Accent color distinguishes banks.

  python3 scripts/video-editor/make-placeholder-villain.py                                  # default red banker
  python3 scripts/video-editor/make-placeholder-villain.py --out assets/banker-chase.png --tie "#2156c4" --band "#15306e"
  python3 scripts/video-editor/make-placeholder-villain.py --out assets/banker-wells.png --tie "#c4302b" --band "#f2c200"

Real thing: photo -> remove.bg -> assets/jamie-dimon.png, then point the spec villain "src" at it.
"""
import argparse
from PIL import Image, ImageDraw


def draw(out, tie, band):
    W, H = 520, 720
    im = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    d.polygon([(150, 300), (370, 300), (445, 705), (75, 705)], fill=(32, 36, 44, 255))      # suit
    d.polygon([(230, 300), (195, 300), (255, 520)], fill=(20, 22, 28, 255))                  # lapel L
    d.polygon([(290, 300), (325, 300), (265, 520)], fill=(20, 22, 28, 255))                  # lapel R
    d.polygon([(232, 300), (288, 300), (296, 470), (224, 470)], fill=(240, 240, 245, 255))   # shirt
    d.polygon([(252, 330), (268, 330), (286, 480), (234, 480)], fill=tie)                     # tie
    d.rectangle([236, 250, 284, 312], fill=(226, 198, 170, 255))                              # neck
    d.ellipse([178, 92, 342, 284], fill=(228, 200, 172, 255))                                 # head
    d.rectangle([168, 44, 352, 74], fill=(14, 14, 18, 255))                                   # hat brim
    d.rectangle([198, 6, 322, 50], fill=(14, 14, 18, 255))                                    # hat crown
    d.rectangle([198, 36, 322, 50], fill=band)                                                # hat band
    d.line([(206, 152), (256, 170)], fill=(70, 48, 26, 255), width=11)                        # brow L
    d.line([(314, 152), (264, 170)], fill=(70, 48, 26, 255), width=11)                        # brow R
    d.ellipse([222, 168, 244, 190], fill=(22, 22, 22, 255))                                   # eye L
    d.ellipse([278, 168, 300, 190], fill=(22, 22, 22, 255))                                   # eye R
    d.ellipse([270, 160, 308, 198], outline=(212, 175, 55, 255), width=5)                     # monocle
    d.line([(289, 198), (296, 250)], fill=(212, 175, 55, 255), width=3)
    d.polygon([(232, 214), (288, 214), (300, 236), (260, 228), (220, 236)], fill=(72, 48, 26, 255))  # mustache
    d.arc([232, 206, 292, 256], start=15, end=165, fill=(90, 46, 34, 255), width=5)           # grin
    d.ellipse([330, 432, 472, 582], fill=(58, 54, 44, 255))                                   # money bag
    d.rectangle([362, 410, 442, 448], fill=(58, 54, 44, 255))
    d.ellipse([386, 470, 446, 540], outline=(222, 200, 90, 255), width=6)
    d.line([(414, 474), (414, 536)], fill=(222, 200, 90, 255), width=6)
    im.save(out)
    print("✅", out, im.size)


if __name__ == "__main__":
    import os
    ap = argparse.ArgumentParser()
    ap.add_argument("--out", default="assets/placeholder-banker.png")
    ap.add_argument("--tie", default="#c61e28")
    ap.add_argument("--band", default="#961e26")
    a = ap.parse_args()
    draw(os.path.join(os.getcwd(), a.out), a.tie, a.band)
