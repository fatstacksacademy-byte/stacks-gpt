#!/usr/bin/env python3
"""
preview-full — the "everything" no-Resolve preview. On top of captions + callouts
it adds, via ffmpeg: zoom-punch transitions at section changes + emphasis numbers,
whoosh SFX on section changes, riser SFX on the numbers, and a ducked music bed.
(True morph/whip transitions are the PowerMorph/MagicAnimate GUI step in Resolve;
this approximates with zoom-punch + whoosh, the highest-retention move.)

  python3 scripts/video-editor/preview-full.py --clip clip.mp4 --plan plan.json \
      --music assets/music/kmacleod-enchanted-valley.mp3 --out preview.mp4
"""
import argparse, json, os, re, subprocess, sys

W, H = 1920, 1080

ap = argparse.ArgumentParser()
ap.add_argument("--clip", required=True)
ap.add_argument("--plan", required=True)
ap.add_argument("--out", required=True)
ap.add_argument("--music", default="")
ap.add_argument("--sfx", default="assets/sfx")
ap.add_argument("--lut", default="", help="optional .cube LUT for the brand grade")
ap.add_argument("--no-vignette", action="store_true")
ap.add_argument("--callout-dur", type=float, default=2.2)
a = ap.parse_args()

plan = json.load(open(a.plan))
caps = [c for c in plan.get("captions", []) if c.get("image")]
calls = [c for c in plan.get("callouts", []) if c.get("image")]


def probe(path, *entries):
    return subprocess.run(["ffprobe", "-v", "error", "-show_entries", *entries,
                           "-of", "csv=p=0", path], capture_output=True, text=True).stdout.strip()


dur = float(probe(a.clip, "format=duration") or 0)
fps_raw = probe(a.clip, "stream=r_frame_rate").split("\n")[0] or "30/1"
fps = round(eval(fps_raw)) if "/" in fps_raw else round(float(fps_raw))

# --- section transitions: first caption matching a "new card" cue (12s cooldown) ---
SECTION = re.compile(
    r"\b(card number|first card|first up|number (one|two|three|four|five|six)|next up|moving on|"
    r"let'?s (get into|talk)|sapphire preferred|ink business|bank of america|customized cash|"
    r"u\.?s\.? bank|cash ?plus|usaa|eagle adapt|second card|third card)\b", re.I)
# Sections come from the plan (text layer). Fall back to beats, then a caption scan.
if plan.get("sections"):
    section_t = [s["t"] for s in plan["sections"] if s.get("t") is not None]
elif plan.get("beats"):
    section_t, seen = [], set()
    for b in plan["beats"]:
        if b.get("section") and b["section"] not in seen:
            seen.add(b["section"]); section_t.append(b["t"])
else:
    section_t, last = [], -99
    for c in caps:
        if SECTION.search(c["text"]) and c["t"] - last > 12:
            section_t.append(c["t"]); last = c["t"]
callout_t = [c["t"] for c in calls]
_rev = [c["t"] for c in calls if c.get("importance") == "reveal"]  # headline bonuses only
reveal_t, _lr = [], -99  # space reveals ≥6s so consecutive bonuses don't stack
for t in sorted(_rev):
    if t - _lr > 6:
        reveal_t.append(t); _lr = t
# SFX rule (Nathaniel): whoosh/riser fire ONLY on a real section/b-roll transition,
# NEVER on a bare zoom-only emphasis. A reveal earns a riser only when it lands ON a
# section change (a genuine visual cut); a standalone reveal still zooms, silently.
riser_t = [t for t in reveal_t if any(abs(t - s) <= 2.0 for s in section_t)]

# zoom-punch ONLY on section openers + headline reveals, ≥18s apart (Leo: zoom is
# for important moments, not a metronome). Gentle 1.08x, smoothstep-eased so the push
# is continuous sub-pixel motion — NOT zoompan's binary on/off step.
punches, last = [], -99
for t in sorted(section_t + reveal_t):
    if t - last > 18:
        punches.append(t); last = t
RAMP, HOLD = 0.18, 0.22            # ramp-in 0.18s → hold 0.22s → ramp-out 0.18s


def _env(t0):  # trapezoid pulse around t0, clipped to [0,1]
    return f"clip(min((t-{t0 - RAMP:.3f})/{RAMP},({t0 + HOLD + RAMP:.3f}-t)/{RAMP}),0,1)"


def _ss(e):  # smoothstep ease
    return f"({e})*({e})*(3-2*({e}))"


if punches:
    zP = _ss(_env(punches[0]))
    for t in punches[1:]:
        zP = f"max({zP},{_ss(_env(t))})"
else:
    zP = "0"

# --- inputs: clip, overlay PNGs, then music/whoosh/riser ---
overlays = [(c["image"], c["t"], c["end"], "cap") for c in caps] + \
           [(c["image"], c["t"], c["t"] + a.callout_dur, "call") for c in calls]
inputs = ["-i", a.clip]
for ov in overlays:
    inputs += ["-loop", "1", "-i", ov[0]]
n_ov = len(overlays)


def sfx(*names):
    for nm in names:
        for ext in (".wav", ".mp3", ".aif", ".aiff"):
            p = os.path.join(a.sfx, nm + ext)
            if os.path.exists(p):
                return p
    return None


whoosh, riser = sfx("whoosh", "swoosh"), sfx("riser", "rise")
hit_s, hl_s, drone_s = sfx("hit", "impact", "boom"), sfx("highlight", "ding", "tick"), sfx("drone", "pad")
# WHERE the new pillar-4 SFX fire (importance-weighted — these moments are already gated/sparse):
#   hit   = the RELEASE on each headline-bonus reveal (pairs after a riser, or stands alone)
#   hl    = a soft tick when an emphasis CAPTION (a highlighted word) pops
#   drone = a low suspense bed under a "downside / catch" emphasis word
NEG = re.compile(r"\b(GONE|WORSE|WORST|AVOID|WARNING|MISTAKE|DEAD|CAREFUL|CATCH|DOWNSIDE|NEVER)\b")
hit_t = list(reveal_t)
hl_t = [c["t"] for c in caps if c.get("impact")]
drone_t = [c["t"] for c in caps if c.get("impact") and NEG.search(c.get("text", ""))]
idx = n_ov  # next input index
music_slots = []; whoosh_i = riser_i = hit_i = hl_i = drone_i = None
for mf in [f.strip() for f in a.music.split(",")]:   # one OR MORE songs (per-subject mood) → mapped to sections;
    if mf in ("-", "none", "off", "silence"):        # a "-" slot = NO music for that section span (Leo: silence elevates)
        music_slots.append(None)
    elif mf and os.path.exists(mf):
        idx += 1; music_slots.append(idx); inputs += ["-i", mf]
music_idx = [s for s in music_slots if s is not None]   # the real (non-silent) inputs
if whoosh and section_t:
    idx += 1; whoosh_i = idx; inputs += ["-i", whoosh]
if riser and riser_t:
    idx += 1; riser_i = idx; inputs += ["-i", riser]
if hit_s and hit_t:
    idx += 1; hit_i = idx; inputs += ["-i", hit_s]
if hl_s and hl_t:
    idx += 1; hl_i = idx; inputs += ["-i", hl_s]
if drone_s and drone_t:
    idx += 1; drone_i = idx; inputs += ["-i", drone_s]

# --- video graph: normalize → [LUT] → smooth zoom-punch → slide-in overlays → [vignette] ---
# Sub-pixel zoom: scale UP by the eased pulse, then center-crop. scale interpolates
# fractionally (unlike zoompan's integer-step z), so the push reads as smooth.
pre = [f"scale={W}:{H},setsar=1"]
if a.lut and os.path.exists(a.lut):
    pre.append(f"lut3d='{a.lut}'")
pre.append(f"scale=w='{W}*(1+0.08*({zP}))':h='{H}*(1+0.08*({zP}))':eval=frame")
pre.append(f"crop={W}:{H}:'(iw-{W})/2':'(ih-{H})/2'")
fc = [f"[0:v]{','.join(pre)}[zv]"]
prev = "zv"
D = 0.18  # slide-in duration
for i, (_, s, e, kind) in enumerate(overlays, start=1):
    out = f"o{i}"
    if kind == "call":  # chips slide in from the right
        x = f"if(lt(t-{s:.3f},{D}),50*(1-(t-{s:.3f})/{D}),0)"; y = "0"
    else:  # captions slide up
        x = "0"; y = f"if(lt(t-{s:.3f},{D}),36*(1-(t-{s:.3f})/{D}),0)"
    fc.append(f"[{prev}][{i}:v]overlay=x='{x}':y='{y}':enable='between(t,{s:.3f},{e:.3f})'[{out}]")
    prev = out
tail = "format=yuv420p" if a.no_vignette else "vignette=PI/6,format=yuv420p"
fc.append(f"[{prev}]{tail}[vout]")

# --- audio graph: VO + ducked music + whooshes + risers ---
alabels = ["0:a"]
if music_idx:
    # 0.12 under the hook, lift to 0.16 once content starts; the top reveal nearly PAUSES to elevate it.
    sec1 = section_t[0] if section_t else -1
    rt = reveal_t[0] if reveal_t else -1
    base = f"if(gt(t,{sec1:.2f}),0.16,0.12)" if sec1 > 0 else "0.13"
    fout = max(dur - 3, 0)  # clamp: short clips would otherwise get a negative fade-out start
    # BEAT-SYNC the music to the video's structure: at each topic shift, a smooth DIP-then-SWELL —
    # the bed breathes down just before the cut, then PICKS UP into the new section (Leo: "the music
    # picks up, marking the topic shift and making the next segment more exciting"). Triangular ramps.
    swell = "".join(f"*(1-0.40*max(0,1-abs(t-{s - 0.3:.2f})/0.30)+0.42*max(0,1-abs(t-{s + 0.45:.2f})/0.55))" for s in section_t)
    if len(music_slots) == 1:
        core = f"({base}){swell}"
        fc.append(f"[{music_slots[0]}:a]atrim=0:{dur:.2f},afade=t=in:st=0:d={min(2, dur):.2f},"
                  f"afade=t=out:st={fout:.2f}:d={min(3, dur):.2f}[rawbed]")
    else:
        # ONE SONG PER SUBJECT: map slots to section spans round-robin; each fades out→in at the boundary
        # (the song change IS the topic cue — Leo). A None slot ('-') = that section runs with NO music.
        bounds = [0.0] + list(section_t) + [dur]
        spans = [(bounds[k], bounds[k + 1], music_slots[k % len(music_slots)]) for k in range(len(bounds) - 1) if bounds[k + 1] > bounds[k] + 0.6]
        spans = [(s, e, mi) for (s, e, mi) in spans if mi is not None]   # drop SILENT ('-') spans
        if not spans:
            spans = [(0.0, dur, music_idx[0])]
        labels = []
        for k, (s, e, mi) in enumerate(spans):
            dk = e - s; fi = min(0.9, dk / 2); fo = min(1.4 if k == len(spans) - 1 else 0.9, dk / 2)
            fc.append(f"[{mi}:a]atrim=0:{dk:.2f},afade=t=in:st=0:d={fi:.2f},"
                      f"afade=t=out:st={max(0, dk - fo):.2f}:d={fo:.2f},adelay={int(s * 1000)}:all=1[mt{k}]")
            labels.append(f"mt{k}")
        fc.append("".join(f"[{l}]" for l in labels) + f"amix=inputs={len(labels)}:normalize=0:dropout_transition=0[rawbed]")
        core = f"({base}){swell}"   # song change + the dip-then-swell both mark the topic shift
    volexpr = f"if(between(t,{rt - 0.2:.2f},{rt + 0.7:.2f}),0.02,{core})" if rt > 0 else core  # elevate-pause
    fc.append(f"[rawbed]volume='{volexpr}':eval=frame[mus]")
    alabels.append("mus")
if whoosh_i is not None:
    fc.append(f"[{whoosh_i}:a]asplit={len(section_t)}" + "".join(f"[ws{j}]" for j in range(len(section_t))))
    for j, t in enumerate(section_t):
        fc.append(f"[ws{j}]adelay={int(t * 1000)}:all=1,volume=0.38[wd{j}]"); alabels.append(f"wd{j}")
if riser_i is not None:
    fc.append(f"[{riser_i}:a]asplit={len(riser_t)}" + "".join(f"[rs{j}]" for j in range(len(riser_t))))
    for j, t in enumerate(riser_t):
        fc.append(f"[rs{j}]adelay={int(t * 1000)}:all=1,volume=0.38[rd{j}]"); alabels.append(f"rd{j}")
if hit_i is not None:           # RELEASE on each reveal
    fc.append(f"[{hit_i}:a]asplit={len(hit_t)}" + "".join(f"[hts{j}]" for j in range(len(hit_t))))
    for j, t in enumerate(hit_t):
        fc.append(f"[hts{j}]adelay={int(t * 1000)}:all=1,volume=0.42[htd{j}]"); alabels.append(f"htd{j}")
if hl_i is not None:            # soft tick on a highlighted word
    fc.append(f"[{hl_i}:a]asplit={len(hl_t)}" + "".join(f"[hls{j}]" for j in range(len(hl_t))))
    for j, t in enumerate(hl_t):
        fc.append(f"[hls{j}]adelay={int(t * 1000)}:all=1,volume=0.20[hld{j}]"); alabels.append(f"hld{j}")
if drone_i is not None:         # suspense bed under a downside word
    fc.append(f"[{drone_i}:a]asplit={len(drone_t)}" + "".join(f"[drs{j}]" for j in range(len(drone_t))))
    for j, t in enumerate(drone_t):
        fc.append(f"[drs{j}]adelay={int(t * 1000)}:all=1,volume=0.16[drd{j}]"); alabels.append(f"drd{j}")
amix_in = "".join(f"[{l}]" for l in alabels)
fc.append(f"{amix_in}amix=inputs={len(alabels)}:normalize=0:dropout_transition=0[amx]")
fc.append("[amx]alimiter=limit=0.9[aout]")  # headroom for AAC overshoot with the extra SFX layers

cmd = ["ffmpeg", "-y", *inputs, "-filter_complex", ";".join(fc),
       "-map", "[vout]", "-map", "[aout]", "-t", f"{dur:.2f}",
       "-c:v", "libx264", "-crf", "19", "-preset", "veryfast", "-c:a", "aac", a.out]
print(f"sections={len(section_t)} callouts={len(calls)} punches={len(punches)} "
      f"whoosh={len(section_t) if whoosh_i else 0} riser={len(riser_t) if riser_i else 0} "
      f"hit={len(hit_t) if hit_i else 0} hl={len(hl_t) if hl_i else 0} drone={len(drone_t) if drone_i else 0} "
      f"overlays={n_ov} music={len(music_idx) or 'n'} → {a.out}")
r = subprocess.run(cmd, stderr=subprocess.PIPE)
if r.returncode != 0:
    sys.exit(r.stderr.decode()[-2000:])
print(f"✓ {a.out}")
