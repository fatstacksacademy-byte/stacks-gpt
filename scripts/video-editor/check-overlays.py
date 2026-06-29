#!/usr/bin/env python3.14
"""check-overlays.py — gate overlays on what is SPOKEN, not on guessed seconds.

FIX #6. Overlays in the biz-20apy edit were "right topic, wrong asset, wrong
moment": the clawback graphic, the APY-example formula, the title-#6 card, and
the outro all sat at hand-typed seconds. This tool re-anchors every overlay to
its spoken phrase via lib/timemap.find_phrase, then verifies that an
asset-SPECIFIC distinguisher token is actually said inside the overlay's window.

A PASS requires, within the resolved window [t0-pad .. end+pad]:
  1. at least one of the overlay's `assert_tokens` is spoken, AND
  2. that token is NOT in the generic stoplist (bonus/apy/bank/money/account/
     percent/interest) — a graphic must be distinguished by something specific
     to the asset, not by a word that appears all over a banking video, AND
  3. if `number` is given (e.g. "$400"), that exact number appears in the window.

Any FAIL blocks render (exit 2) unless the overlay's `id` is waived in a
committed overlay-waivers.json. A run with zero failures exits 0.

Overlay spec JSON (list):
  [
    {
      "id": "outro-cta",                 # optional, used for waivers
      "anchor": "<unique spoken phrase>", # what to anchor to
      "near": 25.0,                       # optional: bias for recurring phrases
      "lines": ["...display text..."],    # the overlay copy (informational)
      "assert_tokens": ["chase", "73%"],  # asset-specific distinguishers
      "number": "$400"                    # optional exact number requirement
    },
    ...
  ]

Outputs overlay-recon.md (per overlay: window, spoken excerpt, matched/missing
tokens, PASS/FAIL) next to the spec by default.
"""

from __future__ import annotations

import argparse
import json
import os
import re
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from lib.timemap import load_words, find_phrase, spoken_window, normalize_token


# Generic finance words that CANNOT, on their own, justify an overlay. If an
# overlay's only spoken assert_token is one of these, it is treated as "no
# distinguisher present" -> FAIL.
GENERIC_STOPLIST = {
    "bonus", "bonuses", "apy", "bank", "banks", "money",
    "account", "accounts", "percent", "interest",
}

# minimum match quality for an anchor to count as "found" at all
MIN_ANCHOR_SCORE = 0.4

# seconds of slack on each side of the resolved window when collecting speech
SPOKEN_PAD = 1.0


def _norm_set(tokens):
    """Normalize a list of assert tokens, keeping their original form for report."""
    out = []
    for t in tokens:
        n = normalize_token(t)
        # an assert token may itself be multi-token (e.g. "73 %"); join on space
        n = " ".join(p for p in n.split(" ") if p)
        out.append((t, n))
    return out


def _spoken_norm_string(spoken):
    """Normalized, single-spaced token string of the spoken window for matching."""
    toks = [normalize_token(w) for w in spoken.split()]
    toks = [t for t in toks if t]
    # split glued normalizations and re-join
    flat = []
    for t in toks:
        flat.extend(p for p in t.split(" ") if p)
    return " " + " ".join(flat) + " "


def _token_spoken(norm_token, spoken_norm):
    """Is a (possibly multi-word) normalized assert token present in the speech?"""
    if not norm_token:
        return False
    # word-boundary-ish: surround with spaces so "apy" doesn't match "apyx"
    needle = " " + norm_token + " "
    if needle in spoken_norm:
        return True
    # also accept token as a prefix of a spoken token for glued money like $400
    # (spoken_norm already space-separated; check each token)
    for tok in spoken_norm.split():
        if tok == norm_token or tok.startswith(norm_token) and norm_token.startswith("$"):
            return True
    return False


def _number_spoken(number, spoken):
    """Exact number check, tolerant of whisper's '$2 ,000' splitting.

    Compares digit/$ signatures: "$400" -> "$400"; "$2,000" matches spoken
    "$2 ,000" because both reduce to "$2000".
    """
    def sig(s):
        return re.sub(r"[^0-9$]", "", s)
    want = sig(number)
    if not want:
        return False
    spoken_sig = sig(spoken)
    return want in spoken_sig


def check_overlay(words, ov):
    """Resolve and verify one overlay. Returns a result dict."""
    anchor = ov.get("anchor", "")
    near = ov.get("near")
    res = find_phrase(words, anchor, near=near)

    spoken = spoken_window(words, res["t0"], res["t1"], pad=SPOKEN_PAD)
    spoken_norm = _spoken_norm_string(spoken)

    assert_tokens = ov.get("assert_tokens", []) or []
    norm_pairs = _norm_set(assert_tokens)

    matched_specific = []
    matched_generic = []
    missing = []
    for orig, norm in norm_pairs:
        present = _token_spoken(norm, spoken_norm)
        # a token is "generic" if every word in it is in the stoplist
        words_in = [w for w in norm.split() if w]
        is_generic = bool(words_in) and all(w in GENERIC_STOPLIST for w in words_in)
        if present and not is_generic:
            matched_specific.append(orig)
        elif present and is_generic:
            matched_generic.append(orig)
        else:
            missing.append(orig)

    number = ov.get("number")
    number_ok = True
    if number:
        number_ok = _number_spoken(number, spoken)

    reasons = []
    if res["score"] < MIN_ANCHOR_SCORE:
        reasons.append(
            f"anchor not found (best score {res['score']} < {MIN_ANCHOR_SCORE})"
        )
    if not matched_specific:
        if matched_generic:
            reasons.append(
                "only GENERIC tokens spoken in window "
                f"({', '.join(matched_generic)}); need an asset-specific distinguisher"
            )
        else:
            reasons.append("no assert_token spoken in window")
    if number and not number_ok:
        reasons.append(f"number {number!r} not spoken in window")

    passed = len(reasons) == 0
    return {
        "id": ov.get("id") or anchor,
        "anchor": anchor,
        "near": near,
        "t0": res["t0"],
        "t1": res["t1"],
        "score": res["score"],
        "spoken": spoken,
        "matched_specific": matched_specific,
        "matched_generic": matched_generic,
        "missing": missing,
        "number": number,
        "number_ok": number_ok,
        "passed": passed,
        "reasons": reasons,
    }


def fmt_ts(s):
    m = int(s // 60)
    sec = s - 60 * m
    return f"{m:d}:{sec:05.2f}"


def write_recon(results, path, spec_path, words_path, waived):
    lines = []
    lines.append("# Overlay recon — anchored to spoken phrases (FIX #6)\n")
    lines.append(f"- spec: `{spec_path}`")
    lines.append(f"- words: `{words_path}`")
    n_pass = sum(1 for r in results if r["passed"])
    n_fail = len(results) - n_pass
    n_waived = sum(1 for r in results if not r["passed"] and r["id"] in waived)
    lines.append(f"- overlays: {len(results)}  PASS: {n_pass}  FAIL: {n_fail}"
                 f"  (waived: {n_waived})")
    lines.append(f"- generic stoplist (cannot satisfy a PASS): "
                 f"{', '.join(sorted(GENERIC_STOPLIST))}\n")

    for r in results:
        status = "PASS" if r["passed"] else "FAIL"
        if not r["passed"] and r["id"] in waived:
            status = "FAIL (WAIVED)"
        lines.append(f"## [{status}] {r['id']}")
        lines.append(f"- anchor: \"{r['anchor']}\""
                     + (f"  (near {r['near']}s)" if r["near"] is not None else ""))
        lines.append(f"- window: [{fmt_ts(r['t0'])} .. {fmt_ts(r['t1'])}]"
                     f"  (anchor score {r['score']})")
        lines.append(f"- spoken (±{SPOKEN_PAD:.0f}s): \"{r['spoken']}\"")
        if r["matched_specific"]:
            lines.append(f"- matched (specific): {', '.join(r['matched_specific'])}")
        if r["matched_generic"]:
            lines.append(f"- matched (GENERIC, rejected): {', '.join(r['matched_generic'])}")
        if r["missing"]:
            lines.append(f"- missing: {', '.join(r['missing'])}")
        if r["number"]:
            lines.append(f"- number {r['number']}: "
                         + ("present" if r["number_ok"] else "MISSING"))
        if r["reasons"]:
            lines.append(f"- reasons: {'; '.join(r['reasons'])}")
        lines.append("")

    with open(path, "w", encoding="utf-8") as fh:
        fh.write("\n".join(lines))


def load_waivers(path):
    if not path or not os.path.exists(path):
        return set()
    with open(path, "r", encoding="utf-8") as fh:
        data = json.load(fh)
    # accept {"waived": ["id", ...]} or a bare list
    if isinstance(data, dict):
        ids = data.get("waived", [])
    else:
        ids = data
    return {str(x) for x in ids}


def main(argv=None):
    ap = argparse.ArgumentParser(
        description="Anchor overlays to spoken phrases and gate render on speech."
    )
    ap.add_argument("spec", help="overlay-spec JSON (list of overlays)")
    ap.add_argument("words", help="word-timing JSON (cut-words.json)")
    ap.add_argument("--waivers", default=None,
                    help="overlay-waivers.json (FAILs listed here don't block)")
    ap.add_argument("--recon", default=None,
                    help="output recon markdown (default: overlay-recon.md by spec)")
    args = ap.parse_args(argv)

    words = load_words(args.words)
    with open(args.spec, "r", encoding="utf-8") as fh:
        spec = json.load(fh)
    if not isinstance(spec, list):
        print("FAIL: overlay spec must be a JSON list", file=sys.stderr)
        return 3

    waived = load_waivers(args.waivers)

    results = [check_overlay(words, ov) for ov in spec]

    recon_path = args.recon or os.path.join(
        os.path.dirname(os.path.abspath(args.spec)), "overlay-recon.md"
    )
    write_recon(results, recon_path, args.spec, args.words, waived)

    print(f"loaded {len(words)} words; {len(results)} overlays\n")
    blocking = 0
    for r in results:
        if r["passed"]:
            tag = "PASS"
        elif r["id"] in waived:
            tag = "FAIL(WAIVED)"
        else:
            tag = "FAIL"
            blocking += 1
        spec_hit = (", ".join(r["matched_specific"]) or "-")
        print(f"[{tag:12s}] {r['id']:<28s} "
              f"[{fmt_ts(r['t0'])}..{fmt_ts(r['t1'])}] "
              f"specific={spec_hit}")
        if not r["passed"]:
            print(f"             reasons: {'; '.join(r['reasons'])}")

    print(f"\nrecon written: {recon_path}")
    if blocking:
        print(f"\nFAIL: {blocking} overlay(s) block render "
              f"(not in waivers). Fix anchors/assets or waive explicitly.")
        return 2
    print("\nPASS: all overlays anchored & distinguished (or waived).")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
