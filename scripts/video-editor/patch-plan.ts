/**
 * patch-plan — revise an already-built plan.json by INSTRUCTION, not by hand-editing JSON.
 *
 * The team's working rule is "NO blind sed": every change to a plan must be a STRUCTURED,
 * diffable mutation you can review before you trust the cut (the same review.md / corrections.md
 * habit that runs through this pipeline). This turns an English instruction —
 *   "move the $400 callout 1s later", "drop the zoom at the APY reveal",
 *   "delete the caption at 12s", "shift the Sapphire section +2s"
 * — into ONE typed op {verb, targetType, selector, amount}, applies it to a COPY of the plan,
 * and writes:
 *   - plan.patched.json : the new plan (the original is never touched)
 *   - patch.md          : a readable before→after diff of exactly the entries that changed,
 *                          plus the time range that must be re-rendered.
 *
 * WHY a deterministic parser first (not "just ask the LLM"): the same five instruction shapes
 * recur, they must parse identically every run (zero-token, reviewable, offline-friendly), and
 * an ambiguous instruction should FAIL LOUDLY rather than silently mutate the wrong entry. The
 * optional `--llm` pass only kicks in when the deterministic parser can't form an op, and it is
 * constrained to emit the SAME {verb,targetType,selector,amount} shape — it never edits the plan
 * directly (mirrors correct-captions.ts's constrained `llmPass`). With no ANTHROPIC_API_KEY it
 * warns and degrades to the deterministic result, so the tool is still useful offline.
 *
 * The plan shapes this understands (from build-plan.ts / whisper-to-plan.ts):
 *   beats[]    : { order, t, end, section, ..., fx[], flags[] }     (fx may contain "zoom")
 *   sections[] : { t, name }
 *   captions[] : { t, end, text, impact? }
 *   callouts[] : { t, value, label, importance, chip? }            (importance:'reveal' ⇒ a zoom)
 *
 * Verbs:
 *   move / shift / retime  — change an entry's time (delta "+1s"/"-2s" or absolute "to 14s").
 *                            A section shift moves the section AND every beat tagged with it.
 *   delete                 — remove the matched entry from its array.
 *   disable / enable       — set / clear a `disabled: true` flag (non-destructive; the renderer
 *                            can skip a disabled entry without you losing it). For a `zoom` target
 *                            this drops / restores the "zoom" token in the owning beat's fx[].
 *
 * Selectors (how the target is found):
 *   VALUE   a $/%/K money or rate string  → matches a callout by .value (e.g. "$5,000", "73%", "100K")
 *   PHRASE  spoken words                    → resolved to a time via the Aligner (needs --transcript
 *                                             or --words), then matched to the nearest entry
 *   TIME    an explicit second ("at 12s")   → matches the entry whose .t is closest (±tolerance)
 *
 * Usage:
 *   npx tsx scripts/video-editor/patch-plan.ts --plan build/<slug>/plan.json \
 *     --instruction "move the \$5,000 callout +1s"
 *   # phrase selectors need word timings so a phrase can resolve to a second:
 *   npx tsx scripts/video-editor/patch-plan.ts --plan plan.json \
 *     --instruction "drop the zoom at the apy reveal" --words build/<slug>/cut-words.json
 *   # free-form wording the deterministic grammar can't parse:
 *   npx tsx scripts/video-editor/patch-plan.ts --plan plan.json \
 *     --instruction "could you nudge the four hundred dollar pop a touch later" --llm
 *
 *   --out PATH   output plan (default: <plan-dir>/plan.patched.json; patch.md beside it)
 *   --tol N      time-match tolerance in seconds for TIME/PHRASE selectors (default 2.0)
 *   --dry        parse + diff only; do NOT write plan.patched.json (patch.md is still written)
 */
import * as fs from 'node:fs';
import * as path from 'node:path';
import { parseTranscript, Aligner, type Word } from './lib/transcript';

// ── tiny CLI parsing (house style: manual process.argv, no arg lib for TS) ──────
function arg(name: string): string | undefined {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 ? process.argv[i + 1] : undefined;
}
const has = (name: string): boolean => process.argv.includes(`--${name}`);

// ── the structured op every parse (deterministic OR llm) must produce ───────────
type Verb = 'move' | 'delete' | 'disable' | 'enable';
type TargetType = 'callout' | 'caption' | 'section' | 'beat' | 'zoom';
type SelectorKind = 'value' | 'phrase' | 'time';

interface Selector {
  kind: SelectorKind;
  value?: string; // VALUE selector — the normalized money/rate string ("$5,000","73%","100K")
  phrase?: string; // PHRASE selector — spoken words to resolve via the Aligner
  time?: number; // TIME selector — an explicit second
}

interface Amount {
  delta?: number; // +N / -N seconds (move-by)
  absolute?: number; // "to N s" (move-to)
}

interface Op {
  verb: Verb;
  targetType: TargetType;
  selector: Selector;
  amount?: Amount; // only the move family carries an amount
  source: 'deterministic' | 'llm';
}

// ── plan typing (loose — we only touch the fields we understand) ────────────────
interface Entry {
  t?: number;
  end?: number;
  // callout
  value?: string;
  label?: string;
  importance?: string;
  // section
  name?: string;
  // beat
  section?: string;
  fx?: string[];
  beat?: string;
  // shared opt-in flag we add (never present in a freshly-built plan)
  disabled?: boolean;
  [k: string]: unknown;
}
interface Plan {
  meta?: Record<string, unknown>;
  beats?: Entry[];
  sections?: Entry[];
  captions?: Entry[];
  callouts?: Entry[];
  [k: string]: unknown;
}

// ── value normalization: make "$5,000" / "5000 dollars" / "five thousand" comparable ──
// We normalize a money/rate string the SAME way build-plan's callouts are tidied so a
// selector can match the stored .value. Callouts store tidied values like "$5K","100K","73%".
const SMALL: Record<string, number> = {
  zero: 0, one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10,
  eleven: 11, twelve: 12, thirteen: 13, fourteen: 14, fifteen: 15, sixteen: 16, seventeen: 17,
  eighteen: 18, nineteen: 19, twenty: 20, thirty: 30, forty: 40, fifty: 50, sixty: 60, seventy: 70,
  eighty: 80, ninety: 90,
};
const SCALE: Record<string, number> = { hundred: 100, thousand: 1000, k: 1000, grand: 1000, million: 1_000_000, m: 1_000_000 };

/** Parse "five thousand" / "four hundred" → 5000 / 400 (best-effort; undefined if not number-words). */
function wordsToNumber(text: string): number | undefined {
  const toks = text.toLowerCase().replace(/[^a-z ]+/g, ' ').split(/\s+/).filter(Boolean);
  let total = 0;
  let cur = 0;
  let saw = false;
  for (const t of toks) {
    if (t in SMALL) { cur += SMALL[t]; saw = true; }
    else if (t === 'hundred') { cur = (cur || 1) * 100; saw = true; }
    else if (t in SCALE) { total += (cur || 1) * SCALE[t]; cur = 0; saw = true; }
    else { /* non-number word resets the run so "four hundred dollar pop" still reads 400 */ if (saw && cur) { total += cur; cur = 0; } if (!saw) continue; }
  }
  total += cur;
  return saw && total > 0 ? total : undefined;
}

/** Render a raw amount to the tidy form callouts store ("$5,000"→"$5K", "100,000"→"100K"). */
function tidyValue(v: string): string {
  return v.toUpperCase().replace(/\.00$/, '').replace(/,000\b/, 'K');
}

/**
 * Canonicalize a value string into a comparison key. Both the selector value and each
 * stored callout .value are run through this, so "$5,000", "$5K", "5000 dollars" and
 * "five thousand" all collapse to the same key. Percents/rates keep their unit.
 */
function valueKey(raw: string): string | undefined {
  const s = raw.trim().toLowerCase();
  // percent / multiplier keep unit
  const pm = s.match(/(\d+(?:\.\d+)?)\s*%/);
  if (pm) return `${parseFloat(pm[1])}%`;
  const xm = s.match(/\b(\d+)\s*x\b/);
  if (xm) return `${parseInt(xm[1], 10)}x`;
  // explicit digits, with optional K/M and commas: "$5,000", "100k", "5000"
  const dm = s.match(/\$?\s*([\d,]+(?:\.\d+)?)\s*(k|m|grand|thousand|million|hundred)?/);
  if (dm && /\d/.test(dm[1])) {
    let n = parseFloat(dm[1].replace(/,/g, ''));
    const unit = dm[2];
    if (unit && unit in SCALE) n *= SCALE[unit];
    if (n > 0) return `$${n}`;
  }
  // number-words ("four hundred", "five thousand")
  const wn = wordsToNumber(s);
  if (wn !== undefined) return `$${wn}`;
  return undefined;
}

/** Turn a stored callout .value (already tidied, e.g. "$5K","100K","73%") into a comparison key. */
function calloutKey(stored: string): string | undefined {
  const s = stored.trim().toLowerCase();
  const pm = s.match(/(\d+(?:\.\d+)?)\s*%/);
  if (pm) return `${parseFloat(pm[1])}%`;
  const xm = s.match(/\b(\d+)\s*x\b/);
  if (xm) return `${parseInt(xm[1], 10)}x`;
  // "$5K" / "100K" / "$95"
  const dm = s.match(/\$?\s*([\d,]+(?:\.\d+)?)\s*(k|m)?/);
  if (dm && /\d/.test(dm[1])) {
    let n = parseFloat(dm[1].replace(/,/g, ''));
    if (dm[2] === 'k') n *= 1000;
    else if (dm[2] === 'm') n *= 1_000_000;
    if (n > 0) return `$${n}`;
  }
  return undefined;
}

// ── deterministic instruction parser ────────────────────────────────────────────
// Grammar (case-insensitive, order-tolerant):
//   <verb> [the] <targetType> [<selector>] [<amount>]
// recognizing:
//   verb        move|shift|retime|nudge|push  → move ;  delete|remove|drop|cut|kill → delete (or disable
//               for zoom/effect — see below) ; disable|turn off|mute → disable ; enable|turn on → enable
//   targetType  callout|chip|pop · caption|subtitle|line · section|chapter · beat · zoom|punch
//   selector    a $/%/K value · "at <N>s" · or the remaining words as a phrase
//   amount      "+Ns"/"-Ns"/"<N>s later|earlier" (delta) · "to <N>s" (absolute)
const VERB_RE: Array<{ re: RegExp; verb: Verb }> = [
  { re: /\b(move|shift|retime|nudge|push|slide|bump)\b/i, verb: 'move' },
  { re: /\b(delete|remove|drop|cut|kill|get rid of)\b/i, verb: 'delete' },
  { re: /\b(disable|turn off|switch off|mute|suppress|hide)\b/i, verb: 'disable' },
  { re: /\b(enable|turn on|switch on|unmute|restore|show)\b/i, verb: 'enable' },
];
const TYPE_RE: Array<{ re: RegExp; type: TargetType }> = [
  { re: /\b(zoom|punch[- ]?in|punch)\b/i, type: 'zoom' }, // checked first: "drop the zoom" ⇒ zoom, not a delete-callout
  { re: /\b(callout|chip|pop|reveal)\b/i, type: 'callout' },
  { re: /\b(caption|subtitle|sub|line|lower[- ]?third)\b/i, type: 'caption' },
  { re: /\b(section|chapter|segment)\b/i, type: 'section' },
  { re: /\bbeat\b/i, type: 'beat' },
];

function parseAmount(text: string): Amount | undefined {
  // absolute: "to 14s" / "to 14 seconds" / "at 14s" (only when paired with a move verb the caller checks)
  const abs = text.match(/\bto\s+([\d.]+)\s*(?:s|secs?|seconds?)\b/i);
  if (abs) return { absolute: parseFloat(abs[1]) };
  // signed delta: "+1s" / "-2s" / "+1.5 seconds"
  const signed = text.match(/([+-])\s*([\d.]+)\s*(?:s|secs?|seconds?)\b/i);
  if (signed) return { delta: (signed[1] === '-' ? -1 : 1) * parseFloat(signed[2]) };
  // directional delta (digit form): "1s later" / "2 seconds earlier" (spelled-out amounts like
  // "two seconds later" / "half a second" are not deterministic — use --llm for those).
  const worded = text.match(/([\d.]+)\s*(?:s|secs?|seconds?)\s+(later|earlier|sooner|forward|back|backward)/i);
  if (worded) {
    const dir = /later|forward/i.test(worded[2]) ? 1 : -1;
    return { delta: dir * parseFloat(worded[1]) };
  }
  return undefined;
}

function parseSelector(text: string, targetType?: string): Selector | undefined {
  // explicit TIME: "at 12s" / "at 12 seconds" (but NOT "at the apy reveal" — needs a digit)
  const timeM = text.match(/\bat\s+([\d.]+)\s*(?:s|secs?|seconds?)?\b/i);
  if (timeM) return { kind: 'time', time: parseFloat(timeM[1]) };
  // VALUE selectors only make sense for a callout/zoom — never read a number-word inside a caption/
  // section PHRASE ("…about one beautiful bank") as a $-value selector.
  const valueOk = targetType === undefined || targetType === 'callout' || targetType === 'zoom';
  if (valueOk) {
    // VALUE: a money/percent/rate token ($5,000 / 73% / 100k / 5x)
    const valM = text.match(/(\$\s*[\d,]+(?:\.\d+)?\s*(?:k|m)?|\b[\d,]+\s*(?:k|m|grand|thousand|million|percent)\b|\b\d+(?:\.\d+)?\s*%|\b\d+\s*x\b)/i);
    if (valM) {
      const key = valueKey(valM[1]);
      if (key) return { kind: 'value', value: key };
    }
    // worded number value: "the four hundred dollar callout" / "the five thousand callout"
    const wn = wordsToNumber(text);
    if (wn !== undefined) return { kind: 'value', value: `$${wn}` };
  }
  // PHRASE: strip the verb / type / structural words, keep the rest as spoken words to align.
  const phrase = text
    .replace(VERB_RE[0].re, ' ').replace(VERB_RE[1].re, ' ').replace(VERB_RE[2].re, ' ').replace(VERB_RE[3].re, ' ')
    .replace(/\b(callout|chip|pop|reveal|caption|subtitle|sub|line|lower[- ]?third|section|chapter|segment|beat|zoom|punch[- ]?in|punch)\b/gi, ' ')
    .replace(/\b(the|a|an|at|to|by|please|could you|can you|now|that|this|over|here|moment)\b/gi, ' ')
    .replace(/[+-]?\s*[\d.]+\s*(?:s|secs?|seconds?)\b/gi, ' ')
    .replace(/\b(later|earlier|sooner|forward|back|backward)\b/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  if (phrase.split(' ').filter(Boolean).length >= 1 && phrase.length >= 3) return { kind: 'phrase', phrase };
  return undefined;
}

function parseDeterministic(instruction: string): Op | undefined {
  const text = instruction.trim();
  const verbHit = VERB_RE.find((v) => v.re.test(text));
  const typeHit = TYPE_RE.find((t) => t.re.test(text));
  if (!verbHit || !typeHit) return undefined;
  let verb = verbHit.verb;
  const targetType = typeHit.type;

  // "drop / remove the zoom" reads as DISABLE the zoom (keep it removable+restorable), not a
  // hard delete of a plan array entry — a zoom is an fx token on a beat, not its own row.
  if (targetType === 'zoom' && verb === 'delete') verb = 'disable';

  const selector = parseSelector(text, targetType);
  if (!selector) return undefined;

  let amount: Amount | undefined;
  if (verb === 'move') {
    amount = parseAmount(text);
    if (!amount) return undefined; // a move with no amount is ambiguous → fail loudly
  }
  return { verb, targetType, selector, amount, source: 'deterministic' };
}

// ── optional constrained LLM parse (mirrors correct-captions.ts llmPass) ─────────
// Only used when the deterministic grammar can't form an op. Emits the SAME structured op
// (it never edits the plan). Needs ANTHROPIC_API_KEY; warns + returns undefined when unset.
async function llmParse(instruction: string): Promise<Op | undefined> {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) {
    console.warn('⚠ --llm requested but ANTHROPIC_API_KEY is unset → skipping LLM parse (deterministic only).');
    return undefined;
  }
  const prompt =
    'You convert ONE plain-English video-edit instruction into a strict JSON op. Do NOT explain. ' +
    'Schema: {"verb":"move|delete|disable|enable","targetType":"callout|caption|section|beat|zoom",' +
    '"selector":{"kind":"value|phrase|time","value":"<money/percent string e.g. $5,000 or 73%>",' +
    '"phrase":"<spoken words>","time":<seconds>},"amount":{"delta":<+/-seconds>,"absolute":<seconds>}}. ' +
    'Rules: include only ONE selector field matching kind. "amount" is required ONLY for verb "move" ' +
    '(use delta for "+1s/1s later/earlier", absolute for "to 14s"). "remove/drop the zoom" ⇒ verb "disable", ' +
    'targetType "zoom". A money amount in the instruction is the SELECTOR value, not the amount, unless it ' +
    'follows "to/by/+/-". Reply with JSON only.\n\nINSTRUCTION: ' +
    instruction;
  try {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-api-key': key, 'anthropic-version': '2023-06-01' },
      body: JSON.stringify({ model: 'claude-opus-4-8', max_tokens: 400, messages: [{ role: 'user', content: prompt }] }),
    });
    const data: any = await res.json();
    const txt = data?.content?.[0]?.text ?? '';
    const json = JSON.parse(txt.slice(txt.indexOf('{'), txt.lastIndexOf('}') + 1));
    if (!json.verb || !json.targetType || !json.selector?.kind) return undefined;
    const sel: Selector = { kind: json.selector.kind };
    if (sel.kind === 'value' && json.selector.value) sel.value = valueKey(String(json.selector.value)) ?? String(json.selector.value);
    else if (sel.kind === 'phrase') sel.phrase = String(json.selector.phrase ?? '');
    else if (sel.kind === 'time') sel.time = Number(json.selector.time);
    else return undefined;
    const op: Op = { verb: json.verb, targetType: json.targetType, selector: sel, source: 'llm' };
    if (json.amount && (json.amount.delta != null || json.amount.absolute != null)) {
      op.amount = {};
      if (json.amount.delta != null) op.amount.delta = Number(json.amount.delta);
      if (json.amount.absolute != null) op.amount.absolute = Number(json.amount.absolute);
    }
    if (op.verb === 'move' && !op.amount) return undefined;
    return op;
  } catch (e) {
    console.warn(`⚠ LLM parse failed (${(e as Error).message}) → deterministic only.`);
    return undefined;
  }
}

// ── load word timings (for PHRASE selectors → a second) ─────────────────────────
function loadWords(): Word[] | null {
  const tr = arg('transcript');
  const words = arg('words');
  const wnorm = (s: string) => s.toLowerCase().replace(/[''`]/g, '').replace(/[^a-z0-9$%]+/g, ' ').trim();
  try {
    if (words) {
      // cut-words.json: [{word, t0|start, ...}] (autocut format) — reuse the Aligner's Word shape.
      const cw = JSON.parse(fs.readFileSync(words, 'utf8')) as any[];
      return cw
        .map((w) => ({ text: wnorm(w.word ?? w.text ?? ''), raw: String(w.word ?? w.text ?? ''), t: Number(w.t0 ?? w.start ?? 0) }))
        .filter((w) => w.text);
    }
    if (tr) return parseTranscript(fs.readFileSync(tr, 'utf8')).words;
  } catch (e) {
    console.error(`✗ could not read ${words ? `--words ${words}` : `--transcript ${tr}`}: ${(e as Error).message}`);
    process.exit(1);
  }
  return null;
}

/** Resolve a PHRASE selector to a second via the Aligner, or null if no word timings supplied. */
function resolvePhrase(phrase: string, words: Word[] | null): { time: number; score: number; matched: string } | null {
  if (!words || !words.length) return null;
  const r = new Aligner(words).align(phrase);
  return { time: r.timeSec, score: r.score, matched: r.matchedText };
}

// ── target selection on the plan ────────────────────────────────────────────────
// Returns the array name + index of the entry the op targets, with a human reason.
type Located = { array: keyof Plan; index: number; why: string };

function arrayForType(t: TargetType): keyof Plan {
  switch (t) {
    case 'callout': return 'callouts';
    case 'caption': return 'captions';
    case 'section': return 'sections';
    case 'beat': return 'beats';
    case 'zoom': return 'beats'; // a zoom lives in a beat's fx[] (or is a 'reveal' callout)
  }
}

function locate(plan: Plan, op: Op, words: Word[] | null, tol: number): Located {
  const arrName = arrayForType(op.targetType);
  const arr = (plan[arrName] as Entry[] | undefined) ?? [];
  if (!arr.length) throw new Error(`plan has no ${String(arrName)}[] to target`);

  // SECTION shortcut: a section can be selected by NAME, which is stored IN the plan — so
  // "shift the Sapphire section -2s" needs no transcript. A phrase/value selector here is
  // matched against the section names first (substring, case-insensitive); only if that
  // misses do we fall through to time/phrase-by-second resolution below.
  if (op.targetType === 'section') {
    const needle = (op.selector.phrase ?? op.selector.value ?? '').toLowerCase().trim();
    if (needle && op.selector.kind !== 'time') {
      const hits = arr
        .map((e, i) => ({ e, i }))
        .filter((x) => String(x.e.name ?? '').toLowerCase().includes(needle));
      if (hits.length === 1) return { array: arrName, index: hits[0].i, why: `section name ~"${needle}" → sections[${hits[0].i}] "${hits[0].e.name}" @ ${hits[0].e.t}s` };
      if (hits.length > 1)
        throw new Error(`"${needle}" matches ${hits.length} sections (${hits.map((h) => `"${h.e.name}"`).join(', ')}); be more specific`);
      // no name hit — fall through (maybe the selector is a time, or a phrase to align)
    }
  }

  // VALUE selector → match a callout by canonical value.
  if (op.selector.kind === 'value') {
    if (op.targetType !== 'callout' && op.targetType !== 'zoom')
      throw new Error(`a value selector ("${op.selector.value}") only matches a callout, not a ${op.targetType}`);
    const want = op.selector.value!;
    const hits = arr
      .map((e, i) => ({ e, i, key: calloutKey(String(e.value ?? '')) }))
      .filter((x) => x.key === want);
    if (!hits.length) {
      const avail = arr.map((e) => e.value).filter(Boolean).join(', ');
      throw new Error(`no ${op.targetType} with value ${want} (have: ${avail || 'none'})`);
    }
    if (hits.length > 1)
      throw new Error(`value ${want} matches ${hits.length} callouts (at ${hits.map((h) => h.e.t + 's').join(', ')}); add "at <N>s" to disambiguate`);
    return { array: arrName, index: hits[0].i, why: `value ${want} → ${String(arrName)}[${hits[0].i}] @ ${hits[0].e.t}s` };
  }

  // resolve TIME / PHRASE selectors to a target second.
  let targetSec: number;
  let how: string;
  if (op.selector.kind === 'time') {
    targetSec = op.selector.time!;
    how = `time ${targetSec}s`;
  } else {
    const r = resolvePhrase(op.selector.phrase!, words);
    if (!r)
      throw new Error(`phrase selector "${op.selector.phrase}" needs word timings — pass --words <cut-words.json> or --transcript <md>`);
    if (r.score < 0.3)
      throw new Error(`phrase "${op.selector.phrase}" did not resolve confidently (best ${(r.score * 100).toFixed(0)}% at ${r.time}s: "${r.matched}")`);
    targetSec = r.time;
    how = `phrase "${op.selector.phrase}" → ${targetSec}s (${(r.score * 100).toFixed(0)}%, "${r.matched}")`;
  }

  // pick the entry whose .t is closest to the target second. For a zoom, only consider
  // beats that actually carry a zoom (fx contains "zoom") or 'reveal' callouts.
  let pool = arr.map((e, i) => ({ e, i }));
  if (op.targetType === 'zoom' && op.verb !== 'enable') {
    // For move/disable a zoom must already exist on a beat; for ENABLE we add one to the
    // nearest beat (which by definition does NOT yet carry a zoom), so keep the full pool.
    pool = pool.filter((x) => Array.isArray(x.e.fx) && (x.e.fx as string[]).includes('zoom'));
    if (!pool.length) throw new Error(`no beat carries a zoom near ${how}`);
  }
  let best = pool[0];
  let bestDt = Math.abs((best.e.t ?? 0) - targetSec);
  for (const x of pool) {
    const dt = Math.abs((x.e.t ?? 0) - targetSec);
    if (dt < bestDt) { best = x; bestDt = dt; }
  }
  if (bestDt > tol)
    throw new Error(`closest ${op.targetType} to ${how} is ${bestDt.toFixed(2)}s away (> tol ${tol}s) — raise --tol or use a value/at selector`);
  return { array: arrName, index: best.i, why: `${how} → ${String(arrName)}[${best.i}] @ ${best.e.t}s (Δ${bestDt.toFixed(2)}s)` };
}

// ── apply the op to a COPY; return a diff record of every entry touched ──────────
interface DiffRow { array: string; index: number; field: string; before: unknown; after: unknown; }

function applyOp(plan: Plan, op: Op, loc: Located): { diffs: DiffRow[]; affected: [number, number] } {
  const diffs: DiffRow[] = [];
  const arr = plan[loc.array] as Entry[];
  const target = arr[loc.index];
  let lo = (target.t ?? 0);
  let hi = (target.end ?? target.t ?? 0);

  const record = (e: Entry, idx: number, field: string, before: unknown, after: unknown) => {
    if (before !== after) diffs.push({ array: String(loc.array), index: idx, field, before, after });
  };

  if (op.verb === 'move') {
    const oldT = target.t ?? 0;
    // clamp to >= 0 so an over-large move never writes a negative time into the plan (invalid downstream).
    const newT = Math.max(0, op.amount?.absolute != null ? op.amount.absolute : +(oldT + (op.amount?.delta ?? 0)).toFixed(2));
    const shift = +(newT - oldT).toFixed(4);

    if (op.targetType === 'section') {
      // A section move carries its tagged beats with it so the spine stays aligned.
      const name = target.name;
      record(target, loc.index, 't', target.t, +newT.toFixed(2));
      target.t = +newT.toFixed(2);
      lo = Math.min(lo, newT); hi = Math.max(hi, oldT, newT);
      (plan.beats as Entry[] | undefined)?.forEach((b, bi) => {
        if (b.section === name) {
          const nt = Math.max(0, +((b.t ?? 0) + shift).toFixed(2));
          const ne = b.end != null ? Math.max(nt, +((b.end ?? 0) + shift).toFixed(2)) : b.end;
          record(b, bi, 'beats.t', b.t, nt);
          if (b.end != null) record(b, bi, 'beats.end', b.end, ne);
          lo = Math.min(lo, b.t ?? nt, nt); hi = Math.max(hi, b.end ?? b.t ?? nt, ne ?? nt);
          b.t = nt; if (b.end != null) b.end = ne;
        }
      });
    } else {
      record(target, loc.index, 't', target.t, +newT.toFixed(2));
      lo = Math.min(lo, newT); hi = Math.max(hi, oldT, newT);
      target.t = +newT.toFixed(2);
      // keep an entry's duration when it has an end (captions/beats), shifting end with t.
      if (target.end != null) {
        const ne = +((target.end ?? 0) + shift).toFixed(2);
        record(target, loc.index, 'end', target.end, ne);
        hi = Math.max(hi, target.end ?? ne, ne);
        target.end = ne;
      }
    }
  } else if (op.verb === 'delete') {
    diffs.push({ array: String(loc.array), index: loc.index, field: '(row)', before: shallow(target), after: '(deleted)' });
    arr.splice(loc.index, 1);
  } else if (op.verb === 'disable' || op.verb === 'enable') {
    if (op.targetType === 'zoom') {
      // toggle the "zoom" token in the owning beat's fx[] (disable removes, enable restores).
      const fx = Array.isArray(target.fx) ? [...(target.fx as string[])] : [];
      const had = fx.includes('zoom');
      const next = op.verb === 'disable' ? fx.filter((x) => x !== 'zoom') : had ? fx : [...fx, 'zoom'];
      record(target, loc.index, 'fx', JSON.stringify(target.fx ?? []), JSON.stringify(next));
      target.fx = next;
    } else {
      const want = op.verb === 'disable' ? true : undefined;
      record(target, loc.index, 'disabled', target.disabled ?? false, want ?? false);
      if (want) target.disabled = true;
      else delete target.disabled;
      // NB: `disabled` is a MARKER — the renderers (build_resolve / preview-full / render-cards) don't
      // skip it yet, so re-rendering won't drop it until they're taught to honor it. Surfaced so the
      // change is reviewable, not silently ineffective.
      console.warn(`  ⚠ set "disabled" on ${op.targetType} — note: no renderer skips disabled entries yet (marker only).`);
    }
  }

  return { diffs, affected: [+Math.max(0, lo - 0.5).toFixed(2), +(hi + 0.5).toFixed(2)] };
}

/** A compact one-line view of an entry for the delete-diff (don't dump every field). */
function shallow(e: Entry): string {
  const bits: string[] = [];
  for (const k of ['t', 'end', 'value', 'label', 'text', 'name', 'beat', 'section']) if (e[k] != null) bits.push(`${k}=${JSON.stringify(e[k])}`);
  return `{ ${bits.join(', ')} }`;
}

// ── patch.md writer (the reviewable before→after diff) ──────────────────────────
function fmt(s: number): string { return `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`; }

function writePatchMd(
  mdPath: string, planPath: string, instruction: string, op: Op, loc: Located,
  diffs: DiffRow[], affected: [number, number], outPath: string, dry: boolean
): void {
  const rows = diffs.length
    ? ['| array | # | field | before | after |', '|---|---|---|---|---|',
       ...diffs.map((d) => `| ${d.array} | ${d.index} | ${d.field} | \`${JSON.stringify(d.before)}\` | \`${JSON.stringify(d.after)}\` |`)]
    : ['_No fields changed (the target already matched the requested state)._'];
  const md = [
    `# Plan patch — ${path.basename(planPath)}`,
    ``,
    `**Instruction:** ${instruction}`,
    ``,
    `**Parsed op** (${op.source}): \`${op.verb}\` a \`${op.targetType}\` — selector ` +
      `\`${op.selector.kind}=${op.selector.value ?? op.selector.phrase ?? op.selector.time + 's'}\`` +
      (op.amount ? ` · amount \`${op.amount.absolute != null ? `to ${op.amount.absolute}s` : `${op.amount.delta! >= 0 ? '+' : ''}${op.amount.delta}s`}\`` : ''),
    ``,
    `**Located:** ${loc.why}`,
    ``,
    `**Changes (${diffs.length}):**`,
    ``,
    ...rows,
    ``,
    `**Re-render this range:** ${fmt(affected[0])}–${fmt(affected[1])} (${affected[0]}s–${affected[1]}s).`,
    `Only segments overlapping this window need re-rendering (build-broll.py re-renders per segment).`,
    ``,
    dry ? `_Dry run: ${path.basename(outPath)} was NOT written._` : `Patched plan → \`${path.basename(outPath)}\``,
    ``,
  ].join('\n');
  fs.writeFileSync(mdPath, md);
}

// ── main ────────────────────────────────────────────────────────────────────────
(async () => {
  const planPath = arg('plan');
  const instruction = arg('instruction');
  if (!planPath || !instruction) {
    console.error('usage: tsx patch-plan.ts --plan <plan.json> --instruction "<...>" [--words cut-words.json | --transcript md] [--llm] [--out PATH] [--tol N] [--dry]');
    process.exit(1);
  }
  const tol = parseFloat(arg('tol') ?? '2.0');
  if (!Number.isFinite(tol) || tol < 0) { console.error('✗ --tol must be a non-negative number'); process.exit(1); }
  const dry = has('dry');
  const outPath = arg('out') ?? path.join(path.dirname(planPath), 'plan.patched.json');
  const mdPath = path.join(path.dirname(outPath), 'patch.md');

  let plan: Plan;
  try {
    plan = JSON.parse(fs.readFileSync(planPath, 'utf8'));
  } catch (e) {
    console.error(`✗ could not read --plan ${planPath}: ${(e as Error).message}`);
    process.exit(1);
  }
  // deep copy so the original plan is byte-for-byte untouched (we only ever write the patched copy).
  const patched: Plan = JSON.parse(JSON.stringify(plan));
  const words = loadWords();

  // 1) deterministic parse first (zero-token, reviewable).
  let op = parseDeterministic(instruction);
  // 2) only fall back to the LLM if asked AND the grammar couldn't form an op.
  if (!op && has('llm')) op = await llmParse(instruction);
  if (!op) {
    console.error(
      `✗ could not parse instruction deterministically: "${instruction}"\n` +
      `  need a verb (move/shift/delete/disable/enable) + target (callout/caption/section/beat/zoom) + a selector` +
      (has('llm') ? '' : '\n  (try --llm with ANTHROPIC_API_KEY set for free-form wording)')
    );
    process.exit(2);
  }

  // 3) locate + apply on the COPY.
  let loc: Located;
  try {
    loc = locate(patched, op, words, tol);
  } catch (e) {
    console.error(`✗ ${(e as Error).message}`);
    process.exit(3);
  }
  const { diffs, affected } = applyOp(patched, op, loc);

  // refresh meta counts if present (keeps a built plan's meta honest after a delete).
  if (patched.meta) {
    if (patched.beats) (patched.meta as any).beats = patched.beats.length;
    if (patched.captions) (patched.meta as any).captions = patched.captions.length;
    if (patched.callouts) (patched.meta as any).callouts = patched.callouts.length;
    if (patched.sections) (patched.meta as any).sections = patched.sections.length;
  }

  writePatchMd(mdPath, planPath, instruction, op, loc, diffs, affected, outPath, dry);
  if (!dry) fs.writeFileSync(outPath, JSON.stringify(patched, null, 2));

  console.log(
    `✓ ${op.source} op: ${op.verb} ${op.targetType} [${op.selector.kind}=${op.selector.value ?? op.selector.phrase ?? op.selector.time + 's'}]` +
      (op.amount ? ` ${op.amount.absolute != null ? `to ${op.amount.absolute}s` : `${op.amount.delta! >= 0 ? '+' : ''}${op.amount.delta}s`}` : '')
  );
  console.log(`  ${loc.why}`);
  console.log(`  ${diffs.length} field change(s) → patch.md ${path.relative(process.cwd(), mdPath)}`);
  console.log(`  re-render ${fmt(affected[0])}–${fmt(affected[1])} (${affected[0]}s–${affected[1]}s)` +
    (dry ? ' · DRY (plan.patched.json not written)' : ` → ${path.relative(process.cwd(), outPath)}`));
})();
