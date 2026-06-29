#!/usr/bin/env python3
"""
skit.py — reusable cutout-skit compositor (Uncle-Dijon-style crude animation).

Renders a JSON skit spec into a video: each actor (PNG cutout) or label (text) gets
keyframed position / scale / rotation / opacity, composited per-frame with Pillow,
then muxed with timed SFX via ffmpeg. Built to drop OVER your talking head as an
overlay (transparent .mov) or stand alone as a Short (flat .mp4).

  # transparent overlay to drop on your timeline while you talk:
  python3 scripts/video-editor/skit.py scripts/video-editor/skit.bank-fee.json --out /tmp/skit.mov --alpha
  # flat preview / standalone Short:
  python3 scripts/video-editor/skit.py scripts/video-editor/skit.bank-fee.json --out /tmp/skit.mp4 --bg "#15202b"

SPEC (JSON):
  canvas:[w,h]  fps  duration  (seconds)
  actors:[ {id, src:"path.png", ease:"smooth"|"linear", keys:[ {t,x,y,scale,angle,alpha}, ...]} ]
  labels:[ {id, text, font, size, color, stroke, strokew, ease, keys:[...]} ]   # drawn on top
  sfx:[ {t, file:"assets/sfx/hit.wav", gain} ]
  shake:[ {t0,t1,amp} ]    # screen-shake windows (decays across the window)
  x,y = CENTER of the element on the canvas. scale multiplies native size. angle in degrees.
"""
import argparse, json, math, os, shutil, subprocess, tempfile
from PIL import Image, ImageDraw, ImageFont

ROOT = os.getcwd()
PROPS = {"x": 0.0, "y": 0.0, "scale": 1.0, "angle": 0.0, "alpha": 1.0}


def lerp(a, b, f): return a + (b - a) * f
def smooth(f): return f * f * (3 - 2 * f)


def sample(keys, t, ease):
    if t <= keys[0]["t"]:
        return {k: keys[0].get(k, PROPS[k]) for k in PROPS}
    if t >= keys[-1]["t"]:
        return {k: keys[-1].get(k, PROPS[k]) for k in PROPS}
    for i in range(len(keys) - 1):
        k0, k1 = keys[i], keys[i + 1]
        if k0["t"] <= t <= k1["t"]:
            span = k1["t"] - k0["t"]
            f = (t - k0["t"]) / span if span > 0 else 0.0
            if ease == "smooth":
                f = smooth(f)
            return {k: lerp(k0.get(k, PROPS[k]), k1.get(k, PROPS[k]), f) for k in PROPS}
    return {k: keys[-1].get(k, PROPS[k]) for k in PROPS}


def load_actor(d):
    return Image.open(os.path.join(ROOT, d["src"])).convert("RGBA")


def render_label(d):
    font = ImageFont.truetype(os.path.join(ROOT, d.get("font", "assets/fonts/Anton-Regular.ttf")), d.get("size", 90))
    text, sw = d["text"], d.get("strokew", 8)
    probe = ImageDraw.Draw(Image.new("RGBA", (10, 10)))
    bbox = probe.multiline_textbbox((0, 0), text, font=font, stroke_width=sw, align="center")
    w, h = int(bbox[2] - bbox[0]) + 24, int(bbox[3] - bbox[1]) + 24
    im = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    ImageDraw.Draw(im).multiline_text((12 - bbox[0], 12 - bbox[1]), text, font=font, align="center",
                                      fill=d.get("color", "#ffffff"), stroke_width=sw, stroke_fill=d.get("stroke", "#000000"))
    return im


def shake_at(shakes, t):
    dx = dy = 0.0
    for s in shakes:
        if s["t0"] <= t <= s["t1"]:
            amp = s.get("amp", 20)
            life = 1 - (t - s["t0"]) / max(1e-3, s["t1"] - s["t0"])
            dx += amp * life * math.sin(t * 90)
            dy += amp * life * math.cos(t * 77)
    return dx, dy


def frame(t, items, canvas, shakes):
    base = Image.new("RGBA", canvas, (0, 0, 0, 0))
    sdx, sdy = shake_at(shakes, t)
    for it in items:
        p = sample(it["keys"], t, it.get("ease", "smooth"))
        if p["alpha"] <= 0.001 or p["scale"] <= 0.001:
            continue
        img = it["_img"]
        if abs(p["scale"] - 1.0) > 1e-3:
            img = img.resize((max(1, int(img.width * p["scale"])), max(1, int(img.height * p["scale"]))), Image.LANCZOS)
        if abs(p["angle"]) > 1e-3:
            img = img.rotate(p["angle"], expand=True, resample=Image.BICUBIC)
        if p["alpha"] < 0.999:
            img = img.copy()
            img.putalpha(img.split()[3].point(lambda v: int(v * p["alpha"])))
        base.alpha_composite(img, (int(p["x"] + sdx - img.width / 2), int(p["y"] + sdy - img.height / 2)))
    return base


def build_audio(sfx, voice, voice_gain, dur, out_wav):
    inputs, filt, labels = [], [], []
    idx = 0
    if voice:
        vpath = voice if os.path.isabs(voice) else os.path.join(ROOT, voice)
        inputs += ["-i", vpath]
        filt.append(f"[{idx}:a]aresample=48000,volume={voice_gain}[v]")
        labels.append("[v]"); idx += 1
    for s in sfx:
        inputs += ["-i", os.path.join(ROOT, s["file"])]
        ms = int(s["t"] * 1000)
        filt.append(f"[{idx}:a]adelay={ms}|{ms},volume={s.get('gain', 1.0)}[a{idx}]")
        labels.append(f"[a{idx}]"); idx += 1
    if not labels:
        subprocess.run(["ffmpeg", "-y", "-v", "error", "-f", "lavfi", "-i", "anullsrc=r=48000:cl=stereo",
                        "-t", f"{dur:.3f}", out_wav], check=True)
        return
    fc = ";".join(filt) + f";{''.join(labels)}amix=inputs={len(labels)}:normalize=0:dropout_transition=0,apad[mix]"
    subprocess.run(["ffmpeg", "-y", "-v", "error", *inputs, "-filter_complex", fc,
                    "-map", "[mix]", "-t", f"{dur:.3f}", "-ar", "48000", "-ac", "2", out_wav], check=True)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("spec")
    ap.add_argument("--out", required=True)
    ap.add_argument("--alpha", action="store_true", help="transparent .mov (overlay over talking head)")
    ap.add_argument("--bg", default="#101418", help="flat-mp4 background color (ignored with --alpha)")
    ap.add_argument("--no-audio", action="store_true",
                    help="render video only (skip the SFX/voice mix) — build-broll uses the global A-roll audio")
    a = ap.parse_args()

    spec = json.load(open(a.spec))
    canvas = tuple(spec.get("canvas", [1920, 1080]))
    fps = spec.get("fps", 30)
    dur = float(spec["duration"])
    shakes = spec.get("shake", [])

    items = []
    for d in spec.get("actors", []):
        d["_img"] = load_actor(d); items.append(d)
    for d in spec.get("labels", []):
        d["_img"] = render_label(d); items.append(d)   # labels appended last => drawn on top

    tmp = tempfile.mkdtemp(prefix="skit_")
    n = int(round(dur * fps))
    for fi in range(n):
        fr = frame(fi / fps, items, canvas, shakes)
        if not a.alpha:
            bg = Image.new("RGBA", canvas, a.bg); bg.alpha_composite(fr); fr = bg.convert("RGB")
        fr.save(os.path.join(tmp, f"{fi:05d}.png"))

    vcodec = ["-c:v", "qtrle", "-pix_fmt", "argb"] if a.alpha else \
             ["-c:v", "libx264", "-preset", "fast", "-crf", "18", "-pix_fmt", "yuv420p"]
    if a.no_audio:                                    # video-only (overlay use — no SFX/voice deps)
        subprocess.run(["ffmpeg", "-y", "-v", "error", "-framerate", str(fps), "-i", os.path.join(tmp, "%05d.png"),
                        *vcodec, "-an", a.out], check=True)
    else:
        aud = os.path.join(tmp, "audio.wav")
        build_audio(spec.get("sfx", []), spec.get("voice"), spec.get("voice_gain", 1.0), dur, aud)
        subprocess.run(["ffmpeg", "-y", "-v", "error", "-framerate", str(fps), "-i", os.path.join(tmp, "%05d.png"),
                        "-i", aud, *vcodec, "-c:a", "aac", "-b:a", "192k", "-shortest", a.out], check=True)
    print(f"✅ {a.out}  ({n} frames @ {fps}fps · {dur:.2f}s · {canvas[0]}x{canvas[1]}{' · alpha' if a.alpha else ''})")
    shutil.rmtree(tmp, ignore_errors=True)


if __name__ == "__main__":
    main()
