#!/usr/bin/env python3
"""
archive-video.py — After a video is uploaded, sweep every asset for that video
(thumbnails, footage, renders, audio, scripts/docs, edit working files) off the
internal drive into one organized, browsable folder on My Passport.

  Internal (scattered)                    My Passport (organized, one folder)
  ─────────────────────                   ──────────────────────────────────
  ~/stacks-gpt/VIDEO-SCRIPT-<slug>.md     Fat Stacks Video Archive/<slug>/
  ~/stacks-gpt/.../build/<slug>/            ├── thumbnails/
  ~/Desktop/FILMING-KIT/<slug>/             ├── video/
  ~/Desktop/<slug>*.m4a                     │     ├── filming-kit/   (nested folders preserved)
  scripts/thumb-gen/<slug>*.png             │     └── edit-build/    (nested folders preserved)
                                            ├── audio/
                                            ├── project-files/
                                            └── _MANIFEST.md   (every file + where it came from)

Usage:
  python3 archive-video.py --list              # discover archivable video slugs
  python3 archive-video.py <slug>              # DRY RUN — show the plan, move nothing
  python3 archive-video.py <slug> --go         # actually move (copy -> verify -> delete source)
  python3 archive-video.py <slug> --go --include-loose   # also grab loosely-matched Desktop media

Safety:
  * Dry-run is the default. Nothing moves without --go.
  * Moves use rsync --remove-source-files: a source file is deleted ONLY after it
    has been successfully written to My Passport. Resumable; safe to re-run.
  * Only known asset locations are scanned — never your source code / git tree.
"""

import argparse
import os
import subprocess
import sys
from datetime import datetime
from pathlib import Path

HOME = Path.home()
REPO = HOME / "stacks-gpt"

# Known asset locations (we never scan the whole repo / git tree).
BUILD_ROOT = REPO / "scripts" / "video-editor" / "build"
FILMING_ROOT = HOME / "Desktop" / "FILMING-KIT"
THUMB_ROOT = REPO / "scripts" / "thumb-gen"
# Roots scanned (non-recursive) for slug-named loose files:
LOOSE_ROOTS = [REPO, HOME / "Desktop", THUMB_ROOT]

DEST_ROOT = Path("/Volumes/My Passport/Fat Stacks Video Archive")

IMAGE_EXT = {".png", ".jpg", ".jpeg", ".webp", ".gif", ".tiff"}
AUDIO_EXT = {".wav", ".m4a", ".mp3", ".aif", ".aiff", ".aifc", ".flac", ".aac"}
VIDEO_EXT = {".mp4", ".mov", ".m4v", ".avi", ".mkv"}
DOC_EXT = {".md", ".pdf", ".json", ".txt", ".log", ".srt", ".csv", ".edl", ".plist"}

# Loose files in repo root we never touch (not video assets) even if slug matches:
ROOT_SKIP = {"package.json", "tsconfig.json", "package-lock.json"}


def bucket_for(path: Path) -> str:
    ext = path.suffix.lower()
    if ext in IMAGE_EXT:
        return "thumbnails"
    if ext in AUDIO_EXT:
        return "audio"
    if ext in VIDEO_EXT:
        return "video"
    return "project-files"  # md / pdf / json / logs / transcripts / anything else


def human(n: int) -> str:
    f = float(n)
    for unit in ["B", "KB", "MB", "GB", "TB"]:
        if f < 1024 or unit == "TB":
            return f"{f:.1f}{unit}" if unit != "B" else f"{int(f)}B"
        f /= 1024


def dir_size(p: Path) -> int:
    total = 0
    for root, _dirs, files in os.walk(p):
        for fn in files:
            try:
                total += (Path(root) / fn).stat().st_size
            except OSError:
                pass
    return total


def matches(name: str, slug: str) -> bool:
    return slug.lower() in name.lower()


def discover_slugs():
    """Best-effort list of video slugs that have assets on the internal drive."""
    slugs = set()
    if BUILD_ROOT.exists():
        for d in BUILD_ROOT.iterdir():
            if d.is_dir() and d.name not in {"brand-kit"}:
                slugs.add(d.name)
    if FILMING_ROOT.exists():
        for d in FILMING_ROOT.iterdir():
            if d.is_dir():
                slugs.add(d.name.replace("-DONE", ""))
    return sorted(slugs)


def plan(slug: str, include_loose: bool):
    """Return (loose_items, dir_items, skipped). Each item: (src_path, dest_relative)."""
    loose_items = []  # (src_file, bucket)
    dir_items = []    # (src_dir, dest_subpath under <slug>/video/<origin>)
    skipped = []      # (path, size) hidden/trash entries we deliberately don't archive
    project_dirs = [] # per-video source dirs to prune (remove if emptied) after the move

    # 1) Whole edit-build dir for this slug
    if BUILD_ROOT.exists():
        for d in sorted(BUILD_ROOT.iterdir()):
            if d.is_dir() and matches(d.name, slug):
                _split_dir(d, "edit-build", loose_items, dir_items, skipped)
                project_dirs.append(d)

    # 2) Whole filming-kit dir for this slug
    if FILMING_ROOT.exists():
        for d in sorted(FILMING_ROOT.iterdir()):
            if d.is_dir() and matches(d.name.replace("-DONE", ""), slug):
                _split_dir(d, "filming-kit", loose_items, dir_items, skipped)
                project_dirs.append(d)

    # 3) Slug-named loose files in repo root + thumb-gen (always),
    #    and Desktop (only with --include-loose, since Desktop names are noisier)
    for root in LOOSE_ROOTS:
        if not root.exists():
            continue
        if root == HOME / "Desktop" and not include_loose:
            continue
        for f in sorted(root.iterdir()):
            if f.name.startswith("."):
                continue
            if f.is_file() and f.name not in ROOT_SKIP and matches(f.name, slug):
                loose_items.append((f, bucket_for(f)))

    # de-dup by path
    seen = set()
    loose_items = [(p, b) for (p, b) in loose_items if not (str(p) in seen or seen.add(str(p)))]

    # assign collision-free destination filenames within each bucket (no silent overwrites)
    used = set()
    final = []
    for src, bucket in loose_items:
        cand = src.name
        if (bucket, cand) in used:  # same name from a different source dir
            cand = f"{src.stem}__{src.parent.name}{src.suffix}"
        stem, suf = Path(cand).stem, Path(cand).suffix
        n = 1
        while (bucket, cand) in used:
            cand = f"{stem}-{n}{suf}"
            n += 1
        used.add((bucket, cand))
        final.append((src, bucket, cand))
    return final, dir_items, skipped, project_dirs


def _split_dir(d: Path, origin: str, loose_items, dir_items, skipped):
    """Top-level loose files in a project dir get bucketed by type;
    nested subdirs are preserved under video/<origin>/<subdir>.
    Hidden/trash entries (.vtrash, .DS_Store, …) are skipped, not archived."""
    for child in sorted(d.iterdir()):
        if child.name.startswith("."):
            skipped.append((child, dir_size(child) if child.is_dir() else child.stat().st_size))
            continue
        if child.is_file():
            loose_items.append((child, bucket_for(child)))
        elif child.is_dir():
            # namespace by source dir name → preserves provenance + avoids collisions
            dir_items.append((child, f"video/{origin}/{d.name}/{child.name}"))


def render_plan(slug, loose_items, dir_items):
    by_bucket = {}
    total = 0
    for src, bucket, _dest_name in loose_items:
        try:
            sz = src.stat().st_size
        except OSError:
            sz = 0
        by_bucket.setdefault(bucket, []).append((src, sz))
        total += sz
    dir_total = 0
    for src, dest in dir_items:
        sz = dir_size(src)
        dir_total += sz
        by_bucket.setdefault(f"video/{Path(dest).parts[1]} (folders)", []).append((src, sz))
    total += dir_total
    return by_bucket, total


def do_rsync(src: Path, dest_dir: Path, is_dir: bool, dest_name: str = None):
    dest_dir.mkdir(parents=True, exist_ok=True)
    if is_dir:
        # copy contents, remove source files after success, then prune empty dirs
        cmd = ["rsync", "-aH", "--remove-source-files", f"{src}/", f"{dest_dir}/"]
    else:
        target = f"{dest_dir}/{dest_name}" if dest_name else f"{dest_dir}/"
        cmd = ["rsync", "-aH", "--remove-source-files", str(src), target]
    res = subprocess.run(cmd, capture_output=True, text=True)
    if res.returncode != 0:
        print(f"   ! rsync error for {src.name}: {res.stderr.strip()[:200]}")
        return False
    if is_dir:
        # remove now-empty source directory tree
        subprocess.run(["find", str(src), "-type", "d", "-empty", "-delete"],
                       capture_output=True, text=True)
    return True


def write_manifest(slug, dest_base, by_bucket, total, moved_ok):
    lines = [
        f"# Archive manifest — {slug}",
        "",
        f"- Archived: {datetime.now().strftime('%Y-%m-%d %H:%M')}",
        f"- Destination: `{dest_base}`",
        f"- Total size: **{human(total)}**",
        f"- Status: {'COMPLETE' if moved_ok else 'PARTIAL — see errors above'}",
        "",
        "Everything for this video lives in this folder. To pull an asset back, copy it",
        "from here to wherever you need it. Original locations are listed below.",
        "",
    ]
    for bucket in sorted(by_bucket):
        items = by_bucket[bucket]
        lines.append(f"## {bucket}  ({len(items)} items, {human(sum(s for _, s in items))})")
        for src, sz in sorted(items, key=lambda x: -x[1]):
            lines.append(f"- `{src.name}` — {human(sz)}  ·  from `{src}`")
        lines.append("")
    (dest_base / "_MANIFEST.md").write_text("\n".join(lines))


def update_index(slug, dest_base, total):
    idx = DEST_ROOT / "INDEX.md"
    header = "# Fat Stacks Video Archive\n\nArchived videos (newest first):\n\n"
    row = f"- **{slug}** — {human(total)} — archived {datetime.now().strftime('%Y-%m-%d')} — `{dest_base.name}/`\n"
    if idx.exists():
        body = idx.read_text()
        if header not in body:
            body = header + body
        # drop any prior row for this slug, then prepend
        body_lines = [l for l in body.splitlines() if f"**{slug}**" not in l]
        out, inserted = [], False
        for l in body_lines:
            out.append(l)
            if l.strip().endswith("newest first):") and not inserted:
                out.append("")
                out.append(row.rstrip())
                inserted = True
        idx.write_text("\n".join(out) + "\n")
    else:
        idx.write_text(header + row)


def main():
    ap = argparse.ArgumentParser(description="Archive a finished video's assets to My Passport.")
    ap.add_argument("slug", nargs="?", help="video slug, e.g. biz-20apy")
    ap.add_argument("--list", action="store_true", help="list discoverable slugs")
    ap.add_argument("--go", action="store_true", help="actually move (default is dry run)")
    ap.add_argument("--include-loose", action="store_true", help="also grab slug-matched media loose on the Desktop")
    args = ap.parse_args()

    if args.list:
        print("Discoverable video slugs (have assets on the internal drive):\n")
        for s in discover_slugs():
            print(f"  {s}")
        return

    if not args.slug:
        ap.error("provide a slug (or --list). e.g. archive-video.py biz-20apy")

    if not DEST_ROOT.parent.exists():
        sys.exit(f"✗ My Passport is not mounted ({DEST_ROOT.parent}). Plug it in first.")

    loose_items, dir_items, skipped, project_dirs = plan(args.slug, args.include_loose)
    if not loose_items and not dir_items:
        sys.exit(f"✗ No assets found for slug '{args.slug}'. Try: archive-video.py --list")

    by_bucket, total = render_plan(args.slug, loose_items, dir_items)
    dest_base = DEST_ROOT / args.slug

    mode = "MOVE" if args.go else "DRY RUN (nothing will move)"
    print(f"\n=== Archive '{args.slug}'  —  {mode} ===")
    print(f"Destination: {dest_base}")
    print(f"Total to move: {human(total)}\n")
    for bucket in sorted(by_bucket):
        items = by_bucket[bucket]
        print(f"  {bucket}/  ({len(items)} items, {human(sum(s for _, s in items))})")
        for src, sz in sorted(items, key=lambda x: -x[1])[:8]:
            print(f"     {human(sz):>9}  {src.name}")
        if len(items) > 8:
            print(f"     … +{len(items) - 8} more")
    print()

    if skipped:
        sk_total = sum(s for _, s in skipped)
        print(f"  (skipped {len(skipped)} hidden/trash item(s), {human(sk_total)} — NOT archived, "
              f"left in place: {', '.join(p.name for p, _ in skipped[:5])})\n")

    if not args.go:
        print("Dry run only. Re-run with --go to move these to My Passport and free the space.")
        return

    moved_ok = True
    for src, bucket, dest_name in loose_items:
        ok = do_rsync(src, dest_base / bucket, is_dir=False, dest_name=dest_name)
        moved_ok = moved_ok and ok
    for src, dest_rel in dir_items:
        ok = do_rsync(src, dest_base / dest_rel, is_dir=True)
        moved_ok = moved_ok and ok

    # tidy: drop regenerable .DS_Store, then remove any now-empty source project dirs
    # (dirs still holding real trash like .vtrash are intentionally left in place)
    for pd in project_dirs:
        if pd.exists():
            subprocess.run(["find", str(pd), "-name", ".DS_Store", "-delete"],
                           capture_output=True, text=True)
            subprocess.run(["find", str(pd), "-depth", "-type", "d", "-empty", "-delete"],
                           capture_output=True, text=True)

    write_manifest(args.slug, dest_base, by_bucket, total, moved_ok)
    update_index(args.slug, dest_base, total)
    print(f"\n✓ Archived '{args.slug}' → {dest_base}")
    print(f"  Manifest: {dest_base / '_MANIFEST.md'}")
    print(f"  Index:    {DEST_ROOT / 'INDEX.md'}")
    if not moved_ok:
        print("  ⚠ Some items had rsync errors (see above) — sources for those were NOT deleted.")


if __name__ == "__main__":
    main()
