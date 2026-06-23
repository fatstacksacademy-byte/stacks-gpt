#!/usr/bin/env python3
"""
layer-graphics.py — layer title cards / earning graphics / lower-thirds onto an
EXISTING Resolve timeline (e.g. an IntelliScript+tightened cut), from a plan.json.

V2 = full-screen TITLE/GRAPHIC cards + screen B-roll; V3 = transparent lower-thirds.
Times come from build-plan run against the timeline's remapped transcript, so overlays
land where you actually say each thing on the edited cut.

Usage:
  python3 scripts/video-editor/layer-graphics.py \
    --timeline "best-cards-tightened" --plan <build>/plan.json
"""
import argparse, json, os, sys

os.environ.setdefault("RESOLVE_SCRIPT_API",
    "/Library/Application Support/Blackmagic Design/DaVinci Resolve/Developer/Scripting")
os.environ.setdefault("RESOLVE_SCRIPT_LIB",
    "/Applications/DaVinci Resolve/DaVinci Resolve.app/Contents/Libraries/Fusion/fusionscript.so")
sys.path.insert(0, os.path.join(os.environ["RESOLVE_SCRIPT_API"], "Modules"))
import DaVinciResolveScript as bmd

REPO = os.getcwd()
def abspath(p): return p if os.path.isabs(p) else os.path.join(REPO, p)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--timeline", required=True)
    ap.add_argument("--plan", required=True)
    args = ap.parse_args()

    plan = json.load(open(abspath(args.plan)))
    beats = plan["beats"]

    r = bmd.scriptapp("Resolve")
    proj = r.GetProjectManager().GetCurrentProject()
    tl = next((proj.GetTimelineByIndex(i) for i in range(1, proj.GetTimelineCount() + 1)
               if proj.GetTimelineByIndex(i).GetName() == args.timeline), None)
    if not tl:
        sys.exit(f"timeline '{args.timeline}' not found")
    proj.SetCurrentTimeline(tl)
    r.OpenPage("edit")
    while tl.GetTrackCount("video") < 3:
        tl.AddTrack("video")
    fps = float(proj.GetSetting("timelineFrameRate") or 30.0)
    base = tl.GetStartFrame()
    mp = proj.GetMediaPool()
    def f(sec): return int(round(sec * fps))

    # import assets (one-by-one to avoid numbered-PNG "sequence" grouping)
    assets, paths = {}, set()
    for b in beats:
        if b.get("image"): paths.add(abspath(b["image"]))
        if b.get("broll", {}).get("file"): paths.add(b["broll"]["file"])
    for p in [p for p in paths if os.path.exists(p)]:
        for it in mp.ImportMedia([p]) or []:
            assets[it.GetName()] = it
    print(f"layering onto '{tl.GetName()}' · {len(assets)} assets · base {base}", flush=True)

    def item_for(b):
        if b["layout"] in ("SCREEN+PIP", "FIELD") and b.get("broll", {}).get("file"):
            return assets.get(os.path.basename(b["broll"]["file"]))
        if b.get("image"):
            return assets.get(os.path.basename(b["image"]))
        return None

    placed, recent = 0, {}
    for b in beats:
        it = item_for(b)
        if not it:
            continue
        start = f(b["t"])
        layout = b["layout"]
        if layout == "TITLE":
            dur, track = f(2.5), 2
        elif layout == "GRAPHIC":
            dur, track = f(min(b["end"] - b["t"], 7.0)), 2
        elif layout in ("SCREEN+PIP", "FIELD"):
            dur = min(f(b["end"] - b["t"]), int(it.GetClipProperty("Frames") or f(6.0)))
            track = 2
        else:
            dur, track = f(min(max(b["end"] - b["t"], 4.0), 6.5)), 3
        nm = it.GetName()
        if nm.lower().endswith((".mp4", ".mov")):
            pf = recent.get(nm)
            if pf is not None and abs((base + start) - pf) < f(4.0):
                continue
            recent[nm] = base + start
        ok = mp.AppendToTimeline([{ "mediaPoolItem": it, "startFrame": 0,
                                    "endFrame": max(1, dur) - 1, "trackIndex": track,
                                    "recordFrame": base + start, "mediaType": 1 }])
        placed += 1 if ok else 0

    print(f"✅ placed {placed} overlays on '{tl.GetName()}'. Open it to review.", flush=True)


if __name__ == "__main__":
    main()
