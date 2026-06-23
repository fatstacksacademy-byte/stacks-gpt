#!/usr/bin/env python3
"""
render-broll2.py — enhanced B-roll + circle-cam pass (content-matched freeze-frames).

Over v1: each B-roll segment FREEZES on the hero frame that matches what he's saying
(picked by vision), with two layouts — CIRCLE (face bottom-left over full hero) and
SPLIT (big left portrait + cropped key region on the right). Transition = morph-in
(circle) / fade-in (split) + FADE-OUT to full face. Face-only spans get an
OVER-THE-SHOULDER card graphic (upper-left) for the card in play. Tracker gets a
glowing highlight on the "+ Add bonus" button. Output ~/Desktop/best-cards-BROLL2_3.mp4.
"""
import json, os, subprocess, sys

# RENDER_SCALE=1 -> 1080p (proven v2.5); =2 -> native 4K (3840x2160) using the 4K cut face + 2x assets
S = int(os.environ.get("RENDER_SCALE", "1"))
W, H = 1920 * S, 1080 * S
_4k = S == 2
FACE = "/tmp/face4k.mp4" if _4k else "/tmp/face.mp4"
HERO = "/tmp/hero_final"          # 1080 screen-recs; filtergraphs upscale to W:H
ART = "assets/card-art"
RING = "/tmp/ring2x.mov" if _4k else "/tmp/ring.mov"
FMASK = "/tmp/fmask3072.png" if _4k else "/tmp/fmask1536.png"
RRMASK, RRBORDER = "/tmp/rrmask.png", "/tmp/rrborder.png"
TITLES = "/tmp/titles4k" if _4k else "/tmp/titles"
NUMDIR = "/tmp/numbers4k" if _4k else "/tmp/numbers"
INTRODIR = "/tmp/intro4k" if _4k else "/tmp/intro"
PANELDIR = "/tmp/panels4k" if _4k else "/tmp/panels"
CAPPNG = "/tmp/caption_link4k.png" if _4k else "/tmp/caption_link.png"
HLBOX = "/tmp/hlbox.mov"
OUT = ("/Users/nathaniel/Desktop/best-cards-BROLL2_5_4K.mp4" if _4k
       else "/Users/nathaniel/Desktop/best-cards-BROLL2_5.mp4")
TMP = "/tmp/b2segs4k" if _4k else "/tmp/b2segs"
ENC = ["-r", "24", "-c:v", "libx264", "-preset", "fast", "-crf", "18", "-pix_fmt", "yuv420p", "-c:a", "aac", "-b:a", "192k"]

SEGS = [   # times shifted -5.23s after the 6:17 A-roll re-cut ("…also a business card…rules apply" removed)
    dict(start=27.1, end=59.1, layout='circle', hero='sapphire_sub', circle_pos='tl'),  # circle TOP-LEFT so it doesn't cover the struck-through 75k
    dict(start=97.5, end=110.5, layout='panel', panel='sapphire'),       # ALL earning categories (he discusses the new 3x cats)
    dict(start=179.8, end=211.8, layout='circle', hero='inkcash_offer'),  # Chase OFFER page, Ink Cash $750->$1,000 bonus
    dict(start=244.0, end=263.0, layout='panel', panel='inkcash'),       # ALL Ink Cash categories (5%/5%/2%/1%)
    dict(start=332.1, end=362.1, layout='circle', hero='ink_unl'),       # Ink Unlimited column in the comparison grid
    dict(start=369.0, end=375.37, layout='circle',                      # sole-proprietor: application footage (motion); end -0.40 for 6:13 lip-smack cut
         video='/Users/nathaniel/Desktop/chaseinkcashandunlimited.mp4', video_ss=64.0),
    dict(start=376.60, end=388.10, layout='circle',                     # "0% intro APR offer" -> calculator scrolled to the 0% float (+$280)
         video='/Users/nathaniel/Movies/profitability calculator.mp4', video_ss=5.0),
    dict(start=413.97, end=425.97, layout='circle', hero='calculator'), # "punch in numbers" + Year-1 value
    dict(start=502.67, end=507.87, layout='circle', hero='track', kenburns=False,
         highlight=(820, 448, 360, 104)),                               # "Track this bonus" button + gold highlight
    dict(start=507.87, end=517.87, layout='circle',                     # then him USING it in Stacks OS (spend -> "requirement hit")
         video='/Users/nathaniel/Desktop/stacksostracker.mp4', video_ss=8.0),
    dict(start=523.60, end=529.60, layout='circle',                     # "track this bonus in Stacks OS" -> completing the Ink Cash card again
         video='/Users/nathaniel/Desktop/stacksostracker.mp4', video_ss=16.0),
    dict(start=534.27, end=560.77, layout='circle', hero='bofa'),       # BofA 6%/3% rewards
    dict(start=561.0, end=600.0, layout='panel', panel='bofa'),         # ALL BofA cats incl the 6%/3% CHOICE list + 2% + 1%
    dict(start=630.27, end=661.47, layout='circle', hero='usbank'),     # US Bank all 5% categories
    dict(start=662.0, end=690.0, layout='panel', panel='usbank'),       # ALL US Bank cats (he says "I'll leave the other categories on the screen")
    dict(start=699.57, end=719.87, layout='circle', hero='usaa'),       # USAA NEW-badge hero
    dict(start=782.77, end=788.37, layout='circle', hero='state'),      # by-state filter, California
    dict(start=788.37, end=794.77, layout='circle',                     # then the 1,000+ card list scrolling
         video='/Users/nathaniel/Desktop/1000+creditcards.mp4', video_ss=12.0),
    dict(start=816.60, end=824.60, layout='circle', hero='website'),    # "everything's up on fatstacksacademy.com" -> the blog writeup
]
# over-the-shoulder card art per section (cut-time start -> card png), shifted post re-cut + 6:13 lip-smack cut
SECTIONS = [(26, 178, 'chase-sapphire-preferred'), (178, 330, 'chase-ink-business-cash'),
            (330, 532.37, 'chase-ink-business-unlimited'), (532.37, 628.37, 'bofa-customized-cash-rewards-clean'),
            (628.37, 698.37, 'usbank-cash-plus'), (698.37, 764.37, 'usaa-eagle-adapt')]
TOTAL = 845.00

def card_for(t):
    for a, b, c in SECTIONS:
        if a <= t < b: return c
    return None

def run(cmd):
    r = subprocess.run(cmd, capture_output=True, text=True)
    if r.returncode != 0:
        sys.exit("FFMPEG FAIL\n" + " ".join(str(x) for x in cmd) + "\n" + r.stderr[-1800:])

# ---- face-zoom: reframe-on-face punch-ins on emphasis beats (focal locked on his face
# ~1190,388 so it grows in place — no pan), smoothstep ease + 2x-supersample motion blur ----
PUNCH = json.load(open("/tmp/punchlist.json")) if os.path.exists("/tmp/punchlist.json") else []
ZA = 0.35
def _ss(e): return f"({e})*({e})*(3-2*({e}))"
def _env(bt): return f"clip(min(min((t-{bt-0.45:.3f})/0.45\\,({bt+1.45:.3f}-t)/0.45)\\,1)\\,0\\,1)"
def zoom_P(beats):
    P = _ss(_env(beats[0]))
    for b in beats[1:]: P = f"max({P}\\,{_ss(_env(b))})"
    return P

# ---------- filtergraph builders ----------
def kb(T):  # gentle centered Ken Burns zoom on a still hero (6% over T)
    return (f"scale={W}:{H},scale=w={W}*(1+0.06*t/{T:.3f}):h={H}*(1+0.06*t/{T:.3f}):eval=frame,"
            f"crop={W}:{H}:(iw-{W})/2:(ih-{H})/2")

def circle_graph(T, hl, kenburns=True, pos='bl'):
    P = f"clip(t/0.55\\,0\\,1)"; inv = f"(1-{P})"
    ys = (70 if pos == 'tl' else 702) * S    # settled y of the circle (top-left vs bottom-left)
    ry = (35 if pos == 'tl' else 667) * S    # ring overlay y
    bg = kb(T) if kenburns else f"scale={W}:{H},setsar=1"
    g = (f"[0:v]{bg}[bg];\n"
         f"[1:v]split[fa][fb];\n"
         f"[fa]fps=24,crop={860*S}:{860*S}:{720*S}:{40*S},scale={1536*S}:{1536*S},setsar=1[fsq];\n"  # centered on his face
         f"[fsq][3:v]alphamerge[fc];\n"
         f"[fc]scale=w={330*S}+{1974*S}*{inv}:h={330*S}+{1974*S}*{inv}:eval=frame[fz];\n"
         f"[bg][fz]overlay=x={48*S}-{1158*S}*{inv}:y={ys}-{ys + 612*S}*{inv}:eval=frame[comp];\n"
         f"[2:v]fps=24,format=rgba,fade=t=in:st=0.5:d=0.15:alpha=1,fade=t=out:st={max(0,T-0.45):.3f}:d=0.15:alpha=1[ringf];\n"
         f"[comp][ringf]overlay=x={13*S}:y={ry}[comp2];\n")
    last = "comp2"
    if hl:
        x, y, w, h = [v * S for v in hl]; en = f"enable='between(t,0.7,{T-0.45:.3f})'"
        g += (f"[comp2]drawbox=x={x-9*S}:y={y-9*S}:w={w+18*S}:h={h+18*S}:color=0xfbbf24@0.22:t={4*S}:{en},"
              f"drawbox=x={x-4*S}:y={y-4*S}:w={w+8*S}:h={h+8*S}:color=0xfbbf24@0.5:t={3*S}:{en},"
              f"drawbox=x={x}:y={y}:w={w}:h={h}:color=0xfbbf24@0.95:t={6*S}:{en}[comp3];\n"); last = "comp3"
    g += (f"[fb]fps=24,format=rgba,fade=t=in:st={max(0,T-0.4):.3f}:d=0.4:alpha=1[fout];\n"
          f"[{last}][fout]overlay=0:0[out]")
    return g

def split_graph(T, crop):
    cx, cy, cw, ch = crop
    g = (f"[0:v]split[hb][hc];\n"
         f"[hb]scale=1920:1080,boxblur=22,eq=brightness=-0.16[bg];\n"
         f"[hc]crop={cw}:{ch}:{cx}:{cy},scale=1080:1000:force_original_aspect_ratio=increase,crop=1080:1000,setsar=1[panel];\n"
         f"[bg][panel]overlay=x=812:y=40[bg2];\n"
         f"[1:v]split=3[fp][ffi][ffo];\n"
         f"[fp]fps=24,crop=789:1080:565:0,scale=760:1040,setsar=1[port];\n"
         f"[port][3:v]alphamerge[portm];\n"
         f"[bg2][2:v]overlay=x=34:y=8[bg3];\n"
         f"[bg3][portm]overlay=x=40:y=20[comp];\n"
         # two SEPARATE face overlays — chaining fade-out then fade-in clobbers alpha (green-block
         # bug); fade-in face (visible->gone at start) + fade-out face (gone->visible at end) = clean U
         f"[ffi]fps=24,format=rgba,fade=t=out:st=0:d=0.4:alpha=1[fin];\n"
         f"[comp][fin]overlay=0:0[c2];\n"
         f"[ffo]fps=24,format=rgba,fade=t=in:st={max(0,T-0.4):.3f}:d=0.4:alpha=1[fout];\n"
         f"[c2][fout]overlay=0:0[out]")
    return g

def panel_graph(T):
    # BIG category graphic (pre-framed PNG = [0:v]) on the LEFT, face reframed to a portrait on the RIGHT,
    # over a blurred-dark face fill. U-fades so it opens/closes from the full face.
    return (f"[1:v]split=4[bgf][portf][ffi][ffo];\n"
            f"[bgf]scale={W}:{H},boxblur={26*S},eq=brightness=-0.34:saturation=0.55[bg];\n"
            f"[portf]fps=24,crop={637*S}:{1080*S}:{832*S}:0,scale={600*S}:{1018*S},setsar=1[port];\n"
            f"[bg][port]overlay=x={1286*S}:y={31*S}[bg2];\n"            # face portrait, right column
            f"[0:v]fps=24,scale={1200*S}:{980*S}:force_original_aspect_ratio=decrease,setsar=1[pnl];\n"
            f"[bg2][pnl]overlay=x='{30*S}+({1210*S}-overlay_w)/2':y='({H}-overlay_h)/2'[comp];\n"  # graphic, centered left
            f"[ffi]fps=24,format=rgba,fade=t=out:st=0:d=0.4:alpha=1[fin];\n"
            f"[comp][fin]overlay=0:0[c2];\n"
            f"[ffo]fps=24,format=rgba,fade=t=in:st={max(0,T-0.4):.3f}:d=0.4:alpha=1[fout];\n"
            f"[c2][fout]overlay=0:0[out]")

def callout_graph(T, pos='bl'):
    # Braun-style "blur-callout": blur+dim the offer-page hero, float a clean re-typeset callout card,
    # keep the circle-cam face. inputs: 0=hero(page) 1=face 2=ring 3=fmask 4=callout-png
    P = "clip(t/0.55\\,0\\,1)"; inv = f"(1-{P})"
    ys = (70 if pos == 'tl' else 702) * S; ry = (35 if pos == 'tl' else 667) * S
    sm = "clip((t-0.55)/0.3\\,0\\,1)"; popSC = f"(0.92+0.08*({sm})*({sm})*(3-2*({sm})))"   # subtle scale-in
    return (f"[0:v]scale={W}:{H},setsar=1,boxblur={22*S},eq=brightness=-0.30:saturation=0.65[bg];\n"
            f"[1:v]split[fa][fb];\n"
            f"[fa]fps=24,crop={860*S}:{860*S}:{720*S}:{40*S},scale={1536*S}:{1536*S},setsar=1[fsq];\n"
            f"[fsq][3:v]alphamerge[fc];\n"
            f"[fc]scale=w={330*S}+{1974*S}*{inv}:h={330*S}+{1974*S}*{inv}:eval=frame[fz];\n"
            f"[bg][fz]overlay=x={48*S}-{1158*S}*{inv}:y={ys}-{ys + 612*S}*{inv}:eval=frame[comp];\n"
            f"[2:v]fps=24,format=rgba,fade=t=in:st=0.5:d=0.15:alpha=1,fade=t=out:st={max(0,T-0.45):.3f}:d=0.15:alpha=1[ringf];\n"
            f"[comp][ringf]overlay=x={13*S}:y={ry}[comp2];\n"
            f"[4:v]fps=24,scale={int(0.62 * W)}:-1,setsar=1,format=rgba,"
            f"fade=t=in:st=0.55:d=0.25:alpha=1,fade=t=out:st={max(0,T-0.4):.3f}:d=0.3:alpha=1[co0];\n"
            f"[co0]scale=w='iw*{popSC}':h='ih*{popSC}':eval=frame[cocard];\n"
            f"[comp2][cocard]overlay=x='({W}-overlay_w)/2':y={int(0.17 * H)}[comp3];\n"
            f"[fb]fps=24,format=rgba,fade=t=in:st={max(0,T-0.4):.3f}:d=0.4:alpha=1[fout];\n"
            f"[comp3][fout]overlay=0:0[out]")

def render_broll(seg, a, b, out):
    T = b - a
    common = ["-ss", f"{a:.3f}", "-i", FACE, "-t", f"{T:.3f}"]
    if seg['layout'] == 'callout':   # blur the offer page + float a clean re-typeset callout card
        ins = ["-loop", "1", "-t", f"{T:.3f}", "-i", f"{HERO}/{seg['hero']}.png", *common,
               "-stream_loop", "-1", "-i", RING, "-i", FMASK, "-loop", "1", "-i", f"/tmp/callouts/{seg['callout']}.png"]
        fcp = out.replace('.mp4', '.fc'); open(fcp, "w").write(callout_graph(T, seg.get('circle_pos', 'bl')))
        run(["ffmpeg", "-y", "-hide_banner", "-loglevel", "error", *ins,
             "-filter_complex_script", fcp, "-map", "[out]", "-map", "1:a", "-t", f"{T:.3f}", *ENC, out])
        return
    if seg['layout'] == 'panel':   # big category graphic + face reframed right
        ins = ["-loop", "1", "-t", f"{T:.3f}", "-i", f"{PANELDIR}/{seg['panel']}.png", *common]
        fcp = out.replace('.mp4', '.fc'); open(fcp, "w").write(panel_graph(T))
        run(["ffmpeg", "-y", "-hide_banner", "-loglevel", "error", *ins,
             "-filter_complex_script", fcp, "-map", "[out]", "-map", "1:a", "-t", f"{T:.3f}", *ENC, out])
        return
    if 'video' in seg:   # MOTION B-roll (play a clip, e.g. application footage) — no Ken Burns
        b0 = ["-ss", f"{seg.get('video_ss', 0):.3f}", "-t", f"{T:.3f}", "-i", seg['video']]; kenburns = False
    else:                # FREEZE-FRAME B-roll (still hero + Ken Burns)
        b0 = ["-loop", "1", "-t", f"{T:.3f}", "-i", f"{HERO}/{seg['hero']}.png"]; kenburns = seg.get('kenburns', True)
    if seg['layout'] == 'circle':
        ins = [*b0, *common, "-stream_loop", "-1", "-i", RING, "-i", FMASK]
        fc = circle_graph(T, seg.get('highlight'), kenburns, seg.get('circle_pos', 'bl'))
    else:
        ins = [*b0, *common, "-i", RRBORDER, "-i", RRMASK]
        fc = split_graph(T, seg['crop'])
    fcp = out.replace('.mp4', '.fc'); open(fcp, "w").write(fc)
    run(["ffmpeg", "-y", "-hide_banner", "-loglevel", "error", *ins,
         "-filter_complex_script", fcp, "-map", "[out]", "-map", "1:a", "-t", f"{T:.3f}", *ENC, out])

def render_cluster(segs, a, b, out):
    # adjacent circle segments -> ONE persistent circle (single morph in/out) with the backgrounds
    # CROSS-FADING underneath (no jarring face flash between them). Each non-last bg is extended 0.4s.
    T = b - a; XF = 0.4
    lens = [s['end'] - s['start'] for s in segs]
    ins = []
    for i, s in enumerate(segs):
        d = lens[i] + (XF if i < len(segs) - 1 else 0)
        if 'video' in s: ins += ["-ss", f"{s.get('video_ss', 0):.3f}", "-t", f"{d:.3f}", "-i", s['video']]
        else:            ins += ["-loop", "1", "-t", f"{d:.3f}", "-i", f"{HERO}/{s['hero']}.png"]
    nb = len(segs)
    ins += ["-ss", f"{a:.3f}", "-i", FACE, "-t", f"{T:.3f}", "-stream_loop", "-1", "-i", RING, "-i", FMASK]
    fi, ri, mi = nb, nb + 1, nb + 2   # face / ring / fmask input indices
    g = []
    for i, s in enumerate(segs):
        d = lens[i] + (XF if i < nb - 1 else 0)
        bg = kb(d) if ('video' not in s and s.get('kenburns', True)) else \
             f"scale={W}:{H}:force_original_aspect_ratio=increase,crop={W}:{H},setsar=1"
        g.append(f"[{i}:v]fps=24,{bg}[b{i}];")
    prev = "b0"; off = lens[0]
    for i in range(1, nb):
        nl = f"bx{i}"; g.append(f"[{prev}][b{i}]xfade=transition=fade:duration={XF}:offset={off:.3f}[{nl}];")
        prev = nl; off += lens[i]
    P = "clip(t/0.55\\,0\\,1)"; inv = f"(1-{P})"   # morph IN once, then circle PERSISTS at corner
    g.append(f"[{fi}:v]split[fa][fb];")
    g.append(f"[fa]fps=24,crop={860*S}:{860*S}:{720*S}:{40*S},scale={1536*S}:{1536*S},setsar=1[fsq];")
    g.append(f"[fsq][{mi}:v]alphamerge[fc];")
    g.append(f"[fc]scale=w={330*S}+{1974*S}*{inv}:h={330*S}+{1974*S}*{inv}:eval=frame[fz];")
    g.append(f"[{prev}][fz]overlay=x={48*S}-{1158*S}*{inv}:y={702*S}-{1314*S}*{inv}:eval=frame[comp];")
    g.append(f"[{ri}:v]fps=24,format=rgba,fade=t=in:st=0.5:d=0.15:alpha=1,fade=t=out:st={max(0,T-0.45):.3f}:d=0.15:alpha=1[ringf];")
    g.append(f"[comp][ringf]overlay=x={13*S}:y={667*S}[comp2];")
    g.append(f"[fb]fps=24,format=rgba,fade=t=in:st={max(0,T-0.4):.3f}:d=0.4:alpha=1[fout];")
    g.append(f"[comp2][fout]overlay=0:0[out]")
    fcp = out.replace('.mp4', '.fc'); open(fcp, "w").write("\n".join(g))
    run(["ffmpeg", "-y", "-hide_banner", "-loglevel", "error", *ins,
         "-filter_complex_script", fcp, "-map", "[out]", "-map", f"{fi}:a", "-t", f"{T:.3f}", *ENC, out])

CARDNUM = {'chase-sapphire-preferred': 1, 'chase-ink-business-cash': 2, 'chase-ink-business-unlimited': 3,
           'bofa-customized-cash-rewards-clean': 4, 'usbank-cash-plus': 5, 'usaa-eagle-adapt': 6}

INTRO_ENV = _ss("clip(min(t/1.0\\,(6.3-t)/1.3)\\,0\\,1)")   # zoom IN @0:00, hold, zoom OUT @~0:06

def render_face(a, b, out):   # face zooms on emphasis beats + persistent top-left TITLE banner (the OTS)
    T = b - a; card = card_for((a + b) / 2)
    title = f"{TITLES}/title_{CARDNUM[card]}.png" if card in CARDNUM else None
    is_intro = a < 0.1
    beats = [round(p - a, 3) for p in PUNCH if a + 0.8 <= p <= b - 1.2 and not (is_intro and p < 7.0)]
    parts = ([INTRO_ENV] if is_intro else []) + ([zoom_P(beats)] if beats else [])
    if parts:
        P = parts[0] if len(parts) == 1 else "max(" + "\\,".join(parts) + ")"
        z = (f"[0:v]fps=48,setpts=PTS-STARTPTS,"
             f"scale=w={W}*(1+{ZA}*({P})):h={H}*(1+{ZA}*({P})):eval=frame,"
             f"crop={W}:{H}:{1190 * ZA * S:.1f}*({P}):{388 * ZA * S:.1f}*({P}),"
             f"tmix=frames=2:weights='1 1',fps=24")
        if title:
            fc = z + f"[fz];\n[fz][1:v]overlay=x={44*S}:y={44*S}[out]"
            ins = ["-ss", f"{a:.3f}", "-i", FACE, "-t", f"{T:.3f}", "-i", title]
        else:
            fc = z + "[out]"
            ins = ["-ss", f"{a:.3f}", "-i", FACE, "-t", f"{T:.3f}"]
        fcp = out.replace('.mp4', '.fc'); open(fcp, "w").write(fc)
        run(["ffmpeg", "-y", "-hide_banner", "-loglevel", "error", *ins,
             "-filter_complex_script", fcp, "-map", "[out]", "-map", "0:a", "-t", f"{T:.3f}", *ENC, out])
    elif title:
        run(["ffmpeg", "-y", "-hide_banner", "-loglevel", "error", "-ss", f"{a:.3f}", "-i", FACE, "-t", f"{T:.3f}",
             "-i", title, "-filter_complex", f"[0:v][1:v]overlay=x={44*S}:y={44*S}[out]",
             "-map", "[out]", "-map", "0:a", "-t", f"{T:.3f}", *ENC, out])
    else:
        run(["ffmpeg", "-y", "-hide_banner", "-loglevel", "error", "-ss", f"{a:.3f}", "-i", FACE, "-t", f"{T:.3f}", *ENC, out])

# ---- final overlay/audio passes (on the concatenated base) ----
CUTS = json.load(open("/tmp/cutout_plan.json")) if os.path.exists("/tmp/cutout_plan.json") else []
NUMS = json.load(open("/tmp/number_plan.json")) if os.path.exists("/tmp/number_plan.json") else []
VENC = ["-r", "24", "-c:v", "libx264", "-preset", "fast", "-crf", "18", "-pix_fmt", "yuv420p"]

def _pop(idx, S, D, cxe, cye, sc0, fadein, prev):   # one scale-in pop overlay
    sm = f"clip((t-{S})/0.3\\,0\\,1)"; SC = f"({sc0}+{1 - sc0:.3f}*({sm})*({sm})*(3-2*({sm})))"
    nl = f"v{idx}"
    return (f"[{idx}:v]format=rgba,fade=t=in:st={S}:d={fadein}:alpha=1,fade=t=out:st={S + D - 0.25:.3f}:d=0.25:alpha=1,"
            f"scale=w='iw*{SC}':h='ih*{SC}':eval=frame[s{idx}];"
            f"[{prev}][s{idx}]overlay=x='{cxe}':y='{cye}':enable='between(t,{S},{S + D})'[{nl}];"), nl

def overlay_visual(src, dst):   # offer-page cutouts (left, scale-in) + intro cards (slide in/out @ 0:08)
    ins = ["-i", src]; chains = []; cur = "0:v"; idx = 1
    for cu in CUTS:
        png = cu["png"].replace("/cutouts/", "/cutouts4k/") if _4k else cu["png"]
        w, h = cu['w'] * S, cu['h'] * S
        ins += ["-loop", "1", "-i", png]
        ln, cur = _pop(idx, cu["t"], 3.4, f"{60 * S + w // 2}-overlay_w/2", f"{300 * S + h // 2}-overlay_h/2", 0.86, 0.25, cur)
        chains.append(ln); idx += 1
    for n in range(1, 7):
        ins += ["-loop", "1", "-i", f"{INTRODIR}/card_{n}.png"]
        Si = 8.0 + (n - 1) * 0.22; yt = (40 + (n - 1) * 168) * S
        env = f"clip(min(min((t-{Si:.2f})/0.4\\,(14-t)/0.4)\\,1)\\,0\\,1)"
        chains.append(f"[{cur}][{idx}:v]overlay=x='{-340 * S}+{410 * S}*({env})':y={yt}:enable='between(t,{Si:.2f},14)'[w{idx}];")
        cur = f"w{idx}"; idx += 1
    run(["ffmpeg", "-y", "-hide_banner", "-loglevel", "error", *ins, "-filter_complex", "".join(chains).rstrip(";"),
         "-map", f"[{cur}]", "-map", "0:a", "-t", f"{TOTAL:.2f}", *VENC, "-c:a", "copy", dst])

def overlay_numbers(src, dst):   # kinetic number pops, bottom-center
    if not NUMS:
        import shutil; shutil.copy(src, dst); return
    ins = ["-i", src]; chains = []; cur = "0:v"; idx = 1
    for nm in NUMS:
        png = nm["png"].replace("/numbers/", "/numbers4k/") if _4k else nm["png"]
        ins += ["-loop", "1", "-i", png]
        ln, cur = _pop(idx, nm["t"], 1.5, f"{960 * S}-overlay_w/2", f"{1000 * S}-overlay_h", 0.7, 0.18, cur)
        chains.append(ln); idx += 1
    run(["ffmpeg", "-y", "-hide_banner", "-loglevel", "error", *ins, "-filter_complex", "".join(chains).rstrip(";"),
         "-map", f"[{cur}]", "-map", "0:a", "-t", f"{TOTAL:.2f}", *VENC, "-c:a", "copy", dst])

CAPS = json.load(open("/tmp/caption_plan.json")) if os.path.exists("/tmp/caption_plan.json") else []

def overlay_captions(src, dst):   # "link in description" pill, TOP-RIGHT, at every site mention
    if not CAPS:
        import shutil; shutil.copy(src, dst); return
    ins = ["-i", src]; chains = []; cur = "0:v"; idx = 1
    for c in CAPS:
        ins += ["-loop", "1", "-i", CAPPNG]
        ln, cur = _pop(idx, c["t0"], c["t1"] - c["t0"], f"{1920 * S}-overlay_w-{44 * S}", f"{44 * S}", 0.85, 0.2, cur)
        chains.append(ln); idx += 1
    run(["ffmpeg", "-y", "-hide_banner", "-loglevel", "error", *ins, "-filter_complex", "".join(chains).rstrip(";"),
         "-map", f"[{cur}]", "-map", "0:a", "-t", f"{TOTAL:.2f}", *VENC, "-c:a", "copy", dst])

def audio_pass(src, dst):   # loudnorm to -14 LUFS (good mic is quiet ~-40dB) — swoosh removed per feedback
    run(["ffmpeg", "-y", "-hide_banner", "-loglevel", "error", "-i", src,
         "-map", "0:v", "-c:v", "copy", "-map", "0:a", "-af", "loudnorm=I=-14:TP=-1.5:LRA=11",
         "-c:a", "aac", "-b:a", "192k", dst])

def main():
    os.makedirs(TMP, exist_ok=True)
    # group adjacent circle segments (no highlight) -> clusters rendered as ONE persistent circle (bg crossfade)
    clusters, i = [], 0
    while i < len(SEGS):
        grp = [SEGS[i]]; j = i + 1
        if SEGS[i]['layout'] == 'circle' and not SEGS[i].get('highlight'):
            while (j < len(SEGS) and SEGS[j]['layout'] == 'circle' and not SEGS[j].get('highlight')
                   and abs(SEGS[j]['start'] - grp[-1]['end']) < 0.15):
                grp.append(SEGS[j]); j += 1
        clusters.append(grp); i = j
    # split face-only spans at section boundaries so the right title banner shows
    bounds = sorted(set([0, TOTAL] + [x for s in SECTIONS for x in s[:2]]))
    tl, cur = [], 0.0
    for grp in clusters:
        gs, ge = grp[0]['start'], grp[-1]['end']
        if gs > cur + 0.15:
            for c in [x for x in bounds if cur < x < gs] + [gs]:
                tl.append(('face', cur, c)); cur = c
        tl.append(('broll', gs, ge, grp)); cur = ge
    if cur < TOTAL - 0.15:
        for c in [x for x in bounds if cur < x < TOTAL] + [TOTAL]:
            tl.append(('face', cur, c)); cur = c

    files = []
    for i, item in enumerate(tl):
        out = f"{TMP}/seg_{i:03d}.mp4"; files.append(out)
        if item[0] == 'face':
            render_face(item[1], item[2], out)
            print(f"  [{i+1}/{len(tl)}] face  {item[1]/60:.1f}-{item[2]/60:.1f}m  card={card_for((item[1]+item[2])/2)}", flush=True)
        else:
            grp = item[3]
            def _tag(s): return s.get('hero') or s.get('panel') or os.path.basename(s.get('video', 'motion'))
            if len(grp) == 1:
                render_broll(grp[0], item[1], item[2], out)
                print(f"  [{i+1}/{len(tl)}] broll {grp[0]['layout']:6} {_tag(grp[0])}", flush=True)
            else:
                render_cluster(grp, item[1], item[2], out)
                print(f"  [{i+1}/{len(tl)}] CLUSTER {' + '.join(_tag(g) for g in grp)} (bg crossfade)", flush=True)

    lst = f"{TMP}/list.txt"; open(lst, "w").write("\n".join(f"file '{f}'" for f in files))
    base = f"{TMP}/base.mp4"; baseA = f"{TMP}/baseA.mp4"; baseB = f"{TMP}/baseB.mp4"
    run(["ffmpeg", "-y", "-hide_banner", "-loglevel", "error", "-f", "concat", "-safe", "0", "-i", lst, "-c", "copy", base])
    baseC = f"{TMP}/baseC.mp4"
    print("overlay pass 1/4: SUB cutouts (left) + intro card fly-in @0:08 …", flush=True)
    overlay_visual(base, baseA)
    print("overlay pass 2/4: reward number pops (bottom) …", flush=True)
    overlay_numbers(baseA, baseB)
    print("overlay pass 3/4: 'link in description' captions (top-right) …", flush=True)
    overlay_captions(baseB, baseC)
    print("overlay pass 4/4: loudnorm to -14 LUFS …", flush=True)
    audio_pass(baseC, OUT)
    print(f"\n✅ {OUT}", flush=True)

if __name__ == "__main__":
    main()
