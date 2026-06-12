# Combined state sweep — cards + deposit bonuses in one pass

A per-state playbook so one session does a Hawaii-depth pass on a state for **both**
credit cards and deposit (checking/savings) bonuses, without paying the discovery
tax twice. Designed for **1–2 states per session** (these passes are token-heavy).

## Why combined

The expensive, duplicated work is *discovery + site navigation*, not *verification*.
The card sweep and the bank-bonus sweep each independently rebuild the same NCUA
active-CU + FDIC BankFind institution list, then each navigates to the same
institution sites. Verifying a card's terms vs. a deposit bonus's terms is genuinely
separate work — but you only have to find the institution and open its site once.

So: **combine the cold pass, share the institution list, refresh on separate clocks.**

## The shared institution list

`./institutions.ts` is the canonical inventory + review log. Each row records, per
institution: `domain`, `type`, `states`, `reviewed` date, and the outcome for BOTH
products (`deposit` / `card`, each `active|expired|targeted|unverified|none|not_checked`)
cross-linked to the live-catalog id. It is **growing, not exhaustive** — seeded from
institutions that surfaced a deposit offer; `card` is `not_checked` on every seed row.

A sweep ALWAYS reads this first, only re-checks what's stale, and APPENDS new finds.

## Per-session workflow

1. **Pick 1–2 states.** Prefer populous states with active CU scenes for ROI
   (TX, CA, OH, FL), or wherever the audience skews.
2. **Read `./institutions.ts`** filtered to those states. Split into:
   - rows with `card: "not_checked"` → need a card check (most seed rows),
   - rows whose `reviewed` is older than the cadence below → re-verify,
   - the discovery gap → institutions not yet listed (the agent fills via NCUA/FDIC).
3. **Dispatch the combined-sweep agent** (prompt below), one per state (foreground or
   background — WebFetch is allow-listed). It returns, per institution, both a deposit
   finding and a card finding.
4. **Write back** the structured results:
   - deposit bonuses → `../stateBankBonuses.ts` (or `../hawaiiBankBonuses.ts` for HI),
   - cards → the state module under `./` built with `./_builder.ts`,
   - expired/seasonal offers → `../recurringBankOffers.ts`,
   - update `./institutions.ts` rows (`reviewed`, `deposit`, `card`, ids) and append
     newly-discovered institutions.
5. **Validate** (`npm test`, `npx tsc --noEmit`, eslint changed, `npm run build`),
   then commit. Don't push unless asked.

## Refresh cadence (after the cold pass)

- **Deposit bonuses rotate fast** (seasonal/quarterly). Don't re-comb institutions —
  drive refresh off `../recurringBankOffers.ts` (jump straight to the official URL)
  plus the bankbonus/DoC sitemap canary. ~quarterly.
- **Card sign-up bonuses are stable** (months–years). Re-verify ~semi-annually. Don't
  re-read card terms every time you check a deposit promo.

This is why the two stay *separate after onboarding*: fusing the refresh either
over-checks stable cards or under-checks rotating bonuses.

## Combined-sweep agent prompt (copy, replace {STATE})

> Bank/credit-union researcher. Today is {DATE}. Do a thorough pass over LOCAL/REGIONAL
> institutions in {STATE}, checking EACH institution for BOTH (a) a new-account deposit
> bonus (checking/savings/new-member/publicly-available referral) AND (b) a credit-card
> sign-up bonus, in a single visit to its official site.
>
> VERIFICATION: official institution page is the only proof (WebFetch; if blocked,
> WebSearch with allowed_domains = the institution's own domain). Aggregators (Doctor
> of Credit, bankbonus) for discovery only. Never infer an old/expired offer is live;
> any deadline before today = EXPIRED.
>
> INSTITUTION LIST: start from the {STATE} rows I provide from institutions.ts; then
> fill gaps via the NCUA active-credit-union list + FDIC BankFind for {STATE}. SKIP
> nationwide banks already in the catalog (Chase, BofA, Wells Fargo, U.S. Bank, Capital
> One, PNC, Citi, BMO, TD, Truist, SoFi, Ally, Discover, Navy Federal, USAA, brokerages).
>
> For EACH institution return: name, official domain, type, field-of-membership (CUs);
> then DEPOSIT = {amount, account, tiers, opening deposit, required DD (payroll?),
> debit txns, balance/hold, monthly fee + waiver, deadline, payout, clawback,
> prior-customer limits, ChexSystems only-if-stated, online-opening, official URL,
> one-line proving excerpt} or "no deposit bonus"; and CARD = {card name, bonus +
> currency, min spend + window, annual fee, key benefits, official URL, proving excerpt}
> or "no card bonus". Flag targeted/mailer-only, merchandise, sweepstakes, and rate
> specials as NOT publicly claimable. Group by institution; end with sources + date.

## Notes

- Seed `institutions.ts` was built from the 2026-06-12 deposit sweep; treat any
  `card: "not_checked"` as "verify on next visit," not "no card."
- Dry states with no local deposit offer anywhere as of 2026-06-12: **AK, SD, WY**
  (recheck quarterly; they may still have cards worth a first card-pass).
