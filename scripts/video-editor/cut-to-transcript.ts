/**
 * cut-to-transcript — cut a raw take down to match an "approved" transcript.
 *
 * Given the raw recording's word-level timestamps (from clean-aroll's words.json)
 * and a TARGET transcript (e.g. the Descript cleaned-comp transcript), LCS-aligns
 * the raw words to the target words, keeps the matched spans, and cuts everything
 * in between (tangents, repeated takes, dead air Descript removed). Reproduces the
 * Descript content selection on the raw take you own — locally, zero tokens.
 *
 * Also writes a remapped transcript (target text with corrected timecodes) so the
 * editor's build-plan re-aligns against the new, tighter timeline.
 *
 * Output → <out>/clean-aroll-tight.mp4, clean-transcript.md, tight-cuts.json
 *
 * Usage:
 *   tsx scripts/video-editor/cut-to-transcript.ts \
 *     --in <raw.mp4> --words <words.json> --target <descript-transcript.md> --out <dir> \
 *     [--bridge 0.7] [--pad 0.1] [--dry]
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import { execFileSync } from 'node:child_process';
import { parseTranscript } from './lib/transcript';
import { applyCut } from './lib/ffcut';

const norm = (w: string) => w.toLowerCase().replace(/[^a-z0-9']/g, '');
const arg = (n: string, d?: string) => {
  const i = process.argv.indexOf(`--${n}`);
  if (i >= 0 && i + 1 < process.argv.length) return process.argv[i + 1];
  if (d !== undefined) return d;
  throw new Error(`missing --${n}`);
};
const has = (n: string) => process.argv.includes(`--${n}`);
const sh = (c: string, a: string[]) => execFileSync(c, a, { encoding: 'utf8', maxBuffer: 1 << 30 });

interface RW { start: number; end: number; t: string; w: string }

/** LCS backtrack → indices of R that are part of the longest common subsequence with D. */
function lcsKeptIndices(R: string[], D: string[]): number[] {
  const m = R.length, n = D.length;
  // dp row-by-row with Uint32; keep full table for backtrack (m*n ints).
  const dp = new Int32Array((m + 1) * (n + 1));
  const W = n + 1;
  for (let i = 1; i <= m; i++) {
    const ri = R[i - 1];
    const base = i * W;
    const prev = (i - 1) * W;
    for (let j = 1; j <= n; j++) {
      dp[base + j] = ri === D[j - 1] ? dp[prev + j - 1] + 1 : Math.max(dp[prev + j], dp[base + j - 1]);
    }
  }
  const kept: number[] = [];
  let i = m, j = n;
  while (i > 0 && j > 0) {
    if (R[i - 1] === D[j - 1] && dp[i * W + j] === dp[(i - 1) * W + j - 1] + 1) { kept.push(i - 1); i--; j--; }
    else if (dp[(i - 1) * W + j] >= dp[i * W + j - 1]) i--;
    else j--;
  }
  return kept.reverse();
}

function fmt(s: number) { return `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`; }

function main() {
  const input = arg('in');
  const wordsPath = arg('words');
  const targetPath = arg('target');
  const outDir = arg('out');
  const bridge = parseFloat(arg('bridge', '0.7'));
  const pad = parseFloat(arg('pad', '0.1'));
  fs.mkdirSync(outDir, { recursive: true });

  const rawWords = JSON.parse(fs.readFileSync(wordsPath, 'utf8')) as { start: number; end: number; word: string }[];
  const R: RW[] = rawWords.map((w) => ({ start: w.start, end: w.end, t: norm(w.word), w: w.word })).filter((x) => x.t);
  const target = parseTranscript(fs.readFileSync(targetPath, 'utf8'));
  const D = target.words.map((w) => w.text).filter(Boolean);

  console.log(`raw words=${R.length}  target words=${D.length}  → LCS aligning…`);
  const kept = lcsKeptIndices(R.map((w) => w.t), D);
  const coverage = kept.length / D.length;
  console.log(`matched ${kept.length}/${D.length} target words (${(coverage * 100).toFixed(0)}% coverage)`);

  // Build keep-spans: walk kept indices, split where the time gap between
  // consecutive matched words exceeds `bridge` (that gap is a cut tangent/silence).
  const segs: [number, number][] = [];
  let segStart = R[kept[0]].start, segEndIdx = kept[0];
  for (let k = 1; k < kept.length; k++) {
    const prev = R[kept[k - 1]], cur = R[kept[k]];
    if (cur.start - prev.end > bridge) {
      segs.push([Math.max(0, segStart - pad), prev.end + pad]);
      segStart = cur.start;
    }
    segEndIdx = kept[k];
  }
  segs.push([Math.max(0, segStart - pad), R[segEndIdx].end + pad]);

  const newDur = segs.reduce((s, [a, b]) => s + (b - a), 0);
  const rawDur = R[R.length - 1].end;
  console.log(`✓ tight cut: ${fmt(rawDur)} raw → ${fmt(newDur)} (${segs.length} kept segments)`);

  // Remap every kept word to its new (post-cut) timestamp. cumCutBefore(t) = total
  // removed time before raw time t, so newTime = t - cumCutBefore(t).
  const cumCutBefore = (t: number) => {
    let cut = 0, lastEnd = 0;
    for (const [a, b] of segs) { if (a > t) break; cut += Math.max(0, a - lastEnd); lastEnd = b; }
    return cut;
  };
  const cleanWords = kept.map((r) => ({
    word: R[r].w,
    start: +(R[r].start - cumCutBefore(R[r].start)).toFixed(3),
    end: +(R[r].end - cumCutBefore(R[r].end)).toFixed(3),
  }));
  // Exact per-word timing — this is what build-plan aligns overlays against.
  fs.writeFileSync(path.join(outDir, 'clean-words.json'), JSON.stringify(cleanWords));

  // Readable transcript built from the accurate word times (new line at sentence
  // punctuation or ~22 words).
  const paraLines: string[] = [];
  let cur: typeof cleanWords = [];
  const flush = () => {
    if (!cur.length) return;
    const tc = new Date(cur[0].start * 1000).toISOString().substr(11, 8);
    paraLines.push(`[${tc}] ${cur.map((w) => w.word).join(' ').replace(/\s+([,.!?])/g, '$1').trim()}`);
    cur = [];
  };
  for (const w of cleanWords) {
    cur.push(w);
    if (/[.!?]$/.test(w.word) && cur.length >= 8) flush();
    else if (cur.length >= 22) flush();
  }
  flush();
  fs.writeFileSync(path.join(outDir, 'clean-transcript.md'), paraLines.join('\n\n') + '\n');
  fs.writeFileSync(path.join(outDir, 'tight-cuts.json'), JSON.stringify({ rawDur, newDur, coverage, segments: segs }, null, 2));

  if (has('dry')) { console.log('--dry: skipping render'); return; }
  const out = path.join(outDir, 'clean-aroll-tight.mp4');
  applyCut(input, segs, out); // trim+concat with declick fades (no choppy aselect)
  console.log(`✓ rendered ${out} (${fmt(newDur)})`);
}

main();
