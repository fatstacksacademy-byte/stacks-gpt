#!/usr/bin/env python3
"""
PreToolUse(Bash) guard — block raw `rm` of video DELIVERABLES, redirect to vsafe.py.

Reads the Claude Code PreToolUse JSON payload on stdin. If the Bash command is a
destructive op (rm / unlink / find -delete) AND it targets a known danger zone
(build/, a broll dir, ~/Desktop/FILMING-KIT, or a *-PRODUCED-v* / *-UPLOAD-* /
*REDACTED* deliverable), it exits 2 — which BLOCKS the call and feeds the stderr
note back to the agent, pointing it at scripts/video-editor/vsafe.py (recoverable
trash + protected globs + --expect counts). Everything else passes (exit 0).

Deliberately NARROW: routine `rm` of /tmp scratch pngs etc. is NOT touched, so this
doesn't nag during normal work. The `rm cap_*.mp4` footgun that wiped approved clips
IS caught. Allowlists anything already going through vsafe.
"""
import json, re, sys

try:
    payload = json.load(sys.stdin)
except Exception:
    sys.exit(0)  # never break the tool on a parse hiccup

cmd = (payload.get("tool_input", {}) or {}).get("command", "") or ""

# already safe?
if "vsafe" in cmd:
    sys.exit(0)

# a destructive op as an actual command word (not 'form', 'term', '--norm')
destructive = re.search(r"(?:^|[;&|]|\s)(rm|unlink)\s", cmd) or re.search(r"\bfind\b.*-delete\b", cmd)
if not destructive:
    sys.exit(0)

# ...aimed at a deliverable / danger zone
danger = re.search(r"(/build/|/broll\b|/broll[-/]|FILMING-KIT|-PRODUCED-v|-UPLOAD-|REDACTED)", cmd)
if not danger:
    sys.exit(0)

sys.stderr.write(
    "BLOCKED by rm-guard: this deletes a video deliverable / build / FILMING-KIT path.\n"
    "Use scripts/video-editor/vsafe.py instead (recoverable .vtrash, protected globs, --expect N):\n"
    "  python3 scripts/video-editor/vsafe.py rm '<glob>' --expect N\n"
    "  python3 scripts/video-editor/vsafe.py prune --keep 3 <dir>\n"
    "Override (still recoverable): add --force-deliverable.\n"
)
sys.exit(2)
