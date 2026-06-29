#!/usr/bin/env python3
"""make-skit-props.py — generate prop PNGs for skits. Currently: a paycheck.
  python3 scripts/video-editor/make-skit-props.py  ->  assets/prop-paycheck.png
"""
import os
from PIL import Image, ImageDraw, ImageFont

ANTON = os.path.join(os.getcwd(), "assets/fonts/Anton-Regular.ttf")
ARCHIVO = os.path.join(os.getcwd(), "assets/fonts/ArchivoBlack-Regular.ttf")

W, H = 420, 230
im = Image.new("RGBA", (W, H), (0, 0, 0, 0))
d = ImageDraw.Draw(im)
# check body + border
d.rounded_rectangle([8, 8, W - 8, H - 8], radius=14, fill=(238, 236, 218, 255), outline=(54, 92, 70, 255), width=5)
# header band
d.rounded_rectangle([8, 8, W - 8, 58], radius=14, fill=(96, 150, 116, 255))
d.rectangle([8, 40, W - 8, 58], fill=(96, 150, 116, 255))
d.text((26, 16), "PAYCHECK", font=ImageFont.truetype(ANTON, 34), fill=(255, 255, 255, 255))
# pay-to line
d.text((26, 78), "PAY TO:  YOU", font=ImageFont.truetype(ARCHIVO, 22), fill=(40, 60, 50, 255))
d.line([(150, 104), (W - 30, 104)], fill=(120, 140, 128, 255), width=2)
# amount box
d.rounded_rectangle([W - 168, 120, W - 26, 176], radius=8, fill=(255, 255, 255, 255), outline=(54, 92, 70, 255), width=3)
d.text((W - 156, 130), "$4,000", font=ImageFont.truetype(ANTON, 34), fill=(30, 120, 60, 255))
# memo + signature
d.text((26, 132), "MEMO:", font=ImageFont.truetype(ARCHIVO, 16), fill=(90, 100, 94, 255))
d.text((26, 152), "direct deposit", font=ImageFont.truetype(ARCHIVO, 16), fill=(90, 100, 94, 255))
d.line([(26, 196), (180, 196)], fill=(80, 100, 90, 255), width=2)
d.text((30, 198), "Uncle Dijon", font=ImageFont.truetype(ARCHIVO, 14), fill=(70, 90, 80, 255))

out = os.path.join(os.getcwd(), "assets/prop-paycheck.png")
im.save(out)
print("✅", out, im.size)
