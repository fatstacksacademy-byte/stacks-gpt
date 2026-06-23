#!/usr/bin/env python3
"""
page-focus — on-screen "guide attention" device for offer-page / article b-roll. Two styles:

  --style focus      (default) softly blur+darken everything EXCEPT a region (feathered, no hard
                     box), with a slow sub-pixel push toward it. Proof-on-the-page look (Braun/Leo).
  --style highlight  page stays normal; an animated YELLOW HIGHLIGHTER sweeps left→right across the
                     target line(s) as you talk about them (multiply blend, like a real marker).

Both place an optional circle face-cam bottom-left (Ø330, emerald #0d7c5f ring + rotating comet),
and both work best with a TIGHT region from page-roi.py (OCR) so the box hugs the actual words.

  python3 scripts/video-editor/page-focus.py --image page.png --roi x,y,w,h --out focus.mp4
  python3 scripts/video-editor/page-focus.py --image doc.png --style highlight \
      --roi 1005,726,962,40 --lines "1411,726,664,40;1091,770,282,40" \
      --source "Doctor of Credit" --face face.mp4 --out hl.mp4

roi / lines forms (SOURCE-image pixels unless prefixed):
  x,y,w,h            absolute pixels
  auto:fx,fy,fw,fh   FRACTIONS of the source image (0..1)
  --lines "x,y,w,h;x,y,w,h"  per-line boxes (from page-roi.py) — drives the highlighter sweep
"""
import argparse, math, os, subprocess, sys, tempfile
from PIL import Image, ImageDraw, ImageFilter, ImageEnhance, ImageChops, ImageFont


def load_font(size):
    for p in ("/System/Library/Fonts/Supplemental/Arial Bold.ttf",
              "/System/Library/Fonts/Helvetica.ttc",
              "/System/Library/Fonts/SFNS.ttf",
              "/Library/Fonts/Arial.ttf"):
        if os.path.exists(p):
            try:
                return ImageFont.truetype(p, size)
            except Exception:
                pass
    return ImageFont.load_default()


# RENDER_SCALE (default 2 = native 4K 3840×2160). The page CONTENT is native 4K because the source
# screenshot is cropped+resized straight into the W×H frame (no 1080 downsample), and every absolute
# decoration constant below is scaled by s(). RENDER_SCALE=1 keeps the proven 1080 path.
S = max(1, int(os.environ.get("RENDER_SCALE", "2")))
W, H = 1920 * S, 1080 * S
def s(v): return int(round(v * S))   # scale an absolute-px constant into the render space
ap = argparse.ArgumentParser()
ap.add_argument("--image", required=True)
ap.add_argument("--roi", required=True, help="x,y,w,h (px) or auto:fx,fy,fw,fh (fractions)")
ap.add_argument("--out", required=True)
ap.add_argument("--style", choices=["focus", "highlight", "plain"], default="focus")
ap.add_argument("--lines", default="", help="highlight: per-line boxes 'x,y,w,h;...' (from page-roi.py)")
ap.add_argument("--dur", type=float, default=3.5)
ap.add_argument("--fps", type=int, default=30)
ap.add_argument("--accent", default="#f5c451", help="focus: soft focus-glow color")
ap.add_argument("--hl-color", default="#ffe11a", help="highlight: marker color")
ap.add_argument("--hl-opacity", type=float, default=0.82, help="highlight: marker translucency 0..1")
ap.add_argument("--sweep", type=float, default=0.0, help="highlight: marker stroke seconds (0=auto)")
ap.add_argument("--source", default="", help="optional attribution pill, e.g. 'Doctor of Credit'")
ap.add_argument("--face", default="", help="optional face video → circle PiP bottom-left")
ap.add_argument("--face-d", type=int, default=0, help="circle diameter in OUTPUT px (0=auto: 330×RENDER_SCALE, matches the uploaded video)")
ap.add_argument("--ring", default="#0d7c5f", help="emerald ring color (matches render-broll2)")
ap.add_argument("--zoom", type=float, default=-1.0, help="total eased push toward the ROI (-1=auto per style)")
ap.add_argument("--annotate", choices=["none", "circle", "arrow", "underline"], default="none",
                help="draw an animated attention annotation on the ROI (Leo: circles/arrows/underlines)")
ap.add_argument("--tint", choices=["none", "neg", "pos"], default="none",
                help="colour-connotation wash — neg=red (a downside), pos=green (a win)")
ap.add_argument("--eyeline", default="0.5,0.5",
                help="focus/highlight: screen position (fx,fy fractions) to place the ROI — match where his eyes "
                     "sit in the A-roll so the cut doesn't jump the viewer's gaze (Leo eye-line continuity)")
a = ap.parse_args()
EYE_X, EYE_Y = (max(0.18, min(0.82, float(v))) for v in (a.eyeline.split(",") + ["0.5", "0.5"])[:2])


def hex2rgb(h):
    h = h.lstrip("#"); return tuple(int(h[i:i + 2], 16) for i in (0, 2, 4))


def smooth(x):
    x = max(0.0, min(1.0, x)); return x * x * (3 - 2 * x)


img = Image.open(a.image).convert("RGB")


def parse_box(s):  # → [x,y,w,h] in source px
    if s.startswith("auto:"):
        fx, fy, fw, fh = (float(v) for v in s[5:].split(","))
        return [fx * img.width, fy * img.height, fw * img.width, fh * img.height]
    return [float(v) for v in s.split(",")]


roi_src = parse_box(a.roi)
lines_src = [parse_box(s) for s in a.lines.split(";") if s.strip()] or [roi_src]

# Frame the CONTENT (lines / ROI) into a 16:9 window so the words are large, centred and crisp
# (cropped from the NATIVE hi-res screenshot, then resized — no whole-page-shrunk-to-a-strip). The
# window zoom is capped so a tiny line isn't blown up to mush. Every box rides the SAME transform.
NW, NH = img.width, img.height
ux0 = min(b[0] for b in lines_src); uy0 = min(b[1] for b in lines_src)
ux1 = max(b[0] + b[2] for b in lines_src); uy1 = max(b[1] + b[3] for b in lines_src)
uw, uh = max(1.0, ux1 - ux0), max(1.0, uy1 - uy0)
ccx, ccy = ux0 + uw / 2, uy0 + uh / 2
if a.style == "plain":
    # "full hero": show the FULL width, anchored at the TOP of the region (so a tall page shows its
    # headline/hero, not the vertical-centre comments band). A pass a sub-roi to start lower.
    Wd = NW; Hd = Wd * H / W
    wx = 0.0; wy = max(0.0, min(max(0.0, NH - Hd), uy0))
else:
    fill = 0.66 if a.style == "focus" else 0.80   # target: content spans this much of the frame width
    Wd = uw / fill; Hd = Wd * H / W
    if uh > 0.46 * Hd:                            # tall (multi-line) content → widen so it fits w/ context
        Hd = uh / 0.46; Wd = Hd * W / H
    Wd = max(Wd, NW / 2.6)                        # cap zoom (don't over-enlarge a thin line)
    Wd = min(Wd, NW); Hd = Wd * H / W            # never exceed the page width
    wx = max(0.0, min(NW - Wd, ccx - Wd * EYE_X))   # place the ROI at the EYE_X/EYE_Y screen position
    wy = max(0.0, min(max(0.0, NH - Hd), ccy - Hd * EYE_Y))   # (default 0.5,0.5 = centred = prior behaviour)
crop = img.crop((int(wx), int(wy), int(wx + min(Wd, NW - wx)), int(wy + min(Hd, NH - wy))))
if crop.size != (round(Wd), round(Hd)):         # window taller than the page → pad to the window box
    pad = Image.new("RGB", (round(Wd), round(Hd)), (8, 12, 20)); pad.paste(crop, (0, 0)); crop = pad
img = crop.resize((W, H))
sxy = W / Wd                                    # native px → frame px (isotropic: W/Wd == H/Hd)


def place(b):  # native px → framed-frame px, clamped in-frame
    x = (b[0] - wx) * sxy; y = (b[1] - wy) * sxy; w = b[2] * sxy; h = b[3] * sxy
    x = max(0, min(W - 8, x)); y = max(0, min(H - 8, y))
    w = max(20, min(W - x, w)); h = max(14, min(H - y, h))
    return [int(x), int(y), int(w), int(h)]


rx, ry, rw, rh = place(roi_src)
lines_f = [place(b) for b in lines_src]
roi = (rx, ry, rx + rw, ry + rh)
cx, cy = rx + rw / 2, ry + rh / 2
base = img
zoom_amt = a.zoom if a.zoom >= 0 else {"focus": 0.05, "highlight": 0.03, "plain": 0.08}[a.style]  # plain = a Ken-Burns push on the hero

# ---- focus-style assets (mask + glow), computed only when needed ----
if a.style == "focus":
    darkblur = ImageEnhance.Brightness(base.filter(ImageFilter.GaussianBlur(s(16)))).enhance(0.38)
    accent = hex2rgb(a.accent)
    feather = int(min(s(28), max(s(8), min(rw, rh) * 0.30)))
    mask = Image.new("L", (W, H), 0)
    ImageDraw.Draw(mask).rounded_rectangle(roi, radius=s(22), fill=255)
    mask = mask.filter(ImageFilter.GaussianBlur(feather))
    ix = [roi[0] + feather, roi[1] + feather, roi[2] - feather, roi[3] - feather]
    if ix[2] > ix[0] and ix[3] > ix[1]:
        core = Image.new("L", (W, H), 0)
        ImageDraw.Draw(core).rounded_rectangle(ix, radius=max(2, s(22) - feather // 2), fill=255)
        mask = ImageChops.lighter(mask, core)
    glow = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    gpad = s(16)
    ImageDraw.Draw(glow).rounded_rectangle([roi[0] - gpad, roi[1] - gpad, roi[2] + gpad, roi[3] + gpad],
                                           radius=s(28), outline=accent + (255,), width=s(22))
    glow = glow.filter(ImageFilter.GaussianBlur(s(26)))
elif a.style == "highlight":
    # ---- highlight-style assets: a yellow "marker paper" (multiply) + the sweep mask ----
    tint = ImageChops.multiply(base, Image.new("RGB", (W, H), hex2rgb(a.hl_color)))
    total_w = sum(lw for (_, _, lw, _) in lines_f) or 1
    SWEEP = a.sweep if a.sweep > 0 else max(0.7, min(0.62 * a.dur, 0.6 * len(lines_f)))  # ~0.6s/line
    START = 0.18

    def stroke_mask(progress):
        m = Image.new("L", (W, H), 0); d = ImageDraw.Draw(m)
        rem = smooth(progress) * total_w        # eased budget spent left→right across the lines
        for (lx, ly, lw, lh) in lines_f:
            cw = max(0.0, min(lw, rem)); rem -= lw
            if cw > 1:
                vpad = max(s(3), int(lh * 0.16)); mh = lh + 2 * vpad
                d.rounded_rectangle([lx, ly - vpad, lx + cw, ly - vpad + mh], radius=mh / 2, fill=255)
            if rem <= 0:
                break
        return m

# optional source-attribution pill (for the article finder, #6)
srcpill = None
if a.source:
    txt = f"via {a.source}"
    font = load_font(s(26))
    tmp_d = ImageDraw.Draw(Image.new("RGBA", (8, 8)))
    l, t0, r, b = tmp_d.textbbox((0, 0), txt, font=font)
    tw, th = r - l, b - t0
    padx, pady = s(22), s(14)
    pw, ph = tw + 2 * padx, th + 2 * pady
    srcpill = Image.new("RGBA", (pw, ph), (0, 0, 0, 0)); ds = ImageDraw.Draw(srcpill)
    ds.rounded_rectangle([0, 0, pw - 1, ph - 1], radius=ph // 2, fill=(11, 18, 32, 225))
    ds.rounded_rectangle([0, 0, pw - 1, ph - 1], radius=ph // 2, outline=hex2rgb(a.ring) + (255,), width=max(1, s(2)))
    ds.text((padx - l, pady - t0), txt, fill=(236, 240, 246, 255), font=font)


def zoom_affine(im, z):
    """Sub-pixel zoom toward (cx,cy): show a W/z×H/z window, clamped fully in-frame."""
    ww, hh = W / z, H / z
    left = max(0.0, min(W - ww, cx - ww / 2)); topz = max(0.0, min(H - hh, cy - hh / 2))
    return im.transform((W, H), Image.AFFINE, (1 / z, 0, left, 0, 1 / z, topz), resample=Image.BICUBIC)


ANN_COL = hex2rgb(a.accent)
TINT = {"neg": (210, 45, 45), "pos": (70, 200, 95)}.get(a.tint)   # red = downside, green = win


def annotation(progress):
    """An animated circle / arrow / underline drawn ONTO the ROI (rides the zoom). Hand-drawn feel:
    it draws ON over ~0.6s (eased), then holds. ROI is (x0,y0,x1,y1) in framed-frame px."""
    ov = Image.new("RGBA", (W, H), (0, 0, 0, 0)); d = ImageDraw.Draw(ov)
    e = smooth(progress); col = ANN_COL + (255,)
    x0, y0, x1, y1 = roi
    if a.annotate == "underline":
        ly = min(H - 2, y1 + max(s(6), int(rh * 0.14))); w = max(s(6), int(rh * 0.10))
        d.line([(x0, ly), (x0 + (x1 - x0) * e, ly)], fill=col, width=w)
    elif a.annotate == "circle":
        pad = max(s(10), int(min(rw, rh) * 0.30))
        d.arc([x0 - pad, y0 - pad, x1 + pad, y1 + pad], -90, -90 + 360 * e,
              fill=col, width=max(s(6), int(min(rw, rh) * 0.07)))
    elif a.annotate == "arrow":
        tx, ty = x0, y0                                   # tip at the ROI's top-left corner
        sx, sy = max(0, x0 - s(240)), max(0, y0 - s(170)) # start up-and-left
        ex_, ey_ = sx + (tx - sx) * e, sy + (ty - sy) * e
        d.line([(sx, sy), (ex_, ey_)], fill=col, width=s(10))
        if e > 0.7:                                       # arrowhead lands once the shaft arrives
            d.polygon([(tx, ty), (tx + s(30), ty - s(4)), (tx - s(4), ty + s(30))], fill=col)
    return ov


tmp = tempfile.mkdtemp()
nf = max(1, int(round(a.dur * a.fps)))   # integer frame count drives BOTH seqs + -t (no frozen tail)
DUR = nf / a.fps
op = max(0.0, min(1.0, a.hl_opacity))
for f in range(nf):
    t = f / a.fps
    z = 1.0 + zoom_amt * smooth(min(1.0, t / DUR))   # slow continuous push toward the ROI
    if a.style == "highlight":
        prog = (t - START) / SWEEP if SWEEP > 0 else 1.0
        sm = stroke_mask(prog)
        if op < 1.0:
            sm = sm.point(lambda v: int(v * op))
        frame = Image.composite(tint, base, sm).convert("RGBA")  # marker only where the stroke has passed
    elif a.style == "plain":
        frame = base.convert("RGBA")                              # full hero, no blur/marker (just Ken-Burns + circle)
    else:
        blend = smooth(t / 0.5)                       # dim/blur eases in over 0.5s
        dim = Image.blend(base, darkblur, blend)
        frame = Image.composite(base, dim, mask).convert("RGBA")  # ROI sharp+bright, feathered
        g = glow.copy(); g.putalpha(g.getchannel("A").point(lambda v: int(v * 0.45 * blend)))
        frame = Image.alpha_composite(frame, g)
    if TINT is not None:                                          # colour-connotation wash (subtle)
        frame = Image.blend(frame.convert("RGB"), Image.new("RGB", (W, H), TINT), 0.16).convert("RGBA")
    if a.annotate != "none":                                      # animated circle/arrow/underline on the ROI
        frame = Image.alpha_composite(frame, annotation((t - 0.3) / 0.6))
    frame = zoom_affine(frame.convert("RGB"), z).convert("RGBA")  # push toward ROI (page only)
    if srcpill is not None:                                       # pill is a FIXED annotation — after zoom
        frame.alpha_composite(srcpill, (s(40), s(36)))
    frame.convert("RGB").save(os.path.join(tmp, f"{f:04d}.png"))


def make_ring(D, color, nf, fps):
    """Rotating-comet emerald ring as an RGBA PNG sequence (matches render-broll2's look)."""
    MARGIN, SS, N = s(36), 2, 90
    RC = D + 2 * MARGIN
    cs = RC * SS; ctr = cs / 2
    rc = hex2rgb(color)
    rmid = (D / 2) * SS                           # band sits right on the circle edge
    band = max(4, int(0.030 * D)) * SS
    bbox = [ctr - rmid, ctr - rmid, ctr + rmid, ctr + rmid]
    period = 2.0                                  # one comet revolution / 2s
    for f in range(nf):
        head = (f / fps) / period * 360.0
        layer = Image.new("RGBA", (cs, cs), (0, 0, 0, 0)); d = ImageDraw.Draw(layer)
        seg = 360.0 / N
        for i in range(N):
            th = i * seg
            dth = ((th - head + 180) % 360) - 180
            b = max(0.0, math.cos(math.radians(dth) / 2)) ** 6   # tight rotating highlight
            al = int(64 + 191 * b)
            d.arc(bbox, th - 0.6, th + seg + 0.6, fill=rc + (al,), width=band)
        layer = layer.filter(ImageFilter.GaussianBlur(SS * 2.4))  # glow
        layer = layer.resize((RC, RC), Image.LANCZOS)
        layer.save(os.path.join(tmp, f"ring_{f:04d}.png"))
    return RC, MARGIN


page_seq = os.path.join(tmp, "%04d.png")
if a.face and os.path.exists(a.face):
    D = a.face_d if a.face_d else s(330)         # circle Ø in output px (auto-scales with RENDER_SCALE)
    PADX, PADY = s(48), H - D - s(48)             # bottom-left, ~48px insets (matches render-broll2)
    # square-crop the face by its MIN dimension (portrait-safe — fixes the 0-byte bug)
    pr = subprocess.run(["ffprobe", "-v", "error", "-select_streams", "v:0",
                         "-show_entries", "stream=width,height", "-of", "csv=p=0", a.face],
                        capture_output=True, text=True).stdout.strip()
    try:
        fw, fh = (int(x) for x in pr.split(",")[:2])
    except ValueError:
        sys.exit(f"page-focus: could not probe face video dimensions ({a.face})")
    sq = min(fw, fh)
    ox = (fw - sq) // 2
    oy = (fh - sq) // 3 if fh > fw else (fh - sq) // 2   # portrait: bias up to the head
    m = Image.new("L", (D, D), 0); ImageDraw.Draw(m).ellipse([0, 0, D - 1, D - 1], fill=255)
    mask_png = os.path.join(tmp, "facemask.png"); m.save(mask_png)
    RC, MARGIN = make_ring(D, a.ring, nf, fps=a.fps)
    ring_x, ring_y = PADX - MARGIN, PADY - MARGIN
    fc = (f"[1:v]crop={sq}:{sq}:{ox}:{oy},scale={D}:{D},setsar=1[fsq];"
          f"[fsq][2:v]alphamerge[fcir];"
          f"[0:v][fcir]overlay={PADX}:{PADY}[bg];"
          f"[bg][3:v]overlay={ring_x}:{ring_y}[v]")
    enc = ["ffmpeg", "-y", "-framerate", str(a.fps), "-i", page_seq,
           "-i", a.face, "-loop", "1", "-i", mask_png,
           "-framerate", str(a.fps), "-i", os.path.join(tmp, "ring_%04d.png"),
           "-filter_complex", fc, "-map", "[v]", "-t", f"{DUR:.4f}",
           "-c:v", "libx264", "-crf", "18", "-pix_fmt", "yuv420p", a.out]
else:
    enc = ["ffmpeg", "-y", "-framerate", str(a.fps), "-i", page_seq, "-t", f"{DUR:.4f}",
           "-c:v", "libx264", "-crf", "18", "-pix_fmt", "yuv420p", a.out]

r = subprocess.run(enc, capture_output=True)
if r.returncode != 0:
    sys.exit("page-focus FFMPEG FAIL:\n" + " ".join(map(str, enc)) + "\n" + r.stderr.decode()[-2000:])
if not os.path.exists(a.out) or os.path.getsize(a.out) < 2000:
    sys.exit(f"page-focus: output is empty/tiny ({a.out}) — ffmpeg wrote nothing usable")
print(f"✓ {a.out}  ({a.style} roi={rx},{ry},{rw},{rh}, {len(lines_f)} line(s)"
      f"{', +face circle' if a.face else ''}{', src=' + a.source if a.source else ''})")
