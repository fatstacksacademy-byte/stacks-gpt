#!/usr/bin/env python3
"""
make_sfx — synthesize the pipeline's SFX into assets/sfx/ with real DSP (numpy +
scipy): proper Butterworth filters, convolution reverb tails for space, detuned
oscillator stacks, an FM bell, and soft saturation — a clear step up from the old
single-pole stdlib placeholders.

Generates riser / hit / highlight / drone / pop (the five that were synth). The
TRANSITION whoosh is a real PowerMorph the user picked — this NEVER overwrites an
existing assets/sfx/whoosh.wav; it writes its synth swoosh to whoosh-synth.wav and
only seeds whoosh.wav if none exists. Drop in your own licensed sounds anytime —
preview-full/build_resolve just look up assets/sfx/<name>.{wav,mp3,aif}.

  python3 scripts/video-editor/make_sfx.py            # regenerate the five + (seed) whoosh
  python3 scripts/video-editor/make_sfx.py --audition # also write an _AUDITION.wav of all of them
"""
import os, sys, wave
import numpy as np
from scipy.signal import butter, lfilter

SR = 44100
OUT = "assets/sfx"
RNG = np.random.default_rng(7)   # deterministic


# ── DSP helpers ──────────────────────────────────────────────────────────────
def n_of(dur):
    return int(SR * dur)

def noise(n):
    return RNG.standard_normal(n).astype(np.float64)

def lp(x, hz, order=2):
    b, a = butter(order, min(0.99, hz / (SR / 2)), "low")
    return lfilter(b, a, x)

def hp(x, hz, order=2):
    b, a = butter(order, max(1e-3, hz / (SR / 2)), "high")
    return lfilter(b, a, x)

def adsr(n, a=0.005, d=0.08, s=0.0, r=0.0, sustain=0.4):
    """Exponential-ish envelope; a/d/r in seconds, sustain level 0..1."""
    env = np.zeros(n)
    ai, di, ri = int(a * SR), int(d * SR), int(r * SR)
    i = 0
    if ai: env[:ai] = np.linspace(0, 1, ai); i = ai
    if di: env[i:i + di] = sustain + (1 - sustain) * np.exp(-np.linspace(0, 4, di)); i += di
    if i < n: env[i:] = sustain
    if ri: env[-ri:] *= np.exp(-np.linspace(0, 5, ri))
    return env

def reverb(x, decay=0.35, mix=0.18):
    """Cheap convolution tail (exp-decayed noise IR) for a sense of space."""
    L = n_of(decay)
    ir = noise(L) * np.exp(-np.linspace(0, 6, L))
    wet = np.convolve(x, ir)[: len(x)]
    wet /= np.max(np.abs(wet)) + 1e-9
    return (1 - mix) * x + mix * wet

def sat(x, drive=1.6):
    return np.tanh(x * drive)

def fade(x, fin=0.01, fout=0.02):
    n = len(x); fi, fo = n_of(fin), n_of(fout)
    if fi: x[:fi] *= np.linspace(0, 1, fi)
    if fo: x[-fo:] *= np.linspace(1, 0, fo)
    return x

def sine(freq, n):
    return np.sin(2 * np.pi * np.cumsum(np.full(n, freq) if np.isscalar(freq) else freq) / SR)


# ── the sounds ───────────────────────────────────────────────────────────────
def riser(dur=1.3):
    # noise swell whose filter OPENS (dark→bright) + a sweeping tonal shimmer + amplitude build.
    n = n_of(dur); env = (np.linspace(0, 1, n)) ** 1.5
    nz = noise(n)
    dark, bright = lp(nz, 500), hp(lp(nz, 9000), 250)
    body = dark * (1 - env) + bright * env * 0.9
    shimmer = np.sin(2 * np.pi * np.cumsum(np.linspace(600, 5000, n)) / SR) * env ** 2 * 0.18
    x = (body * env + shimmer)
    x[-n_of(0.03):] *= np.linspace(1, 0.2, n_of(0.03))   # tiny pre-impact dip
    return reverb(fade(x, 0.02, 0.01), 0.3, 0.15)

def hit(dur=0.7):
    # punchy impact/RELEASE: sub drop + body drop + bright transient, saturated, with a short tail.
    n = n_of(dur); ts = np.arange(n) / SR
    sub = np.sin(2 * np.pi * np.cumsum(np.linspace(55, 38, n)) / SR) * np.exp(-ts / 0.22)
    body = np.sin(2 * np.pi * np.cumsum(np.linspace(120, 70, n)) / SR) * np.exp(-ts / 0.13)
    transient = hp(noise(n), 1500) * np.exp(-ts / 0.012) * 0.7
    x = sat(sub * 0.9 + body * 0.7 + transient, 1.4)
    return reverb(fade(x, 0.001, 0.03), 0.28, 0.16)

def highlight(dur=0.34):
    # bright FM bell + a noise sparkle, fast decay — a soft "this matters" tick.
    n = n_of(dur); ts = np.arange(n) / SR
    car, mod = 1600.0, 1600.0 * 2.0
    bell = np.sin(2 * np.pi * car * ts + 2.2 * np.exp(-ts / 0.05) * np.sin(2 * np.pi * mod * ts))
    bell *= np.exp(-ts / 0.07)
    sparkle = hp(noise(n), 6000) * np.exp(-ts / 0.03) * 0.2
    x = bell * 0.6 + sparkle
    return reverb(fade(x, 0.002, 0.02), 0.3, 0.22)

def drone(dur=4.0):
    # evolving suspense bed: detuned low stack + slow filter LFO + lowpassed noise + tremolo.
    n = n_of(dur); ts = np.arange(n) / SR
    stack = sum(np.sin(2 * np.pi * f * ts) * g
                for f, g in [(55, 1.0), (55.4, 0.6), (82.5, 0.5), (110, 0.3)])
    lfo = 600 + 400 * np.sin(2 * np.pi * 0.12 * ts)        # slow filter movement
    moved = lp(stack, 1200) * (0.6 + 0.4 * np.sin(2 * np.pi * 0.12 * ts))
    bed = lp(noise(n), 350) * 0.4
    trem = 0.85 + 0.15 * np.sin(2 * np.pi * 0.3 * ts)
    x = (moved * 0.5 + bed) * trem
    return fade(reverb(x, 0.5, 0.12), 0.5, 0.5)

def pop(dur=0.14):
    # snappy "graphic appears" blip: quick pitch-up + soft click.
    n = n_of(dur); ts = np.arange(n) / SR
    blip = np.sin(2 * np.pi * np.cumsum(np.linspace(420, 1050, n)) / SR) * np.exp(-ts / 0.045)
    click = hp(noise(n), 2500) * np.exp(-ts / 0.003) * 0.3
    x = blip * 0.9 + click
    return reverb(fade(x, 0.003, 0.02), 0.18, 0.12)

def whoosh_synth(dur=0.85):
    # airy swoosh — only used to SEED whoosh.wav when none exists (never clobbers a real one).
    n = n_of(dur); p = np.linspace(0, 1, n)
    nz = lp(noise(n), 200 + 2600 * np.sin(np.pi * p) ** 2 if False else 1800)
    env = np.sin(np.pi * p) ** 1.2
    return reverb(fade(nz * env, 0.05, 0.05), 0.25, 0.14)


# ── write ────────────────────────────────────────────────────────────────────
def to_wav(name, x, peak=0.9):
    os.makedirs(OUT, exist_ok=True)
    path = os.path.join(OUT, name)
    x = np.asarray(x, dtype=np.float64)
    x = x / (np.max(np.abs(x)) + 1e-9) * peak
    pcm = (np.clip(x, -1, 1) * 32767).astype("<i2")
    with wave.open(path, "w") as w:
        w.setnchannels(1); w.setsampwidth(2); w.setframerate(SR)
        w.writeframes(pcm.tobytes())
    print(f"  ✓ {path}  ({len(x) / SR:.2f}s)")
    return x


if __name__ == "__main__":
    sounds = {"riser": riser(), "hit": hit(), "highlight": highlight(), "drone": drone(), "pop": pop()}
    rendered = {k: to_wav(f"{k}.wav", v) for k, v in sounds.items()}

    # transition whoosh: preserve a real (PowerMorph) whoosh.wav; only seed if missing.
    synth = to_wav("whoosh-synth.wav", whoosh_synth())
    if not any(os.path.exists(os.path.join(OUT, f"whoosh{e}")) for e in (".wav", ".mp3", ".aif")):
        to_wav("whoosh.wav", synth)
        print("  · seeded whoosh.wav from synth (drop in a PowerMorph to replace)")
    else:
        print("  · kept existing whoosh.wav (synth saved as whoosh-synth.wav)")

    if "--audition" in sys.argv:                 # one file with a beat of silence between each
        gap = np.zeros(n_of(0.6))
        seq = np.concatenate([np.concatenate([rendered[k], gap]) for k in sounds] + [synth])
        to_wav("_AUDITION.wav", seq)

    print(f"SFX → {OUT}/  (numpy/scipy DSP; swap any for a licensed pack anytime)")
