#!/usr/bin/env python3
"""
thumb-gen v3 — playbook-driven thumbnails, tuned against Braun/Naam/Humphrey via
an independent CTR audit. v3 fixes: huge bottom-aligned head-and-shoulders face
(outline+shadow), 2x title with per-keyword color + double stroke + soft shadow,
a subtitle line so the NUMBER becomes the headline, vignette + head-glow
background (no flat fills), brighter/bigger hero card, arrow that lands on the card.

  python3 scripts/thumb-gen/generate.py --title "FAKE A DEPOSIT" --badge "+$2,312" \
      --face assets/nathaniel-head.png --face-side left --format tutorial --out out/x
"""
import argparse, json, math, os
from PIL import Image, ImageDraw, ImageFont, ImageColor, ImageFilter, ImageEnhance

W, H = 1280, 720
PLAYBOOK = "scripts/yt-research/output/_thumbs/playbook.json"
TITLE_FONT = "assets/fonts/Anton-Regular.ttf"
NUM_FONT = "assets/fonts/ArchivoBlack-Regular.ttf"
FALLBACK = ["/System/Library/Fonts/Supplemental/Impact.ttf"]

# Single source of truth: the video brand kit (thumb = hotter variants of the
# same hue family). Falls back to the prior hard-coded values if the file moves.
_BRAND_JSON = os.path.join(os.path.dirname(__file__), "..", "video-editor", "lib", "brand.json")
try:
    _B = json.load(open(_BRAND_JSON)); _T = _B["thumb"]
    GREEN, GOLD, ALERT, NAVY, DARK = _T["green"], _T["gold"], _T["alert"], _T["navy"], _T["dark"]
except Exception:
    GREEN, GOLD, ALERT, NAVY, DARK = "#22e06e", "#ffd21a", "#ff3b30", "#0a1730", "#0a0e16"
SYN = {"gold": GOLD, "yellow": GOLD, "green": GREEN, "money": GREEN, "red": ALERT, "navy": NAVY, "dark": DARK}
POWER = {"BEST", "FREE", "NEW", "ALL-TIME", "SECRET", "EASY", "FAST", "BIG", "MAX", "100K"}
PALETTES = {
    "listicle":   [("#39414F", "#0E1118"), ("#23304A", "#070B14"), ("#3A2030", "#100610")],
    "tier_list":  [("#39414F", "#0E1118"), ("#4A2030", "#120710"), ("#23304A", "#070B14")],
    "alert_news": [("#7A2D17", "#180905"), ("#1E4A2A", "#06150B"), ("#3A2A12", "#120C04")],
    "tutorial":   [("#1F4A4A", "#061212"), ("#39414F", "#0E1118"), ("#1E4A2A", "#06150B")],
    "comparison": [("#23304A", "#070B14"), ("#7A2D17", "#180905"), ("#39414F", "#0E1118")],
}
def palette(fmt, i): return PALETTES.get(fmt, PALETTES["listicle"])[i % 3]

def color(name, default="white"):
    raw = str(name or default).strip().lower(); raw = SYN.get(raw, raw)
    for tok in [raw, (raw.split()[-1] if raw.split() else raw), default]:
        try: return ImageColor.getrgb(tok)
        except Exception: continue
    return (255, 255, 255)

def font(path, size):
    for p in [path] + FALLBACK:
        if p and os.path.exists(p):
            try: return ImageFont.truetype(p, size)
            except Exception: pass
    return ImageFont.load_default()

def load_recipe(fmt):
    base = {"face_position": "left", "median_words": 4}
    if os.path.exists(PLAYBOOK):
        pb = json.load(open(PLAYBOOK)); n = pb.get("niche", pb); g = n.get("global", {})
        if g.get("top_face_position"): base["face_position"] = g["top_face_position"]
    return base

# ---------- background ----------
def _radial(sw, sh, focus, fall):
    img = Image.new("L", (sw, sh)); px = img.load()
    cx, cy = focus[0] * sw, focus[1] * sh
    maxd = ((max(cx, sw - cx)) ** 2 + (max(cy, sh - cy)) ** 2) ** 0.5
    for y in range(sh):
        for x in range(sw):
            px[x, y] = int(max(0.0, min(1.0, (((x - cx) ** 2 + (y - cy) ** 2) ** 0.5) / maxd)) ** fall * 255)
    return img

def background(center, edge, face_side):
    fx = 0.70 if face_side == "left" else 0.30
    m = _radial(160, 90, (fx, 0.42), 1.25).resize((W, H), Image.BILINEAR)
    bg = Image.composite(Image.new("RGB", (W, H), edge), Image.new("RGB", (W, H), center), m)
    bg = Image.blend(bg, Image.effect_noise((W, H), 18).convert("RGB"), 0.04).convert("RGBA")
    # head glow
    g = _radial(160, 90, (fx, 0.42), 1.0).resize((W, H), Image.BILINEAR).point(lambda v: int((255 - v) * 0.45))
    glow = Image.new("RGBA", (W, H), color(center) + (0,)); glow.putalpha(g); bg.alpha_composite(glow)
    # vignette
    vig = _radial(160, 90, (0.5, 0.5), 2.2).resize((W, H), Image.BILINEAR).point(lambda v: int(v * 0.55))
    dark = Image.new("RGBA", (W, H), (0, 0, 0, 255)); dark.putalpha(vig); bg.alpha_composite(dark)
    return bg

# ---------- depth ----------
def drop_shadow(elem, blur=24, off=(10, 16), op=160):
    sh = Image.new("RGBA", elem.size, (0, 0, 0, 0))
    sh.paste(Image.new("RGBA", elem.size, (0, 0, 0, op)), (0, 0), elem.split()[3])
    return sh.filter(ImageFilter.GaussianBlur(blur)), off

def white_outline(elem, w=14):
    big = elem.split()[3].filter(ImageFilter.MaxFilter(w if w % 2 else w + 1))
    sil = Image.new("RGBA", elem.size, (0, 0, 0, 0))
    sil.paste(Image.new("RGBA", elem.size, (255, 255, 255, 255)), (0, 0), big)
    return sil

def paste_subject(base, elem, pos, outline=14, shadow=True):
    if shadow:
        sh, off = drop_shadow(elem); base.alpha_composite(sh, (pos[0] + off[0], pos[1] + off[1]))
    if outline: base.alpha_composite(white_outline(elem, outline), pos)
    base.alpha_composite(elem, pos)

# ---------- elements ----------
def prep_face(path, target_frac):
    img = Image.open(path).convert("RGBA")
    if img.getextrema()[3][0] == 255:
        try:
            from rembg import remove; img = remove(img)
        except Exception: pass
    s = (H * target_frac) / img.height
    return img.resize((int(img.width * s), int(img.height * s)))

def place_cards(base, paths, side):
    cards = [Image.open(p).convert("RGBA") for p in paths if os.path.exists(p)][:3]
    if not cards: return None
    cx, cy = (int(W * 0.31) if side == "left" else int(W * 0.69)), int(H * 0.52)
    def bright(c): return ImageEnhance.Contrast(ImageEnhance.Brightness(c).enhance(1.12)).enhance(1.15)
    for i, c in enumerate(cards[1:3]):
        cw = int(W * 0.25); cc = bright(c).resize((cw, int(c.height * cw / c.width))).rotate((-1) ** i * 13, expand=True, resample=Image.BICUBIC)
        paste_subject(base, cc, (cx - cc.width // 2 + ((-1) ** i) * 80, cy - cc.height // 2 - 28), outline=0)
    hero = bright(cards[0]); hw = int(W * 0.37); hc = hero.resize((hw, int(hero.height * hw / hero.width))).rotate(-7, expand=True, resample=Image.BICUBIC)
    paste_subject(base, hc, (cx - hc.width // 2, cy - hc.height // 2), outline=0)
    return (cx, cy)

def red_arrow(base, start, end):
    layer = Image.new("RGBA", (W, H), (0, 0, 0, 0)); d = ImageDraw.Draw(layer)
    d.line([start, end], fill=(229, 29, 42), width=28)
    ang = math.atan2(end[1] - start[1], end[0] - start[0]); L = 50
    for a in (ang + 2.5, ang - 2.5):
        d.line([end, (end[0] - L * math.cos(a), end[1] - L * math.sin(a))], fill=(229, 29, 42), width=28)
    # black outline for legibility
    ol = layer.filter(ImageFilter.MaxFilter(9))
    base.alpha_composite(Image.composite(Image.new("RGBA", (W, H), (0, 0, 0, 255)), Image.new("RGBA", (W, H), (0, 0, 0, 0)), ol.split()[3]))
    base.alpha_composite(layer)

def is_accent(w):
    u = w.strip(",.!?").upper()
    return any(ch.isdigit() for ch in w) or "$" in w or "%" in w or u in POWER

def text_block(base, text, txt_color, accent, side, top_y, max_size, box_frac=0.72):
    words = text.upper().split()
    per = 3 if len(words) <= 3 else 2
    lines = [" ".join(words[i:i + per]) for i in range(0, len(words), per)]
    box = int(W * box_frac); size = max_size
    while size > 70:
        f = font(TITLE_FONT, size)
        if max(ImageDraw.Draw(base).textlength(ln, font=f) for ln in lines) <= box: break
        size -= 6
    f = font(TITLE_FONT, size); lh = int(size * 1.0); y = top_y
    for ln in lines:
        lw = ImageDraw.Draw(base).textlength(ln, font=f)
        x = 50 if side == "left" else W - lw - 50
        sh = Image.new("RGBA", (W, H), (0, 0, 0, 0))
        ImageDraw.Draw(sh).text((x, y), ln, font=f, fill=(0, 0, 0, 210))
        base.alpha_composite(sh.filter(ImageFilter.GaussianBlur(8)), (7, 9))
        cx = x
        for wd in ln.split(" "):
            fill = color(accent) if is_accent(wd) else color(txt_color)
            ImageDraw.Draw(base).text((cx, y), wd, font=f, fill=fill, stroke_width=12, stroke_fill=(0, 0, 0))
            cx += ImageDraw.Draw(base).textlength(wd + " ", font=f)
        y += lh
    return y

def draw_subtitle(base, text, side, y):
    if not text: return
    f = font(NUM_FONT, 58); d = ImageDraw.Draw(base)
    lw = d.textlength(text.upper(), font=f); x = 54 if side == "left" else W - lw - 54
    d.text((x, y + 6), text.upper(), font=f, fill=(255, 255, 255), stroke_width=7, stroke_fill=(0, 0, 0))

def draw_badge(base, text, fill):
    if not text: return
    cx, cy, r = W - 168, 158, 138
    layer = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    ImageDraw.Draw(layer).ellipse([cx - r, cy - r, cx + r, cy + r], fill=color(fill), outline=(255, 255, 255), width=11)
    sh, off = drop_shadow(layer, blur=16, off=(7, 9)); base.alpha_composite(sh, off); base.alpha_composite(layer)
    d = ImageDraw.Draw(base); size = 120
    while size > 30 and d.textlength(text, font=font(NUM_FONT, size)) > r * 1.7: size -= 4
    fnt = font(NUM_FONT, size); tw = d.textlength(text, font=fnt)
    d.text((cx - tw / 2, cy - size * 0.62), text, font=fnt, fill=(255, 255, 255), stroke_width=4, stroke_fill=(0, 0, 0))

def build(title, recipe, opts):
    c, e = opts["palette"]; face_side = opts["face_side"]; text_side = "left" if face_side == "right" else "right"
    img = background(color(c, "navy"), color(e, "dark"), face_side)
    has_cards = bool(opts.get("cards"))
    hero = place_cards(img, opts["cards"], text_side) if has_cards else None
    if opts.get("face") and os.path.exists(opts["face"]):
        face = prep_face(opts["face"], 0.80 if has_cards else 0.96)
        fx = W - face.width + 25 if face_side == "right" else -25
        paste_subject(img, face, (fx, H - face.height), outline=14)
    if has_cards:
        ty = text_block(img, title, opts["text_color"], opts["accent"], text_side, 34, 150, 0.62)
    else:
        words = len(title.split())
        ty = text_block(img, title, opts["text_color"], opts["accent"], text_side, int(H * 0.18), 210 if words <= 2 else 185, 0.72)
    draw_subtitle(img, opts.get("subtitle"), text_side, ty + 24)
    if opts.get("arrow") and hero:
        red_arrow(img, (hero[0], int(H * 0.93)), (hero[0], int(hero[1] + 20)))
    if opts.get("badge"): draw_badge(img, opts["badge"], opts["badge_color"])
    return img.convert("RGB")

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--title", required=True); ap.add_argument("--subtitle", default="")
    ap.add_argument("--format", default="listicle"); ap.add_argument("--cards", default=""); ap.add_argument("--badge", default="")
    ap.add_argument("--face", default="assets/nathaniel-head.png"); ap.add_argument("--face-side", dest="face_side", default=None, choices=["left", "right"])
    ap.add_argument("--arrow", action="store_true"); ap.add_argument("--variants", type=int, default=3); ap.add_argument("--out", default="out/thumb")
    a = ap.parse_args()
    recipe = load_recipe(a.format); os.makedirs(os.path.dirname(a.out) or ".", exist_ok=True)
    cards = [c for c in a.cards.split(",") if c.strip()]
    base_side = a.face_side or (recipe["face_position"] if recipe["face_position"] != "none" else "left")
    flip = "left" if base_side == "right" else "right"
    presets = [
        {"text_color": "white", "accent": GOLD, "badge_color": ALERT, "face_side": base_side, "pi": 0},
        {"text_color": "white", "accent": GREEN, "badge_color": ALERT, "face_side": base_side, "pi": 1},
        {"text_color": GOLD, "accent": "white", "badge_color": GREEN, "face_side": flip, "pi": 2},
    ][:max(1, a.variants)]
    for i, p in enumerate(presets, 1):
        opts = {**p, "cards": cards, "badge": a.badge, "subtitle": a.subtitle, "face": a.face, "arrow": a.arrow, "palette": palette(a.format, p["pi"])}
        build(a.title, recipe, opts).save(f"{a.out}_v{i}.png", "PNG")
        print(f"  ✓ {a.out}_v{i}.png")

if __name__ == "__main__":
    main()
