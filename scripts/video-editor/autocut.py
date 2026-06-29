#!/usr/bin/env python3
"""
autocut.py — clean a heavy-ad-lib A-roll automatically, frame-locked (zero A/V drift).

The reusable pipeline distilled from the biz-20apy edit. Cuts on SPEECH (not silence) so
breaths/chuckles/staring go, kills exact repeats acoustically, and renders with the
select-filter + -shortest method so video frames and audio samples never drift.

  WORKFLOW for a new ad-lib recording:
  1. sync-audio.py  --video raw.mov --audio goodmic.aifc   -> measure offset, build synced good.wav
  2. whisper good.wav --model small.en --condition_on_previous_text False --word_timestamps True \
       --output_format json   (LITERAL model — medium.en SMOOTHS repeats and hides them)
  3. python3 autocut.py --video raw.mov --audio good.wav --transcript good.json --front 0 \
       --out CUT.mp4           (first pass: VAD + acoustic-repeat DTW, frame-locked)
  4. (optional, best results) run the semantic-restart workflow over the sentence transcript to
     catch REPHRASING-restarts ("make sure you're keeping/making/earning money" x4) that acoustics
     can't see, plus any director-notes/flubs/filler -> write their [start,end] spans to cuts.json
  5. python3 autocut.py ... --cuts cuts.json --out CUT.mp4   (re-render with the content cuts)

What each layer catches (see feedback_cut_style.md):
  VAD (silero)         breaths, chuckles into the mic, staring/reading gaps, <1s movement, clunky edges
  DTW between-segment  exact restarts with a real pause ("if you took that same $2,000..." x3)
  DTW within-segment   restarts with <300ms gap that VAD groups into one breath (the "comparisons" x3)
  semantic LLM (step4) rephrasing-restarts (different words, same idea) + flubs/"excuse me" + filler
  content cuts (step4) director notes ("if you're editing this..."), specific lines to drop
"""
import os, subprocess, sys, json, argparse
import numpy as np, torch, librosa
from silero_vad import load_silero_vad, get_speech_timestamps

ap = argparse.ArgumentParser()
ap.add_argument("--video", required=True)
ap.add_argument("--audio", required=True, help="synced good-mic wav (from sync-audio.py)")
ap.add_argument("--transcript", default="", help="literal whisper json (small.en) — improves repeat detection")
ap.add_argument("--front", type=float, default=0.0, help="trim everything before this second (clap/false start)")
ap.add_argument("--cuts", default="", help="json: list of [start,end] or {span:[s,e]} extra removes (content/semantic)")
ap.add_argument("--out", required=True)
ap.add_argument("--scale", default="1080", help="output height (1080 review / 2160 final)")
ap.add_argument("--bitrate", default="12M")
ap.add_argument("--dtw", type=float, default=0.55, help="repeat threshold (real repeat ~0.35, distinct ~0.65)")
ap.add_argument("--spans-out", default="", help="also write the kept spans json here")
a = ap.parse_args()

SR = 16000; FPS = 24.0; fa = lambda t: round(t * FPS) / FPS
raw = subprocess.run(["ffmpeg", "-v", "error", "-i", a.audio, "-ac", "1", "-ar", str(SR), "-f", "f32le", "-"],
                     capture_output=True).stdout
y = np.frombuffer(raw, dtype="<f4").astype(np.float32)

# ---- VAD speech segments ----
model = load_silero_vad()
ts = get_speech_timestamps(torch.from_numpy(y.copy()), model, sampling_rate=SR, return_seconds=True,
        threshold=0.55, min_silence_duration_ms=260, speech_pad_ms=60, min_speech_duration_ms=120)
segs = [(t["start"], t["end"]) for t in ts]

def mfcc(s, e):
    aud = y[int(s * SR):int(e * SR)]
    if len(aud) < SR // 5: return None
    m = librosa.feature.mfcc(y=aud, sr=SR, n_mfcc=20, hop_length=256)
    return (m - m.mean(1, keepdims=True)) / (m.std(1, keepdims=True) + 1e-9)
def dtw(X, Y):
    if X is None or Y is None: return 9
    D, wp = librosa.sequence.dtw(X=X, Y=Y, metric="cosine"); return D[-1, -1] / len(wp)

FP = [mfcc(s, min(e, s + 1.3)) for s, e in segs]
# between-segment restarts: drop seg i if a later seg (within 9s) starts the same way -> keep last
drop = [False] * len(segs)
for i in range(len(segs)):
    for j in range(i + 1, len(segs)):
        if segs[j][0] - segs[i][1] > 9: break
        if dtw(FP[i], FP[j]) < a.dtw: drop[i] = True; break
# within-segment restart: a long seg whose opening repeats later inside it -> skip to the last attempt
def trim_internal(s, e):
    if e - s < 3.6: return s
    o = mfcc(s, s + 1.2)
    if o is None: return s
    best = 0.0; d = 1.3
    while d < min(6.0, e - s - 1.3):
        if dtw(o, mfcc(s + d, s + d + 1.2)) < a.dtw: best = d
        d += 0.15
    return s + best
keep = [(trim_internal(s, e), e) for i, (s, e) in enumerate(segs) if not drop[i]]

# ---- subtract content/semantic cuts ----
def sub(spans, c):
    cs, ce = c; out = []
    for s, e in spans:
        if ce <= s or cs >= e: out.append((s, e)); continue
        if cs > s: out.append((s, cs))
        if ce < e: out.append((ce, e))
    return out
removes = []
if a.cuts:
    for c in json.load(open(a.cuts)):
        removes.append(tuple(c["span"] if isinstance(c, dict) else c))
for c in removes: keep = sub(keep, c)

spans = [(fa(max(a.front, s)), fa(e)) for s, e in keep if e > a.front]
spans = [(s, e) for s, e in spans if e - s > 0.08]
print(f"VAD {len(segs)} segs · DTW dropped {sum(drop)} · {len(removes)} content cuts · final {len(spans)} spans "
      f"{sum(e - s for s, e in spans) / 60:.1f}min", flush=True)
if a.spans_out: json.dump([[s, e] for s, e in spans], open(a.spans_out, "w"))

# ---- frame-locked chunked render (select-filter + -shortest; chunk to dodge the expr/decode ceiling) ----
scale_arg = f"scale=-2:{a.scale}" if a.scale != "2160" else "scale=3840:2160"
tmpd = "/tmp/autocut_chunks"; os.makedirs(tmpd, exist_ok=True)
for f in os.listdir(tmpd): os.remove(f"{tmpd}/{f}")
seq = []; MAX = 25
for ci in range(0, len(spans), MAX):
    ch = spans[ci:ci + MAX]
    expr = "+".join(f"between(t,{s:.5f},{e:.5f})" for s, e in ch)
    W0, W1 = ch[0][0], ch[-1][1]; ss = max(0, W0 - 1); t = W1 - ss + 1
    ff = f"/tmp/acflt_{ci}.txt"
    open(ff, "w").write(f"[0:v]select='{expr}',setpts=N/FRAME_RATE/TB,{scale_arg},setsar=1[v];"
                        f"[1:a]aselect='{expr}',asetpts=N/SR/TB[a]")
    o = f"{tmpd}/c{ci:04d}.mp4"
    subprocess.run(["ffmpeg", "-y", "-v", "error", "-hwaccel", "videotoolbox",
        "-copyts", "-ss", f"{ss:.3f}", "-t", f"{t:.3f}", "-i", a.video,
        "-copyts", "-ss", f"{ss:.3f}", "-t", f"{t:.3f}", "-i", a.audio, "-/filter_complex", ff,
        "-map", "[v]", "-map", "[a]", "-shortest", "-c:v", "h264_videotoolbox", "-b:v", a.bitrate,
        "-r", "24", "-pix_fmt", "yuv420p", "-c:a", "aac", "-b:a", "192k", "-movflags", "+faststart", o], check=True)
    seq.append(o)
lst = "/tmp/autocut_cat.txt"; open(lst, "w").write("".join(f"file '{p}'\n" for p in seq))
subprocess.run(["ffmpeg", "-y", "-v", "error", "-f", "concat", "-safe", "0", "-i", lst, "-c", "copy",
                "-movflags", "+faststart", a.out], check=True)
vd = subprocess.run(["ffprobe", "-v", "error", "-select_streams", "v:0", "-show_entries", "stream=duration",
                     "-of", "csv=p=0", a.out], capture_output=True, text=True).stdout.strip()
ad = subprocess.run(["ffprobe", "-v", "error", "-select_streams", "a:0", "-show_entries", "stream=duration",
                     "-of", "csv=p=0", a.out], capture_output=True, text=True).stdout.strip()
print(f"✓ {a.out}  {float(vd)/60:.1f}min  drift {abs(float(vd)-float(ad))*1000:.0f}ms")
