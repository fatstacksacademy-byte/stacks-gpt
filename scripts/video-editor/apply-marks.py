#!/usr/bin/env python3
"""
apply-marks.py — apply the user's color marks on 'best-cards-cut' and rebuild clean.

The CURRENT timeline is the source of truth (preserves every manual trim/extension):
  keep  = uncolored + Teal   (Teal = a clip the user EXTENDED — e.g. +1-2s soft tail; kept as-is)
  cut   = Orange + Lime + timeline gaps (deletes)
          · Orange = cut AND learn a pattern
          · Lime   = cut, pure preference (recorded, never generalized)

Rebuilds 'best-cards-cut-v2' (contiguous video + ONE re-rendered locked audio wav), backs up
the marks to marks-backup.json, and writes learn-cuts.md (Orange + gaps mapped to the good-mic
transcript) + preference/Teal notes.
"""
import json, os, re, subprocess, sys

os.environ.setdefault("RESOLVE_SCRIPT_API",
    "/Library/Application Support/Blackmagic Design/DaVinci Resolve/Developer/Scripting")
os.environ.setdefault("RESOLVE_SCRIPT_LIB",
    "/Applications/DaVinci Resolve/DaVinci Resolve.app/Contents/Libraries/Fusion/fusionscript.so")
sys.path.insert(0, os.path.join(os.environ["RESOLVE_SCRIPT_API"], "Modules"))
import DaVinciResolveScript as bmd

BUILD = "scripts/video-editor/build/best-cards-june-2026"
EXPORT = "/Users/nathaniel/Desktop/june credit cards.mov"
GM_WORDS = f"{BUILD}/gm-words-goodmic.json"
SRC_TL, OUT_TL, FPS = "best-cards-cut", "best-cards-cut-v2", 24.0
CUT_COLORS = {"Orange", "Lime"}

def fmt(s): return f"{int(s//60)}:{int(s % 60):02d}"
def load_words(p):
    d = json.load(open(p))
    return [{"word": w["word"], "start": w["start"], "end": w["end"]}
            for s in d["segments"] for w in s.get("words", [])]
def text_in(words, a, b):
    return " ".join(w["word"].strip() for w in words if a - 0.2 <= w["start"] < b + 0.2)


def main():
    r = bmd.scriptapp("Resolve")
    proj = r.GetProjectManager().GetCurrentProject()
    mp = proj.GetMediaPool()
    src = next((proj.GetTimelineByIndex(i) for i in range(1, proj.GetTimelineCount() + 1)
                if proj.GetTimelineByIndex(i).GetName() == SRC_TL), None)
    if not src: sys.exit(f"'{SRC_TL}' not found")
    base = src.GetStartFrame()
    V = src.GetItemListInTrack("video", 1) or []
    words = load_words(GM_WORDS)

    rows = [{"i": k, "color": v.GetClipColor() or "", "ss": v.GetSourceStartFrame(),
             "se": v.GetSourceEndFrame(), "tl": v.GetStart() - base, "te": v.GetEnd() - base}
            for k, v in enumerate(V)]
    json.dump(rows, open(f"{BUILD}/marks-backup.json", "w"))

    keepers = [x for x in rows if x["color"] not in CUT_COLORS]
    orange = [x for x in rows if x["color"] == "Orange"]
    lime = [x for x in rows if x["color"] == "Lime"]
    teal = [x for x in rows if x["color"] == "Teal"]
    # timeline gaps = user deletes; deleted source ≈ between neighbours' source out/in
    gaps = []
    for a, b in zip(V, V[1:]):
        if b.GetStart() != a.GetEnd():
            gaps.append((a.GetSourceEndFrame() / FPS, b.GetSourceStartFrame() / FPS))

    # ---- learn log ----
    with open(f"{BUILD}/learn-cuts.md", "w", encoding="utf-8") as f:
        f.write(f"# Manual-cut learning log — {SRC_TL}\n\n")
        f.write(f"{len(keepers)} kept · {len(orange)} Orange · {len(lime)} Lime · "
                f"{len(teal)} Teal · {len(gaps)} gap-deletes\n\n")
        f.write("## Orange (cut + learn)\n")
        for x in orange:
            f.write(f"- **{fmt(x['ss']/FPS)}** “{text_in(words, x['ss']/FPS, x['se']/FPS)[:120]}”\n")
        f.write("\n## Gap deletes (cut + learn)\n")
        for a, b in gaps:
            f.write(f"- **{fmt(a)}** “{text_in(words, a, b)[:120]}”\n")
        f.write("\n## Lime (preference — do NOT generalize)\n")
        for x in lime:
            f.write(f"- **{fmt(x['ss']/FPS)}** “{text_in(words, x['ss']/FPS, x['se']/FPS)[:120]}”\n")
        f.write("\n## Teal (extended clips — soft tail, preserved as-is)\n")
        for x in teal:
            f.write(f"- **{fmt(x['tl']/FPS)}–{fmt(x['te']/FPS)}** (clip dur {(x['te']-x['ss'] if False else x['te']-x['tl'])/FPS:.1f}s) "
                    f"“{text_in(words, x['ss']/FPS, x['se']/FPS)[:90]}”\n")

    # ---- rebuild OUT from keepers (preserve each clip's exact source in/out) ----
    clips = {c.GetName(): c for c in (mp.GetRootFolder().GetClipList() or [])}
    exp = clips.get(os.path.basename(EXPORT))
    if not exp: sys.exit("export clip not in media pool")
    all_infos = [{"mediaPoolItem": exp, "startFrame": x["ss"], "endFrame": x["se"],
                  "mediaType": 1} for x in keepers]
    for i in range(proj.GetTimelineCount(), 0, -1):
        t = proj.GetTimelineByIndex(i)
        if t.GetName() == OUT_TL: mp.DeleteTimelines([t])
    proj.SetSetting("timelineFrameRate", "24"); proj.SetSetting("timelinePlaybackFrameRate", "24")
    nt = mp.CreateEmptyTimeline(OUT_TL); proj.SetCurrentTimeline(nt)
    mp.AppendToTimeline(all_infos)
    vitems = nt.GetItemListInTrack("video", 1) or []
    nb = nt.GetStartFrame()
    segs = [(it.GetSourceStartFrame() / FPS, (it.GetEnd() - it.GetStart()) / FPS) for it in vitems]
    aud = os.path.abspath(f"{BUILD}/best-cards-cut-v2-audio.wav")
    g = ";".join(f"[0:a]atrim=start={s:.6f}:duration={d:.6f},asetpts=PTS-STARTPTS[a{k}]"
                 for k, (s, d) in enumerate(segs)) + ";" + \
        "".join(f"[a{k}]" for k in range(len(segs))) + f"concat=n={len(segs)}:v=0:a=1[out]"
    print(f"rendering audio ({len(segs)} segs) …", flush=True)
    subprocess.run(["ffmpeg", "-y", "-hide_banner", "-loglevel", "error", "-i", EXPORT,
                    "-filter_complex", g, "-map", "[out]", "-c:a", "pcm_s24le", "-ar", "48000", aud], check=True)
    dur = float(subprocess.run(["ffprobe", "-v", "error", "-show_entries", "format=duration",
                                "-of", "default=nw=1:nk=1", aud], capture_output=True, text=True).stdout.strip() or 0)
    vf = vitems[-1].GetEnd() - nb
    awav = mp.ImportMedia([aud]); awav = awav[0] if awav else None
    if awav:
        mp.AppendToTimeline([{"mediaPoolItem": awav, "startFrame": 0,
                              "endFrame": min(int(round(dur * FPS)), vf) - 1,
                              "trackIndex": 1, "recordFrame": nb, "mediaType": 2}])
    try: nt.SetVoiceIsolationState(1, {"isEnabled": True, "amount": 50})
    except Exception: pass
    a1 = len(nt.GetItemListInTrack("audio", 1) or [])
    r.OpenPage("edit")
    print(f"\n✅ '{OUT_TL}': {len(vitems)} clips / {a1} audio · {fmt(vf/FPS)} "
          f"· cut {len(orange)} Orange + {len(lime)} Lime + {len(gaps)} gaps · audio {fmt(dur)}=video {fmt(vf/FPS)}")
    print(f"   learn log: {BUILD}/learn-cuts.md   backup: {BUILD}/marks-backup.json")


if __name__ == "__main__":
    main()
