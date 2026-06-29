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

===============================================================================
FACE-COVER GUARDRAIL  (--face-cover mode — opt-in, additive, ZERO TOKENS)
===============================================================================
"Never cover his face" used to be advice in MEMORY.md, not a check. The rest of
this pipeline already MEASURES exactly where the face is (build/vision-roi), and
build-broll.py already knows where every overlay/graphic will land. So the rule
is checkable pure geometry: for each planned overlay rect, how much of the FACE
box does it sit on top of? Flag anything over a threshold; optionally hand back a
corrected rect that clears the face.

  python3 scripts/video-editor/roi-verify.py --face-cover \
      --video build/stacksos-demo/raw.mp4 --at 12 \
      --overlays '[[1500,40,360,360],[60,60,900,160]]' \
      --enforce --out-json face-cover.json

The face box comes from ONE of (checked in this order):
  • --face X,Y,W,H              an explicit face ROI in source top-left px
  • --frame IMG                 a still → sampled through build/vision-roi
  • --video V [--at SECONDS]    a frame extracted with ffmpeg → vision-roi
  • --rois rois.json            the first measured kind=face src_roi in that file

The overlay rects come from ONE of:
  • --overlays JSON             a list of [x,y,w,h] (or [{"x","y","w","h"}] /
                                [{"box":[x,y,w,h],"name":...}]) — inline or @file
  • --plan-json broll-plan.json the per-segment overlay rects this pipeline plans
                                (the circle face-cam Ø + insets page-focus uses, or
                                a per-segment "box":[x,y,w,h] override)

For each overlay we compute COVERAGE = (area overlapping the face) / (face area)
and FLAG it when coverage > --max-face-cover (default 0.08 = 8% of the face).

  --enforce  →  for every offender, derive a CORRECTED rect:
     1) SHRINK toward the overlay's far edge (the edge away from the face
        centroid), pulling the near edge off the face;
     2) if shrinking alone can't clear it (or would shrink it away), NUDGE the
        whole rect to the nearest in-frame position that drops coverage under the
        threshold. Output corrected rects as JSON + a human report.

Exit (face-cover mode): 0 = no overlay covers the face past threshold; 4 = one or
more do (even after --enforce, the report still lists them so a human can review).
"""
import argparse, json, math, os, subprocess, sys, tempfile
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


# =============================================================================
# FACE-COVER GUARDRAIL — pure-geometry "don't cover his face" check + auto-fix.
# Everything below is self-contained and is reached ONLY via --face-cover, so the
# plan/contact-sheet flow above is untouched (and byte-identical when off).
# =============================================================================

FACE_COVER_MAX = 0.08          # default: an overlay may sit on <=8% of the face area
HERE = os.path.dirname(os.path.abspath(__file__))
VISION_BIN = os.path.join(HERE, "build", "vision-roi")


def coverage_of_face(box, face):
    """Fraction of the FACE box's area that `box` overlaps (0..1).

    We intentionally divide by FACE area, not overlap-area / box-area: a small
    chip dead-centre on the face is the cardinal sin even though it covers little
    of its OWN area, while a huge full-screen graphic that only clips the chin is
    less of a problem per face-pixel. This is the "% of his face you hid" metric.
    """
    fa = rect_area(face)
    if fa <= 0:
        return 0.0
    inter = intersect(box, face)
    return (rect_area(inter) / fa) if inter else 0.0


def _sample_face_via_vision(frame_img):
    """Run build/vision-roi on a still and return the face src_roi [x,y,w,h] (or None)."""
    if not os.path.exists(VISION_BIN):
        sys.exit(f"roi-verify: vision binary not built at {VISION_BIN}\n"
                 f"  build it: xcrun swiftc -O {os.path.join(HERE,'vision-roi.swift')} -o {VISION_BIN}")
    r = subprocess.run([VISION_BIN, frame_img], capture_output=True, text=True)
    if r.returncode != 0:
        sys.exit(f"roi-verify: vision-roi failed on {frame_img}:\n{r.stderr[-800:]}")
    try:
        vj = json.loads(r.stdout.strip())
    except json.JSONDecodeError:
        sys.exit(f"roi-verify: vision-roi gave non-JSON:\n{r.stdout[-800:]}")
    f = vj.get("face")
    if not f:
        return None, (vj.get("w"), vj.get("h"))
    roi = [f["cx"] - f["w"] // 2, f["cy"] - f["h"] // 2, f["w"], f["h"]]
    return roi, (vj.get("w"), vj.get("h"))


def resolve_face_box(a):
    """Resolve the face ROI + frame size (W,H) from the CLI, in priority order:
    --face  >  --frame  >  --video[/--at]  >  --rois (first kind=face). Returns
    (face_roi[x,y,w,h], (W,H)). Exits with a clear message if nothing resolves."""
    # 1) explicit ROI — caller already measured the face
    if a.face:
        try:
            roi = [int(round(float(v))) for v in a.face.split(",")]
            assert len(roi) == 4
        except Exception:
            sys.exit(f"roi-verify: --face must be 'x,y,w,h' (got {a.face!r})")
        W, H = a.frame_w, a.frame_h         # may be 0 → unknown; in-frame clamp falls back below
        if a.frame and os.path.exists(a.frame):
            with Image.open(a.frame) as im:
                W, H = im.size
        return roi, (W or 0, H or 0)

    # 2) a still image → vision
    if a.frame:
        if not os.path.exists(a.frame):
            sys.exit(f"roi-verify: --frame not found: {a.frame}")
        roi, (W, H) = _sample_face_via_vision(a.frame)
        if roi is None:
            sys.exit(f"roi-verify: no face detected in {a.frame}")
        return roi, (W or 0, H or 0)

    # 3) a video → extract one frame with ffmpeg → vision
    if a.video:
        if not os.path.exists(a.video):
            sys.exit(f"roi-verify: --video not found: {a.video}")
        tmp = tempfile.mkdtemp(prefix="facecover_")
        frame_img = os.path.join(tmp, "frame.png")
        r = subprocess.run(["ffmpeg", "-y", "-hide_banner", "-loglevel", "error",
                            "-ss", f"{float(a.at):.3f}", "-i", a.video, "-frames:v", "1", frame_img],
                           capture_output=True)
        if r.returncode != 0 or not os.path.exists(frame_img):
            sys.exit("roi-verify: ffmpeg failed to extract a frame:\n"
                     + r.stderr.decode("utf-8", "replace")[-800:])
        roi, (W, H) = _sample_face_via_vision(frame_img)
        if roi is None:
            sys.exit(f"roi-verify: no face detected in {a.video} at t={a.at}s")
        return roi, (W or 0, H or 0)

    # 4) a measured rois.json — reuse the first kind=face src_roi
    if a.rois:
        if not os.path.exists(a.rois):
            sys.exit(f"roi-verify: --rois not found: {a.rois}")
        data = json.load(open(a.rois))
        recs = data["rois"] if isinstance(data, dict) else data
        for r in recs:
            if r.get("kind") == "face" and r.get("src_roi"):
                W = r.get("img_w") or 0
                H = r.get("img_h") or 0
                return list(r["src_roi"]), (W, H)
        sys.exit(f"roi-verify: no measured kind=face src_roi in {a.rois}")

    sys.exit("roi-verify: --face-cover needs a face source "
             "(--face x,y,w,h | --frame img | --video v [--at s] | --rois rois.json)")


def _norm_rect(o, i):
    """Coerce one overlay entry into ([x,y,w,h], name). Accepts:
       [x,y,w,h]  ·  {"x","y","w","h"}  ·  {"box":[x,y,w,h], "name":...}"""
    name = None
    if isinstance(o, dict):
        name = o.get("name") or o.get("id")
        if "box" in o:
            rect = o["box"]
        elif all(k in o for k in ("x", "y", "w", "h")):
            rect = [o["x"], o["y"], o["w"], o["h"]]
        else:
            sys.exit(f"roi-verify: overlay {i} dict needs box[] or x/y/w/h (got keys {list(o)})")
    else:
        rect = o
    try:
        rect = [int(round(float(v))) for v in rect]
        assert len(rect) == 4
    except Exception:
        sys.exit(f"roi-verify: overlay {i} is not [x,y,w,h] (got {o!r})")
    return rect, (name or f"overlay-{i}")


def _read_json_arg(spec):
    """Inline JSON or @path."""
    if spec.startswith("@"):
        return json.load(open(os.path.expanduser(spec[1:])))
    return json.loads(spec)


def collect_overlays(a, W, H):
    """Resolve the overlay rects that composite OVER the talking-head face, from
    --overlays (inline/@file) or --plan-json.

    NB on --plan-json: we deliberately do NOT auto-derive the bottom-left circle
    face-cam. In a b-roll segment (plain/focus/highlight/split) the face is *relocated*
    into that PiP — it is no longer at its A-roll ROI — so checking the circle rect
    against the measured A-roll face is comparing two different layers (and the circle
    is placed away from centre by design). The guardrail's real job is graphics that
    overlay the talking head: explicit per-segment "box":[x,y,w,h] graphics. For
    callouts/lower-thirds/title banners over a full-frame face, pass their rects via
    --overlays against a sampled talking-head frame."""
    if a.overlays:
        raw = _read_json_arg(a.overlays)
        if not isinstance(raw, list):
            sys.exit("roi-verify: --overlays must be a JSON list of rects")
        return [_norm_rect(o, i) for i, o in enumerate(raw)]

    if a.plan_json:
        if not os.path.exists(a.plan_json):
            sys.exit(f"roi-verify: --plan-json not found: {a.plan_json}")
        plan = json.load(open(a.plan_json))
        out = []
        for i, s in enumerate(plan.get("segments", [])):
            if isinstance(s.get("box"), list):           # a graphic that overlays the face
                name = s.get("layout", "seg") + f"@{s.get('start','?')}s"
                out.append(_norm_rect({"box": s["box"], "name": name}, i))
        if not out:
            sys.exit("roi-verify: --plan-json had no explicit overlay 'box' graphics to check.\n"
                     "  (The circle face-cam isn't auto-checked — it's a PiP in its own layer, placed clear of\n"
                     "   the face by design. Pass graphics that overlay the talking head via --overlays, or add\n"
                     "   a per-segment \"box\":[x,y,w,h] to the plan.)")
        return out

    sys.exit("roi-verify: --face-cover needs overlays (--overlays JSON|@file or --plan-json plan)")


def _clamp_in_frame(rect, W, H):
    """Shift a rect minimally so it sits fully inside WxH (no-op if W/H unknown=0)."""
    x, y, w, h = rect
    if W and w <= W:
        x = max(0, min(x, W - w))
    if H and h <= H:
        y = max(0, min(y, H - h))
    return [x, y, w, h]


def enforce_clear(rect, face, W, H, thresh):
    """Return a CORRECTED rect whose face-coverage is <= thresh and which stays in
    frame, or None if geometry can't satisfy it (caller reports it as un-fixable).

    Strategy (cheap, deterministic, in this order):
      1) SHRINK toward the overlay's far edge: the face centroid tells us which of
         the overlay's edges is the offending (near) one; pull that edge off the
         face, keeping the far edge anchored. Try this on the dominant axis first,
         then the other, then both.
      2) NUDGE the whole rect along the dominant-overlap axis to the nearest fully
         in-frame position clear of the face (push it to whichever side has room).
    A move is only accepted if it drops coverage to <= thresh AND stays in frame."""
    fx, fy, fw, fh = face
    fcx, fcy = fx + fw / 2, fy + fh / 2
    ox, oy, ow, oh = rect
    orig_area = rect_area(rect)
    MIN_KEEP = 0.25      # a shrink must leave >=25% of the original area — never offer a
                         # degenerate sliver (a 2px-tall band technically clears the face but
                         # is useless); when shrinking can't keep that, a NUDGE wins instead.

    def ok(r):
        if r[2] <= 1 or r[3] <= 1:
            return False
        if rect_area(r) < MIN_KEEP * orig_area:     # reject degenerate / over-shrunk rects
            return False
        if W and (r[0] < 0 or r[0] + r[2] > W):
            return False
        if H and (r[1] < 0 or r[1] + r[3] > H):
            return False
        return coverage_of_face(r, face) <= thresh

    candidates = []

    # ---- 1) shrink toward the far edge on each axis (and both) ----
    # X: if the overlay centre is left of the face centre, the face is to our RIGHT
    #    → keep our LEFT edge, pull the RIGHT edge in to just left of the face.
    ocx = ox + ow / 2
    sx = None
    if ocx <= fcx:                                  # face on overlay's right → trim right edge
        new_w = max(2, int(fx) - ox - 1)
        sx = [ox, oy, new_w, oh]
    else:                                           # face on overlay's left → trim left edge
        new_x = int(fx + fw) + 1
        sx = [new_x, oy, ox + ow - new_x, oh]
    # Y: same logic vertically.
    ocy = oy + oh / 2
    if ocy <= fcy:                                  # face below → trim bottom edge
        new_h = max(2, int(fy) - oy - 1)
        sy = [ox, oy, ow, new_h]
    else:                                           # face above → trim top edge
        new_y = int(fy + fh) + 1
        sy = [ox, new_y, ow, oy + oh - new_y]

    candidates.append(sx)
    candidates.append(sy)
    # both axes shrunk together (corner case: overlay straddles the face on both)
    candidates.append([sx[0], sy[1], sx[2], sy[3]])

    # ---- 2) nudge the whole rect clear, nearest side with room ----
    # horizontal nudges
    candidates.append(_clamp_in_frame([int(fx + fw) + 1, oy, ow, oh], W, H))   # to face's right
    candidates.append(_clamp_in_frame([int(fx) - ow - 1, oy, ow, oh], W, H))   # to face's left
    candidates.append(_clamp_in_frame([ox, int(fy + fh) + 1, ow, oh], W, H))   # below face
    candidates.append(_clamp_in_frame([ox, int(fy) - oh - 1, ow, oh], W, H))   # above face

    # pick the valid candidate that MOVES/SHRINKS the least (closest to intent)
    def cost(r):
        # change in position + change in area, both normalised — small = closest to original
        dpos = abs(r[0] - ox) + abs(r[1] - oy)
        darea = abs(rect_area(r) - rect_area(rect))
        return dpos + darea / max(1, max(ow, oh))

    valid = [r for r in candidates if ok(r)]
    if not valid:
        return None
    return min(valid, key=cost)


def check_face_cover(face, fsize, overlays, thresh, enforce):
    """Core: score every overlay's coverage of the face, flag offenders, optionally
    compute a corrected rect. Returns (results[list], n_flagged)."""
    W, H = fsize
    results, n_flagged = [], 0
    for rect, name in overlays:
        cov = coverage_of_face(rect, face)
        flagged = cov > thresh
        rec = {"name": name, "rect": rect, "coverage": round(cov, 4),
               "covers_pct": round(cov * 100, 2), "flagged": flagged}
        if flagged:
            n_flagged += 1
            if enforce:
                fixed = enforce_clear(rect, face, W, H, thresh)
                if fixed is not None:
                    rec["corrected"] = fixed
                    rec["corrected_coverage"] = round(coverage_of_face(fixed, face), 4)
                    rec["corrected_covers_pct"] = round(coverage_of_face(fixed, face) * 100, 2)
                    rec["corrected_in_frame"] = (
                        (not W or 0 <= fixed[0] and fixed[0] + fixed[2] <= W) and
                        (not H or 0 <= fixed[1] and fixed[1] + fixed[3] <= H))
                else:
                    rec["corrected"] = None
                    rec["correction_note"] = "no in-frame rect clears the face under threshold"
        results.append(rec)
    return results, n_flagged


def run_face_cover(a):
    """The --face-cover CLI mode. Pure geometry; zero tokens."""
    thresh = a.max_face_cover
    face, fsize = resolve_face_box(a)
    overlays = collect_overlays(a, fsize[0], fsize[1])
    results, n_flagged = check_face_cover(face, fsize, overlays, thresh, a.enforce)

    W, H = fsize
    print(f"face ROI {face}  frame {W}x{H}  threshold {thresh*100:.0f}% of face area"
          f"{'  [--enforce]' if a.enforce else ''}\n")
    for r in results:
        tag = "FLAG" if r["flagged"] else "ok  "
        line = f"[{tag}] {r['name']:>20}  rect={r['rect']}  covers {r['covers_pct']:.2f}% of face"
        if r["flagged"] and a.enforce:
            c = r.get("corrected")
            if c is not None:
                line += (f"  →  corrected {c}  ({r['corrected_covers_pct']:.2f}%"
                         + (", in-frame" if r.get("corrected_in_frame") else ", OUT-OF-FRAME") + ")")
            else:
                line += "  →  UN-FIXABLE: " + r.get("correction_note", "")
        print(line)

    out = {"face": face, "frame": {"w": W, "h": H}, "threshold": thresh,
           "enforce": bool(a.enforce), "overlays": results,
           "flagged": n_flagged, "total": len(results)}
    if a.out_json:
        os.makedirs(os.path.dirname(os.path.abspath(a.out_json)) or ".", exist_ok=True)
        json.dump(out, open(a.out_json, "w"), indent=2)
        print(f"\ncorrections JSON -> {a.out_json}")

    if n_flagged:
        # Even with --enforce we still exit nonzero so a human reviews the move; the
        # corrected rects are in the JSON to apply once approved.
        unfixed = sum(1 for r in results if r["flagged"] and a.enforce and r.get("corrected") is None)
        print(f"\nFAIL: {n_flagged} overlay(s) cover the face past {thresh*100:.0f}%"
              + (f" ({n_flagged - unfixed} auto-corrected, {unfixed} un-fixable)" if a.enforce else ""))
        sys.exit(4)
    print("\nPASS: no overlay covers the face past threshold")
    sys.exit(0)


def main():
    # --face-cover routes to the geometry guardrail WITHOUT touching the plan flow.
    # We sniff argv for it first so --plan can stay required for the original mode.
    if "--face-cover" in sys.argv:
        fp = argparse.ArgumentParser(
            description="Guardrail: flag/auto-fix overlays that cover the measured face (pure geometry).")
        fp.add_argument("--face-cover", action="store_true", help="run the face-cover guardrail mode")
        fp.add_argument("--face", help="explicit face ROI 'x,y,w,h' in source px (skips vision)")
        fp.add_argument("--frame", help="a still image → sampled through build/vision-roi")
        fp.add_argument("--video", help="a video → one frame extracted (ffmpeg) → vision")
        fp.add_argument("--at", type=float, default=5.0, help="--video timestamp in seconds (default 5)")
        fp.add_argument("--rois", help="measured rois.json → first kind=face src_roi")
        fp.add_argument("--frame-w", type=int, default=0, help="frame width when only --face is given")
        fp.add_argument("--frame-h", type=int, default=0, help="frame height when only --face is given")
        fp.add_argument("--overlays", help="overlay rects JSON list (inline or @file): [x,y,w,h] each")
        fp.add_argument("--plan-json", help="broll-plan.json → per-segment overlay rects")
        fp.add_argument("--max-face-cover", type=float, default=FACE_COVER_MAX,
                        help=f"max fraction of FACE area an overlay may cover (default {FACE_COVER_MAX})")
        fp.add_argument("--enforce", action="store_true",
                        help="emit a corrected rect for each offender (shrink toward far edge, then nudge clear)")
        fp.add_argument("--out-json", help="write the full result (incl. corrected rects) to JSON")
        a = fp.parse_args()
        return run_face_cover(a)

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
