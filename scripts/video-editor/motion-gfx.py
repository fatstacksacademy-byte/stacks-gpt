#!/usr/bin/env python3
"""
motion-gfx — animated EXPLAINER graphics for dense moments (Leo pillar 1: "an animation explains a
complicated thing crystal-clear and fast where a-roll/b-roll would be slow or confusing").

Renders a full-screen, brand-styled animated card (PIL frame sequence → ffmpeg) to drop on the
timeline at an explainer beat. Brand identity from lib/brand.json (navy/green/gold, Anton + Archivo).

Templates (--type):
  value   value math that builds + counts up   — "100,000 pts × 1.5¢ = $1,500"
  steps   numbered step flow, staggered in     — apply → spend $5k → earn 100k
  bars    two values as growing bars            — 75K vs 100K

  python3 scripts/video-editor/motion-gfx.py --type value --out v.mp4 --dur 4 \
      --spec '{"label":"what the bonus is worth","a":"100,000 pts","b":"1.5¢ / pt","c":"$1,500"}'
  python3 scripts/video-editor/motion-gfx.py --type steps --out s.mp4 --dur 5 \
      --spec '{"title":"How to earn it","steps":["Apply for the card","Spend $5,000 in 3 months","Earn 100,000 points"]}'
  python3 scripts/video-editor/motion-gfx.py --type bars --out b.mp4 --dur 4 \
      --spec '{"title":"Best-ever bonus","items":[{"label":"Usual","value":75000},{"label":"Right now","value":100000}]}'
  (--spec accepts inline JSON or @path/to/spec.json)
"""
import argparse, json, math, os, re, subprocess, sys, tempfile
from PIL import Image, ImageDraw, ImageFilter, ImageFont

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, "..", ".."))
BRAND = json.load(open(os.path.join(HERE, "lib", "brand.json")))
C = BRAND["color"]
W, H = 1920, 1080
# Render the proven 1080 coordinate space, then output at RENDER_SCALE (default 2 = native 4K 3840×2160).
# These cards are flat brand graphics (solid fills + big Anton/Archivo text), so a lanczos upscale is
# visually native-equivalent with zero layout risk. RENDER_SCALE=1 keeps the byte-identical 1080 path.
S = max(1, int(os.environ.get("RENDER_SCALE", "2")))

ap = argparse.ArgumentParser()
ap.add_argument("--type", required=True, choices=["value", "steps", "bars", "timeline", "table", "bignum", "checklist"])
ap.add_argument("--spec", required=True, help="inline JSON or @file.json")
ap.add_argument("--out", required=True)
ap.add_argument("--dur", type=float, default=4.0)
ap.add_argument("--fps", type=int, default=30)
a = ap.parse_args()
spec = json.load(open(a.spec[1:])) if a.spec.startswith("@") else json.loads(a.spec)
a.fps = max(1, a.fps)   # guard degenerate --fps 0 (avoids ZeroDivisionError in DUR)


def hx(name):
    h = C[name].lstrip("#"); return tuple(int(h[i:i + 2], 16) for i in (0, 2, 4))


GREEN, GOLD, NAVY, NAVYMID, NAVYELEV = hx("green"), hx("gold"), hx("navyDeep"), hx("navyMid"), hx("navyElev")
LINE = hx("line")
WHITE, MUTED = (255, 255, 255), hx("textSecondary")
FONTS = {"display": os.path.join(ROOT, BRAND["font"]["display"]["file"]),
         "heavy": os.path.join(ROOT, BRAND["font"]["heavy"]["file"])}
_SYS = ["/System/Library/Fonts/Supplemental/Arial Bold.ttf", "/System/Library/Fonts/Helvetica.ttc"]
_FCACHE = {}


def font(kind, size):
    key = (kind, size)
    if key in _FCACHE:
        return _FCACHE[key]
    for p in [FONTS.get(kind)] + _SYS:
        if p and os.path.exists(p):
            try:
                _FCACHE[key] = ImageFont.truetype(p, size); return _FCACHE[key]
            except Exception:
                pass
    _FCACHE[key] = ImageFont.load_default(); return _FCACHE[key]


def smooth(x):
    x = max(0.0, min(1.0, x)); return x * x * (3 - 2 * x)


def pop(x):  # ease-out-back (slight overshoot) for a snappy entrance
    x = max(0.0, min(1.0, x)); c = 1.70158; x -= 1
    return 1 + (c + 1) * x ** 3 + c * x ** 2


def env(t, t0, dur=0.4):  # 0→1 eased entrance starting at t0
    return smooth((t - t0) / dur)


def tw(d, s, f):
    l, _, r, _ = d.textbbox((0, 0), s, font=f); return r - l


def background():
    bg = Image.new("RGB", (W, H), NAVY)
    grad = Image.new("L", (1, H), 0)
    for y in range(H):
        grad.putpixel((0, y), int(60 * (1 - abs(y - H / 2) / (H / 2))))   # lighten toward center
    bg = Image.composite(Image.new("RGB", (W, H), NAVYMID), bg, grad.resize((W, H)))
    ImageDraw.Draw(bg).rectangle([0, H - 10, W, H], fill=GREEN)            # bottom accent bar
    return bg


# parse "$1,500" / "1.5¢" → (prefix, number, suffix)
def num_parts(s):
    m = re.search(r"[\d,]+(?:\.\d+)?", s)
    return (s[:m.start()], float(m.group().replace(",", "")), s[m.end():]) if m else (s, None, "")


def render(t, base):
    im = base.copy()
    d = ImageDraw.Draw(im, "RGBA")   # RGBA mode → fills with an alpha channel blend into the RGB image
    if a.type == "value":
        lab = spec.get("label", "")
        if lab and env(t, 0.0, 0.3) > 0:
            d.text((W // 2, 165), lab.upper(), font=font("heavy", 40), fill=GREEN + (int(255 * env(t, 0.0, 0.3)),), anchor="ma")
        A, B, c = str(spec.get("a", "")), str(spec.get("b", "")), str(spec.get("c", ""))
        fA, fop = font("heavy", 78), font("heavy", 58)
        wa, wop, wb, gap = tw(d, A, fA), tw(d, "×", fop), tw(d, B, fA), 40
        x = (W - (wa + wop + wb + 2 * gap)) // 2; yrow = 410
        for s, f, x0, t0 in [(A, fA, x, 0.1), ("×", fop, x + wa + gap, 0.45), (B, fA, x + wa + gap + wop + gap, 0.6)]:
            e = env(t, t0)
            if e > 0:
                col = (WHITE if s != "×" else MUTED) + (int(255 * e),)
                d.text((x0, yrow + int(28 * (1 - e))), s, font=f, fill=col)
        if c and env(t, 1.0, 0.2) > 0:   # only draw "=" + result when a result is actually given
            pre, val, suf = num_parts(c)
            dec = 2 if (val is not None and val != int(val)) else 0
            cur = (val or 0) * smooth((t - 1.05) / 1.0)
            shown = (f"{pre}{cur:,.{dec}f}{suf}" if dec else f"{pre}{int(round(cur)):,}{suf}") if val is not None else c
            d.text((W // 2, 690), "=", font=font("heavy", 56), fill=MUTED + (int(255 * env(t, 0.95, 0.2)),), anchor="ma")
            sz = max(40, int(168 * (0.55 + 0.45 * pop(env(t, 1.0, 0.45)))))
            d.text((W // 2, 880), shown, font=font("display", sz), fill=GOLD + (255,), anchor="md")
    elif a.type == "steps":
        title, steps = str(spec.get("title", "")), [str(s) for s in spec.get("steps", [])]
        if title:
            e = env(t, 0.0, 0.4)
            d.text((W // 2, 150 - int(20 * (1 - e))), title.upper(), font=font("display", 84), fill=WHITE + (int(255 * e),), anchor="ma")
            d.line([(W // 2 - 90, 290), (W // 2 + 90, 290)], fill=GREEN + (int(255 * e),), width=8)
        n = max(1, len(steps)); rowH = min(155, (H - 430) // n); y0 = 360; r = 44
        fnum, ftxt = font("display", 54), font("heavy", 48)
        for i, st in enumerate(steps):
            e = pop(env(t, 0.5 + i * 0.45, 0.45))
            if e <= 0:
                continue
            al = int(255 * min(1.0, env(t, 0.5 + i * 0.45, 0.3)))
            yy = y0 + i * rowH; xx = 360 + int(-50 * (1 - smooth(env(t, 0.5 + i * 0.45, 0.45))))
            d.ellipse([xx, yy, xx + 2 * r, yy + 2 * r], fill=GREEN + (al,))
            d.text((xx + r, yy + r), str(i + 1), font=fnum, fill=NAVY + (al,), anchor="mm")
            d.text((xx + 2 * r + 40, yy + r), st, font=ftxt, fill=WHITE + (al,), anchor="lm")
    elif a.type == "bars":
        title, items = str(spec.get("title", "")), spec.get("items", [])[:4]
        if title:
            d.text((W // 2, 160), title.upper(), font=font("display", 80), fill=WHITE + (int(255 * env(t, 0.0, 0.4)),), anchor="ma")
        mx = max([float(it.get("value", 0)) for it in items] + [1.0]); n = max(1, len(items))
        bw, gap = 240, 170; x0 = (W - (n * bw + (n - 1) * gap)) // 2; baseY, maxH = 880, 470
        for i, it in enumerate(items):
            val = float(it.get("value", 0)); grow = smooth((t - (0.4 + i * 0.4)) / 1.0)
            bh = int(maxH * (val / mx) * grow); bx = x0 + i * (bw + gap)
            last = i == len(items) - 1; col = GOLD if last else NAVYELEV
            d.rounded_rectangle([bx, baseY - bh, bx + bw, baseY], radius=14, fill=col + (255,))
            if grow > 0.02:
                d.text((bx + bw // 2, baseY - bh - 22), f"{int(round(val * grow)):,}", font=font("display", 62),
                       fill=(GOLD if last else WHITE) + (255,), anchor="md")
            d.text((bx + bw // 2, baseY + 28), str(it.get("label", "")).upper(), font=font("heavy", 36),
                   fill=MUTED + (int(255 * env(t, 0.4 + i * 0.4, 0.4)),), anchor="ma")
    elif a.type == "timeline":   # a horizontal track that draws L→R with markers appearing in sequence (e.g. the 0% APR float)
        title, marks = str(spec.get("title", "")), spec.get("markers", [])
        if title:
            e = env(t, 0.0, 0.4)
            d.text((W // 2, 150 - int(20 * (1 - e))), title.upper(), font=font("display", 78), fill=WHITE + (int(255 * e),), anchor="ma")
            d.line([(W // 2 - 90, 290), (W // 2 + 90, 290)], fill=GREEN + (int(255 * e),), width=8)
        n = max(1, len(marks)); x0, x1, ly = 240, W - 240, 580
        lp = smooth((t - 0.5) / 1.6)
        d.line([(x0, ly), (x0 + int((x1 - x0) * lp), ly)], fill=LINE + (255,), width=6)
        for i, m in enumerate(marks):
            frac = i / max(1, n - 1)
            if lp < frac - 0.001:
                continue
            al = int(255 * min(1.0, (lp - frac) * 8 + 0.25)); mx = int(x0 + (x1 - x0) * frac); r = 18
            d.ellipse([mx - r, ly - r, mx + r, ly + r], fill=GREEN + (al,))
            d.text((mx, ly - 52), str(m.get("label", "")).upper(), font=font("heavy", 38), fill=WHITE + (al,), anchor="md")
            if m.get("sub"):
                d.text((mx, ly + 50), str(m["sub"]), font=font("heavy", 30), fill=GOLD + (al,), anchor="ma")
    elif a.type == "table":      # comparison grid — column header + rows fade in, one column highlighted gold
        title, cols, rows = str(spec.get("title", "")), spec.get("columns", []), spec.get("rows", [])
        hl = spec.get("highlight", -1)
        if title:
            d.text((W // 2, 145), title.upper(), font=font("display", 72), fill=WHITE + (int(255 * env(t, 0.0, 0.4)),), anchor="ma")
        nc = max(1, len(cols)); dataX0, dataX1, labelX = 700, W - 130, 210
        colW = (dataX1 - dataX0) / nc
        cx = lambda j: int(dataX0 + (j + 0.5) * colW)
        hy, y0 = 330, 430; nr = max(1, len(rows)); rowH = min(125, (H - 520) // nr)
        if isinstance(hl, int) and not isinstance(hl, bool) and 0 <= hl < nc and int(colW) > 20:
            hxc = int(dataX0 + hl * colW)
            d.rounded_rectangle([hxc + 8, hy - 52, hxc + int(colW) - 8, y0 + nr * rowH - 18], radius=16, fill=GOLD + (26,))
        he = int(255 * env(t, 0.2, 0.4))
        for j, c_ in enumerate(cols):
            d.text((cx(j), hy), str(c_).upper(), font=font("display", 46), fill=(GOLD if j == hl else WHITE) + (he,), anchor="mm")
        ftxt, flab = font("heavy", 40), font("heavy", 38)
        for i, row in enumerate(rows):
            e = env(t, 0.5 + i * 0.35, 0.4)
            if e <= 0:
                continue
            al = int(255 * e); yy = y0 + i * rowH + rowH // 2
            d.text((labelX, yy), str(row.get("label", "")).upper(), font=flab, fill=MUTED + (al,), anchor="lm")
            for j, cell in enumerate(row.get("cells", [])[:nc]):
                d.text((cx(j), yy), str(cell), font=ftxt, fill=(GOLD if j == hl else WHITE) + (al,), anchor="mm")
    elif a.type == "bignum":     # one HUGE hero stat (counts up if numeric) + eyebrow + sub
        lab, val, sub = str(spec.get("label", "")), str(spec.get("value", "")), str(spec.get("sub", ""))
        if lab and env(t, 0.0, 0.3) > 0:
            d.text((W // 2, 300), lab.upper(), font=font("heavy", 50), fill=GREEN + (int(255 * env(t, 0.0, 0.3)),), anchor="ma")
        if env(t, 0.4, 0.2) > 0:
            pre, v, suf = num_parts(val); dec = 2 if (v is not None and v != int(v)) else 0
            cur = (v or 0) * smooth((t - 0.45) / 0.9)
            shown = (f"{pre}{cur:,.{dec}f}{suf}" if dec else f"{pre}{int(round(cur)):,}{suf}") if v is not None else val
            fv = font("display", max(40, int(248 * (0.5 + 0.5 * pop(env(t, 0.4, 0.5))))))
            d.text((W // 2, 560), shown, font=fv, fill=GOLD + (255,), anchor="mm")
        if sub and env(t, 0.95, 0.4) > 0:
            d.text((W // 2, 780), sub, font=font("heavy", 42), fill=MUTED + (int(255 * env(t, 0.95, 0.4)),), anchor="ma")
    elif a.type == "checklist":  # ✓/✗ items pop in sequentially (eligibility, do/don't); marks drawn as vectors
        title, items = str(spec.get("title", "")), spec.get("items", [])
        if title:
            e = env(t, 0.0, 0.4)
            d.text((W // 2, 150 - int(20 * (1 - e))), title.upper(), font=font("display", 84), fill=WHITE + (int(255 * e),), anchor="ma")
            d.line([(W // 2 - 90, 290), (W // 2 + 90, 290)], fill=GREEN + (int(255 * e),), width=8)
        n = max(1, len(items)); rowH = min(150, (H - 430) // n); y0 = 360; r = 40
        for i, it in enumerate(items):
            if env(t, 0.5 + i * 0.4, 0.45) <= 0:
                continue
            al = int(255 * min(1.0, env(t, 0.5 + i * 0.4, 0.3)))
            ok = it.get("ok", True) if isinstance(it, dict) else True
            txt = str(it.get("text", "") if isinstance(it, dict) else it)
            yy = y0 + i * rowH; xx = 420 + int(-50 * (1 - smooth(env(t, 0.5 + i * 0.4, 0.45))))
            d.ellipse([xx, yy, xx + 2 * r, yy + 2 * r], fill=(GREEN if ok else hx("danger")) + (al,))
            cx_, cy_ = xx + r, yy + r
            if ok:   # checkmark
                d.line([(cx_ - 16, cy_ + 2), (cx_ - 4, cy_ + 14), (cx_ + 18, cy_ - 14)], fill=NAVY + (al,), width=8, joint="curve")
            else:    # X
                d.line([(cx_ - 13, cy_ - 13), (cx_ + 13, cy_ + 13)], fill=NAVY + (al,), width=8)
                d.line([(cx_ - 13, cy_ + 13), (cx_ + 13, cy_ - 13)], fill=NAVY + (al,), width=8)
            d.text((xx + 2 * r + 36, cy_), txt, font=font("heavy", 48), fill=WHITE + (al,), anchor="lm")
    return im


tmp = tempfile.mkdtemp(prefix="mgfx_")
nf = max(1, int(round(a.dur * a.fps))); DUR = nf / a.fps
base = background()
for f in range(nf):
    render(f / a.fps, base).save(os.path.join(tmp, f"{f:04d}.png"))
vf = [] if S == 1 else ["-vf", f"scale={W * S}:{H * S}:flags=lanczos"]
enc = ["ffmpeg", "-y", "-hide_banner", "-loglevel", "error", "-framerate", str(a.fps),
       "-i", os.path.join(tmp, "%04d.png"), "-t", f"{DUR:.4f}", *vf,
       "-c:v", "libx264", "-crf", "18", "-pix_fmt", "yuv420p", a.out]
r = subprocess.run(enc, capture_output=True)
if r.returncode != 0:
    sys.exit("motion-gfx FFMPEG FAIL:\n" + r.stderr.decode()[-1500:])
if not os.path.exists(a.out) or os.path.getsize(a.out) < 2000:
    sys.exit(f"motion-gfx: empty output ({a.out})")
print(f"✓ {a.out}  ({a.type}, {DUR:.2f}s @ {a.fps}fps, {W * S}×{H * S})")
