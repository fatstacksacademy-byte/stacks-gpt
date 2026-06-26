#!/usr/bin/env python3.14
"""
qc-audio.py  --  Post-render audio QC for a rendered video master.

FIX #9 in the video-editing QC toolkit. Catches the defects that have shipped
in real cuts: music mixed too loud (integrated LUFS / true-peak out of band),
a single hot insert VO that "blew eardrums" (per-second window way above the
program), a mic glitch / click in the tail, and an A/V truncation/drift canary.

Checks (each becomes one invariant in the sidecar JSON, PASS/FAIL):

  1. LOUDNESS  -- ffmpeg loudnorm print_format=json. Parse input_i (integrated
     LUFS) and input_tp (true peak). FAIL if |input_i - target_lufs| > lufs_band
     or input_tp > tp_max.

  2. HOT WINDOW -- decode the whole file to mono f32, slide a ~1s window, take
     each window's peak dBFS. FAIL if any window peak > hot_window_dbfs. This is
     the hot-VO catcher (one loud insert spikes a single window).

  3. TAIL GLITCH -- decode the last `tail_seconds` to a numpy array.
       click:    max(abs(diff(samples)))  > tail_click_thresh   -> FAIL
       rms cliff: a sudden drop where the last chunk's RMS is more than
                  tail_rms_drop_db below the preceding chunk AND the preceding
                  chunk was actually program (not already silent) -> FAIL
     Catches the end-of-file mic glitch / abrupt truncation.

  4. DRIFT -- ffprobe video vs audio stream duration delta as a truncation
     canary: FAIL if |dur_v - dur_a| > drift_frames / fps. If --source is given,
     additionally cross-correlate the speech-band (300-3400 Hz) RMS envelope of
     master vs source to report an A/V offset estimate (reported, not gated
     unless it exceeds drift_frames).

Outputs:
  <master>.qc.json  -- per-invariant {measured, threshold, pass} verdict.
  <master>.qc.png   -- PIL proof: last-2s waveform (top) + full-file per-second
                       RMS strip (bottom), with any failing region boxed in red.

Exit code: 0 if every invariant passes, 1 if any FAILs, 2 on usage/IO error.

Deps: stdlib + numpy + PIL + ffmpeg/ffprobe only (no matplotlib, no YAML).

Usage:
  python3.14 qc-audio.py MASTER.mp4
  python3.14 qc-audio.py MASTER.mp4 --spec qc-spec.json --source RAW.wav
"""

import argparse
import json
import math
import os
import subprocess
import sys

import numpy as np

try:
    from PIL import Image, ImageDraw, ImageFont
except Exception as e:  # pragma: no cover
    print(f"FAIL: Pillow not importable: {e}", file=sys.stderr)
    sys.exit(2)

SR = 48000  # analysis sample rate (mono)
HERE = os.path.dirname(os.path.abspath(__file__))
DEFAULT_SPEC = os.path.join(HERE, "qc-spec.json")


# ----------------------------------------------------------------------------
# helpers
# ----------------------------------------------------------------------------
def run(cmd):
    return subprocess.run(cmd, capture_output=True)


def db(x):
    """linear amplitude -> dBFS (full scale = 1.0)."""
    return 20.0 * math.log10(float(x) + 1e-12)


def rms_db(arr):
    if arr.size == 0:
        return -120.0
    r = float(np.sqrt(np.mean(arr.astype(np.float64) ** 2)))
    return 20.0 * math.log10(r + 1e-12)


def probe_durations(path):
    """return (video_dur, audio_dur, fmt_dur) in seconds (None if missing)."""
    p = run([
        "ffprobe", "-v", "error",
        "-show_entries", "format=duration:stream=codec_type,duration",
        "-of", "json", path,
    ])
    if p.returncode != 0:
        raise RuntimeError(p.stderr.decode("utf-8", "replace"))
    d = json.loads(p.stdout.decode("utf-8", "replace"))
    vdur = adur = None
    for s in d.get("streams", []):
        if s.get("codec_type") == "video" and s.get("duration"):
            vdur = float(s["duration"])
        elif s.get("codec_type") == "audio" and s.get("duration"):
            adur = float(s["duration"])
    fdur = float(d["format"]["duration"]) if d.get("format", {}).get("duration") else None
    return vdur, adur, fdur


def loudnorm_scan(path, target_lufs, tp_max):
    """ffmpeg loudnorm print_format=json -> (input_i, input_tp)."""
    p = run([
        "ffmpeg", "-hide_banner", "-nostats", "-i", path,
        "-af", f"loudnorm=I={target_lufs}:TP={tp_max}:print_format=json",
        "-f", "null", "-",
    ])
    txt = p.stderr.decode("utf-8", "replace")
    # the JSON blob is the last {...} in stderr
    start = txt.rfind("{")
    end = txt.rfind("}")
    if start == -1 or end == -1 or end < start:
        raise RuntimeError("could not locate loudnorm JSON in ffmpeg output")
    blob = json.loads(txt[start:end + 1])
    return float(blob["input_i"]), float(blob["input_tp"]), blob


def decode_mono(path, ss=None, t=None):
    """decode (a slice of) the file to a mono float32 numpy array at SR."""
    cmd = ["ffmpeg", "-hide_banner", "-nostats"]
    if ss is not None:
        cmd += ["-ss", f"{ss}"]
    if t is not None:
        cmd += ["-t", f"{t}"]
    cmd += ["-i", path, "-ac", "1", "-ar", str(SR), "-f", "f32le", "-"]
    p = run(cmd)
    if p.returncode != 0 and not p.stdout:
        raise RuntimeError(p.stderr.decode("utf-8", "replace"))
    return np.frombuffer(p.stdout, dtype=np.float32)


def per_second_strips(samples, win_sec):
    """return arrays of (time_start, rms_db, peak_db) for each window."""
    w = max(1, int(win_sec * SR))
    n = samples.size
    times, rmsd, peakd = [], [], []
    for i in range(0, n, w):
        seg = samples[i:i + w]
        if seg.size < w // 4:  # skip a runt tail window
            break
        times.append(i / SR)
        rmsd.append(rms_db(seg))
        peakd.append(db(np.abs(seg).max()))
    return np.array(times), np.array(rmsd), np.array(peakd)


# ----------------------------------------------------------------------------
# proof image
# ----------------------------------------------------------------------------
def draw_proof(out_png, tail, tail_sec, times, rms_strip, peak_strip,
               results, spec):
    W, H = 1400, 620
    img = Image.new("RGB", (W, H), (18, 18, 22))
    dr = ImageDraw.Draw(img)
    try:
        font = ImageFont.truetype(
            "/System/Library/Fonts/Supplemental/Arial.ttf", 15)
        fontb = ImageFont.truetype(
            "/System/Library/Fonts/Supplemental/Arial Bold.ttf", 18)
    except Exception:
        font = ImageFont.load_default()
        fontb = font

    overall_fail = any(not r["pass"] for r in results.values())
    head = "AUDIO QC: FAIL" if overall_fail else "AUDIO QC: PASS"
    dr.text((16, 10), head, fill=(255, 90, 90) if overall_fail else (120, 230, 130),
            font=fontb)
    summary = "  ".join(
        f"{k}:{'OK' if v['pass'] else 'X'}" for k, v in results.items())
    dr.text((16, 36), summary, fill=(190, 190, 200), font=font)

    # ---- panel 1: last-N-seconds waveform ----
    p1_y0, p1_h = 80, 200
    mid = p1_y0 + p1_h // 2
    dr.text((16, p1_y0 - 22), f"last {tail_sec:.0f}s waveform (tail-glitch view)",
            fill=(170, 170, 180), font=font)
    dr.rectangle([16, p1_y0, W - 16, p1_y0 + p1_h], outline=(60, 60, 70))
    if tail.size:
        plot_w = W - 32
        # downsample to plot_w columns using min/max per bucket
        idx = np.linspace(0, tail.size, plot_w + 1).astype(int)
        amp = max(1e-4, float(np.abs(tail).max()))
        for x in range(plot_w):
            a, b = idx[x], idx[x + 1]
            if b <= a:
                continue
            seg = tail[a:b]
            lo, hi = float(seg.min()), float(seg.max())
            y1 = mid - int((hi / amp) * (p1_h // 2 - 4))
            y2 = mid - int((lo / amp) * (p1_h // 2 - 4))
            dr.line([16 + x, y1, 16 + x, y2], fill=(90, 170, 240))
        dr.line([16, mid, W - 16, mid], fill=(50, 50, 60))
        # box tail-glitch failure across whole tail panel
        tg = results.get("tail_glitch")
        if tg and not tg["pass"]:
            dr.rectangle([16, p1_y0, W - 16, p1_y0 + p1_h],
                         outline=(255, 60, 60), width=3)
            dr.text((24, p1_y0 + 4),
                    f"TAIL GLITCH  {tg['detail']}", fill=(255, 120, 120),
                    font=fontb)

    # ---- panel 2: full-file per-second strip (RMS line + peak, hot box) ----
    p2_y0, p2_h = 350, 210
    dr.text((16, p2_y0 - 22),
            "full-file per-second level  (blue=RMS, grey=peak)  dBFS",
            fill=(170, 170, 180), font=font)
    dr.rectangle([16, p2_y0, W - 16, p2_y0 + p2_h], outline=(60, 60, 70))
    if times.size:
        DB_TOP, DB_BOT = 0.0, -60.0

        def y_of(d):
            d = max(DB_BOT, min(DB_TOP, d))
            return p2_y0 + int((DB_TOP - d) / (DB_TOP - DB_BOT) * p2_h)

        # gridlines / labels at 0,-6,-14,-30,-60
        for gl in (0, -6, -14, -30, -60):
            gy = y_of(gl)
            dr.line([16, gy, W - 16, gy], fill=(40, 40, 50))
            dr.text((W - 60, gy - 8), f"{gl}", fill=(110, 110, 120), font=font)
        # program-level reference + hot margin (relative metric)
        hw_meas = (results.get("hot_window") or {}).get("measured") or {}
        hw_thr = (results.get("hot_window") or {}).get("threshold") or {}
        ref = float(hw_meas.get("program_rms_db", -20.0))
        margin = float(hw_thr.get("hot_margin_db", 9.0))
        ry = y_of(ref); hy = y_of(ref + margin)
        dr.line([16, ry, W - 16, ry], fill=(80, 140, 90))
        dr.text((20, ry - 16), f"program {ref:.0f} dBFS", fill=(80, 140, 90), font=font)
        dr.line([16, hy, W - 16, hy], fill=(220, 160, 60))
        dr.text((20, hy - 16), f"hot +{margin:.0f} LU", fill=(220, 160, 60), font=font)

        plot_w = W - 32
        n = times.size
        xs = [16 + int(i / max(1, n - 1) * plot_w) for i in range(n)]
        # peak (grey) then rms (blue) polylines
        pk_pts = [(xs[i], y_of(peak_strip[i])) for i in range(n)]
        rm_pts = [(xs[i], y_of(rms_strip[i])) for i in range(n)]
        if len(pk_pts) > 1:
            dr.line(pk_pts, fill=(120, 120, 130), width=1)
            dr.line(rm_pts, fill=(90, 170, 240), width=2)
        # box each hot window in red (window louder than program + margin)
        for i in range(n):
            if rms_strip[i] - ref > margin:
                bx = xs[i]
                bw = max(3, plot_w // max(1, n))
                dr.rectangle([bx - bw // 2, p2_y0, bx + bw // 2, p2_y0 + p2_h],
                             outline=(255, 60, 60), width=2)
        hw = results.get("hot_window")
        if hw and not hw["pass"]:
            dr.text((24, p2_y0 + 4), f"HOT WINDOW  {hw['detail']}",
                    fill=(255, 120, 120), font=fontb)

    img.save(out_png)


# ----------------------------------------------------------------------------
# main
# ----------------------------------------------------------------------------
def main(argv=None):
    ap = argparse.ArgumentParser(
        description="Post-render audio QC (loudness / hot window / tail glitch / drift).")
    ap.add_argument("master", help="rendered master video/audio file")
    ap.add_argument("--spec", default=DEFAULT_SPEC, help="qc-spec.json thresholds")
    ap.add_argument("--source", default=None,
                    help="optional raw source for speech-band A/V offset xcorr")
    ap.add_argument("--json-out", default=None, help="override sidecar .qc.json path")
    ap.add_argument("--png-out", default=None, help="override proof .qc.png path")
    args = ap.parse_args(argv)

    if not os.path.isfile(args.master):
        print(f"FAIL: master not found: {args.master}", file=sys.stderr)
        return 2
    if not os.path.isfile(args.spec):
        print(f"FAIL: spec not found: {args.spec}", file=sys.stderr)
        return 2

    with open(args.spec) as f:
        spec = json.load(f)

    target_lufs = float(spec["target_lufs"])
    band = float(spec.get("lufs_band", 1.0))
    tp_max = float(spec["tp_max"])
    hot_margin_db = float(spec.get("hot_margin_db", 9.0))      # a window this many LU over the program = a hot insert
    abs_peak_dbfs = float(spec.get("abs_peak_dbfs", -0.5))     # absolute clip guard (true-over)
    hot_win = float(spec.get("hot_window_sec", 1.0))
    tail_sec = float(spec.get("tail_seconds", 2.0))
    click_thr = float(spec["tail_click_thresh"])
    rms_drop = float(spec["tail_rms_drop_db"])
    drift_frames = float(spec["drift_frames"])
    fps = float(spec.get("fps", 24.0))

    results = {}  # name -> {measured, threshold, pass, detail}

    print(f"== qc-audio :: {os.path.basename(args.master)} ==")

    # ---- 1. LOUDNESS ----
    try:
        input_i, input_tp, blob = loudnorm_scan(args.master, target_lufs, tp_max)
        lufs_ok = abs(input_i - target_lufs) <= band
        tp_ok = input_tp <= tp_max
        passed = lufs_ok and tp_ok
        detail = (f"I={input_i:.2f} LUFS (target {target_lufs}+/-{band}), "
                  f"TP={input_tp:.2f} dBTP (max {tp_max})")
        results["loudness"] = {
            "measured": {"integrated_lufs": round(input_i, 2),
                         "true_peak_dbtp": round(input_tp, 2)},
            "threshold": {"target_lufs": target_lufs, "lufs_band": band,
                          "tp_max": tp_max},
            "pass": bool(passed), "detail": detail,
        }
        print(f"[{'PASS' if passed else 'FAIL'}] loudness  {detail}")
    except Exception as e:
        results["loudness"] = {"measured": None, "threshold": None,
                               "pass": False, "detail": f"error: {e}"}
        print(f"[FAIL] loudness  error: {e}")

    # ---- decode whole file once for window + strip analysis ----
    full = decode_mono(args.master)
    total_sec = full.size / SR

    # ---- 2. HOT WINDOW (relative: an insert much louder than the rest of the program,
    #         robust to overall loudness; plus an absolute clip guard) ----
    times, rms_strip, peak_strip = per_second_strips(full, hot_win)
    if rms_strip.size:
        voiced = rms_strip[rms_strip > -45.0]                 # ignore near-silence when finding the program level
        ref = float(np.median(voiced)) if voiced.size else float(np.median(rms_strip))
        over = rms_strip - ref
        worst_i = int(np.argmax(over))
        worst_over = float(over[worst_i]); worst_t = float(times[worst_i])
        worst_rms = float(rms_strip[worst_i])
        n_hot = int(np.sum(over > hot_margin_db))             # windows louder than program + margin
        abs_over = int(np.sum(peak_strip > abs_peak_dbfs))    # true clipping windows
        passed = (n_hot == 0) and (abs_over == 0)
        detail = (f"loudest window +{worst_over:.1f} LU over program ({worst_rms:.1f} dBFS RMS) @ {worst_t:.1f}s "
                  f"(margin {hot_margin_db} LU); {n_hot} hot, {abs_over} clip")
        results["hot_window"] = {
            "measured": {"program_rms_db": round(ref, 2),
                         "loudest_over_lu": round(worst_over, 2),
                         "loudest_window_rms_db": round(worst_rms, 2),
                         "at_sec": round(worst_t, 2),
                         "windows_hot": n_hot, "windows_clipping": abs_over},
            "threshold": {"hot_margin_db": hot_margin_db, "abs_peak_dbfs": abs_peak_dbfs, "window_sec": hot_win},
            "pass": bool(passed), "detail": detail,
        }
        print(f"[{'PASS' if passed else 'FAIL'}] hot_window  {detail}")
    else:
        results["hot_window"] = {"measured": None, "threshold": None,
                                 "pass": False, "detail": "no audio windows"}
        print("[FAIL] hot_window  no audio windows")

    # ---- 3. TAIL GLITCH ----
    ss = max(0.0, total_sec - tail_sec)
    tail = decode_mono(args.master, ss=ss, t=tail_sec)
    if tail.size > SR // 10:
        max_diff = float(np.abs(np.diff(tail)).max())
        click_hit = max_diff > click_thr
        # rms cliff: compare last 100ms vs the 1s before it. Only count it as a
        # glitch (not a natural fade-to-silence) if the preceding 1s was program.
        chunk = int(0.1 * SR)
        last = tail[-chunk:]
        prev = tail[-(chunk + SR):-chunk] if tail.size > chunk + SR else tail[:-chunk]
        last_db = rms_db(last)
        prev_db = rms_db(prev)
        drop = prev_db - last_db
        # a real "cliff" = abrupt drop while program was playing. A clean fade
        # lands the tail near silence gradually; require the PREV chunk to be
        # clearly program (> -45 dBFS) and the drop to exceed threshold, and the
        # last chunk to still be near floor (an actual cut-out, not a fade).
        cliff_hit = (drop > rms_drop) and (prev_db > -45.0) and (last_db < -55.0)
        passed = not (click_hit or cliff_hit)
        bits = []
        bits.append(f"max|diff|={max_diff:.4f} (thr {click_thr})"
                    + (" CLICK" if click_hit else ""))
        bits.append(f"rms drop {drop:.1f}dB last100ms (thr {rms_drop})"
                    + (" CLIFF" if cliff_hit else ""))
        detail = "; ".join(bits)
        results["tail_glitch"] = {
            "measured": {"max_abs_diff": round(max_diff, 4),
                         "rms_drop_db": round(drop, 2),
                         "prev_rms_dbfs": round(prev_db, 2),
                         "last_rms_dbfs": round(last_db, 2)},
            "threshold": {"tail_click_thresh": click_thr,
                          "tail_rms_drop_db": rms_drop,
                          "tail_seconds": tail_sec},
            "pass": bool(passed), "detail": detail,
        }
        print(f"[{'PASS' if passed else 'FAIL'}] tail_glitch  {detail}")
    else:
        results["tail_glitch"] = {"measured": None, "threshold": None,
                                  "pass": False, "detail": "tail too short"}
        print("[FAIL] tail_glitch  tail too short")

    # ---- 4. DRIFT ----
    try:
        vdur, adur, fdur = probe_durations(args.master)
        frame_sec = 1.0 / fps
        limit = drift_frames * frame_sec
        if vdur is not None and adur is not None:
            delta = abs(vdur - adur)
            passed = delta <= limit
            detail = (f"v={vdur:.3f}s a={adur:.3f}s delta={delta * 1000:.1f}ms "
                      f"(limit {limit * 1000:.1f}ms = {drift_frames}f@{fps:g})")
        else:
            delta = None
            passed = False
            detail = f"missing stream duration (v={vdur}, a={adur})"
        meas = {"video_dur": vdur, "audio_dur": adur,
                "delta_ms": round(delta * 1000, 2) if delta is not None else None}

        # optional speech-band envelope xcorr vs source (reported)
        if args.source and os.path.isfile(args.source):
            try:
                offset_ms, peak_corr = speechband_offset(args.master, args.source)
                meas["av_offset_ms_vs_source"] = round(offset_ms, 1)
                meas["xcorr_peak"] = round(peak_corr, 3)
                detail += (f"; src offset {offset_ms:+.1f}ms "
                           f"(corr {peak_corr:.2f})")
                if abs(offset_ms) > limit * 1000:
                    passed = False
                    detail += " OFFSET>limit"
            except Exception as e:
                detail += f"; xcorr error: {e}"

        results["drift"] = {
            "measured": meas,
            "threshold": {"drift_frames": drift_frames, "fps": fps,
                          "limit_ms": round(limit * 1000, 2)},
            "pass": bool(passed), "detail": detail,
        }
        print(f"[{'PASS' if passed else 'FAIL'}] drift  {detail}")
    except Exception as e:
        results["drift"] = {"measured": None, "threshold": None,
                            "pass": False, "detail": f"error: {e}"}
        print(f"[FAIL] drift  error: {e}")

    # ---- verdict ----
    overall = all(r["pass"] for r in results.values())
    verdict = {
        "master": os.path.abspath(args.master),
        "spec": os.path.abspath(args.spec),
        "total_sec": round(total_sec, 3),
        "pass": bool(overall),
        "invariants": results,
    }

    json_out = args.json_out or (args.master + ".qc.json")
    png_out = args.png_out or (args.master + ".qc.png")
    with open(json_out, "w") as f:
        json.dump(verdict, f, indent=2)
    draw_proof(png_out, tail, tail_sec, times, rms_strip, peak_strip,
               results, spec)

    print(f"sidecar : {json_out}")
    print(f"proof   : {png_out}")
    print(f"VERDICT : {'PASS' if overall else 'FAIL'}")
    return 0 if overall else 1


def speechband_offset(master, source):
    """Estimate A/V offset (ms) of master vs source via 300-3400Hz RMS envelope
    cross-correlation. Positive = master lags source. Returns (offset_ms, peak)."""
    def envelope(path):
        # bandpass to speech, decode mono, take per-10ms RMS envelope
        cmd = ["ffmpeg", "-hide_banner", "-nostats", "-i", path,
               "-af", "highpass=f=300,lowpass=f=3400",
               "-ac", "1", "-ar", str(SR), "-f", "f32le", "-"]
        p = run(cmd)
        a = np.frombuffer(p.stdout, dtype=np.float32).astype(np.float64)
        hop = int(0.01 * SR)
        n = a.size // hop
        a = a[:n * hop].reshape(n, hop)
        env = np.sqrt((a ** 2).mean(axis=1) + 1e-12)
        env = env - env.mean()
        return env

    em = envelope(master)
    es = envelope(source)
    L = min(em.size, es.size)
    if L < 100:
        raise RuntimeError("envelopes too short")
    em, es = em[:L], es[:L]
    corr = np.correlate(em, es, mode="full")
    lag = int(np.argmax(corr)) - (L - 1)
    peak = float(corr.max() / (np.linalg.norm(em) * np.linalg.norm(es) + 1e-12))
    offset_ms = lag * 10.0  # 10ms hop
    return offset_ms, peak


if __name__ == "__main__":
    try:
        sys.exit(main())
    except KeyboardInterrupt:
        sys.exit(130)
