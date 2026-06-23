/**
 * whisper-to-plan — turn a Whisper JSON (word timestamps) into a render-cards /
 * preview plan.json: emphasis captions + gold callouts + section markers. For the
 * no-Resolve preview path (build-plan.ts owns the real EDL-driven plan).
 *
 *   tsx whisper-to-plan.ts <whisper.json> <plan.json> [full]
 */
import * as fs from 'node:fs';
import { buildCaptions, detectCallouts, markChips } from './lib/captions';

const j = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
const mode = process.argv[4] === 'full' ? 'full' : 'emphasis';
const words = [] as { raw: string; text: string; t: number }[];
for (const s of j.segments ?? [])
  for (const w of s.words ?? []) {
    const raw = (w.word ?? '').trim();
    if (raw) words.push({ raw, text: raw.toLowerCase(), t: w.start });
  }

// Section cues from the word stream (≥12s apart) — drives whooshes + chapter markers.
const SECTION =
  /\b(card number|first card|first up|number (one|two|three|four|five|six)|next up|moving on|let'?s (get into|talk)|sapphire preferred|ink business|bank of america|customized cash|u\.?s\.? bank|cash ?plus|usaa|eagle adapt|second card|third card)\b/i;
const sections: { t: number; name: string }[] = [];
let lastSec = -99;
for (let i = 0; i < words.length; i++) {
  if (words[i].t - lastSec < 12) continue;
  const window = words.slice(i, i + 5).map((w) => w.raw).join(' ');
  if (SECTION.test(window)) {
    sections.push({ t: +words[i].t.toFixed(2), name: window.slice(0, 40) });
    lastSec = words[i].t;
  }
}

const captions = buildCaptions(words, mode);
const callouts = detectCallouts(words);
markChips(callouts); // gold chip reserved for the headline bonus, ≤1 per 10s
fs.writeFileSync(process.argv[3], JSON.stringify({ beats: [], sections, captions, callouts }, null, 2));
console.log(`captions=${captions.length} callouts=${callouts.length} sections=${sections.length} (${mode})`);
console.log('sections: ' + sections.map((s) => `${s.t}s`).join(', '));
console.log('reveals: ' + callouts.filter((c) => c.importance === 'reveal').map((c) => `${c.value}@${c.t}s`).join(', '));
