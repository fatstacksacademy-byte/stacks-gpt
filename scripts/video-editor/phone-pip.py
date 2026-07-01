#!/usr/bin/env python3
"""
phone-pip.py — sync an iPhone screen-recording to the A-cam by AUDIO, then drop it
in as an over-the-shoulder picture-in-picture. For the "watch me actually add this
bonus on the site" CTA: film the walkthrough on your phone (mic ON) while you talk
to camera, and this lines the two up automatically — no hand-measured offset.

WHY IT WORKS
  When Screen Recording has the Microphone ON (long-press the record button in
  Control Center → Microphone On), the phone clip captures YOUR VOICE too. That
  shared voice is the sync key: we cross-correlate the loudness envelope of the
  phone audio against the A-cam audio and read off the exact offset. Same trick a
  waveform-sync does, but measured for you (add-good-audio.py used to hardcode this).

MODES
  --dry           just measure & print the offset + a confidence score (no render)
  (default)       burn a corner-PiP preview .mp4 so you can eyeball the sync fast
  --resolve NAME  place the phone clip on a new V-track of Resolve timeline NAME at
                  the synced frame, roughly corner-scaled, to refine in the hero pass

USAGE
  # 1) measure only
  python3 scripts/video-editor/phone-pip.py --aroll ~/Desktop/main.mov \
      --phone ~/Desktop/screenrec.mov --dry
  # 2) quick burned preview (bottom-right PiP, phone bezel), only over the CTA window
  python3 scripts/video-editor/phone-pip.py --aroll main.mov --phone screenrec.mov \
      --from 372 --to 410 --corner br --mockup --out build/cta-preview.mp4
  # 3) drop it into the Resolve timeline to finish by hand
  python3 scripts/video-editor/phone-pip.py --aroll main.mov --phone screenrec.mov \
      --resolve "best-cards-tightened" --corner br --size 0.34

NOTES
  * Zero edit-token: ffmpeg measures & renders; tokens only pay for this reasoning.
  * If the phone clip has no/near-silent audio (mic was OFF), auto-sync can't work —
    the tool says so and you fall back to --offset <sec> (or a visible clap on cam).
  * Never cover his face: default corner is br; pick the corner OPPOSITE his framing.
"""
import argparse, os, subprocess, sys, tempfile
import numpy as np
from scipy import signal

REPO = os.getcwd()
def abspath(p): return p if os.path.isabs(p) else os.path.join(REPO, p)
def run(cmd): return subprocess.run(cmd, capture_output=True, text=True)

SR = 8000          # audio decode rate for correlation
HOP = 40           # 40 samples @ 8kHz = 5 ms envelope hop → 200 Hz envelope, 5 ms offset resolution
ENV_RATE = SR / HOP  # 200 Hz


def _probe_dur(path):
    r = run(["ffprobe", "-v", "error", "-show_entries", "format=duration",
             "-of", "csv=p=0", path])
    try: return float(r.stdout.strip())
    except ValueError: return 0.0


def _envelope(path):
    """Decode to mono 8kHz f32, return (z-normalized loudness envelope, mean_rms).

    mean_rms lets us detect a silent phone track (mic was off) before we trust a sync.
    """
    p = run(["ffprobe", "-v", "error", "-select_streams", "a", "-show_entries",
             "stream=index", "-of", "csv=p=0", path])
    if not p.stdout.strip():
        return None, 0.0  # no audio stream at all
    raw = subprocess.run(
        ["ffmpeg", "-v", "error", "-i", path, "-map", "0:a:0", "-f", "f32le",
         "-ac", "1", "-ar", str(SR), "pipe:1"],
        capture_output=True).stdout
    x = np.frombuffer(raw, dtype=np.float32)
    if x.size < HOP * 4:
        return None, 0.0
    n = x.size // HOP
    frames = x[: n * HOP].reshape(n, HOP)
    rms = np.sqrt(np.mean(frames * frames, axis=1) + 1e-12)
    mean_rms = float(np.mean(rms))
    env = 20.0 * np.log10(rms + 1e-6)          # loudness contour (dB) — robust across mics
    env = env - env.mean()
    sd = env.std()
    if sd > 1e-6: env = env / sd               # z-normalize → correlation ≈ correlation coeff
    return env.astype(np.float32), mean_rms


def measure_offset(aroll, phone, win=None):
    """Return (offset_sec, score, margin, warn). offset = A-cam time where phone t=0 lands."""
    a, a_rms = _envelope(aroll)
    p, p_rms = _envelope(phone)
    if a is None:
        return None, 0.0, 0.0, "A-cam has no audio track — can't auto-sync."
    if p is None:
        return None, 0.0, 0.0, "phone clip has no audio track — turn Microphone ON in the screen recording, or pass --offset."
    if p_rms < a_rms * 0.02:
        return None, 0.0, 0.0, "phone audio is near-silent (mic was likely OFF) — auto-sync unreliable; use --offset or a visible clap."
    if win:                                     # restrict A-cam to a region we know overlaps
        s, e = int(win[0] * ENV_RATE), int(win[1] * ENV_RATE)
        a_off = s
        a = a[max(0, s):max(1, e)]
    else:
        a_off = 0
    corr = signal.correlate(a, p, mode="full", method="fft")
    lags = signal.correlation_lags(len(a), len(p), mode="full")
    best = int(np.argmax(corr))
    peak = float(corr[best])
    lag = int(lags[best]) + a_off                # frames of envelope
    offset_sec = lag / ENV_RATE
    n_overlap = min(len(a), len(p))
    score = max(0.0, peak / n_overlap)           # ~correlation coefficient at best lag (0..1)
    # margin vs the best competing peak outside a ±0.5s guard band
    guard = int(0.5 * ENV_RATE)
    masked = corr.copy()
    lo, hi = max(0, best - guard), min(len(corr), best + guard + 1)
    masked[lo:hi] = -np.inf
    second = float(np.max(masked)) if np.isfinite(np.max(masked)) else 0.0
    margin = (peak / second) if second > 1e-6 else 99.0
    warn = None
    if score < 0.20 or margin < 1.15:
        warn = f"low-confidence sync (score {score:.2f}, margin {margin:.2f}) — eyeball the preview; use --offset to override."
    return offset_sec, score, margin, warn


# ---- placement A: burned ffmpeg preview (fast taste check) --------------------

def burn_preview(aroll, phone, offset, out, corner, size, mockup, win):
    fp = "".join(c for c in corner if c in "tlbr")[:2] or "br"
    vert = "top" if "t" in fp else "bottom"
    horiz = "left" if "l" in fp else "right"
    m = 48
    # PiP scaled to `size` of width; keep the phone's own aspect (portrait for a screen rec)
    pip = f"[1:v]setpts=PTS-STARTPTS,scale=iw*{size}:-1[pv]"
    x = f"{m}" if horiz == "left" else f"W-w-{m}"
    y = f"{m}" if vert == "top" else f"H-h-{m}"
    if mockup:  # thin rounded-ish bezel: pad the PiP with a dark border + a hairline
        pip = (f"[1:v]setpts=PTS-STARTPTS,scale=iw*{size}:-1,"
               f"pad=iw+28:ih+28:14:14:color=0x0a0a0aff,"
               f"drawbox=x=2:y=2:w=iw-4:h=ih-4:color=0x2f2f2fff:t=3[pv]")
    enable = ""
    if win:
        enable = f":enable='between(t,{win[0]:.3f},{win[1]:.3f})'"
    fc = f"{pip};[0:v][pv]overlay=x='{x}':y='{y}'{enable}[v]"
    # -itsoffset shifts the phone input onto the A-cam clock (accepts negative offsets)
    cmd = ["ffmpeg", "-y", "-v", "error", "-stats",
           "-i", aroll, "-itsoffset", f"{offset:.3f}", "-i", phone,
           "-/filter_complex", fc, "-map", "[v]", "-map", "0:a?",
           "-c:v", "libx264", "-crf", "18", "-preset", "medium",
           "-pix_fmt", "yuv420p", "-c:a", "aac", "-shortest", out]
    os.makedirs(os.path.dirname(out) or ".", exist_ok=True)
    print(f"burning PiP preview → {out}  (offset {offset:+.3f}s, {corner} @ {size:.0%})", flush=True)
    r = subprocess.run(cmd)
    if r.returncode == 0:
        print(f"✓ {out}  — scrub the CTA window and confirm the taps match your voice.")
    else:
        sys.exit("ffmpeg preview failed (see error above).")


# ---- placement B: into a Resolve timeline (finish in the hero pass) -----------

def place_in_resolve(phone, offset, timeline, corner, size):
    os.environ.setdefault("RESOLVE_SCRIPT_API",
        "/Library/Application Support/Blackmagic Design/DaVinci Resolve/Developer/Scripting")
    os.environ.setdefault("RESOLVE_SCRIPT_LIB",
        "/Applications/DaVinci Resolve/DaVinci Resolve.app/Contents/Libraries/Fusion/fusionscript.so")
    sys.path.insert(0, os.path.join(os.environ["RESOLVE_SCRIPT_API"], "Modules"))
    import DaVinciResolveScript as bmd

    r = bmd.scriptapp("Resolve")
    if not r: sys.exit("Resolve not reachable (open Resolve; Prefs ▸ System ▸ General ▸ External scripting = Local).")
    proj = r.GetProjectManager().GetCurrentProject()
    tl = next((proj.GetTimelineByIndex(i) for i in range(1, proj.GetTimelineCount() + 1)
               if proj.GetTimelineByIndex(i).GetName() == timeline), None)
    if not tl: sys.exit(f"timeline '{timeline}' not found")
    proj.SetCurrentTimeline(tl); r.OpenPage("edit")
    fps = float(proj.GetSetting("timelineFrameRate") or 30.0)
    base = tl.GetStartFrame()
    mp = proj.GetMediaPool()

    imp = mp.ImportMedia([abspath(phone)]) or []
    if not imp: sys.exit("could not import the phone clip into the media pool.")
    clip = imp[0]
    total = int(clip.GetClipProperty("Frames") or 0)

    # negative offset = phone started BEFORE the A-cam → trim the phone head, land at base
    src_start = int(round(max(0.0, -offset) * fps))
    rec = base + int(round(max(0.0, offset) * fps))
    end = max(src_start + 1, total - 1)

    new_track = tl.GetTrackCount("video") + 1
    tl.AddTrack("video")
    ok = mp.AppendToTimeline([{ "mediaPoolItem": clip, "startFrame": src_start,
                                "endFrame": end, "trackIndex": new_track,
                                "recordFrame": rec, "mediaType": 1 }])
    if not ok:
        sys.exit("AppendToTimeline failed — drag the phone clip onto a new video track manually at the synced frame.")

    # best-effort rough corner transform so it doesn't cover his face on arrival
    placed = tl.GetItemListInTrack("video", new_track) or []
    fp = "".join(c for c in corner if c in "tlbr")[:2] or "br"
    W, H, mrg = 1920.0, 1080.0, 40.0
    pan = (W/2 - size*W/2 - mrg) * (-1 if "l" in fp else 1)
    tilt = (H/2 - size*H/2 - mrg) * (1 if "t" in fp else -1)
    tuned = False
    if placed:
        it = placed[-1]
        try:
            for k, v in (("ZoomX", size), ("ZoomY", size), ("Pan", pan), ("Tilt", tilt)):
                it.SetProperty(k, v)
            tuned = True
        except Exception:
            pass
    print(f"✓ placed phone PiP on V{new_track} at {offset:+.3f}s (frame {rec}); "
          f"transform {'set to '+corner if tuned else 'NOT set — nudge scale/position in Inspector'}.")
    print("  Finish in the hero pass: size/position, a soft drop-shadow, and (optional) a phone-bezel frame.")


def main():
    ap = argparse.ArgumentParser(description="Auto-sync an iPhone screen recording to the A-cam and drop it in as a PiP.")
    ap.add_argument("--aroll", required=True, help="the main talking-head recording")
    ap.add_argument("--phone", required=True, help="the iPhone screen recording (mic ON)")
    ap.add_argument("--dry", action="store_true", help="measure the offset only; no render")
    ap.add_argument("--resolve", metavar="TIMELINE", help="place into this Resolve timeline instead of burning a preview")
    ap.add_argument("--out", default="scripts/video-editor/build/phone-pip-preview.mp4", help="preview output path")
    ap.add_argument("--offset", type=float, help="override the measured offset (seconds; A-cam time where phone t=0 lands)")
    ap.add_argument("--from", dest="t0", type=float, help="CTA window start in A-cam seconds (limits correlation + preview overlay)")
    ap.add_argument("--to", dest="t1", type=float, help="CTA window end in A-cam seconds")
    ap.add_argument("--corner", default="br", help="PiP corner: tl/tr/bl/br (default br — pick the one opposite your face)")
    ap.add_argument("--size", type=float, default=0.33, help="PiP width as a fraction of frame (default 0.33)")
    ap.add_argument("--mockup", action="store_true", help="wrap the PiP in a dark phone bezel (preview mode)")
    args = ap.parse_args()

    aroll, phone = abspath(args.aroll), abspath(args.phone)
    for f in (aroll, phone):
        if not os.path.exists(f): sys.exit(f"not found: {f}")
    win = (args.t0, args.t1) if (args.t0 is not None and args.t1 is not None) else None

    if args.offset is not None:
        offset, score, margin, warn = args.offset, 1.0, 99.0, None
        print(f"using manual offset {offset:+.3f}s (skipping audio measurement)", flush=True)
    else:
        print("measuring audio offset (cross-correlating the shared voice)…", flush=True)
        offset, score, margin, warn = measure_offset(aroll, phone, win)
        if offset is None:
            sys.exit(f"✗ {warn}")
        print(f"offset {offset:+.3f}s  ·  score {score:.2f}  ·  margin {margin:.2f}  "
              f"(phone dur {_probe_dur(phone):.1f}s, A-cam {_probe_dur(aroll):.1f}s)", flush=True)
        if warn: print(f"⚠️  {warn}", flush=True)

    if args.dry:
        print("dry run — no render. Re-run without --dry to burn a preview, or add --resolve <timeline>.")
        return
    if args.resolve:
        place_in_resolve(phone, offset, args.resolve, args.corner, args.size)
    else:
        burn_preview(aroll, phone, offset, abspath(args.out), args.corner, args.size, args.mockup, win)


if __name__ == "__main__":
    main()
