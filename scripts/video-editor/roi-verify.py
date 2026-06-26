#!/usr/bin/env python3
"""
roi-verify — prove the PLANNED boxes (crops, title cards, lower-thirds) actually land on the
MEASURED target before you render. (FIX #7: face cropped off-center, titles dropped onto his
body, "$400" cut off — because boxes were never checked against where the subject really is.)

It draws every planned box on its source frame with PIL, tiles a contact sheet PNG, and FLAGS:
  • box-outside-frame      — a planned box pokes past the image edge (-> a cut-off element)
  • target-<40%-of-box     — the measured target (face/body/text) fills <40% of the planned
                             box (mostly dead space; box is too big / mis-centered)
  • face-headroom->15%     — empty space ABOVE the head is >15% of the box height (missing zoom)
  • title-overlaps-face    — a title/lower-third box intersects the measured face ROI

INPUT — a plan JSON (you author this; it is the editor's INTENT) referencing a rois.json from
measure-rois.py for the measured ground truth:

  {
    "rois": "build/biz-20apy/rois.json",      # measured ROIs (provides frames + measured boxes)
    "boxes": [
      {"name":"host-crop", "frame":"host_face_5", "role":"crop",  "box":[684,180,560,720],
       "target":"host_face_5"},                #  -> framing box, target = a measured face ROI
      {"name":"title",     "frame":"host_face_5", "role":"title", "box":[60,60,900,160]},
      {"name":"offer-zoom","frame":"offer_text_18","role":"crop", "box":[...], "target":"offer_text_18"}
    ]
  }

  • frame  : a measurement `name`+`kind` joined as name_kind (matches rois.json record), OR a
             literal image path. role: crop|title|lower-third|graphic. target: a rois.json
             record key whose measured src_roi is the thing the box should contain.
  • A box with role in {title,lower-third} is auto-checked for overlap against ANY measured
    face on the same frame.

Usage:
  python3 scripts/video-editor/roi-verify.py --plan plan.json \
      --out build/biz-20apy/roi-contact.png

Deps: stdlib + PIL.  Exit: 0 = all clear, 4 = one or more flags raised.
"""
import argparse, json, math, os, sys
from PIL import Image, ImageDraw, ImageFont

HEADROOM_MAX = 0.15     # >15% empty above head = missing zoom
FILL_MIN     = 0.40     # target must fill >=40% of its framing box

C_BOX   = (90, 200, 255)     # planned box (blue)
C_TGT   = (60, 230, 120)     # measured target (green)
C_FACE  = (255, 210, 0)      # measured face (yellow)
C_FLAG  = (255, 60, 60)      # flagged box (red)
C_TXT   = (255, 255, 255)


def font(sz):
    for p in ("/System/Library/Fonts/Supplemental/Arial Bold.ttf",
              "/System/Library/Fonts/Helvetica.ttc"):
        if os.path.exists(p):
            try:
                return ImageFont.truetype(p, sz)
            except Exception:
                pass
    return ImageFont.load_default()


def rect_area(b):
    return max(0, b[2]) * max(0, b[3])


def intersect(a, b):
    x0 = max(a[0], b[0]); y0 = max(a[1], b[1])
    x1 = min(a[0] + a[2], b[0] + b[2]); y1 = min(a[1] + a[3], b[1] + b[3])
    if x1 <= x0 or y1 <= y0:
        return None
    return [x0, y0, x1 - x0, y1 - y0]


def load_rois(rois_path):
    data = json.load(open(rois_path))
    recs = data["rois"] if isinstance(data, dict) else data
    by_key = {}
    by_frame_faces = {}      # frame image path -> list of face src_roi
    for r in recs:
        key = f"{r['name']}_{r['kind']}"
        # register under the bare key (last write wins) AND a time-disambiguated key so a plan
        # can target a specific timestamp when name+kind repeats (e.g. host_face@5 vs host_face@30)
        t = r.get("frame_t")
        if t is not None:
            tkey = "%s@%g" % (key, t)
            by_key.setdefault(tkey, r)
        by_key[key] = r
        if r.get("kind") == "face" and r.get("src_roi"):
            by_frame_faces.setdefault(r.get("frame"), []).append(r["src_roi"])
    return by_key, by_frame_faces, data


def resolve_frame_image(spec, by_key):
    """spec may be a measurement key (name_kind) or a literal path."""
    if spec in by_key and by_key[spec].get("frame"):
        return by_key[spec]["frame"]
    if os.path.exists(spec):
        return spec
    # try any measurement record whose frame basename matches
    for r in by_key.values():
        fr = r.get("frame", "")
        if fr and (os.path.splitext(os.path.basename(fr))[0] == spec):
            return fr
    return None


def check_box(b, by_key, by_frame_faces):
    """Return (flags[list], measured_target_box_or_None, faces_on_frame[list])."""
    flags = []
    box = b["box"]
    frame_img = resolve_frame_image(b["frame"], by_key)
    if frame_img is None or not os.path.exists(frame_img):
        flags.append("frame-image-missing")
        return flags, None, [], None
    with Image.open(frame_img) as im:
        W, H = im.size

    # 1) box-outside-frame
    if box[0] < 0 or box[1] < 0 or box[0] + box[2] > W or box[1] + box[3] > H:
        flags.append("box-outside-frame")

    # measured target inside this box
    tgt = None
    if b.get("target"):
        tr = by_key.get(b["target"])
        if tr and tr.get("src_roi"):
            tgt = tr["src_roi"]

    if tgt is not None:
        inter = intersect(box, tgt)
        inter_area = rect_area(inter) if inter else 0
        # 2) target fills <40% of the planned box
        if rect_area(box) > 0 and (inter_area / rect_area(box)) < FILL_MIN:
            flags.append("target-<40%-of-box")
        # 3) headroom: only meaningful when the target is a face inside a crop box
        tr = by_key.get(b["target"], {})
        if tr.get("kind") == "face" and b.get("role", "crop") == "crop":
            head_gap = tgt[1] - box[1]                 # px from box top to face top
            if box[3] > 0 and (head_gap / box[3]) > HEADROOM_MAX:
                flags.append("face-headroom->15%")

    faces = by_frame_faces.get(frame_img, [])
    # 4) title / lower-third overlapping a measured face
    if b.get("role") in ("title", "lower-third"):
        for fb in faces:
            if intersect(box, fb):
                flags.append("title-overlaps-face")
                break

    return flags, tgt, faces, frame_img


def render_panel(frame_img, box, tgt, faces, flags, name, role):
    im = Image.open(frame_img).convert("RGB")
    dr = ImageDraw.Draw(im, "RGBA")
    W, H = im.size
    fnt = font(max(20, W // 50))

    # measured faces (yellow)
    for fb in faces:
        dr.rectangle([fb[0], fb[1], fb[0] + fb[2], fb[1] + fb[3]], outline=C_FACE, width=4)
    # measured target (green)
    if tgt is not None:
        dr.rectangle([tgt[0], tgt[1], tgt[0] + tgt[2], tgt[1] + tgt[3]], outline=C_TGT, width=4)
    # planned box (blue, or red if flagged)
    col = C_FLAG if flags else C_BOX
    dr.rectangle([box[0], box[1], box[0] + box[2], box[1] + box[3]], outline=col, width=8)

    # label header band
    band_h = int(H * 0.10)
    dr.rectangle([0, 0, W, band_h], fill=(0, 0, 0, 170))
    head = f"{name}  [{role}]"
    dr.text((14, 8), head, fill=C_TXT, font=fnt)
    sub = "  ".join(flags) if flags else "OK"
    dr.text((14, 8 + band_h // 2), sub, fill=(C_FLAG if flags else C_TGT), font=fnt)
    return im


def main():
    ap = argparse.ArgumentParser(description="Verify planned boxes against measured ROIs; tile a contact sheet.")
    ap.add_argument("--plan", required=True, help="plan JSON with {rois, boxes:[...]}")
    ap.add_argument("--out", default="roi-contact.png")
    ap.add_argument("--cols", type=int, default=2)
    ap.add_argument("--cell-w", type=int, default=900, help="panel width in the contact sheet")
    a = ap.parse_args()

    plan = json.load(open(a.plan))
    rois_path = plan.get("rois")
    # resolve relative rois paths against the plan's directory BEFORE checking existence
    if rois_path and not os.path.isabs(rois_path):
        rois_path = os.path.join(os.path.dirname(os.path.abspath(a.plan)), rois_path)
    if not rois_path or not os.path.exists(rois_path):
        sys.exit(f"roi-verify: plan.rois not found: {rois_path}")
    by_key, by_frame_faces, _ = load_rois(rois_path)

    boxes = plan.get("boxes", [])
    if not boxes:
        sys.exit("roi-verify: plan has no boxes")

    panels, total_flags, report = [], 0, []
    for b in boxes:
        flags, tgt, faces, frame_img = check_box(b, by_key, by_frame_faces)
        total_flags += len(flags)
        report.append((b.get("name", "?"), b.get("role", "?"), flags))
        if frame_img:
            panels.append(render_panel(frame_img, b["box"], tgt, faces, flags,
                                       b.get("name", "?"), b.get("role", "crop")))
        else:
            ph = Image.new("RGB", (1920, 1080), (40, 0, 0))
            d = ImageDraw.Draw(ph)
            d.text((40, 40), f"{b.get('name','?')}: {' '.join(flags)}", fill=C_FLAG, font=font(48))
            panels.append(ph)
        tag = "FAIL" if flags else "ok  "
        print(f"[{tag}] {b.get('name','?'):>14} [{b.get('role','?')}] -> {flags or 'clear'}")

    # tile contact sheet
    cols = max(1, a.cols)
    rows = math.ceil(len(panels) / cols)
    cw = a.cell_w
    # uniform cell height from the tallest scaled panel
    scaled = []
    for p in panels:
        s = cw / p.width
        scaled.append(p.resize((cw, int(p.height * s))))
    ch = max(p.height for p in scaled)
    pad = 12
    sheet = Image.new("RGB", (cols * cw + (cols + 1) * pad, rows * ch + (rows + 1) * pad), (18, 18, 18))
    for i, p in enumerate(scaled):
        r, c = divmod(i, cols)
        sheet.paste(p, (pad + c * (cw + pad), pad + r * (ch + pad)))
    os.makedirs(os.path.dirname(os.path.abspath(a.out)) or ".", exist_ok=True)
    sheet.save(a.out)

    print(f"\ncontact sheet -> {a.out}  ({sheet.width}x{sheet.height}, {len(panels)} panel(s))")
    if total_flags:
        print(f"FAIL: {total_flags} flag(s) across {sum(1 for _,_,f in report if f)} box(es)")
        sys.exit(4)
    print("PASS: all planned boxes land on their measured targets")
    sys.exit(0)


if __name__ == "__main__":
    main()
