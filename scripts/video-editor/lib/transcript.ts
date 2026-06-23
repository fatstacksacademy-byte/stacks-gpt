/**
 * Transcript model + fuzzy anchor alignment.
 *
 * Input is the Descript paragraph-timecoded transcript ("[hh:mm:ss] text").
 * We interpolate a timestamp for every word, then for each EDL anchor phrase
 * find the best-matching span using idf-weighted token overlap (so ad-libbed,
 * non-verbatim anchors still land). Returns a time + a confidence score, and
 * the caller flags low-confidence / colliding matches for manual review.
 */

import * as fs from 'node:fs';

export interface Word {
  text: string; // normalized token
  raw: string; // original token
  t: number; // estimated seconds
}

export interface Paragraph {
  start: number;
  text: string;
}

export interface AlignResult {
  timeSec: number;
  score: number; // 0..1
  matchedText: string;
  matchedWordIndex: number;
}

const norm = (s: string): string =>
  s
    .toLowerCase()
    .replace(/[''`]/g, '')
    .replace(/[^a-z0-9$%]+/g, ' ')
    .trim();

function tcToSeconds(tc: string): number {
  const [h, m, s] = tc.split(':').map(Number);
  return h * 3600 + m * 60 + s;
}

export function parseTranscript(md: string): { paragraphs: Paragraph[]; words: Word[] } {
  const paragraphs: Paragraph[] = [];
  const re = /\[(\d{2}:\d{2}:\d{2})\]\s*([\s\S]*?)(?=\n\[|\s*$)/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(md)) !== null) {
    const text = m[2].replace(/\s+/g, ' ').trim();
    paragraphs.push({ start: tcToSeconds(m[1]), text });
  }

  // Interpolate per-word timestamps across each paragraph's span.
  const words: Word[] = [];
  for (let i = 0; i < paragraphs.length; i++) {
    const p = paragraphs[i];
    if (!p.text) continue;
    const end = i + 1 < paragraphs.length ? paragraphs[i + 1].start : p.start + Math.max(2, p.text.split(' ').length / 2.7);
    const raws = p.text.split(' ');
    const span = Math.max(0.001, end - p.start);
    for (let j = 0; j < raws.length; j++) {
      const n = norm(raws[j]);
      if (!n) continue;
      words.push({ text: n, raw: raws[j], t: p.start + (span * j) / raws.length });
    }
  }
  return { paragraphs, words };
}

/** idf weight per token across the transcript: rare tokens count for more. */
function buildIdf(words: Word[]): Map<string, number> {
  const df = new Map<string, number>();
  for (const w of words) df.set(w.text, (df.get(w.text) ?? 0) + 1);
  const N = words.length;
  const idf = new Map<string, number>();
  for (const [tok, c] of df) idf.set(tok, Math.log(1 + N / c));
  return idf;
}

const STOP = new Set(
  'a an the of to and or in on for with that this is it you your i my we our they them so but if at as be are was just get got can will would youre its'.split(' ')
);

export class Aligner {
  private words: Word[];
  private idf: Map<string, number>;

  constructor(words: Word[]) {
    this.words = words;
    this.idf = buildIdf(words);
  }

  private weight(tok: string): number {
    if (STOP.has(tok)) return 0.15;
    return this.idf.get(tok) ?? Math.log(1 + this.words.length);
  }

  /**
   * Find where `anchor` best matches. Slides windows of several lengths and
   * scores by the idf-weighted fraction of anchor tokens present in the window.
   * - afterSec: soft preference for matches later than a known time.
   * - nearSec/nearWindow: soft preference for matches near a section's center
   *   time (disambiguates duplicate anchors like the "0% APR" beats by locality).
   */
  align(anchor: string, opts: { afterSec?: number; nearSec?: number; nearWindow?: number } = {}): AlignResult {
    const afterSec = opts.afterSec ?? -1;
    const nearSec = opts.nearSec ?? -1;
    const nearWindow = opts.nearWindow ?? 75;
    const aTokens = norm(anchor).split(' ').filter(Boolean);
    if (!aTokens.length) return { timeSec: 0, score: 0, matchedText: '', matchedWordIndex: -1 };
    const totalW = aTokens.reduce((s, t) => s + this.weight(t), 0) || 1;

    const lens = [aTokens.length, aTokens.length + 2, Math.max(3, aTokens.length - 2), aTokens.length + 5];
    let best: AlignResult = { timeSec: 0, score: 0, matchedText: '', matchedWordIndex: -1 };

    for (const L of lens) {
      for (let i = 0; i + L <= this.words.length; i++) {
        const window = this.words.slice(i, i + L);
        const wset = new Map<string, number>();
        for (const w of window) wset.set(w.text, (wset.get(w.text) ?? 0) + 1);
        let matched = 0;
        const need = new Map<string, number>();
        for (const t of aTokens) need.set(t, (need.get(t) ?? 0) + 1);
        for (const [t, cnt] of need) {
          const have = Math.min(cnt, wset.get(t) ?? 0);
          matched += have * this.weight(t);
        }
        let score = matched / totalW;
        if (afterSec >= 0 && window[0].t < afterSec) score *= 0.6; // soft preference for forward matches
        if (nearSec >= 0) {
          const dt = (window[0].t - nearSec) / nearWindow;
          score *= Math.exp(-(dt * dt)); // Gaussian falloff around the section center
        }
        if (score > best.score) {
          best = {
            timeSec: +window[0].t.toFixed(2),
            score: +score.toFixed(3),
            matchedText: window.map((w) => w.raw).join(' '),
            matchedWordIndex: i,
          };
        }
      }
    }
    return best;
  }
}

// CLI: `tsx scripts/video-editor/lib/transcript.ts <transcript.md> "<anchor>"`
if (process.argv[1] && process.argv[1].endsWith('lib/transcript.ts')) {
  const file = process.argv[2];
  const anchor = process.argv[3];
  const { paragraphs, words } = parseTranscript(fs.readFileSync(file, 'utf8'));
  console.error(`paragraphs=${paragraphs.length} words=${words.length} duration~=${words.at(-1)?.t.toFixed(1)}s`);
  if (anchor) {
    const r = new Aligner(words).align(anchor);
    console.log(JSON.stringify(r, null, 2));
  }
}
