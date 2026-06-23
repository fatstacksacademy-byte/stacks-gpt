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

function main() {
  const edlPath = arg('edl');
  const outDir = arg('out');
  const wi = process.argv.indexOf('--words');
  const wordsPath = wi >= 0 ? process.argv[wi + 1] : null;
  const ti = process.argv.indexOf('--transcript');
  const trPath = ti >= 0 ? process.argv[ti + 1] : null;
  if (!wordsPath && !trPath) throw new Error('need --transcript <md> or --words <clean-words.json>');
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

  // Retention layer: captions (emphasis-only by default; --captions full for subtitles)
  // + gold number callouts from the words.
  const cmi = process.argv.indexOf('--captions');
  const captionMode = cmi >= 0 && process.argv[cmi + 1] === 'full' ? 'full' : 'emphasis';
  const captions = buildCaptions(words, captionMode);
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

  fs.writeFileSync(
    path.join(outDir, 'plan.json'),
    JSON.stringify(
      { meta: { edl: edlPath, transcript: wordsPath ?? trPath, duration, beats: plan.length, captions: captions.length, callouts: callouts.length, sections: sections.length }, beats: plan, sections, captions, callouts },
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
  if (warn.length) {
    console.log('  ⚠ plan audit:');
    warn.forEach((w) => console.log(`    - ${w}`));
  }
}

main();
