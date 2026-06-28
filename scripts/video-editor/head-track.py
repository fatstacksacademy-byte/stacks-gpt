#!/usr/bin/env python3
"""
head-track.py — a punch-in that FOLLOWS your head (not a static centre zoom).

A plain zoom-punch crops a fixed rectangle; if you lean or drift while talking,
you slide out of frame. This samples the clip with Apple Vision (the same
`build/vision-roi` used elsewhere), tracks the face centre over time, smooths it,
and renders a zoomed crop whose window *tracks the face* — so a punch-in on a key
line keeps you centred even as you move. Falls back to a steady centre punch when
no face is detected (never jumps).

  # follow-punch a key line (4s window), 1.22× zoom
  python3 scripts/video-editor/head-track.py --in clip.mp4 --start 12 --end 16 --zoom 1.22 --out follow.mp4
  # track the whole clip; inspect the motion track without rendering
  python3 scripts/video-editor/head-track.py --in clip.mp4 --whole --dry

Zero-token, local: Vision + ffmpeg only. The rendered segment is drop-in for
build-broll (use it as the `face`/hero of a segment) or splice over the A-roll.
"""
import argparse, json, os, shutil, subprocess, sys, tempfile
from pathlib import Path

HERE = Path(__file__).resolve().parent
VISION = HERE / "build" / "vision-roi"
SWIFT_SRC = HERE / "vision-roi.swift"


def sh(cmd, **kw):
    return subprocess.run(cmd, capture_output=True, text=True, **kw)


def ensure_vision():
    if VISION.exists():
        return
    print("· compiling vision-roi (one-time)…", file=sys.stderr)
    VISION.parent.mkdir(parents=True, exist_ok=True)
    r = sh(["xcrun", "swiftc", "-O", str(SWIFT_SRC), "-o", str(VISION)])
    if r.returncode != 0 or not VISION.exists():
        sys.exit(f"could not build vision-roi:\n{r.stderr}")


def probe(path):
    r = sh(["ffprobe", "-v", "error", "-select_streams", "v:0", "-show_entries",
            "stream=width,height,r_frame_rate,duration", "-of", "json", path])
    s = json.loads(r.stdout)["streams"][0]
    n, d = (s["r_frame_rate"].split("/") + ["1"])[:2]
    fps = float(n) / float(d or 1)
    dur = float(s.get("duration") or 0)
    return int(s["width"]), int(s["height"]), fps, dur


def ema(seq, alpha):
    """Exponential smoothing that skips None (holds last good value)."""
    out, prev = [], None
    for v in seq:
        if v is None:
            out.append(prev)
        else:
            prev = v if prev is None else alpha * v + (1 - alpha) * prev
            out.append(prev)
    return out


def lerp_track(times, vals, grid):
    """Linear-interpolate a (times→vals) series onto `grid` times. Holds ends."""
    out = []
    j = 0
    for g in grid:
        while j + 1 < len(times) and times[j + 1] <= g:
            j += 1
        if j + 1 >= len(times) or vals[j] is None or vals[j + 1] is None:
            out.append(vals[min(j, len(vals) - 1)])
            continue
        t0, t1 = times[j], times[j + 1]
        f = 0 if t1 == t0 else (g - t0) / (t1 - t0)
        out.append(vals[j] + f * (vals[j + 1] - vals[j]))
    return out


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--in", dest="inp", required=True)
    ap.add_argument("--start", type=float, default=0.0)
    ap.add_argument("--end", type=float, default=None)
    ap.add_argument("--whole", action="store_true", help="track the entire clip")
    ap.add_argument("--zoom", type=float, default=1.2, help="punch-in factor (1.0 = none)")
    ap.add_argument("--fps-sample", type=float, default=8.0, help="Vision samples per second")
    ap.add_argument("--smooth", type=float, default=0.18, help="EMA alpha (lower = smoother/laggier)")
    ap.add_argument("--lead", type=float, default=0.10, help="keep the face this far above centre (0..0.5)")
    ap.add_argument("--out", default=None)
    ap.add_argument("--dry", action="store_true", help="emit the motion track JSON, do not render")
    args = ap.parse_args()

    if args.zoom < 1.0:
        sys.exit("--zoom must be ≥ 1.0")
    ensure_vision()
    W, H, fps, dur = probe(args.inp)
    start = 0.0 if args.whole else max(0.0, args.start)
    end = dur if (args.whole or args.end is None) else min(args.end, dur or args.end)
    if end <= start:
        sys.exit(f"bad range: start={start} end={end} (clip dur={dur:.2f})")
    seg = end - start

    tmp = Path(tempfile.mkdtemp(prefix="headtrack-"))
    try:
        # 1) trim the segment (times become relative to 0)
        clip = tmp / "seg.mp4"
        r = sh(["ffmpeg", "-y", "-ss", f"{start}", "-to", f"{end}", "-i", args.inp,
                "-c:v", "libx264", "-preset", "veryfast", "-crf", "16", "-c:a", "aac", str(clip)])
        if r.returncode != 0:
            sys.exit(f"trim failed:\n{r.stderr[-800:]}")

        # 2) sample frames and read the face centre at each
        n = max(2, int(round(seg * args.fps_sample)))
        times = [seg * i / (n - 1) for i in range(n)]
        cxs, cys, hits = [], [], 0
        for i, t in enumerate(times):
            png = tmp / f"s{i:03d}.png"
            sh(["ffmpeg", "-y", "-ss", f"{t}", "-i", str(clip), "-frames:v", "1", str(png)])
            cx = cy = None
            if png.exists():
                v = sh([str(VISION), str(png)])
                try:
                    face = json.loads(v.stdout).get("face")
                    if face:
                        cx, cy, hits = face["cx"], face["cy"], hits + 1
                except Exception:
                    pass
            cxs.append(cx)
            cys.append(cy)

        face_frac = hits / n
        # 3) smooth; fall back to centre if we almost never saw a face
        if face_frac < 0.25:
            print(f"⚠ face seen in only {hits}/{n} samples → steady CENTRE punch (no follow).", file=sys.stderr)
            sx = [W / 2] * n
            sy = [H / 2] * n
        else:
            sx = ema(cxs, args.smooth)
            sy = ema(cys, args.smooth)
            # keep the head slightly above centre (eyeline), like the A-roll
            sy = [(v - H * args.lead) if v is not None else None for v in sy]
            sx = [v if v is not None else W / 2 for v in sx]
            sy = [v if v is not None else H / 2 for v in sy]

        # 4) crop window (same aspect as source) that follows the centre
        cw = int(round(W / args.zoom)) // 2 * 2
        ch = int(round(H / args.zoom)) // 2 * 2
        out_frames = max(2, int(round(seg * fps)))
        grid = [seg * i / (out_frames - 1) for i in range(out_frames)]
        gx = lerp_track(times, sx, grid)
        gy = lerp_track(times, sy, grid)

        def clampx(c):
            return int(min(max(c - cw / 2, 0), W - cw))

        def clampy(c):
            return int(min(max(c - ch / 2, 0), H - ch))

        track = [{"t": round(g, 3), "x": clampx(x), "y": clampy(y)} for g, x, y in zip(grid, gx, gy)]

        if args.dry:
            xs = [p["x"] for p in track]
            ys = [p["y"] for p in track]
            print(json.dumps({
                "in": args.inp, "range": [start, end], "src": [W, H], "fps": fps,
                "zoom": args.zoom, "crop": [cw, ch], "face_frac": round(face_frac, 2),
                "x_range": [min(xs), max(xs)], "y_range": [min(ys), max(ys)],
                "samples": len(track), "track": track,
            }, indent=2))
            return

        # 5) render: sendcmd drives crop x/y per output frame, then scale back up
        cmds = []
        for p in track:
            cmds.append(f"{p['t']:.3f} crop x {p['x']}, crop y {p['y']};")
        cmd_file = tmp / "follow.cmds"
        cmd_file.write_text("\n".join(cmds))

        out = args.out or str(Path(args.inp).with_suffix("")) + ".follow.mp4"
        vf = (f"sendcmd=f='{cmd_file}',crop=w={cw}:h={ch}:x={track[0]['x']}:y={track[0]['y']},"
              f"scale={W}:{H}:flags=lanczos,setsar=1")
        r = sh(["ffmpeg", "-y", "-i", str(clip), "-vf", vf,
                "-c:v", "libx264", "-preset", "slow", "-crf", "17",
                "-c:a", "copy", out])
        if r.returncode != 0:
            sys.exit(f"render failed:\n{r.stderr[-1200:]}")
        print(f"✓ {out}  ({seg:.1f}s, zoom {args.zoom}×, face {int(face_frac*100)}% of samples, "
              f"x∈[{min(p['x'] for p in track)},{max(p['x'] for p in track)}])")
    finally:
        shutil.rmtree(tmp, ignore_errors=True)


if __name__ == "__main__":
    main()
