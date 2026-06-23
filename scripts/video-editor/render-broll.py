#!/usr/bin/env python3
"""
render-broll.py — composite B-roll + circle-cam onto the flat face cut (ffmpeg).

Reads broll-plan.json (segments: start/end/asset on the v2 cut timeline) + /tmp/face.mp4
(flat v2, 1080p24, audio). Renders the timeline segment-by-segment:
  • face-only gaps  -> straight cut of face.mp4
  • B-roll segments -> B-roll (Ken Burns push) + the face as a circle-cam that morphs
    full-frame -> bottom-left circle and back, with the glowing emerald ring hugging it.
Then concats to ~/Desktop/best-cards-BROLL.mp4. Look matches circlecam-PREVIEW3.
"""
import json, os, subprocess, sys

BUILD = "scripts/video-editor/build/best-cards-june-2026"
FACE, RING, FMASK = "/tmp/face.mp4", "/tmp/ring.mov", "/tmp/fmask1536.png"
OUT = "/Users/nathaniel/Desktop/best-cards-BROLL.mp4"
TMP = "/tmp/bsegs"
ENC = ["-r", "24", "-c:v", "libx264", "-preset", "fast", "-crf", "18",
       "-pix_fmt", "yuv420p", "-c:a", "aac", "-b:a", "192k"]

# circle-cam morph: P = 0 at segment edges (full face), 1 in the middle (corner circle)
def P(T): return f"clip(min(t/0.55\\,({T:.3f}-t)/0.55)\\,0\\,1)"

def broll_fc(T):
    p = P(T)
    inv = f"(1-{p})"
    return (
        f"[0:v]trim=0:{T:.3f},setpts=PTS-STARTPTS,fps=24,scale=1920:1080:force_original_aspect_ratio=increase,"
        f"crop=1920:1080,scale=w=iw*(1+0.07*t/{T:.3f}):h=ih*(1+0.07*t/{T:.3f}):eval=frame,"
        f"crop=1920:1080:(iw-1920)/2:(ih-1080)/2[bg];\n"
        f"[1:v]fps=24,crop=ih:ih:(iw-ih)/2:0,scale=1536:1536,setsar=1[fsq];\n"
        f"[fsq][3:v]alphamerge[fc];\n"
        f"[fc]scale=w=330+1974*{inv}:h=330+1974*{inv}:eval=frame[fz];\n"
        f"[bg][fz]overlay=x=48-1158*{inv}:y=702-1314*{inv}:eval=frame[comp];\n"
        f"[2:v]fps=24,format=rgba,fade=t=in:st=0.45:d=0.15:alpha=1,"
        f"fade=t=out:st={max(0.0,T-0.6):.3f}:d=0.15:alpha=1[ringf];\n"
        f"[comp][ringf]overlay=x=13:y=667[out]"
    )

def run(cmd):
    r = subprocess.run(cmd, capture_output=True, text=True)
    if r.returncode != 0:
        sys.exit("FFMPEG FAIL:\n" + " ".join(cmd) + "\n" + r.stderr[-1500:])

def main():
    plan = json.load(open(f"{BUILD}/broll-plan.json"))
    TOTAL, segs = plan["total"], plan["segments"]
    os.makedirs(TMP, exist_ok=True)
    # interleave face-only gaps with B-roll segments
    tl, cur = [], 0.0
    for s in segs:
        if s["start"] > cur + 0.15: tl.append(("face", cur, s["start"], None))
        tl.append(("broll", s["start"], s["end"], s["asset"]))
        cur = s["end"]
    if cur < TOTAL - 0.15: tl.append(("face", cur, TOTAL, None))

    files = []
    for i, (kind, a, b, asset) in enumerate(tl):
        out = f"{TMP}/seg_{i:03d}.mp4"; files.append(out); T = b - a
        if kind == "face":
            run(["ffmpeg", "-y", "-hide_banner", "-loglevel", "error",
                 "-ss", f"{a:.3f}", "-i", FACE, "-t", f"{T:.3f}", *ENC, out])
        else:
            fcp = f"{TMP}/fc_{i:03d}.txt"; open(fcp, "w").write(broll_fc(T))
            run(["ffmpeg", "-y", "-hide_banner", "-loglevel", "error",
                 "-stream_loop", "-1", "-i", asset,
                 "-ss", f"{a:.3f}", "-i", FACE, "-t", f"{T:.3f}",
                 "-stream_loop", "-1", "-i", RING, "-i", FMASK,
                 "-filter_complex_script", fcp, "-map", "[out]", "-map", "1:a", "-t", f"{T:.3f}",
                 *ENC, out])
        print(f"  [{i+1}/{len(tl)}] {kind:5} {a/60:.1f}-{b/60:.1f}m"
              + (f"  {os.path.basename(asset)}" if asset else ""), flush=True)

    lst = f"{TMP}/list.txt"
    open(lst, "w").write("\n".join(f"file '{f}'" for f in files))
    run(["ffmpeg", "-y", "-hide_banner", "-loglevel", "error", "-f", "concat",
         "-safe", "0", "-i", lst, "-c", "copy", OUT])
    dur = subprocess.run(["ffprobe", "-v", "error", "-show_entries", "format=duration",
                          "-of", "default=nw=1:nk=1", OUT], capture_output=True, text=True).stdout.strip()
    print(f"\n✅ {OUT}  ({float(dur)/60:.1f} min, {len(segs)} B-roll segments)")

if __name__ == "__main__":
    main()
