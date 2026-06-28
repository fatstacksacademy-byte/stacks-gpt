# Business-bonus sweep of `institutions.ts` — results (2026-06-21)

Checked all **72 active-deposit institutions** from `lib/data/states/institutions.ts` for a
publicly-claimable NEW BUSINESS checking/savings bonus (personal bonuses already catalogued).
7 research agents, official-site proof only. Plus verified the 3 nationwide gaps from the DoC check.

## ✅ Added to catalog (`savingsBonuses.ts`, build-verified)

| Bank | Bonus | Best-tier APY | Region | Open |
|---|--:|--:|---|---|
| Associated Bank | up to $750 ($100/$400/$750) | ~28% | IA/IL/IN/KS/MI/MN/MO/OH/WI | **online** |
| Provident Credit Union | $475 | **~52%** | CA only | branch |
| Banner Bank | $250/$500 | ~18% | OR/WA/CA/ID | branch |
| First Hawaiian Bank | $250/$500 | ~9% | HI/GU/MP | branch |
| Grasshopper Bank | $300 bundle | ~4% | Nationwide | online |

Best for the video: **Associated** (online, 9 states, up to $750) and **Provident CU** (52% APY,
though CA branch-only). Grasshopper is nationwide+online but the $25k savings leg drags the APY.

## ⏳ Real but needs a final official-page fetch before cataloguing
- **Provident Bank (NJ)** — "up to $750" Small Business Checking, NJ/NY/PA, online, $0 fee, exp 6/30/2026. Amount+deadline confirmed via provident.bank, but the **tier/requirement mechanics didn't surface** (site 403'd). Pull T&Cs from https://www.provident.bank/small-business-month.
- **Bell Bank** — $500 business checking, real but **geo-fenced to 4 MN counties** (Crow Wing/Cass/Morrison/Aitkin). Too narrow; catalog only if you want completeness. exp 9/30/2026.
- **Fifth Third / Flagstar / First Financial Bank** — UNVERIFIED. Marketing pages exist but are bot-blocked (403); DoC shows their business offers expired. Likely not live — a 30-sec manual browser check would settle it.

## ✗ Corrections to the earlier DoC "nationwide adds"
- **Citizens "$1,500"** — NOT a normal bonus. It's an **invitation-only**, Relationship-Manager-gated program for **$250k+ balances** (Citizens for Startups). Not self-serve, not online. Don't feature.
- **Novo "$500"** — it's a **$10,000 debit-SPEND** bonus, not a deposit bonus. New customers only. Different category; doesn't fit the park-cash-for-APY framing.
- **Grasshopper "$750"** — that tier is **EXPIRED** (a savings MMA promo, ended 01/31/2026). The live offer is the **$300 bundle** (added above).

## 📊 Structural finding (worth knowing for next time)
- **Hit rate: ~6 of 72 (~8%).** Business bonuses cluster at **banks**, not credit unions — almost every CU in the list excludes business accounts from its cash bonus (most "business" offers were credit-card welcome bonuses, employer/referral programs, or personal-only promos).
- So future business-bonus discovery should weight **regional banks** (FDIC list) over CUs.
- Many official sites (Citizens, Flagstar, Fifth Third, First Financial, Provident, Dupaco, Gesa) **hard-block WebFetch (403)** — those need WebSearch-on-domain or a browser fetch.

## 🔧 Follow-up: record business outcomes in `institutions.ts`
The inventory schema tracks `deposit` + `card` but has **no `business` field**, so this sweep's
results aren't logged back into it. Recommend adding a `business: SweepOutcome` (+ `business_offer_id`)
column so the next sweep doesn't re-check all 72. Not done here (schema change + 72-row update).

---

## Hawaii deep pass (2026-06-21) — 7 banks + 12 credit unions

Triggered to answer "are there really no HI business bonuses?" Checked the full FDIC/NCUA HI
list beyond the 6 already-swept institutions.

**Verdict: First Hawaiian Bank ($250/$500) is the ONLY live, publicly-claimable HI business
bonus** (already in catalog). One other real business bonus exists but is expired:

- **Central Pacific Bank** — Business Exceptional Plan $400 ($25k) / $1,200 ($75k), **expired
  10/31/2025**. Real recurring offer → added to `recurringBankOffers.ts` as a fall-renewal watch.
- Banks with NONE: American Savings, Territorial Savings (now tsbhawaii.bank), Finance Factors,
  Hawaii National (now hawaiinational.bank), Bank of Hawaii (personal-only, re-confirmed).
- Ohana Pacific Bank — acquired by CBB Bank (2021); domain redirects, NONE (CBB pages couldn't be
  deep-fetched — minor gap).
- 12 HI credit unions: 0 cash business bonuses. Only soft promo: **Hawaii Community FCU** gift-card
  + sweepstakes for opening business checking (non-cash, amount unpublished — not catalog-worthy).
- Low-confidence (site unreachable, NONE by absence): Pearl Hawaii FCU, Honolulu FCU, Kauai
  Community FCU.

Confirms the structural finding: HI business bonuses live at **banks**, and there are only two
(First Hawaiian live, Central Pacific seasonal).
