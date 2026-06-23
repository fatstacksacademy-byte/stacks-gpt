#!/usr/bin/env python3
"""
make_sfx — synthesize royalty-free placeholder SFX (whoosh / riser / pop) into
assets/sfx/ so the SFX-on-cut stage works out of the box. Stdlib only.

Swap these for nicer ones anytime — build_resolve.py just looks for
assets/sfx/{whoosh,riser,pop}.wav (any of .wav/.mp3/.aif). Sources for better
SFX: mixkit.co, uppbeat.io, pixabay.com (all have free tiers), or a transition
pack like Jamie Fenn's.

  python3 scripts/video-editor/make_sfx.py
"""
import math, os, random, struct, wave

SR = 44100
OUT = "assets/sfx"


def write_wav(name, samples):
    os.makedirs(OUT, exist_ok=True)
    path = os.path.join(OUT, name)
    peak = max(1e-9, max(abs(s) for s in samples))
    with wave.open(path, "w") as w:
        w.setnchannels(1); w.setsampwidth(2); w.setframerate(SR)
        w.writeframes(b"".join(struct.pack("<h", int(max(-1, min(1, s / peak * 0.9)) * 32767)) for s in samples))
    print(f"  ✓ {path}  ({len(samples)/SR:.2f}s)")


def hann(n, total):
    return 0.5 - 0.5 * math.cos(2 * math.pi * n / max(1, total - 1))


def whoosh(dur=0.85):
    # Soft, airy swoosh: filtered noise, gentle cutoff swell, smooth Hann envelope,
    # double low-pass so there's no harsh transient (neutral "shwoo", not a morph hit).
    n = int(SR * dur); out = []; lp1 = lp2 = 0.0
    for i in range(n):
        p = i / n
        x = random.uniform(-1, 1)
        a = 0.012 + 0.22 * math.sin(math.pi * p) ** 2     # lower cutoff = airier
        lp1 += a * (x - lp1)
        lp2 += a * (lp1 - lp2)                             # 2nd pole softens it further
        out.append(lp2 * hann(i, n))
    return out


def riser(dur=1.2):
    # Airy noise-swell riser (no tonal sweep): rising cutoff + rising amplitude.
    n = int(SR * dur); out = []; lp1 = lp2 = 0.0
    for i in range(n):
        p = i / n
        x = random.uniform(-1, 1)
        a = 0.01 + 0.18 * p                               # cutoff rises = builds brightness
        lp1 += a * (x - lp1)
        lp2 += a * (lp1 - lp2)
        out.append(lp2 * (p ** 1.6))                      # amplitude swells in
    return out


def pop(dur=0.13):
    n = int(SR * dur); out = []
    for i in range(n):
        env = math.exp(-i / (SR * 0.025))                  # fast decay
        out.append(math.sin(2 * math.pi * 660 * i / SR) * env)
    return out


if __name__ == "__main__":
    random.seed(7)
    write_wav("whoosh.wav", whoosh())
    write_wav("riser.wav", riser())
    write_wav("pop.wav", pop())
    print(f"SFX → {OUT}/  (placeholders — swap for Mixkit/Uppbeat/PowerMorph)")
