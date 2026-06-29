#!/usr/bin/env python3.14
"""vsafe.py -- Safe file ops + disk guard for the video-editor pipeline.

Motivation (FIX #8): a stray `rm cap_*.mp4` once wiped approved clips; ENOSPC
corrupted half-written renders twice; and 17 -PRODUCED-v* masters piled up
filling the disk. This wraps the three dangerous operations -- render, delete,
and prune -- with guards so the same mistakes cannot recur.

Subcommands
-----------
  render  --out PATH [--est-gb F | (auto via ffprobe)] -- <ffmpeg args...>
      Preflight free space with shutil.disk_usage; refuse to start unless
      free >= estimated_output * headroom. ffmpeg writes to a scratch file on
      the SAME volume as --out (so os.replace is atomic). After ffmpeg exits we
      integrity-gate the scratch file with ffprobe (format duration must parse,
      i.e. the moov atom is present) and only then os.replace it onto --out.
      A crash/ENOSPC therefore never corrupts the real deliverable path.

  rm  '<glob>' [--expect N] [--force-deliverable] [--dry-run]
      Expand the glob. Any match intersecting a PROTECTED.json protected glob
      is refused unless --force-deliverable. Media files (mp4/mov/wav/m4a/png/
      jpg/...) are MOVED to <vol>/.vtrash/<date>/ (recoverable) -- never
      unlinked. A wildcard pattern REQUIRES --expect N and aborts if the match
      count != N (the cap_*.mp4 footgun).

  prune  [--keep 3] [--dry-run] [ROOT ...]
      Group masters by stem (everything before a trailing -v<N> before the
      extension), keep the newest --keep by mtime, route the rest to .vtrash.

  doctor  [ROOT ...]
      Print disk headroom, protected inventory with counts, what prune would
      remove, and flag any deliverable-named file failing the ffprobe
      integrity check (a corrupted render).

Config: scripts/video-editor/PROTECTED.json (JSON only -- no YAML).
Deps:   Python stdlib + ffmpeg/ffprobe on PATH. No third-party imports.

Exit codes: 0 = ok / clean. Nonzero = a defect was found, an op was refused,
or a guard tripped (see each command).
"""

import argparse
import datetime
import fnmatch
import glob as globmod
import json
import os
import re
import shutil
import subprocess
import sys
import uuid

HERE = os.path.dirname(os.path.abspath(__file__))
DEFAULT_CONFIG = os.path.join(HERE, "PROTECTED.json")

# ---------------------------------------------------------------------------
# config
# ---------------------------------------------------------------------------


def load_config(path):
    with open(path, "r") as fh:
        cfg = json.load(fh)
    cfg.setdefault("headroom", 3.0)
    cfg.setdefault("protected_globs", [])
    cfg.setdefault("deliverable_globs", [])
    cfg.setdefault(
        "media_exts",
        [".mp4", ".mov", ".wav", ".m4a", ".png", ".jpg", ".jpeg", ".mkv", ".mxf"],
    )
    cfg.setdefault("master_re", r"^(?P<stem>.+)-v\d+(?P<ext>\.[A-Za-z0-9]+)$")
    cfg["media_exts"] = [e.lower() for e in cfg["media_exts"]]
    return cfg


def _matches_glob(abspath, pattern):
    """Match an absolute, resolved path against a config glob.

    Absolute patterns (start with '/') match the whole path literally.
    Relative patterns (start with '*'/'**') match anywhere in the path, so
    '**/broll/**' hits '/a/b/broll/c.mp4'. fnmatch treats '*' as crossing '/',
    which is what we want for substring-style protection.
    """
    if pattern.startswith("/"):
        return fnmatch.fnmatch(abspath, pattern) or fnmatch.fnmatch(
            abspath, pattern.rstrip("/") + "/*"
        )
    # relative pattern -> anchor anywhere
    return fnmatch.fnmatch(abspath, "*" + pattern.lstrip("*")) or fnmatch.fnmatch(
        abspath, pattern
    )


def matched_globs(abspath, patterns):
    return [p for p in patterns if _matches_glob(abspath, p)]


def is_protected(abspath, cfg):
    return bool(matched_globs(abspath, cfg["protected_globs"]))


def is_deliverable(abspath, cfg):
    return bool(matched_globs(abspath, cfg["deliverable_globs"]))


def is_media(abspath, cfg):
    return os.path.splitext(abspath)[1].lower() in cfg["media_exts"]


# ---------------------------------------------------------------------------
# ffprobe helpers
# ---------------------------------------------------------------------------


def ffprobe_duration(path):
    """Return float duration if ffprobe can parse the container, else None.

    A parseable format.duration implies the moov atom (or equivalent index) is
    present -- i.e. the file was finalized, not a half-written ENOSPC stub.
    """
    try:
        out = subprocess.run(
            [
                "ffprobe",
                "-v",
                "error",
                "-show_entries",
                "format=duration",
                "-of",
                "default=noprint_wrappers=1:nokey=1",
                path,
            ],
            capture_output=True,
            text=True,
            timeout=60,
        )
    except (subprocess.SubprocessError, FileNotFoundError):
        return None
    if out.returncode != 0:
        return None
    txt = out.stdout.strip()
    try:
        val = float(txt)
    except ValueError:
        return None
    return val if val > 0 else None


def integrity_ok(path):
    return ffprobe_duration(path) is not None


# ---------------------------------------------------------------------------
# disk helpers
# ---------------------------------------------------------------------------

GB = 1024 ** 3


def disk_free_gb(path):
    target = path
    while target and not os.path.exists(target):
        target = os.path.dirname(target)
    if not target:
        target = "/"
    usage = shutil.disk_usage(target)
    return usage.free / GB, usage.total / GB


def vol_root(path):
    """Best-effort mount-point/volume root for path, for scratch/trash dirs.

    We don't need the true mount point -- we only need a directory on the SAME
    filesystem as `path` so os.replace is atomic and rename-to-trash works
    without a cross-device copy. The containing directory always qualifies, so
    .vscratch / .vtrash are placed beside the target dir.
    """
    d = os.path.dirname(os.path.abspath(path))
    return d if d else os.getcwd()


# ---------------------------------------------------------------------------
# trash
# ---------------------------------------------------------------------------


def trash_dir_for(path):
    root = vol_root(path)
    date = datetime.date.today().isoformat()
    td = os.path.join(root, ".vtrash", date)
    os.makedirs(td, exist_ok=True)
    return td


def route_to_trash(path):
    """Move a file into <vol>/.vtrash/<date>/ (recoverable). Returns dest."""
    td = trash_dir_for(path)
    base = os.path.basename(path)
    dest = os.path.join(td, base)
    if os.path.exists(dest):
        stem, ext = os.path.splitext(base)
        dest = os.path.join(td, f"{stem}.{uuid.uuid4().hex[:8]}{ext}")
    try:
        os.replace(path, dest)  # same fs -> atomic
    except OSError:
        shutil.move(path, dest)  # cross-device fallback
    return dest


# ---------------------------------------------------------------------------
# glob expansion
# ---------------------------------------------------------------------------


def is_wildcard(pattern):
    return any(c in pattern for c in "*?[")


def expand(pattern):
    return sorted(
        os.path.abspath(p) for p in globmod.glob(pattern, recursive=True)
    )


# ===========================================================================
# render
# ===========================================================================


def cmd_render(args, cfg):
    out = os.path.abspath(args.out)
    ffargs = args.ffmpeg_args
    if ffargs and ffargs[0] == "--":
        ffargs = ffargs[1:]
    if not ffargs:
        print("FAIL: no ffmpeg args after --", file=sys.stderr)
        return 2

    headroom = float(args.headroom if args.headroom is not None else cfg["headroom"])

    # ---- estimate output size ----
    if args.est_gb is not None:
        est_gb = float(args.est_gb)
        est_src = f"--est-gb {est_gb}"
    else:
        # heuristic: estimate from the largest input file ffprobe can read,
        # padded 1.2x (re-encodes are usually <= source for our pipeline, but
        # we stay conservative). Fall back to a small floor if none found.
        est_gb = 0.0
        biggest = None
        for tok in ffargs:
            if os.path.isfile(tok):
                sz = os.path.getsize(tok) / GB
                if sz > est_gb:
                    est_gb, biggest = sz, tok
        est_gb = max(est_gb * 1.2, 0.5)
        est_src = (
            f"auto (largest input {os.path.basename(biggest)} x1.2)"
            if biggest
            else "auto (floor 0.5GB, no input file detected)"
        )

    required = est_gb * headroom
    free_gb, total_gb = disk_free_gb(out)

    print(f"render -> {out}")
    print(f"  estimate : {est_gb:.2f} GB  ({est_src})")
    print(f"  headroom : x{headroom:g}  -> require {required:.2f} GB free")
    print(f"  free now : {free_gb:.2f} GB / {total_gb:.2f} GB")

    if free_gb < required:
        print(
            f"FAIL: refusing to render -- only {free_gb:.2f} GB free, "
            f"need {required:.2f} GB ({est_gb:.2f} x{headroom:g}).",
            file=sys.stderr,
        )
        return 3

    if args.dry_run:
        print("DRY-RUN: preflight PASS; not invoking ffmpeg.")
        return 0

    # ---- scratch render on same volume ----
    root = vol_root(out)
    scratch_dir = os.path.join(root, ".vscratch")
    os.makedirs(scratch_dir, exist_ok=True)
    ext = os.path.splitext(out)[1] or ".mp4"
    scratch = os.path.join(scratch_dir, f"{uuid.uuid4().hex}{ext}")

    # Build the ffmpeg command. The user passes everything EXCEPT the output
    # path; we append the scratch path so the real path is never touched until
    # the integrity gate passes. Always overwrite the scratch file (-y).
    cmd = ["ffmpeg", "-y", *ffargs, scratch]
    print(f"  scratch  : {scratch}")
    print("  exec     : " + " ".join(cmd))
    rc = subprocess.run(cmd).returncode

    if rc != 0:
        print(f"FAIL: ffmpeg exited {rc}; leaving scratch for inspection.", file=sys.stderr)
        if os.path.exists(scratch) and not integrity_ok(scratch):
            try:
                os.remove(scratch)
                print("  (removed unfinalized scratch)")
            except OSError:
                pass
        return 4

    if not os.path.exists(scratch):
        print("FAIL: ffmpeg reported success but produced no scratch file.", file=sys.stderr)
        return 4

    dur = ffprobe_duration(scratch)
    if dur is None:
        print(
            "FAIL: integrity gate -- ffprobe cannot parse scratch (no moov / "
            "truncated render). NOT replacing the real path.",
            file=sys.stderr,
        )
        return 5

    os.replace(scratch, out)  # atomic same-fs swap
    print(f"PASS: render finalized ({dur:.2f}s) -> {out}")
    return 0


# ===========================================================================
# rm
# ===========================================================================


def cmd_rm(args, cfg):
    pattern = args.pattern
    wildcard = is_wildcard(pattern)
    matches = expand(pattern)

    print(f"rm pattern: {pattern}")
    print(f"  matched {len(matches)} path(s)")

    if not matches:
        print("FAIL: pattern matched nothing.", file=sys.stderr)
        return 2

    # ---- wildcard requires --expect and exact count ----
    if wildcard:
        if args.expect is None:
            print(
                "FAIL: wildcard pattern requires --expect N (refusing a blind "
                "bulk delete -- this is the `rm cap_*.mp4` footgun).",
                file=sys.stderr,
            )
            return 6
        if len(matches) != args.expect:
            print(
                f"FAIL: --expect {args.expect} but pattern matched "
                f"{len(matches)}. Aborting (count mismatch).",
                file=sys.stderr,
            )
            for m in matches:
                print(f"    {m}", file=sys.stderr)
            return 6

    # ---- protected intersection ----
    protected = []
    for m in matches:
        hits = matched_globs(m, cfg["protected_globs"])
        if hits:
            protected.append((m, hits))

    if protected and not args.force_deliverable:
        print("FAIL: matches intersect PROTECTED globs; refusing.", file=sys.stderr)
        for m, hits in protected:
            print(f"    PROTECTED {m}", file=sys.stderr)
            for h in hits:
                print(f"        via {h}", file=sys.stderr)
        print(
            "  Pass --force-deliverable to override (still routed to .vtrash, "
            "not unlinked).",
            file=sys.stderr,
        )
        return 7

    # ---- execute ----
    rc = 0
    for m in matches:
        if not os.path.isfile(m):
            print(f"  skip (not a regular file): {m}")
            continue
        prot = " [PROTECTED, forced]" if is_protected(m, cfg) else ""
        if args.dry_run:
            action = "trash" if is_media(m, cfg) else "unlink"
            print(f"  DRY-RUN would {action}: {m}{prot}")
            continue
        if is_media(m, cfg):
            dest = route_to_trash(m)
            print(f"  trashed: {m}{prot}\n        -> {dest}")
        else:
            try:
                os.remove(m)
                print(f"  removed (non-media): {m}{prot}")
            except OSError as exc:
                print(f"  ERROR removing {m}: {exc}", file=sys.stderr)
                rc = 8
    if not args.dry_run:
        print("PASS: rm complete (media recoverable from .vtrash).")
    return rc


# ===========================================================================
# prune
# ===========================================================================


def find_masters(roots, cfg):
    """Return {stem_key: [(path, mtime), ...]} for files matching master_re."""
    rx = re.compile(cfg["master_re"])
    groups = {}
    for root in roots:
        root = os.path.abspath(root)
        if os.path.isfile(root):
            walk = [(os.path.dirname(root), [], [os.path.basename(root)])]
        else:
            walk = os.walk(root)
        for dirpath, _dirs, files in walk:
            if os.sep + ".vtrash" in dirpath or os.sep + ".vscratch" in dirpath:
                continue
            for fn in files:
                m = rx.match(fn)
                if not m:
                    continue
                full = os.path.join(dirpath, fn)
                key = os.path.join(dirpath, m.group("stem") + m.group("ext"))
                try:
                    mt = os.path.getmtime(full)
                except OSError:
                    continue
                groups.setdefault(key, []).append((full, mt))
    return groups


def prune_plan(roots, keep, cfg):
    """Return list of (path, mtime) to remove, and the full groups dict."""
    groups = find_masters(roots, cfg)
    to_remove = []
    for key, items in groups.items():
        if len(items) <= keep:
            continue
        items_sorted = sorted(items, key=lambda x: x[1], reverse=True)  # newest first
        to_remove.extend(items_sorted[keep:])
    return to_remove, groups


def cmd_prune(args, cfg):
    roots = args.roots or [os.getcwd()]
    to_remove, groups = prune_plan(roots, args.keep, cfg)

    print(f"prune (keep newest {args.keep} per stem) over: {', '.join(roots)}")
    print(f"  master groups found: {len(groups)}")
    for key, items in sorted(groups.items()):
        kept = sorted(items, key=lambda x: x[1], reverse=True)[: args.keep]
        print(f"  {os.path.basename(key)}: {len(items)} versions, "
              f"keep {len(kept)}, remove {max(0, len(items) - args.keep)}")

    if not to_remove:
        print("PASS: nothing to prune.")
        return 0

    rc = 0
    for path, _mt in sorted(to_remove):
        if args.dry_run:
            print(f"  DRY-RUN would trash: {path}")
            continue
        try:
            dest = route_to_trash(path)
            print(f"  trashed: {path}\n        -> {dest}")
        except OSError as exc:
            print(f"  ERROR trashing {path}: {exc}", file=sys.stderr)
            rc = 8
    if args.dry_run:
        print(f"DRY-RUN: would prune {len(to_remove)} file(s).")
    else:
        print(f"PASS: pruned {len(to_remove)} file(s) to .vtrash.")
    return rc


# ===========================================================================
# doctor
# ===========================================================================


def cmd_doctor(args, cfg):
    roots = args.roots or [os.getcwd()]
    rc = 0

    print("=== vsafe doctor ===")
    print(f"config: {args.config}  (headroom x{cfg['headroom']:g})")

    # ---- disk ----
    print("\n[disk]")
    seen = set()
    for root in roots:
        free_gb, total_gb = disk_free_gb(root)
        key = round(total_gb, 1)
        if key in seen:
            continue
        seen.add(key)
        pct = (free_gb / total_gb * 100) if total_gb else 0
        flag = "  <-- LOW" if pct < 10 else ""
        print(f"  {root}: {free_gb:.1f} GB free / {total_gb:.1f} GB "
              f"({pct:.0f}% free){flag}")
        if pct < 10:
            rc = max(rc, 9)

    # ---- protected inventory ----
    print("\n[protected inventory]")
    per_glob = {p: 0 for p in cfg["protected_globs"]}
    total_protected = 0
    deliverables = []
    for root in roots:
        root = os.path.abspath(root)
        if not os.path.exists(root):
            continue
        for dirpath, _dirs, files in os.walk(root):
            if os.sep + ".vtrash" in dirpath or os.sep + ".vscratch" in dirpath:
                continue
            for fn in files:
                full = os.path.join(dirpath, fn)
                hits = matched_globs(full, cfg["protected_globs"])
                if hits:
                    total_protected += 1
                    for h in hits:
                        per_glob[h] += 1
                if is_deliverable(full, cfg):
                    deliverables.append(full)
    for p, n in per_glob.items():
        print(f"  {n:5d}  {p}")
    print(f"  total protected files: {total_protected}")

    # ---- prune preview ----
    print("\n[prune preview] (keep newest 3 per stem)")
    to_remove, groups = prune_plan(roots, 3, cfg)
    if not to_remove:
        print("  nothing would be pruned.")
    else:
        bytes_freed = 0
        for path, _mt in sorted(to_remove):
            try:
                sz = os.path.getsize(path)
            except OSError:
                sz = 0
            bytes_freed += sz
            print(f"  would trash: {path} ({sz / GB:.2f} GB)")
        print(f"  -> {len(to_remove)} file(s), ~{bytes_freed / GB:.2f} GB reclaimable")

    # ---- integrity gate on deliverables ----
    print("\n[integrity] deliverable-named files")
    if not deliverables:
        print("  no deliverable-named files found.")
    else:
        bad = 0
        for d in sorted(set(deliverables)):
            dur = ffprobe_duration(d)
            if dur is None:
                print(f"  CORRUPT (ffprobe fail): {d}")
                bad += 1
            else:
                print(f"  ok ({dur:7.1f}s): {os.path.basename(d)}")
        if bad:
            print(f"  FAIL: {bad} corrupted deliverable(s) detected.")
            rc = max(rc, 10)
        else:
            print(f"  PASS: all {len(set(deliverables))} deliverable(s) parse.")

    print(f"\n=== doctor exit {rc} ===")
    return rc


# ===========================================================================
# cli
# ===========================================================================


def build_parser():
    p = argparse.ArgumentParser(
        prog="vsafe",
        description="Safe file ops + disk guard for the video-editor pipeline.",
    )
    p.add_argument("--config", default=DEFAULT_CONFIG, help="PROTECTED.json path")
    sub = p.add_subparsers(dest="cmd", required=True)

    pr = sub.add_parser("render", help="disk-guarded, integrity-gated ffmpeg render")
    pr.add_argument("--out", required=True, help="final output path")
    pr.add_argument("--est-gb", type=float, default=None,
                    help="estimated output size in GB (else auto via inputs)")
    pr.add_argument("--headroom", type=float, default=None,
                    help="override free-space multiplier (default from config)")
    pr.add_argument("--dry-run", action="store_true",
                    help="run preflight only, do not invoke ffmpeg")
    pr.add_argument("ffmpeg_args", nargs=argparse.REMAINDER,
                    help="-- then ffmpeg args WITHOUT the output path")

    prm = sub.add_parser("rm", help="protected, recoverable delete")
    prm.add_argument("pattern", help="path or glob (quote globs!)")
    prm.add_argument("--expect", type=int, default=None,
                     help="required match count for wildcard patterns")
    prm.add_argument("--force-deliverable", action="store_true",
                     help="allow deleting PROTECTED matches (still to .vtrash)")
    prm.add_argument("--dry-run", action="store_true")

    ppr = sub.add_parser("prune", help="keep newest N masters per stem")
    ppr.add_argument("--keep", type=int, default=3)
    ppr.add_argument("--dry-run", action="store_true")
    ppr.add_argument("roots", nargs="*", help="dirs/files to scan (default cwd)")

    pd = sub.add_parser("doctor", help="health report")
    pd.add_argument("roots", nargs="*", help="dirs to scan (default cwd)")

    return p


def main(argv=None):
    args = build_parser().parse_args(argv)
    try:
        cfg = load_config(args.config)
    except (OSError, json.JSONDecodeError) as exc:
        print(f"FAIL: cannot load config {args.config}: {exc}", file=sys.stderr)
        return 2
    if args.cmd == "render":
        return cmd_render(args, cfg)
    if args.cmd == "rm":
        return cmd_rm(args, cfg)
    if args.cmd == "prune":
        return cmd_prune(args, cfg)
    if args.cmd == "doctor":
        return cmd_doctor(args, cfg)
    return 2


if __name__ == "__main__":
    sys.exit(main())
