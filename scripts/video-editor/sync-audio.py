#!/usr/bin/env python3
"""
sync-audio.py — dual-system sound: align a separately-recorded good mic to the camera.

You film with the camera's scratch audio AND a good external mic (Zoom/recorder/lav). They
start at different times and run different lengths. This finds the offset by cross-correlating
the two amplitude envelopes (robust to the different mic timbres — it matches *when things
happen*, not the waveform), then muxes the trimmed good audio onto the video with the video
stream COPIED (no re-encode, fast even on a 6.7GB 4K file).

Generic over any shoot — the offsets are MEASURED, not hardcoded (cf. add-good-audio.py which
was wired to the best-cards take). Output drops straight into cut-single.py as the --export.

  python3 scripts/video-editor/sync-audio.py --video raw.mov --audio good.aifc --out synced.mov
  #   --offset N   skip detection, force the good-audio time that lines up with video t=0
  #   --probe      just print the measured offset + confidence, write nothing
  #   --keep-cam   also keep the camera audio as a 2nd track (default: good mic only)
"""
import argparse, subprocess, sys, os
import numpy as np
from scipy.signal import correlate

ap = argparse.ArgumentParser()
ap.add_argument("--video", required=True, help="the camera file (has scratch audio)")
ap.add_argument("--audio", required=True, help="the good external mic recording")
ap.add_argument("--out", default="", help="muxed output (default: <video stem>-synced.mov)")
ap.add_argument("--offset", type=float, default=None,
                help="skip detection: good-audio seconds that align with video t=0 (good leads = positive)")
ap.add_argument("--probe", action="store_true", help="print offset + confidence, write nothing")
ap.add_argument("--keep-cam", action="store_true", help="keep camera audio as a 2nd track too")
ap.add_argument("--gain", type=float, default=0.0, help="dB gain to apply to the good mic (e.g. 3)")
a = ap.parse_args()

VIDEO = os.path.abspath(os.path.expanduser(a.video))
AUDIO = os.path.abspath(os.path.expanduser(a.audio))
for p in (VIDEO, AUDIO):
    if not os.path.exists(p):
        sys.exit(f"sync-audio: not found: {p}")
stem = os.path.splitext(VIDEO)[0]
OUT = os.path.abspath(os.path.expanduser(a.out)) if a.out else f"{stem}-synced.mov"

DECODE_SR = 8000      # decode both files at this mono rate
ENV_SR = 500          # envelope resolution for the correlation (2ms — sub-frame at 24fps)


def dur(path):
    return float(subprocess.run(["ffprobe", "-v", "error", "-show_entries", "format=duration",
                                 "-of", "csv=p=0", path], capture_output=True, text=True).stdout.strip())


def decode_mono(path, sr):
    """Decode a file to a mono float32 numpy array at sample rate sr."""
    raw = subprocess.run(["ffmpeg", "-v", "error", "-i", path, "-ac", "1", "-ar", str(sr),
                          "-f", "f32le", "-"], capture_output=True).stdout
    return np.frombuffer(raw, dtype="<f4").astype(np.float64)


def envelope(x, sr, env_sr):
    """Rectified, low-passed amplitude envelope decimated to env_sr — timbre-robust."""
    x = np.abs(x)
    win = max(1, sr // env_sr)
    n = (len(x) // win) * win
    env = x[:n].reshape(-1, win).mean(axis=1)
    env = env - env.mean()
    sd = env.std()
    return env / sd if sd > 0 else env


def find_offset():
    """Return (offset_seconds, confidence 0..1). Positive = good mic started BEFORE the camera."""
    vd, ad = dur(VIDEO), dur(AUDIO)
    print(f"  video {vd/60:.1f}m · good audio {ad/60:.1f}m", flush=True)
    cam = envelope(decode_mono(VIDEO, DECODE_SR), DECODE_SR, ENV_SR)
    good = envelope(decode_mono(AUDIO, DECODE_SR), DECODE_SR, ENV_SR)
    # correlate good against cam: peak lag = how far the camera sits INSIDE the good track
    xc = correlate(good, cam, mode="full", method="fft")
    lags = np.arange(-len(cam) + 1, len(good))
    k = int(np.argmax(xc))
    offset = lags[k] / ENV_SR                    # seconds the good mic leads the camera
    # confidence = peak height vs the next-best peak outside a 0.5s guard band
    peak = xc[k]
    guard = int(0.5 * ENV_SR)
    masked = xc.copy()
    masked[max(0, k - guard): min(len(xc), k + guard + 1)] = -np.inf
    second = np.max(masked)
    conf = float(max(0.0, (peak - second) / (abs(peak) + 1e-9)))
    return offset, conf


def main():
    if a.offset is not None:
        offset, conf = a.offset, 1.0
        print(f"  using forced offset {offset:+.3f}s", flush=True)
    else:
        offset, conf = find_offset()
        tag = "good mic leads" if offset >= 0 else "camera leads"
        print(f"  → offset {offset:+.3f}s ({tag}) · confidence {conf:.2f}"
              + ("" if conf >= 0.25 else "  ⚠️ LOW — eyeball a clap or pass --offset"), flush=True)
    if a.probe:
        return

    vd = dur(VIDEO)
    # good audio sub-clip that lines up with the whole video
    ss = max(0.0, offset)
    filt = []
    if offset < 0:           # camera started first → pad the good mic with leading silence
        filt.append(f"adelay={int(-offset*1000)}|{int(-offset*1000)}")
    if a.gain:
        filt.append(f"volume={a.gain}dB")
    af = ",".join(filt) if filt else None

    cmd = ["ffmpeg", "-y", "-v", "error",
           "-i", VIDEO,
           "-ss", f"{ss:.3f}", "-i", AUDIO,
           "-map", "0:v:0",
           "-map", "1:a:0"]
    if a.keep_cam:
        cmd += ["-map", "0:a:0"]
    cmd += ["-c:v", "copy", "-c:a", "pcm_s16le", "-ar", "48000"]
    if af:
        cmd += ["-af", af]
    cmd += ["-t", f"{vd:.3f}", "-movflags", "+faststart", OUT]
    print("  muxing good audio onto the video (video copied)…", flush=True)
    r = subprocess.run(cmd)
    if r.returncode != 0 or not os.path.exists(OUT) or os.path.getsize(OUT) == 0:
        sys.exit("sync-audio: mux failed")
    od = dur(OUT)
    print(f"✓ {OUT}  ({od/60:.1f}m, good mic on A1{' + camera on A2' if a.keep_cam else ''})", flush=True)
    print(f"  next: python3 scripts/video-editor/cut-single.py --export '{OUT}' --dry", flush=True)


if __name__ == "__main__":
    main()
