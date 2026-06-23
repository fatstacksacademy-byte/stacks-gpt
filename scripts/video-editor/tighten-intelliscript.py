#!/usr/bin/env python3
"""
tighten-intelliscript.py — second pass on an IntelliScript-built timeline.

IntelliScript picks the best takes but leaves dead air inside them. This reads
its cut (each timeline clip's source in/out), detects acoustic silence in the
source with ffmpeg, and rebuilds a NEW timeline that keeps IntelliScript's
selection but compresses long pauses — cutting *inside* the silence with a small
pad so words never clip. Voice Isolation is carried onto the result.

Usage:
  python3 scripts/video-editor/tighten-intelliscript.py \
    --source-timeline "best-cards-screenplay" --out "best-cards-tightened" \
    [--max-pause 0.25] [--pad 0.06] [--noise -35dB] [--voice-isolation 60]
"""
import argparse, json, os, re, subprocess, sys

os.environ.setdefault("RESOLVE_SCRIPT_API",
    "/Library/Application Support/Blackmagic Design/DaVinci Resolve/Developer/Scripting")
os.environ.setdefault("RESOLVE_SCRIPT_LIB",
    "/Applications/DaVinci Resolve/DaVinci Resolve.app/Contents/Libraries/Fusion/fusionscript.so")
sys.path.insert(0, os.path.join(os.environ["RESOLVE_SCRIPT_API"], "Modules"))
import DaVinciResolveScript as bmd


def detect_silences(path, noise, min_sil):
    p = subprocess.run(["ffmpeg", "-hide_banner", "-i", path, "-af",
                        f"silencedetect=noise={noise}:d={min_sil}", "-f", "null", "-"],
                       capture_output=True, text=True)
    sils, start = [], None
    for line in p.stderr.splitlines():
        m = re.search(r"silence_start: ([-\d.]+)", line)
        if m:
            start = float(m.group(1))
        m = re.search(r"silence_end: ([-\d.]+)", line)
        if m and start is not None:
            sils.append((max(0.0, start), float(m.group(1))))
            start = None
    return sils


def _norm(w):
    return re.sub(r"[^a-z0-9']", "", w.lower())


def detect_retakes(words, max_span=8.0):
    """Restart detection: a run of >=2 words that repeats with the later copy starting
    within `max_span` seconds → the earlier copy is an abandoned take. Time-windowed
    (not word-count) so it catches restarts with several words in between. The >=2
    consecutive-match rule keeps common words ("the…the") from being removed."""
    n = [_norm(w["word"]) for w in words]
    spans, removed, i = [], set(), 0
    while i < len(words):
        if i in removed or not n[i]:
            i += 1; continue
        hit = False
        j = i + 1
        while j < len(words) and words[j]["start"] - words[i]["start"] <= max_span:
            if n[j] == n[i]:
                L = 0
                while i + L < j and j + L < len(words) and n[i + L] and n[i + L] == n[j + L]:
                    L += 1
                if L >= 2:
                    spans.append((words[i]["start"], words[j]["start"]))
                    for k in range(i, j):
                        removed.add(k)
                    i = j; hit = True; break
            j += 1
        if not hit:
            i += 1
    return spans


def _clip_tokens(words, a, b):
    return [_norm(w["word"]) for w in words if a <= w["start"] < b and _norm(w["word"])]


def dedup_takes(clip_toks, durations, lookahead=3, ngram=6):
    """Drop the shorter of any two nearby clips that share a >=ngram word run — that's
    IntelliScript having placed two takes of the same line. Keeps the complete take."""
    def grams(t):
        return {tuple(t[i:i + ngram]) for i in range(len(t) - ngram + 1)}
    gsets = [grams(t) for t in clip_toks]
    drop = set()
    for x in range(len(clip_toks)):
        if x in drop:
            continue
        for y in range(x + 1, min(x + 1 + lookahead, len(clip_toks))):
            if y in drop:
                continue
            if gsets[x] & gsets[y]:
                drop.add(x if durations[x] < durations[y] else y)
    return drop


def _snap(t, boundaries, tol=0.25):
    """Snap a cut point to the nearest silence boundary within tol (keeps cuts clean)."""
    best, bd = t, tol
    for x in boundaries:
        if abs(x - t) < bd:
            best, bd = x, abs(x - t)
    return best


def refine(a, b, sils, retakes, boundaries, max_pause, pad):
    """Keep [a,b] minus: long pauses (compressed to ~2*pad) and repeated-take spans
    (snapped to silence so words don't clip)."""
    removes = []
    for s, e in sils:
        if e <= a or s >= b:
            continue
        s, e = max(s, a), min(e, b)
        if e - s > max_pause:
            removes.append((s + pad, e - pad))
    for rs, re_ in retakes:
        if re_ <= a or rs >= b:
            continue
        rs, re_ = _snap(max(rs, a), boundaries), _snap(min(re_, b), boundaries)
        if re_ - rs > 0.05:
            removes.append((rs, re_))
    removes.sort()
    merged = []
    for s, e in removes:
        if merged and s <= merged[-1][1] + 0.02:
            merged[-1] = (merged[-1][0], max(merged[-1][1], e))
        else:
            merged.append((s, e))
    keeps, cur = [], a
    for s, e in merged:
        if s > cur + 0.04:
            keeps.append((cur, s))
        cur = max(cur, e)
    if b > cur + 0.04:
        keeps.append((cur, b))
    return keeps


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--source-timeline", required=True)
    ap.add_argument("--out", default="tightened")
    ap.add_argument("--max-pause", type=float, default=0.25, help="pauses longer than this get compressed")
    ap.add_argument("--pad", type=float, default=0.06, help="silence kept on each side of a cut (no word clip)")
    ap.add_argument("--noise", default="-35dB")
    ap.add_argument("--min-sil", type=float, default=0.18)
    ap.add_argument("--voice-isolation", type=int, default=60)
    ap.add_argument("--words", default="scripts/video-editor/build/best-cards-june-2026/words.json",
                    help="Whisper word-timestamps of the source take (for repeat-word removal); skip if missing")
    args = ap.parse_args()

    r = bmd.scriptapp("Resolve")
    proj = r.GetProjectManager().GetCurrentProject()
    src = None
    for i in range(1, proj.GetTimelineCount() + 1):
        t = proj.GetTimelineByIndex(i)
        if t.GetName() == args.source_timeline:
            src = t; break
    if not src:
        sys.exit(f"timeline '{args.source_timeline}' not found")

    items = src.GetItemListInTrack("video", 1) or []
    if not items:
        sys.exit("no clips on V1")
    media = items[0].GetMediaPoolItem()
    fps = float(media.GetClipProperty("FPS") or 30.0)
    path = media.GetClipProperty("File Path")
    print(f"source: {os.path.basename(path)} | IntelliScript clips: {len(items)} | fps {fps}", flush=True)

    sils = detect_silences(path, args.noise, args.min_sil)
    boundaries = [x for s, e in sils for x in (s, e)]
    print(f"detected {len(sils)} silence regions (≥{args.min_sil}s)", flush=True)

    info = [(it, it.GetSourceStartFrame() / fps, it.GetSourceEndFrame() / fps) for it in items]

    # Whisper word timestamps power both repeat-word removal and take-level dedup.
    retakes, drop = [], set()
    if os.path.exists(args.words):
        words = json.load(open(args.words))
        retakes = detect_retakes(words)
        print(f"detected {len(retakes)} repeated-word spans to remove", flush=True)
        toks = [_clip_tokens(words, a, b) for (_, a, b) in info]
        drop = dedup_takes(toks, [b - a for (_, a, b) in info])
        if drop:
            print(f"dropping {len(drop)} duplicate take clip(s): {sorted(drop)}", flush=True)
    else:
        print(f"(no {args.words} — skipping repeat-word removal + dedup)", flush=True)

    # IntelliScript keep segments (source seconds), minus duplicate takes, refined by
    # silence compression + repeat-word removal.
    refined = []
    for k, (it, a, b) in enumerate(info):
        if k in drop:
            continue
        refined += refine(a, b, sils, retakes, boundaries, args.max_pause, args.pad)

    src_dur = sum(it.GetSourceEndFrame() / fps - it.GetSourceStartFrame() / fps for it in items)
    new_dur = sum(e - s for s, e in refined)
    print(f"IntelliScript {src_dur/60:.1f}min → tightened {new_dur/60:.1f}min "
          f"(−{(src_dur-new_dur):.0f}s across {len(refined)} segments)", flush=True)

    # Build the tightened timeline (clips append sequentially, in order).
    mp = proj.GetMediaPool()
    for i in range(proj.GetTimelineCount(), 0, -1):
        t = proj.GetTimelineByIndex(i)
        if t.GetName() == args.out:
            mp.DeleteTimelines([t])
    proj.SetSetting("timelinePlaybackFrameRate", str(int(round(fps))))  # try (may be UI-locked)
    nt = mp.CreateEmptyTimeline(args.out)
    proj.SetCurrentTimeline(nt)
    clip_infos = []
    for s, e in refined:
        sf, ef = int(round(s * fps)), int(round(e * fps))
        if ef - sf >= 2:  # skip sub-2-frame slivers — one bad clip fails the whole batch
            clip_infos.append({"mediaPoolItem": media, "startFrame": sf, "endFrame": ef - 1})
    mp.AppendToTimeline(clip_infos)
    n1 = len(nt.GetItemListInTrack("video", 1) or [])
    if n1 == 0:  # batch rejected — append individually, skipping any that fail
        for ci in clip_infos:
            mp.AppendToTimeline([ci])
        n1 = len(nt.GetItemListInTrack("video", 1) or [])
    print(f"   placed {n1}/{len(clip_infos)} clips on V1", flush=True)

    if args.voice_isolation > 0:
        try:
            nt.SetVoiceIsolationState(1, {"isEnabled": True, "amount": args.voice_isolation})
            print(f"Voice Isolation ON (amount={args.voice_isolation})", flush=True)
        except Exception as e:
            print(f"Voice Isolation skipped: {e}", flush=True)

    r.OpenPage("edit")
    print(f"✅ built '{args.out}'  ({new_dur/60:.1f} min). Open it to compare against IntelliScript's.", flush=True)


if __name__ == "__main__":
    main()
