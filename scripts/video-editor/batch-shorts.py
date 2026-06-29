#!/usr/bin/env python3
"""
batch-shorts.py — edit a folder of raw clips into finished shorts in one command.

Luuk's "edit shorts 1–18 for me" workflow, done locally and zero-token. Point it
at a directory of scene-exports (Descript "export → scenes → all scenes") OR your
own cut-single.py outputs, and it runs each clip through the no-Resolve short
pipeline and drops a finished .mp4 per clip:

   whisper (word stamps) → correct-captions (#2, fix Citi/Bilt/…) →
   whisper-to-plan (emphasis captions + gold callouts + section beats) →
   render-cards (overlay PNGs) → preview-full (zoom-punches, SFX, music, grade)

Each clip gets an isolated work dir so overlays never collide; one bad clip is
recorded and skipped, never kills the batch; finished steps are cached so a re-run
resumes. A batch-report.md summarizes every clip (matches the report-gaps habit).

  python3 scripts/video-editor/batch-shorts.py --in ~/Downloads/scenes --out build/shorts-2026-06
  python3 scripts/video-editor/batch-shorts.py --in "~/Downloads/scenes/*.mp4" --out build/sh \
      --music assets/music/kmacleod-enchanted-valley.mp3 --lut assets/luts/Fennomenal_X1.cube --vertical
  python3 scripts/video-editor/batch-shorts.py --in ~/Downloads/scenes --out build/sh --dry   # plan only
"""
import argparse, glob, json, os, subprocess, sys, time
from pathlib import Path

HERE = Path(__file__).resolve().parent
VISION = HERE / "build" / "vision-roi"
EXTS = (".mp4", ".mov", ".mkv", ".m4v")


def run(cmd, **kw):
    return subprocess.run(cmd, capture_output=True, text=True, **kw)


def collect_inputs(spec):
    p = Path(os.path.expanduser(spec))
    if p.is_dir():
        files = [f for f in sorted(p.iterdir()) if f.suffix.lower() in EXTS]
    else:
        files = [Path(f) for f in sorted(glob.glob(os.path.expanduser(spec))) if Path(f).suffix.lower() in EXTS]
    return files


def vertical_crop(src, dst):
    """Face-aware static 9:16 crop (1080×1920) — centre the column on the face."""
    r = run(["ffprobe", "-v", "error", "-select_streams", "v:0",
             "-show_entries", "stream=width,height,duration", "-of", "json", str(src)])
    s = json.loads(r.stdout)["streams"][0]
    W, H, dur = int(s["width"]), int(s["height"]), float(s.get("duration") or 6)
    cx = W / 2
    if VISION.exists():
        png = dst.with_suffix(".probe.png")
        run(["ffmpeg", "-y", "-ss", f"{dur/2:.2f}", "-i", str(src), "-frames:v", "1", str(png)])
        if png.exists():
            v = run([str(VISION), str(png)])
            try:
                face = json.loads(v.stdout).get("face")
                if face:
                    cx = face["cx"]
            except Exception:
                pass
            png.unlink(missing_ok=True)
    cw = int(round(H * 9 / 16)) // 2 * 2
    x = int(min(max(cx - cw / 2, 0), W - cw))
    vf = f"crop={cw}:{H}:{x}:0,scale=1080:1920:flags=lanczos,setsar=1"
    r = run(["ffmpeg", "-y", "-i", str(src), "-vf", vf, "-c:v", "libx264", "-preset", "slow",
             "-crf", "18", "-c:a", "copy", str(dst)])
    return r.returncode == 0


def edit_one(clip, work, outdir, args):
    """Run one clip through the pipeline. Returns (status, detail, out_path|None)."""
    stem = clip.stem
    wd = work / stem
    wd.mkdir(parents=True, exist_ok=True)
    tsx = ["npx", "tsx"]

    # 1) transcribe (cached)
    wj = wd / f"{stem}.json"
    if not wj.exists():
        r = run(["whisper", str(clip), "--model", args.whisper_model, "--word_timestamps", "True",
                 "--output_format", "json", "--output_dir", str(wd)])
        if not wj.exists():
            return ("failed", f"whisper: {r.stderr[-200:].strip()}", None)

    # 2) correct mis-heard finance terms (#2)
    cj = wd / f"{stem}.corrected.json"
    r = run(tsx + [str(HERE / "correct-captions.ts"), "--whisper", str(wj), "--out", str(cj)])
    src_json = cj if cj.exists() else wj  # corrector is best-effort; fall back to raw

    # 3) plan (emphasis captions + callouts + sections)
    plan = wd / "plan.json"
    r = run(tsx + [str(HERE / "whisper-to-plan.ts"), str(src_json), str(plan), args.mode])
    if not plan.exists():
        return ("failed", f"whisper-to-plan: {r.stderr[-200:].strip()}", None)

    # 4) overlay PNGs
    r = run(tsx + [str(HERE / "render-cards.ts"), "--plan", str(plan)])
    if r.returncode != 0:
        return ("failed", f"render-cards: {r.stderr[-200:].strip()}", None)

    # 5) render the finished short (zoom-punches, SFX, music, grade)
    out = outdir / f"{stem}.mp4"
    cmd = ["python3", str(HERE / "preview-full.py"), "--clip", str(clip), "--plan", str(plan), "--out", str(out)]
    if args.music:
        cmd += ["--music", args.music]
    if args.lut:
        cmd += ["--lut", args.lut]
    r = run(cmd)
    if not out.exists():
        return ("failed", f"preview-full: {r.stderr[-220:].strip()}", None)

    # 6) optional 9:16 vertical
    if args.vertical:
        vout = outdir / f"{stem}-vertical.mp4"
        if not vertical_crop(out, vout):
            return ("ok-novert", "16:9 ok, vertical crop failed", out)

    # how many corrections did #2 make? (surfaces in the report)
    ncorr = ""
    audit = cj.with_name(cj.stem.replace(".corrected", "") + ".corrected.corrections.md")
    for cand in (wd / f"{stem}.corrected.corrections.md",):
        if cand.exists():
            head = cand.read_text().splitlines()
            ncorr = next((l for l in head if l.startswith("**")), "").strip("*").strip()
    return ("ok", ncorr, out)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--in", dest="inp", required=True, help="dir of clips OR a glob")
    ap.add_argument("--out", required=True, help="output dir for finished shorts")
    ap.add_argument("--whisper-model", default="small.en")
    ap.add_argument("--mode", default="emphasis", choices=["emphasis", "full"])
    ap.add_argument("--music", default="")
    ap.add_argument("--lut", default="")
    ap.add_argument("--vertical", action="store_true", help="also export a face-aware 9:16 cut")
    ap.add_argument("--limit", type=int, default=0, help="only the first N clips (testing)")
    ap.add_argument("--dry", action="store_true", help="list the plan, render nothing")
    args = ap.parse_args()

    clips = collect_inputs(args.inp)
    if args.limit:
        clips = clips[: args.limit]
    if not clips:
        sys.exit(f"no clips ({'/'.join(EXTS)}) found at {args.inp}")

    outdir = Path(os.path.expanduser(args.out))
    work = outdir / "work"
    outdir.mkdir(parents=True, exist_ok=True)
    work.mkdir(parents=True, exist_ok=True)

    print(f"{len(clips)} clip(s) → {outdir}  (model {args.whisper_model}, {args.mode}"
          f"{', +vertical' if args.vertical else ''})")
    if args.dry:
        for c in clips:
            print(f"  · {c.name}  →  {outdir / (c.stem + '.mp4')}")
        print("(dry run — nothing rendered)")
        return

    results = []
    t0 = time.time()
    for i, clip in enumerate(clips, 1):
        print(f"[{i}/{len(clips)}] {clip.name} …", flush=True)
        try:
            status, detail, out = edit_one(clip, work, outdir, args)
        except Exception as e:  # one bad clip never kills the batch
            status, detail, out = ("failed", f"exception: {e}", None)
        results.append((clip.name, status, detail, out))
        mark = {"ok": "✓", "ok-novert": "✓~", "failed": "✗"}.get(status, "?")
        print(f"   {mark} {status}{(' — ' + detail) if detail else ''}")

    # report
    ok = [r for r in results if r[1].startswith("ok")]
    bad = [r for r in results if r[1] == "failed"]
    report = [f"# Batch shorts — {outdir.name}", "",
              f"{len(ok)}/{len(results)} succeeded · {len(bad)} failed · {time.time()-t0:.0f}s", "",
              "| clip | status | detail | output |", "|---|---|---|---|"]
    for name, status, detail, out in results:
        report.append(f"| {name} | {status} | {detail or ''} | {out.name if out else '—'} |")
    (outdir / "batch-report.md").write_text("\n".join(report) + "\n")
    print(f"\n{len(ok)}/{len(results)} ok → {outdir}/batch-report.md")
    if bad:
        print(f"⚠ {len(bad)} failed: " + ", ".join(b[0] for b in bad))


if __name__ == "__main__":
    main()
