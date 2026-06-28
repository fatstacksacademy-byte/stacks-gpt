/**
 * build-plan — the brain of the virtual editor.
 *
 * Reads a VIDEO-EDL-*.md and the Descript transcript, aligns every beat's
 * anchor phrase to a timecode (two-pass: section centers, then locality-biased
 * per-beat matching to disambiguate duplicate anchors), resolves the b-roll /
 * card-art file for each beat, and emits:
 *   - plan.json   : machine-readable timeline the Resolve script consumes
 *   - review.md   : a human-checkable table (flags low-confidence / collisions)
 *
 * Usage:
 *   tsx scripts/video-editor/build-plan.ts \
 *       --edl VIDEO-EDL-best-cards-june-2026.md \
 *       --transcript scripts/video-editor/data/best-cards-june-2026.transcript.md \
 *       --out scripts/video-editor/build/best-cards-june-2026
 *
 * Optional per-format STYLE (opt-in, default = today's behavior):
 *       --style hysa-defection        (loads styles/<name>.json — see styles/README.md)
 *   A style is a "philosophy" layer ABOVE the global brand kit: it BIASES which way
 *   the plan leans (zoom cadence, emphasis-caption density) and records the rest of the
 *   look (favored gfx, music mood, tint) into plan.meta.style for the renderers to read.
 *   It renders nothing and never rewrites the planner. With NO --style, output is
 *   byte-identical to before.
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import { parseEDL, type Beat } from './lib/edl';
import { parseTranscript, Aligner } from './lib/transcript';
import { buildCaptions, detectCallouts, markChips, toSRT } from './lib/captions';

const HOME = process.env.HOME!;

// ── Media manifest: logical sources → real files on disk ────────────────────
// Card art lives in the repo; screen b-roll lives on the Desktop / in Movies.
const CARD_ART_DIR = 'public/card-art';
const CARD_ART: Record<number, string> = {
  3: 'chase-sapphire-preferred.png', // EDL card numbers (pre-reorder)
  1: 'chase-ink-business-cash.png',
  2: 'chase-ink-business-unlimited.png',
  4: 'bofa-customized-cash-rewards.png',
  5: 'usbank-cash-plus.png',
  6: 'usaa-eagle-adapt.png',
};
// b-roll keyword → file. First keyword found in the EDL b-roll text wins.
const BROLL: Array<{ kw: RegExp; file: string }> = [
  { kw: /ink|chase ink|sole-prop|application/i, file: `${HOME}/Desktop/chaseinkcashandunlimited.mp4` },
  { kw: /sapphire|csp/i, file: `${HOME}/Desktop/sapphirepreferred.mp4` },
  { kw: /u\.?s\.?\s*bank|cash\+|enrollment/i, file: `${HOME}/Desktop/usbankcashplus.mp4` },
  { kw: /bofa|bank of america|customized|category chooser/i, file: `${HOME}/Movies/customized cash rewards bank of america.mp4` },
  { kw: /usaa|eagle/i, file: `${HOME}/Movies/usaa eagle adapt.mp4` },
  { kw: /stacks os|sequencer|5\/24|tracker/i, file: `${HOME}/Movies/stacks os tracker.mp4` },
  { kw: /state|regional/i, file: `${HOME}/Movies/card state selector.mp4` },
  { kw: /calculator|profitab/i, file: `${HOME}/Movies/profitability calculator.mp4` },
];

const TITLE_SECS = 2.5; // title-card hold
const MIN_OVERLAY = 4.0; // minimum overlay dwell
const MAX_OVERLAY = 7.0;

interface PlanBeat {
  order: number;
  t: number;
  end: number;
  section: string;
  cardNumber: number | null;
  beat: string;
  layout: string;
  anchor: string | null;
  match: { score: number; text: string };
  broll: { hint: string | null; file: string | null };
  cardArt: string | null;
  overlays: { lines: string[] }[];
  fx: string[];
  flags: string[];
}

function arg(name: string, def?: string): string {
  const i = process.argv.indexOf(`--${name}`);
  if (i >= 0 && i + 1 < process.argv.length) return process.argv[i + 1];
  if (def !== undefined) return def;
  throw new Error(`missing --${name}`);
}

function resolveBroll(beat: Beat): string | null {
  if (!beat.broll) return null;
  for (const { kw, file } of BROLL) if (kw.test(beat.broll) || kw.test(beat.section)) return fs.existsSync(file) ? file : null;
  return null;
}

// ── Per-format style philosophy (opt-in via --style) ────────────────────────
// A style sits ABOVE the global brand kit (lib/brand.json never changes): it biases
// HOW this *kind* of video leans (pacing/zoom/SFX/captions/gfx/tint/music) so every
// new video of a type inherits the same look. See styles/README.md for the schema.
//
// We bias only two axes here (the ones that live in this planner) and RECORD the rest
// into plan.meta.style for the downstream renderers to honor — build-plan does NOT
// render, so it can't (and shouldn't) act on tint/music/sfx/gfx itself.

interface Style {
  name: string;
  pacing?: string;
  zoom_frequency?: string; // off | low | normal | high
  sfx_intensity?: string; // off | subtle | normal | punchy
  emphasis_density?: string; // off | sparse | normal | dense
  favored_gfx?: string[];
  tint_default?: string;
  music_mood?: string;
}

// zoom_frequency → minimum seconds between KEPT `zoom` beats (Infinity = drop all;
// 0 = keep every EDL zoom = today's behavior). Mirrors the README "reveals ≥18s apart"
// rule: `low` is stricter, `high` lets the EDL decide.
const ZOOM_MIN_GAP: Record<string, number> = { off: Infinity, low: 24, normal: 12, high: 0 };
// emphasis_density → keep-fraction of the (sparse) emphasis caption track. 1 = keep all
// = today's behavior; `sparse` keeps every other one; `off` drops the burn track entirely.
// (captions.srt — the CC / MagicSubtitle source — is ALWAYS full; this only thins the burn.)
const EMPHASIS_KEEP: Record<string, number> = { off: 0, sparse: 0.5, normal: 1, dense: 1 };

const STYLE_ENUMS: Record<string, Record<string, true>> = {
  zoom_frequency: { off: true, low: true, normal: true, high: true },
  sfx_intensity: { off: true, subtle: true, normal: true, punchy: true },
  emphasis_density: { off: true, sparse: true, normal: true, dense: true },
  pacing: { deliberate: true, measured: true, energetic: true, rapid: true },
};

/** Thin loader + validator. Throws a clean, actionable error on a bad name/shape so a
 *  typo in --style fails fast instead of silently emitting an un-biased plan. */
function loadStyle(name: string): Style {
  const dir = path.join(__dirname, 'styles');
  const file = path.join(dir, `${name}.json`);
  if (!fs.existsSync(file)) {
    let avail = '';
    try {
      avail = fs.readdirSync(dir).filter((f) => f.endsWith('.json')).map((f) => f.replace(/\.json$/, '')).join(', ');
    } catch {
      /* dir may not exist in a stripped checkout */
    }
    throw new Error(`unknown --style "${name}" (no styles/${name}.json)${avail ? ` — available: ${avail}` : ''}`);
  }
  let raw: any;
  try {
    raw = JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch (e) {
    throw new Error(`--style "${name}": styles/${name}.json is not valid JSON (${(e as Error).message})`);
  }
  if (!raw || typeof raw !== 'object') throw new Error(`--style "${name}": styles/${name}.json must be a JSON object`);
  if (typeof raw.name !== 'string' || !raw.name) throw new Error(`--style "${name}": missing required string field "name"`);
  // Validate the enum axes (a wrong value would silently no-op a bias → fail loudly).
  for (const [field, allowed] of Object.entries(STYLE_ENUMS)) {
    const v = raw[field];
    if (v !== undefined && !(typeof v === 'string' && allowed[v]))
      throw new Error(`--style "${name}": "${field}" must be one of ${Object.keys(allowed).join(' | ')} (got ${JSON.stringify(v)})`);
  }
  if (raw.favored_gfx !== undefined && !(Array.isArray(raw.favored_gfx) && raw.favored_gfx.every((g: any) => typeof g === 'string')))
    throw new Error(`--style "${name}": "favored_gfx" must be an array of template names`);
  return raw as Style;
}

function main() {
  const edlPath = arg('edl');
  const outDir = arg('out');
  const wi = process.argv.indexOf('--words');
  const wordsPath = wi >= 0 ? process.argv[wi + 1] : null;
  const ti = process.argv.indexOf('--transcript');
  const trPath = ti >= 0 ? process.argv[ti + 1] : null;
  if (!wordsPath && !trPath) throw new Error('need --transcript <md> or --words <clean-words.json>');
  // Opt-in style philosophy. Absent → null → every bias below is a no-op (today's path).
  const si = process.argv.indexOf('--style');
  const style: Style | null = si >= 0 && process.argv[si + 1] ? loadStyle(process.argv[si + 1]) : null;
  fs.mkdirSync(outDir, { recursive: true });

  const beats = parseEDL(fs.readFileSync(edlPath, 'utf8'));
  // Prefer exact per-word timestamps (clean-words.json) over paragraph interpolation.
  const wnorm = (s: string) => s.toLowerCase().replace(/[''`]/g, '').replace(/[^a-z0-9$%]+/g, ' ').trim();
  let words;
  if (wordsPath) {
    const cw = JSON.parse(fs.readFileSync(wordsPath, 'utf8')) as { word: string; start: number; end: number }[];
    words = cw.map((w) => ({ text: wnorm(w.word), raw: w.word, t: w.start })).filter((w) => w.text);
  } else {
    words = parseTranscript(fs.readFileSync(trPath!, 'utf8')).words;
  }
  const aligner = new Aligner(words);
  const duration = words.at(-1)?.t ?? 0;

  // Pass 1 — unbiased match per beat → section center times.
  const raw = beats.map((b) => ({ b, a: b.anchor ? aligner.align(b.anchor) : null }));
  const centers = new Map<string, number>();
  for (const sec of new Set(beats.map((b) => b.section))) {
    const hits = raw.filter((r) => r.b.section === sec && r.a && r.a.score >= 0.55).map((r) => r.a!.timeSec).sort((x, y) => x - y);
    if (hits.length) centers.set(sec, hits[Math.floor(hits.length / 2)]); // median
  }

  // Pass 2 — re-align with locality bias toward the section center.
  const aligned = beats.map((b) => {
    if (!b.anchor) return { b, a: null as ReturnType<Aligner['align']> | null };
    const nearSec = centers.get(b.section);
    const a = aligner.align(b.anchor, nearSec !== undefined ? { nearSec } : {});
    return { b, a };
  });

  // Sort by time; beats without an anchor inherit the previous beat's time + tiny epsilon.
  let lastT = 0;
  const timed = aligned.map((x, i) => {
    const t = x.a ? x.a.timeSec : lastT + 0.01;
    lastT = t;
    return { ...x, t, idx: i };
  });
  timed.sort((p, q) => p.t - q.t || p.idx - q.idx);

  // Assign end times (next beat start) and build plan beats.
  const plan: PlanBeat[] = timed.map((x, i) => {
    const next = timed[i + 1];
    const end = next ? next.t : duration;
    const flags: string[] = [];
    if (x.a && x.a.score < 0.45) flags.push('LOW_CONFIDENCE');
    if (!x.b.anchor) flags.push('NO_ANCHOR');
    return {
      order: i,
      t: +x.t.toFixed(2),
      end: +end.toFixed(2),
      section: x.b.section,
      cardNumber: x.b.cardNumber,
      beat: x.b.beat,
      layout: x.b.layout,
      anchor: x.b.anchor,
      match: { score: x.a?.score ?? 0, text: x.a?.matchedText ?? '' },
      broll: { hint: x.b.broll, file: resolveBroll(x.b) },
      cardArt: x.b.cardNumber && CARD_ART[x.b.cardNumber] ? `${CARD_ART_DIR}/${CARD_ART[x.b.cardNumber]}` : null,
      overlays: x.b.overlays,
      fx: x.b.fx ?? [],
      flags,
    };
  });

  // Collision flag: two beats from different sections within 2.5s.
  for (let i = 1; i < plan.length; i++) {
    if (plan[i].t - plan[i - 1].t < 2.5 && plan[i].section !== plan[i - 1].section) {
      plan[i].flags.push('COLLISION?');
      plan[i - 1].flags.push('COLLISION?');
    }
  }

  // ── STYLE BIAS 1 — zoom cadence ────────────────────────────────────────────
  // A "deliberate / documentary" style wants fewer punch-ins; a "punchy" style keeps
  // them all. We thin the EDL's per-beat `zoom` FX token by a min-gap from the style
  // (Infinity = drop every zoom). We only touch `zoom`; all other FX tokens pass through.
  // No style → zoomGap 0 → every zoom kept → byte-identical fx arrays.
  const zoomGap = style?.zoom_frequency ? (ZOOM_MIN_GAP[style.zoom_frequency] ?? 0) : 0;
  let zoomsDropped = 0;
  if (zoomGap > 0) {
    let lastZoomT: number | null = null;
    for (const p of plan) {
      if (!p.fx.includes('zoom')) continue;
      // Keep this zoom only if it's the first kept one AND we aren't dropping all
      // (Infinity = `off`), and it clears the min-gap from the last kept zoom.
      if (zoomGap !== Infinity && (lastZoomT === null || p.t - lastZoomT >= zoomGap)) {
        lastZoomT = p.t;
      } else {
        p.fx = p.fx.filter((f) => f !== 'zoom');
        zoomsDropped++;
      }
    }
  }

  // Retention layer: captions (emphasis-only by default; --captions full for subtitles)
  // + gold number callouts from the words.
  const cmi = process.argv.indexOf('--captions');
  const captionMode = cmi >= 0 && process.argv[cmi + 1] === 'full' ? 'full' : 'emphasis';
  let captions = buildCaptions(words, captionMode);

  // ── STYLE BIAS 2 — emphasis-caption density ────────────────────────────────
  // Thin the SPARSE on-screen burn track (emphasis mode only) toward the style's
  // density: keep a fraction of the lines (every Nth), evenly. `off` clears them,
  // `dense`/`normal` keep all. This NEVER touches captions.srt (the CC / MagicSubtitle
  // source is written full below, regardless). No style or --captions full → untouched.
  const keepFrac = style?.emphasis_density ? (EMPHASIS_KEEP[style.emphasis_density] ?? 1) : 1;
  const emphasisDropped = (() => {
    if (captionMode !== 'emphasis' || keepFrac >= 1) return 0;
    const before = captions.length;
    if (keepFrac <= 0) captions = [];
    else {
      const step = Math.round(1 / keepFrac); // 0.5 → every 2nd, 0.33 → every 3rd
      captions = captions.filter((_, i) => i % step === 0);
    }
    return before - captions.length;
  })();

  const callouts = detectCallouts(words);
  markChips(callouts); // gold chip reserved for the headline bonus, ≤1 per 10s
  // captions.srt = YouTube-CC / MagicSubtitle source → ALWAYS full, regardless of the
  // on-screen burn mode (which may be sparse emphasis).
  fs.writeFileSync(path.join(outDir, 'captions.srt'), toSRT(buildCaptions(words, 'full')));

  // Sections live in the plan (text layer) — drives section whooshes + chapter markers.
  const sections: { t: number; name: string }[] = [];
  const seenSec = new Set<string>();
  for (const p of plan)
    if (!seenSec.has(p.section)) { seenSec.add(p.section); sections.push({ t: p.t, name: p.section }); }

  // Light plan audit (text-layer verifier) — warnings only, no render needed.
  const warn: string[] = [];
  for (let i = 1; i < callouts.length; i++)
    if (callouts[i].t - callouts[i - 1].t < 1.2) warn.push(`callout chips stack @ ${callouts[i].t}s (${callouts[i - 1].value}/${callouts[i].value})`);
  const revs = callouts.filter((c) => c.importance === 'reveal');
  for (let i = 1; i < revs.length; i++)
    if (revs[i].t - revs[i - 1].t < 6) warn.push(`reveals <6s apart @ ${revs[i].t}s — risers/zooms may stack`);

  // Record the chosen style + its resolved biases so the renderers can honor the rest
  // of the look (favored gfx, music mood, tint, sfx, pacing) without re-loading the file.
  // Omitted entirely when no --style → meta is byte-identical to before.
  const styleMeta = style
    ? {
        style: {
          name: style.name,
          pacing: style.pacing ?? null,
          zoom_frequency: style.zoom_frequency ?? null,
          sfx_intensity: style.sfx_intensity ?? null,
          emphasis_density: style.emphasis_density ?? null,
          favored_gfx: style.favored_gfx ?? [],
          tint_default: style.tint_default ?? null,
          music_mood: style.music_mood ?? null,
          applied: { zoom_min_gap_s: zoomGap, zooms_dropped: zoomsDropped, emphasis_keep_frac: keepFrac, emphasis_dropped: emphasisDropped },
        },
      }
    : {};

  fs.writeFileSync(
    path.join(outDir, 'plan.json'),
    JSON.stringify(
      { meta: { edl: edlPath, transcript: wordsPath ?? trPath, duration, beats: plan.length, captions: captions.length, callouts: callouts.length, sections: sections.length, ...styleMeta }, beats: plan, sections, captions, callouts },
      null,
      2
    )
  );

  // Human review table.
  const fmt = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
  const rows = plan.map(
    (p) =>
      `| ${fmt(p.t)} | ${p.layout} | ${p.beat} | ${(p.match.score * 100).toFixed(0)}% | ${p.broll.file ? '✅' : p.broll.hint ? '⚠️ unmapped' : '—'} | ${p.cardArt ? '✅' : '—'} | ${p.flags.join(' ') || ''} |`
  );
  const md = [
    `# Edit plan — ${path.basename(edlPath)}`,
    ``,
    `${plan.length} beats · video ~${fmt(duration)} · flags = needs your eyes`,
    ``,
    `| Time | Layout | Beat | Match | B-roll | Card | Flags |`,
    `|---|---|---|---|---|---|---|`,
    ...rows,
  ].join('\n');
  fs.writeFileSync(path.join(outDir, 'review.md'), md);

  const low = plan.filter((p) => p.flags.length).length;
  console.log(`✓ wrote plan.json (${plan.length} beats) + review.md → ${outDir}`);
  console.log(`  ${plan.length - low} clean, ${low} flagged for review`);
  console.log(`  + ${captions.length} caption lines (captions.srt) · ${callouts.length} gold callouts`);
  if (style)
    console.log(
      `  ◇ style "${style.name}" → zoom ${style.zoom_frequency ?? '—'} (dropped ${zoomsDropped}), ` +
        `emphasis ${style.emphasis_density ?? '—'} (dropped ${emphasisDropped}); ` +
        `recorded music=${style.music_mood ?? '—'} tint=${style.tint_default ?? '—'} gfx=[${(style.favored_gfx ?? []).join(',')}]`
    );
  if (warn.length) {
    console.log('  ⚠ plan audit:');
    warn.forEach((w) => console.log(`    - ${w}`));
  }
}

main();
