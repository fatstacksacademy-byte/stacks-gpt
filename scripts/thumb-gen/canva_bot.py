#!/usr/bin/env python3
"""
canva_bot — minimal macOS GUI automation for driving the Canva desktop app (or any
app) by screenshot + OCR + click/type. The "no-API" strategy: see the screen, find
text with OCR, move/click/type by coordinate.

REQUIRES (granted to the host app — "Visual Studio Code" here, in System Settings →
Privacy & Security):
  • Screen Recording  → for `screencapture`
  • Accessibility     → for `cliclick` (mouse/keyboard)
(Grant both, then RESTART VS Code so Screen Recording takes effect.)

Coordinates: screenshots are Retina (2x); cliclick uses logical points (1x). This
harness auto-detects the scale and converts OCR pixel coords → click points.

Commands:
  scale                         print detected retina scale
  shot [path]                   capture screen (default /tmp/state-sweep/canva.png)
  ocr [path]                    dump OCR words + point-coords as JSON
  find "text" [path]            print matches (point coords) for fuzzy text
  clicktext "text" [n]          click the n-th (default 1) match of text
  click X Y                     move + click at logical points
  rclick X Y                    right-click
  move X Y
  type "text"                   type a string
  key NAME[,NAME...]            press keys (return, esc, tab, space, arrow-down, …)
  combo cmd v                   hold modifier(s) + key (e.g. paste)
  drag X1 Y1 X2 Y2
"""
import sys, subprocess, json, os
from PIL import Image, ImageDraw, ImageFont

def gridshot(p=None, step=80):
    """Screenshot downscaled to LOGICAL points with a labeled coordinate grid,
    so click targets can be read off directly (grid numbers == cliclick coords)."""
    p = p or SHOT
    shot(p)
    sc = scale(p)
    im = Image.open(p).convert("RGB").resize((round(Image.open(p).width / sc), round(Image.open(p).height / sc)))
    d = ImageDraw.Draw(im)
    try: f = ImageFont.truetype("/System/Library/Fonts/Supplemental/Arial.ttf", 11)
    except Exception: f = ImageFont.load_default()
    for x in range(0, im.width, step):
        d.line([(x, 0), (x, im.height)], fill=(255, 40, 40), width=1)
        for yy in (0, im.height // 2):
            d.text((x + 1, yy + 1), str(x), fill=(255, 40, 40), font=f)
    for y in range(0, im.height, step):
        d.line([(0, y), (im.width, y)], fill=(255, 40, 40), width=1)
        d.text((1, y + 1), str(y), fill=(0, 120, 255), font=f)
    gp = p.replace(".png", "-grid.png"); im.save(gp); return gp

SHOT = "/tmp/state-sweep/canva.png"
os.makedirs("/tmp/state-sweep", exist_ok=True)

def _run(args): return subprocess.run(args, capture_output=True, text=True, errors="replace")

def front_is(app="Canva"):
    asn = _run(["lsappinfo", "front"]).stdout.strip()
    name = _run(["lsappinfo", "info", "-only", "name", asn]).stdout
    return app.lower() in name.lower()

def shot(p=SHOT):
    r = _run(["screencapture", "-x", "-t", "png", p])
    if r.returncode != 0 or not os.path.exists(p):
        sys.exit(f"screencapture failed (Screen Recording permission?): {r.stderr.strip()}")
    return p

def scale(p=SHOT):
    if not os.path.exists(p): shot(p)
    pw = Image.open(p).width
    out = _run(["osascript", "-e", 'tell application "Finder" to get bounds of window of desktop']).stdout
    try:
        lw = int(out.split(",")[2])
    except Exception:
        lw = pw // 2  # assume 2x
    return pw / lw if lw else 2.0

def ocr(p=SHOT):
    if not os.path.exists(p): shot(p)
    sc = scale(p)
    tsv = _run(["tesseract", p, "stdout", "--psm", "11", "tsv"]).stdout
    rows = []
    for line in tsv.splitlines()[1:]:
        c = line.split("\t")
        if len(c) >= 12 and c[11].strip():
            try:
                x, y, w, h, conf = int(c[6]), int(c[7]), int(c[8]), int(c[9]), float(c[10])
            except ValueError:
                continue
            if conf < 40: continue
            rows.append({"text": c[11], "cx": round((x + w / 2) / sc), "cy": round((y + h / 2) / sc), "conf": conf})
    return rows

def find(text, p=SHOT):
    t = text.lower()
    return [r for r in ocr(p) if t in r["text"].lower()]

def cliclick(*cmds):
    if not subprocess.run(["which", "cliclick"], capture_output=True).returncode == 0:
        sys.exit("cliclick not installed (brew install cliclick)")
    r = _run(["cliclick", *cmds])
    if r.returncode != 0: sys.exit(f"cliclick failed: {r.stderr.strip()}")

def main():
    a = sys.argv[1:]
    if not a: sys.exit(__doc__)
    cmd = a[0]
    if cmd == "scale": print(scale())
    elif cmd == "grid": print(gridshot())
    elif cmd == "shot": print(shot(a[1] if len(a) > 1 else SHOT))
    elif cmd == "ocr": print(json.dumps(ocr(a[1] if len(a) > 1 else SHOT), indent=1))
    elif cmd == "find":
        for r in find(a[1]): print(r)
    elif cmd == "clicktext":
        n = int(a[2]) if len(a) > 2 else 1
        m = find(a[1])
        if len(m) < n: sys.exit(f"'{a[1]}' match #{n} not found (found {len(m)})")
        r = m[n - 1]; cliclick(f"c:{r['cx']},{r['cy']}"); print(f"clicked '{r['text']}' @ {r['cx']},{r['cy']}")
    elif cmd == "click": cliclick(f"c:{a[1]},{a[2]}")
    elif cmd == "rclick": cliclick(f"rc:{a[1]},{a[2]}")
    elif cmd == "move": cliclick(f"m:{a[1]},{a[2]}")
    elif cmd == "type": cliclick(f"t:{a[1]}")
    elif cmd == "key": cliclick(*[f"kp:{k}" for k in a[1].split(",")])
    elif cmd == "combo":
        mods, key = a[1:-1], a[-1]
        cliclick(*[f"kd:{m}" for m in mods], f"kp:{key}", *[f"ku:{m}" for m in mods])
    elif cmd == "drag": cliclick(f"m:{a[1]},{a[2]}", f"dd:{a[1]},{a[2]}", f"dm:{a[3]},{a[4]}", f"du:{a[3]},{a[4]}")
    else: sys.exit(f"unknown command: {cmd}")

if __name__ == "__main__":
    main()
