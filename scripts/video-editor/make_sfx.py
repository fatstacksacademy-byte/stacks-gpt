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
    # soft "graphic appears" pop — a quick RISING bloop (380→900Hz) with a gentle attack + fast decay
    # (his pick from the audition; replaces the old flat 660Hz ping he disliked).
    n = int(SR * dur); out = []
    for i in range(n):
        f = 380 + 520 * (i / n)
        env = min(1.0, i / (SR * 0.004)) * math.exp(-i / (SR * 0.045))   # soft attack, fast decay
        out.append(math.sin(2 * math.pi * f * i / SR) * env)
    return out


def hit(dur=0.6):
    # Leo's "hit": RELEASES tension / emphasises a reveal. A punchy low impact — a sub thump that
    # drops in pitch + a short noise transient for the attack. Pairs after a riser, or stands alone.
    n = int(SR * dur); out = []
    for i in range(n):
        f = 130 - 70 * min(1, i / (SR * 0.18))             # 130→60Hz pitch drop = "boom"
        body = math.sin(2 * math.pi * f * i / SR) * math.exp(-i / (SR * 0.13))
        sub = math.sin(2 * math.pi * 50 * i / SR) * math.exp(-i / (SR * 0.20)) * 0.6
        click = random.uniform(-1, 1) * math.exp(-i / (SR * 0.004)) * 0.5   # transient punch
        out.append(body + sub + click)
    return out


def drone(dur=4.0):
    # Leo's "drone": mystery / suspense bed for darker moments (the "here's the catch / downside").
    # Low layered tone + slow tremolo + filtered noise, gentle fades so it can sit under dialogue.
    n = int(SR * dur); out = []; lp = 0.0
    for i in range(n):
        trem = 0.85 + 0.15 * math.sin(2 * math.pi * 0.3 * i / SR)            # slow breathing
        tone = (math.sin(2 * math.pi * 55 * i / SR) + 0.5 * math.sin(2 * math.pi * 82.5 * i / SR)
                + 0.3 * math.sin(2 * math.pi * 110 * i / SR))
        lp += 0.02 * (random.uniform(-1, 1) - lp)                            # low-passed noise
        fenv = min(1.0, i / (SR * 0.5)) * min(1.0, (n - i) / (SR * 0.5))     # 0.5s fade in/out
        out.append((tone * trem * 0.5 + lp * 0.3) * fenv)
    return out


def highlight(dur=0.3):
    # Leo's "highlight sound": a soft upward shimmer when something gets highlighted (a marker sweep,
    # an emphasis word). Subtle on purpose — a rising filtered-noise swell + a gentle high ping.
    n = int(SR * dur); out = []; lp = 0.0
    for i in range(n):
        p = i / n
        lp += (0.05 + 0.22 * p) * (random.uniform(-1, 1) - lp)              # brightening swell
        ping = math.sin(2 * math.pi * 1320 * i / SR) * math.exp(-i / (SR * 0.06)) * 0.3
        out.append(lp * (p ** 1.3) + ping)
    return out


if __name__ == "__main__":
    random.seed(7)
    write_wav("whoosh.wav", whoosh())
    write_wav("riser.wav", riser())
    write_wav("pop.wav", pop())
    write_wav("hit.wav", hit())
    write_wav("drone.wav", drone())
    write_wav("highlight.wav", highlight())
    print(f"SFX → {OUT}/  (placeholders — swap for Mixkit/Uppbeat/PowerMorph)")
