#!/usr/bin/env python3
"""
clipmap-to-plan.py — turn a build-clipmap.py clipmap into a stray-detect plan.

`framediff.py stray` needs to know WHEN an intended overlay/graphic is on screen so
it can subtract those windows and flag everything else (a leaked grid/watermark/
stale element) as a stray. A produced video built from a declarative clipmap already
records every layer's timing — this flattens that into the `stray_regions` block
framediff understands.

Caveat that makes this honest: a clipmap layer carries `{file, start, dur}` but NOT
a pixel rect — each overlay's position is baked into its source .mov (full-frame
b-roll cuts, alpha-positioned emoji pops, split composites). So every window is
declared **full-frame** `[0,0,1,1]`. The practical effect: stray can't spot an
artifact that coexists with an intended overlay, but it DOES check every
talking-head GAP between overlays — exactly where a leaked element from a previous
scene would surface. That's the failure this gate is for.

  python3 scripts/video-editor/clipmap-to-plan.py --clipmap clipmap.biz-20apy.json --out /tmp/strayplan.json
  python3 scripts/video-editor/framediff.py stray --final v8_FINAL.mp4 --aroll v8_base.mp4 --plan /tmp/strayplan.json

It also prints the base/final the clipmap referenced so you know what to diff.
"""
import argparse, json, sys
from pathlib import Path

FULL = [0.0, 0.0, 1.0, 1.0]  # positions are baked into sources → declare the whole frame


def span(start, dur):
    return float(start), float(start) + float(dur)


def collect(clip):
    """Yield (t0, t1) windows for every timed layer in the clipmap (any shape)."""
    p1, p2 = clip.get("pass1", {}), clip.get("pass2", {})
    whip_dur = float(p2.get("whip_dur", 0.4) or 0.4)

    # pass1 b-roll clips + pass2 alpha overlays: {file,start,dur}
    for layer in (p1.get("clips", []), p2.get("alpha_overlays", [])):
        for e in layer:
            if isinstance(e, dict) and "start" in e and "dur" in e:
                yield span(e["start"], e["dur"])

    # splits: [start, dur] pairs (or dicts)
    for e in p2.get("splits", []):
        if isinstance(e, (list, tuple)) and len(e) >= 2:
            yield span(e[0], e[1])
        elif isinstance(e, dict) and "start" in e:
            yield span(e["start"], e.get("dur", whip_dur))

    # cuts: bare whip-transition timestamps → a short window each
    for e in p2.get("cuts", []):
        t = e[0] if isinstance(e, (list, tuple)) else e
        if isinstance(t, (int, float)):
            yield (float(t) - whip_dur / 2, float(t) + whip_dur / 2)

    # green-screen outro composite (single dict)
    gs = p2.get("gs_composite")
    if isinstance(gs, dict) and "start" in gs:
        yield span(gs["start"], gs.get("dur", 0))


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--clipmap", required=True)
    ap.add_argument("--out", required=True)
    args = ap.parse_args()

    clip = json.load(open(args.clipmap))
    regions = []
    for t0, t1 in collect(clip):
        if t1 > t0:
            regions.append({"t": round(t0, 3), "end": round(t1, 3), "rect": FULL})
    regions.sort(key=lambda r: r["t"])

    plan = {
        "from_clipmap": args.clipmap,
        "fps": clip.get("fps"),
        "total_duration": clip.get("total_duration"),
        "stray_regions": regions,
        "beats": [],  # framediff also reads beats[]; we declare via stray_regions
    }
    Path(args.out).write_text(json.dumps(plan, indent=2))

    base = clip.get("pass1", {}).get("base")
    covered = sum(r["end"] - r["t"] for r in regions)
    total = clip.get("total_duration") or 0
    print(f"{len(regions)} declared overlay window(s) → {args.out}")
    print(f"  covers ~{covered:.0f}s of {total:.0f}s ({covered/total*100:.0f}% if no overlap); "
          f"stray checks the remaining talking-head gaps")
    if base:
        print(f"  clipmap base (use as --aroll): {base}")
    print(f"  → framediff.py stray --final <produced.mp4> --aroll {base or '<base.mp4>'} --plan {args.out}")


if __name__ == "__main__":
    main()
