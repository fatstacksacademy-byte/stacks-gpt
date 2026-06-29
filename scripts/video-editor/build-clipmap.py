#!/usr/bin/env python3.14
"""build-clipmap.py — data-driven port of the biz-20apy 2-pass ffmpeg compositor.

Reads a committed declarative clipmap JSON (e.g. clipmap.biz-20apy.json) and
reconstructs BOTH ffmpeg passes that previously lived as volatile /tmp scripts
(/tmp/v8_p1.py + /tmp/v8_p2.py). The filter_complex graphs and ffmpeg argv this
tool emits are byte-for-byte the same as those the /tmp scripts built, so the
assembly is now version-controlled, diffable, and survives a /tmp wipe.

  pass1: base video  + clip overlays (scale/pad/fps/setpts + timed overlay)
         + voice track with a ducked window + looped/faded/attenuated bed music.
  pass2: pass1 output + alpha overlays + animated comet borders on the face
         square during split windows + a full-frame greenscreen outro composite
         + whip-pan transitions at every cut point.

MODES
  --validate / --dry-run : load JSON, validate against clipmap.schema.json,
                           check that every referenced file exists (report the
                           missing ones — some /tmp inputs may legitimately be
                           gone), and PRINT the constructed pass1 and pass2
                           filter_complex strings for eyeballing. No render.
  --render               : actually run ffmpeg for both passes (slow; ~12 min
                           video). Refuses if any input file is missing.

EXIT CODES
  0  validation passed (schema ok). In --dry-run, exits 0 even if some optional
     /tmp inputs are missing (reported), since that is expected after a wipe.
  2  schema validation failed, or JSON could not be parsed.
  3  --render requested but inputs are missing, or ffmpeg failed.
  4  --strict was set and one or more referenced files are missing.
"""

import argparse
import json
import os
import subprocess
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
DEFAULT_MAP = os.path.join(HERE, "clipmap.biz-20apy.json")
DEFAULT_SCHEMA = os.path.join(HERE, "clipmap.schema.json")


def _num(v):
    """Render a number the way the original /tmp scripts did: whole-valued
    floats collapse to a bare integer (st=0, not st=0.0) so the reconstructed
    filtergraph is byte-for-byte identical to the source-of-truth scripts."""
    if isinstance(v, float) and v.is_integer():
        return str(int(v))
    return str(v)


# --------------------------------------------------------------------------- #
# Minimal JSON Schema validator (Draft 2020-12 subset).
# jsonschema is NOT installed in this environment, so we implement only the
# keywords actually used by clipmap.schema.json: type, required, properties,
# additionalProperties, items, minItems, maxItems, minLength, minimum,
# exclusiveMinimum, $ref (local #/...), $defs.
# --------------------------------------------------------------------------- #

_TYPE_CHECKS = {
    "object": lambda v: isinstance(v, dict),
    "array": lambda v: isinstance(v, list),
    "string": lambda v: isinstance(v, str),
    # bool is a subclass of int in python; exclude it from number/integer.
    "number": lambda v: isinstance(v, (int, float)) and not isinstance(v, bool),
    "integer": lambda v: (isinstance(v, int) and not isinstance(v, bool))
    or (isinstance(v, float) and v.is_integer()),
    "boolean": lambda v: isinstance(v, bool),
    "null": lambda v: v is None,
}


def _resolve_ref(ref, root):
    if not ref.startswith("#/"):
        raise ValueError(f"only local $ref supported, got {ref!r}")
    node = root
    for part in ref[2:].split("/"):
        part = part.replace("~1", "/").replace("~0", "~")
        node = node[part]
    return node


def _validate(node, schema, root, path, errors):
    if "$ref" in schema:
        _validate(node, _resolve_ref(schema["$ref"], root), root, path, errors)
        return

    t = schema.get("type")
    if t is not None:
        types = t if isinstance(t, list) else [t]
        if not any(_TYPE_CHECKS[tt](node) for tt in types):
            errors.append(f"{path or '<root>'}: expected type {t}, got {type(node).__name__}")
            return  # further checks are unreliable on a type mismatch

    if isinstance(node, dict):
        for req in schema.get("required", []):
            if req not in node:
                errors.append(f"{path or '<root>'}: missing required property '{req}'")
        props = schema.get("properties", {})
        addl = schema.get("additionalProperties", True)
        for k, v in node.items():
            sub = f"{path}.{k}" if path else k
            if k in props:
                _validate(v, props[k], root, sub, errors)
            elif addl is False:
                errors.append(f"{sub}: additional property not allowed")
            elif isinstance(addl, dict):
                _validate(v, addl, root, sub, errors)

    if isinstance(node, list):
        items = schema.get("items")
        if isinstance(items, dict):
            for i, v in enumerate(node):
                _validate(v, items, root, f"{path}[{i}]", errors)
        if "minItems" in schema and len(node) < schema["minItems"]:
            errors.append(f"{path or '<root>'}: needs >= {schema['minItems']} items, has {len(node)}")
        if "maxItems" in schema and len(node) > schema["maxItems"]:
            errors.append(f"{path or '<root>'}: needs <= {schema['maxItems']} items, has {len(node)}")

    if isinstance(node, str) and "minLength" in schema and len(node) < schema["minLength"]:
        errors.append(f"{path or '<root>'}: string shorter than {schema['minLength']}")

    if _TYPE_CHECKS["number"](node):
        if "minimum" in schema and node < schema["minimum"]:
            errors.append(f"{path or '<root>'}: {node} < minimum {schema['minimum']}")
        if "exclusiveMinimum" in schema and node <= schema["exclusiveMinimum"]:
            errors.append(f"{path or '<root>'}: {node} <= exclusiveMinimum {schema['exclusiveMinimum']}")


def validate_schema(data, schema):
    errors = []
    _validate(data, schema, schema, "", errors)
    return errors


# --------------------------------------------------------------------------- #
# Filtergraph reconstruction — must match /tmp/v8_p1.py + /tmp/v8_p2.py exactly.
# --------------------------------------------------------------------------- #

def build_pass1(cm):
    """Reconstruct pass1: returns (filter_complex list, ffmpeg argv).

    Mirrors /tmp/v8_p1.py line-for-line.
    """
    p1 = cm["pass1"]
    BASE = p1["base"]
    MUS = p1["music"]["file"]
    TOTAL = cm["total_duration"]
    fps = cm["fps"]
    W, H = cm["width"], cm["height"]

    # C = [(file, start, dur), ...] then C.sort(key=lambda c:c[1])  (sort by start)
    C = [(c["file"], c["start"], c["dur"]) for c in p1["clips"]]
    C = sorted(C, key=lambda c: c[1])

    # input ordering: base, then each clip, then music (with stream_loop).
    inp = ["-i", BASE]
    for f, _, _ in C:
        inp += ["-i", f]
    MUS_I = len(C) + 1
    loop = str(p1["music"].get("stream_loop", 2))
    inp += ["-stream_loop", loop, "-i", MUS]

    fc = []
    last = "0:v"
    for i, (f, st, du) in enumerate(C):
        n = i + 1
        fc.append(
            f"[{n}:v]scale={W}:{H}:force_original_aspect_ratio=decrease,"
            f"pad={W}:{H}:(ow-iw)/2:(oh-ih)/2,fps={fps},setsar=1,setpts=PTS-STARTPTS+{st}/TB[o{n}]"
        )
        fc.append(
            f"[{last}][o{n}]overlay=enable='between(t,{st:.3f},{st+du:.3f})'[v{n}]"
        )
        last = f"v{n}"

    # voice: ducked inside the voice_duck window.
    dw = p1["voice_duck"]["window"]
    dg = p1["voice_duck"]["gain"]
    fc.append(
        f"[0:a]aformat=channel_layouts=stereo,volume=eval=frame:"
        f"volume='if(between(t,{dw[0]},{dw[1]}),{dg},1.0)'[voice]"
    )

    # music bed: trimmed, attenuated, faded in/out.
    mvol = p1["music"]["vol"]
    fin = p1["music"]["fades"]["in"]
    fout = p1["music"]["fades"]["out"]
    fc.append(
        f"[{MUS_I}:a]aformat=channel_layouts=stereo,atrim=0:{TOTAL},volume={mvol},"
        f"afade=t=in:st={_num(fin['start'])}:d={_num(fin['dur'])},"
        f"afade=t=out:st={_num(fout['start'])}:d={_num(fout['dur'])}[mus]"
    )
    fc.append("[voice][mus]amix=inputs=2:normalize=0:dropout_transition=0[aout]")

    cmd = (
        ["ffmpeg", "-y", "-v", "error", "-stats"]
        + inp
        + [
            "-filter_complex", ";".join(fc),
            "-map", f"[{last}]", "-map", "[aout]", "-t", f"{TOTAL}",
            "-c:v", "libx264", "-crf", "18", "-preset", "fast",
            "-r", str(fps), "-pix_fmt", "yuv420p",
            "-c:a", "aac", "-b:a", "192k", "-movflags", "+faststart",
        ]
    )
    return fc, cmd, C


def build_pass2(cm, out_pass1):
    """Reconstruct pass2: returns (filter_complex list, ffmpeg argv).

    Mirrors /tmp/v8_p2.py line-for-line. out_pass1 is the pass1 render that
    becomes pass2's input ("0:v").
    """
    p2 = cm["pass2"]
    TOTAL = cm["total_duration"]
    fps = cm["fps"]
    W, H = cm["width"], cm["height"]
    WHIP = p2["whip"]
    BORDER = p2["border"]
    WD = p2["whip_dur"]
    GS = p2["gs_composite"]["file"]
    GS_T0 = p2["gs_composite"]["start"]
    GS_DUR = p2["gs_composite"]["dur"]

    ALPHA = [(a["file"], a["start"], a["dur"]) for a in p2["alpha_overlays"]]
    SPLITS = [(s[0], s[1]) for s in p2["splits"]]
    cuts = sorted(set(round(c, 3) for c in p2["cuts"]))

    # input ordering: pass1 output, alphas, one looped border per split,
    # greenscreen composite, one whip per cut.
    inp = ["-i", out_pass1]
    for f, _, _ in ALPHA:
        inp += ["-i", f]
    B0 = 1 + len(ALPHA)
    for _ in SPLITS:
        inp += ["-stream_loop", "-1", "-i", BORDER]
    GI = B0 + len(SPLITS)
    inp += ["-i", GS]
    for _ in cuts:
        inp += ["-i", WHIP]

    fc = []
    last = "0:v"
    idx = 1
    for f, st, du in ALPHA:
        fc.append(f"[{idx}:v]setpts=PTS-STARTPTS+{st}/TB[a{idx}]")
        fc.append(
            f"[{last}][a{idx}]overlay=enable='between(t,{st:.3f},{st+du:.3f})':eof_action=pass[av{idx}]"
        )
        last = f"av{idx}"
        idx += 1

    # comet border on the face square (x=40,y=40) during each split window.
    for k, (st, du) in enumerate(SPLITS):
        bi = B0 + k
        fc.append(f"[{bi}:v]setpts=PTS-STARTPTS+{st}/TB[b{k}]")
        fc.append(
            f"[{last}][b{k}]overlay=40:40:enable='between(t,{st:.3f},{st+du:.3f})':eof_action=pass[bv{k}]"
        )
        last = f"bv{k}"

    # green-screen outro composite, full-frame.
    fc.append(f"[{GI}:v]fps={fps},setpts=PTS-STARTPTS+{GS_T0}/TB[gs]")
    fc.append(
        f"[{last}][gs]overlay=0:0:enable='between(t,{GS_T0},{GS_T0+GS_DUR})'[gsv]"
    )
    last = "gsv"

    idx = GI + 1
    for j, ct in enumerate(cuts):
        wi = idx + j
        off = max(0.0, ct - WD / 2)
        fc.append(
            f"[{wi}:v]format=rgba,scale={W}:{H},fps={fps},setpts=PTS-STARTPTS+{off:.3f}/TB[w{j}]"
        )
        fc.append(
            f"[{last}][w{j}]overlay=enable='between(t,{off:.3f},{off+WD:.3f})':eof_action=pass[wv{j}]"
        )
        last = f"wv{j}"

    cmd = (
        ["ffmpeg", "-y", "-v", "error", "-stats"]
        + inp
        + [
            "-filter_complex", ";".join(fc),
            "-map", f"[{last}]", "-map", "0:a", "-t", f"{TOTAL}",
            "-c:v", "libx264", "-crf", "19", "-preset", "fast",
            "-r", str(fps), "-pix_fmt", "yuv420p",
            "-c:a", "copy", "-movflags", "+faststart",
        ]
    )
    return fc, cmd, ALPHA, SPLITS, cuts


# --------------------------------------------------------------------------- #
# File existence audit
# --------------------------------------------------------------------------- #

def referenced_files(cm):
    """Yield (role, path) for every input file referenced by the clipmap."""
    p1 = cm["pass1"]
    yield ("pass1.base", p1["base"])
    yield ("pass1.music", p1["music"]["file"])
    for c in p1["clips"]:
        yield ("pass1.clip", c["file"])
    p2 = cm["pass2"]
    # base_from_pass1 is a generated intermediate, not a source input.
    yield ("pass2.whip", p2["whip"])
    yield ("pass2.border", p2["border"])
    for a in p2["alpha_overlays"]:
        yield ("pass2.alpha", a["file"])
    yield ("pass2.gs_composite", p2["gs_composite"]["file"])


def audit_files(cm):
    present, missing = [], []
    seen = set()
    for role, path in referenced_files(cm):
        key = (role, path)
        if key in seen:
            continue
        seen.add(key)
        (present if os.path.exists(path) else missing).append((role, path))
    return present, missing


# --------------------------------------------------------------------------- #
# main
# --------------------------------------------------------------------------- #

def head(fc, n):
    return "\n".join(fc[:n])


def main(argv=None):
    ap = argparse.ArgumentParser(description="Data-driven 2-pass ffmpeg compositor from a committed clipmap JSON.")
    ap.add_argument("clipmap", nargs="?", default=DEFAULT_MAP, help="path to clipmap JSON")
    ap.add_argument("--schema", default=DEFAULT_SCHEMA, help="path to clipmap JSON Schema")
    ap.add_argument("--validate", "--dry-run", dest="dry_run", action="store_true",
                    help="validate + audit files + print filtergraphs, no render")
    ap.add_argument("--render", action="store_true", help="actually run ffmpeg for both passes (slow)")
    ap.add_argument("--strict", action="store_true", help="treat any missing referenced file as a FAIL (exit 4)")
    ap.add_argument("--out1", default="/tmp/v9_clips.mp4", help="pass1 output path (also pass2 input)")
    ap.add_argument("--out2", default="/tmp/v9_FINAL.mp4", help="pass2 (final) output path")
    ap.add_argument("--head", type=int, default=8, help="how many filtergraph lines to print in dry-run")
    args = ap.parse_args(argv)

    if not args.dry_run and not args.render:
        args.dry_run = True  # default to safe mode

    # --- load JSON ---
    try:
        with open(args.clipmap) as fh:
            cm = json.load(fh)
    except (OSError, json.JSONDecodeError) as e:
        print(f"FAIL  could not load clipmap {args.clipmap}: {e}")
        return 2

    # --- schema validate ---
    try:
        with open(args.schema) as fh:
            schema = json.load(fh)
    except (OSError, json.JSONDecodeError) as e:
        print(f"FAIL  could not load schema {args.schema}: {e}")
        return 2

    errors = validate_schema(cm, schema)
    print("=" * 68)
    print(f"clipmap : {args.clipmap}")
    print(f"schema  : {args.schema}")
    print(f"video   : {cm.get('video','?')}  duration={cm.get('total_duration')}s  fps={cm.get('fps')}  {cm.get('width')}x{cm.get('height')}")
    print("=" * 68)
    if errors:
        print(f"SCHEMA  FAIL  ({len(errors)} error(s)):")
        for e in errors:
            print(f"  - {e}")
        return 2
    print(f"SCHEMA  PASS  (validated against {os.path.basename(args.schema)})")

    # --- build both filtergraphs (always; needed for both modes) ---
    fc1, cmd1, C = build_pass1(cm)
    fc2, cmd2, ALPHA, SPLITS, cuts = build_pass2(cm, args.out1)

    # --- file audit ---
    present, missing = audit_files(cm)
    print("-" * 68)
    print(f"FILES   {len(present)} present / {len(missing)} missing  (of {len(present)+len(missing)} referenced source inputs)")
    if missing:
        print("        MISSING (expected for wiped /tmp inputs):")
        for role, path in missing:
            print(f"          [{role}] {path}")

    # --- structure summary ---
    print("-" * 68)
    print(f"PASS1   clips={len(C)}  filtergraph nodes={len(fc1)}  ffmpeg inputs={cmd1.count('-i')}")
    print(f"PASS2   alpha={len(ALPHA)}  splits={len(SPLITS)}  cuts(dedup)={len(cuts)}  filtergraph nodes={len(fc2)}  ffmpeg inputs={cmd2.count('-i')}")

    # --- print filtergraph heads for eyeballing ---
    print("-" * 68)
    print(f"PASS1 filter_complex (first {args.head} of {len(fc1)} nodes):")
    print(head(fc1, args.head))
    print("...")
    print(f"PASS1 audio tail (last 3 nodes):")
    print("\n".join(fc1[-3:]))
    print("-" * 68)
    print(f"PASS2 filter_complex (first {args.head} of {len(fc2)} nodes):")
    print(head(fc2, args.head))
    print("...")
    print(f"PASS2 greenscreen + whip tail (last 4 nodes):")
    print("\n".join(fc2[-4:]))
    print("=" * 68)

    if args.strict and missing:
        print(f"STRICT  FAIL  {len(missing)} referenced file(s) missing.")
        return 4

    if args.dry_run:
        print("DRY-RUN PASS  (schema ok, graphs constructed; no render performed)")
        return 0

    # --- render ---
    if missing:
        print(f"RENDER  FAIL  cannot render with {len(missing)} missing input(s); re-create them or run --dry-run.")
        return 3
    try:
        cmd1 = cmd1 + [args.out1]
        cmd2 = cmd2 + [args.out2]
        print(f"RENDER  pass1 -> {args.out1}")
        subprocess.run(cmd1, check=True)
        print(f"RENDER  pass2 -> {args.out2}")
        subprocess.run(cmd2, check=True)
    except subprocess.CalledProcessError as e:
        print(f"RENDER  FAIL  ffmpeg exited {e.returncode}")
        return 3
    print(f"RENDER  PASS  final={args.out2}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
