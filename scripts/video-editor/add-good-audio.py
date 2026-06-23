#!/usr/bin/env python3
"""
add-good-audio.py — rebuild the synced mic audio to match the best-cards-cut video.

Scripted AppendToTimeline won't carry the waveform-synced external audio, so the cut
came through video-only. This reads the V1 segments, pulls each from the matching
junecards .m4a (shifted by the measured sync offset), concats them into one aligned
audio file, imports it, and lays it on A1.
"""
import json, os, subprocess, sys, tempfile

os.environ.setdefault("RESOLVE_SCRIPT_API",
    "/Library/Application Support/Blackmagic Design/DaVinci Resolve/Developer/Scripting")
sys.path.insert(0, os.path.join(os.environ["RESOLVE_SCRIPT_API"], "Modules"))
import DaVinciResolveScript as bmd

OFFSETS = {"A001_06191045_C004 2.mov": ("/Users/nathaniel/Desktop/junecards1.m4a", 2.195),
           "A001_06191107_C005.mov":  ("/Users/nathaniel/Desktop/junecards2.m4a", 18.700)}
OUT = os.path.abspath("scripts/video-editor/build/best-cards-june-2026/best-cards-cut-audio.wav")
FPS, FADE = 30.0, 0.006


def main():
    r = bmd.scriptapp("Resolve")
    proj = r.GetProjectManager().GetCurrentProject()
    tl = next((proj.GetTimelineByIndex(i) for i in range(1, proj.GetTimelineCount() + 1)
               if proj.GetTimelineByIndex(i).GetName() == "best-cards-cut"), None)
    items = tl.GetItemListInTrack("video", 1) or []

    def build_take(its, m4a, off, outwav):
        """One take's segments -> a single concatenated wav (single input = reliable)."""
        parts, labels = [], []
        for k, it in enumerate(its):
            s = it.GetSourceStartFrame() / FPS + off
            d = it.GetDuration() / FPS                      # timeline dur = source dur (no retime)
            e = s + d
            fo = max(0.0, d - FADE)
            parts.append(f"[0:a]atrim=start={s:.3f}:end={e:.3f},asetpts=PTS-STARTPTS,"
                         f"afade=t=in:st=0:d={FADE},afade=t=out:st={fo:.3f}:d={FADE}[a{k}]")
            labels.append(f"[a{k}]")
        graph = ";".join(parts) + ";" + "".join(labels) + f"concat=n={len(labels)}:v=0:a=1[out]"
        sf = tempfile.NamedTemporaryFile("w", suffix=".txt", delete=False); sf.write(graph); sf.close()
        subprocess.run(["ffmpeg", "-y", "-v", "error", "-i", m4a, "-/filter_complex", sf.name,
                        "-map", "[out]", "-ar", "48000", outwav], check=True)
        return sum(it.GetDuration() / FPS for it in its)

    # split into takes (preserving order; take1 segments precede take2)
    takes, cur, curname = [], [], None
    for it in items:
        nm = it.GetMediaPoolItem().GetName()
        if nm != curname and cur:
            takes.append((curname, cur)); cur = []
        curname = nm; cur.append(it)
    if cur: takes.append((curname, cur))

    wavs = []
    for i, (nm, its) in enumerate(takes):
        m4a, off = OFFSETS[nm]
        w = f"/tmp/take_{i}.wav"
        dur = build_take(its, m4a, off, w)
        wavs.append(w)
        print(f"  {nm}: {len(its)} segs -> {dur:.0f}s", flush=True)
    # concat the per-take wavs
    lst = tempfile.NamedTemporaryFile("w", suffix=".txt", delete=False)
    for w in wavs: lst.write(f"file '{w}'\n")
    lst.close()
    subprocess.run(["ffmpeg", "-y", "-v", "error", "-f", "concat", "-safe", "0", "-i", lst.name,
                    "-ar", "48000", OUT], check=True)
    print(f"building aligned mic audio from {len(items)} segments…", flush=True)
    dur = float(subprocess.run(["ffprobe", "-v", "error", "-show_entries", "format=duration",
                                "-of", "csv=p=0", OUT], capture_output=True, text=True).stdout.strip())
    print(f"✓ {OUT}  ({dur/60:.1f} min)", flush=True)

    # clear any existing A1 audio, then import + place the corrected one
    existing = tl.GetItemListInTrack("audio", 1) or []
    if existing:
        try: tl.DeleteClips(existing)
        except Exception: pass
    mp = proj.GetMediaPool()
    imp = mp.ImportMedia([OUT]) or []
    base = tl.GetStartFrame()
    if imp:
        ok = mp.AppendToTimeline([{ "mediaPoolItem": imp[0], "startFrame": 0,
                                    "endFrame": int(round(dur * FPS)) - 1,
                                    "trackIndex": 1, "recordFrame": base, "mediaType": 2 }])
        a1 = len(tl.GetItemListInTrack("audio", 1) or [])
        print(f"placed on A1: {ok} (A1 now has {a1} clip(s))")
        if a1 == 0:
            print("⚠️ API audio-append failed — DRAG 'best-cards-cut-audio.wav' from the Media Pool onto A1 at the very start (01:00:00:00).")


if __name__ == "__main__":
    main()
