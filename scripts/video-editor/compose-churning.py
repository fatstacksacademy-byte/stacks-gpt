#!/usr/bin/env python3
"""
compose-churning.py — build the churning-cycle skit spec timed to Nathaniel's
67s narration (Desktop/churning animation.aifc), then write skit.churning.json.
Render it with:  npm run skit scripts/video-editor/skit.churning.json --out OUT.mp4 --bg "#12161c"
(reusable pattern: edit the beat times/labels here and re-run.)
"""
import json, os

VOICE = "/Users/nathaniel/Desktop/churning animation.aifc"
FONT = "assets/fonts/Anton-Regular.ttf"


def lab(text, x, y, t_in, t_out, size, color, sw=9, angle=-4, stroke="#111111"):
    keys = [
        {"t": round(t_in, 2),        "x": x, "y": y, "scale": 0.0,  "angle": angle, "alpha": 1},
        {"t": round(t_in + 0.22, 2), "x": x, "y": y, "scale": 1.0,  "angle": angle, "alpha": 1},
        {"t": round(t_out, 2),       "x": x, "y": y, "scale": 1.0,  "angle": angle, "alpha": 1},
        {"t": round(t_out + 0.3, 2), "x": x, "y": y, "scale": 1.06, "angle": angle, "alpha": 0},
    ]
    return {"text": text, "font": FONT, "size": size, "color": color, "stroke": stroke, "strokew": sw, "ease": "smooth", "keys": keys}


spec = {
    "_comment": "Churning cycle, synced to churning animation.aifc. Swap banker-*.png for real cutouts.",
    "canvas": [1920, 1080], "fps": 30, "duration": 66.8,
    "voice": VOICE, "voice_gain": 1.0,
    "actors": [
        {"id": "banker_chase", "src": "assets/banker-chase.png", "ease": "smooth", "keys": [
            {"t": 0.0,  "x": 1380, "y": 640, "scale": 0.92, "angle": 0,   "alpha": 1},
            {"t": 11.0, "x": 1380, "y": 640, "scale": 0.92, "angle": 0,   "alpha": 1},
            {"t": 11.6, "x": 1350, "y": 640, "scale": 1.0,  "angle": 0,   "alpha": 1},
            {"t": 12.4, "x": 1380, "y": 640, "scale": 0.93, "angle": 0,   "alpha": 1},
            {"t": 19.0, "x": 1355, "y": 640, "scale": 1.0,  "angle": 0,   "alpha": 1},
            {"t": 19.8, "x": 1380, "y": 640, "scale": 0.93, "angle": 0,   "alpha": 1},
            {"t": 50.7, "x": 1380, "y": 640, "scale": 0.93, "angle": 0,   "alpha": 1},
            {"t": 51.0, "x": 1480, "y": 610, "scale": 0.95, "angle": 35,  "alpha": 1},
            {"t": 51.8, "x": 2750, "y": 360, "scale": 0.85, "angle": 520, "alpha": 1},
            {"t": 52.0, "x": 2950, "y": 330, "scale": 0.85, "angle": 560, "alpha": 0}
        ]},
        {"id": "banker_wells", "src": "assets/banker-wells.png", "ease": "smooth", "keys": [
            {"t": 0.0,  "x": 1500, "y": 640, "scale": 0.92, "angle": 0, "alpha": 0},
            {"t": 54.6, "x": 1500, "y": 640, "scale": 0.92, "angle": 0, "alpha": 0},
            {"t": 55.0, "x": 1500, "y": 640, "scale": 0.92, "angle": 0, "alpha": 1},
            {"t": 56.4, "x": 1380, "y": 640, "scale": 0.92, "angle": 0, "alpha": 1},
            {"t": 66.8, "x": 1380, "y": 640, "scale": 0.92, "angle": 0, "alpha": 1}
        ]},
        {"id": "hero", "src": "assets/nathaniel-cutout.png", "ease": "smooth", "keys": [
            {"t": 0.0,  "x": -360, "y": 640, "scale": 1.0,  "angle": 0, "alpha": 1},
            {"t": 1.0,  "x": 560,  "y": 640, "scale": 1.0,  "angle": 0, "alpha": 1},
            {"t": 25.8, "x": 560,  "y": 640, "scale": 1.0,  "angle": 0, "alpha": 1},
            {"t": 26.3, "x": 560,  "y": 640, "scale": 1.12, "angle": 0, "alpha": 1},
            {"t": 26.9, "x": 560,  "y": 640, "scale": 1.0,  "angle": 0, "alpha": 1},
            {"t": 50.6, "x": 560,  "y": 640, "scale": 1.0,  "angle": 0, "alpha": 1},
            {"t": 51.0, "x": 900,  "y": 640, "scale": 1.06, "angle": 6, "alpha": 1},
            {"t": 51.4, "x": 580,  "y": 640, "scale": 1.0,  "angle": 0, "alpha": 1},
            {"t": 66.8, "x": 580,  "y": 640, "scale": 1.0,  "angle": 0, "alpha": 1}
        ]},
        {"id": "paycheck", "src": "assets/prop-paycheck.png", "ease": "smooth", "keys": [
            {"t": 1.2,  "x": 860,  "y": 760, "scale": 0.0, "angle": -4, "alpha": 1},
            {"t": 1.5,  "x": 860,  "y": 760, "scale": 0.7, "angle": -4, "alpha": 1},
            {"t": 3.8,  "x": 860,  "y": 760, "scale": 0.7, "angle": -4, "alpha": 1},
            {"t": 4.8,  "x": 1180, "y": 660, "scale": 0.65,"angle": 12, "alpha": 1},
            {"t": 5.4,  "x": 1340, "y": 680, "scale": 0.5, "angle": 12, "alpha": 0},
            {"t": 29.6, "x": 1320, "y": 640, "scale": 0.0, "angle": -4, "alpha": 0},
            {"t": 29.9, "x": 1320, "y": 640, "scale": 0.0, "angle": -4, "alpha": 1},
            {"t": 30.3, "x": 1320, "y": 640, "scale": 0.65,"angle": -4, "alpha": 1},
            {"t": 31.6, "x": 860,  "y": 760, "scale": 0.7, "angle": -4, "alpha": 1},
            {"t": 33.8, "x": 860,  "y": 760, "scale": 0.7, "angle": -4, "alpha": 1},
            {"t": 34.3, "x": 860,  "y": 780, "scale": 0.7, "angle": -4, "alpha": 0},
            {"t": 62.9, "x": 860,  "y": 760, "scale": 0.0, "angle": -4, "alpha": 0},
            {"t": 63.2, "x": 860,  "y": 760, "scale": 0.0, "angle": -4, "alpha": 1},
            {"t": 63.5, "x": 860,  "y": 760, "scale": 0.7, "angle": -4, "alpha": 1},
            {"t": 66.8, "x": 860,  "y": 760, "scale": 0.7, "angle": -4, "alpha": 1}
        ]}
    ],
    "labels": [
        lab("CHASE", 1380, 250, 0.6, 50.6, 66, "#ffe14d"),
        lab("$400", 960, 235, 3.0, 5.6, 150, "#36d17a"),
        lab("$400 BONUS", 940, 410, 6.6, 9.5, 92, "#ffe14d"),
        lab("30-60 DAYS", 960, 235, 8.0, 10.6, 110, "#ffffff"),
        lab("FEES", 1380, 360, 11.6, 25.4, 120, "#ff2d2d"),
        lab("0% INTEREST", 1380, 520, 19.2, 25.4, 84, "#ff2d2d"),
        lab("FAT STACKER", 560, 200, 26.3, 29.4, 88, "#ffe14d"),
        lab("PULL IT BACK", 940, 330, 30.1, 33.6, 92, "#36d17a"),
        lab("CLOSE IT", 1080, 300, 39.1, 45.2, 120, "#ffffff"),
        {"text": "$12 FEE", "font": FONT, "size": 110, "color": "#ff2d2d", "stroke": "#111111", "strokew": 9, "ease": "smooth", "keys": [
            {"t": 46.3, "x": 1380, "y": 420, "scale": 0.0, "angle": -5, "alpha": 1},
            {"t": 46.55,"x": 1380, "y": 420, "scale": 1.0, "angle": -5, "alpha": 1},
            {"t": 50.9, "x": 1380, "y": 420, "scale": 1.0, "angle": -5, "alpha": 1},
            {"t": 51.2, "x": 1400, "y": 400, "scale": 1.8, "angle": 3,  "alpha": 0}
        ]},
        lab("ALREADY GONE", 560, 200, 47.0, 50.0, 88, "#ffe14d"),
        lab("ANOTHER ONE?", 1380, 250, 55.2, 62.3, 60, "#ffe14d"),
        lab("WELLS FARGO", 1380, 250, 62.6, 66.8, 64, "#ffe14d"),
        lab("OVER AND OVER", 820, 300, 63.6, 66.8, 92, "#ffe14d")
    ],
    "sfx": [
        {"t": 0.5,  "file": "assets/sfx/whoosh.wav", "gain": 0.5},
        {"t": 3.0,  "file": "assets/sfx/pop.wav", "gain": 0.6},
        {"t": 4.8,  "file": "assets/sfx/whoosh.wav", "gain": 0.5},
        {"t": 6.6,  "file": "assets/sfx/pop.wav", "gain": 0.6},
        {"t": 11.6, "file": "assets/sfx/pop.wav", "gain": 0.55},
        {"t": 19.2, "file": "assets/sfx/pop.wav", "gain": 0.55},
        {"t": 30.1, "file": "assets/sfx/whoosh.wav", "gain": 0.5},
        {"t": 39.1, "file": "assets/sfx/pop.wav", "gain": 0.55},
        {"t": 46.3, "file": "assets/sfx/pop.wav", "gain": 0.6},
        {"t": 51.0, "file": "assets/sfx/hit.wav", "gain": 0.85},
        {"t": 51.15,"file": "assets/sfx/pop.wav", "gain": 0.6},
        {"t": 55.2, "file": "assets/sfx/whoosh.wav", "gain": 0.5},
        {"t": 62.6, "file": "assets/sfx/pop.wav", "gain": 0.6},
        {"t": 63.6, "file": "assets/sfx/highlight.wav", "gain": 0.6}
    ],
    "shake": [{"t0": 51.0, "t1": 51.5, "amp": 26}]
}

out = os.path.join(os.getcwd(), "scripts/video-editor/skit.churning.json")
json.dump(spec, open(out, "w"), indent=2)
print("✅", out, "·", len(spec["actors"]), "actors,", len(spec["labels"]), "labels,", len(spec["sfx"]), "sfx")
