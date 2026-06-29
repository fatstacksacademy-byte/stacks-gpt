#!/usr/bin/env python3
"""
behind.py — put an asset BEHIND the talking head while he keeps talking: he stays in
front, the asset sits in front of the wall. No green screen — a native macOS Vision
person matte (matte.swift / build/matte, VNGeneratePersonSegmentationRequest) cuts him
out per frame, so it works on any normal A-roll.

Two fits:
  --fit full      the asset fills the frame behind him (replaces the wall)
  --fit element   the asset is a positioned graphic behind him (logo/card/screen),
                  wall still visible around it — pass --pos / --scale

The two flicker fixes from the first outro are baked in:
  • --smooth N  temporal MEDIAN of the matte alpha over N frames (kills the mic/thin-
    object flicker Vision produces frame-to-frame). Default 3.
  • --crossfade S  the asset fades in/out over S seconds at the segment edges, so there's
    no hard pop — and at the edges the frame ≈ the untouched A-roll (seamless in a concat).

  python3 behind.py --face faceclip.mp4 --asset bg.png --dur 4 --out part.mp4 \
     [--fit full|element] [--pos X,Y|fx,fy] [--scale S] [--crossfade 0.3] [--smooth 3]

build-broll calls this for a {"layout":"behind", ...} segment. Honors RENDER_SCALE.
"""
import argparse, os, shutil, subprocess, sys, tempfile
from pathlib import Path
import numpy as np
from PIL import Image

HERE = Path(__file__).resolve().parent
MATTE = HERE / "build" / "matte"
SWIFT = HERE / "matte.swift"


def ensure_matte():
    if MATTE.exists():
        return
    print("· compiling matte.swift (one-time)…", file=sys.stderr)
    MATTE.parent.mkdir(parents=True, exist_ok=True)
    r = subprocess.run(["xcrun", "swiftc", "-O", str(SWIFT), "-o", str(MATTE)], capture_output=True, text=True)
    if r.returncode != 0 or not MATTE.exists():
        sys.exit(f"behind: could not build matte.swift:\n{r.stderr}")


def smoothstep(x):
    x = max(0.0, min(1.0, x))
    return x * x * (3 - 2 * x)


def cover(img, W, H):
    """Scale to FILL W×H then centre-crop (full-screen background)."""
    s = max(W / img.width, H / img.height)
    img = img.resize((max(1, round(img.width * s)), max(1, round(img.height * s))), Image.LANCZOS)
    x = (img.width - W) // 2
    y = (img.height - H) // 2
    return img.crop((x, y, x + W, y + H))


def resolve_pos(pos, W, H, aw, ah):
    """'x,y' px, or 'fx,fy' fractions (any value with a dot). Default: centred on the
    viewer's LEFT third (keeps the right clear for a YouTube end-screen)."""
    if not pos:
        return (int(W * 0.30 - aw / 2), int(H * 0.5 - ah / 2))
    a, b = (p.strip() for p in pos.split(","))
    frac = "." in a or "." in b
    x = int(float(a) * (W if frac else 1)) - (aw // 2 if frac else 0)
    y = int(float(b) * (H if frac else 1)) - (ah // 2 if frac else 0)
    return (x, y)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--face", required=True)
    ap.add_argument("--asset", required=True)
    ap.add_argument("--out", required=True)
    ap.add_argument("--dur", type=float, required=True)
    ap.add_argument("--fps", type=int, default=24)
    ap.add_argument("--fit", choices=["full", "element"], default="full")
    ap.add_argument("--pos", default=None, help="element top-left 'x,y' (px) or 'fx,fy' (fractions; centres there)")
    ap.add_argument("--scale", type=float, default=None, help="element: fraction of frame WIDTH (default 0.35)")
    ap.add_argument("--crossfade", type=float, default=0.3)
    ap.add_argument("--smooth", type=int, default=3, help="temporal alpha median window (odd; 1 = off)")
    a = ap.parse_args()
    if not os.path.exists(a.asset):
        sys.exit(f"behind: asset not found: {a.asset}")
    ensure_matte()

    S = max(1, int(os.environ.get("RENDER_SCALE", "2")))
    W, H = 1920 * S, 1080 * S
    nf = max(1, round(a.dur * a.fps))
    tmp = Path(tempfile.mkdtemp(prefix="behind-"))
    try:
        rawd, cutd, outd = tmp / "raw", tmp / "cut", tmp / "out"
        for d in (rawd, cutd, outd):
            d.mkdir()

        # 1) face frames at W×H
        subprocess.run(["ffmpeg", "-y", "-v", "error", "-i", a.face,
                        "-vf", f"scale={W}:{H}:force_original_aspect_ratio=decrease,"
                               f"pad={W}:{H}:(ow-iw)/2:(oh-ih)/2,fps={a.fps}",
                        "-frames:v", str(nf), f"{rawd}/%04d.png"], check=True)
        frames = sorted(rawd.glob("*.png"))
        if not frames:
            sys.exit("behind: no frames extracted from --face")

        # 2) Vision person matte → RGBA cutouts (same filenames)
        subprocess.run([str(MATTE), str(rawd), str(cutd)], check=True)

        # 3) temporal alpha median → kills frame-to-frame flicker (mic, thin objects)
        def alpha_of(name):
            p = cutd / name
            if p.exists():
                return np.array(Image.open(p).split()[-1])
            return np.zeros((H, W), dtype=np.uint8)
        alphas = [alpha_of(f.name) for f in frames]
        sm = a.smooth if a.smooth % 2 == 1 else a.smooth + 1
        if sm > 1 and len(alphas) > 1:
            half = sm // 2
            alphas = [np.median(np.stack(alphas[max(0, i - half):min(len(alphas), i + half + 1)]), axis=0).astype(np.uint8)
                      for i in range(len(alphas))]

        # 4) prep the asset (full-frame cover, or a positioned element)
        asset = Image.open(a.asset).convert("RGBA")
        if a.fit == "full":
            asset = cover(asset, W, H)
            apos = (0, 0)
        else:                                            # element: width = `--scale` fraction of the frame (default 0.35)
            frac = a.scale if a.scale is not None else 0.35
            tw = max(1, round(W * frac))
            asset = asset.resize((tw, max(1, round(asset.height * tw / asset.width))), Image.LANCZOS)
            apos = resolve_pos(a.pos, W, H, asset.width, asset.height)

        # 5) composite: base(room+him) → asset(faded) → his smoothed cutout ON TOP
        cf = max(1, round(a.crossfade * a.fps))
        for i, f in enumerate(frames):
            base = Image.open(f).convert("RGBA")
            af = 1.0
            if i < cf:
                af = smoothstep(i / cf)
            elif i >= len(frames) - cf:
                af = smoothstep((len(frames) - 1 - i) / cf)
            if af > 0.001:
                a_f = asset
                if af < 1.0:
                    al = asset.split()[-1].point(lambda v: int(v * af))
                    a_f = asset.copy(); a_f.putalpha(al)
                base.alpha_composite(a_f, apos)
            cut = Image.open(cutd / f.name).convert("RGBA") if (cutd / f.name).exists() else Image.new("RGBA", (W, H), (0, 0, 0, 0))
            cut.putalpha(Image.fromarray(alphas[i]))
            base.alpha_composite(cut, (0, 0))
            base.convert("RGB").save(outd / f"{i:04d}.png")

        # 6) encode (video-only part for the concat)
        subprocess.run(["ffmpeg", "-y", "-v", "error", "-framerate", str(a.fps), "-i", f"{outd}/%04d.png",
                        "-frames:v", str(nf), "-c:v", "libx264", "-crf", "17", "-preset", "fast",
                        "-pix_fmt", "yuv420p", "-an", a.out], check=True)
        print(f"✓ behind: {os.path.basename(a.out)}  ({nf}f, fit={a.fit}, smooth={sm}, crossfade={a.crossfade}s)")
    finally:
        shutil.rmtree(tmp, ignore_errors=True)


if __name__ == "__main__":
    main()
