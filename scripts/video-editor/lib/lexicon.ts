/**
 * lexicon — fix Whisper's domain mis-hearings BEFORE they reach captions/SRT.
 *
 * Whisper reliably garbles finance vocabulary in ways that look terrible burned
 * into a caption: it writes "city" for Citi, "built" for Bilt, "beehive" for
 * Beehiiv, lowercases "sofi/amex/apy". This module is the deterministic,
 * zero-token corrector — high precision by design:
 *
 *   SAFE        always applied (a casing/spelling fix that's never wrong in his
 *               content): "sofi" → "SoFi", "amex" → "Amex", "apy" → "APY".
 *   CONTEXTUAL  applied only when a finance context word sits within ±CTX_WIN
 *               tokens (so the *place* "city" and the *verb* "built" survive,
 *               but "city double cash" / "built rewards card" get corrected).
 *
 * Everything it changes is returned as an auditable `Change[]` — never silently
 * rewritten. An optional LLM pass (see correct-captions.ts) layers on top but is
 * constrained to the same exact-token, audited shape.
 */

export interface Change {
  i: number; // word index (or char offset for text mode)
  from: string;
  to: string;
  rule: string; // which lexicon entry fired (for the audit)
  context: string; // a few surrounding words
}

interface SafeRule {
  re: RegExp; // matched against a single token (no surrounding ctx)
  to: string | ((m: RegExpMatchArray) => string);
  rule: string;
}

interface CtxRule extends SafeRule {
  ctxOnly: true; // requires a CONTEXT_WORDS hit nearby
}

// A token is "near finance" if one of these appears within CTX_WIN tokens.
export const CONTEXT_WORDS =
  /^(card|cards|bank|banks|account|accounts|checking|savings|bonus|bonuses|points|miles|cash|cashback|rewards|reward|credit|debit|annual|fee|apr|apy|sub|signup|churn|churning|transfer|statement|deposit|hysa|double|customized|venture|sapphire|ink|preferred|reserve|platinum|gold)$/i;
const CTX_WIN = 4;

// ── SAFE: casing / spelling fixes that are correct unconditionally ────────────
const SAFE: SafeRule[] = [
  { re: /^sofi$/i, to: 'SoFi', rule: 'brand:SoFi' },
  { re: /^so-?fi$/i, to: 'SoFi', rule: 'brand:SoFi' },
  { re: /^beehi+ve?$/i, to: 'Beehiiv', rule: 'brand:Beehiiv' }, // "beehive"/"beehiv"
  { re: /^bee-?hive$/i, to: 'Beehiiv', rule: 'brand:Beehiiv' },
  { re: /^amex$/i, to: 'Amex', rule: 'brand:Amex' },
  { re: /^apy$/i, to: 'APY', rule: 'acronym:APY' },
  { re: /^apr$/i, to: 'APR', rule: 'acronym:APR' },
  { re: /^hysa$/i, to: 'HYSA', rule: 'acronym:HYSA' },
  { re: /^sub$/i, to: 'SUB', rule: 'acronym:SUB' }, // sign-up bonus
  { re: /^ur$/i, to: 'UR', rule: 'acronym:UR' },
  { re: /^mr$/i, to: 'MR', rule: 'acronym:MR' },
  { re: /^venturex$/i, to: 'Venture X', rule: 'brand:VentureX' },
  { re: /^chase$/i, to: 'Chase', rule: 'brand:Chase' },
  { re: /^varo$/i, to: 'Varo', rule: 'brand:Varo' },
  { re: /^chime$/i, to: 'Chime', rule: 'brand:Chime' }, // only literal sense is rare in his content
  { re: /^wealthfront$/i, to: 'Wealthfront', rule: 'brand:Wealthfront' },
  { re: /^usaa$/i, to: 'USAA', rule: 'brand:USAA' },
  // number tidies
  { re: /^(\d{2,3})k$/i, to: (m) => `${m[1]}K`, rule: 'num:K' }, // "100k" → "100K"
];

// ── CONTEXTUAL: only when a finance context word is nearby ───────────────────
const CONTEXTUAL: CtxRule[] = [
  { re: /^city$/i, to: 'Citi', rule: 'brand:Citi', ctxOnly: true }, // the #1 offender
  { re: /^citi$/i, to: 'Citi', rule: 'brand:Citi', ctxOnly: true },
  { re: /^built$/i, to: 'Bilt', rule: 'brand:Bilt', ctxOnly: true },
  { re: /^bill$/i, to: 'Bilt', rule: 'brand:Bilt', ctxOnly: true },
  { re: /^current$/i, to: 'Current', rule: 'brand:Current', ctxOnly: true },
  { re: /^sapphire$/i, to: 'Sapphire', rule: 'brand:Sapphire', ctxOnly: true },
  { re: /^ink$/i, to: 'Ink', rule: 'brand:Ink', ctxOnly: true },
  { re: /^discover$/i, to: 'Discover', rule: 'brand:Discover', ctxOnly: true },
];

const apply = (to: SafeRule['to'], m: RegExpMatchArray): string =>
  typeof to === 'function' ? to(m) : to;

/** Strip surrounding punctuation but remember it, so we can re-attach after fix. */
function splitAffix(raw: string): { pre: string; core: string; post: string } {
  const m = raw.match(/^([^A-Za-z0-9$%]*)(.*?)([^A-Za-z0-9$%]*)$/s);
  return m ? { pre: m[1], core: m[2], post: m[3] } : { pre: '', core: raw, post: '' };
}

/**
 * Correct a stream of `{raw}` words in place-safe fashion: returns NEW word
 * objects (raw fixed, text re-lowercased) plus the list of changes. Pure.
 */
export function correctWords<T extends { raw: string }>(
  words: T[],
  opts: { contextual?: boolean } = {}
): { words: (T & { text: string })[]; changes: Change[] } {
  const useCtx = opts.contextual !== false;
  const out: (T & { text: string })[] = [];
  const changes: Change[] = [];

  // A finance word counts as context only if it's in the SAME sentence — a term
  // from an adjacent sentence must not bleed across (else "I love the city at
  // night." after a card sentence wrongly becomes "Citi").
  const endsSentence = (raw: string): boolean => /[.!?](["')\]]*)$/.test(raw.trim());
  const nearContext = (i: number): boolean => {
    // backward: stop at the previous sentence's terminal word (don't count it)
    for (let k = i - 1; k >= Math.max(0, i - CTX_WIN); k--) {
      if (endsSentence(words[k].raw)) break;
      if (CONTEXT_WORDS.test(splitAffix(words[k].raw).core)) return true;
    }
    // forward: a terminal word still belongs to i's sentence (count it, then stop)
    for (let k = i + 1; k <= Math.min(words.length - 1, i + CTX_WIN); k++) {
      if (CONTEXT_WORDS.test(splitAffix(words[k].raw).core)) return true;
      if (endsSentence(words[k].raw)) break;
    }
    return false;
  };

  for (let i = 0; i < words.length; i++) {
    const { pre, core, post } = splitAffix(words[i].raw);
    let fixed = core;
    let rule = '';

    for (const r of SAFE) {
      const m = core.match(r.re);
      if (m) {
        fixed = apply(r.to, m);
        rule = r.rule;
        break;
      }
    }
    if (!rule && useCtx && nearContext(i)) {
      for (const r of CONTEXTUAL) {
        const m = core.match(r.re);
        if (m) {
          fixed = apply(r.to, m);
          rule = r.rule;
          break;
        }
      }
    }

    if (rule && fixed !== core) {
      const ctx = words
        .slice(Math.max(0, i - 2), i + 3)
        .map((w) => w.raw)
        .join(' ');
      changes.push({ i, from: words[i].raw, to: pre + fixed + post, rule, context: ctx });
    }
    out.push({ ...words[i], raw: pre + fixed + post, text: (pre + fixed + post).toLowerCase() });
  }
  return { words: out, changes };
}

/** Same corrector over a plain string (Descript transcript / SRT cue text). */
export function correctText(s: string, opts: { contextual?: boolean } = {}): { text: string; changes: Change[] } {
  // Tokenize on whitespace, keep the exact spacing so we can rejoin losslessly.
  const tokens = s.split(/(\s+)/); // even idx = word, odd = whitespace
  const wordRefs: { raw: string }[] = [];
  const map: number[] = []; // wordRefs idx → tokens idx
  for (let t = 0; t < tokens.length; t += 2) {
    wordRefs.push({ raw: tokens[t] });
    map.push(t);
  }
  const { words, changes } = correctWords(wordRefs, opts);
  for (let w = 0; w < words.length; w++) tokens[map[w]] = words[w].raw;
  return { text: tokens.join(''), changes };
}
