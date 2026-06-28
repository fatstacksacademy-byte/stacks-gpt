#!/usr/bin/env python3
"""
cut-single.py — editorial first-pass cut of a single recording, computed on its OWN audio.

Generic over any video (it was originally the best-cards-June cutter; the recording-specific
trims/takes are now CLI flags). Transcribes the export's audio with Whisper (word stamps),
detects dead air + repeated takes + "excuse me" self-corrections, and builds a clean cut in
DaVinci Resolve (video contiguous + ONE rendered audio wav, lip-locked, no gaps). Then you
review in Resolve and colour-mark, and apply-marks.py rebuilds. No script / no IntelliScript —
it works directly on what you actually said (ad-lib friendly).

  python3 scripts/video-editor/cut-single.py --export ~/Desktop/myvideo.mov
  python3 scripts/video-editor/cut-single.py --export raw.mov --front-trim 6 --manual-cuts "40.7-42.1,157-161" --dry

Removes = front-trim (optional) + dead-space compression (silencedetect, pauses > --max-pause)
  + pause-gated restart/retake removal + "excuse me" cuts + --slates + --manual-cuts.
Keeps = complement → the cut. --dry writes keeps.json + review.md WITHOUT touching Resolve.

Two opt-in pacing controls (both default OFF → output byte-identical to before):
  --keep-laughter   protect loud, word-less reaction beats (laughter / a beat of disbelief)
                    the dead-air remover would otherwise cut. Carved out of the removals.
  --clamp-gap SECS  AFTER the keep-list is final, normalize pacing — trim every RETAINED gap
                    longer than SECS down to SECS (a uniform floor, not silence removal).
"""
import argparse, json, os, re, subprocess, sys

ap = argparse.ArgumentParser()
ap.add_argument("--export", required=True, help="the recording (one video file, with the audio you want cut on)")
ap.add_argument("--build", default="", help="work dir (default: scripts/video-editor/build/<slug>)")
ap.add_argument("--fps", type=float, default=0, help="0 = probe the export")
ap.add_argument("--words", default="", help="Whisper words json (default: <build>/<stem>.json; auto-transcribed if missing)")
ap.add_argument("--wav", default="", help="mono audio for silencedetect (default: <build>/<slug>-gm.wav; auto-extracted)")
ap.add_argument("--out-timeline", default="", help="Resolve timeline name (default: <slug>-cut)")
ap.add_argument("--front-trim", type=float, default=0.0, help="seconds to drop off the front (false starts)")
ap.add_argument("--slates", default="", help="extra fixed cuts 't:dur,t:dur' (e.g. take slates)")
ap.add_argument("--manual-cuts", default="", help="force-remove spans 'a-b,c-d' (export seconds)")
ap.add_argument("--noise", default="-45dB", help="silencedetect noise floor (raise for a louder/roomier mic)")
ap.add_argument("--silence-d", type=float, default=0.30, help="silencedetect min silence duration")
ap.add_argument("--max-pause", type=float, default=0.30, help="compress pauses longer than this")
ap.add_argument("--pad", type=float, default=0.06, help="keep this much padding around compressed pauses")
ap.add_argument("--min-pause", type=float, default=0.6)
ap.add_argument("--long-word", type=float, default=1.0)
ap.add_argument("--max-abandon", type=float, default=6.5)
ap.add_argument("--long-run", type=int, default=5)
ap.add_argument("--min-cover", type=float, default=0.70)
ap.add_argument("--short-max", type=float, default=5.0)
ap.add_argument("--max-span", type=float, default=12.0)
ap.add_argument("--whisper-model", default="medium.en")
# --- OPT-IN pacing/reaction features (both default to today's behaviour) ---
ap.add_argument("--keep-laughter", action="store_true",
                help="protect non-speech reaction beats (laughter / a beat of disbelief) the dead-air remover "
                     "would otherwise cut: loud audio (> noise floor + --laugh-margin dB) for >= --laugh-min s "
                     "with NO Whisper words over it. OFF by default (output byte-identical).")
ap.add_argument("--laugh-margin", type=float, default=12.0,
                help="a reaction span must sit this many dB ABOVE the silence noise floor (default 12)")
ap.add_argument("--laugh-min", type=float, default=0.4,
                help="minimum length of a protected non-speech reaction span, seconds (default 0.4)")
ap.add_argument("--laugh-pad", type=float, default=0.10,
                help="extra padding kept around a protected reaction span, seconds (default 0.10)")
ap.add_argument("--clamp-gap", type=float, default=0.0,
                help="0 = OFF. After the keep-list is final, NORMALIZE pacing: every RETAINED gap between "
                     "kept clips longer than this is trimmed down to this many seconds (uniform floor). "
                     "Distinct from --max-pause (silence REMOVAL); this evens out what survives.")
ap.add_argument("--dry", action="store_true", help="compute the cut + write keeps.json/review.md, skip Resolve")
a = ap.parse_args()

EXPORT = os.path.abspath(os.path.expanduser(a.export))
if not os.path.exists(EXPORT):
    sys.exit(f"cut-single: export not found: {EXPORT}")
STEM = os.path.splitext(os.path.basename(EXPORT))[0]
SLUG = re.sub(r"[^a-z0-9]+", "-", STEM.lower()).strip("-") or "cut"
BUILD = a.build or f"scripts/video-editor/build/{SLUG}"
os.makedirs(BUILD, exist_ok=True)
GM_WORDS = a.words or f"{BUILD}/{STEM}.json"
GM_WAV = a.wav or f"{BUILD}/{SLUG}-gm.wav"
OUT_TIMELINE = a.out_timeline or f"{SLUG}-cut"

# retake/dead-air knobs — module globals the detectors read (set from args)
MAX_PAUSE, PAD = a.max_pause, a.pad
MIN_PAUSE, LONG_WORD, MAX_ABANDON = a.min_pause, a.long_word, a.max_abandon
LONG_RUN, MIN_COVER, SHORT_MAX = a.long_run, a.min_cover, a.short_max

_norm = lambda w: re.sub(r"[^a-z0-9']", "", w.lower())
def fmt(s): return f"{int(s//60)}:{int(s % 60):02d}"


def probe(*entries):
    return subprocess.run(["ffprobe", "-v", "error", *entries, "-of", "csv=p=0", EXPORT],
                          capture_output=True, text=True).stdout.strip().split("\n")[0]


def load_words(path):
    d = json.load(open(path))
    return [{"word": w["word"], "start": w["start"], "end": w["end"]}
            for s in d["segments"] for w in s.get("words", [])]


def detect_silences(wav, noise, d):
    p = subprocess.run(["ffmpeg", "-hide_banner", "-i", wav, "-af",
                        f"silencedetect=noise={noise}:d={d}", "-f", "null", "-"],
                       capture_output=True, text=True)
    sils, st = [], None
    for line in p.stderr.splitlines():
        m = re.search(r"silence_start: ([-\d.]+)", line)
        if m: st = float(m.group(1))
        m = re.search(r"silence_end: ([-\d.]+)", line)
        if m and st is not None: sils.append((max(0, st), float(m.group(1)))); st = None
    return sils


def measure_noise_floor(wav, energy, sils):
    """The silence noise floor in dBFS — what 'silence' actually measures at, so a reaction span
    can be judged RELATIVE to it (mic/room-independent). We look at the per-window RMS inside the
    stretches silencedetect called silence and take a LOW percentile, NOT the mean: a soft
    reaction (laugh/gasp) can be embedded inside one of those "silences" (silencedetect swallowed
    it because its peaks stayed under the noise bar), and averaging it in would inflate the floor
    and hide the very thing --keep-laughter exists to protect. The 20th percentile of the silent
    windows is the true room floor even when a reaction sits in the span. Falls back to
    volumedetect's mean (biased down) when there are no silences. Returns dBFS (negative)."""
    if sils and energy:
        floor_windows = [db for t, db in energy
                         if any(s <= t < e for s, e in sils)]
        if floor_windows:
            floor_windows.sort()
            return floor_windows[len(floor_windows) // 5]  # 20th percentile = the genuine floor
    p = subprocess.run(["ffmpeg", "-hide_banner", "-i", wav, "-af", "volumedetect",
                        "-f", "null", "-"], capture_output=True, text=True)
    for line in p.stderr.splitlines():
        m = re.search(r"mean_volume:\s*([-\d.]+)", line)
        if m: return float(m.group(1)) - 6.0  # mean is over the whole file (incl. speech) → bias down
    return -55.0


def frame_energy(wav, hop=0.05):
    """Per-window RMS energy of the wav as (time, dbfs) pairs, sampled every `hop` seconds.
    Uses ffmpeg astats with asetnsamples so each metadata frame is one window — the same
    RMS the silence detector reasons about, just sampled densely so we can find LOUD spans
    (not just quiet ones). Returns [] if astats emits nothing (degrades to no reactions)."""
    sr = 16000
    win = max(1, int(round(sr * hop)))
    p = subprocess.run(["ffmpeg", "-hide_banner", "-nostats", "-i", wav,
                        "-af", f"aresample={sr},asetnsamples=n={win}:p=0,"
                               "astats=metadata=1:reset=1:measure_perchannel=none:measure_overall=RMS_level,"
                               "ametadata=print:key=lavfi.astats.Overall.RMS_level",
                        "-f", "null", "-"], capture_output=True, text=True)
    out, t = [], 0.0
    for line in p.stderr.splitlines():
        m = re.search(r"pts_time:([-\d.]+)", line)
        if m:
            try: t = float(m.group(1))
            except ValueError: pass
            continue
        m = re.search(r"lavfi\.astats\.Overall\.RMS_level=([-\d.]+)", line)
        if m:
            try: out.append((t, float(m.group(1))))
            except ValueError: pass
    return out


def detect_reactions(energy, words, floor_db, margin, min_len, hop=0.05):
    """Non-speech reaction beats to PROTECT from the dead-air remover: contiguous windows whose
    RMS sits clearly ABOVE the noise floor (floor + `margin` dB) for >= `min_len` seconds, but
    over which Whisper transcribed NO word (a laugh, a gasp, a beat of disbelief — vocal energy,
    no text). These would otherwise read as 'not speech' and be compressed away. Conservative:
    every span must clear BOTH the loudness and the duration bar and overlap zero words.
    `energy` is the per-window [(t, dbfs)] from frame_energy (shared with the floor estimate).
    Returns [(start, end, peak_db)] (no padding yet — caller pads)."""
    if not energy:
        return []
    thresh = floor_db + margin
    # collapse the per-window 'is-loud' mask into contiguous loud runs
    runs, run_s, peak = [], None, -120.0
    for i, (t, db) in enumerate(energy):
        if db >= thresh:
            if run_s is None: run_s, peak = t, db
            else: peak = max(peak, db)
        else:
            if run_s is not None:
                runs.append((run_s, t, peak)); run_s, peak = None, -120.0
    if run_s is not None:
        runs.append((run_s, energy[-1][0] + hop, peak))

    def has_word(s, e):  # any transcribed word overlapping this span?
        return any(w["end"] > s and w["start"] < e for w in words)

    out = []
    for s, e, pk in runs:
        if e - s + hop >= min_len and not has_word(s, e):
            out.append((s, e + hop, pk))  # +hop: the last loud window extends ~one hop past its pts
    return out


def clamp_retained_gaps(keeps, sils, limit):
    """Pacing NORMALIZATION (NOT silence removal). The dead-air remover only compresses pauses
    LONGER than --max-pause; shorter ones (and the --pad breath it leaves around the ones it did
    compress) survive into the cut. Over a long take those RETAINED gaps still vary — some beats
    breathe 0.5s, others 0.25s — and the pacing feels uneven. With --clamp-gap SECS we put a
    UNIFORM FLOOR on them: every gap of silence that SURVIVED inside a kept segment and is longer
    than SECS is trimmed back to exactly SECS. We trim from the END of the gap (keep SECS of
    breath after the previous word) and return the extra spans to remove — fed back through
    complement(), so the same removal machinery keeps the audio/video lock exact. Reports the
    clamped gaps as [(gap_start, gap_end, kept_to)] for review.md.

    Distinct from --max-pause: that REMOVES dead air over a threshold; this EVENS OUT what's left
    (it can only ever shorten a retained gap, never lengthen, and never touches speech)."""
    extra, report = [], []
    keep_iv = sorted((s, e) for s, e in keeps if e > s)
    for ss, se in sils:
        for ks, ke in keep_iv:
            # the portion of this silence that actually survived into the cut (inside a keep)
            gs, ge = max(ss, ks), min(se, ke)
            if ge - gs > limit + 1e-6:
                cut_s = gs + limit          # keep `limit` of breath at the head of the gap
                cut_e = ge                  # trim the rest of the retained silence
                if cut_e - cut_s > 1e-6:
                    extra.append((cut_s, cut_e))
                    report.append((gs, ge, limit))
    return extra, report


def _lcs(a, b):
    if not a or not b: return 0
    prev = [0] * (len(b) + 1)
    for x in a:
        cur = [0] * (len(b) + 1)
        for k, y in enumerate(b, 1):
            cur[k] = prev[k - 1] + 1 if x == y else max(prev[k], cur[k - 1])
        prev = cur
    return prev[-1]


def detect_retakes(words, sils, max_span):  # repeated word-run with a real PAUSE between attempts
    """A restart = a repeated word-run with a real PAUSE between the two attempts (long
    silence/gap or a held/cut-off word). Fluent echoes (no pause) are left alone. To NOT
    overcut, a SHORT shared run (L<LONG_RUN) must also be a near-duplicate (>=MIN_COVER
    contained in the restart). A LONG verbatim run (L>=LONG_RUN) is a confident retake."""
    n = [_norm(w["word"]) for w in words]
    sil_starts = [s for s, e in sils]; sil_ends = [e for s, e in sils]
    spans, removed, i = [], set(), 0
    while i < len(words):
        if i in removed or not n[i]: i += 1; continue
        best, j = None, i + 1
        while j < len(words) and words[j]["start"] - words[i]["start"] <= max_span:
            if n[j] == n[i]:
                L = 0
                while i + L < j and j + L < len(words) and n[i + L] and n[i + L] == n[j + L]: L += 1
                if best is None or L > best[1]: best = (j, L)
            j += 1
        if best and best[1] >= 2:
            j, L = best
            pause = any((words[k + 1]["start"] - words[k]["end"] > MIN_PAUSE) or
                        (words[k]["end"] - words[k]["start"] > LONG_WORD)
                        for k in range(i, min(j, len(words) - 1)))
            if not pause:
                pause = any(words[i]["start"] <= (s + e) / 2 <= words[j]["start"] and e - s > MIN_PAUSE
                            for s, e in sils)
            accept = False
            if L >= LONG_RUN:
                accept = True
            elif pause and words[j]["start"] - words[i]["start"] <= SHORT_MAX:
                cov = _lcs(n[i:j], n[j:j + (j - i) + 6]) / max(1, j - i)
                accept = cov >= MIN_COVER
            if accept:
                cs = words[i]["start"]
                prior = [e for e in sil_ends if e <= cs + 0.05]
                if prior and cs - max(prior) <= MAX_ABANDON: cs = max(prior)
                ce = words[j]["start"]
                snaps = [s for s in sil_starts if cs < s <= ce + 0.05]
                if snaps: ce = max(snaps)
                if 0 < ce - cs <= MAX_ABANDON:
                    spans.append((cs, ce, " ".join(w["word"].strip() for w in words[i:j]),
                                  " ".join(w["word"].strip() for w in words[j:j + L + 4])))
                    for k in range(i, j): removed.add(k)
                    i = j; continue
        i += 1
    return spans


def detect_excuse_me(words, sils):
    """When he says "excuse me" he's self-correcting — cut the flubbed phrase before it,
    from the pause that began that chunk through "excuse me", snapped to the restart."""
    n = [_norm(w["word"]) for w in words]
    starts = sorted(s for s, e in sils); ends = sorted(e for s, e in sils)
    spans = []
    for k in range(len(words) - 1):
        if n[k] == "excuse" and n[k + 1] == "me":
            ems, eme = words[k]["start"], words[k + 1]["end"]
            before = [e for e in ends if e <= ems]
            cs = before[-1] if before else ems
            if ems - cs < 0.5 and len(before) >= 2: cs = before[-2]
            if ems - cs > MAX_ABANDON: cs = ems - MAX_ABANDON
            after = [s for s in starts if s >= eme - 0.05]
            ce = min(after) if after and min(after) - eme < 2.0 else eme
            spans.append((cs, ce))
    return spans


def complement(removes, total):
    rs = sorted((max(0.0, s), min(total, e)) for s, e in removes if e > s)
    merged = []
    for s, e in rs:
        if merged and s <= merged[-1][1] + 0.02: merged[-1] = (merged[-1][0], max(merged[-1][1], e))
        else: merged.append((s, e))
    keeps, cur = [], 0.0
    for s, e in merged:
        if s > cur + 0.04: keeps.append((cur, s))
        cur = max(cur, e)
    if total > cur + 0.04: keeps.append((cur, total))
    return keeps, merged


def _subtract_spans(removes, protect):
    """Carve each `protect` span OUT of every span in `removes` (so the protected audio survives
    into the cut). A removal that straddles a protected span is split into the bits on either
    side; one fully inside a protected span is dropped. Used only by --keep-laughter (protect=[]
    everywhere else, in which case this returns `removes` unchanged)."""
    if not protect: return removes
    prot = sorted((s, e) for s, e in protect if e > s)
    out = []
    for s, e in removes:
        pieces = [(s, e)]
        for ps, pe in prot:
            nxt = []
            for a0, b0 in pieces:
                if pe <= a0 or ps >= b0:      # no overlap → keep the removal piece as-is
                    nxt.append((a0, b0)); continue
                if a0 < ps: nxt.append((a0, ps))   # bit before the protected span
                if pe < b0: nxt.append((pe, b0))   # bit after the protected span
            pieces = nxt
        out += [(a0, b0) for a0, b0 in pieces if b0 - a0 > 1e-6]
    return out


def parse_spans(spec, slate=False):
    out = []
    for tok in (t.strip() for t in spec.split(",") if t.strip()):
        sep = ":" if slate else "-"
        try:
            x, y = (float(v) for v in tok.split(sep))
        except ValueError:
            sys.exit(f"cut-single: bad span '{tok}' (want {'t:dur' if slate else 'a-b'})")
        out.append((x, x + y) if slate else (x, y))
    return out


def main():
    # ffprobe (8.x) can emit a trailing comma on csv=p=0 → "24/1,"; parse the fraction safely (no eval)
    rfr = (probe("-select_streams", "v:0", "-show_entries", "stream=r_frame_rate") or "24/1").split(",")[0].strip() or "24/1"
    _num, _, _den = rfr.partition("/")
    FPS = a.fps or round(float(_num) / float(_den or "1"))
    total = float(probe("-show_entries", "format=duration") or 0)
    if not total:
        sys.exit("cut-single: could not probe the export duration")

    if not os.path.exists(GM_WORDS):
        print(f"transcribing with Whisper ({a.whisper_model}) — a few minutes …", flush=True)
        subprocess.run(["whisper", EXPORT, "--model", a.whisper_model, "--word_timestamps", "True",
                        "--output_format", "json", "--output_dir", BUILD], check=True)
        produced = os.path.join(BUILD, STEM + ".json")
        if produced != GM_WORDS and os.path.exists(produced):
            os.replace(produced, GM_WORDS)
    if not os.path.exists(GM_WAV):
        print("extracting mono audio for silencedetect …", flush=True)
        subprocess.run(["ffmpeg", "-y", "-hide_banner", "-loglevel", "error", "-i", EXPORT,
                        "-map", "0:a", "-ac", "1", GM_WAV], check=True)

    words = load_words(GM_WORDS)
    sils = detect_silences(GM_WAV, a.noise, a.silence_d)
    retakes = detect_retakes(words, sils, a.max_span)
    excuses = detect_excuse_me(words, sils)

    # (A) --keep-laughter: find loud, word-less reaction beats to PROTECT (opt-in; [] when off,
    # so the removes list below is byte-identical to today's). Padded so we don't shave the edges.
    reactions, floor_db = [], None
    if a.keep_laughter:
        energy = frame_energy(GM_WAV)
        floor_db = measure_noise_floor(GM_WAV, energy, sils)
        for rs, re_, pk in detect_reactions(energy, words, floor_db, a.laugh_margin, a.laugh_min):
            reactions.append((max(0.0, rs - a.laugh_pad), min(total, re_ + a.laugh_pad), pk))

    removes = []
    if a.front_trim > 0: removes.append((0.0, a.front_trim))
    removes += parse_spans(a.slates, slate=True) + parse_spans(a.manual_cuts)
    removes += [(s, e) for s, e, *_ in retakes] + excuses
    sil_cuts = 0
    sil_removes = []
    for s, e in sils:
        if e - s > MAX_PAUSE: sil_removes.append((s + PAD, e - PAD)); sil_cuts += 1
    if reactions:
        # Carve protected reactions out of the DEAD-AIR removals ONLY — never out of an explicit
        # front-trim / slate / manual-cut, nor a retake/excuse the detector cut on purpose (a loud
        # word-less burst inside one of those must STAY cut, not get resurrected back into the take).
        sil_removes = _subtract_spans(sil_removes, [(rs, re_) for rs, re_, _ in reactions])
    removes += sil_removes
    keeps, merged = complement(removes, total)

    # (B) --clamp-gap: pacing normalization on what SURVIVED — feed the extra trims back through
    # complement() so the audio/video lock stays exact (opt-in; [] when off → keeps unchanged).
    clamped = []
    if a.clamp_gap > 0:
        # Don't let pacing-clamp shave a protected reaction: drop reaction regions from the silence
        # list it evens out (it still tightens the dead air right up to / after the reaction).
        clamp_sils = _subtract_spans(sils, [(rs, re_) for rs, re_, _ in reactions]) if reactions else sils
        extra, clamped = clamp_retained_gaps(keeps, clamp_sils, a.clamp_gap)
        if extra:
            keeps, merged = complement(removes + extra, total)
    kept = sum(e - s for s, e in keeps)

    # ---- review file (+ keeps.json for --dry / downstream) ----
    with open(f"{BUILD}/review.md", "w", encoding="utf-8") as f:
        f.write(f"# {OUT_TIMELINE} review — {fmt(kept)} kept of {fmt(total)} raw\n\n")
        extra_summary = ""  # only when an opt-in feature fired → off-by-default lines stay byte-identical
        if reactions: extra_summary += f" · {len(reactions)} reaction beats protected"
        if clamped: extra_summary += f" · {len(clamped)} gaps clamped to {a.clamp_gap:g}s"
        f.write(f"{len(keeps)} segments · {len(retakes)} retakes cut · {len(excuses)} 'excuse me' cuts · "
                f"{sil_cuts} dead-air gaps compressed{extra_summary}\n\n## Retakes removed (abandoned → kept)\n")
        for cs, ce, ab, rt in retakes:
            f.write(f"- **{fmt(cs)}–{fmt(ce)}** ({ce-cs:.1f}s)  ❌ “{ab[:80]}”  →  ✅ “{rt[:60]}…”\n")
        f.write("\n## Dead-air gaps compressed (>2s)\n")
        for s, e in sils:
            if e - s > 2.0: f.write(f"- {fmt(s)}  {e-s:.1f}s of silence\n")
        if reactions:  # (A) --keep-laughter audit — every protected non-speech beat
            f.write(f"\n## Reaction beats protected (--keep-laughter, floor {floor_db:.1f}dB + "
                    f"{a.laugh_margin:g}dB, ≥{a.laugh_min:g}s)\n")
            for rs, re_, pk in reactions:
                f.write(f"- **{fmt(rs)}–{fmt(re_)}** ({re_-rs:.1f}s)  🔊 peak {pk:.1f}dB, no words — kept\n")
        if clamped:  # (B) --clamp-gap audit — every retained gap that got normalized
            f.write(f"\n## Retained gaps clamped (--clamp-gap {a.clamp_gap:g}s)\n")
            for gs, ge, lim in clamped:
                f.write(f"- {fmt(gs)}  {ge-gs:.1f}s gap → {lim:g}s\n")
    payload = {"export": EXPORT, "fps": FPS, "total": total, "kept": kept,
               "keeps": [[s, e] for s, e in keeps], "removes": [[s, e] for s, e in merged],
               "retakes": [[cs, ce, ab, rt] for cs, ce, ab, rt in retakes], "excuses": [[s, e] for s, e in excuses]}
    if reactions: payload["reactions"] = [[rs, re_, pk] for rs, re_, pk in reactions]  # opt-in keys only
    if clamped: payload["clamped_gaps"] = [[gs, ge, lim] for gs, ge, lim in clamped]
    json.dump(payload, open(f"{BUILD}/keeps.json", "w"), indent=2)

    print(f"export {fmt(total)} → cut {fmt(kept)}  ·  {len(keeps)} segs · {len(retakes)} retakes · "
          f"{len(excuses)} excuse-me · {sil_cuts} gaps  ·  {FPS}fps", flush=True)
    print(f"   review: {BUILD}/review.md   keeps: {BUILD}/keeps.json", flush=True)
    if a.dry:
        return
    build_in_resolve(keeps, total, FPS)


def build_in_resolve(keeps, total, FPS):
    os.environ.setdefault("RESOLVE_SCRIPT_API",
        "/Library/Application Support/Blackmagic Design/DaVinci Resolve/Developer/Scripting")
    os.environ.setdefault("RESOLVE_SCRIPT_LIB",
        "/Applications/DaVinci Resolve/DaVinci Resolve.app/Contents/Libraries/Fusion/fusionscript.so")
    sys.path.insert(0, os.path.join(os.environ["RESOLVE_SCRIPT_API"], "Modules"))
    import DaVinciResolveScript as bmd
    r = bmd.scriptapp("Resolve")
    proj = r.GetProjectManager().GetCurrentProject()
    if not proj:
        sys.exit("cut-single: no current Resolve project (open Resolve first, or use --dry)")
    mp = proj.GetMediaPool()

    clips = {c.GetName(): c for c in (mp.GetRootFolder().GetClipList() or [])}
    exp = clips.get(os.path.basename(EXPORT))
    if not exp:
        for it in mp.ImportMedia([EXPORT]) or []: exp = it
    if not exp:
        sys.exit(f"cut-single: could not import export '{EXPORT}'")
    exp_frames = int(exp.GetClipProperty("Frames") or round(total * FPS))
    fps_s = str(int(FPS)) if float(FPS).is_integer() else str(FPS)

    all_infos = []
    for s, e in keeps:
        sf = int(round(s * FPS))
        ef = min(int(round(e * FPS)) - 1, exp_frames - 1)   # inclusive last source frame, clamped in-range
        if ef - sf >= 2:                                     # ≥3 frames (drops sub-~125ms slivers)
            all_infos.append({"mediaPoolItem": exp, "startFrame": sf, "endFrame": ef})

    for i in range(proj.GetTimelineCount(), 0, -1):
        t = proj.GetTimelineByIndex(i)
        if t.GetName() in (OUT_TIMELINE, "_audtest", "_audtest2"): mp.DeleteTimelines([t])
    proj.SetSetting("timelineFrameRate", fps_s); proj.SetSetting("timelinePlaybackFrameRate", fps_s)
    nt = mp.CreateEmptyTimeline(OUT_TIMELINE); proj.SetCurrentTimeline(nt)
    mp.AppendToTimeline([{**ci, "mediaType": 1} for ci in all_infos])
    vitems = nt.GetItemListInTrack("video", 1) or []
    base = nt.GetStartFrame()
    segs = [(it.GetSourceStartFrame() / FPS, (it.GetEnd() - it.GetStart()) / FPS) for it in vitems]
    aud_wav = os.path.abspath(f"{BUILD}/{SLUG}-cut-audio.wav")
    parts = [f"[0:a]atrim=start={s:.6f}:duration={d:.6f},asetpts=PTS-STARTPTS[a{k}]"
             for k, (s, d) in enumerate(segs)]
    graph = ";".join(parts) + ";" + "".join(f"[a{k}]" for k in range(len(segs))) + \
        f"concat=n={len(segs)}:v=0:a=1[out]"
    print(f"rendering cut audio ({len(segs)} segs) …", flush=True)
    subprocess.run(["ffmpeg", "-y", "-hide_banner", "-loglevel", "error", "-i", EXPORT,
                    "-filter_complex", graph, "-map", "[out]", "-c:a", "pcm_s24le", "-ar", "48000", aud_wav], check=True)
    dur = float(subprocess.run(["ffprobe", "-v", "error", "-show_entries", "format=duration",
                                "-of", "default=nw=1:nk=1", aud_wav], capture_output=True, text=True).stdout.strip() or 0)
    vid_frames = vitems[-1].GetEnd() - base
    awav = mp.ImportMedia([aud_wav]); awav = awav[0] if awav else None
    if awav:
        mp.AppendToTimeline([{"mediaPoolItem": awav, "startFrame": 0,
                              "endFrame": min(int(round(dur * FPS)), vid_frames) - 1,
                              "trackIndex": 1, "recordFrame": base, "mediaType": 2}])
    try: nt.SetVoiceIsolationState(1, {"isEnabled": True, "amount": 50})
    except Exception: pass
    r.OpenPage("edit")
    print(f"\n✅ '{OUT_TIMELINE}': {len(vitems)} clips · audio {fmt(dur)} = video {fmt(vid_frames/FPS)}")


if __name__ == "__main__":
    main()
