#!/usr/bin/env tsx
/**
 * draft-plan — propose a content-matched broll-plan.json from the transcript (option-C: you APPROVE
 * before build-broll.py runs it). Turns "what's showing isn't what I'm saying" into "it usually is,
 * and you fix the rest."
 *
 * It scans the cut's Whisper transcript and proposes b-roll moments:
 *   • CARD mention   → a `plain` circle-cam b-roll of that card's offer page (from creditCardBonuses.offer_link)
 *   • CHANGE claim   → a `highlight` article insert (Doctor of Credit / Points Guy — agent fills the URL)
 *   • SITE/TOOL ref  → a `plain` b-roll of the relevant fatstacksacademy page (calculator / Stacks OS / by-state / blog)
 * Segments are importance-spaced (no wall-to-wall b-roll) and non-overlapping (build-broll requires it).
 *
 * Default = propose only (fast, no network). With --shots it also captures the offer/site screenshots
 * (fetch-screenshots.ts) and OCRs a tight ROI for the focus/highlight segments (page-roi.py), so the plan
 * comes out mostly filled in. Every segment carries a `status` + `why`; you approve/trim, then build-broll.
 *
 *   tsx scripts/video-editor/draft-plan.ts --transcript face.json --face face.mp4 --out broll-plan.json
 *   tsx scripts/video-editor/draft-plan.ts --transcript face.json --face face.mp4 --out plan.json --shots
 */
import * as fs from 'node:fs';
import * as path from 'node:path';
import { execFileSync } from 'node:child_process';
import { creditCardBonuses } from '../../lib/data/creditCardBonuses';
import { lookup, loadIndex, DEFAULT_ROOT, type AssetRecord } from './lib/asset-index';

const HERE = path.dirname(new URL(import.meta.url).pathname);
const args = process.argv.slice(2);
const flag = (n: string, d = '') => { const i = args.indexOf(`--${n}`); return i >= 0 && args[i + 1] && !args[i + 1].startsWith('--') ? args[i + 1] : d; };
const has = (n: string) => args.includes(`--${n}`);
const transcript = flag('transcript');
const facePath = flag('face');
const outPath = flag('out', 'broll-plan.json');
const shotsDir = flag('shots-dir', path.join(path.dirname(outPath), 'shots'));
const SEG = parseFloat(flag('seg-dur', '9'));
const GAP = parseFloat(flag('min-gap', '4'));     // face breathing room between b-roll segments
// --use-library: before proposing a fresh offer-page screenshot, reuse a high-confidence asset from
// the standing library (assets/library, indexed by lib/asset-index.ts). Opt-in + no-ops when the
// library is empty, so default output is unchanged. --library-root overrides where the index lives;
// --library-min sets the confidence bar a match must clear to be reused (default 0.6).
const USE_LIBRARY = has('use-library');
const LIBRARY_ROOT = path.resolve(flag('library-root', DEFAULT_ROOT));
const LIBRARY_MIN = (() => { const v = parseFloat(flag('library-min', '0.6')); return Number.isFinite(v) && v >= 0 ? v : 0.6; })();
if (!transcript || !facePath) { console.error('usage: draft-plan.ts --transcript <whisper.json> --face <face.mp4> --out <plan.json> [--shots]'); process.exit(1); }

// ---- transcript → words + sentences ----
type W = { raw: string; t: number; end: number };
const j = JSON.parse(fs.readFileSync(transcript, 'utf8'));
const words: W[] = [];
for (const s of j.segments ?? []) for (const w of s.words ?? []) { const raw = (w.word ?? '').trim(); if (raw) words.push({ raw, t: w.start, end: w.end ?? w.start }); }
if (!words.length) { console.error('No word timestamps in the transcript (need segments[].words[]).'); process.exit(1); }
const faceDur = parseFloat(execFileSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', facePath], { encoding: 'utf8' }).trim()) || words.at(-1)!.end;

type Sent = { t: number; end: number; text: string };
const sentences: Sent[] = []; let cur: W[] = [];
for (const w of words) { cur.push(w); if (/[.!?]$/.test(w.raw) && cur.length >= 3) { sentences.push({ t: cur[0].t, end: w.end, text: cur.map(x => x.raw).join(' ') }); cur = []; } }
if (cur.length) sentences.push({ t: cur[0].t, end: cur.at(-1)!.end, text: cur.map(x => x.raw).join(' ') });

const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9 ]+/g, ' ').replace(/\s+/g, ' ').trim();

// ---- section cues (a "new card" moment) ----
const SECTION = /\b(card number|first card|first up|number (one|two|three|four|five|six)|next up|moving on|let'?s (get into|talk)|second card|third card|fourth card|fifth card|sixth card)\b/i;
const sections: number[] = []; let lastSec = -99;
for (let i = 0; i < words.length; i++) { if (words[i].t - lastSec < 12) continue; const win = words.slice(i, i + 5).map(w => w.raw).join(' '); if (SECTION.test(win)) { sections.push(+words[i].t.toFixed(2)); lastSec = words[i].t; } }

// ---- card detection within a [t0,t1] window (distinctive tokens, like article-index) ----
const GENERIC = new Set(('the card credit business rewards cash bank banco visa mastercard amex express a of and plus one more travel premier preferred signature world elite platinum gold global union free spirit points miles back account checking savings personal secured student everyday custom customized smart flex freedom double active national').split(' '));
const cardTok = creditCardBonuses.filter(c => c.card_name && c.offer_link).map(c => { const toks = norm(c.card_name).split(' ').filter(Boolean); return { id: c.id, name: c.card_name, url: c.offer_link!, full: norm(c.card_name), distinctive: [...new Set(toks.filter(t => t.length >= 4 && !GENERIC.has(t)))] }; });
function cardInWindow(t0: number, t1: number) {
  const txt = ' ' + norm(words.filter(w => w.t >= t0 && w.t < t1).map(w => w.raw).join(' ')) + ' ';
  let best: { id: string; name: string; url: string; score: number } | null = null;
  for (const c of cardTok) { const exact = c.full.length >= 5 && txt.includes(' ' + c.full + ' '); const hits = c.distinctive.filter(tok => txt.includes(' ' + tok + ' ')).length; const score = exact ? 99 : hits; if ((exact || hits >= 2) && (!best || score > best.score)) best = { id: c.id, name: c.name, url: c.url, score }; }
  return best;
}

// ---- standing asset library (opt-in) ----
// Load the index ONCE. When --use-library is off, or the library is empty/unbuilt, this stays an
// empty array and libraryHero() always returns null → every code path below behaves exactly as
// before (additive, zero behavior change by default). When on, a card intro can reuse a proven,
// already-cleared hero from the bin instead of re-screenshotting the offer page each video.
const libraryIndex: AssetRecord[] = USE_LIBRARY ? loadIndex(LIBRARY_ROOT) : [];
if (USE_LIBRARY) console.log(libraryIndex.length ? `📚 asset library: ${libraryIndex.length} indexed (root ${path.relative(process.cwd(), LIBRARY_ROOT)}, min ${LIBRARY_MIN})` : `📚 --use-library on but the index is empty (${path.relative(process.cwd(), LIBRARY_ROOT)}) — falling back to fetch-screenshots`);
/** A confident library hero for this card (image-kind, score ≥ min), else null. Queries the card's
 *  name + id so OCR'd card-art ("CHASE SAPPHIRE PREFERRED") and folder/filename tags both count. */
// brand/generic tokens are shared across many cards ("Chase … Preferred") — they must NOT alone
// qualify a reuse, or a sibling card's art (Ink Business Preferred vs Sapphire Preferred) clears the bar.
const GENERIC_CARD_TOK = new Set(
  'chase citi amex american express capital one bank america us bank wells fargo discover sofi bilt card cards credit business preferred reserve plus cash unlimited rewards points the a of'.split(' ')
);
function libraryHero(card: { id: string; name: string }): AssetRecord | null {
  if (!libraryIndex.length) return null;
  const hits = lookup(`${card.name} ${card.id.replace(/[-_]+/g, ' ')}`, { index: libraryIndex, kind: 'image', minScore: LIBRARY_MIN, n: 1 });
  const rec = hits[0]?.record;
  if (!rec) return null;
  // Guard: the reused asset must contain a DISTINCTIVE (non-brand) token of this card — else a
  // sibling card sharing only generic tokens could be stamped on as the wrong hero.
  const distinctive = `${card.name} ${card.id.replace(/[-_]+/g, ' ')}`
    .toLowerCase().replace(/[^a-z0-9 ]+/g, ' ').split(/\s+/)
    .filter((t) => t.length >= 3 && !GENERIC_CARD_TOK.has(t));
  if (distinctive.length) {
    const hay = `${rec.file} ${rec.caption ?? ''} ${(rec.tags ?? []).join(' ')}`.toLowerCase();
    if (!distinctive.some((t) => hay.includes(t))) return null; // wrong card's art — fall back to a fresh shot
  }
  return rec;
}

// ---- change claims (→ article highlight) ----
const CHANGE = /\b(going away|no longer|discontinu\w*|gone|expir\w*|ending|ends?\b|bumped|raised|increased|boost\w*|up to|highest ever|best ever|doubled|tripled|overhaul\w*|revamp\w*|refresh\w*|brand[- ]?new|just (added|launched|changed)|lowered|reduced|cut|used to|previously)\b/i;

// ---- site / tool mentions ----
const SITES: { re: RegExp; label: string; url: string; why: string }[] = [
  { re: /\b(profitability )?calculator\b/i, label: 'site-calculator', url: 'https://fatstacksacademy.com/credit-card-calculator', why: 'calculator mention' },
  { re: /\bstacks ?os|track this bonus|tracker\b/i, label: 'site-stacksos', url: 'https://fatstacksacademy.com/stacksos', why: 'Stacks OS / tracker mention' },
  { re: /\bby state|your state|1,?000\+? (credit )?cards|every card\b/i, label: 'site-by-state', url: 'https://fatstacksacademy.com/cards', why: 'cards-by-state mention' },
  { re: /\b(link in the description|write ?up|the full list|on (my|the) (site|website)|fatstacksacademy)\b/i, label: 'site-blog', url: 'https://fatstacksacademy.com/blog', why: 'site / write-up mention' },
];

type Seg = { start: number; end: number; layout: 'plain' | 'focus' | 'highlight' | 'gfx'; image?: string; roi?: string; lines?: string; source?: string; url?: string; cardId?: string; phrase?: string; gfx_type?: string; spec?: any; status: string; why: string; label?: string; lib?: string };
const proposed: Seg[] = [];
const sectBounds = [...sections, faceDur];

// CARD sections → plain offer-page b-roll (+ a focus on the first bonus figure he says, if any)
for (let i = 0; i < sections.length; i++) {
  const t0 = sections[i], t1 = sectBounds[i + 1] ?? faceDur;
  const card = cardInWindow(t0, Math.min(t1, t0 + 60));
  if (!card) continue;
  // Prefer a confident library hero (already cleared) over a fresh offer-page screenshot. When the
  // library is off/empty libraryHero() is null → the seg is identical to before (needs-screenshot).
  const hero = libraryHero(card);
  const introSeg: Seg = { start: +(t0 + 0.4).toFixed(2), end: +Math.min(t0 + 0.4 + SEG, t1 - 0.3, faceDur).toFixed(2), layout: 'plain', url: card.url, cardId: card.id, label: card.id, status: 'needs-screenshot', why: `intro to ${card.name}` };
  if (hero) { introSeg.image = hero.file; introSeg.status = 'ready'; introSeg.lib = path.basename(hero.file); introSeg.why = `intro to ${card.name} — reused library asset ${path.basename(hero.file)}`; }
  proposed.push(introSeg);
  // first sentence in this section with a hero figure → a focus on that figure on the offer page
  const figSent = sentences.find(s => s.t >= t0 && s.t < t1 && /(\$[\d,]+|\b\d{2,3},?\d{3}\b|\b\d{2,3}k\b|\b\d{1,3}%)/i.test(s.text));
  if (figSent && figSent.t > t0 + SEG) proposed.push({ start: +figSent.t.toFixed(2), end: +Math.min(figSent.t + SEG, t1 - 0.3, faceDur).toFixed(2), layout: 'focus', url: card.url, cardId: card.id, label: card.id, phrase: figSent.text.slice(0, 160), status: 'needs-screenshot', why: `bonus/figure reveal for ${card.name}` });
}

// CHANGE claims → article highlight (agent fills the URL)
const seenChange = new Set<number>();
for (const s of sentences) {
  if (!CHANGE.test(s.text)) continue;
  const key = Math.round(s.t / 5); if (seenChange.has(key)) continue; seenChange.add(key);
  const card = cardInWindow(s.t - 8, s.t + 8);
  const figs = (s.text.replace(/(\d)\s+([,.])/g, '$1$2').replace(/\s+%/g, '%').match(/\$\s?[\d,]+|\b\d{1,3}%/gi) ?? []).slice(0, 2).join(' ');
  proposed.push({ start: +s.t.toFixed(2), end: +Math.min(s.t + SEG, faceDur).toFixed(2), layout: 'highlight', source: '', url: '', phrase: s.text.slice(0, 160), status: 'needs-article', why: `change: "${s.text.slice(0, 70)}" — find DoC/TPG: ${[card?.name, figs, '2026'].filter(Boolean).join(' ')}` });
}

// SITE / TOOL mentions → plain page b-roll
for (const w of words) for (const site of SITES) {
  const win = words.slice(words.indexOf(w), words.indexOf(w) + 6).map(x => x.raw).join(' ');
  if (site.re.test(win)) { if (!proposed.some(p => p.label === site.label && Math.abs(p.start - w.t) < 20)) proposed.push({ start: +w.t.toFixed(2), end: +Math.min(w.t + SEG, faceDur).toFixed(2), layout: 'plain', url: site.url, label: site.label, status: 'needs-screenshot', why: site.why }); }
}

// EXPLAINER moments → a full-screen motion-graphic (gfx). Detect the type + draft a best-effort spec
// you review/fill (status needs-spec); build-broll layout:'gfx' renders it via motion-gfx.py.
const GFX: { re: RegExp; type: string; build: (s: string) => any }[] = [
  { re: /\b0%\s*(intro\s*)?apr|interest[- ]free|\bthe float\b/i, type: 'timeline',
    build: (s) => { const mo = s.match(/(\d+)\s*months?/i)?.[1]; return { title: 'The 0% APR float', markers: [{ label: 'Buy now', sub: 'month 0' }, { label: '0% interest', sub: mo ? `${mo} months` : 'intro period' }, { label: 'Pay in full', sub: 'before the due date' }, { label: 'Keep your cash', sub: 'earning interest' }] }; } },
  { re: /\bspend \$?[\d,]+\s*(in|within)\s*\d+\s*months?\b/i, type: 'steps',
    build: (s) => { const m = s.match(/\$?([\d,]+)\s*(?:in|within)\s*(\d+)\s*months?/i); return { title: 'How to earn it', steps: ['Apply for the card', m ? `Spend $${m[1]} in ${m[2]} months` : 'Hit the minimum spend', 'Earn the bonus'] }; } },
  { re: /\bworth (?:about |around |roughly )?\$[\d,]+|comes out to \$[\d,]+|that'?s \$[\d,]+ in (?:value|rewards)\b/i, type: 'value',
    build: (s) => ({ label: "what it's worth", a: '<points>', b: '<cents / pt>', c: (s.match(/\$[\d,]+/) || ['$0'])[0] }) },
  { re: /\b(up from|versus|vs\.?|compared to)\b[^.]*?\d{2,}/i, type: 'bars',
    build: (s) => { const nums = ((s.replace(/(\d)\s+,/g, '$1,').match(/[\d,]{2,}/g)) || []).map(x => parseInt(x.replace(/,/g, ''), 10)).filter(x => x >= 1000).slice(0, 2); return { title: 'Compared', items: nums.length === 2 ? [{ label: 'Before', value: nums[0] }, { label: 'Now', value: nums[1] }] : [{ label: 'Before', value: 75000 }, { label: 'Now', value: 100000 }] }; } },
];
const seenGfx = new Set<number>();
for (const s of sentences) {
  const g = GFX.find(x => x.re.test(s.text));
  if (!g) continue;
  const key = Math.round(s.t / 6); if (seenGfx.has(key)) continue; seenGfx.add(key);
  proposed.push({ start: +s.t.toFixed(2), end: +Math.min(s.t + SEG + 1, faceDur).toFixed(2), layout: 'gfx', gfx_type: g.type, spec: g.build(s.text), status: 'needs-spec', why: `explainer (${g.type}) — review/fill the spec: "${s.text.slice(0, 60)}"` });
}

// ---- importance-space + de-overlap. Place HIGH-priority first (a card intro must never be knocked
//      out by a site/change segment), then fill remaining gaps; two segments collide if their
//      [start,end] windows are within GAP of each other. ----
const prio = (s: Seg) => (s.cardId ? 3 : (s.layout === 'highlight' || s.layout === 'gfx') ? 2 : 1);  // card > article/gfx > site
proposed.sort((a, b) => prio(b) - prio(a) || a.start - b.start);
const placed: Seg[] = [];
for (const s of proposed) {
  if (s.end - s.start < 2) continue;
  if (placed.some(p => s.start < p.end + GAP && p.start < s.end + GAP)) continue;  // overlaps an already-placed seg
  placed.push(s);
}
const segs = placed.sort((a, b) => a.start - b.start);

// ---- optional: capture screenshots + OCR ROIs so the plan comes out filled ----
function pyRoi(image: string, phrase: string) {
  try {
    const out = execFileSync('python3', [path.join(HERE, 'page-roi.py'), '--image', image, '--phrase', phrase], { encoding: 'utf8' });
    const roi = out.match(/--roi\s+([\d,]+)/)?.[1]; const lines = out.match(/--lines\s+([\d,;]+)/)?.[1];
    return roi ? { roi, lines } : null;
  } catch { return null; }
}
if (has('shots')) {
  fs.mkdirSync(shotsDir, { recursive: true });
  // Capture a card's offer page if ANY of its segs still needs a shot (not filled from the library).
  // A card can have a lib-filled intro AND a focus seg that still needs a screenshot — keep it then.
  // With --use-library off, no seg has s.lib, so this equals "every card with a seg" — unchanged.
  const cardIds = [...new Set(segs.filter(s => s.cardId && !s.lib).map(s => s.cardId!))];
  const urlPairs = [...new Map(segs.filter(s => s.label && s.url && !s.cardId).map(s => [s.label!, `${s.label}=${s.url}`])).values()];
  const fsArgs = ['--out', shotsDir];
  if (cardIds.length) fsArgs.push('--cards', cardIds.join(','));
  if (urlPairs.length) fsArgs.push('--urls', urlPairs.join(';'));
  console.log(`📸 capturing ${cardIds.length} offer page(s) + ${urlPairs.length} site page(s) …`);
  try { execFileSync('npx', ['tsx', path.join(HERE, 'fetch-screenshots.ts'), ...fsArgs], { stdio: 'inherit' }); } catch { console.warn('  ⚠ some screenshots failed (bank bot-walls) — those stay status:needs-screenshot'); }
  let manifest: any[] = [];
  try { manifest = JSON.parse(fs.readFileSync(path.join(shotsDir, 'manifest.json'), 'utf8')); } catch { }
  const shotOf = (label: string, full = false) => { const m = manifest.find(x => x.label === label && x.ok); return m?.files?.find((f: string) => f.includes(full ? '--full' : '--viewport')) || m?.files?.[0]; };
  for (const s of segs) {
    if (!s.label) continue;
    if (s.lib) continue;   // already filled from the library — never overwrite a reused asset
    const vp = shotOf(s.label, false), full = shotOf(s.label, true);
    if (!vp) continue;
    s.image = vp;
    if (s.layout === 'plain') { s.status = 'ready'; }
    else if (s.phrase) { const r = pyRoi(full || vp, s.phrase); if (r) { s.roi = r.roi; if (r.lines) s.lines = r.lines; s.image = full || vp; s.status = 'ready'; } else s.status = 'needs-roi'; }
  }
}

// ---- write the draft plan (build-broll reads start/end/layout/image/roi/lines/source; the rest are notes) ----
const plan = { face: facePath, out: path.join(path.dirname(outPath), 'VIDEO-BROLL.mp4'), fps: Math.round(eval(execFileSync('ffprobe', ['-v', 'error', '-select_streams', 'v:0', '-show_entries', 'stream=r_frame_rate', '-of', 'csv=p=0', facePath], { encoding: 'utf8' }).trim() || '24/1')), total: +faceDur.toFixed(2), ring: '#0d7c5f', segments: segs };
fs.writeFileSync(outPath, JSON.stringify(plan, null, 2));

// ---- summary ----
const byStatus = (st: string) => segs.filter(s => s.status === st).length;
const reused = segs.filter(s => s.lib).length;   // 0 unless --use-library resolved a hero (additive)
const md = [`# draft b-roll plan — ${segs.length} segments (${(segs.reduce((a, s) => a + (s.end - s.start), 0) / faceDur * 100).toFixed(0)}% coverage)`, '',
  `ready: ${byStatus('ready')} · needs-screenshot: ${byStatus('needs-screenshot')} · needs-article: ${byStatus('needs-article')} · needs-roi: ${byStatus('needs-roi')}` + (reused ? ` · reused from library: ${reused}` : ''), '',
  ...segs.map(s => `- **${Math.floor(s.start / 60)}:${String(Math.floor(s.start % 60)).padStart(2, '0')}** ${s.layout.padEnd(9)} [${s.status}] — ${s.why}`)].join('\n');
fs.writeFileSync(outPath.replace(/\.json$/, '') + '.md', md);
console.log(`\n${md}\n`);
console.log(`→ ${outPath}  (+ ${path.basename(outPath.replace(/\.json$/, ''))}.md)`);
console.log(`Next: review the plan — fill 'needs-article' (find DoC/TPG → page-roi), capture any bot-walled 'needs-screenshot' by hand, then:\n  python3 scripts/video-editor/build-broll.py --plan ${outPath}`);
