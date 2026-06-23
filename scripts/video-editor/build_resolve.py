#!/usr/bin/env python3
"""
build_resolve.py — assemble the edit in DaVinci Resolve Studio from plan.json.

Zero AI/edit tokens: this drives Resolve locally over its Python API.

Timeline layout:
  V1  A-roll (face read) + its audio          (the spine)
  V2  full-screen TITLE / GRAPHIC cards + B-roll (video-only; face audio ducks under)
  V3  transparent lower-third overlays
  Subtitles  auto-generated from audio (Studio feature)

After it runs, Resolve is left open on the built timeline so you can scrub,
nudge any flagged beat, and render from the UI — or pass --render to render here.

Usage:
  python3 scripts/video-editor/build_resolve.py \
    --plan scripts/video-editor/build/best-cards-june-2026/plan.json \
    --aroll scripts/video-editor/build/best-cards-june-2026/aroll.mp4 \
    [--until 120]   # only build the first N seconds (fast pilot)
    [--render]      # also render to <build>/output.mov
"""
import argparse
import json
import os
import sys

os.environ.setdefault(
    "RESOLVE_SCRIPT_API",
    "/Library/Application Support/Blackmagic Design/DaVinci Resolve/Developer/Scripting",
)
os.environ.setdefault(
    "RESOLVE_SCRIPT_LIB",
    "/Applications/DaVinci Resolve/DaVinci Resolve.app/Contents/Libraries/Fusion/fusionscript.so",
)
sys.path.insert(0, os.path.join(os.environ["RESOLVE_SCRIPT_API"], "Modules"))

import DaVinciResolveScript as bmd  # noqa: E402

REPO = os.getcwd()


def log(*a):
    print(*a, flush=True)


def connect():
    r = bmd.scriptapp("Resolve")
    if not r:
        sys.exit("Could not connect to Resolve. Is it running? (External scripting must be 'Local')")
    log(f"Connected: {r.GetProductName()} {r.GetVersionString()}")
    return r


def abspath(p):
    return p if os.path.isabs(p) else os.path.join(REPO, p)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--plan", required=True)
    ap.add_argument("--aroll", required=True)
    ap.add_argument("--project", default="BestCards-June2026-auto")
    ap.add_argument("--until", type=float, default=0.0, help="only build first N seconds")
    ap.add_argument("--render", action="store_true")
    ap.add_argument("--captions", action="store_true", help="generate Resolve auto-subtitles (off by default)")
    ap.add_argument("--burn-captions", action="store_true",
                    help="burn the rendered clean-line caption PNGs onto a track (no-plugin floor; "
                         "recommended path is MagicSubtitle from captions.srt in the hero pass)")
    ap.add_argument("--no-callouts", action="store_true", help="skip the gold number callout pop-ins")
    ap.add_argument("--no-markers", action="store_true", help="skip chapter + zoom timeline markers")
    ap.add_argument("--sfx", default="assets/sfx", help="dir of whoosh/riser/pop SFX; placed at sections/zooms if present")
    ap.add_argument("--music", default="", help="optional background music file → A3 (level/duck in GUI; API can't)")
    ap.add_argument("--lut", default="", help="path to a .cube LUT applied to every A-roll clip (the brand look)")
    ap.add_argument("--pop", action="store_true",
                    help="apply a mild CDL contrast+saturation bump to A-roll clips for a consistent look (no LUT needed)")
    ap.add_argument("--voice-isolation", type=int, default=60,
                    help="Resolve 21 Voice Isolation amount (0-100) on the dialogue track; 0=off. Cleans room/reverb.")
    args = ap.parse_args()

    plan = json.load(open(abspath(args.plan)))
    beats = plan["beats"]
    captions = plan.get("captions", [])
    callouts = plan.get("callouts", [])
    if args.until:
        beats = [b for b in beats if b["t"] < args.until]
        captions = [c for c in captions if c["t"] < args.until]
        callouts = [c for c in callouts if c["t"] < args.until]
    aroll = abspath(args.aroll)
    build_dir = os.path.dirname(abspath(args.plan))

    resolve = connect()
    pm = resolve.GetProjectManager()
    proj = pm.CreateProject(args.project) or pm.LoadProject(args.project)
    if not proj:
        sys.exit(f"Could not create/load project {args.project}")
    resolve.OpenPage("edit")

    # 1080p; match the A-roll's frame rate so second->frame placement is exact.
    mp = proj.GetMediaPool()
    media = mp.ImportMedia([aroll]) or []
    if not media:
        sys.exit("Failed to import A-roll")
    aitem = media[0]
    fps = float(aitem.GetClipProperty("FPS") or 30.0)
    proj.SetSetting("timelineResolutionWidth", "1920")
    proj.SetSetting("timelineResolutionHeight", "1080")
    proj.SetSetting("timelineFrameRate", str(fps))
    # Playback frame rate must match, or Resolve monitors a 30fps timeline at the
    # default 24fps → everything plays at 0.8x and the audio sounds "underwater".
    # This locks once a timeline exists, so it must be set here (before CreateEmptyTimeline).
    proj.SetSetting("timelinePlaybackFrameRate", str(int(round(fps))))
    log(f"A-roll imported · fps={fps} · playbackRate={proj.GetSetting('timelinePlaybackFrameRate')}")

    # Import every graphic + b-roll the plan references, de-duped, keyed by name.
    assets = {}
    paths = set()
    for b in beats:
        if b.get("image"):
            paths.add(abspath(b["image"]))
        if b.get("broll", {}).get("file"):
            paths.add(b["broll"]["file"])
    # Import one-by-one: a multi-file list with numbered names (00-lower, 01-lower…)
    # makes Resolve collapse them into a bogus image "sequence". Single files can't.
    for p in [p for p in paths if os.path.exists(p)]:
        for it in mp.ImportMedia([p]) or []:
            assets[it.GetName()] = it
    log(f"Imported {len(assets)} graphic/b-roll assets")

    def f(sec):
        return int(round(sec * fps))

    # 2. Timeline with the A-roll as the spine on V1/A1.
    # Clean re-run: drop a prior timeline of the same name in this project.
    for i in range(proj.GetTimelineCount(), 0, -1):
        t = proj.GetTimelineByIndex(i)
        if t and t.GetName() == args.project:
            mp.DeleteTimelines([t])
    tl = mp.CreateEmptyTimeline(args.project)
    mp.AppendToTimeline([{ "mediaPoolItem": aitem, "startFrame": 0,
                           "endFrame": f(args.until) - 1 if args.until else int(aitem.GetClipProperty("Frames")) - 1 }])
    # V1 aroll · V2 cards/b-roll · V3 lower-thirds · V4 callouts · V5 captions
    while tl.GetTrackCount("video") < 5:
        tl.AddTrack("video")
    # Resolve timelines start at 01:00:00:00 by default — overlays must be offset
    # by that start frame or they land an hour before the footage.
    base = tl.GetStartFrame()
    log(f"Timeline created · {tl.GetTrackCount('video')} video tracks · startFrame={base}")

    def item_for(b):
        # Resolve's GetName() keeps the extension, so look up by full basename.
        if b["layout"] in ("SCREEN+PIP", "FIELD") and b.get("broll", {}).get("file"):
            return assets.get(os.path.basename(b["broll"]["file"]))
        if b.get("image"):
            return assets.get(os.path.basename(b["image"]))
        return None

    placed = 0
    recent_broll = {}  # basename -> last record frame, to dedup adjacent b-roll
    for b in beats:
        item = item_for(b)
        if not item:
            continue
        start = f(b["t"])
        layout = b["layout"]
        if layout == "TITLE":
            dur = f(2.5)
            track = 2
        elif layout == "GRAPHIC":
            dur = f(min(b["end"] - b["t"], 7.0))
            track = 2
        elif layout in ("SCREEN+PIP", "FIELD"):
            src_frames = int(item.GetClipProperty("Frames") or 0)
            dur = min(f(b["end"] - b["t"]), src_frames or f(6.0))
            track = 2
        else:  # FACE / other with a lower-third
            dur = f(min(max(b["end"] - b["t"], 4.0), 6.5))
            track = 3
        name = item.GetName()
        if name.lower().endswith((".mp4", ".mov")):  # dedup the same b-roll placed back-to-back
            pf = recent_broll.get(name)
            if pf is not None and abs((base + start) - pf) < f(4.0):
                continue
            recent_broll[name] = base + start
        ci = {"mediaPoolItem": item, "startFrame": 0, "endFrame": max(1, dur) - 1,
              "trackIndex": track, "recordFrame": base + start, "mediaType": 1}
        ok = mp.AppendToTimeline([ci])
        placed += 1 if ok else 0

    # Guarantee the Desktop screen-recordings get used: place each card's screen
    # clip over that card's section if a SCREEN beat didn't already place it.
    DESKTOP_SCREEN = {
        3: os.path.join(os.environ["HOME"], "Desktop", "sapphirepreferred.mp4"),       # CSP
        1: os.path.join(os.environ["HOME"], "Desktop", "chaseinkcashandunlimited.mp4"), # Ink
        5: os.path.join(os.environ["HOME"], "Desktop", "usbankcashplus.mp4"),           # US Bank
    }
    on_v2 = {it.GetName() for it in (tl.GetItemListInTrack("video", 2) or [])}
    windows = {}
    for b in beats:
        cn = b.get("cardNumber")
        if cn:
            w = windows.setdefault(cn, [b["t"], b["end"]])
            w[0], w[1] = min(w[0], b["t"]), max(w[1], b["end"])
    for cn, fpath in DESKTOP_SCREEN.items():
        nm = os.path.basename(fpath)
        if nm in on_v2 or cn not in windows or not os.path.exists(fpath):
            continue
        imp = mp.ImportMedia([fpath]) or []
        if not imp:
            continue
        it = imp[0]
        ws, we = windows[cn]
        at = base + f(ws + 3.0)
        dur = min(int(it.GetClipProperty("Frames") or f(8.0)), f(max(2.0, min(we - ws - 3.0, 10.0))))
        if dur >= 1 and mp.AppendToTimeline([{ "mediaPoolItem": it, "startFrame": 0, "endFrame": dur - 1,
                                               "trackIndex": 2, "recordFrame": at, "mediaType": 1 }]):
            placed += 1
            log(f"  +desktop b-roll: {nm} over CARD #{cn} @ {ws:.0f}s")

    log(f"Placed {placed} overlay/b-roll clips")

    # ── Retention FX layer ────────────────────────────────────────────────────
    def import_one(path):
        p = abspath(path)
        if not os.path.exists(p):
            return None
        items = mp.ImportMedia([p]) or []
        return items[0] if items else None

    def place_img(item, track, start_sec, dur_sec):
        if not item:
            return False
        dur = max(1, f(dur_sec))
        return bool(mp.AppendToTimeline([{ "mediaPoolItem": item, "startFrame": 0, "endFrame": dur - 1,
                                           "trackIndex": track, "recordFrame": base + f(start_sec), "mediaType": 1 }]))

    # 3a. Gold number callouts (V4) — pop in ~2.2s at the moment a hero number is said.
    if callouts and not args.no_callouts:
        n = 0
        for c in callouts:
            if c.get("image") and place_img(import_one(c["image"]), 4, c["t"], 2.2):
                n += 1
        log(f"Callouts: placed {n}/{len(callouts)} gold chips on V4")

    # 3b. Clean-line caption burn-in (V5) — no-plugin floor. Heavy (one clip per
    #     line), so opt-in; the recommended path is MagicSubtitle from captions.srt.
    if args.burn_captions and captions:
        n = 0
        for cap in captions:
            if cap.get("image") and place_img(import_one(cap["image"]), 5, cap["t"], max(0.6, cap["end"] - cap["t"])):
                n += 1
        log(f"Captions: burned {n}/{len(captions)} lines on V5")
    elif captions:
        log(f"Captions: {len(captions)} lines in captions.srt → run MagicSubtitle (TheSRTWhisperer) in the hero pass, or re-run with --burn-captions")

    # 3c. SFX (audio) — whoosh at each section start; riser on zoom beats. Levels are
    #     GUI-only (no audio API), so SFX should be pre-normalized; we just place them.
    sfx_dir = abspath(args.sfx)
    def sfx_path(*names):
        for nm in names:
            for ext in (".wav", ".mp3", ".aif", ".aiff", ".m4a"):
                p = os.path.join(sfx_dir, nm + ext)
                if os.path.exists(p):
                    return p
        return None
    whoosh, riser = sfx_path("whoosh", "swoosh", "transition"), sfx_path("riser", "rise", "boom", "pop")
    if whoosh or riser:
        while tl.GetTrackCount("audio") < 2:
            tl.AddTrack("audio")

        def place_audio(path, start_sec):
            it = import_one(path)
            if not it:
                return False
            dur = int(it.GetClipProperty("Frames") or f(1.0))
            rec = max(base, base + f(start_sec) - f(0.12))  # land just before the cut
            return bool(mp.AppendToTimeline([{ "mediaPoolItem": it, "startFrame": 0, "endFrame": max(1, dur) - 1,
                                               "trackIndex": 2, "recordFrame": rec, "mediaType": 2 }]))

        section_starts, seen = [], set()
        for b in beats:
            if b["section"] not in seen:
                seen.add(b["section"]); section_starts.append(b["t"])
        # Risers only on headline reveals + explicit EDL zoom beats (Leo: don't overdo
        # them or they lose their reputation), spaced ≥8s.
        raw_z = sorted(set([b["t"] for b in beats if "zoom" in (b.get("fx") or [])]
                           + [c["t"] for c in callouts if c.get("importance") == "reveal"]))
        zoom_ts, lastz = [], -99
        for t in raw_z:
            if t - lastz > 8:
                zoom_ts.append(t); lastz = t
        ns = sum(1 for t in section_starts if whoosh and place_audio(whoosh, t))
        nz = sum(1 for t in zoom_ts if riser and place_audio(riser, t))
        log(f"SFX: {ns} section whooshes + {nz} reveal risers on A2 (adjust levels in GUI)")
    else:
        log(f"SFX: none in {sfx_dir} (drop whoosh.wav / riser.wav there) — skipped")

    # 3d. Optional background music (A3) — placement only; duck/level in the GUI.
    if args.music and os.path.exists(abspath(args.music)):
        while tl.GetTrackCount("audio") < 3:
            tl.AddTrack("audio")
        m = import_one(args.music)
        if m and mp.AppendToTimeline([{ "mediaPoolItem": m, "startFrame": 0,
                                        "endFrame": int(m.GetClipProperty("Frames") or f(60)) - 1,
                                        "trackIndex": 3, "recordFrame": base, "mediaType": 2 }]):
            log("Music placed on A3 (duck under VO in Fairlight — no audio-level API)")

    # 3e. Chapter + zoom markers — nav aids + tell the hero pass where to MagicZoom.
    if not args.no_markers:
        used = set()  # Resolve drops a 2nd marker on an occupied frame → nudge collisions

        def mark(fr, color, name, note):
            while fr in used:
                fr += 1
            used.add(fr)
            try:
                return bool(tl.AddMarker(fr, color, name, note, 1, ""))
            except Exception:
                return False

        nm, seen = 0, set()
        for b in beats:
            if b["section"] not in seen:
                seen.add(b["section"])
                if mark(f(b["t"]), "Sky", b["section"][:48], "chapter"):
                    nm += 1
            if "zoom" in (b.get("fx") or []):
                mark(f(b["t"]), "Yellow", "punch-in", "MagicZoom here")
        for c in callouts:
            if c.get("importance") == "reveal":
                mark(f(c["t"]), "Yellow", "punch-in", f"MagicZoom: {c['value']}")
        log(f"Markers: {nm} chapter + reveal/zoom markers added")

    # 3f. Consistent grade on the A-roll spine (the recognizable look).
    if args.lut or args.pop:
        try:
            proj.RefreshLUTList()  # pick up LUTs newly dropped in Resolve's LUT folder
        except Exception:
            pass
        items = tl.GetItemListInTrack("video", 1) or []
        n = 0
        for it in items:
            try:
                if args.lut and it.SetLUT(1, abspath(args.lut)):
                    n += 1
                elif args.pop and it.SetCDL({"NodeIndex": "1", "Slope": "1.06 1.06 1.06",
                                             "Offset": "0 0 0", "Power": "0.98 0.98 0.98", "Saturation": "1.12"}):
                    n += 1
            except Exception as e:
                log(f"  grade skipped (needs Color page API): {e}")
                break
        log(f"Grade: applied to {n} A-roll clip(s)")

    # 3. Captions — Studio auto-transcribe (opt-in; default off, the auto subs
    #    look unstyled and collide with the lower-thirds).
    if args.captions:
        try:
            if tl.CreateSubtitlesFromAudio({}):
                log("Captions generated")
        except Exception as e:
            log(f"Captions skipped: {e}")

    # 4. Voice Isolation (Resolve 21 AI) on the dialogue track — strips room/reverb,
    #    no "underwater" artifact. Scriptable; replaces the EQ-guessing approach.
    if args.voice_isolation > 0:
        try:
            amt = max(0, min(100, args.voice_isolation))
            if tl.SetVoiceIsolationState(1, {"isEnabled": True, "amount": amt}):
                log(f"Voice Isolation ON (amount={amt}) on A1")
        except Exception as e:
            log(f"Voice Isolation skipped (needs Resolve 21 Studio): {e}")

    log("\n✅ Timeline built. Open Resolve to scrub/polish.")

    if args.render:
        out = os.path.join(build_dir, "output.mov")
        proj.SetRenderSettings({"TargetDir": build_dir, "CustomName": "output", "SelectAllFrames": True})
        proj.AddRenderJob()
        proj.StartRendering()
        log(f"Rendering → {out} (watch progress in Resolve's Deliver page)")


if __name__ == "__main__":
    main()
