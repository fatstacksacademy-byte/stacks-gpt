#!/usr/bin/env python3
"""
page-roi — OCR a page/article screenshot and return a TIGHT bounding box (+ per-line boxes)
for a target phrase, so the highlight/focus lands exactly on the WORDS (no dead space / no
off-centre box). Uses the tesseract CLI (word-level --tsv boxes).

  python3 scripts/video-editor/page-roi.py --image page.png \
      --phrase "10% anniversary bonus is ending in October 2026" [--out roi.json]

Prints the tight `--roi` (source px) AND a `--lines "x,y,w,h;..."` string for page-focus.py
(the per-line boxes drive the animated highlighter sweep). Pure-stdlib + PIL + tesseract.
"""
import argparse, json, os, re, subprocess, sys, tempfile
from PIL import Image

ap = argparse.ArgumentParser()
ap.add_argument("--image", required=True)
ap.add_argument("--phrase", required=True, help="the words to find on the page")
ap.add_argument("--out", default="")
ap.add_argument("--min-conf", type=float, default=35)
ap.add_argument("--ocr-width", type=int, default=2600, help="downscale to this width for OCR speed")
ap.add_argument("--pad", type=int, default=6, help="px padding around each matched line")
ap.add_argument("--exact", action="store_true", help="box only the matched words (default: the whole sentence)")
a = ap.parse_args()

img = Image.open(a.image).convert("RGB")
W0, H0 = img.size
scale = min(1.0, a.ocr_width / W0)            # OCR on a downscaled copy for speed; boxes rescaled back
ocr_img = img if scale >= 1.0 else img.resize((int(W0 * scale), int(H0 * scale)))

tmp = tempfile.mkdtemp()
ocr_png = os.path.join(tmp, "ocr.png"); ocr_img.save(ocr_png)
base = os.path.join(tmp, "out")
r = subprocess.run(["tesseract", ocr_png, base, "--psm", "3", "tsv"], capture_output=True, text=True)
if r.returncode != 0:
    sys.exit("tesseract failed:\n" + r.stderr[-1500:])

norm = lambda s: re.sub(r"[^a-z0-9$%]", "", s.lower())
phrase_toks = [t for t in (norm(w) for w in a.phrase.split()) if t]
phrase_set = set(phrase_toks)

# parse the TSV → words with boxes + a line key (block/par/line)
words = []
with open(base + ".tsv") as f:
    header = f.readline().strip().split("\t")
    ci = {name: i for i, name in enumerate(header)}
    for ln in f:
        c = ln.rstrip("\n").split("\t")
        if len(c) <= ci["text"]:
            continue
        txt = c[ci["text"]].strip()
        try:
            conf = float(c[ci["conf"]])
        except ValueError:
            conf = -1
        if not txt or conf < a.min_conf:
            continue
        L, T, Wd, Ht = (int(c[ci[k]]) for k in ("left", "top", "width", "height"))
        words.append({
            "n": norm(txt), "raw": txt, "L": L, "T": T, "R": L + Wd, "B": T + Ht,
            "line": (c[ci["block_num"]], c[ci["par_num"]], c[ci["line_num"]]),
            "par": (c[ci["block_num"]], c[ci["par_num"]]),
        })

if not words:
    sys.exit("page-roi: tesseract found no text above min-conf")

# Best window: slide a window ~2× the phrase length over the page words, score by how many
# phrase tokens it contains. Then keep only the MATCHING words inside it (so non-phrase words
# / whitespace never pad the box), and per text-line take the continuous span min-left→max-right.
Lw = max(len(phrase_toks), 4)
win = max(Lw, Lw + 3)
best_i, best_score = 0, -1
for i in range(0, max(1, len(words) - 1)):
    seg = words[i:i + win]
    score = len({w["n"] for w in seg} & phrase_set)   # DISTINCT phrase tokens covered (never > len)
    if score > best_score:
        best_score, best_i = score, i
matched_idx = [i for i in range(best_i, min(best_i + win, len(words))) if words[i]["n"] in phrase_set]
if not matched_idx:
    sys.exit(f"page-roi: could not locate phrase “{a.phrase}” on the page")
# Trim ISOLATED leading/trailing matches — a stray duplicate of a common token ("the"/"a"/"2026")
# sitting a few words off the real phrase would otherwise pull the seed box outward. Only the ends
# are trimmed (internal filler-word gaps within the phrase are preserved).
while len(matched_idx) > 1 and matched_idx[1] - matched_idx[0] > 2:
    matched_idx.pop(0)
while len(matched_idx) > 1 and matched_idx[-1] - matched_idx[-2] > 2:
    matched_idx.pop()

# A partial highlight ("…rd added a 10%…") looks weird — cover the WHOLE sentence(s) the phrase
# touches. A word ends a sentence if its raw ends with . ! ? AND it's not an abbreviation AND the
# next word starts a new sentence (capital OR a digit, e.g. "…here. 2026 will…"). Expansion never
# crosses a paragraph. The capital-only test alone fails on "U.S. Federal" / "Jan. 2026", so we
# also blocklist abbreviations / interior-dot tokens / single initials.
TERM = (".", "!", "?")
ABBREV = set("us st mr mrs ms dr prof jan feb mar apr jun jul aug sep sept oct nov dec no inc co "
             "corp ltd vs etc eg ie am pm jr sr vol fig dept est mt ave blvd approx".split())
def ends_sentence(i):
    if i >= len(words) - 1:
        return True
    stripped = words[i]["raw"].rstrip(')"’”\'')
    if not stripped.endswith(TERM):
        return False
    core = stripped.rstrip(".!?")
    if core.lower() in ABBREV or "." in core or (len(core) == 1 and core.isalpha()):
        return False                                   # "Inc."/"Jan." | "U.S."/"e.g." | single initial "J."
    nxt = words[i + 1]["raw"].lstrip('("‘“\'')
    return bool(nxt) and (nxt[0].isupper() or nxt[0].isdigit())

lo, hi = min(matched_idx), max(matched_idx)
if not a.exact:
    while lo > 0 and words[lo - 1]["par"] == words[lo]["par"] and not ends_sentence(lo - 1):
        lo -= 1
    while hi < len(words) - 1 and words[hi + 1]["par"] == words[hi]["par"] and not ends_sentence(hi):
        hi += 1
chosen = words[lo:hi + 1]

# group chosen words by text-line → one continuous box per line (full line height span)
lines = {}
for w in chosen:
    b = lines.setdefault(w["line"], {"L": w["L"], "T": w["T"], "R": w["R"], "B": w["B"]})
    b["L"] = min(b["L"], w["L"]); b["T"] = min(b["T"], w["T"])
    b["R"] = max(b["R"], w["R"]); b["B"] = max(b["B"], w["B"])
line_boxes = sorted(lines.values(), key=lambda b: b["T"])

inv = 1.0 / scale
def to_src(b):  # rescale to source px + pad, clamp to image
    x = max(0, int(b["L"] * inv) - a.pad); y = max(0, int(b["T"] * inv) - a.pad)
    x1 = min(W0, int(b["R"] * inv) + a.pad); y1 = min(H0, int(b["B"] * inv) + a.pad)
    return [x, y, x1 - x, y1 - y]

line_px = [to_src(b) for b in line_boxes]
ux0 = min(b[0] for b in line_px); uy0 = min(b[1] for b in line_px)
ux1 = max(b[0] + b[2] for b in line_px); uy1 = max(b[1] + b[3] for b in line_px)
roi = [ux0, uy0, ux1 - ux0, uy1 - uy0]

out = {
    "image": a.image, "phrase": a.phrase, "matchedTokens": best_score, "ofTokens": len(phrase_toks),
    "roi": roi, "lines": line_px,
    "roi_arg": ",".join(map(str, roi)),
    "lines_arg": ";".join(",".join(map(str, b)) for b in line_px),
    "roi_auto": "auto:%.4f,%.4f,%.4f,%.4f" % (roi[0] / W0, roi[1] / H0, roi[2] / W0, roi[3] / H0),
}
if a.out:
    json.dump(out, open(a.out, "w"), indent=2)
print(f"matched {best_score}/{len(phrase_toks)} tokens across {len(line_px)} line(s)")
print(f"  --roi   {out['roi_arg']}")
print(f"  --lines {out['lines_arg']}")
print(f"  (auto:  {out['roi_auto']})")
if a.out:
    print(f"→ {a.out}")
