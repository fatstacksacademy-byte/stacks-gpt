#!/usr/bin/env python3
"""
resolve-marks.py — round-trip an autocut through DaVinci Resolve Studio for a manual
colour-mark review, then learn from the marks. Generic over any project (apply-marks.py
was hardwired to best-cards; this takes the source/spans/transcript as args).

Colour convention (biz-20apy scheme):
    uncolored / Teal  = KEEP        (Teal = a clip you EXTENDED — soft tail kept as-is)
    Pink              = CUT + LEARN  WORD-level repeat (stutter / restarted the same words)
    Orange            = CUT + LEARN  CONCEPT-level repeat (rephrasing-restart, same idea)
    Brown             = CUT + LEARN  DEAD SPACE (silence / breath the VAD missed)
    Lime              = CUT, pure preference (recorded, never generalized)
    delete a clip     = CUT + LEARN  (shows up as a timeline gap)

  build : drop each kept span onto a timeline as its own clip, sourced from the camera
          mov (V1) + good mic (A1) so every clip keeps FULL source handles → you can
          drag a clip's edge out to recover an over-trimmed word, not just cut.
  read  : read each V1 clip's colour + source in/out back, map to the good-mic transcript,
          write new-spans.json (the keepers, preserving your manual trims/extends), a
          learn log (Orange + gaps) and a preference log (Lime). With --render, re-render
          the frame-locked clean cut from your marked spans (same method as autocut.py).

  python3 scripts/video-editor/resolve-marks.py build \
      --project biz-20apy-cut --timeline biz-20apy-marks \
      --video <camera.mov> --audio good.wav --spans spans-v2.json --transcript good.json

  python3 scripts/video-editor/resolve-marks.py read \
      --project biz-20apy-cut --timeline biz-20apy-marks --transcript good.json \
      --new-spans spans-v3.json --learn learn-cuts-biz.md \
      [--render --video <camera.mov> --audio good.wav --out NEWCUT-CLEAN-1080-v3.mp4]
"""
import argparse, json, os, subprocess, sys

os.environ.setdefault("RESOLVE_SCRIPT_API",
    "/Library/Application Support/Blackmagic Design/DaVinci Resolve/Developer/Scripting")
os.environ.setdefault("RESOLVE_SCRIPT_LIB",
    "/Applications/DaVinci Resolve/DaVinci Resolve.app/Contents/Libraries/Fusion/fusionscript.so")
sys.path.insert(0, os.path.join(os.environ["RESOLVE_SCRIPT_API"], "Modules"))
import DaVinciResolveScript as bmd  # noqa: E402

FPS = 24.0
CUT_COLORS = {"Pink", "Orange", "Brown", "Lime"}
ex = os.path.expanduser


def connect():
    r = bmd.scriptapp("Resolve")
    if not r:
        sys.exit("Could not connect to Resolve. Is it running, with Preferences ▸ System ▸ "
                 "General ▸ 'External scripting using' = Local?")
    print(f"Connected: {r.GetProductName()} {r.GetVersionString()}", flush=True)
    return r


def load_words(p):
    d = json.load(open(ex(p)))
    return [{"word": w["word"], "start": w["start"], "end": w["end"]}
            for s in d["segments"] for w in s.get("words", [])]


def text_in(words, a, b):
    return " ".join(w["word"].strip() for w in words if a - 0.2 <= w["start"] < b + 0.2)


def fmt(s):
    return f"{int(s // 60)}:{int(s % 60):02d}"


def do_build(a):
    words = load_words(a.transcript)
    spans = json.load(open(ex(a.spans)))
    r = connect()
    pm = r.GetProjectManager()
    proj = pm.CreateProject(a.project) or pm.LoadProject(a.project)
    if not proj:
        sys.exit(f"Could not create/load project {a.project}")
    r.OpenPage("edit")
    mp = proj.GetMediaPool()
    vid = mp.ImportMedia([ex(a.video)])
    aud = mp.ImportMedia([ex(a.audio)])
    if not vid or not aud:
        sys.exit("import failed (video or audio)")
    vitem, aitem = vid[0], aud[0]
    W, H = (1920, 1080) if a.res == "1080" else (3840, 2160)
    proj.SetSetting("timelineResolutionWidth", str(W))
    proj.SetSetting("timelineResolutionHeight", str(H))
    proj.SetSetting("timelineFrameRate", "24")
    proj.SetSetting("timelinePlaybackFrameRate", "24")
    for i in range(proj.GetTimelineCount(), 0, -1):       # clean re-run: drop same-name timeline
        t = proj.GetTimelineByIndex(i)
        if t and t.GetName() == a.timeline:
            mp.DeleteTimelines([t])
    tl = mp.CreateEmptyTimeline(a.timeline)
    base = tl.GetStartFrame()
    vinfos, ainfos, cmap, cum = [], [], [], 0
    for s, e in spans:
        fin, fout = int(round(s * FPS)), int(round(e * FPS))
        if fout - fin < 1:
            continue
        # explicit recordFrame on BOTH tracks → video+audio stay LOCKED at the same position.
        # (auto-pack packs each track independently; audio snaps to sample boundaries and drifts away
        #  from video over the timeline.) endFrame=fout (Resolve duration = endFrame-startFrame) → gap-free.
        rec = base + cum
        vinfos.append({"mediaPoolItem": vitem, "startFrame": fin, "endFrame": fout,
                       "trackIndex": 1, "recordFrame": rec, "mediaType": 1})
        ainfos.append({"mediaPoolItem": aitem, "startFrame": fin, "endFrame": fout,
                       "trackIndex": 1, "recordFrame": rec, "mediaType": 2})
        cmap.append({"clip": len(vinfos), "span": [s, e], "rec_frame": cum,
                     "text": text_in(words, s, e)})
        cum += fout - fin
    mp.AppendToTimeline(vinfos)
    mp.AppendToTimeline(ainfos)
    if a.markers:                                          # reading guide: clip # + its words
        for c in cmap:
            try:
                tl.AddMarker(c["rec_frame"], "White", str(c["clip"]), c["text"][:220], 1, "")
            except Exception:
                pass
    json.dump(cmap, open(ex(a.clip_map), "w"), indent=1)
    print(f"\n✅ '{a.timeline}': {len(vinfos)} clips on V1/A1 · {fmt(cum / FPS)} · startFrame={base}")
    print(f"   clip-map → {a.clip_map}")
    print("   Legend: Orange=cut+learn · Lime=cut(preference) · Teal=keep+extended · "
          "delete clip=cut+learn · uncolored=keep")


# ---- frame-locked chunked render from explicit spans (same method as autocut.py) ----
def render_spans(spans, video, audio, out, res):
    fa = lambda t: round(t * FPS) / FPS
    spans = [(fa(s), fa(e)) for s, e in spans if e - s > 0.08]
    scale_arg = "scale=3840:2160" if res == "2160" else f"scale=-2:{res}"
    tmpd = "/tmp/resolvemarks_chunks"
    os.makedirs(tmpd, exist_ok=True)
    for f in os.listdir(tmpd):
        os.remove(f"{tmpd}/{f}")
    seq, MAX = [], 25
    for ci in range(0, len(spans), MAX):
        ch = spans[ci:ci + MAX]
        expr = "+".join(f"between(t,{s:.5f},{e:.5f})" for s, e in ch)
        W0, W1 = ch[0][0], ch[-1][1]
        ss = max(0, W0 - 1); t = W1 - ss + 1
        ff = f"/tmp/rmflt_{ci}.txt"
        open(ff, "w").write(f"[0:v]select='{expr}',setpts=N/FRAME_RATE/TB,{scale_arg},setsar=1[v];"
                            f"[1:a]aselect='{expr}',asetpts=N/SR/TB[a]")
        o = f"{tmpd}/c{ci:04d}.mp4"
        subprocess.run(["ffmpeg", "-y", "-v", "error", "-hwaccel", "videotoolbox",
            "-copyts", "-ss", f"{ss:.3f}", "-t", f"{t:.3f}", "-i", video,
            "-copyts", "-ss", f"{ss:.3f}", "-t", f"{t:.3f}", "-i", audio, "-/filter_complex", ff,
            "-map", "[v]", "-map", "[a]", "-shortest", "-c:v", "h264_videotoolbox", "-b:v", "12M",
            "-r", "24", "-pix_fmt", "yuv420p", "-c:a", "aac", "-b:a", "192k",
            "-movflags", "+faststart", o], check=True)
        seq.append(o)
    lst = "/tmp/resolvemarks_cat.txt"
    open(lst, "w").write("".join(f"file '{p}'\n" for p in seq))
    subprocess.run(["ffmpeg", "-y", "-v", "error", "-f", "concat", "-safe", "0", "-i", lst,
                    "-c", "copy", "-movflags", "+faststart", ex(out)], check=True)
    vd = subprocess.run(["ffprobe", "-v", "error", "-select_streams", "v:0", "-show_entries",
                         "stream=duration", "-of", "csv=p=0", ex(out)], capture_output=True, text=True).stdout.strip()
    print(f"✓ {out}  {float(vd) / 60:.1f}min")


def do_read(a):
    words = load_words(a.transcript)
    r = connect()
    proj = r.GetProjectManager().GetCurrentProject()
    src = next((proj.GetTimelineByIndex(i) for i in range(1, proj.GetTimelineCount() + 1)
                if proj.GetTimelineByIndex(i).GetName() == a.timeline), None)
    if not src:
        sys.exit(f"timeline '{a.timeline}' not found")
    base = src.GetStartFrame()
    V = src.GetItemListInTrack("video", 1) or []
    rows = [{"i": k, "color": v.GetClipColor() or "",
             "ss": v.GetSourceStartFrame() / FPS, "se": v.GetSourceEndFrame() / FPS}
            for k, v in enumerate(V)]
    from collections import Counter
    print("colour histogram:", dict(Counter(x["color"] or "(none)" for x in rows)))
    pink = [x for x in rows if x["color"] == "Pink"]
    orange = [x for x in rows if x["color"] == "Orange"]
    brown = [x for x in rows if x["color"] == "Brown"]
    lime = [x for x in rows if x["color"] == "Lime"]
    teal = [x for x in rows if x["color"] == "Teal"]
    apricot = [x for x in rows if x["color"] == "Apricot"]   # REPLACE: drop old footage, splice new audio + b-roll
    keepers = [x for x in rows if x["color"] not in CUT_COLORS and x["color"] != "Apricot"]
    gaps = []                                             # real deletes only (ignore ≤3-frame build artifact)
    for x, y in zip(V, V[1:]):
        if y.GetStart() - x.GetEnd() > 3:
            gaps.append((x.GetSourceEndFrame() / FPS, y.GetSourceStartFrame() / FPS))
    new_spans = [[round(x["ss"], 3), round(x["se"], 3)] for x in keepers]
    json.dump(new_spans, open(ex(a.new_spans), "w"))
    def section(f, title, items):
        f.write(f"## {title}\n")
        for x in items:
            f.write(f"- **{fmt(x['ss'])}** “{text_in(words, x['ss'], x['se'])[:160]}”\n")
        f.write("\n")
    with open(ex(a.learn), "w", encoding="utf-8") as f:
        f.write(f"# biz-20apy manual-cut learning log\n\n"
                f"{len(keepers)} kept · {len(pink)} Pink(word) · {len(orange)} Orange(concept) · "
                f"{len(brown)} Brown(dead) · {len(lime)} Lime(pref) · {len(teal)} Teal(ext) · "
                f"{len(apricot)} Apricot(replace) · {len(gaps)} gap-deletes\n\n")
        section(f, "Pink — WORD-level repeats (cut + LEARN → DTW / stutter layer)", pink)
        section(f, "Orange — CONCEPT-level repeats (cut + LEARN → semantic rephrasing layer)", orange)
        section(f, "Brown — DEAD SPACE (cut + LEARN → VAD layer)", brown)
        f.write("## Gap deletes (cut + LEARN)\n")
        for s, e in gaps:
            f.write(f"- **{fmt(s)}** “{text_in(words, s, e)[:160]}”\n")
        f.write("\n")
        section(f, "Apricot — REPLACE: drop old footage here, splice NEW audio insert + b-roll", apricot)
        section(f, "Lime — preference (do NOT generalize)", lime)
        f.write("## Teal — extended (soft tail kept)\n")
        for x in teal:
            f.write(f"- **{fmt(x['ss'])}–{fmt(x['se'])}** “{text_in(words, x['ss'], x['se'])[:120]}”\n")
    print(f"✅ read {len(rows)} clips · {len(pink)} Pink · {len(orange)} Orange · {len(brown)} Brown · "
          f"{len(lime)} Lime · {len(teal)} Teal · {len(apricot)} Apricot · {len(gaps)} gaps")
    print(f"   new spans → {a.new_spans}   learn log → {a.learn}")
    if a.render:
        if not (a.video and a.audio and a.out):
            sys.exit("--render needs --video --audio --out")
        render_spans(new_spans, ex(a.video), ex(a.audio), a.out, a.res)


if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    sub = ap.add_subparsers(dest="mode", required=True)
    b = sub.add_parser("build")
    b.add_argument("--project", required=True)
    b.add_argument("--timeline", required=True)
    b.add_argument("--video", required=True)
    b.add_argument("--audio", required=True)
    b.add_argument("--spans", required=True)
    b.add_argument("--transcript", required=True)
    b.add_argument("--clip-map", default="clip-map.json")
    b.add_argument("--res", default="1080")
    b.add_argument("--markers", action="store_true", default=True)
    b.add_argument("--no-markers", dest="markers", action="store_false")
    rd = sub.add_parser("read")
    rd.add_argument("--project", required=True)
    rd.add_argument("--timeline", required=True)
    rd.add_argument("--transcript", required=True)
    rd.add_argument("--new-spans", default="spans-v3.json")
    rd.add_argument("--learn", default="learn-cuts-biz.md")
    rd.add_argument("--render", action="store_true")
    rd.add_argument("--video", default="")
    rd.add_argument("--audio", default="")
    rd.add_argument("--out", default="")
    rd.add_argument("--res", default="1080")
    a = ap.parse_args()
    (do_build if a.mode == "build" else do_read)(a)
