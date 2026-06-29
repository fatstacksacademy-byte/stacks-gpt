"""timemap.py — map spoken phrases to timeline windows (anchor overlays to words, not seconds).

Loads a word-timing JSON (the format produced by the autocut pipeline:
each entry has {"word", "t0", "t1", "src"}) and provides fuzzy, locality-biased
phrase search so overlays can be anchored to the exact spoken moment instead of a
guessed second.

Public API
----------
load_words(path) -> list[{"word": str, "t0": float, "t1": float}]
    Normalize an arbitrary word-timing JSON into a canonical schema. Tolerant of
    field-name variants (word/text/w, t0/start/begin, t1/end/stop).

find_phrase(words, phrase, near=None) -> {"t0", "t1", "score", "i0", "i1", "matched"}
    Slide the phrase (as a token sequence) over the words and return the best
    matching window. `score` is a 0..1 token-overlap similarity (order-aware,
    handles glued tokens like "$2"+",000"). When `near` (seconds) is given, ties
    and near-ties are broken toward the window closest to `near` so a phrase that
    recurs in the transcript resolves to the intended occurrence.

This module is import-only (no side effects) so check-overlays.py and any future
QC tool can reuse it.
"""

from __future__ import annotations

import json
import re
import unicodedata


# ---------------------------------------------------------------------------
# loading / normalization
# ---------------------------------------------------------------------------

_WORD_KEYS = ("word", "text", "w", "token", "value")
_T0_KEYS = ("t0", "start", "begin", "s", "from")
_T1_KEYS = ("t1", "end", "stop", "e", "to")


def _first_key(d, keys):
    for k in keys:
        if k in d and d[k] is not None:
            return d[k]
    return None


def load_words(path):
    """Load a word-timing JSON and normalize to [{word, t0, t1}].

    Accepts either a bare list of word dicts or a wrapper object containing a
    "words"/"segments" list. Field names are matched leniently so this works with
    the autocut cut-words.json format and reasonable variants.
    """
    with open(path, "r", encoding="utf-8") as fh:
        raw = json.load(fh)

    if isinstance(raw, dict):
        for key in ("words", "segments", "tokens", "items"):
            if isinstance(raw.get(key), list):
                raw = raw[key]
                break
        else:
            raise ValueError(
                f"{path}: object has no recognizable word list "
                f"(looked for words/segments/tokens/items)"
            )

    if not isinstance(raw, list):
        raise ValueError(f"{path}: expected a JSON list of word objects")

    out = []
    for i, item in enumerate(raw):
        if not isinstance(item, dict):
            raise ValueError(f"{path}: entry {i} is not an object")
        w = _first_key(item, _WORD_KEYS)
        t0 = _first_key(item, _T0_KEYS)
        t1 = _first_key(item, _T1_KEYS)
        if w is None or t0 is None:
            raise ValueError(
                f"{path}: entry {i} missing word/start "
                f"(keys present: {sorted(item.keys())})"
            )
        if t1 is None:
            t1 = t0
        out.append({"word": str(w), "t0": float(t0), "t1": float(t1)})
    return out


# ---------------------------------------------------------------------------
# tokenization
# ---------------------------------------------------------------------------

def normalize_token(s):
    """Lowercase, strip accents, drop surrounding punctuation, keep digits/$/%.

    "$2" -> "$2", ",000" -> "000", "73%" -> "73%", "churnable," -> "churnable".
    Tokens that reduce to nothing (pure punctuation) return "".
    """
    s = unicodedata.normalize("NFKD", str(s))
    s = "".join(c for c in s if not unicodedata.combining(c))
    s = s.lower()
    # keep word chars, digits, $ and % (money/rate distinguishers); space the rest
    s = re.sub(r"[^a-z0-9$%]+", " ", s)
    s = s.strip()
    return s


def tokenize_phrase(phrase):
    """Split a search phrase into normalized tokens, dropping empties."""
    toks = []
    for chunk in re.split(r"\s+", str(phrase).strip()):
        t = normalize_token(chunk)
        if t:
            # a chunk like "$2,000" normalizes to "$2 000" -> two tokens
            toks.extend(p for p in t.split(" ") if p)
    return toks


def _word_tokens(words):
    """Normalize each word entry to its token (may be '' for punctuation-only)."""
    return [normalize_token(w["word"]) for w in words]


# ---------------------------------------------------------------------------
# phrase search
# ---------------------------------------------------------------------------

def _window_score(phrase_toks, window_toks):
    """Order-aware overlap score in 0..1.

    Greedy left-to-right alignment: walk the window, consuming phrase tokens in
    order when they match (exact, or one being a prefix of the other to absorb
    glued money tokens like '$2'/'2'). The score is matched / len(phrase).
    """
    if not phrase_toks:
        return 0.0
    pi = 0
    matched = 0
    for wt in window_toks:
        if pi >= len(phrase_toks):
            break
        pt = phrase_toks[pi]
        if wt == pt or (wt and pt and (wt.startswith(pt) or pt.startswith(wt))):
            matched += 1
            pi += 1
    return matched / len(phrase_toks)


def find_phrase(words, phrase, near=None):
    """Find the best window for `phrase` in `words`.

    Returns {"t0", "t1", "score", "i0", "i1", "matched"} where i0..i1 is the
    inclusive word-index span. If nothing matches at all, score is 0.0 and the
    span/timestamps fall back to the `near` neighborhood (or the start).

    `near` (seconds) biases selection toward the closest occurrence — essential
    for phrases like "$400" or "$2,000" that recur many times in the transcript.
    """
    ptoks = tokenize_phrase(phrase)
    wtoks = _word_tokens(words)
    n = len(words)
    if n == 0 or not ptoks:
        return {"t0": 0.0, "t1": 0.0, "score": 0.0, "i0": -1, "i1": -1, "matched": 0}

    # Window length: phrase length, padded a little so glued/extra tokens fit.
    base = len(ptoks)
    win = base + max(2, base // 2)

    # total transcript span for normalizing the locality penalty
    span = max(1e-6, words[-1]["t1"] - words[0]["t0"])

    best = None  # (adj_score, raw_score, i0, i1)
    for i in range(n):
        # skip windows that start on a punctuation-only token unless it's the
        # only thing (keeps anchors landing on real words)
        end = min(n, i + win)
        window_tokens = [t for t in wtoks[i:end] if t]
        if not window_tokens:
            continue
        raw = _window_score(ptoks, window_tokens)
        if raw <= 0.0:
            continue

        # tighten the window to the actually-matched span so timestamps are crisp
        i0, i1 = _matched_span(ptoks, wtoks, i, end)
        wt0 = words[i0]["t0"]
        wt1 = words[i1]["t1"]

        adj = raw
        if near is not None:
            center = 0.5 * (wt0 + wt1)
            dist = abs(center - near) / span  # 0..1-ish
            # locality is a tiebreaker, not an override: scale within the
            # match-quality bucket so a clearly better text match still wins.
            adj = raw - 0.15 * dist

        cand = (adj, raw, i0, i1)
        if best is None or cand[0] > best[0] or (
            cand[0] == best[0] and cand[1] > best[1]
        ):
            best = cand

    if best is None:
        # nothing matched; fall back near the requested second (or start)
        if near is not None:
            idx = min(range(n), key=lambda k: abs(words[k]["t0"] - near))
        else:
            idx = 0
        return {
            "t0": words[idx]["t0"],
            "t1": words[idx]["t1"],
            "score": 0.0,
            "i0": idx,
            "i1": idx,
            "matched": 0,
        }

    _adj, raw, i0, i1 = best
    matched = round(raw * len(ptoks))
    return {
        "t0": words[i0]["t0"],
        "t1": words[i1]["t1"],
        "score": round(raw, 4),
        "i0": i0,
        "i1": i1,
        "matched": matched,
    }


def _matched_span(ptoks, wtoks, start, end):
    """Return inclusive word-index span covering the matched phrase tokens.

    Re-runs the greedy alignment over indices (not the filtered list) so we can
    report the first and last word indices that actually contributed to a match.
    """
    pi = 0
    first = None
    last = start
    for j in range(start, end):
        wt = wtoks[j]
        if not wt:
            continue
        if pi >= len(ptoks):
            break
        pt = ptoks[pi]
        if wt == pt or (wt.startswith(pt) or pt.startswith(wt)):
            if first is None:
                first = j
            last = j
            pi += 1
    if first is None:
        first = start
        last = start
    return first, last


def spoken_window(words, t0, t1, pad=1.0):
    """Join the words whose timing overlaps [t0 - pad, t1 + pad] into one string.

    Used to gather what was actually said around a resolved overlay window so
    assert-tokens / numbers can be checked against speech.
    """
    lo = t0 - pad
    hi = t1 + pad
    out = []
    for w in words:
        if w["t1"] >= lo and w["t0"] <= hi:
            out.append(w["word"])
    return " ".join(out)


if __name__ == "__main__":
    import argparse

    ap = argparse.ArgumentParser(
        description="Resolve a spoken phrase to a timeline window (debug CLI)."
    )
    ap.add_argument("words_json", help="path to word-timing JSON (cut-words.json)")
    ap.add_argument("phrase", help="phrase to locate")
    ap.add_argument("--near", type=float, default=None,
                    help="bias toward this second when the phrase recurs")
    args = ap.parse_args()

    ws = load_words(args.words_json)
    print(f"loaded {len(ws)} words "
          f"({ws[0]['t0']:.2f}s .. {ws[-1]['t1']:.2f}s)")
    r = find_phrase(ws, args.phrase, near=args.near)
    print(f"phrase: {args.phrase!r}")
    print(f"  window: [{r['t0']:.2f}s .. {r['t1']:.2f}s]  "
          f"score={r['score']}  matched={r['matched']}  span={r['i0']}..{r['i1']}")
    print("  spoken: " + spoken_window(ws, r["t0"], r["t1"]))
    raise SystemExit(0 if r["score"] > 0 else 2)
