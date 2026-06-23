#!/usr/bin/env tsx
/**
 * article-index — option-C hybrid auto-tagger (Nathaniel approves before anything is placed).
 *
 * Scans the transcript for moments where he references a CHANGE ("the 10% anniversary boost
 * is going away", "Chase bumped this to its highest ever", "the hotel credit doubled to $100")
 * and there is NO b-roll covering that moment. For each, it proposes an article-insert tag:
 * the claim sentence, the card it's about, a Doctor-of-Credit / Points-Guy search query, and
 * empty source/url/roi fields. NOTHING is placed until you flip status → "approved" and an
 * agent (or you) fills url + roi. The page-focus.py device then renders the insert.
 *
 *   tsx scripts/video-editor/article-index.ts <whisper.json> [plan.json] [--out article-tags.json]
 *
 * Flow:
 *   1) run this → article-tags.json (status: "proposed" | "covered")
 *   2) REVIEW the file: flip the ones you want to "approved" (delete/leave the rest)
 *   3) agent step: for each approved tag, WebSearch the `query` on doctorofcredit.com /
 *      thepointsguy.com, pick the URL, screenshot it
 *         tsx scripts/video-editor/fetch-screenshots.ts --urls "boost=<url>" --out shots/articles
 *      then set source/url/screenshot + roi ("auto:fx,fy,fw,fh") from the passage on the page
 *   4) render: page-focus.py --image <screenshot> --roi <roi> --source "<source>" --face <face> ...
 */
import * as fs from 'node:fs';
import { creditCardBonuses } from '../../lib/data/creditCardBonuses';

const args = process.argv.slice(2);
const flag = (n: string, d?: string) => {
  const i = args.indexOf(`--${n}`);
  return i >= 0 && args[i + 1] ? args[i + 1] : d;
};
const VALUE_FLAGS = new Set(['--out']); // only these consume the following token as their value
const positional = args.filter((a, i) => !a.startsWith('--') && !(i > 0 && VALUE_FLAGS.has(args[i - 1])));
const whisperPath = positional[0];
const planPath = positional[1];
const outPath = flag('out', whisperPath ? whisperPath.replace(/\.json$/, '') + '.article-tags.json' : 'article-tags.json')!;
if (!whisperPath) {
  console.error('usage: tsx article-index.ts <whisper.json> [plan.json] [--out tags.json]');
  process.exit(1);
}

// --- word stream from a whisper json ---
const j = JSON.parse(fs.readFileSync(whisperPath, 'utf8'));
type W = { raw: string; t: number; end: number };
const words: W[] = [];
for (const s of j.segments ?? [])
  for (const w of s.words ?? []) {
    const raw = (w.word ?? '').trim();
    if (raw) words.push({ raw, t: w.start, end: w.end ?? w.start });
  }
if (!words.length) {
  console.error('No word timestamps in whisper json (need segments[].words[]).');
  process.exit(1);
}

// --- group words into sentences (break on . ! ?) ---
type Sentence = { t: number; end: number; text: string };
const sentences: Sentence[] = [];
let cur: W[] = [];
for (const w of words) {
  cur.push(w);
  if (/[.!?]$/.test(w.raw) && cur.length >= 3) {
    sentences.push({ t: cur[0].t, end: w.end, text: cur.map((x) => x.raw).join(' ') });
    cur = [];
  }
}
if (cur.length) sentences.push({ t: cur[0].t, end: cur.at(-1)!.end, text: cur.map((x) => x.raw).join(' ') });

// --- change-reference detector: a verb/phrase that signals an offer/benefit CHANGED ---
const CHANGE = [
  { re: /\b(going away|goes away|disappear\w*|expir\w*|ending|ends?\b|no longer|discontinu\w*|killed|dead|gone|sunset\w*|retir\w*)\b/i, kind: 'removed' },
  { re: /\b(bumped|raised|increased|boost\w*|jumped|climbed|hiked|up to|elevated|all[- ]?time|highest ever|best ever|record)\b/i, kind: 'increased' },
  { re: /\b(doubled|tripled|quadrupled)\b/i, kind: 'multiplied' },
  { re: /\b(overhaul\w*|revamp\w*|refresh\w*|redesign\w*|new(ly)? (added|launched|live)|brand[- ]?new|just (added|launched|changed|dropped)|added a)\b/i, kind: 'refreshed' },
  { re: /\b(lowered|reduced|cut|slashed|dropped to|devalu\w*|nerf\w*|worse)\b/i, kind: 'reduced' },
  { re: /\b(used to|previously|in the past|before (it|they)|now (it|they|offers))\b/i, kind: 'changed' },
];

// --- card detection (so the query + attribution name the right card). Generic card
//     words ("global", "one", "more", "travel", "business"…) cause false matches, so we
//     require either an EXACT card-name substring or ≥2 DISTINCTIVE-token hits. ---
const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9 ]+/g, ' ').replace(/\s+/g, ' ').trim();
const GENERIC = new Set(
  ('the card credit business rewards cash bank banco visa mastercard amex express a of and plus one more travel '
    + 'premier preferred signature world elite platinum gold global union free spirit points miles back account '
    + 'checking savings personal secured student everyday custom customized smart flex freedom double active national')
    .split(' ')
);
const cardTokens = creditCardBonuses
  .filter((c) => c.card_name)
  .map((c) => {
    const toks = norm(c.card_name).split(' ').filter(Boolean);
    // dedupe: a name that repeats a word ("…First…First…") must not let one transcript
    // occurrence count twice and clear the ≥2 gate.
    const distinctive = [...new Set(toks.filter((t) => t.length >= 4 && !GENERIC.has(t)))];
    return { id: c.id, name: c.card_name, full: norm(c.card_name), distinctive };
  });
function detectCard(text: string): { name: string; id: string } | null {
  const t = ' ' + norm(text) + ' ';
  let best: { name: string; id: string; score: number } | null = null;
  for (const c of cardTokens) {
    const exact = c.full.length >= 5 && t.includes(' ' + c.full + ' '); // recovers short names (Amazon, Disney…)
    const hits = c.distinctive.filter((tok) => t.includes(' ' + tok + ' ')).length;
    const score = exact ? 99 : hits;
    if ((exact || hits >= 2) && (!best || score > best.score)) best = { name: c.name, id: c.id, score };
  }
  return best ? { name: best.name, id: best.id } : null;
}

// --- coverage: a moment is "covered" if a plan section opens within ±10s (a section opener
//     normally brings its own b-roll). Uncovered change-claims are the article candidates. ---
const sections: number[] = (() => {
  if (!planPath || !fs.existsSync(planPath)) return [];
  try {
    const p = JSON.parse(fs.readFileSync(planPath, 'utf8'));
    return (p.sections ?? []).map((s: any) => s.t).filter((t: any) => typeof t === 'number');
  } catch {
    return [];
  }
})();
const covered = (t: number) => sections.some((s) => Math.abs(s - t) <= 10);

// keep query terms tight: card name + nearby dollar/percent figures. Whisper splits numbers
// ("100,000"→"100 ,000", "10%"→"10 %"), so collapse spaces around , and % first.
function buildQuery(card: string | null, text: string): string {
  const t = text.replace(/(\d)\s+([,.])/g, '$1$2').replace(/\s+%/g, '%');
  const figs = (t.match(/\$\s?[\d,]+(?:\.\d+)?|\b\d{2,3},?\d{3}\s?(?:points|miles)|\b\d{1,3}%/gi) ?? [])
    .map((s) => s.replace(/\s+/g, ' ').trim()).slice(0, 2);
  const base = card ?? (t.match(/\b(chase|amex|american express|capital one|citi|bofa|bank of america|us bank|wells fargo|sapphire|venture|ink)\b/i)?.[0] ?? '');
  return [base, ...figs, '2026'].filter(Boolean).join(' ').replace(/\s+/g, ' ').trim();
}

const tags: any[] = [];
const seen = new Set<string>();
for (const s of sentences) {
  const hit = CHANGE.find((c) => c.re.test(s.text));
  if (!hit) continue;
  const tkey = s.t.toFixed(1); // finer than whole-second so adjacent terse claims aren't dropped
  if (seen.has(tkey)) continue;
  seen.add(tkey);
  const card = detectCard(s.text);
  const isCovered = covered(s.t);
  tags.push({
    t: +s.t.toFixed(2),
    dur: 4.0,
    card: card?.name ?? '',
    cardId: card?.id ?? '',
    trigger: hit.kind,
    claim: s.text.trim().slice(0, 220),
    covered: isCovered,
    query: buildQuery(card?.name ?? null, s.text),
    source: '',
    url: '',
    screenshot: '',
    roi: '', // agent fills: "auto:fx,fy,fw,fh" (fractions of the screenshot)
    status: isCovered ? 'covered' : 'proposed',
  });
}

fs.writeFileSync(outPath, JSON.stringify({ generatedFrom: whisperPath, tags }, null, 2));
const proposed = tags.filter((t) => t.status === 'proposed');
console.log(`change-claims=${tags.length}  proposed(no b-roll)=${proposed.length}  covered=${tags.length - proposed.length}`);
console.log(`→ ${outPath}\n`);
for (const t of proposed) console.log(`  ${t.t.toFixed(1)}s  [${t.trigger}]  ${t.card || '(no card)'}\n      “${t.claim}”\n      query: ${t.query}`);
console.log(`\nNext: review ${outPath}, flip the ones you want to "approved", then run the agent step (WebSearch DoC/TPG → fetch-screenshots → set url+roi) and render with page-focus.py.`);
