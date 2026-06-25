#!/usr/bin/env python3
"""
remap-cut.py — map a Whisper word transcript through a cut-single keeps.json onto the
CUT timeline (the ffmpeg-path analog of remap-words.py, which needs a live Resolve timeline).

Reads keeps.json (the kept spans on the original timeline) + the Whisper words.json, keeps
only the words whose centre falls inside a kept span, and renumbers their timestamps onto the
contiguous cut timeline. Output:
  <out>.json  = [{word, t0, t1, src}]  (t0/t1 = cut-timeline seconds, src = original seconds)
  <out>.txt   = the kept spoken transcript as plain text (what the viewer actually hears)

Usage:
  python3 scripts/video-editor/remap-cut.py \
    --keeps build/biz-20apy/keeps.json --words build/biz-20apy/biz-20apy-good.json \
    --out   build/biz-20apy/cut-words
"""
import argparse, json, os, sys

ap = argparse.ArgumentParser()
ap.add_argument("--keeps", required=True)
ap.add_argument("--words", required=True, help="Whisper json (segments[].words[].{word,start,end})")
ap.add_argument("--out", required=True, help="output stem (writes <out>.json and <out>.txt)")
a = ap.parse_args()

keeps = json.load(open(a.keeps))
spans = keeps["keeps"] if isinstance(keeps, dict) else keeps          # [[s,e],...] original-timeline
spans = sorted([(float(s), float(e)) for s, e in spans])

# cumulative cut-timeline offset at the start of each span
offs, acc = [], 0.0
for s, e in spans:
    offs.append(acc)
    acc += (e - s)
TOTAL = acc

def to_cut(t):
    """original-timeline second -> cut-timeline second (or None if t lands in a removed gap)."""
    for (s, e), off in zip(spans, offs):
        if s <= t <= e:
            return off + (t - s)
    return None

wj = json.load(open(a.words))
out = []
for seg in wj.get("segments", []):
    for w in seg.get("words", []):
        txt = w.get("word", "").strip()
        if not txt:
            continue
        s, e = float(w["start"]), float(w["end"])
        mid = (s + e) / 2
        ct = to_cut(mid)
        if ct is None:
            continue
        out.append({"word": txt, "t0": round(ct, 3), "t1": round(ct + (e - s), 3), "src": round(s, 3)})

out.sort(key=lambda w: w["t0"])
os.makedirs(os.path.dirname(os.path.abspath(a.out)) or ".", exist_ok=True)
json.dump(out, open(a.out + ".json", "w"), indent=0)
text = " ".join(w["word"] for w in out)
# light readability: collapse spaces before punctuation
for p in (",", ".", "?", "!", ";", ":"):
    text = text.replace(" " + p, p)
open(a.out + ".txt", "w").write(text + "\n")

print(f"✓ {len(out)} kept words · cut timeline {int(TOTAL//60)}:{int(TOTAL%60):02d}")
print(f"  {a.out}.json   {a.out}.txt")
