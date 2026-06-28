/**
 * correct-captions — fix Whisper's domain mis-hearings before they reach captions.
 *
 * Whisper writes "city" for Citi, "built" for Bilt, "beehive" for Beehiiv, and
 * lowercases sofi/amex/apy. Burned into a caption that looks amateur. This runs a
 * deterministic finance lexicon (lib/lexicon.ts — zero tokens) over a transcript
 * and, optionally, a constrained LLM pass for anything the dictionary misses.
 *
 * Every change is written to a `*.corrections.md` audit so nothing is silently
 * rewritten — review it before you trust the cut (matches the review.md habit).
 *
 * Modes (pick one input):
 *   --whisper clip.json     fix each word's .word, preserve all timing (feeds whisper-to-plan)
 *   --transcript file.md    fix a Descript [hh:mm:ss] transcript or any .txt
 *   --srt file.srt          fix cue text in an existing SRT
 *
 *   --out PATH      output file (default: <input>.corrected.<ext>)
 *   --no-context    skip the context-gated rules (Citi/Bilt/Current) — safe rules only
 *   --llm           after the dictionary, ask Claude for additional exact-token fixes
 *                   (needs ANTHROPIC_API_KEY; degrades to dict-only if unset). Off by default.
 *   --dry           write only the audit, not the corrected file
 *
 *   tsx scripts/video-editor/correct-captions.ts --whisper build/<slug>/clip.json
 */
import * as fs from 'node:fs';
import * as path from 'node:path';
import { correctWords, correctText, type Change } from './lib/lexicon';

function arg(name: string): string | undefined {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 ? process.argv[i + 1] : undefined;
}
const has = (name: string): boolean => process.argv.includes(`--${name}`);

const whisper = arg('whisper');
const transcript = arg('transcript');
const srt = arg('srt');
const input = whisper ?? transcript ?? srt;
if (!input) {
  console.error('need one of --whisper <json> | --transcript <md> | --srt <srt>');
  process.exit(1);
}
const contextual = !has('no-context');
const dry = has('dry');

type Word = { raw: string; text: string; t: number };

let correctedText = '';
let changes: Change[] = [];
let outDefault = '';

if (whisper) {
  const j = JSON.parse(fs.readFileSync(whisper, 'utf8'));
  // Collect into the {raw} model the lexicon understands, fix, write back in place.
  const refs: { raw: string; seg: number; idx: number }[] = [];
  (j.segments ?? []).forEach((s: any, si: number) =>
    (s.words ?? []).forEach((w: any, wi: number) => refs.push({ raw: (w.word ?? '').trim(), seg: si, idx: wi }))
  );
  const { words, changes: ch } = correctWords(refs, { contextual });
  changes = ch;
  words.forEach((w, n) => {
    const r = refs[n];
    // preserve Whisper's leading space convention on .word
    const orig = j.segments[r.seg].words[r.idx].word ?? '';
    const lead = /^\s/.test(orig) ? ' ' : '';
    j.segments[r.seg].words[r.idx].word = lead + w.raw;
  });
  correctedText = JSON.stringify(j, null, 2);
  outDefault = whisper.replace(/\.json$/, '.corrected.json');
} else if (srt) {
  // Fix only the cue text lines (skip index + "00:00 --> 00:00" lines).
  const lines = fs.readFileSync(srt, 'utf8').split('\n');
  const all: Change[] = [];
  const fixed = lines.map((line) => {
    if (/^\d+$/.test(line.trim()) || line.includes('-->') || line.trim() === '') return line;
    const { text, changes: ch } = correctText(line, { contextual });
    all.push(...ch);
    return text;
  });
  correctedText = fixed.join('\n');
  changes = all;
  outDefault = srt.replace(/\.srt$/, '.corrected.srt');
} else {
  const raw = fs.readFileSync(transcript!, 'utf8');
  const { text, changes: ch } = correctText(raw, { contextual });
  correctedText = text;
  changes = ch;
  outDefault = transcript!.replace(/(\.[^.]+)$/, '.corrected$1');
}

// ── optional constrained LLM pass ────────────────────────────────────────────
async function llmPass(plain: string): Promise<Change[]> {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) {
    console.warn('⚠ --llm requested but ANTHROPIC_API_KEY is unset → skipping LLM pass (dictionary only).');
    return [];
  }
  const prompt =
    'You are proofreading an auto-generated transcript for a US credit-card / bank-bonus YouTube video. ' +
    'Find ONLY clear transcription errors — mis-heard brand/product names (e.g. "city"→"Citi", "built"→"Bilt", ' +
    '"beehive"→"Beehiiv"), wrong homophones, and garbled finance terms. Do NOT paraphrase, restyle, or "improve" wording. ' +
    'Return STRICT JSON: {"fixes":[{"from":"<exact substring as it appears>","to":"<correction>"}]}. ' +
    'Only include a fix if `from` appears verbatim in the text. Empty list if nothing is clearly wrong.\n\nTRANSCRIPT:\n' +
    plain.slice(0, 12000);
  try {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-api-key': key, 'anthropic-version': '2023-06-01' },
      body: JSON.stringify({ model: 'claude-opus-4-8', max_tokens: 1500, messages: [{ role: 'user', content: prompt }] }),
    });
    const data: any = await res.json();
    const txt = data?.content?.[0]?.text ?? '';
    const json = JSON.parse(txt.slice(txt.indexOf('{'), txt.lastIndexOf('}') + 1));
    const out: Change[] = [];
    for (const f of json.fixes ?? []) {
      if (typeof f.from === 'string' && typeof f.to === 'string' && f.from && correctedText.includes(f.from) && f.from !== f.to) {
        correctedText = correctedText.split(f.from).join(f.to);
        out.push({ i: -1, from: f.from, to: f.to, rule: 'llm', context: f.from });
      }
    }
    return out;
  } catch (e) {
    console.warn(`⚠ LLM pass failed (${(e as Error).message}) → dictionary only.`);
    return [];
  }
}

(async () => {
  if (has('llm')) {
    // Feed the LLM the human-readable text regardless of input format.
    const plain = whisper
      ? JSON.parse(correctedText).segments.flatMap((s: any) => (s.words ?? []).map((w: any) => w.word)).join('').trim()
      : correctedText;
    changes.push(...(await llmPass(plain)));
  }

  const out = arg('out') ?? outDefault;
  const auditPath = out.replace(/(\.[^.]+)$/, '') + '.corrections.md';
  const byRule = new Map<string, number>();
  for (const c of changes) byRule.set(c.rule, (byRule.get(c.rule) ?? 0) + 1);
  const audit = [
    `# Caption corrections — ${path.basename(input!)}`,
    ``,
    `**${changes.length} fix${changes.length === 1 ? '' : 'es'}**` +
      (changes.length ? ` · ${[...byRule].map(([r, n]) => `${r}×${n}`).join(', ')}` : ''),
    ``,
    ...(changes.length
      ? ['| # | from → to | rule | context |', '|---|---|---|---|',
         ...changes.map((c) => `| ${c.i >= 0 ? c.i : '—'} | \`${c.from}\` → \`${c.to}\` | ${c.rule} | …${c.context}… |`)]
      : ['_No corrections needed._']),
    ``,
  ].join('\n');
  fs.writeFileSync(auditPath, audit);

  if (!dry) fs.writeFileSync(out, correctedText);
  console.log(
    `${changes.length} correction${changes.length === 1 ? '' : 's'} ` +
      `${changes.length ? `(${[...byRule].map(([r, n]) => `${r}:${n}`).join(', ')}) ` : ''}` +
      `→ audit ${path.relative(process.cwd(), auditPath)}${dry ? ' (dry, no output written)' : `, out ${path.relative(process.cwd(), out)}`}`
  );
})();
