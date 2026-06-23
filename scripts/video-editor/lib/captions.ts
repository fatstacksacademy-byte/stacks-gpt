/**
 * captions — turn per-word timestamps into (a) clean caption LINES, (b) an SRT
 * file (for YouTube CC + Resolve subtitle import), and (c) gold number CALLOUTS.
 *
 * "Clean line captions" is the chosen default style: ~6-word lines that break on
 * punctuation and natural pauses, white text with $ / % / 100K auto-gilded by the
 * renderer's rich(). Callouts surface the hero numbers (bonus, spend, fee) as
 * gold stat-chip pop-ins. All pure data — no Resolve dependency.
 */
import type { Word } from './transcript';

export interface CaptionLine {
  t: number;
  end: number;
  text: string;
  impact?: boolean; // emphasis caption (ALL CAPS, verbatim, big style)
}

export interface Callout {
  t: number;
  value: string; // e.g. "100K", "$5,000", "6%"
  label: string; // e.g. "bonus", "min spend", "annual fee", ""
  importance: 'reveal' | 'normal'; // 'reveal' = the headline bonus → earns riser+hit+zoom
  chip?: boolean; // render a gold chip? reserved for the headline bonus, ≤1 per 10s
}

const MAX_WORDS = 7;
const MAX_SECS = 3.2;
const PAUSE_GAP = 0.7; // a silence longer than this ends a caption line
const ENDS_SENTENCE = /[.!?:](["')\]]*)$/;

/** Dispatch: 'emphasis' (Leo-style, ≤3-word key phrases — the default) or 'full'. */
export function buildCaptions(words: Word[], mode: 'full' | 'emphasis' = 'emphasis'): CaptionLine[] {
  return mode === 'full' ? buildFullCaptions(words) : buildEmphasisCaptions(words);
}

// Emphasis captions fire on a strong "moment" word, then caption the ACTUAL words
// being said (verbatim, ≤3 words, ALL CAPS) — not a canned phrase. Sparse (4s cooldown).
const EMPHASIS_TRIGGER =
  /^(best|all-?time|record|highest|free|never|huge|massive|biggest|lifetime|limited|dead|gone|secret|insane|crazy|worst|mistake|must|avoid|warning|exclusive|rare|unbeatable|guaranteed)$/i;
const STOP = new Set(
  'a an the of to and or in on for with that this it you your i my we our they them so but if at as be are was just get got can will would youre its his her into over than then is are these those now since'.split(' ')
);
const cleanWord = (s: string): string => s.replace(/[^A-Za-z0-9$%]/g, '');

function buildEmphasisCaptions(words: Word[]): CaptionLine[] {
  const lines: CaptionLine[] = [];
  let last = -99;
  for (let i = 0; i < words.length; i++) {
    if (words[i].t - last < 4) continue; // sparse
    if (!EMPHASIS_TRIGGER.test(cleanWord(words[i].raw))) continue;
    // Caption the actual words: trigger + the next word IF it's a clean content word
    // (not a stopword, not a number — numbers are the chip's job). ≤2 words, verbatim.
    const picked = [cleanWord(words[i].raw)];
    const nx = words[i + 1] ? cleanWord(words[i + 1].raw) : '';
    if (nx && !/[.!?]$/.test(words[i].raw) && nx.length >= 2 && !STOP.has(nx.toLowerCase()) && !/^\$?\d/.test(nx))
      picked.push(nx);
    lines.push({ t: +words[i].t.toFixed(2), end: +(words[i].t + 1.6).toFixed(2), text: picked.join(' ').toUpperCase(), impact: true });
    last = words[i].t;
  }
  return lines;
}

/** Reserve the gold chip for the headline bonus, ≤1 per `minGap`s. Mutates callouts. */
export function markChips(callouts: Callout[], minGap = 10): void {
  let last = -99;
  for (const c of callouts) {
    c.chip = c.importance === 'reveal' && c.t - last >= minGap;
    if (c.chip) last = c.t;
  }
}

/** Group words into readable caption lines (break on punctuation, pauses, length). */
function buildFullCaptions(words: Word[]): CaptionLine[] {
  const lines: CaptionLine[] = [];
  let cur: Word[] = [];
  const flush = (nextStart?: number) => {
    if (!cur.length) return;
    const t = cur[0].t;
    const lastT = cur[cur.length - 1].t;
    const end = Math.min(nextStart ?? lastT + 0.6, lastT + 1.2, t + 6);
    // Whisper splits "100,000" → "100" + ",000"; pull punctuation back onto its word.
    const text = cur
      .map((w) => w.raw)
      .join(' ')
      .replace(/\s+([,.!?%;:])/g, '$1')
      .replace(/\s+'/g, "'")
      .trim();
    lines.push({ t: +t.toFixed(2), end: +Math.max(end, t + 0.6).toFixed(2), text });
    cur = [];
  };
  for (let i = 0; i < words.length; i++) {
    cur.push(words[i]);
    const next = words[i + 1];
    const gap = next ? next.t - words[i].t : Infinity;
    const span = words[i].t - cur[0].t;
    const endsSentence = ENDS_SENTENCE.test(words[i].raw);
    if (cur.length >= MAX_WORDS || span >= MAX_SECS || gap >= PAUSE_GAP || endsSentence) {
      flush(next?.t);
    }
  }
  flush();

  // Merge orphan lines (1-2 words) into a neighbour so captions read cleanly.
  const merged: CaptionLine[] = [];
  for (const l of lines) {
    const prev = merged[merged.length - 1];
    const words2 = l.text.split(/\s+/).length;
    if (prev && words2 <= 2 && prev.text.split(/\s+/).length + words2 <= MAX_WORDS + 2 && l.t - prev.end < 0.8) {
      prev.text = `${prev.text} ${l.text}`.trim();
      prev.end = l.end;
    } else {
      merged.push({ ...l });
    }
  }
  return merged;
}

function srtTime(sec: number): string {
  const ms = Math.max(0, Math.round(sec * 1000));
  const h = Math.floor(ms / 3_600_000);
  const m = Math.floor((ms % 3_600_000) / 60_000);
  const s = Math.floor((ms % 60_000) / 1000);
  const f = ms % 1000;
  const p = (n: number, w = 2) => String(n).padStart(w, '0');
  return `${p(h)}:${p(m)}:${p(s)},${p(f, 3)}`;
}

export function toSRT(lines: CaptionLine[]): string {
  return lines
    .map((l, i) => `${i + 1}\n${srtTime(l.t)} --> ${srtTime(l.end)}\n${l.text}\n`)
    .join('\n');
}

// $1,234 / 100,000 / 100K / 6% / 5x — the numbers worth a gold chip.
const NUM_RE = /(\$[\d,]+(?:\.\d+)?k?|\b\d{1,3}(?:,\d{3})+\b|\b\d{2,3}k\b|\b\d{1,3}%|\b\d+x\b)/i;
// trailing context word → a short label for the chip
const LABEL = [
  { kw: /bonus|points|ur|miles|cash\s*back|reward/i, label: 'bonus' },
  { kw: /spend|spending|minimum|min\.?|months?|mo\b/i, label: 'min spend' },
  { kw: /fee|annual|af\b/i, label: 'annual fee' },
  { kw: /back|cashback|category|categories/i, label: 'rewards' },
];

/** "$5,000" → "$5K", "100,000" → "100K"; leaves "$95" / "6%" alone. */
function tidyValue(v: string): string {
  return v.toUpperCase().replace(/\.00$/, '').replace(/,000\b/, 'K');
}

/** Pick the hero numbers as gold callouts; de-dupe the same value within 8s.
 *  Whisper splits big numbers ("100,000" → "100" + ",000"), so merge a trailing
 *  ",ddd" token onto the previous one before matching. */
export function detectCallouts(words: Word[]): Callout[] {
  const merged: Word[] = [];
  for (const w of words) {
    const raw = w.raw.trim();
    if (/^,\d{3}\b/.test(raw) && merged.length) merged[merged.length - 1].raw += raw;
    else merged.push({ ...w, raw });
  }

  const out: Callout[] = [];
  const lastSeen = new Map<string, number>();
  for (let i = 0; i < merged.length; i++) {
    const m = merged[i].raw.match(NUM_RE);
    if (!m) continue;
    const value = tidyValue(m[1]);
    const t = merged[i].t;
    if ((lastSeen.get(value) ?? -99) > t - 8) continue;
    lastSeen.set(value, t);
    const ctx = [merged[i - 1], merged[i + 1], merged[i + 2]].filter(Boolean).map((w) => w.raw).join(' ');
    const label = LABEL.find((l) => l.kw.test(ctx))?.label ?? '';
    // The sign-up bonus is the headline reveal (earns riser+hit+zoom). Supporting
    // numbers (fee, min spend) AND earn-RATES (5x / 6%) are normal chips — a rewards
    // multiplier must never scatter the reveal FX reserved for the sign-up bonus.
    const isRate = /^\d+x$/i.test(value) || value.includes('%');
    const importance: Callout['importance'] = label === 'bonus' && !isRate ? 'reveal' : 'normal';
    out.push({ t: +t.toFixed(2), value, label, importance });
  }
  return out;
}
