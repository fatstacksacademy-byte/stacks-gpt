#!/usr/bin/env python3.14
"""assert-clean-source.py — SOURCE-ASSET CLEAN GATE for the video pipeline.

A QC gate for the still PNG/JPG screenshots we composite into videos (e.g. the
Chase "$400" offer page). It catches two classes of defect that have repeatedly
slipped into renders:

  (1) CONSENT BANNER  — a cookie / privacy / "accept all" overlay still on the
      page when the screenshot was taken. Detected two ways:
        a. OCR (tesseract): the page text is matched, case-insensitively, against
           data/consent-banlist.txt ("accept all", "we value your privacy",
           "onetrust", "cookie", ...).
        b. PIL band-scan: the top 12% and bottom 18% of the page are scanned for a
           near-solid horizontal bar (rows with low within-row pixel variance AND
           high contrast vs the page body). This catches a styled banner whose
           text doesn't OCR (white-on-dark, custom font, anti-aliased, etc.).

  (2) EDGE-CLIPPED VALUE — with --expect-text "$400", the expected string is
      located via tesseract TSV word boxes and required to sit >= --margin-pct
      (default 1.5%) away from every edge. CRUCIAL: if the expected text is not
      found at all, that is a FAIL (we assume it was clipped off the frame), never
      a pass.

Outputs:
  * <name>.source.json  sidecar  {clean, defects[], sha256, checkedAt, ...}
  * <name>.defect.png   a crop of each flagged band / clipped value (proof image)
  * exit code 0 when clean, nonzero when any defect is found (or on error).

Deps (installed set only): python3.14 stdlib + numpy + PIL + tesseract subprocess.
No YAML, no skimage, no matplotlib.

OCR NOTE: on this machine `tesseract <img> stdout tsv` emits only the header row
for these large screenshots, and the raw full-res JPGs OCR to nothing. Both are
fixed by upscaling ~1.5x and writing tesseract output to a *file* base (not
stdout). This tool does exactly that internally and maps boxes back to original
pixels. The "$" glyph in the Chase font OCRs as "*" (and sometimes "S"), so the
expected-text matcher normalizes $ / * / S before comparing.

Usage:
  python3.14 assert-clean-source.py IMG [--expect-text "$400"] [--margin-pct 1.5]
                                       [--banlist PATH] [--upscale 1.5]
                                       [--out-json PATH] [--quiet]
"""

import argparse
import hashlib
import json
import os
import re
import subprocess
import sys
import tempfile
from datetime import datetime, timezone

import numpy as np
from PIL import Image

TESSERACT = "/opt/homebrew/bin/tesseract"
DEFAULT_BANLIST = os.path.join(os.path.dirname(os.path.abspath(__file__)),
                               "data", "consent-banlist.txt")


# ----------------------------------------------------------------------------- #
# helpers
# ----------------------------------------------------------------------------- #
def sha256_of(path):
    h = hashlib.sha256()
    with open(path, "rb") as f:
        for chunk in iter(lambda: f.read(1 << 20), b""):
            h.update(chunk)
    return h.hexdigest()


def normalize_glyphs(s):
    """Fold OCR-confusable money glyphs so '$400' matches '*400' / 'S400'."""
    s = s.lower()
    s = s.replace("*", "$").replace("€", "$")  # asterisk / euro -> $
    # a standalone 'S' immediately before a digit is almost always a misread '$'
    s = re.sub(r"s(?=\d)", "$", s)
    s = re.sub(r"\s+", "", s)  # drop whitespace: '$ 400' == '$400'
    return s


def load_banlist(path):
    phrases = []
    if not os.path.exists(path):
        return phrases
    with open(path, "r", encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if not line or line.startswith("#"):
                continue
            phrases.append(line.lower())
    return phrases


def run_tesseract(img_path, configs):
    """Run tesseract writing to a temp file base; return the produced text.

    `configs` is e.g. [] for plain text (-> .txt) or ['tsv'] (-> .tsv).
    Using a file base (not 'stdout') because this tesseract build only emits the
    header for `stdout tsv` on these screenshots.
    """
    ext = "txt"
    for c in configs:
        if c == "tsv":
            ext = "tsv"
    with tempfile.TemporaryDirectory() as td:
        base = os.path.join(td, "ocr")
        cmd = [TESSERACT, img_path, base] + configs
        try:
            subprocess.run(cmd, check=True,
                           stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        except (subprocess.CalledProcessError, FileNotFoundError) as e:
            raise RuntimeError(f"tesseract failed: {e}")
        out = base + "." + ext
        if not os.path.exists(out):
            return ""
        with open(out, "r", encoding="utf-8", errors="replace") as f:
            return f.read()


def parse_tsv(tsv_text):
    """Yield dicts for TSV word rows that carry text."""
    rows = []
    lines = tsv_text.replace("\r", "").split("\n")
    if not lines:
        return rows
    for ln in lines[1:]:  # skip header
        cols = ln.split("\t")
        if len(cols) < 12:
            continue
        text = cols[11]
        if text.strip() == "":
            continue
        try:
            rows.append({
                "left": int(cols[6]), "top": int(cols[7]),
                "width": int(cols[8]), "height": int(cols[9]),
                "conf": float(cols[10]) if cols[10] not in ("", "-1") else -1.0,
                "text": text,
            })
        except ValueError:
            continue
    return rows


# ----------------------------------------------------------------------------- #
# detector 1a: OCR banlist
# ----------------------------------------------------------------------------- #
def detect_banner_ocr(up_path, scale, banlist):
    """Return (list_of_hits, all_word_rows). Hits are dicts with phrase + bbox(orig px)."""
    plain = run_tesseract(up_path, [])
    plain_norm = normalize_glyphs(plain)
    plain_lower = plain.lower()

    tsv = run_tesseract(up_path, ["tsv"])
    words = parse_tsv(tsv)

    hits = []
    for phrase in banlist:
        pnorm = normalize_glyphs(phrase)
        matched = (phrase in plain_lower) or (pnorm in plain_norm)
        if not matched:
            continue
        # locate a representative bbox: union of words whose text appears in phrase
        toks = [t for t in re.split(r"[^a-z0-9]+", phrase) if t]
        boxes = []
        for w in words:
            wl = w["text"].lower()
            wn = normalize_glyphs(w["text"])
            for tk in toks:
                if tk and (tk in wl or normalize_glyphs(tk) in wn):
                    boxes.append(w)
                    break
        bbox = union_bbox_orig(boxes, scale) if boxes else None
        hits.append({"phrase": phrase, "bbox": bbox})
    return hits, words


def union_bbox_orig(boxes, scale):
    if not boxes:
        return None
    l = min(b["left"] for b in boxes)
    t = min(b["top"] for b in boxes)
    r = max(b["left"] + b["width"] for b in boxes)
    btm = max(b["top"] + b["height"] for b in boxes)
    return [int(l / scale), int(t / scale), int(r / scale), int(btm / scale)]


# ----------------------------------------------------------------------------- #
# detector 1b: PIL solid-bar band scan
# ----------------------------------------------------------------------------- #
def detect_banner_bar(img):
    """Scan top 12% and bottom 18% for a near-solid horizontal bar.

    A banner row has LOW within-row variance (uniform fill) and HIGH contrast vs
    the page body's median luminance. We require a contiguous run of such rows
    that is tall enough to be a real bar (>= ~2.5% of image height, >=14px).

    Returns list of band dicts: {region, y0, y1, mean_lum, contrast, rows}.
    """
    gray = np.asarray(img.convert("L"), dtype=np.float32)
    h, w = gray.shape
    body_med = float(np.median(gray))  # page body reference luminance

    row_std = gray.std(axis=1)            # within-row spread
    row_mean = gray.mean(axis=1)          # row luminance
    row_contrast = np.abs(row_mean - body_med)

    # thresholds (relative, robust across light/dark pages)
    std_thresh = 26.0          # "near-solid": low pixel spread across the row
    contrast_thresh = 28.0     # "stands out" from the page body
    min_run = max(14, int(round(h * 0.025)))

    top_band = (0, int(round(h * 0.12)))
    bot_band = (int(round(h * (1 - 0.18))), h)

    findings = []
    for region, (lo, hi) in (("top", top_band), ("bottom", bot_band)):
        flag = (row_std[lo:hi] < std_thresh) & (row_contrast[lo:hi] > contrast_thresh)
        # find longest contiguous run of flagged rows
        best = _longest_run(flag)
        if best is None:
            continue
        run_lo, run_hi = best  # indices within [lo:hi)
        run_len = run_hi - run_lo
        if run_len < min_run:
            continue
        y0, y1 = lo + run_lo, lo + run_hi
        seg = gray[y0:y1]
        findings.append({
            "region": region,
            "y0": int(y0), "y1": int(y1),
            "rows": int(run_len),
            "mean_lum": round(float(seg.mean()), 1),
            "contrast": round(float(abs(seg.mean() - body_med)), 1),
            "within_row_std": round(float(seg.std(axis=1).mean()), 1),
            "bbox": [0, int(y0), int(w), int(y1)],
        })
    return findings


def _longest_run(boolarr):
    """Return (start, end) of the longest True run, or None."""
    best = None
    best_len = 0
    i = 0
    n = len(boolarr)
    while i < n:
        if boolarr[i]:
            j = i
            while j < n and boolarr[j]:
                j += 1
            if (j - i) > best_len:
                best_len = j - i
                best = (i, j)
            i = j
        else:
            i += 1
    return best


# ----------------------------------------------------------------------------- #
# detector 2: edge-clipped expected value
# ----------------------------------------------------------------------------- #
def detect_clipped_value(words, scale, img_w, img_h, expect, margin_pct):
    """Locate expect-text and verify margins. Returns (status, info).

    status: 'ok' | 'clipped' | 'not_found'
    """
    want = normalize_glyphs(expect)
    # try single-word match first
    cand = None
    for w in words:
        if normalize_glyphs(w["text"]) == want:
            cand = [w]
            break
    # fallback: contiguous run of words whose concatenation == want
    if cand is None:
        cand = _find_word_run(words, want)
    # last resort: a word that *contains* the wanted normalized string
    if cand is None:
        for w in words:
            if want and want in normalize_glyphs(w["text"]):
                cand = [w]
                break

    if not cand:
        return "not_found", {"expect": expect}

    bbox = union_bbox_orig(cand, scale)
    l, t, r, b = bbox
    margin_px_w = margin_pct / 100.0 * img_w
    margin_px_h = margin_pct / 100.0 * img_h
    margins = {
        "left": l,
        "right": img_w - r,
        "top": t,
        "bottom": img_h - b,
    }
    margins_pct = {
        "left": round(l / img_w * 100, 2),
        "right": round((img_w - r) / img_w * 100, 2),
        "top": round(t / img_h * 100, 2),
        "bottom": round((img_h - b) / img_h * 100, 2),
    }
    bad = []
    if margins["left"] < margin_px_w:
        bad.append("left")
    if margins["right"] < margin_px_w:
        bad.append("right")
    if margins["top"] < margin_px_h:
        bad.append("top")
    if margins["bottom"] < margin_px_h:
        bad.append("bottom")
    info = {"expect": expect, "bbox": bbox, "margins_px": margins,
            "margins_pct": margins_pct, "edges_too_close": bad,
            "required_margin_pct": margin_pct}
    return ("clipped" if bad else "ok"), info


def _find_word_run(words, want):
    """Find a contiguous (reading-order) run of words concatenating to want."""
    for i in range(len(words)):
        acc = ""
        run = []
        for j in range(i, min(i + 6, len(words))):
            acc += normalize_glyphs(words[j]["text"])
            run.append(words[j])
            if acc == want:
                return run
            if not want.startswith(acc):
                break
    return None


# ----------------------------------------------------------------------------- #
# main
# ----------------------------------------------------------------------------- #
def main():
    ap = argparse.ArgumentParser(
        description="Source-asset clean gate: flag consent banners and edge-clipped values.")
    ap.add_argument("image", help="source PNG/JPG to check")
    ap.add_argument("--expect-text", default=None,
                    help='required on-frame text, e.g. "$400" (missing => FAIL/clipped)')
    ap.add_argument("--margin-pct", type=float, default=1.5,
                    help="min edge margin for expect-text (percent of dimension)")
    ap.add_argument("--banlist", default=DEFAULT_BANLIST,
                    help="path to consent banlist txt")
    ap.add_argument("--upscale", type=float, default=1.5,
                    help="OCR upscale factor (helps large screenshots)")
    ap.add_argument("--out-json", default=None,
                    help="sidecar json path (default <name>.source.json)")
    ap.add_argument("--quiet", action="store_true")
    args = ap.parse_args()

    if not os.path.exists(args.image):
        print(f"FAIL: image not found: {args.image}", file=sys.stderr)
        return 2

    def log(*a):
        if not args.quiet:
            print(*a)

    img = Image.open(args.image).convert("RGB")
    W, H = img.size
    stem = os.path.splitext(args.image)[0]
    out_json = args.out_json or (stem + ".source.json")
    defect_png = stem + ".defect.png"

    # build upscaled OCR image once
    scale = max(1.0, float(args.upscale))
    up = img.resize((int(W * scale), int(H * scale)), Image.LANCZOS)
    with tempfile.NamedTemporaryFile(suffix=".png", delete=False) as tf:
        up_path = tf.name
    up.save(up_path)

    defects = []
    flagged_bands = []  # (label, bbox) for cropping proof
    try:
        banlist = load_banlist(args.banlist)
        if not banlist:
            log(f"WARN: banlist empty or missing at {args.banlist}")

        # ---- detector 1a: OCR banlist ----
        ocr_hits, words = detect_banner_ocr(up_path, scale, banlist)
        for hit in ocr_hits:
            defects.append({
                "type": "consent_banner_text",
                "phrase": hit["phrase"],
                "bbox": hit["bbox"],
                "detail": f'banned phrase "{hit["phrase"]}" found via OCR',
            })
            if hit["bbox"]:
                flagged_bands.append((f'banner-text-{hit["phrase"]}', hit["bbox"]))

        # ---- detector 1b: solid-bar band scan ----
        bars = detect_banner_bar(img)
        for bar in bars:
            defects.append({
                "type": "consent_banner_bar",
                "region": bar["region"],
                "bbox": bar["bbox"],
                "rows": bar["rows"],
                "mean_lum": bar["mean_lum"],
                "contrast_vs_body": bar["contrast"],
                "within_row_std": bar["within_row_std"],
                "detail": (f'near-solid horizontal bar in {bar["region"]} band '
                           f'({bar["rows"]}px tall, contrast {bar["contrast"]})'),
            })
            flagged_bands.append((f'bar-{bar["region"]}', bar["bbox"]))

        # ---- detector 2: edge-clipped expected value ----
        if args.expect_text is not None:
            status, info = detect_clipped_value(words, scale, W, H,
                                                args.expect_text, args.margin_pct)
            if status == "not_found":
                defects.append({
                    "type": "expected_text_missing",
                    "expect": args.expect_text,
                    "detail": (f'expected text "{args.expect_text}" not found at all '
                               f'-> assumed clipped (FAIL)'),
                })
            elif status == "clipped":
                defects.append({
                    "type": "value_edge_clipped",
                    "expect": args.expect_text,
                    "bbox": info["bbox"],
                    "edges_too_close": info["edges_too_close"],
                    "margins_pct": info["margins_pct"],
                    "required_margin_pct": info["required_margin_pct"],
                    "detail": (f'"{args.expect_text}" too close to edge(s): '
                               f'{",".join(info["edges_too_close"])} '
                               f'(margins {info["margins_pct"]})'),
                })
                if info.get("bbox"):
                    flagged_bands.append(("clipped-value", info["bbox"]))
            else:
                log(f'  expect-text "{args.expect_text}" OK: margins '
                    f'{info["margins_pct"]}')
    finally:
        try:
            os.unlink(up_path)
        except OSError:
            pass

    clean = len(defects) == 0

    # ---- crop proof image for the first / most relevant flagged band ----
    defect_png_written = None
    if flagged_bands:
        # prefer a full-width band crop if present, else the first bbox
        label, bbox = flagged_bands[0]
        for lbl, bb in flagged_bands:
            if lbl.startswith("bar-"):
                label, bbox = lbl, bb
                break
        x0, y0, x1, y1 = bbox
        # pad a little for context, clamp to image
        pad = max(8, int(H * 0.01))
        x0 = max(0, x0 - pad); y0 = max(0, y0 - pad)
        x1 = min(W, x1 + pad); y1 = min(H, y1 + pad)
        if x1 > x0 and y1 > y0:
            img.crop((x0, y0, x1, y1)).save(defect_png)
            defect_png_written = defect_png

    sidecar = {
        "image": os.path.abspath(args.image),
        "width": W,
        "height": H,
        "clean": clean,
        "defects": defects,
        "sha256": sha256_of(args.image),
        "checkedAt": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
        "params": {
            "expect_text": args.expect_text,
            "margin_pct": args.margin_pct,
            "upscale": scale,
            "banlist": os.path.abspath(args.banlist),
        },
        "defectImage": os.path.abspath(defect_png_written) if defect_png_written else None,
    }
    with open(out_json, "w", encoding="utf-8") as f:
        json.dump(sidecar, f, indent=2)

    # ---- report ----
    if clean:
        log(f"PASS: clean source — {args.image}")
        log(f"  sidecar: {out_json}")
        return 0
    else:
        print(f"FAIL: {len(defects)} defect(s) in {args.image}")
        for d in defects:
            print(f"  - [{d['type']}] {d['detail']}")
        print(f"  sidecar: {out_json}")
        if defect_png_written:
            print(f"  defect crop: {defect_png_written}")
        return 1


if __name__ == "__main__":
    sys.exit(main())
