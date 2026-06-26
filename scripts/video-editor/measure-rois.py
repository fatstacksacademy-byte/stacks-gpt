#!/usr/bin/env python3
"""
measure-rois — MEASURE the real on-screen position of faces / bodies / text at given
timestamps instead of guessing them. (FIX #7: face was cropped off-center x730 vs the real
~x944; titles landed on his body; the "$400" got cut off — all because positions were eyeballed.)

For each check it extracts the exact frame (ffmpeg -ss) and measures the ROI:
  • kind=face -> build/vision-roi  -> face {cx,cy,w,h}  (also emits a [x,y,w,h] src_roi)
  • kind=body -> build/vision-roi  -> body_bbox {x,y,w,h}
  • kind=text -> tesseract TSV     -> tight box around --phrase / "phrase" (word-level)

Writes rois.json with PROVENANCE on every measurement:
  {"name":"face@5","kind":"face","src_roi":[x,y,w,h],"detector":"vision",
   "frame_t":5.0,"frame":"build/.../roi_face@5.png","extra":{...}}

Usage:
  # checks from a JSON file (list of {name,t,kind,phrase?}) :
  python3 scripts/video-editor/measure-rois.py \
      --video /path/to.mp4 --checks checks.rois.json --out build/biz-20apy/rois.json

  # or inline, repeatable --check  name,t,kind[,phrase...] :
  python3 scripts/video-editor/measure-rois.py --video v.mp4 \
      --check "host,5,face" --check "host,5,body" --check "offer,18,text,$400" \
      --out rois.json

Deps: stdlib + PIL + ffmpeg (extract) + build/vision-roi (face/body) + tesseract (text).
Exit: 0 if every check produced a measurement; 3 if one or more checks found nothing.
"""
import argparse, json, os, re, subprocess, sys, tempfile
from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
VISION_BIN = os.path.join(HERE, "build", "vision-roi")


def parse_tc(v):
    """Accept seconds (5, 5.0) or mm:ss / h:mm:ss timecode -> float seconds."""
    s = str(v).strip()
    if ":" in s:
        parts = [float(p) for p in s.split(":")]
        sec = 0.0
        for p in parts:
            sec = sec * 60 + p
        return sec
    return float(s)


def extract_frame(video, t, dest):
    r = subprocess.run(
        ["ffmpeg", "-y", "-ss", f"{t:.3f}", "-i", video, "-frames:v", "1", dest],
        capture_output=True,
    )
    if r.returncode != 0 or not os.path.exists(dest):
        err = r.stderr.decode("utf-8", "replace")[-800:]
        sys.exit(f"measure-rois: ffmpeg failed to extract frame at t={t}:\n{err}")
    return dest


def run_vision(frame):
    if not os.path.exists(VISION_BIN):
        sys.exit(f"measure-rois: vision binary not built at {VISION_BIN}\n"
                 f"  build it: xcrun swiftc -O {os.path.join(HERE,'vision-roi.swift')} -o {VISION_BIN}")
    r = subprocess.run([VISION_BIN, frame], capture_output=True, text=True)
    if r.returncode != 0:
        sys.exit(f"measure-rois: vision-roi failed on {frame}:\n{r.stderr[-800:]}")
    try:
        return json.loads(r.stdout.strip())
    except json.JSONDecodeError:
        sys.exit(f"measure-rois: vision-roi gave non-JSON:\n{r.stdout[-800:]}")


_norm = lambda s: re.sub(r"[^a-z0-9$%]", "", s.lower())


def measure_text(frame, phrase, min_conf=35.0):
    """Tight box (src px) around `phrase` via tesseract word boxes. Returns [x,y,w,h] or None."""
    img = Image.open(frame).convert("RGB")
    W0, H0 = img.size
    tmp = os.path.realpath(tempfile.mkdtemp())
    base = os.path.join(tmp, "out")
    # tesseract/Leptonica can fail to open files via the /tmp -> /private/tmp symlink, so feed
    # it a realpath. NB: capture bytes, not text — tesseract can emit non-UTF8 progress bytes.
    real_frame = os.path.realpath(frame)
    r = subprocess.run(["tesseract", real_frame, base, "--psm", "3", "tsv"],
                       capture_output=True)
    if r.returncode != 0:
        sys.exit("measure-rois: tesseract failed:\n" + r.stderr.decode("utf-8", "replace")[-800:])
    toks = [t for t in (_norm(w) for w in phrase.split()) if t]
    tokset = set(toks)
    words = []
    with open(base + ".tsv") as f:
        header = f.readline().strip().split("\t")
        ci = {n: i for i, n in enumerate(header)}
        for ln in f:
            c = ln.rstrip("\n").split("\t")
            if len(c) <= ci["text"]:
                continue
            txt = c[ci["text"]].strip()
            try:
                conf = float(c[ci["conf"]])
            except ValueError:
                conf = -1
            if not txt or conf < min_conf:
                continue
            L, T, Wd, Ht = (int(c[ci[k]]) for k in ("left", "top", "width", "height"))
            words.append({"n": _norm(txt), "L": L, "T": T, "R": L + Wd, "B": T + Ht})
    if not words:
        return None, {"reason": "no text above min-conf"}
    # slide a window the size of the phrase, score by distinct phrase tokens covered
    Lw = max(len(toks), 2)
    win = max(Lw, Lw + 3)
    best_i, best_score = 0, -1
    for i in range(0, max(1, len(words))):
        seg = words[i:i + win]
        score = len({w["n"] for w in seg} & tokset)
        if score > best_score:
            best_score, best_i = score, i
    matched = [w for w in words[best_i:best_i + win] if w["n"] in tokset]
    if not matched:
        return None, {"reason": f"phrase “{phrase}” not found"}
    x0 = min(w["L"] for w in matched); y0 = min(w["T"] for w in matched)
    x1 = max(w["R"] for w in matched); y1 = max(w["B"] for w in matched)
    pad = 6
    box = [max(0, x0 - pad), max(0, y0 - pad),
           min(W0, x1 + pad) - max(0, x0 - pad), min(H0, y1 + pad) - max(0, y0 - pad)]
    return box, {"matchedTokens": best_score, "ofTokens": len(toks), "imgW": W0, "imgH": H0}


def load_checks(a):
    checks = []
    if a.checks:
        data = json.load(open(a.checks))
        rows = data["checks"] if isinstance(data, dict) and "checks" in data else data
        for row in rows:
            checks.append({
                "name": row["name"], "t": parse_tc(row["t"]),
                "kind": row.get("kind", "face"), "phrase": row.get("phrase", ""),
            })
    for spec in a.check or []:
        # name,t,kind[,phrase (may contain commas)]
        parts = spec.split(",", 3)
        if len(parts) < 3:
            sys.exit(f"measure-rois: bad --check '{spec}' (need name,t,kind[,phrase])")
        checks.append({
            "name": parts[0].strip(), "t": parse_tc(parts[1]),
            "kind": parts[2].strip(),
            "phrase": parts[3].strip() if len(parts) > 3 else "",
        })
    if not checks:
        sys.exit("measure-rois: no checks (use --checks file or --check spec)")
    return checks


def main():
    ap = argparse.ArgumentParser(description="Measure face/body/text ROIs at timestamps.")
    ap.add_argument("--video", required=True)
    ap.add_argument("--checks", help="JSON list of {name,t,kind,phrase?} (or {checks:[...]})")
    ap.add_argument("--check", action="append", help="inline: name,t,kind[,phrase] (repeatable)")
    ap.add_argument("--out", default="rois.json")
    ap.add_argument("--framedir", default="", help="where to drop extracted frames (default: alongside --out)")
    ap.add_argument("--min-conf", type=float, default=35.0, help="tesseract min word conf for text")
    a = ap.parse_args()

    if not os.path.exists(a.video):
        sys.exit(f"measure-rois: video not found: {a.video}")
    checks = load_checks(a)

    out_dir = os.path.dirname(os.path.abspath(a.out))
    framedir = a.framedir or os.path.join(out_dir, "roi-frames")
    os.makedirs(framedir, exist_ok=True)

    results, missing = [], 0
    for c in checks:
        name, t, kind = c["name"], c["t"], c["kind"]
        safe = re.sub(r"[^A-Za-z0-9_.-]", "_", f"{name}_{kind}_{t:g}")
        frame = extract_frame(a.video, t, os.path.join(framedir, f"roi_{safe}.png"))
        rec = {"name": name, "kind": kind, "frame_t": t, "frame": frame}
        if kind in ("face", "body"):
            vj = run_vision(frame)
            rec["img_w"], rec["img_h"] = vj["w"], vj["h"]
            rec["detector"] = "vision"
            if kind == "face":
                f = vj.get("face")
                if f:
                    rec["face"] = f
                    rec["src_roi"] = [f["cx"] - f["w"] // 2, f["cy"] - f["h"] // 2, f["w"], f["h"]]
                else:
                    rec["src_roi"] = None; rec["reason"] = "no face detected"; missing += 1
            else:
                b = vj.get("body_bbox")
                if b:
                    rec["src_roi"] = [b["x"], b["y"], b["w"], b["h"]]
                else:
                    rec["src_roi"] = None; rec["reason"] = "no person detected"; missing += 1
        elif kind == "text":
            if not c["phrase"]:
                sys.exit(f"measure-rois: check '{name}' kind=text needs a phrase")
            box, extra = measure_text(frame, c["phrase"], a.min_conf)
            rec["detector"] = "tesseract"
            rec["phrase"] = c["phrase"]
            rec["extra"] = extra
            rec["img_w"] = extra.get("imgW")
            rec["img_h"] = extra.get("imgH")
            if box:
                rec["src_roi"] = box
            else:
                rec["src_roi"] = None; rec["reason"] = extra.get("reason", "not found"); missing += 1
        else:
            sys.exit(f"measure-rois: unknown kind '{kind}' (face|body|text)")
        results.append(rec)
        status = "OK " if rec.get("src_roi") else "MISS"
        print(f"[{status}] {name:>14} {kind:<4} t={t:<7g} -> {rec.get('src_roi')}")

    out = {"video": a.video, "rois": results}
    json.dump(out, open(a.out, "w"), indent=2)
    print(f"\nwrote {len(results)} measurement(s) -> {a.out}")
    if missing:
        print(f"FAIL: {missing} check(s) found nothing")
        sys.exit(3)
    print("PASS: all checks measured")
    sys.exit(0)


if __name__ == "__main__":
    main()
