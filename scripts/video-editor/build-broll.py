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
Output is RENDER_SCALE-driven: default 3840×2160 (native 4K), RENDER_SCALE=1 → 1920×1080. The same env
is inherited by the page-focus/motion-gfx subprocesses so every segment matches. NOTE: the FACE (A-roll)
portion is only TRUE 4K if the source face is 4K — a 1080 face is scaled up to fill the 4K frame.
"""
import argparse, json, os, subprocess, sys, tempfile

S = max(1, int(os.environ.get("RENDER_SCALE", "2")))   # default 2 = native 4K (matches page-focus/motion-gfx)
os.environ["RENDER_SCALE"] = str(S)                    # lock children (page-focus/motion-gfx) to the SAME scale
W, H = 1920 * S, 1080 * S
HERE = os.path.dirname(os.path.abspath(__file__))
PAGE_FOCUS = os.path.join(HERE, "page-focus.py")
MOTION_GFX = os.path.join(HERE, "motion-gfx.py")
REMOTION_DIR = os.path.join(HERE, "remotion")
REMOTION_RENDER = os.path.join(REMOTION_DIR, "render.mjs")
TRANSITION = os.path.join(HERE, "transition.py")
PARTICLES = os.path.join(HERE, "particles.py")
ap = argparse.ArgumentParser()
ap.add_argument("--plan", required=True)
ap.add_argument("--keep-tmp", action="store_true")
ap.add_argument("--transitions", choices=["whip", "wipe"], default=None,
                help="overlay a whip/wipe sweep at each b-roll cut (masks the cut; off by default)")
ap.add_argument("--transition-dur", type=float, default=0.4)
ap.add_argument("--transition-color", default="#ffffff")
ap.add_argument("--particles", nargs="?", const=0.45, type=float, default=None,
                metavar="OPACITY", help="faint drifting-bokeh overlay over the whole video (0..1, default 0.45)")
ap.add_argument("--particle-color", default="#f5c451")
a = ap.parse_args()
# plan can also carry these (CLI wins): {"transitions":"whip","particles":0.45,...}
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


def split_compose(page_clip, face_clip, dur, i):
    # SPLIT look: a big PORTRAIT of him (left, emerald border) beside the page region (right), on navy.
    e2 = lambda x: int(x) // 2 * 2                       # libx264 needs even dims
    PAD = 40 * S; em = RING.lstrip("#"); bw = max(4, 6 * S)
    fw, fh, fx0, fy0 = e2(0.40 * W - PAD), e2(H - 2 * PAD), PAD, PAD               # face portrait, left
    px0 = e2(0.40 * W + PAD // 2); pw, ph, py0 = e2(W - px0 - PAD), e2(H - 2 * PAD), PAD  # page, right
    out = os.path.join(tmp, f"part_{i:03d}.mp4")
    fc = (f"color=c=0x0B1220:s={W}x{H}:r={FPS}:d={dur:.4f}[bg];"
          f"[0:v]scale={pw}:{ph}:force_original_aspect_ratio=increase,crop={pw}:{ph},setsar=1[pg];"
          f"[1:v]scale={fw}:{fh}:force_original_aspect_ratio=increase,crop={fw}:{fh},setsar=1,"
          f"drawbox=0:0:{fw}:{fh}:color=0x{em}:t={bw}[fcr];"
          f"[bg][pg]overlay={px0}:{py0}[b1];[b1][fcr]overlay={fx0}:{fy0}[out]")
    run(["ffmpeg", "-y", "-hide_banner", "-loglevel", "error", "-i", page_clip, "-i", face_clip,
         "-filter_complex", fc, "-map", "[out]", "-t", f"{dur:.4f}", *VENC, out], f"split compose {i}")
    return out


def render_seg(s, start_f, nframes, i):
    dur = nframes / FPS
    layout = s.get("layout", "plain")
    if layout == "gfx":   # full-screen animated explainer (motion-gfx.py) — A-roll audio plays under it
        out = os.path.join(tmp, f"part_{i:03d}.mp4")
        run(["python3", MOTION_GFX, "--type", s.get("gfx_type", "value"),
             "--spec", json.dumps(s.get("spec", {})), "--dur", f"{dur:.4f}", "--fps", str(FPS), "--out", out],
            f"motion-gfx seg {i}")
        return out
    if layout == "remotion":   # code-driven ANIMATED graphic (alpha) composited OVER the face span
        if not os.path.isdir(os.path.join(REMOTION_DIR, "node_modules")):
            sys.exit(f"build-broll: segment {i} (remotion) needs deps — run `npm install` in {REMOTION_DIR}")
        spec = {"comp": s.get("comp", "Callout"), "props": s.get("props", {})}
        alpha = os.path.join(tmp, f"rmtn_{i:03d}.mov")
        run(["node", REMOTION_RENDER, "--spec", json.dumps(spec), "--duration", f"{dur:.4f}",
             "--fps", str(FPS), "--scale", str(S), "--out", alpha], f"remotion render seg {i}")
        face = os.path.join(tmp, f"rface_{i:03d}.mp4")
        face_part(start_f, nframes, face)            # full-frame talking head for this span (video-only)
        out = os.path.join(tmp, f"part_{i:03d}.mp4")
        run(["ffmpeg", "-y", "-hide_banner", "-loglevel", "error", "-i", face, "-i", alpha,
             "-filter_complex", f"[1:v]scale={W}:{H}[ov];[0:v][ov]overlay=0:0:shortest=1[v]",
             "-map", "[v]", "-frames:v", str(nframes), "-an", *VENC, out], f"remotion overlay {i}")
        check_frames(out, nframes)
        return out
    if layout == "split":   # big portrait of him (left) + the page region (right) — alternate to the circle
        style = s.get("split_style", "focus")
        image = expand(s.get("image") or s.get("hero"))
        if not image or not os.path.exists(image):
            sys.exit(f"build-broll: segment {i} (split) missing image/hero (got {image!r})")
        roi = s.get("roi") or ("auto:0,0,1,1" if style == "plain" else None)
        if not roi:
            sys.exit(f"build-broll: segment {i} (split) needs a roi (run page-roi.py)")
        page_clip = os.path.join(tmp, f"page_{i:03d}.mp4")
        pc = ["python3", PAGE_FOCUS, "--image", image, "--style", style, "--roi", roi,
              "--dur", f"{dur:.4f}", "--fps", str(FPS), "--out", page_clip]
        if s.get("lines"): pc += ["--lines", s["lines"]]
        if s.get("source"): pc += ["--source", s["source"]]
        run(pc, f"page-focus(split) {i}")
        slice_path = os.path.join(tmp, f"face_{i:03d}.mp4")
        face_slice(start_f, nframes, slice_path)
        return split_compose(page_clip, slice_path, dur, i)
    if layout not in ("plain", "focus", "highlight"):
        sys.exit(f"build-broll: segment {i} unknown layout '{layout}' (use plain|focus|highlight|split|gfx|remotion)")
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

# ── optional retention FX pass (opt-in; off → byte-identical to before) ──────────
TRANSITIONS = a.transitions or plan.get("transitions")
PARTICLES_OP = a.particles if a.particles is not None else plan.get("particles")
if PARTICLES_OP is not None:
    PARTICLES_OP = max(0.0, min(1.0, float(PARTICLES_OP)))   # ffmpeg aa range is [-2,2]; clamp + skip 0 (no wasted re-encode)
if PARTICLES_OP:                                   # faint drifting-bokeh over the whole timeline
    pmov = os.path.join(tmp, "particles.mov")
    run(["python3", PARTICLES, "--out", pmov, "--dur", "8", "--fps", str(FPS), "--w", str(W), "--h", str(H),
         "--color", a.particle_color], "particles")
    pvid = os.path.join(tmp, "video_p.mp4")
    run(["ffmpeg", "-y", "-hide_banner", "-loglevel", "error", "-i", vid, "-stream_loop", "-1", "-i", pmov,
         "-filter_complex", f"[1:v]colorchannelmixer=aa={float(PARTICLES_OP):.3f}[p];[0:v][p]overlay=shortest=1[v]",
         "-map", "[v]", "-frames:v", str(total_f), *VENC, pvid], "particles overlay")
    vid = pvid
if TRANSITIONS:                                    # whip/wipe sweep masking each b-roll cut
    # cut times = every b-roll segment edge (in/out), minus the timeline start/end.
    edges = sorted({round(f / FPS, 3) for (f0, f1, _) in seg_ranges for f in (f0, f1)}
                   - {0.0, round(total_f / FPS, 3)})
    if edges:
        d = a.transition_dur
        tmov = os.path.join(tmp, "trans.mov")
        run(["python3", TRANSITION, "--out", tmov, "--dur", f"{d}", "--fps", str(FPS), "--w", str(W),
             "--h", str(H), "--style", TRANSITIONS, "--color", a.transition_color], "transition")
        cmd = ["ffmpeg", "-y", "-hide_banner", "-loglevel", "error", "-i", vid]
        for e in edges:
            cmd += ["-itsoffset", f"{max(0.0, e - d / 2):.3f}", "-i", tmov]   # align this sweep to its cut
        fc, prev = [], "0:v"
        for k, e in enumerate(edges, 1):
            t0, t1 = max(0.0, e - d / 2), e + d / 2
            fc.append(f"[{prev}][{k}:v]overlay=0:0:enable='between(t,{t0:.3f},{t1:.3f})'[v{k}]")
            prev = f"v{k}"
        tvid = os.path.join(tmp, "video_t.mp4")
        cmd += ["-filter_complex", ";".join(fc), "-map", f"[{prev}]", "-frames:v", str(total_f), *VENC, tvid]
        run(cmd, "transitions overlay")
        vid = tvid
    print(f"  retention FX: {TRANSITIONS+' transitions' if TRANSITIONS else ''}"
          f"{' + ' if (TRANSITIONS and PARTICLES_OP) else ''}"
          f"{'particles' if PARTICLES_OP else ''} ({len(edges)} cut(s))", flush=True)

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
