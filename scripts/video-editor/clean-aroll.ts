/**
 * clean-aroll — Descript-free A-roll cleanup for the OBS flow.
 *
 * Takes a raw recording (e.g. an OBS .mkv/.mp4), transcribes it locally with
 * Whisper (word-level timestamps), then removes:
 *   1. long silences / dead air      (configurable gap threshold)
 *   2. filler words                  (um, uh, … ; optional aggressive set)
 *   3. repeated takes / restarts     (last-take-wins: keep the later attempt)
 * and writes a frame-accurate clean cut via ffmpeg — plus a review.md you can
 * audit before trusting it. 100% local, zero tokens, no Descript.
 *
 * Output → <out>/clean-aroll.mp4, cuts.json, review.md, words.json (cached).
 *
 * Usage:
 *   tsx scripts/video-editor/clean-aroll.ts --in <raw.mp4> --out <dir> \
 *       [--model base.en] [--min-silence 0.6] [--pad 0.08] [--fillers safe|aggressive] [--dry]
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import { execFileSync } from 'node:child_process';
import { applyCut } from './lib/ffcut';

interface Word { start: number; end: number; word: string; p: number }
interface Span { start: number; end: number; reason: string; detail?: string }

const FILLER_SAFE = new Set(['um', 'uh', 'uhh', 'uhm', 'umm', 'er', 'erm', 'hmm', 'mm', 'mhm', 'ah']);
const FILLER_AGGRO = new Set([...FILLER_SAFE, 'like', 'basically', 'actually', 'literally', 'honestly', 'right']);

const norm = (w: string) => w.toLowerCase().replace(/[^a-z0-9']/g, '');

function arg(name: string, def?: string): string {
  const i = process.argv.indexOf(`--${name}`);
  if (i >= 0 && i + 1 < process.argv.length) return process.argv[i + 1];
  if (def !== undefined) return def;
  throw new Error(`missing --${name}`);
}
const has = (name: string) => process.argv.includes(`--${name}`);

function sh(cmd: string, args: string[]): string {
  return execFileSync(cmd, args, { encoding: 'utf8', maxBuffer: 1 << 30 });
}

function probeDuration(file: string): number {
  return parseFloat(sh('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', file]).trim());
}

function transcribe(input: string, outDir: string, model: string): Word[] {
  const cache = path.join(outDir, 'words.json');
  if (fs.existsSync(cache)) return JSON.parse(fs.readFileSync(cache, 'utf8'));
  const wav = path.join(outDir, 'audio.wav');
  sh('ffmpeg', ['-y', '-i', input, '-vn', '-ac', '1', '-ar', '16000', wav]);
  console.log('Transcribing with Whisper (word timestamps)… this can take a few minutes on a long file.');
  sh('whisper', [wav, '--model', model, '--language', 'en', '--word_timestamps', 'True',
    '--output_format', 'json', '--output_dir', outDir]);
  const j = JSON.parse(fs.readFileSync(path.join(outDir, 'audio.json'), 'utf8'));
  const words: Word[] = [];
  for (const s of j.segments) for (const w of s.words ?? []) words.push({ start: w.start, end: w.end, word: w.word, p: w.probability ?? 1 });
  fs.writeFileSync(cache, JSON.stringify(words));
  return words;
}

/** Detect repeated runs of >=2 normalized words where a later copy starts within
 *  `windowWords` — the earlier copy is the abandoned take and gets removed.
 *  `maxSpan` guards against a "stutter" match straddling a long pause and
 *  swallowing real content (a true restart is only a few seconds). */
function detectRetakes(words: Word[], windowWords = 6, maxSpan = 8.0): Span[] {
  const n = words.map((w) => norm(w.word));
  const spans: Span[] = [];
  const removed = new Set<number>();
  for (let i = 0; i < words.length; i++) {
    if (removed.has(i) || !n[i]) continue;
    for (let j = i + 1; j <= i + windowWords && j < words.length; j++) {
      let len = 0;
      while (i + len < j && j + len < words.length && n[i + len] && n[i + len] === n[j + len]) len++;
      if (len >= 2 && words[j].start - words[i].start <= maxSpan) {
        // earlier copy words[i..i+len) plus any junk up to j are abandoned
        for (let k = i; k < j; k++) removed.add(k);
        spans.push({ start: words[i].start, end: words[j].start, reason: 'retake',
          detail: `"${words.slice(i, j).map((w) => w.word).join(' ').trim()}" → kept the restart` });
        i = j - 1;
        break;
      }
    }
  }
  return spans;
}

function main() {
  const input = arg('in');
  const outDir = arg('out');
  const model = arg('model', 'base.en');
  const minSilence = parseFloat(arg('min-silence', '0.6'));
  const pad = parseFloat(arg('pad', '0.08'));
  const fillerSet = arg('fillers', 'safe') === 'aggressive' ? FILLER_AGGRO : FILLER_SAFE;
  fs.mkdirSync(outDir, { recursive: true });

  const duration = probeDuration(input);
  const words = transcribe(input, outDir, model);
  if (!words.length) throw new Error('no words from transcription');

  const removals: Span[] = [];

  // 1. silences (incl. leading/trailing)
  if (words[0].start - pad > minSilence) removals.push({ start: 0, end: words[0].start - pad, reason: 'silence' });
  for (let i = 0; i < words.length - 1; i++) {
    const gap = words[i + 1].start - words[i].end;
    if (gap > minSilence) removals.push({ start: words[i].end + pad, end: words[i + 1].start - pad, reason: 'silence', detail: `${gap.toFixed(1)}s` });
  }
  const tail = duration - words[words.length - 1].end;
  if (tail - pad > minSilence) removals.push({ start: words[words.length - 1].end + pad, end: duration, reason: 'silence' });

  // 2. filler words (high confidence only)
  for (const w of words) if (fillerSet.has(norm(w.word)) && w.p > 0.4) removals.push({ start: w.start - pad / 2, end: w.end + pad / 2, reason: 'filler', detail: w.word.trim() });

  // 3. repeated takes
  removals.push(...detectRetakes(words));

  // merge removal intervals
  removals.sort((a, b) => a.start - b.start);
  const merged: Span[] = [];
  for (const r of removals) {
    const last = merged[merged.length - 1];
    if (last && r.start <= last.end + 0.02) { last.end = Math.max(last.end, r.end); last.reason = last.reason === r.reason ? last.reason : 'mixed'; }
    else merged.push({ ...r });
  }

  // keep = complement
  const keeps: [number, number][] = [];
  let cursor = 0;
  for (const r of merged) {
    if (r.start - cursor > 0.05) keeps.push([cursor, r.start]);
    cursor = Math.max(cursor, r.end);
  }
  if (duration - cursor > 0.05) keeps.push([cursor, duration]);

  const removedSec = merged.reduce((s, r) => s + (r.end - r.start), 0);
  const newDur = keeps.reduce((s, [a, b]) => s + (b - a), 0);

  fs.writeFileSync(path.join(outDir, 'cuts.json'), JSON.stringify({ duration, newDuration: newDur, removedSec, keeps, removals: merged }, null, 2));

  // review.md
  const fmt = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
  const counts = merged.reduce<Record<string, number>>((m, r) => ((m[r.reason] = (m[r.reason] ?? 0) + 1), m), {});
  const md = [
    `# A-roll cleanup — ${path.basename(input)}`,
    ``,
    `Raw ${fmt(duration)} → clean **${fmt(newDur)}**  (removed ${removedSec.toFixed(0)}s across ${merged.length} cuts)`,
    `Cuts by type: ${Object.entries(counts).map(([k, v]) => `${k} ${v}`).join(' · ')}`,
    ``,
    `| At | Type | Length | Detail |`,
    `|---|---|---|---|`,
    ...merged.map((r) => `| ${fmt(r.start)} | ${r.reason} | ${(r.end - r.start).toFixed(2)}s | ${r.detail ?? ''} |`),
  ].join('\n');
  fs.writeFileSync(path.join(outDir, 'review.md'), md);
  console.log(`✓ plan: ${fmt(duration)} → ${fmt(newDur)} (−${removedSec.toFixed(0)}s, ${merged.length} cuts) · review.md written`);

  if (has('dry')) { console.log('--dry: skipping render'); return; }

  // apply via trim+concat with declick fades (select/aselect drops audio frames → choppy)
  const out = path.join(outDir, 'clean-aroll.mp4');
  applyCut(input, keeps, out);
  console.log(`✓ rendered ${out} (${fmt(newDur)})`);
}

main();
