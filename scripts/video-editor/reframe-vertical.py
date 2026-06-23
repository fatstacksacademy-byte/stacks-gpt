#!/usr/bin/env python3
"""
reframe-vertical.py — make a 9:16 vertical Short from a finished timeline using
Resolve 21's AI Smart Reframe (keeps the subject framed, no manual keyframing).

Duplicates the timeline, sets it to 1080x1920, and Smart-Reframes the face/A-roll
clips. Full-screen graphics are 16:9 and won't reframe well, so by default it only
reframes V1 (your talking head); regenerate graphics for vertical separately.

Usage:
  python3 scripts/video-editor/reframe-vertical.py --project <name> [--timeline <name>] [--all-tracks]
"""
import argparse, os, sys

os.environ.setdefault("RESOLVE_SCRIPT_API",
    "/Library/Application Support/Blackmagic Design/DaVinci Resolve/Developer/Scripting")
os.environ.setdefault("RESOLVE_SCRIPT_LIB",
    "/Applications/DaVinci Resolve/DaVinci Resolve.app/Contents/Libraries/Fusion/fusionscript.so")
sys.path.insert(0, os.path.join(os.environ["RESOLVE_SCRIPT_API"], "Modules"))
import DaVinciResolveScript as bmd


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--project", required=True)
    ap.add_argument("--timeline", default="", help="source timeline name (default: current)")
    ap.add_argument("--all-tracks", action="store_true", help="reframe every track, not just V1")
    args = ap.parse_args()

    r = bmd.scriptapp("Resolve")
    if not r:
        sys.exit("Resolve not reachable")
    pm = r.GetProjectManager()
    proj = pm.LoadProject(args.project) or pm.GetCurrentProject()
    r.OpenPage("edit")

    src = None
    if args.timeline:
        for i in range(1, proj.GetTimelineCount() + 1):
            t = proj.GetTimelineByIndex(i)
            if t.GetName() == args.timeline:
                src = t; break
    else:
        src = proj.GetCurrentTimeline()
    if not src:
        sys.exit("source timeline not found")

    vert = src.DuplicateTimeline(src.GetName() + " — vertical")
    if not vert:
        sys.exit("DuplicateTimeline failed")
    proj.SetCurrentTimeline(vert)
    # 1080x1920 vertical for this timeline
    vert.SetSetting("useCustomSettings", "1")
    vert.SetSetting("timelineResolutionWidth", "1080")
    vert.SetSetting("timelineResolutionHeight", "1920")
    print(f"created vertical timeline: {vert.GetName()} (1080x1920)")

    tracks = range(1, vert.GetTrackCount("video") + 1) if args.all_tracks else (1,)
    reframed = 0
    for tk in tracks:
        for it in (vert.GetItemListInTrack("video", tk) or []):
            try:
                if it.SmartReframe():
                    reframed += 1
            except Exception as e:
                print(f"  SmartReframe failed on {it.GetName()}: {e}")
    print(f"✅ Smart Reframe applied to {reframed} clips. Open the '— vertical' timeline.")


if __name__ == "__main__":
    main()
