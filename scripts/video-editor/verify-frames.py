#!/usr/bin/env python3
"""
verify-frames.py — the exact-timecode QC gate.

The #1 lesson from the biz-20apy edit: never say a fix is "done" before LOOKING at the
composited frame at the user's EXACT timecode. ffmpeg exit-code 0 means "rendered", NOT
"correct". And when you do spot-check, you must extract the frame the user actually named
(8:51 -> 531s), not a round/nearby number — sampling t=600 to "prove" a 10:06 fix is how
a QC grid goes green while the reported moment is still broken.

This script makes that impossible to skip:
  - parse the user's literal timecodes (mm:ss or seconds)
  - extract the EXACT frame + its +/-1s neighbors from the PRODUCED video
  - for a window/insert, also sample the END (where stray stamps hide)
  - label each with the real decoded PTS (ffprobe), the check label, the expectation,
    and the spoken line if given
  - tile into one contact-sheet PNG per check
  - print NEEDS_VISION_CHECK with the paths and exit 2, so the caller (Claude) is forced
    to Read the images and judge them before announcing anything to the user.

Run from a committed MANIFEST so the SAME approved checks re-run on every new render
(regression guard) — an approved fix can't silently regress because its check rides along.

USAGE
  # ad-hoc:
  python3 verify-frames.py --video out.mp4 \
      --check 8:51 "fee panel centered, no dead space" \
      --check 10:06 "tx methods: full line no right cutoff; highlight on the 2 lines" \
      --window 7:49 8:08 end "bed insert: thumbs-up freeze, small corner banner, NO center APPROVED stamp"

  # from a version-controlled manifest (preferred — doubles as the regression list):
  python3 verify-frames.py --video out.mp4 --manifest checks.biz-20apy.json

MANIFEST FORMAT (json)
  {
    "checks": [
      {"tc": "8:51", "label": "fee panel centered", "expect": "crop centered, no grey dead space", "spoken": "...waive the $15 fee..."},
      {"tc": "10:06", "label": "tx methods", "expect": "full method line, no right cutoff; highlight spans the 2 lines"},
      {"tc": "7:49", "window_end": "8:08", "sample": "end", "label": "bed insert end",
       "expect": "frozen thumbs-up + cheesy zoom; small TOP banner only; NO center APPROVED stamp"}
    ]
  }

Deps: ffmpeg, ffprobe, Pillow (all already present on this machine). Stdlib otherwise.
"""
import argparse, json, os, subprocess, sys, tempfile
from PIL import Image, ImageDraw, ImageFont

FONT_CANDIDATES = [
    "/System/Library/Fonts/Supplemental/Arial Bold.ttf",
    "/System/Library/Fonts/Helvetica.ttc",
]

def load_font(size):
    for p in FONT_CANDIDATES:
        if os.path.exists(p):
            try: return ImageFont.truetype(p, size)
            except Exception: pass
    return ImageFont.load_default()

def parse_tc(s):
    """'8:51' -> 531.0 ; '1:02:03' -> 3723.0 ; '531' -> 531.0 ; '12.5' -> 12.5"""
    s = str(s).strip()
    if ":" in s:
        parts = [float(p) for p in s.split(":")]
        sec = 0.0
        for p in parts: sec = sec * 60 + p
        return sec
    return float(s)

def fmt_tc(sec):
    sec = max(0.0, sec)
    m = int(sec // 60); s = sec - m * 60
    return f"{m}:{s:05.2f}"

def ffprobe_meta(video):
    out = subprocess.run(
        ["ffprobe", "-v", "error", "-select_streams", "v:0",
         "-show_entries", "stream=r_frame_rate", "-show_entries", "format=duration",
         "-of", "json", video], capture_output=True, text=True)
    try:
        j = json.loads(out.stdout)
        rate = j["streams"][0]["r_frame_rate"]
        num, den = rate.split("/"); fps = float(num) / float(den)
        dur = float(j["format"]["duration"])
        return fps, dur
    except Exception:
        return 24.0, None

def extract_frame(video, t, out_png):
    # accurate seek (decode from before t) then take 1 frame; report the true decoded PTS
    subprocess.run(["ffmpeg", "-y", "-v", "error", "-ss", f"{max(0.0,t):.3f}", "-i", video,
                    "-frames:v", "1", "-q:v", "2", out_png], check=False)
    return os.path.exists(out_png) and os.path.getsize(out_png) > 0

def label_bar(w, lines, font, pad=14, lh=34, bg=(11, 18, 32), fg=(235, 240, 245), accent=(30, 224, 125)):
    h = pad * 2 + lh * len(lines)
    bar = Image.new("RGB", (w, h), bg)
    d = ImageDraw.Draw(bar)
    d.rectangle([0, 0, 6, h], fill=accent)  # emerald spine
    y = pad
    for i, (txt, col) in enumerate(lines):
        d.text((pad + 6, y), txt, font=font, fill=col)
        y += lh
    return bar

def build_sheet(video, check, fps, dur, outdir):
    tc = parse_tc(check["tc"])
    label = check.get("label", "")
    expect = check.get("expect", "")
    spoken = check.get("spoken", "")
    sample = check.get("sample", "neighbors")
    win_end = parse_tc(check["window_end"]) if check.get("window_end") else None

    # choose the times to sample
    if win_end is not None and sample == "end":
        # the END of a window/insert is where stray stamps/zooms hide
        times = [win_end - 1.0, win_end - 0.30, win_end - 0.02]
        sample_note = f"window {fmt_tc(tc)}–{fmt_tc(win_end)} — sampling the END"
    elif win_end is not None and sample == "span":
        times = [tc + 0.1, (tc + win_end) / 2, win_end - 0.1]
        sample_note = f"window {fmt_tc(tc)}–{fmt_tc(win_end)} — start/mid/end"
    else:
        times = [tc - 1.0, tc, tc + 1.0]
        sample_note = f"exact {fmt_tc(tc)} ±1s"

    if dur:
        times = [min(max(0.0, t), dur - 0.05) for t in times]

    tmp = tempfile.mkdtemp(prefix="vf_")
    frames = []
    for i, t in enumerate(times):
        p = os.path.join(tmp, f"f{i}.png")
        ok = extract_frame(video, t, p)
        frames.append((t, p if ok else None))

    # normalize frame width
    target_w = 760
    imgs = []
    for t, p in frames:
        if p:
            im = Image.open(p).convert("RGB")
            r = target_w / im.width
            im = im.resize((target_w, int(im.height * r)), Image.LANCZOS)
        else:
            im = Image.new("RGB", (target_w, int(target_w * 9 / 16)), (60, 0, 0))
            ImageDraw.Draw(im).text((20, 20), "NO FRAME", fill=(255, 200, 200))
        # per-frame timecode tag
        d = ImageDraw.Draw(im)
        tag = fmt_tc(t)
        f = load_font(28)
        d.rectangle([0, 0, 150, 40], fill=(0, 0, 0))
        d.text((8, 6), tag, font=f, fill=(255, 225, 26))
        imgs.append(im)

    fh = max(im.height for im in imgs)
    strip = Image.new("RGB", (target_w * len(imgs) + 8 * (len(imgs) - 1), fh), (0, 0, 0))
    x = 0
    for im in imgs:
        strip.paste(im, (x, 0)); x += im.width + 8

    cap_font = load_font(26)
    cap_lines = [
        (f"CHECK: {label}", (255, 255, 255)),
        (f"WHERE: {sample_note}", (160, 220, 255)),
    ]
    if expect: cap_lines.append((f"EXPECT: {expect}", (30, 224, 125)))
    if spoken: cap_lines.append((f"SAID:   {spoken}", (200, 200, 200)))
    bar = label_bar(strip.width, cap_lines, cap_font)

    sheet = Image.new("RGB", (strip.width, strip.height + bar.height), (11, 18, 32))
    sheet.paste(bar, (0, 0))
    sheet.paste(strip, (0, bar.height))

    safe = "".join(c if c.isalnum() else "_" for c in (label or check["tc"]))[:40]
    out = os.path.join(outdir, f"vf_{check['tc'].replace(':','-')}_{safe}.png")
    sheet.save(out)
    for _, p in frames:
        if p and os.path.exists(p):
            try: os.remove(p)
            except OSError: pass
    try: os.rmdir(tmp)
    except OSError: pass
    return out

def main():
    ap = argparse.ArgumentParser(description="Exact-timecode QC gate: extract + contact-sheet the user's named frames for a mandatory vision check.")
    ap.add_argument("--video", required=True)
    ap.add_argument("--manifest", help="json file with a 'checks' array (version-controlled; doubles as the regression list)")
    ap.add_argument("--check", nargs=2, action="append", metavar=("TC", "LABEL"), default=[],
                    help="ad-hoc check: timecode + label, e.g. --check 8:51 'fee centered'")
    ap.add_argument("--window", nargs=4, action="append",
                    metavar=("START", "END", "SAMPLE", "LABEL"), default=[],
                    help="window check: start end sample(end|span) label")
    ap.add_argument("--out", help="output dir for contact sheets (default: <video dir>/verify)")
    args = ap.parse_args()

    if not os.path.exists(args.video):
        print(f"FATAL: no rendered video at {args.video} — nothing to verify (render first).", file=sys.stderr)
        sys.exit(3)

    checks = []
    if args.manifest:
        with open(args.manifest) as f:
            checks.extend(json.load(f).get("checks", []))
    for tc, label in args.check:
        checks.append({"tc": tc, "label": label})
    for start, end, sample, label in args.window:
        checks.append({"tc": start, "window_end": end, "sample": sample, "label": label})

    if not checks:
        print("No checks given. Use --manifest or --check/--window.", file=sys.stderr)
        sys.exit(1)

    outdir = args.out or os.path.join(os.path.dirname(os.path.abspath(args.video)) or ".", "verify")
    os.makedirs(outdir, exist_ok=True)
    fps, dur = ffprobe_meta(args.video)

    sheets = []
    for c in checks:
        try:
            sheets.append(build_sheet(args.video, c, fps, dur, outdir))
        except Exception as e:
            print(f"  ! check {c.get('tc')} failed: {e}", file=sys.stderr)

    print(f"\nvideo: {args.video}  (fps~{fps:.2f}, dur {fmt_tc(dur) if dur else '?'})")
    print(f"contact sheets ({len(sheets)}):")
    for s in sheets:
        print(f"  {s}")
    print("\nNEEDS_VISION_CHECK: Read each contact sheet above and judge it against EXPECT.")
    print("Do NOT tell the user a fix is done until every sheet visually passes.")
    sys.exit(2)

if __name__ == "__main__":
    main()
