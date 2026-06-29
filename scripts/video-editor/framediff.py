#!/usr/bin/env python3
"""
framediff.py — prove an edit actually changed the pixels (catch silent no-op "fixes").

THE BUG THIS EXISTS FOR
  The 10:06 cutout "fix" silently no-op'd: a regex in an overlay/composite .py didn't
  match, so re.sub() rewrote nothing, ffmpeg re-rendered the IDENTICAL frame, exit code
  was 0, and the QC grid went green. "Rendered" is not "changed". The only honest proof
  that an edit landed is: the pixels at the clip's REAL timecode are different before vs
  after. This tool measures that difference and FAILS LOUD when they're identical.

WHAT IT DOES
  (a) --img A.png B.png
        PIL mean-absolute pixel diff over 0-255 (both images coerced to RGB and, if
        sizes differ, B is resized to A so the compare is defined).
        exit 0  -> CHANGED  (delta > --threshold, default 1.0)
        exit 2  -> NO-OP: frames identical (delta <= threshold)

  (b) --clip A.mp4 B.mp4 --at SEC
        extract ONE frame at SEC (accepts seconds like 606 or mm:ss like 10:06) from each
        clip via ffmpeg, then run the same mean-abs compare. Same exit codes.
        --at may be given as one timecode (same SEC in both clips) or as two
        ("--at 10:05 10:06") to diff two MOMENTS of a SINGLE clip (pass the same file
        twice) — useful to confirm a cut/overlay differs across a known boundary.

  Always prints the delta number. A defect (NO-OP) is a NONZERO exit so a pipeline /
  Makefile / CI step stops instead of marching on with an unchanged render.

  (c) stray --final out.mp4 --aroll aroll.mp4 --plan plan.json   (subcommand)
        THE INVERSE OF check-overlays.py. That tool proves DECLARED elements LAND;
        this proves UNDECLARED ones are ABSENT — it catches leaked backgrounds,
        watermarks, a persistent grid/safe-frame, a render artifact, or a stale
        overlay PNG nobody asked for: pixels that CHANGED from the clean A-roll in a
        spot/time where NO beat declared anything.

        How it stays honest about a TALKING-HEAD A-roll (the face moves, that is
        expected and is NOT a defect): it samples many frames, grids the frame into
        cells, and only flags a cell that (1) differs from the A-roll AND (2) does so
        STATICALLY and PERSISTENTLY across the sampled span — a real overlay/artifact
        holds still; the face/hands/background-noise jitter, so their per-cell delta
        is unstable and is filtered out. Cells that fall inside a region+window where
        the plan DOES declare an overlay are subtracted first, so legit graphics never
        flag. Persistent stray cells are clustered into a bounding box and reported
        with the timecode span they persist over.
        exit 0  -> CLEAN: every persistent change is accounted for by a declared overlay
        exit 2  -> STRAY: an undeclared persistent region was found (a leaked element)

EXIT CODES
  0  CHANGED / CLEAN  — (img/clip) delta > threshold · (stray) no undeclared region
  2  NO-OP / STRAY    — (img/clip) delta <= threshold · (stray) leaked element found
  3  usage / IO / ffmpeg error

USAGE
  # two stills:
  python3 framediff.py --img before.png after.png
  python3 framediff.py --img before.png after.png --threshold 2.5

  # one moment, two renders (the real regression guard for a "fix"):
  python3 framediff.py --clip render_old.mp4 render_new.mp4 --at 10:06

  # two moments of ONE clip (confirm a boundary actually differs):
  python3 framediff.py --clip out.mp4 out.mp4 --at 10:05 10:06

  # stray-artifact sweep — undeclared persistent pixels vs the clean A-roll:
  python3 framediff.py stray --final out.mp4 --aroll aroll.mp4 --plan plan.json
  python3 framediff.py stray --final out.mp4 --aroll aroll.mp4 --plan plan.json \
      --samples 24 --cell 64 --cell-thresh 14 --persist 0.85 --save /tmp/stray

HARD RULE (carry this forward)
  Never mutate an overlay/composite .py with sed / re.sub / awk. Read-first Edit only,
  then run framediff at the clip's REAL timecode to confirm the pixels changed. A silent
  no-op regex is exactly how the 10:06 cutout "fix" passed QC while staying broken.
"""

import argparse
import json
import os
import subprocess
import sys
import tempfile

import numpy as np
from PIL import Image


def eprint(*a, **k):
    print(*a, file=sys.stderr, **k)


def parse_tc(s):
    """Accept seconds ('606', '10.5') or mm:ss / hh:mm:ss ('10:06'). Return float seconds."""
    s = s.strip()
    if ":" in s:
        parts = s.split(":")
        if not all(p.strip() != "" for p in parts):
            raise ValueError("empty timecode field in %r" % s)
        parts = [float(p) for p in parts]
        sec = 0.0
        for p in parts:
            sec = sec * 60.0 + p
        return sec
    return float(s)


def load_rgb(path):
    if not os.path.isfile(path):
        raise FileNotFoundError(path)
    return Image.open(path).convert("RGB")


def mean_abs_diff(img_a, img_b):
    """Mean absolute per-pixel difference on a 0-255 scale.

    If sizes differ, B is resized to A's size (bilinear) so the compare is well defined;
    a resize counts as a real change, which is the honest answer for a QC gate.
    """
    if img_b.size != img_a.size:
        img_b = img_b.resize(img_a.size, Image.BILINEAR)
    a = np.asarray(img_a, dtype=np.float64)
    b = np.asarray(img_b, dtype=np.float64)
    return float(np.mean(np.abs(a - b)))


def extract_frame(clip, sec, out_png):
    """Extract one frame at `sec` from `clip` via ffmpeg. Raises on failure / no output."""
    if not os.path.isfile(clip):
        raise FileNotFoundError(clip)
    # -ss AFTER -i = frame-accurate (decode-then-seek). This MATTERS for a QC gate:
    # fast seek (-ss before -i) snaps to the nearest keyframe, so two timecodes a second
    # apart can decode the SAME frame and falsely report NO-OP. Slower, but honest.
    cmd = [
        "ffmpeg", "-v", "error", "-y",
        "-i", clip,
        "-ss", "%.4f" % sec,
        "-frames:v", "1",
        out_png,
    ]
    res = subprocess.run(cmd, capture_output=True, text=True)
    if res.returncode != 0:
        raise RuntimeError("ffmpeg failed for %s @ %.4fs:\n%s" % (clip, sec, res.stderr.strip()))
    if not os.path.isfile(out_png) or os.path.getsize(out_png) == 0:
        raise RuntimeError(
            "ffmpeg produced no frame for %s @ %.4fs (past end of clip?)" % (clip, sec)
        )


def report(delta, threshold, label_a, label_b):
    print("delta (mean-abs 0-255): %.6f   threshold: %.6f" % (delta, threshold))
    print("  A: %s" % label_a)
    print("  B: %s" % label_b)
    if delta > threshold:
        print("PASS CHANGED — pixels differ; the edit moved the frame.")
        return 0
    print("FAIL NO-OP: frames identical — the edit did NOT change these pixels.")
    print("            (silent no-op? check the regex/Edit actually matched.)")
    return 2


def run_img(args):
    try:
        a = load_rgb(args.img[0])
        b = load_rgb(args.img[1])
    except Exception as e:
        eprint("ERROR: %s" % e)
        return 3
    delta = mean_abs_diff(a, b)
    return report(delta, args.threshold, args.img[0], args.img[1])


def run_clip(args):
    ats = args.at
    if len(ats) == 1:
        sec_a = sec_b = parse_tc(ats[0])
    elif len(ats) == 2:
        sec_a = parse_tc(ats[0])
        sec_b = parse_tc(ats[1])
    else:
        eprint("ERROR: --at takes 1 or 2 timecodes, got %d" % len(ats))
        return 3

    tmpdir = tempfile.mkdtemp(prefix="framediff_")
    pa = os.path.join(tmpdir, "a.png")
    pb = os.path.join(tmpdir, "b.png")
    try:
        extract_frame(args.clip[0], sec_a, pa)
        extract_frame(args.clip[1], sec_b, pb)
        a = load_rgb(pa)
        b = load_rgb(pb)
    except Exception as e:
        eprint("ERROR: %s" % e)
        return 3
    delta = mean_abs_diff(a, b)
    label_a = "%s @ %.3fs" % (args.clip[0], sec_a)
    label_b = "%s @ %.3fs" % (args.clip[1], sec_b)
    rc = report(delta, args.threshold, label_a, label_b)
    if args.save:
        try:
            a.save(args.save + ".A.png")
            b.save(args.save + ".B.png")
            print("  saved extracted frames: %s.A.png / %s.B.png" % (args.save, args.save))
        except Exception as e:
            eprint("WARN: could not save frames: %s" % e)
    return rc


# ─────────────────────────────────────────────────────────────────────────────
# stray-artifact / undeclared-element detector  (mode c)
#
# WHY THIS EXISTS
#   check-overlays.py proves every DECLARED graphic lands at the right spoken
#   moment. Nothing proved the converse: that NOTHING ELSE is on screen. A leaked
#   Descript background, a watermark, a forgotten safe-frame grid, or a stale
#   overlay PNG dropped on the wrong track all render "successfully" (exit 0, QC
#   green) yet sit there over the whole video. The only honest proof they're
#   absent is: every pixel that DIFFERS from the clean A-roll is explained by a
#   beat that DECLARED an overlay there-and-then. A persistent residual that no
#   beat owns is a stray artifact.
#
# THE TALKING-HEAD PROBLEM (and the fix)
#   The A-roll is a face read. The face, hands, and the room behind move, so a
#   naive final-vs-A-roll diff lights up everywhere — none of it a defect. The
#   discriminator is PERSISTENCE + STATICITY: a real overlay/artifact pins the
#   same pixels frame after frame; live motion does not. So we sample many frames,
#   grid each into cells, and only a cell that exceeds the diff threshold in a high
#   FRACTION of the sampled frames (persistent) and whose delta is STABLE across
#   them (static, low variance) is a candidate. Then we subtract any cell that the
#   plan declares an overlay for at that time. What's left is the stray.
# ─────────────────────────────────────────────────────────────────────────────

# Default screen bands (1920×1080 reference) for the overlay layouts that the
# plan does NOT carry explicit pixel rects for. These mirror lib/templates.ts:
#   lower-thirds sit in the bottom band; captions bottom-center; callouts
#   lower-right. Full-screen layouts (TITLE/GRAPHIC/SCREEN+PIP/FIELD) cover all.
# Expressed as FRACTIONS (x,y,w,h) of the frame so they survive any resolution.
# A plan can override per-overlay via a top-level "stray_regions" block (see
# declared_rects_at). Bands are generous on purpose: a false NEGATIVE (missing a
# stray) is worse than over-subtracting a legit overlay's neighborhood.
FULLSCREEN_LAYOUTS = {"TITLE", "GRAPHIC", "SCREEN+PIP", "FIELD"}
BAND_FULL = (0.0, 0.0, 1.0, 1.0)
BAND_LOWER = (0.0, 0.66, 1.0, 0.34)   # lower-third / caption / callout band
DECLARE_PAD = 0.4                      # seconds of slack on each side of a beat window


def _rects_overlap(a, b):
    """Do two (x,y,w,h) fractional rects intersect at all?"""
    ax, ay, aw, ah = a
    bx, by, bw, bh = b
    return not (ax + aw <= bx or bx + bw <= ax or ay + ah <= by or by + bh <= ay)


def declared_windows(plan):
    """Flatten plan.json into a list of (t0, t1, rect) DECLARED-overlay spans.

    rect is fractional (x,y,w,h) of the frame. We cover every channel that puts
    pixels on screen: beats (cards/b-roll/lower-thirds), gold callouts, and
    captions — each with the same dwell rules build_resolve.py uses, padded by
    DECLARE_PAD so a sample landing on a window edge isn't falsely flagged.

    A plan may also carry an explicit top-level "stray_regions" list of
    {"t":, "end":, "rect":[x,y,w,h]} (fractions) to declare any extra known-good
    region (e.g. a deliberate channel-watermark) — those are honored verbatim.
    """
    spans = []

    def add(t0, t1, rect):
        if t1 > t0 and rect is not None:
            spans.append((t0 - DECLARE_PAD, t1 + DECLARE_PAD, rect))

    for b in plan.get("beats", []):
        t = float(b.get("t", 0.0))
        end = float(b.get("end", t))
        layout = b.get("layout", "")
        has_broll = bool((b.get("broll") or {}).get("file"))
        # Match build_resolve.py's per-layout dwell so the declared WINDOW lines up
        # with when the overlay is actually on the timeline (not the whole beat).
        if layout == "TITLE":
            add(t, t + 2.5, BAND_FULL)
        elif layout == "GRAPHIC":
            add(t, t + min(end - t, 7.0), BAND_FULL)
        elif layout in ("SCREEN+PIP", "FIELD") and has_broll:
            add(t, end, BAND_FULL)
        else:
            # FACE/other carry a lower-third (dwell clamped 4.0..6.5s in build_resolve)
            add(t, t + min(max(end - t, 4.0), 6.5), BAND_LOWER)
        # any beat with desktop/screen b-roll also paints full-frame over its window
        if has_broll and layout not in FULLSCREEN_LAYOUTS:
            add(t, end, BAND_FULL)

    # gold number callouts (V4) — pop in ~2.2s in the lower-right band
    for c in plan.get("callouts", []):
        t = float(c.get("t", 0.0))
        add(t, t + 2.2, BAND_LOWER)

    # clean-line captions (V5) — only on screen if burned in, but declaring their
    # band costs nothing and prevents a burned-caption build from false-flagging.
    for cap in plan.get("captions", []):
        t = float(cap.get("t", 0.0))
        end = float(cap.get("end", t))
        add(t, max(end, t + 0.6), BAND_LOWER)

    # desktop screen-recordings build_resolve.py guarantees per card window
    # (full-frame, start+3s for up to 10s) — declare the whole card window so a
    # legit screen b-roll never reads as stray.
    windows = {}
    for b in plan.get("beats", []):
        cn = b.get("cardNumber")
        if cn:
            w = windows.setdefault(cn, [b["t"], b["end"]])
            w[0], w[1] = min(w[0], b["t"]), max(w[1], b["end"])
    for cn, (ws, we) in windows.items():
        add(ws, we, BAND_FULL)

    # explicit operator-declared known-good regions
    for r in plan.get("stray_regions", []):
        rect = r.get("rect")
        if rect and len(rect) == 4:
            add(float(r.get("t", 0.0)), float(r.get("end", 1e9)), tuple(rect))

    return spans


def declared_rect_set_at(spans, sec):
    """Return the list of fractional rects DECLARED on screen at time `sec`."""
    return [rect for (t0, t1, rect) in spans if t0 <= sec <= t1]


def clip_duration(path):
    """Float seconds via ffprobe; raises if it can't be read."""
    if not os.path.isfile(path):
        raise FileNotFoundError(path)
    res = subprocess.run(
        ["ffprobe", "-v", "error", "-show_entries", "format=duration",
         "-of", "default=nokey=1:noprint_wrappers=1", path],
        capture_output=True, text=True,
    )
    out = res.stdout.strip()
    if res.returncode != 0 or not out:
        raise RuntimeError("ffprobe could not read duration of %s:\n%s" % (path, res.stderr.strip()))
    return float(out)


def cell_grid(img_a, img_b, cell_px):
    """Per-cell mean-abs diff grid.

    Coerce B to A's size (so a 4K final vs 1080 A-roll still compares), then tile
    into ~`cell_px`-square cells and return:
      grid  : (rows, cols) float array of mean-abs delta per cell (0-255)
      rows, cols, cw, ch : geometry for mapping a cell back to fractional rect
    Cells are the unit of persistence — coarse enough to be robust to sub-pixel
    jitter and fast, fine enough to localize a stray box.
    """
    if img_b.size != img_a.size:
        img_b = img_b.resize(img_a.size, Image.BILINEAR)
    W, H = img_a.size
    cols = max(1, W // cell_px)
    rows = max(1, H // cell_px)
    a = np.asarray(img_a, dtype=np.float64)
    b = np.asarray(img_b, dtype=np.float64)
    d = np.abs(a - b).mean(axis=2)  # per-pixel mean-abs over RGB → (H, W)
    grid = np.zeros((rows, cols), dtype=np.float64)
    ys = np.linspace(0, H, rows + 1).astype(int)
    xs = np.linspace(0, W, cols + 1).astype(int)
    for r in range(rows):
        for c in range(cols):
            grid[r, c] = d[ys[r]:ys[r + 1], xs[c]:xs[c + 1]].mean()
    return grid, rows, cols


def _cluster_cells(mask):
    """4-connected flood fill over a boolean (rows,cols) mask → list of cell sets.

    Pure-stdlib (no scipy): the masks are tiny (~30×17 cells), so an iterative
    BFS per component is plenty and keeps the dependency surface at numpy+PIL.
    """
    rows, cols = mask.shape
    seen = np.zeros_like(mask, dtype=bool)
    comps = []
    for r in range(rows):
        for c in range(cols):
            if not mask[r, c] or seen[r, c]:
                continue
            stack = [(r, c)]
            seen[r, c] = True
            cells = []
            while stack:
                y, x = stack.pop()
                cells.append((y, x))
                for dy, dx in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                    ny, nx = y + dy, x + dx
                    if 0 <= ny < rows and 0 <= nx < cols and mask[ny, nx] and not seen[ny, nx]:
                        seen[ny, nx] = True
                        stack.append((ny, nx))
            comps.append(cells)
    return comps


def fmt_tc(sec):
    m = int(sec // 60)
    s = sec - 60 * m
    return "%d:%05.2f" % (m, s)


def run_stray(args):
    """Sweep the FINAL render for undeclared persistent regions vs the clean A-roll."""
    final, aroll = args.final, args.aroll
    try:
        plan = json.load(open(abspath_local(args.plan)))
    except Exception as e:
        eprint("ERROR: could not load plan %s: %s" % (args.plan, e))
        return 3
    try:
        dur_f = clip_duration(final)
        dur_a = clip_duration(aroll)
    except Exception as e:
        eprint("ERROR: %s" % e)
        return 3
    # Sample only where BOTH clips have footage; never seek past either's end (an
    # over-seek decodes the last frame in both → a phantom zero-diff or a false one).
    dur = min(dur_f, dur_a)
    if dur <= 0:
        eprint("ERROR: zero-length clip (final=%.2fs aroll=%.2fs)" % (dur_f, dur_a))
        return 3
    n = max(2, args.samples)
    # interior sampling: skip the very ends (title fades / EOF frame) by 2% margin
    lo, hi = 0.02 * dur, 0.98 * dur
    times = [lo + (hi - lo) * i / (n - 1) for i in range(n)]

    spans = declared_windows(plan)
    print("stray sweep — final vs clean A-roll")
    print("  final: %s  (%.2fs)" % (final, dur_f))
    print("  aroll: %s  (%.2fs)" % (aroll, dur_a))
    print("  plan : %s  (%d declared overlay span(s))" % (args.plan, len(spans)))
    print("  sampling %d frames over [%s .. %s], cell=%dpx, cell-thresh=%.1f, persist=%.2f"
          % (n, fmt_tc(lo), fmt_tc(hi), args.cell, args.cell_thresh, args.persist))

    tmpdir = tempfile.mkdtemp(prefix="framediff_stray_")
    changed_stack = None      # (n, rows, cols) bool: cell changed at sample i
    delta_stack = None        # (n, rows, cols) float: cell delta at sample i
    declared_stack = []       # per-sample list of declared rects (for masking)
    rows = cols = 0
    try:
        for i, sec in enumerate(times):
            pa = os.path.join(tmpdir, "a_%03d.png" % i)
            pf = os.path.join(tmpdir, "f_%03d.png" % i)
            extract_frame(aroll, sec, pa)
            extract_frame(final, sec, pf)
            ga, gf = load_rgb(pa), load_rgb(pf)
            grid, rows, cols = cell_grid(ga, gf, args.cell)
            if changed_stack is None:
                changed_stack = np.zeros((n, rows, cols), dtype=bool)
                delta_stack = np.zeros((n, rows, cols), dtype=np.float64)
            changed_stack[i] = grid > args.cell_thresh
            delta_stack[i] = grid
            declared_stack.append(declared_rect_set_at(spans, sec))
            if not args.quiet:
                print("  [%2d/%2d] %s  changed-cells=%d" % (i + 1, n, fmt_tc(sec), int(changed_stack[i].sum())))
    except Exception as e:
        eprint("ERROR: %s" % e)
        return 3

    # A cell is DECLARED at sample i if it intersects any declared rect then.
    declared_mask = np.zeros((n, rows, cols), dtype=bool)
    for i in range(n):
        rects = declared_stack[i]
        if not rects:
            continue
        for r in range(rows):
            for c in range(cols):
                crect = (c / cols, r / rows, 1.0 / cols, 1.0 / rows)
                if any(_rects_overlap(crect, rect) for rect in rects):
                    declared_mask[i, r, c] = True

    # UNDECLARED changes only. Persistence = fraction of samples where the cell is
    # changed AND not declared. Staticity = the change is consistent (low coef of
    # variation across the samples where it IS changed) — live motion flickers, an
    # overlay holds. Require BOTH to call it stray.
    undeclared_changed = changed_stack & ~declared_mask
    persist_frac = undeclared_changed.mean(axis=0)            # (rows, cols)
    persistent = persist_frac >= args.persist

    # staticity guard: among samples where the cell read changed-and-undeclared,
    # the delta should be stable. CoV = std/mean of those deltas; a static overlay
    # is ~flat (low CoV), face motion swings (high CoV). Cells with too few changed
    # samples can't be judged stable, so persistence already excludes them.
    static = np.ones((rows, cols), dtype=bool)
    for r in range(rows):
        for c in range(cols):
            if not persistent[r, c]:
                continue
            sel = undeclared_changed[:, r, c]
            vals = delta_stack[sel, r, c]
            if vals.size >= 2:
                mean = vals.mean()
                cov = (vals.std() / mean) if mean > 1e-6 else 0.0
                static[r, c] = cov <= args.max_cov

    stray_mask = persistent & static
    n_stray_cells = int(stray_mask.sum())

    # Cluster stray cells into bounding regions and report each.
    comps = _cluster_cells(stray_mask) if n_stray_cells else []
    # ignore single-cell specks unless the user lowers --min-cells (kills lone
    # compression-noise cells that scraped past the threshold)
    comps = [cm for cm in comps if len(cm) >= args.min_cells]

    print("")
    if not comps:
        print("PASS CLEAN — no undeclared persistent region. "
              "Every change vs the A-roll is explained by a declared overlay.")
        if args.save:
            _save_stray_debug(args.save, persist_frac, declared_mask, stray_mask, rows, cols)
        return 0

    print("FAIL STRAY: %d undeclared persistent region(s) found "
          "(leaked background / watermark / grid / stale overlay?):" % len(comps))
    for idx, cells in enumerate(sorted(comps, key=len, reverse=True), 1):
        ys = [y for (y, x) in cells]
        xs = [x for (y, x) in cells]
        r0, r1 = min(ys), max(ys) + 1
        c0, c1 = min(xs), max(xs) + 1
        fx, fy = c0 / cols, r0 / rows
        fw, fh = (c1 - c0) / cols, (r1 - r0) / rows
        # px on the 1920×1080 reference grid (what page-roi / drawbox speak)
        px = (int(fx * 1920), int(fy * 1080), int(fw * 1920), int(fh * 1080))
        # persistence + the time-span the region is actually changed-and-undeclared
        reg_persist = float(persist_frac[r0:r1, c0:c1].max())
        active = [times[i] for i in range(n)
                  if (undeclared_changed[i, r0:r1, c0:c1]).any()]
        tspan = (fmt_tc(min(active)), fmt_tc(max(active))) if active else ("?", "?")
        print("  #%d  region (frac) x=%.3f y=%.3f w=%.3f h=%.3f"
              % (idx, fx, fy, fw, fh))
        print("       region (px@1920x1080) x=%d y=%d w=%d h=%d  → drawbox/page-roi: %d,%d,%d,%d"
              % (px[0], px[1], px[2], px[3], px[0], px[1], px[2], px[3]))
        print("       persists %.0f%% of samples · changed across [%s .. %s] (%d cell(s))"
              % (reg_persist * 100, tspan[0], tspan[1], len(cells)))

    if args.save:
        _save_stray_debug(args.save, persist_frac, declared_mask, stray_mask, rows, cols)
    return 2


def _save_stray_debug(prefix, persist_frac, declared_mask, stray_mask, rows, cols):
    """Write three PNG heatmaps (upscaled) so a human can eyeball the verdict:
    PREFIX.persist.png (per-cell undeclared-change persistence), .declared.png
    (cells the plan covers at any sample), .stray.png (the flagged regions)."""
    try:
        def up(arr01):
            g = (np.clip(arr01, 0, 1) * 255).astype(np.uint8)
            im = Image.fromarray(g, mode="L").resize((cols * 24, rows * 24), Image.NEAREST)
            return im
        up(persist_frac).save(prefix + ".persist.png")
        up(declared_mask.any(axis=0).astype(float)).save(prefix + ".declared.png")
        up(stray_mask.astype(float)).save(prefix + ".stray.png")
        print("  saved heatmaps: %s.persist.png / .declared.png / .stray.png" % prefix)
    except Exception as e:
        eprint("WARN: could not save stray heatmaps: %s" % e)


def abspath_local(p):
    """Repo-relative paths resolve against CWD; absolute pass through (plan paths)."""
    return p if os.path.isabs(p) else os.path.join(os.getcwd(), p)


def build_stray_parser():
    """The `stray` subcommand parser (standalone — see the routing note in main)."""
    sp = argparse.ArgumentParser(
        prog="framediff.py stray",
        description="Catch leaked backgrounds / watermarks / grids / stale overlays: "
                    "pixels that changed from the clean A-roll where NO beat declared "
                    "an overlay. exit 0=CLEAN, 2=STRAY found, 3=error.",
    )
    sp.add_argument("--final", required=True, help="the FINAL render to inspect")
    sp.add_argument("--aroll", required=True, help="the clean A-roll (face read) it was built from")
    sp.add_argument("--plan", required=True, help="plan.json (declares the legit overlays/windows)")
    sp.add_argument("--samples", type=int, default=18,
                    help="how many frames to sample across the clip (default 18; more = finer/slower)")
    sp.add_argument("--cell", type=int, default=64,
                    help="cell size in px for the diff grid (default 64; smaller = finer localization)")
    sp.add_argument("--cell-thresh", type=float, default=14.0,
                    help="mean-abs delta (0-255) above which a CELL counts as changed (default 14)")
    sp.add_argument("--persist", type=float, default=0.8,
                    help="fraction of samples a cell must stay undeclared-changed to be a stray (default 0.8)")
    sp.add_argument("--max-cov", type=float, default=0.45,
                    help="max coefficient-of-variation of a cell's delta to count as STATIC (default 0.45; "
                         "higher = more tolerant of flicker = more sensitive)")
    sp.add_argument("--min-cells", type=int, default=2,
                    help="ignore stray clusters smaller than this many cells (default 2; kills lone specks)")
    sp.add_argument("--save", metavar="PREFIX",
                    help="write PREFIX.persist/.declared/.stray heatmap PNGs for eyeballing")
    sp.add_argument("--quiet", action="store_true", help="don't print the per-sample line")
    return sp


def main(argv=None):
    raw = list(sys.argv[1:] if argv is None else argv)

    # NEW `stray` subcommand routed separately so the legacy --img/--clip parser
    # (and its required mutually-exclusive group, help text, and exit codes) stays
    # byte-for-byte unchanged when stray isn't used. Only the FIRST positional
    # token being "stray" triggers the new path.
    if raw and raw[0] == "stray":
        sp = build_stray_parser()
        args = sp.parse_args(raw[1:])
        return run_stray(args)

    p = argparse.ArgumentParser(
        prog="framediff.py",
        description="Prove an edit changed pixels (catch silent no-op fixes). "
                    "exit 0=CHANGED, 2=NO-OP, 3=error.  Subcommand `stray` sweeps a "
                    "final render for undeclared persistent elements.",
    )
    mode = p.add_mutually_exclusive_group(required=True)
    mode.add_argument("--img", nargs=2, metavar=("A.png", "B.png"),
                      help="compare two image files")
    mode.add_argument("--clip", nargs=2, metavar=("A.mp4", "B.mp4"),
                      help="compare a frame extracted from each clip (needs --at)")
    p.add_argument("--at", nargs="+", metavar="SEC",
                   help="timecode(s) for --clip: one (same in both) or two (per-clip). "
                        "Accepts seconds (606) or mm:ss (10:06).")
    p.add_argument("--threshold", type=float, default=1.0,
                   help="mean-abs delta above which frames count as CHANGED (default 1.0)")
    p.add_argument("--save", metavar="PREFIX",
                   help="(clip mode) save the two extracted frames as PREFIX.A.png/.B.png")
    args = p.parse_args(argv)

    if args.clip:
        if not args.at:
            eprint("ERROR: --clip requires --at SEC")
            return 3
        return run_clip(args)
    return run_img(args)


if __name__ == "__main__":
    sys.exit(main())
