#!/usr/bin/env python3
"""
build-broll — GENERIC circle-cam / b-roll / article-insert assembler for ANY video.

Reads a per-video `broll-plan.json`, renders each b-roll segment (via page-focus.py — the proven
circle-cam + ring + focus/highlight renderer) and the plain face spans between them, then assembles:
  VIDEO = the parts concatenated (frame-snapped so they can't drift);
  AUDIO = ONE continuous A-roll track underneath (b-roll only swaps the picture, never the audio).
This is the video-agnostic replacement for the best-cards-specific render-broll2.py.

  python3 scripts/video-editor/build-broll.py --plan broll-plan.json

broll-plan.json:
{
  "face":  "/Users/.../face.mp4",          # the clean A-roll (talking head, with audio)
  "out":   "/Users/.../VIDEO-BROLL.mp4",
  "fps":   24,                               # optional (default: probe face)
  "total": 845.0,                            # optional (default: probe face duration)
  "ring":  "#0d7c5f", "loudnorm": true,      # optional
  "segments": [
    {"start": 27,  "end": 59,  "layout": "plain",     "hero":  "/path/sapphire_offer.png"},
    {"start": 96,  "end": 100, "layout": "highlight", "image": "/path/doc.png",
        "roi": "825,726,1482,84", "lines": "826,726,1481,40;825,770,770,40", "source": "Doctor of Credit"},
    {"start": 130, "end": 135, "layout": "focus",     "image": "/path/offer.png", "roi": "auto:0.2,0.5,0.5,0.06"}
  ]
}
layout → page-focus --style:  plain (full hero + circle) | focus (blur+highlight region) | highlight (animated marker).
Author segments by hand, or from article-index.ts (change-claims) + page-roi.py (tight ROI) + fetch-screenshots.ts.
Output is 1920×1080 (page-focus renders at 1080; face spans are scaled/padded to match).
"""
import argparse, json, os, subprocess, sys, tempfile

W, H = 1920, 1080
HERE = os.path.dirname(os.path.abspath(__file__))
PAGE_FOCUS = os.path.join(HERE, "page-focus.py")
ap = argparse.ArgumentParser()
ap.add_argument("--plan", required=True)
ap.add_argument("--keep-tmp", action="store_true")
a = ap.parse_args()
plan = json.load(open(a.plan))
expand = lambda p: os.path.expanduser(p) if p else p


def run(cmd, what=""):
    r = subprocess.run(cmd, capture_output=True, text=True, errors="replace")
    if r.returncode != 0:
        sys.exit(f"build-broll FAIL ({what}):\n  {' '.join(map(str, cmd))}\n{(r.stderr or '')[-1800:]}")
    return r


def probe(path, *entries):
    return subprocess.run(["ffprobe", "-v", "error", *entries, "-of", "csv=p=0", path],
                          capture_output=True, text=True).stdout.strip().split("\n")[0]


def vframes(path):  # fast video frame count from container metadata (-1 if unavailable)
    n = probe(path, "-select_streams", "v:0", "-show_entries", "stream=nb_frames")
    return int(n) if n.isdigit() else -1


def check_frames(path, want):  # hard-fail on a short/0-frame part (e.g. an EOF-truncated face span)
    n = vframes(path)
    if 0 <= n != want:
        sys.exit(f"build-broll: {os.path.basename(path)} has {n} frames, expected {want} "
                 f"(an ffmpeg cut likely seeked past the end of the face).")


FACE = expand(plan["face"]); OUT = expand(plan["out"])
if not os.path.exists(FACE):
    sys.exit(f"build-broll: face video not found: {FACE}")
FPS = int(plan.get("fps") or round(eval(probe(FACE, "-select_streams", "v:0", "-show_entries", "stream=r_frame_rate") or "24/1")))
FACE_DUR = float(probe(FACE, "-show_entries", "format=duration") or 0)
TOTAL = float(plan.get("total") or FACE_DUR)
if FACE_DUR and TOTAL > FACE_DUR + 1.5 / FPS:    # tail would seek past EOF → silent truncation (review bug #1)
    sys.exit(f"build-broll: total ({TOTAL:.2f}s) exceeds the face video length ({FACE_DUR:.2f}s). "
             f"Lower 'total' in the plan or supply a longer face.")
if not probe(FACE, "-select_streams", "a:0", "-show_entries", "stream=codec_type"):
    sys.exit("build-broll: face video has no audio stream — the continuous A-roll audio needs one.")
RING = plan.get("ring", "#0d7c5f")
LOUDNORM = plan.get("loudnorm", True)
VENC = ["-r", str(FPS), "-c:v", "libx264", "-preset", "fast", "-crf", "18", "-pix_fmt", "yuv420p"]
FIT = f"scale={W}:{H}:force_original_aspect_ratio=decrease,pad={W}:{H}:(ow-iw)/2:(oh-ih)/2,setsar=1"

# Snap every boundary to the frame grid so the parts share exact frame indices → the concatenated
# video length == round(TOTAL*FPS) frames, and the single continuous audio can never drift.
segs = sorted(plan.get("segments", []), key=lambda s: s["start"])
total_f = round(TOTAL * FPS)
seg_ranges = []
cur = 0
for s in segs:
    f0, f1 = round(s["start"] * FPS), round(s["end"] * FPS)
    if f1 <= f0:
        sys.exit(f"build-broll: segment end {s['end']} <= start {s['start']}.")
    if f0 < cur:
        sys.exit(f"build-broll: segment at {s['start']}s overlaps the previous one. Fix the plan.")
    if f1 > total_f:
        sys.exit(f"build-broll: segment end {s['end']}s is past the video end ({TOTAL:.2f}s).")
    seg_ranges.append((f0, f1, s)); cur = f1

points = sorted(set([0, total_f] + [p for (f0, f1, _) in seg_ranges for p in (f0, f1)]))
parts = []
for f0, f1 in zip(points, points[1:]):
    if f1 <= f0:
        continue
    seg = next((s for (a0, b0, s) in seg_ranges if a0 == f0 and b0 == f1), None)
    parts.append((f0, f1, seg))

tmp = tempfile.mkdtemp(prefix="broll_")


def face_part(start_f, nframes, out):   # full-frame face span → fit to 1920×1080 (for the concat)
    run(["ffmpeg", "-y", "-hide_banner", "-loglevel", "error", "-ss", f"{start_f / FPS:.3f}", "-i", FACE,
         "-frames:v", str(nframes), "-an", "-vf", FIT, *VENC, out], "cut face span")
    check_frames(out, nframes)


def face_slice(start_f, nframes, out):  # NATIVE-res circle-cam source — page-focus does the head crop,
    run(["ffmpeg", "-y", "-hide_banner", "-loglevel", "error", "-ss", f"{start_f / FPS:.3f}", "-i", FACE,
         "-frames:v", str(nframes), "-an", *VENC, out], "cut face slice")  # so DON'T pre-pad to 16:9 here
    check_frames(out, nframes)


def render_seg(s, start_f, nframes, i):
    dur = nframes / FPS
    layout = s.get("layout", "plain")
    if layout not in ("plain", "focus", "highlight"):
        sys.exit(f"build-broll: segment {i} unknown layout '{layout}' (use plain|focus|highlight)")
    image = expand(s.get("image") or s.get("hero"))
    if not image or not os.path.exists(image):
        sys.exit(f"build-broll: segment {i} ({layout}) missing image/hero (got {image!r})")
    roi = s.get("roi") or ("auto:0,0,1,1" if layout == "plain" else None)
    if not roi:
        sys.exit(f"build-broll: segment {i} ({layout}) needs a roi (run page-roi.py)")
    slice_path = os.path.join(tmp, f"face_{i:03d}.mp4")
    face_slice(start_f, nframes, slice_path)            # NATIVE circle-cam source for this span
    out = os.path.join(tmp, f"part_{i:03d}.mp4")
    cmd = ["python3", PAGE_FOCUS, "--image", image, "--style", layout, "--roi", roi,
           "--face", slice_path, "--dur", f"{dur:.4f}", "--fps", str(FPS), "--ring", RING, "--out", out]
    if s.get("lines"):
        cmd += ["--lines", s["lines"]]
    if s.get("source"):
        cmd += ["--source", s["source"]]
    if s.get("face_d"):
        cmd += ["--face-d", str(s["face_d"])]
    run(cmd, f"page-focus seg {i}")
    return out


files = []
for i, (f0, f1, seg) in enumerate(parts):
    out = os.path.join(tmp, f"part_{i:03d}.mp4")
    nf = f1 - f0
    if seg is None:
        face_part(f0, nf, out)
        print(f"  [{i+1}/{len(parts)}] face   {f0/FPS/60:5.2f}–{f1/FPS/60:5.2f}m  ({nf}f)", flush=True)
    else:
        out = render_seg(seg, f0, nf, i)
        check_frames(out, nf)
        tag = os.path.basename(expand(seg.get("hero") or seg.get("image") or ""))
        print(f"  [{i+1}/{len(parts)}] {seg.get('layout','?'):9} {f0/FPS/60:5.2f}–{f1/FPS/60:5.2f}m  {tag}", flush=True)
    files.append(out)

lst = os.path.join(tmp, "list.txt")
open(lst, "w").write("\n".join(f"file '{f}'" for f in files))
vid = os.path.join(tmp, "video.mp4")
run(["ffmpeg", "-y", "-hide_banner", "-loglevel", "error", "-f", "concat", "-safe", "0", "-i", lst, "-c", "copy", vid], "concat")

# ONE continuous A-roll audio under the whole timeline (+ optional loudnorm). No per-part audio = no drift.
adur = total_f / FPS
mux = ["ffmpeg", "-y", "-hide_banner", "-loglevel", "error", "-i", vid, "-ss", "0", "-i", FACE,
       "-map", "0:v:0", "-map", "1:a:0", "-t", f"{adur:.3f}", "-c:v", "copy"]
if LOUDNORM:
    mux += ["-af", "loudnorm=I=-14:TP=-1.5:LRA=11"]
mux += ["-c:a", "aac", "-b:a", "192k", "-ar", "48000", "-ac", "2", OUT]
print("  muxing continuous A-roll audio" + (" + loudnorm → -14 LUFS" if LOUDNORM else "") + " …", flush=True)
run(mux, "mux+audio")

of = vframes(OUT)
if 0 <= of and abs(of - total_f) > 1:            # final guard: video length must match the timeline
    print(f"  ⚠ output has {of} frames, expected {total_f} (~{(of-total_f)/FPS:.2f}s off)", flush=True)
dur = probe(OUT, "-show_entries", "format=duration")
n_seg = len(seg_ranges)
if not a.keep_tmp:
    import shutil; shutil.rmtree(tmp, ignore_errors=True)
print(f"\n✅ {OUT}  ({float(dur)/60:.2f} min, {n_seg} b-roll segment(s), {FPS}fps, {W}×{H})")
