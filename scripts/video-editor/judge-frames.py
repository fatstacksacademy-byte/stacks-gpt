#!/usr/bin/env python3
"""
judge-frames.py — turn the human-gated QC into an AGENT-ACTIONABLE pass.

WHY THIS EXISTS
  verify-frames.py is deliberately a HUMAN gate: it extracts the user's named frames,
  tiles a contact sheet, prints NEEDS_VISION_CHECK and exits 2 so a person (or Claude
  reading the PNG) eyeballs every moment before anyone says "done". That's the right
  call for a final sign-off — but it can't run unattended, and it can't loop its findings
  back into a pipeline. There is no machine-readable verdict, so a Makefile / batch render
  / overnight agent has nothing to gate on.

  judge-frames.py is the unattended sibling. Given a rendered video + a plan.json (the
  edit's beats, each with a time and optionally the overlay rectangles placed at that
  beat), it extracts the frame AT EACH BEAT and JUDGES it, then writes the findings back
  as an actionable report (judge-report.md + judge-report.json) and exits non-zero if any
  beat fails — so it can gate a pipeline. The FIX loop stays with the editor; this only
  produces the verdict + the reasons.

  It does NOT replace verify-frames.py (keep that as the final human eyeball). It front-runs
  it: catch the gross, deterministic failures (face covered by a graphic, text clipped at a
  frame edge, a black/dead frame) automatically, so the human only adjudicates the subtle ones.

TWO LAYERS OF JUDGEMENT
  1. DETERMINISTIC (zero-token, always on):
       - run build/vision-roi on each beat frame -> face ROI (Apple Vision, the same tool
         head-track.py / roi-verify.py use).
       - FACE COVERAGE: for every overlay rect declared on the beat, compute how much of the
         measured face it covers. A graphic sitting on the host's face is the #1 produced-edit
         sin (see roi-verify.py FIX #7). >--face-cover-max of the face area covered -> FAIL.
       - TEXT/EDGE CLIPPING: strong edge-energy hugging a frame border usually means a caption
         or card is overflowing off-screen (the "$400 cut off" bug). Measured per-border; a
         border whose mean gradient magnitude is >--edge-z standard deviations over the
         interior baseline -> flag that border.
       - GROSS ANOMALY: a near-black / near-blank / single-colour frame (dead render, missing
         layer) -> FAIL.

  2. VISION-LLM (metered, OPT-IN via --llm, guarded by ANTHROPIC_API_KEY):
       - send the beat frame (base64) to the Anthropic Messages API with a strict rubric and
         get back {pass, issues:[...]}. Degrades to deterministic-only when the key is unset
         or the call fails (warn + continue), copying the llmPass pattern in correct-captions.ts.
       - the LLM's issues are MERGED into the deterministic ones; an LLM "fail" fails the beat.

PLAN.JSON FORMAT (this file's input — the editor's INTENT per beat)
  {
    "video": "build/<slug>/produced.mp4",        # optional; --video overrides
    "beats": [
      {"t": "0:18", "label": "Chase $400 offer",
       "expect": "offer screen, $400 centered, no graphic on face",
       "overlays": [[60, 60, 900, 160]]},         # rects [x,y,w,h] placed AT this beat (px)
      {"t": 531, "label": "fee panel"},           # t may be seconds or mm:ss; overlays optional
      {"t": "11:42", "label": "outro card", "overlays": [{"x":1380,"y":760,"w":480,"h":280}]}
    ]
  }
  - `t`        : REQUIRED. seconds (531, 10.5) or mm:ss / hh:mm:ss (8:51) — parsed like verify-frames.py.
  - `overlays` : OPTIONAL list of rects, each [x,y,w,h] OR {x,y,w,h}, in SOURCE top-left px
                 (same coordinate space build/vision-roi reports). Used for face-coverage.
  - `label` / `expect` : OPTIONAL strings, carried into the report and the LLM rubric.

OUTPUT
  - judge-report.json : {video, fps, dur, generated, beats:[{t, t_sec, label, pass,
                         face_cover_pct, issues:[...], ...}], summary:{...}}
  - judge-report.md   : human-skimmable per-beat verdict.
  Exit 0 = all beats pass; 4 = one or more beats fail; 3 = usage / IO error.

SELF-CONTAINED on purpose: it re-implements the small geometry it needs (rect overlap,
frame extraction) rather than importing roi-verify/verify-frames, so it never perturbs those
proven gates. Do not refactor it to share their internals.

Deps: ffmpeg, ffprobe, build/vision-roi (auto-compiled if missing), numpy, Pillow — all
already on this machine. Stdlib otherwise. Zero-token unless --llm AND a key are present.
"""
import argparse
import base64
import datetime
import json
import os
import subprocess
import sys
import tempfile
import urllib.error
import urllib.request
from pathlib import Path

import numpy as np
from PIL import Image

HERE = Path(__file__).resolve().parent
VISION = HERE / "build" / "vision-roi"
SWIFT_SRC = HERE / "vision-roi.swift"


def _load_env_local():
    """Pick up ANTHROPIC_API_KEY from the repo's gitignored .env.local (or .env) so
    the optional --llm vision judge works without the user exporting it. Walks up
    from this file; only fills vars NOT already set (a shell export always wins)."""
    for d in [HERE, *HERE.parents]:
        for name in (".env.local", ".env"):
            f = d / name
            if f.exists():
                for raw in f.read_text().splitlines():
                    line = raw.strip()
                    if not line or line.startswith("#") or "=" not in line:
                        continue
                    k, _, v = line.partition("=")
                    k = k.strip().removeprefix("export ").strip()
                    v = v.strip().strip('"').strip("'")
                    if k and k not in os.environ:
                        os.environ[k] = v
                return  # nearest env file wins

# ── defaults (tunable via flags) ──────────────────────────────────────────────
FACE_COVER_MAX = 0.20   # an overlay may cover at most 20% of the face area before FAIL
EDGE_Z = 3.0            # border edge-energy this many SDs over interior baseline = clipping flag
DARK_MEAN_MAX = 8.0     # whole-frame mean luma <= this (0-255) = dead/black frame
FLAT_STD_MAX = 3.0      # whole-frame luma std <= this = blank/single-colour frame


def eprint(*a, **k):
    print(*a, file=sys.stderr, **k)


# ── timecode parsing (mirrors verify-frames.parse_tc / fmt_tc; kept local) ────
def parse_tc(s):
    """'8:51' -> 531.0 ; '1:02:03' -> 3723.0 ; '531' -> 531.0 ; '12.5' -> 12.5"""
    s = str(s).strip()
    if ":" in s:
        sec = 0.0
        for p in s.split(":"):
            if p.strip() == "":
                raise ValueError(f"empty timecode field in {s!r}")
            sec = sec * 60.0 + float(p)
        return sec
    return float(s)


def fmt_tc(sec):
    if sec is None:
        return "?"
    sec = max(0.0, sec)
    m = int(sec // 60)
    s = sec - m * 60
    return f"{m}:{s:05.2f}"


# ── ffprobe / ffmpeg (frame extraction matches verify-frames / framediff) ─────
def ffprobe_meta(video):
    out = subprocess.run(
        ["ffprobe", "-v", "error", "-select_streams", "v:0",
         "-show_entries", "stream=r_frame_rate", "-show_entries", "format=duration",
         "-of", "json", video], capture_output=True, text=True)
    try:
        j = json.loads(out.stdout)
        num, den = j["streams"][0]["r_frame_rate"].split("/")
        fps = float(num) / float(den or 1)
        dur = float(j["format"]["duration"])
        return fps, dur
    except Exception:
        return 24.0, None


def extract_frame(video, t, out_png):
    """Accurate seek (decode-then-seek): -ss BEFORE -i would snap to a keyframe and
    judge the wrong moment, exactly the failure verify-frames.py warns about. Slower,
    honest. Returns True iff a non-empty PNG landed."""
    subprocess.run(
        ["ffmpeg", "-y", "-v", "error", "-ss", f"{max(0.0, t):.3f}", "-i", video,
         "-frames:v", "1", "-q:v", "2", out_png], check=False)
    return os.path.exists(out_png) and os.path.getsize(out_png) > 0


def ensure_vision():
    """Compile build/vision-roi on first use (same one-time build head-track.py does)."""
    if VISION.exists():
        return True
    eprint("· compiling vision-roi (one-time)…")
    VISION.parent.mkdir(parents=True, exist_ok=True)
    r = subprocess.run(["xcrun", "swiftc", "-O", str(SWIFT_SRC), "-o", str(VISION)],
                       capture_output=True, text=True)
    if r.returncode != 0 or not VISION.exists():
        eprint(f"⚠ could not build vision-roi (face checks skipped):\n{r.stderr[-400:]}")
        return False
    return True


def run_vision(png):
    """Return the parsed vision-roi JSON for one frame, or None on any failure."""
    if not VISION.exists():
        return None
    r = subprocess.run([str(VISION), png], capture_output=True, text=True)
    try:
        return json.loads(r.stdout)
    except Exception:
        return None


# ── geometry (local copies; do not import roi-verify) ─────────────────────────
def norm_rect(r):
    """Accept [x,y,w,h] or {x,y,w,h}; return [x,y,w,h] ints, or None if malformed."""
    try:
        if isinstance(r, dict):
            return [int(r["x"]), int(r["y"]), int(r["w"]), int(r["h"])]
        if isinstance(r, (list, tuple)) and len(r) >= 4:
            return [int(r[0]), int(r[1]), int(r[2]), int(r[3])]
    except Exception:
        pass
    return None


def rect_area(b):
    return max(0, b[2]) * max(0, b[3])


def intersect_area(a, b):
    x0 = max(a[0], b[0])
    y0 = max(a[1], b[1])
    x1 = min(a[0] + a[2], b[0] + b[2])
    y1 = min(a[1] + a[3], b[1] + b[3])
    if x1 <= x0 or y1 <= y0:
        return 0
    return (x1 - x0) * (y1 - y0)


def face_to_rect(face):
    """vision-roi face {cx,cy,w,h} -> top-left [x,y,w,h]."""
    return [face["cx"] - face["w"] // 2, face["cy"] - face["h"] // 2, face["w"], face["h"]]


# ── deterministic checks ──────────────────────────────────────────────────────
def check_face_coverage(face_rect, overlays, cover_max):
    """How much of the face does the most-covering overlay hide? Returns
    (cover_pct float 0..1, issue_or_None)."""
    if not face_rect or not overlays:
        return 0.0, None
    fa = rect_area(face_rect)
    if fa <= 0:
        return 0.0, None
    best = 0.0
    for ov in overlays:
        best = max(best, intersect_area(face_rect, ov) / fa)
    if best > cover_max:
        return best, (f"face {best * 100:.0f}% covered by an overlay "
                      f"(max {cover_max * 100:.0f}%)")
    return best, None


def check_edge_clipping(luma, edge_z):
    """Detect a caption/card overflowing off a frame edge.

    Idea: a text element that runs off the side leaves abnormally strong, sharp
    gradients hugging that border (the cut-off glyph stems) vs the calmer picture
    interior. We compute per-pixel gradient magnitude, then for each border compare a
    HIGH-PERCENTILE of the energy in a thin band against an interior baseline. The
    percentile (not the mean) matters: a clip is usually a LOCAL run of glyphs along a
    fraction of the border, so averaging over the whole border length washes it out;
    the 99.5th-percentile band energy stays high wherever the clipped text touches the
    edge. A border whose p99.5 energy is `edge_z` robust-SDs over the interior p99.5 is
    flagged. This is a heuristic screen — a genuinely busy real edge can trip it — so it's
    a soft 'clip?' flag, NOT an auto-FAIL on its own (it surfaces in the report but the
    beat fails only on face-coverage / dark / LLM). Returns a list of issue strings."""
    L = luma.astype(np.float64)
    h, w = L.shape
    if h < 40 or w < 40:
        return []
    band = max(4, min(h, w) // 60)            # ~thin border band

    # The physical signature of a clipped element is two things AT ONCE on a border:
    #   (1) the OUTERMOST edge line carries real CONTENT — its luma deviates strongly
    #       from the frame's background level (a glyph/card touching the boundary), and
    #   (2) that content was CUT — there is a strong gradient hugging the border (the
    #       sliced glyph stems), unlike picture that fades smoothly to the edge.
    # Requiring BOTH avoids firing on a normal busy-but-uncut edge, and—unlike a pure
    # gradient test—still catches a SOLID clipped block that runs flat to the very edge
    # (where the interior of the block has no gradient at all).
    bg = float(np.median(L))                                  # frame background level
    spread = float(np.percentile(L, 95) - np.percentile(L, 5)) or 1.0
    gy, gx = np.gradient(L)
    mag = np.hypot(gx, gy)

    # outermost edge LINE (1px) and the gradient BAND just inside it, per border
    lines = {
        "left":   (L[:, 0],        mag[:, :band]),
        "right":  (L[:, -1],       mag[:, w - band:]),
        "top":    (L[0, :],        mag[:band, :]),
        "bottom": (L[-1, :],       mag[h - band:, :]),
    }
    issues = []
    for name, (edge_line, gband) in lines.items():
        # (1) fraction of the edge line that is strong CONTENT vs background
        content_frac = float((np.abs(edge_line - bg) > (0.5 * spread)).mean())
        # (2) the cut: the sharpest gradient hugging this border, in units of frame
        #     spread. THIS is the real discriminator. Normal footage that simply reaches
        #     the bottom edge (a body, a desk) fades into the border with a gentle cut
        #     (~0.5-1x spread); a graphic/caption SLICED at the boundary leaves a hard
        #     vertical/horizontal step with a cut of many-x spread (10x+ in practice).
        #     So we do NOT cap it — the magnitude of the slice is what tells a clip apart
        #     from ordinary edge content.
        cut = float(np.percentile(gband, 99.9)) / spread
        # require BOTH meaningful content on the literal edge AND a hard slice. The
        # `edge_z` knob scales the cut threshold (default 3 -> needs cut > ~3x spread,
        # well above real-footage ~1x but far below a true clip's 10x+).
        if content_frac > 0.04 and cut > (edge_z + 1.0):
            issues.append(f"{name} edge: {content_frac * 100:.0f}% of the border line is "
                          f"bright content sliced at the boundary (cut={cut:.0f}×); "
                          f"text/graphic may be clipped off-frame")
    return issues


def check_gross_anomaly(luma):
    """Dead-black or single-colour frame = a layer failed to render. Returns issue or None."""
    mean = float(luma.mean())
    std = float(luma.std())
    if mean <= DARK_MEAN_MAX:
        return f"near-black frame (mean luma {mean:.1f}) — layer/render likely missing"
    if std <= FLAT_STD_MAX:
        return f"near-flat frame (luma std {std:.1f}) — single colour / blank composite?"
    return None


def luma_of(png):
    """Greyscale ndarray (0-255 float-friendly uint8) of a frame, or None."""
    try:
        with Image.open(png) as im:
            return np.asarray(im.convert("L"))
    except Exception:
        return None


# ── optional vision-LLM judge (metered; mirrors correct-captions.ts llmPass) ──
def llm_judge(png, beat):
    """Ask Claude to eyeball the frame. Returns (pass_bool_or_None, issues[list]).
    pass=None means 'no verdict' (no key / failure) -> caller treats as skipped."""
    key = os.environ.get("ANTHROPIC_API_KEY")
    if not key:
        eprint("⚠ --llm requested but ANTHROPIC_API_KEY is unset → skipping LLM judge "
               "(deterministic only).")
        return None, []
    try:
        with open(png, "rb") as fh:
            b64 = base64.standard_b64encode(fh.read()).decode("ascii")
    except Exception as e:
        eprint(f"⚠ LLM judge: cannot read frame {png}: {e} → deterministic only.")
        return None, []

    ctx = ""
    if beat.get("label"):
        ctx += f" This beat is labelled: {beat['label']}."
    if beat.get("expect"):
        ctx += f" It should show: {beat['expect']}."
    # Calibrated rubric: a generic "is anything clipped/wrong?" prompt cries wolf on this
    # content (it flagged the video's real 73%-effective-APY thesis as an "error", normal
    # web-page b-roll cropping, intentional page-focus blur + privacy redaction, and the host's
    # physical whiteboard near the frame edge). Fail ONLY for genuine production mistakes.
    prompt = (
        "You are QC-ing ONE frame from a finished, PUBLISHED US credit-card / bank-bonus finance "
        "YouTube video." + ctx +
        " Fail the frame ONLY for a real production mistake a viewer would notice:\n"
        " - a graphic / overlay / title-card that OBSCURES the host's face (covers his eyes or mouth); or\n"
        " - a clearly BROKEN or MISSING asset: a magenta/checkerboard/solid placeholder box, literal "
        "'PLACEHOLDER'/'TODO'/'undefined'/'NaN'/error text, or a hard rendering glitch; or\n"
        " - OUR OWN added graphics (captions, number callouts, lower-thirds, title cards) that are garbled, "
        "overlapping illegibly, or cut off mid-word.\n"
        "Do NOT flag the following — they are intentional and correct:\n"
        " - any dollar amount, percent, or APY that merely seems high or surprising; this is the creator's real "
        "claim (a high effective/annualized APY from a bonus is the whole point) — never second-guess the figures.\n"
        " - a website or app SCREENSHOT used as b-roll showing browser tabs, nav menus, cookie banners, or page "
        "content cropped at the frame edges — that is normal framing of a captured page.\n"
        " - deliberate effects: a blurred/dimmed page with ONE highlighted/spotlit region, a yellow highlighter "
        "sweep, or BLACK PRIVACY-REDACTION bars over account/business details.\n"
        " - the host's physical SET (whiteboard, corkboard, papers) sitting near or partly past a frame edge.\n"
        " - the host holding or gesturing with a prop (a card, a statement) near his face.\n"
        " - a full-screen b-roll cutaway where the host is not visible at all (intentional).\n"
        "If the beat is labelled a graphic / b-roll window, EXPECT a page or cutaway and treat an absent face or "
        "edge-cropped page as normal. Bias toward PASS; fail only when you are confident it is a real mistake.\n"
        "Respond with STRICT JSON and nothing else: "
        '{"pass": true|false, "issues": ["short specific issue", ...]}. Empty issues list when clean.'
    )
    body = json.dumps({
        "model": "claude-opus-4-8",
        "max_tokens": 600,
        "messages": [{
            "role": "user",
            "content": [
                {"type": "image",
                 "source": {"type": "base64", "media_type": "image/png", "data": b64}},
                {"type": "text", "text": prompt},
            ],
        }],
    }).encode("utf-8")
    req = urllib.request.Request(
        "https://api.anthropic.com/v1/messages", data=body,
        headers={"content-type": "application/json", "x-api-key": key,
                 "anthropic-version": "2023-06-01"})
    try:
        with urllib.request.urlopen(req, timeout=60) as resp:
            data = json.loads(resp.read().decode("utf-8"))
        txt = (data.get("content") or [{}])[0].get("text", "")
        verdict = json.loads(txt[txt.index("{"):txt.rindex("}") + 1])
        passed = bool(verdict.get("pass", True))
        issues = [str(x) for x in (verdict.get("issues") or [])]
        return passed, issues
    except (urllib.error.URLError, ValueError, KeyError, json.JSONDecodeError) as e:
        eprint(f"⚠ LLM judge failed ({e}) → deterministic only for this beat.")
        return None, []


# ── per-beat orchestration ────────────────────────────────────────────────────
def judge_beat(video, beat, idx, fps, dur, framedir, use_llm, cover_max, edge_z):
    t = parse_tc(beat["t"])
    # real generated plans label the beat in `beat`/`section`, not `label`; fall back.
    label = beat.get("label") or beat.get("beat") or beat.get("section") or ""
    expect = beat.get("expect", "")

    # A beat past the real clip end is a plan/video MISMATCH — fail it loudly rather than
    # silently judging the last frame (which almost always 'passes' and hides the problem).
    if dur and t > dur + 0.05:
        return {
            "t": str(beat["t"]), "t_sec": round(t, 3), "label": label, "expect": expect,
            "frame": None, "face_seen": False, "face_cover_pct": 0.0,
            "issues": [f"beat t={t:.2f}s is PAST clip end (dur {dur:.2f}s) — plan/video mismatch"],
            "llm_pass": None, "pass": False, "overlays": [],
        }
    t_clamped = min(max(0.0, t), dur - 0.05) if dur else max(0.0, t)

    overlays = []
    for raw in beat.get("overlays", []) or []:
        r = norm_rect(raw)
        if r is not None:
            overlays.append(r)
        elif isinstance(raw, (list, tuple)):  # looked like a rect but wasn't — worth a warning
            eprint(f"  ! beat {beat['t']}: skipping malformed overlay rect {raw!r}")
        # else: a text/caption overlay ({lines:[…]}) carries no geometry — expected, skip silently.

    # index the filename so distinct beats whose t only differs by punctuation
    # (e.g. "0:18" vs "0.18") can't collapse to the same PNG and overwrite each other.
    safe = "".join(c if c.isalnum() else "_" for c in str(beat["t"]))[:20]
    png = os.path.join(framedir, f"beat_{idx:03d}_{safe}.png")
    issues = []
    face_cover = 0.0
    face_seen = False

    if not extract_frame(video, t_clamped, png):
        return {
            "t": str(beat["t"]), "t_sec": round(t, 3), "label": label, "expect": expect,
            "frame": None, "face_seen": False,
            "face_cover_pct": 0.0, "issues": ["NO FRAME extracted (past clip end / decode error)"],
            "llm_pass": None, "pass": False, "overlays": overlays,
        }

    # deterministic: vision face + coverage
    vis = run_vision(png)
    if vis and vis.get("face"):
        face_seen = True
        frect = face_to_rect(vis["face"])
        face_cover, cov_issue = check_face_coverage(frect, overlays, cover_max)
        if cov_issue:
            issues.append(cov_issue)
    elif overlays:
        # overlays declared but no face found — note it (can't judge coverage)
        issues.append("no face detected; overlay face-coverage could not be verified")

    # deterministic: edge clipping + gross anomaly
    luma = luma_of(png)
    if luma is not None:
        anom = check_gross_anomaly(luma)
        if anom:
            issues.append(anom)
        issues.extend(check_edge_clipping(luma, edge_z))

    # optional LLM
    llm_pass = None
    if use_llm:
        llm_pass, llm_issues = llm_judge(png, beat)
        for it in llm_issues:
            issues.append(f"[vision] {it}")

    # verdict: deterministic FAIL on face-coverage / no-frame / gross anomaly,
    # OR an explicit LLM fail. Soft edge flags are reported but, alone, do not fail
    # (a busy real edge can trip them); they still surface for the editor.
    hard_fail = any(
        ("covered by an overlay" in i) or ("NO FRAME" in i) or
        ("near-black" in i) or ("near-flat" in i)
        for i in issues
    )
    beat_pass = not hard_fail and (llm_pass is not False)

    return {
        "t": str(beat["t"]), "t_sec": round(t, 3), "label": label,
        "expect": expect, "frame": png, "face_seen": face_seen,
        "face_cover_pct": round(face_cover * 100, 1), "issues": issues,
        "llm_pass": llm_pass, "pass": beat_pass, "overlays": overlays,
    }


# ── reports ───────────────────────────────────────────────────────────────────
def write_reports(results, video, fps, dur, outdir, used_llm):
    n_fail = sum(1 for r in results if not r["pass"])
    summary = {
        "beats": len(results),
        "pass": len(results) - n_fail,
        "fail": n_fail,
        "llm": used_llm,
    }
    payload = {
        "video": video,
        "fps": round(fps, 3),
        "dur": dur,
        "generated": datetime.datetime.now().isoformat(timespec="seconds"),
        "summary": summary,
        "beats": results,
    }
    json_path = os.path.join(outdir, "judge-report.json")
    with open(json_path, "w", encoding="utf-8") as fh:
        json.dump(payload, fh, indent=2)

    lines = [
        "# Judge-frames report — agent-actionable QC",
        "",
        f"- video: `{video}`  (fps~{fps:.2f}, dur {fmt_tc(dur)})",
        f"- generated: {payload['generated']}",
        f"- vision-LLM judge: {'ON' if used_llm else 'off (deterministic only)'}",
        f"- beats: {summary['beats']}  PASS: {summary['pass']}  **FAIL: {summary['fail']}**",
        "",
    ]
    for r in results:
        tag = "PASS" if r["pass"] else "FAIL"
        lines.append(f"## [{tag}] beat {r['t']}  ({fmt_tc(r['t_sec'])})"
                     + (f" — {r['label']}" if r["label"] else ""))
        if r["expect"]:
            lines.append(f"- expect: {r['expect']}")
        lines.append(f"- face detected: {'yes' if r['face_seen'] else 'no'}"
                     + (f"  · face covered: {r['face_cover_pct']}%" if r["face_seen"] else ""))
        if r["overlays"]:
            lines.append(f"- declared overlays: {r['overlays']}")
        if r["llm_pass"] is not None:
            lines.append(f"- vision-LLM verdict: {'pass' if r['llm_pass'] else 'FAIL'}")
        if r["issues"]:
            lines.append("- issues:")
            for it in r["issues"]:
                lines.append(f"  - {it}")
        else:
            lines.append("- issues: none")
        if r["frame"]:
            lines.append(f"- frame: `{r['frame']}`")
        lines.append("")
    md_path = os.path.join(outdir, "judge-report.md")
    with open(md_path, "w", encoding="utf-8") as fh:
        fh.write("\n".join(lines))
    return json_path, md_path


def main(argv=None):
    ap = argparse.ArgumentParser(
        description="Agent-actionable QC: extract + JUDGE each plan beat's frame "
                    "(face coverage, edge clipping, dead frames; optional vision-LLM). "
                    "Exit 4 if any beat fails.")
    ap.add_argument("--plan", required=True, help="plan JSON with a 'beats' array")
    ap.add_argument("--video", help="rendered video (overrides plan.video)")
    ap.add_argument("--out", help="output dir for report + frames (default: <plan dir>/judge)")
    ap.add_argument("--llm", action="store_true",
                    help="add the metered vision-LLM judge (needs ANTHROPIC_API_KEY; "
                         "degrades to deterministic-only if unset)")
    ap.add_argument("--face-cover-max", type=float, default=FACE_COVER_MAX,
                    help=f"max fraction of the face an overlay may cover before FAIL "
                         f"(default {FACE_COVER_MAX})")
    ap.add_argument("--edge-z", type=float, default=EDGE_Z,
                    help=f"border edge-energy SDs over interior to flag clipping "
                         f"(default {EDGE_Z})")
    ap.add_argument("--keep-frames", action="store_true",
                    help="keep ALL extracted beat frames in the out dir. Default: keep only "
                         "FAILING beats' frames (so a failing report stays inspectable) and "
                         "delete passing ones.")
    args = ap.parse_args(argv)
    _load_env_local()  # so --llm picks up ANTHROPIC_API_KEY from .env.local

    if not os.path.exists(args.plan):
        eprint(f"FATAL: no plan at {args.plan}")
        return 3
    try:
        with open(args.plan, "r", encoding="utf-8") as fh:
            plan = json.load(fh)
    except Exception as e:
        eprint(f"FATAL: cannot parse plan {args.plan}: {e}")
        return 3

    beats = plan.get("beats", [])
    if not beats:
        eprint("FATAL: plan has no 'beats' array")
        return 3

    video = args.video or plan.get("video")
    if not video:
        eprint("FATAL: no video given (--video or plan.video)")
        return 3
    # resolve a relative plan.video against the plan's directory
    if not os.path.isabs(video):
        cand = os.path.join(os.path.dirname(os.path.abspath(args.plan)), video)
        video = cand if os.path.exists(cand) else video
    if not os.path.exists(video):
        eprint(f"FATAL: rendered video not found: {video} (render first)")
        return 3

    outdir = args.out or os.path.join(os.path.dirname(os.path.abspath(args.plan)), "judge")
    os.makedirs(outdir, exist_ok=True)

    ensure_vision()  # best-effort; face checks degrade if it can't build
    fps, dur = ffprobe_meta(video)

    results = []
    for idx, beat in enumerate(beats):
        if "t" not in beat:
            eprint(f"  ! skipping beat with no 't': {beat}")
            continue
        try:
            results.append(
                judge_beat(video, beat, idx, fps, dur, outdir, args.llm,
                           args.face_cover_max, args.edge_z))
        except Exception as e:
            eprint(f"  ! beat {beat.get('t')} judge error: {e}")
            results.append({
                "t": str(beat.get("t")), "t_sec": None, "label": beat.get("label", ""),
                "expect": beat.get("expect", ""), "frame": None, "face_seen": False,
                "face_cover_pct": 0.0, "issues": [f"judge error: {e}"],
                "llm_pass": None, "pass": False, "overlays": [],
            })

    # Frame retention: a FAILING beat always keeps its frame so the report path points
    # at something the editor (or Claude) can Read. Passing-beat frames are tidied away
    # unless --keep-frames (handy when you want the whole contact set on disk).
    if not args.keep_frames:
        for r in results:
            if r["pass"] and r.get("frame") and os.path.exists(r["frame"]):
                try:
                    os.remove(r["frame"])
                    r["frame"] = None
                except OSError:
                    pass

    json_path, md_path = write_reports(results, video, fps, dur, outdir, args.llm)

    n_fail = sum(1 for r in results if not r["pass"])
    print(f"\nvideo: {video}  (fps~{fps:.2f}, dur {fmt_tc(dur)})")
    for r in results:
        tag = "PASS" if r["pass"] else "FAIL"
        extra = f"face_cover={r['face_cover_pct']}%" if r["face_seen"] else "no-face"
        print(f"  [{tag}] {fmt_tc(r['t_sec']):>8}  {extra:<16} "
              f"{r['label'] or ''}".rstrip())
        for it in r["issues"]:
            print(f"          - {it}")
    print(f"\nreports: {md_path}\n         {json_path}")
    if n_fail:
        print(f"\nFAIL: {n_fail} beat(s) failed QC. Fix the edit and re-run.")
        return 4
    print("\nPASS: all beats clear deterministic QC"
          + (" + vision-LLM" if args.llm else "") + ".")
    return 0


if __name__ == "__main__":
    sys.exit(main())
