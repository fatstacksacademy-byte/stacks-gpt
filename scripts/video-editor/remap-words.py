#!/usr/bin/env python3
"""
remap-words.py — produce a word-level transcript timed to a Resolve timeline.

Each clip on the timeline references the source take (aroll-raw) by source in/out.
This maps every source word (from Whisper words.json) to its position on the given
timeline, so build-plan can align EDL overlays to the *edited* timing.

Output: <out> (default tightened-words.json) = [{word,start,end}] in timeline seconds.

Usage:
  python3 scripts/video-editor/remap-words.py --timeline "best-cards-tightened" \
    --words scripts/video-editor/build/best-cards-june-2026/words.json \
    --out scripts/video-editor/build/best-cards-june-2026/tightened-words.json
"""
import argparse, json, os, sys

os.environ.setdefault("RESOLVE_SCRIPT_API",
    "/Library/Application Support/Blackmagic Design/DaVinci Resolve/Developer/Scripting")
os.environ.setdefault("RESOLVE_SCRIPT_LIB",
    "/Applications/DaVinci Resolve/DaVinci Resolve.app/Contents/Libraries/Fusion/fusionscript.so")
sys.path.insert(0, os.path.join(os.environ["RESOLVE_SCRIPT_API"], "Modules"))
import DaVinciResolveScript as bmd


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--timeline", required=True)
    ap.add_argument("--words", required=True)
    ap.add_argument("--out", required=True)
    args = ap.parse_args()

    r = bmd.scriptapp("Resolve")
    proj = r.GetProjectManager().GetCurrentProject()
    tl = next((proj.GetTimelineByIndex(i) for i in range(1, proj.GetTimelineCount() + 1)
               if proj.GetTimelineByIndex(i).GetName() == args.timeline), None)
    if not tl:
        sys.exit(f"timeline '{args.timeline}' not found")
    items = tl.GetItemListInTrack("video", 1) or []
    fps = float((items[0].GetMediaPoolItem().GetClipProperty("FPS")) or 30.0)
    base = tl.GetStartFrame()
    # (source_start_sec, source_end_sec, timeline_start_sec) per clip
    clips = [(it.GetSourceStartFrame() / fps, it.GetSourceEndFrame() / fps,
              (it.GetStart() - base) / fps) for it in items]
    print(f"{len(clips)} timeline clips; mapping words…", flush=True)

    words = json.load(open(args.words))
    out = []
    for w in words:
        t = w["start"]
        for ss, se, tls in clips:
            if ss <= t < se:
                nt = tls + (t - ss)
                out.append({"word": w["word"], "start": round(nt, 3),
                            "end": round(nt + (w["end"] - w["start"]), 3)})
                break
    out.sort(key=lambda x: x["start"])
    json.dump(out, open(args.out, "w"))
    dur = out[-1]["start"] if out else 0
    print(f"✓ {len(out)}/{len(words)} words mapped onto '{args.timeline}' "
          f"(~{dur/60:.1f} min) → {args.out}", flush=True)


if __name__ == "__main__":
    main()
