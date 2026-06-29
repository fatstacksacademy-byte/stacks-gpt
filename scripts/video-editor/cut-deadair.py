#!/usr/bin/env python3
"""
cut-deadair.py — light "tighten the pacing" cut for a SCREEN DEMO / screencast.

Unlike cut-single.py (which also kills repeated takes + "excuse me" self-corrections —
great for an ad-lib talking head, risky for a demo where you naturally repeat UI words),
this does ONLY what you want for a product walkthrough: remove dead space and (optionally)
"um/uh" fillers. Nothing else is touched — no retake/repeat detection — so it can't eat a
deliberate repeat or a silent on-screen action you wanted to keep.

Dead space is found from Whisper WORD timestamps (gap between consecutive words), NOT a dB
silence floor — a roomy mic's tone hides real pauses from silencedetect (measured: a -32dB
pass on this demo found 20s; the word-gap pass finds the real fumbles). Renders a final,
postable MP4 directly (trim+concat with tiny audio fades = click-free joins; no Resolve), and
writes keeps.json so remap-cut.py can put the transcript on the CUT timeline (for chapters).

  python3 scripts/video-editor/cut-deadair.py \
    --video build/stacksos-demo/raw.mp4 --words build/stacksos-demo/raw.json \
    --out   ~/Movies/stacksos-demo-CUT.mp4 --min-gap 0.6 --fillers safe
"""
import argparse, json, os, subprocess, sys, re

ap = argparse.ArgumentParser()
ap.add_argument("--video", required=True)
ap.add_argument("--words", required=True, help="Whisper json with word timestamps (segments[].words[])")
ap.add_argument("--out", required=True)
ap.add_argument("--min-gap", type=float, default=0.6, help="remove silent gaps longer than this (s)")
ap.add_argument("--pad", type=float, default=0.10, help="leave this much breathing room around each cut (s)")
ap.add_argument("--front", type=float, default=0.0, help="drop everything before this second (false start / setup)")
ap.add_argument("--tail", type=float, default=0.0, help="drop everything after total-this (trailing fumble)")
ap.add_argument("--fillers", choices=["none", "safe"], default="safe", help="also snip standalone um/uh")
ap.add_argument("--manual-cuts", default="", help="force-remove spans 'a-b,c-d' (source seconds)")
ap.add_argument("--keeps-out", default="", help="write keeps.json here (default: alongside --out)")
ap.add_argument("--fade-ms", type=float, default=6.0)
ap.add_argument("--bitrate", default="12M")
ap.add_argument("--dry", action="store_true", help="compute the cut + write keeps.json/review.md, skip render")
a = ap.parse_args()

VIDEO = os.path.abspath(os.path.expanduser(a.video))
OUT = os.path.abspath(os.path.expanduser(a.out))
KEEPS = os.path.abspath(os.path.expanduser(a.keeps_out)) if a.keeps_out else os.path.splitext(OUT)[0] + ".keeps.json"
REVIEW = os.path.splitext(OUT)[0] + ".review.md"
FILLERS = {"um", "uh", "uhh", "uhm", "umm", "er", "erm", "hmm", "mm", "mhm", "ah", "uhhh"}
_norm = lambda w: re.sub(r"[^a-z0-9']", "", w.lower())
fmt = lambda s: f"{int(s // 60)}:{int(s % 60):02d}"


def probe(*entries):
    return subprocess.run(["ffprobe", "-v", "error", *entries, "-of", "csv=p=0", VIDEO],
                          capture_output=True, text=True).stdout.strip().split("\n")[0]


def load_words(path):
    d = json.load(open(path))
    return [{"word": w["word"], "start": float(w["start"]), "end": float(w["end"])}
            for s in d.get("segments", []) for w in s.get("words", []) if "start" in w and "end" in w]


def parse_spans(spec):
    out = []
    for tok in (t.strip() for t in spec.split(",") if t.strip()):
        x, y = (float(v) for v in tok.split("-"))
        out.append((x, y))
    return out


def main():
    rfr = (probe("-select_streams", "v:0", "-show_entries", "stream=r_frame_rate") or "30/1").split(",")[0]
    num, _, den = rfr.partition("/")
    FPS = round(float(num) / float(den or "1"))
    total = float(probe("-show_entries", "format=duration") or 0)
    if not total:
        sys.exit("cut-deadair: could not probe duration")
    words = load_words(a.words)
    if not words:
        sys.exit(f"cut-deadair: no words in {a.words}")

    removes, fill_n, gap_n = [], 0, 0
    if a.front > 0:
        removes.append((0.0, a.front))
    if a.tail > 0:
        removes.append((total - a.tail, total))
    # leading / trailing silence
    if words[0]["start"] - a.pad > a.min_gap:
        removes.append((max(a.front, 0.0), words[0]["start"] - a.pad)); gap_n += 1
    if total - words[-1]["end"] - a.pad > a.min_gap:
        removes.append((words[-1]["end"] + a.pad, total)); gap_n += 1
    # inter-word dead air
    for i in range(len(words) - 1):
        gap = words[i + 1]["start"] - words[i]["end"]
        if gap > a.min_gap:
            removes.append((words[i]["end"] + a.pad, words[i + 1]["start"] - a.pad)); gap_n += 1
    # standalone fillers
    if a.fillers == "safe":
        for w in words:
            if _norm(w["word"]) in FILLERS:
                removes.append((w["start"] - a.pad / 2, w["end"] + a.pad / 2)); fill_n += 1
    removes += parse_spans(a.manual_cuts)

    # merge + clamp
    removes = sorted((max(0.0, s), min(total, e)) for s, e in removes if e > s)
    merged = []
    for s, e in removes:
        if merged and s <= merged[-1][1] + 0.02:
            merged[-1] = (merged[-1][0], max(merged[-1][1], e))
        else:
            merged.append((s, e))
    # keep = complement
    keeps, cur = [], 0.0
    for s, e in merged:
        if s - cur > 0.05:
            keeps.append((cur, s))
        cur = max(cur, e)
    if total - cur > 0.05:
        keeps.append((cur, total))
    kept = sum(e - s for s, e in keeps)
    removed = sum(e - s for s, e in merged)

    json.dump({"export": VIDEO, "fps": FPS, "total": total, "kept": kept,
               "keeps": [[s, e] for s, e in keeps], "removes": [[s, e] for s, e in merged]},
              open(KEEPS, "w"), indent=2)
    with open(REVIEW, "w") as f:
        f.write(f"# {os.path.basename(OUT)} — {fmt(kept)} kept of {fmt(total)} raw "
                f"(−{removed:.0f}s across {len(merged)} cuts)\n\n")
        f.write(f"{len(keeps)} kept segments · {gap_n} dead-air gaps · {fill_n} fillers\n\n")
        f.write("## Dead-air gaps removed (>1.5s)\n")
        for s, e in merged:
            if e - s > 1.5:
                f.write(f"- {fmt(s)}  {e - s:.1f}s\n")
    print(f"raw {fmt(total)} → cut {fmt(kept)}  (−{removed:.0f}s · {len(keeps)} segs · "
          f"{gap_n} gaps · {fill_n} fillers · {FPS}fps)", flush=True)
    print(f"   keeps: {KEEPS}   review: {REVIEW}", flush=True)
    if a.dry:
        return

    # ---- render: trim+atrim+concat with tiny audio fades (click-free), videotoolbox for speed ----
    fd = a.fade_ms / 1000
    parts = []
    for i, (s, e) in enumerate(keeps):
        fo = max(0.0, (e - s) - fd)
        parts.append(f"[0:v]trim=start={s:.3f}:end={e:.3f},setpts=PTS-STARTPTS[v{i}]")
        parts.append(f"[0:a]atrim=start={s:.3f}:end={e:.3f},asetpts=PTS-STARTPTS,"
                     f"afade=t=in:st=0:d={fd},afade=t=out:st={fo:.3f}:d={fd}[a{i}]")
    graph = ";".join(parts) + ";" + "".join(f"[v{i}][a{i}]" for i in range(len(keeps))) + \
        f"concat=n={len(keeps)}:v=1:a=1[outv][outa]"
    gf = "/tmp/deadair_graph.txt"
    open(gf, "w").write(graph)
    print(f"rendering {len(keeps)} segments → {OUT} …", flush=True)
    subprocess.run(["ffmpeg", "-y", "-v", "error", "-hwaccel", "videotoolbox", "-i", VIDEO,
                    "-/filter_complex", gf, "-map", "[outv]", "-map", "[outa]",
                    "-r", str(FPS), "-fps_mode", "cfr",
                    "-c:v", "h264_videotoolbox", "-b:v", a.bitrate, "-pix_fmt", "yuv420p",
                    "-c:a", "aac", "-b:a", "192k", "-ar", "48000",
                    "-movflags", "+faststart", OUT], check=True)
    vd = float(subprocess.run(["ffprobe", "-v", "error", "-select_streams", "v:0", "-show_entries",
                               "stream=duration", "-of", "csv=p=0", OUT], capture_output=True, text=True).stdout.strip() or 0)
    ad = float(subprocess.run(["ffprobe", "-v", "error", "-select_streams", "a:0", "-show_entries",
                               "stream=duration", "-of", "csv=p=0", OUT], capture_output=True, text=True).stdout.strip() or 0)
    print(f"✓ {OUT}  {fmt(vd)}  drift {abs(vd - ad) * 1000:.0f}ms", flush=True)


if __name__ == "__main__":
    main()
