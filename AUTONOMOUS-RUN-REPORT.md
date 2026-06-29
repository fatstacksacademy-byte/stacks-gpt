# Autonomous Card + Bank Data Run — 2026-06-20

Scope requested: (1) verify/audit/triage all card + bank data site-wide, (2) an
independent second pass that fixes the findings, (3) a meta-audit to make the
verification more accurate while using fewer tokens, (4) the same (run + audit)
for the new-card / new-bonus discovery pipelines.

Status: **COMPLETE.** All four asks delivered. 5 data fixes applied and
build-verified; everything uncertain is documented for your review below.

---

## 0. TL;DR

- Audited all four data pipelines (`verify-cards`, `verify-bonuses`,
  `discover-cards`, `discover-bonuses`) → **62 concrete findings**.
- Shipped **14 safe fixes** that make verification more accurate *and* cheaper.
  `tsc` clean; 341/342 unit tests pass (the 1 failure is a pre-existing
  `lib/trackBonus` mock issue, unrelated to this work).
- Ran a clean authoritative verification of **1,103 cards** and **266 bank
  bonuses** → 549 + 64 proposed edits, triaged below.
- **Critical**: the raw verifier wanted to make data-corrupting edits — e.g.
  downgrade **CSP 100k→75k**, mark the **Chase RAF / Amex affiliate links
  "dead"**, zero out a **$4.95 BofA fee**, *upgrade* **Venture X 75k→100k**.
  These are exactly why I added guards and routed everything through an
  independent Pass-2 instead of auto-applying.
- Discovery surfaced new candidates: **29 card proposals** + **16 new bonus
  leads** (queued for review, not auto-applied).

---

## 1. What ran

| Step | Tool | Result |
|---|---|---|
| Meta-audit | Workflow (9 agents) | 62 findings, prioritized roadmap |
| Pipeline fixes | 6 files + package.json | 14 fixes, validated |
| Verify cards | `verify:cards` (clean) | 1,103 cards, 21 min |
| Verify bonuses | `verify:bonuses` (clean) | 266 bonuses, 12 min |
| Discover cards | `discover:cards` | 29 proposals |
| Discover bonuses | `discover:bonuses` | 16 new leads, queue=100 |
| Independent Pass-2 | Workflow (124 candidates) | see §4 |

---

## 2. Meta-audit of the pipelines (ask #3 + #4-audit)

Root cause shared by all four pipelines: **"largest/first plausible number
wins" extraction with no card-context anchoring and no unit awareness.** That
both ships wrong data and wastes LLM escalation budget re-litigating regex
artifacts.

### Fixes implemented this run (safe, validated)

**Accuracy (stops shipping wrong data):**
1. `verify-cards`: cross-host redirect now compares **registrable domain (eTLD+1)
   + allowlist** instead of full host — stops flagging the canonical Chase RAF
   (`referyourchasecard.com`) and Amex apply links as "dead". *(protects
   monetized links)*
2. `verify-cards`: **elevated-offer guard** in `compareCard` — reads
   `card.elevated` / `card.standard_bonus_amount`; when the page shows the
   standard bonus it no longer proposes downgrading the stored elevated value.
   *(protects CSP 100k and the 6 other elevated cards)*
3. `verify-cards`: **free-night guard** — never auto-downgrades hotel free-night
   cards (synthetic stored value vs lower page points cap).
4. `verify-cards`: **+~195 cards now extractable** — added branded
   hotel/airline currencies (Hilton Honors, Bonvoy, Hyatt, IHG, SkyMiles,
   AAdvantage, Avios, TrueBlue, MileagePlus, Rapid Rewards…) and standard
   "$X cash back after you spend" / statement-credit phrasing.
5. `verify-bonuses`: **monthly-fee corruption guard** — drops implausible
   "fees" > $50 (funding-cap/threshold columns), applies the waiver filter to
   the `$X monthly fee` pattern, and recognizes "Monthly fees: None". *(the path
   that once wrote a $500 fee into `lib/data`)*
6. `discover-cards`: **directional dedup** — stops suppressing legitimate new
   variants ("Capital One Venture X" was dropped by "Capital One Venture").
7. `discover-cards`: fixed a **dead auto-apply safety guard**
   (`includes("issuer_fetch_failed")` never matched the colon-suffixed flag).
8. `discover-bonuses`: fixed the **truncating amount regex** ("$5000"→500) and
   added a ≥$25 plausibility floor (no more $5/$42 junk leads).
9. `triage-edits`: **widened the conditional-fee keyword set** so fee→$0 edits
   with any waiver/either-or language never auto-route to SAFE.

**Token efficiency (fewer calls, same/better accuracy):**
10. `verify-bonuses`: **skip escalation for null-stored fields** — these were
    ~77% of escalations and are unanswerable by the model (catalog gap, not
    drift). They now surface in `needs-review` as a free proposed fill.
11. `discover-bonuses`: **skip Claude classify** for items with no title amount
    hint *before* calling it (they were classified then discarded).
12. `discover-bonuses`: classify call now returns a **single verdict token**
    (`max_tokens` 100→8; reasoning was never consumed) ≈ 80% output-token cut.
13. `verify-cards`: cache-hit `verifiedAt` now reflects the actual fetch time
    (fixes a misleading "verified just now" freshness badge on stale cache).
14. `package.json`: removed the `|| <same command>` retry on both verify scripts
    — any non-zero exit previously re-paid the entire escalation budget.

### Recommended next (structural — NOT auto-applied; needs your call)

- **Card-context-scoped extraction** in both extractors: prefer candidates near
  the card-name/offer block; reject those near comparison/redemption/referral
  cues. Single highest-ROI change (cuts wrong-data *and* escalations).
- **Unit-aware end-to-end**: pass `bonus_currency`/`reward_currency_type` into
  extraction + compare via `lib/cardCurrencyType.ts`; tag discovery leads
  points-vs-USD so a 100k-point SUB never lands in a dollar field.
- **Second-source consensus for `verify-cards`** before any numeric edit
  (`verify-bonuses` already has it; cheap version: cross-check
  `public_offer_link`).
- **Batch escalations per record** and rank by value-at-stake (currently
  one-call-per-field, consumed alphabetically).
- **Persist `htmlHash` + raise cache TTL**: skip extract+escalate on unchanged
  pages (hash is computed today but dropped).
- **discover-cards**: infer `card_type` (business/Ink) + `is_hotel_card` from
  the slug instead of hardcoding personal/false (corrupts 5/24 math on import).

---

## 3. Verification results — Pass 1 (ask #1: verify / audit / triage)

### Cards — 1,103 verified (creditCardBonuses + Hawaii + regional states)

| Signal | Count |
|---|---|
| ✅ OK (page + all fields matched) | 63 |
| ⚠️ Field mismatch | 187 |
| ↪️ Redirected (cross-domain) | 83 |
| 🚩 Wrong page (card name absent) | 32 |
| 🧩 No fields extracted (SPA / layout) | 122 |
| 🚨 Fetch error / timeout | 75 |
| 📝 Proposed edits | **549** |

Proposed-edit field split: bonus_amount 155, annual_fee 88, min_spend 61,
spend_months 8, page-signal ("expired or offer_link") 237.

**Catalog preflight (data-quality, independent of fetch): 227 card warnings** —
`balance_transfer_fee_missing` 171, `positive_bonus_zero_spend` 46,
`duplicate_active_offer_url` 10.

### Bank bonuses — 266 verified (bonuses + savings)

| Signal | Count |
|---|---|
| ✅ OK | 122 |
| ⚠️ Mismatch | 45 |
| ❓ Ambiguous | 71 |
| 🪦 Dead | 6 |
| 🚨 Fetch error | 22 |
| Consensus agree / disagree | 50 / 32 |
| 📝 Proposed edits | **64** |

Proposed-edit split: bonus_amount 24, deposit_window_days 16, monthly_fee 14,
min_direct_deposit_total 5, expired 5.

**Bonus preflight: 67 warnings** — `generic_sources_only` 64,
`active_expiration_in_past` 2, `stale_deadline_in_copy` 1. Notable:
`us-bank-smartly-checking-450-2026` expired 2026-06-18 but is still marked
active (real bug — flag for expiry).

### Triage tiers

- **Tier 1 — verify then fix (→ Pass-2, §4):** 124 high-impact records (60
  mainstream-issuer / pick / big-bonus card edits incl. all 6 June picks; all 64
  bonus edits).
- **Tier 2 — human review (report only):** redirected/no-fields/fetch-error
  pages, regional/CU long tail, 71 ambiguous bonuses. Mostly page-parse issues
  on SPA / credit-union sites, not catalog errors.
- **Tier 3 — systematic preflight:** the 227 card + 67 bonus warnings; many
  `balance_transfer_fee_missing` are real gaps worth a batch backfill.

---

## 4. Independent Pass-2 + applied fixes (ask #2)

124 candidates were independently re-verified with WebFetch/WebSearch (a
different methodology than the Playwright-regex pipeline) and each
edit-worthy conclusion was adversarially refuted before being trusted →
**20 "apply-now" + 104 "needs-human"**. I then hand-reviewed all 20 (Pass-2
itself made unit errors — see below) and applied only the **5** that are
clearly correct, low-risk, and issuer-verified.

### Pass-2 caught the verifier's dangerous false positives
The whole point of the independent pass — these were proposed by `verify-cards`
and would have corrupted the catalog if auto-applied:
- **CSP** `bonus_amount 100000` + `min_spend 5000` → **stored_correct** (rejected
  the bogus 5000→6000; the 100k all-time-high is preserved).
- **Venture X** `bonus_amount 75000` → **stored_correct** (rejected 75k→100k; VX
  stays 75k, per your standing note).
- **Amex Gold** `annual_fee 325` → **stored_correct** (rejected 325→0).
- **93 of 104** needs-human items were verifier false positives
  ("stored_correct") — i.e. the raw 549/64 edit lists are mostly noise.

### Applied — 5 fixes (build-verified, `npm run build` exit 0)
| id | file | change | evidence |
|---|---|---|---|
| `us-bank-smartly-checking-450-2026` | bonuses.ts | + `expired: true` | $450 tier ran Apr 9–Jun 18 2026 (past); record already had `expiration_date 2026-06-18`; DoC + preflight confirm |
| `bcu-500-powerplus-checking-2026` | bonuses.ts | + `expired: true` | promo BOOST ended 5/15/2026; DoC [Expired]; no successor |
| `arizona-financial-cu-300-checking-2026` | stateBankBonuses.ts | `amount 300→200` | issuer page shows $200 (promo FREE2026); record's own `reqText` already says $200 is the top tier |
| `together-cu-300-checking-2026` | stateBankBonuses.ts | `amount 300→200` | issuer + DoC confirm $200 ($50+$150); no source supports $300 |
| `sunward-slfcu-200-checking-2026` | stateBankBonuses.ts | + `expired: true` | offer ended 7/31/2025; absent from DoC June-2026 active list |

### Deferred to you — high-value but needs judgment (NOT applied)
- ~~**Barclays Wyndham June-17-2026 refresh**~~ ✅ **DONE (PR #10)** — re-verified
  via official PR + DoC + Frequent Miler + USCCG and applied: Earner $0/75K,
  Earner+ $95/100K, Earner Business $149/100K, + new **Earner Premier** $395/120K.
- **PNC Points Visa** `bonus_amount 100000→50000` (PNC.com + bankbonus.com say
  50k; confirm points-vs-value first).
- **KeyBank $500** `monthly_fee 0→25` (Key Select Checking $25, waivable).
- **Flagstar $200→500** (DoC + BankBonus confirm; primary URL 403'd).
- **BofA Premium Rewards Elite** & **Barclays GM Rewards**: stored values are
  correct, but `offer_link` points to the wrong card variant — fix the links.
- **Cambridge Savings $300→$800**, **Old National $300→$600**: composite /
  tiered "up to" offers — decide which tier the catalog should store.
- **BofA $500-tier checking `monthly_fee`**: record intentionally stores $4.95
  (SafeBalance) with a detailed tier-gating note; the $500 tier actually needs
  Advantage Plus ($12). Decide whether the headline fee should read $12.
- **Do NOT apply** the verifier's "Ink Cash/Unlimited 100000→1000": that's
  $1,000 cash = 100,000 UR points; stored 100000 (points) is correct (unit
  confusion — the same class of bug the meta-audit flagged).

### Catalog dup found
`arizona-financial-300-checking-2026` (bonuses.ts) and
`arizona-financial-cu-300-checking-2026` (stateBankBonuses.ts) are duplicate
records for the same offer — I corrected the verified one; reconcile/dedup these.

Full data (20 apply-now + 104 needs-human, each with sources):
`/tmp/state-sweep/pass2-result.json`.

---

## 5. Discovery — new cards & bonuses (ask #4: run)

Both discovery pipelines write to review queues; nothing is auto-applied.

### New card proposals (`discover:cards`) — 29
Notable current offers worth catalog review: Chase Southwest Rapid Rewards
Plus 80k / Priority 90k / Premier 85k, Chase United Quest 70k, Chase British
Airways 75k Avios, Wells Fargo Autograph Journey 60k, U.S. Bank Cash+ $250.
Fetch-failed (issuer 404, now correctly skipped): Amex Delta Gold, Cap One
SavorOne. U.S. Bank SPA pages returned no amount (known issuer-index limit).
Full list: `verification-output/cards-proposed.md`.

### New bonus leads (`discover:bonuses`) — 16 (queue size 100)
- Bank: StagePoint FCU $300 (CO/WY), Republic Bank $400, Idaho Central $250,
  Connexus $250, Community Choice $100, plus M&T / U.S. Bank promo roundups.
- Card: Capital One Spark Cash/Miles Select **$750 / 50k** (elevated, no AF),
  Amex Marriott Bonvoy Business **150k**, IHG Premier ~185k, Chase Ink Cash 100k
  (already in catalog).
- Brokerage: NinjaTrader $100.
Queue: `review-queue/leads.json`; digest: `review-queue/digests/2026-06-20.md`.

---

## 6. Gaps & caveats (explicit)

- **Reddit discovery disabled**: `REDDIT_CLIENT_ID/SECRET` not in `.env.local`,
  so r/churning + r/bankbonuses 403'd; only RSS sources ran. Add creds to widen
  coverage.
- **SPA issuer pages** (U.S. Bank, some Amex/Chase) render offers client-side;
  both verify and discover extract nothing there → over-counted in
  "no_fields_extracted". Not data errors.
- **Pre-existing test failure**: `lib/trackBonus.test.ts` (`getOwnedCards` not on
  the `ownedCards` mock) — from the recent `owned_cards` work, unrelated to this
  run; left as-is.
- Structural pipeline improvements in §2 were intentionally **not** auto-applied
  (they need your judgment / carry regression risk).
- Discovery proposals and Pass-2 "needs human" items are **not** auto-applied.

---

## 7. Files changed this run

Pipeline code (scripts only — no app/lib behavior touched):
`scripts/verify-cards/{run,extract}.ts`, `scripts/verify-bonuses/{extract,escalate}.ts`,
`scripts/discover-cards/run.ts`, `scripts/discover-bonuses/{run,classify,dedupe}.ts`,
`scripts/triage-edits.ts`, `package.json`.

Data (`lib/data/*`, 5 fixes from §4): `lib/data/bonuses.ts` (+2 expired marks),
`lib/data/stateBankBonuses.ts` (2 amount corrections + 1 expired mark). These are
the ONLY catalog-value changes; all other proposed edits were either false
positives (rejected by Pass-2) or deferred to your review.

_Note: the pre-existing uncommitted changes from before this run (CSP 100k
`offer_note`, card-art `image_url`s, SoFi "Claw" clarification, link-sync,
MonthlyCardBonuses, VIDEO-SCRIPT) were left untouched._
