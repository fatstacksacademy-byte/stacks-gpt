#!/usr/bin/env python3
"""
cut-takes.py — editorial cut of ad-lib takes from their transcripts (no IntelliScript).

Keeps ALL real content; removes false starts (per-take front trim), restarts/stutters
(word-level repeat detection), and dead space (acoustic silence). Builds a Resolve
timeline from the synced source clips (good mic audio), takes appended in order.
"""
import json, os, re, subprocess, sys

os.environ.setdefault("RESOLVE_SCRIPT_API",
    "/Library/Application Support/Blackmagic Design/DaVinci Resolve/Developer/Scripting")
os.environ.setdefault("RESOLVE_SCRIPT_LIB",
    "/Applications/DaVinci Resolve/DaVinci Resolve.app/Contents/Libraries/Fusion/fusionscript.so")
sys.path.insert(0, os.path.join(os.environ["RESOLVE_SCRIPT_API"], "Modules"))
import DaVinciResolveScript as bmd

TBASE = "scripts/video-editor/build/best-cards-june-2026/takes"
TAKES = [
    # clip name in Resolve, whisper json, wav, front-trim sec, end-trim sec (None=to end)
    {"clip": "A001_06191045_C004 2.mov", "json": f"{TBASE}/A001_06191045_C004_2.json",
     "wav": f"{TBASE}/A001_06191045_C004_2.wav", "start": 31.5, "end": None, "label": "take1 intro->card5"},
    {"clip": "A001_06191107_C005.mov", "json": f"{TBASE}/A001_06191107_C005.json",
     "wav": f"{TBASE}/A001_06191107_C005.wav", "start": 8.5, "end": None, "label": "take2 card6->outro"},
]
MAX_PAUSE, PAD, FPS = 0.40, 0.08, 30.0
OUT_TIMELINE = "best-cards-cut"

_norm = lambda w: re.sub(r"[^a-z0-9']", "", w.lower())


def load_words(path):
    d = json.load(open(path))
    return [{"word": w["word"], "start": w["start"], "end": w["end"]}
            for s in d["segments"] for w in s.get("words", [])]


def detect_silences(wav, noise="-32dB", d=0.18):
    p = subprocess.run(["ffmpeg", "-hide_banner", "-i", wav, "-af",
                        f"silencedetect=noise={noise}:d={d}", "-f", "null", "-"],
                       capture_output=True, text=True)
    sils, st = [], None
    for line in p.stderr.splitlines():
        m = re.search(r"silence_start: ([-\d.]+)", line)
        if m: st = float(m.group(1))
        m = re.search(r"silence_end: ([-\d.]+)", line)
        if m and st is not None: sils.append((max(0, st), float(m.group(1)))); st = None
    return sils


def detect_retakes(words, max_span=8.0, min_run=5):
    # min_run is the matched-run length that counts as a real restart. L=2/3 fires on
    # incidental echoes ("3x on gas / 3x on EV charging", "card number one … card number
    # one is the Chase") and deletes real content; validated on best-cards-June that only
    # L>=5 spans are genuine abandoned-then-redone takes. Keep this conservative.
    n = [_norm(w["word"]) for w in words]
    spans, removed, i = [], set(), 0
    while i < len(words):
        if i in removed or not n[i]: i += 1; continue
        hit = False; j = i + 1
        while j < len(words) and words[j]["start"] - words[i]["start"] <= max_span:
            if n[j] == n[i]:
                L = 0
                while i + L < j and j + L < len(words) and n[i + L] and n[i + L] == n[j + L]: L += 1
                if L >= min_run:
                    spans.append((words[i]["start"], words[j]["start"]))
                    for k in range(i, j): removed.add(k)
                    i = j; hit = True; break
            j += 1
        if not hit: i += 1
    return spans


def snap(t, bounds, tol=0.25):
    best, bd = t, tol
    for x in bounds:
        if abs(x - t) < bd: best, bd = x, abs(x - t)
    return best


def keep_segments(a, b, sils, retakes, bounds):
    removes = []
    for s, e in sils:
        if e <= a or s >= b: continue
        s, e = max(s, a), min(e, b)
        if e - s > MAX_PAUSE: removes.append((s + PAD, e - PAD))
    for rs, re_ in retakes:
        if re_ <= a or rs >= b: continue
        rs, re_ = snap(max(rs, a), bounds), snap(min(re_, b), bounds)
        if re_ - rs > 0.05: removes.append((rs, re_))
    removes.sort()
    merged = []
    for s, e in removes:
        if merged and s <= merged[-1][1] + 0.02: merged[-1] = (merged[-1][0], max(merged[-1][1], e))
        else: merged.append((s, e))
    keeps, cur = [], a
    for s, e in merged:
        if s > cur + 0.04: keeps.append((cur, s))
        cur = max(cur, e)
    if b > cur + 0.04: keeps.append((cur, b))
    return keeps, len(merged)


def fmt(s): return f"{int(s//60)}:{int(s%60):02d}"


def main():
    r = bmd.scriptapp("Resolve")
    proj = r.GetProjectManager().GetCurrentProject()
    mp = proj.GetMediaPool()
    clips = {c.GetName(): c for c in (mp.GetRootFolder().GetClipList() or [])}

    all_infos, summary = [], []
    for tk in TAKES:
        words = load_words(tk["json"])
        end = tk["end"] if tk["end"] else words[-1]["end"]
        sils = detect_silences(tk["wav"])
        bounds = [x for s, e in sils for x in (s, e)]
        retakes = detect_retakes(words)
        keeps, ncuts = keep_segments(tk["start"], end, sils, retakes, bounds)
        kdur = sum(e - s for s, e in keeps)
        summary.append(f"  {tk['label']}: {fmt(end - tk['start'])} -> {fmt(kdur)} "
                       f"(front-trim {tk['start']:.0f}s, {len(retakes)} restarts, {ncuts} cuts, {len(keeps)} segs)")
        item = clips.get(tk["clip"])
        if not item:
            sys.exit(f"clip '{tk['clip']}' not in media pool")
        for s, e in keeps:
            sf, ef = int(round(s * FPS)), int(round(e * FPS))
            if ef - sf >= 2:
                all_infos.append({"mediaPoolItem": item, "startFrame": sf, "endFrame": ef - 1})

    # build timeline
    for i in range(proj.GetTimelineCount(), 0, -1):
        t = proj.GetTimelineByIndex(i)
        if t.GetName() == OUT_TIMELINE: mp.DeleteTimelines([t])
    proj.SetSetting("timelineFrameRate", "30")
    proj.SetSetting("timelinePlaybackFrameRate", "30")
    nt = mp.CreateEmptyTimeline(OUT_TIMELINE)
    proj.SetCurrentTimeline(nt)
    mp.AppendToTimeline(all_infos)
    n1 = len(nt.GetItemListInTrack("video", 1) or [])
    if n1 == 0:
        for ci in all_infos: mp.AppendToTimeline([ci])
        n1 = len(nt.GetItemListInTrack("video", 1) or [])
    try: nt.SetVoiceIsolationState(1, {"isEnabled": True, "amount": 50})
    except Exception: pass
    total = sum((ci["endFrame"] + 1 - ci["startFrame"]) for ci in all_infos) / FPS
    r.OpenPage("edit")
    print("CUT SUMMARY:")
    print("\n".join(summary))
    print(f"\n✅ '{OUT_TIMELINE}': {n1} clips, total ~{fmt(total)}  (Voice Isolation on)")


if __name__ == "__main__":
    main()
