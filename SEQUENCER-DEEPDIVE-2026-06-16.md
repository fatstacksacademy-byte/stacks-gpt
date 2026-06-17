# Stacks OS deep dive — sequencers, churner, and the 0% APR calculator
**2026-06-16** · paycheck / savings / spending accuracy + profitability · CC churner travel UX · new 0% intro-APR float tool

---

## TL;DR

| Area | Verdict | What to do |
|---|---|---|
| **Paycheck sequencer** | Ordering logic is correct. Three real accuracy issues inflate/skew the dollar figure. | Fix gross-vs-net headline, pass eligibility filters, label the multi-slot assumption. |
| **Savings sequencer** | Ranking is sound. The **headline number overstates the edge over a HYSA** — it ignores the `incremental_vs_hysa` field the lib already computes to be honest about exactly this. | Headline the incremental number (or relabel). |
| **Spending sequencer** | Math is sound. Issues are disclosure (benefits assume 100% use, SUB shown pre-tax). | Add caveats; no math fix needed. |
| **CC churner (travel)** | Engine is good; UX is the problem. Biggest gap: **5/24 is computed but not shown on recommendations.** | P1: inline 5/24. P2: churn-plan timeline. P3: guided travel onboarding. |
| **0% APR calculator** | **Did not exist. Built it.** Pure lib + 10 passing tests reproducing your video's numbers, plus a UI page wired into nav. | Review `/stacksos/intro-apr`. |

---

## 1. Paycheck sequencer — "is it accurate per the inputs?"

Code: [lib/sequencer.ts](lib/sequencer.ts), [app/stacksos/sequencer/SequencerClient.tsx](app/stacksos/sequencer/SequencerClient.tsx)

**The good:** the core engine is correct. It velocity-sorts bonuses (`net_bonus / weeks_to_complete`), packs them into DD slots greedily, respects per-bonus cooldowns from your completed records, inserts "waiting for X" placeholders when a slot idles, and chains start dates. The `evaluate()` feasibility math (per-deposit minimums, total-deposit capacity within the window, weeks-to-complete from your pay cadence) is sound.

**Three things that make the displayed number wrong, in priority order:**

### 1a. Each DD slot is assumed to receive your *full* paycheck independently — biggest one
[lib/sequencer.ts:208-210](lib/sequencer.ts#L208) builds one income source and every slot evaluates feasibility against the **full** `paycheckAmount`. So "3 slots, $2,000 paycheck" is modeled as $6,000/mo of qualifying direct deposit. In reality you have *one* $2,000 paycheck. This only works if (a) the banks accept ACH-from-another-bank as "DD" (the DD-whisperer trick — true for many in the catalog but not all), or (b) you split the real paycheck (then each slot gets a fraction and some min-per-deposit requirements fail).

The plan can therefore show bonuses as feasible that aren't, and overstate how many you can run in parallel. **Fix options:** either (i) state the assumption explicitly ("assumes each slot can be fed a qualifying deposit ≥ your paycheck via ACH/DD"), or (ii) add a per-source allocation so splitting a single paycheck reduces each slot's effective deposit.

### 1b. Headline dollars are GROSS; fees are computed but never shown
The lib computes `net_bonus` (bonus minus unwaived monthly fees) and **sorts by it** — but the UI shows gross everywhere:
- card headline `${b.bonus_amount}` at [SequencerClient.tsx:256](app/stacksos/sequencer/SequencerClient.tsx#L256)
- "Bonus this year" / "All-time projected" sum `bonus_amount`, not `net_bonus` ([SequencerClient.tsx:49](app/stacksos/sequencer/SequencerClient.tsx#L49), [lib/sequencer.ts:406](lib/sequencer.ts#L406))

So a bonus with a $12/mo unwaived fee over 6 months ranks on its $72-lighter net value but *displays* the full gross, and the yearly total is inflated by every fee. `net_bonus`, `total_fees`, and `fee_waived_by_dd` are already in the `SequencedBonus` object — just surface them.

### 1c. The page drops state / business / military eligibility
[SequencerClient.tsx:81-86](app/stacksos/sequencer/SequencerClient.tsx#L81) calls `runSequencer` with only `slots / payFrequency / paycheckAmount / completedRecords`. It never passes `userState`, `includeBusiness`, or `militaryAffiliated`. The Savings and Spending pages all pass these. Consequence: **every state-restricted, business, and military bonus is silently skipped** on the paycheck planner (they land in "excluded" with "set your state to unlock"). For a user in a state with good local offers, the paycheck plan is materially short.

### Minor
- Weeks-to-complete treats the paycheck as a continuous weekly rate, not discrete deposits — rounds up via `Math.ceil`, so it's conservative; fine.
- No tax reserve on the projection (bonuses are 1099 income). Same gap as Savings, which at least links a tax summary.

**Bottom line:** the *sequence* it produces is trustworthy; the *dollar total* is gross, fee-blind, and missing eligible bonuses. 1b and 1c are quick, high-value fixes.

---

## 2. Savings sequencer — "does the profitability make sense?"

Code: [lib/savingsSequencer.ts](lib/savingsSequencer.ts), [app/stacksos/savings/SavingsClient.tsx](app/stacksos/savings/SavingsClient.tsx)

**The good — this engine is actually the most honest of the three.** It deliberately computes `incremental_vs_hysa` per entry ([lib/savingsSequencer.ts:18-28](lib/savingsSequencer.ts#L18)): profit *above* what the same capital would have earned in your own HYSA, because parking at a bonus bank's low base APY has a real opportunity cost. It also splits tier strategy correctly — churnable bonuses take the highest-APY tier (frees capital faster), one-and-done bonuses take the biggest absolute payout that still beats your HYSA. That's the right call and matches your "many of these aren't churnable" feedback.

**The problem is the headline ignores that honesty.** The hero card ([SavingsClient.tsx:556-580](app/stacksos/savings/SavingsClient.tsx#L556)):
```
12-Month Projected Earnings   $X        ← y1Bonus + y1Interest (GROSS)
Effective return: (y1Total / balance)%  vs  Y% HYSA
```
Two issues:
1. **The interest in `y1Total` is earned at the *bonus bank's* base APY** (`calcEffectiveApy` uses `bonus.base_apy`), then the line compares the whole thing "vs Y% HYSA" as if it were all incremental. It double-counts the baseline: you'd have earned the HYSA rate on that cash anyway. The honest comparison is `sum(incremental_vs_hysa)` — **which every entry already carries** — not gross total.
2. **Idle capital earns $0 in the model.** Between/around rotations, undeployed cash isn't credited the HYSA baseline, so "return on whole balance" is a mix of a too-low denominator behavior and a too-high numerator (gross interest). The number isn't crazy, but "X% vs Y% HYSA" reads as a clean apples-to-apples rate and isn't one.

**Recommendation (small, principled):** headline `sum(incremental_vs_hysa)` for the "vs HYSA" framing, and keep gross as a secondary "total earnings" line. The data is already there — it's a display change, not new math. I did **not** change this myself because it's a number you show users daily and it's a product call (gross vs incremental) — your call on which to feature.

Also note: 20% flat tax reserve is hardcoded ([SavingsClient.tsx:558](app/stacksos/savings/SavingsClient.tsx#L558)) — fine as a default, worth making it the user's bracket later.

---

## 3. Spending sequencer — profitability sanity

Code: [lib/ccSequencer.ts](lib/ccSequencer.ts), [app/stacksos/spending/SpendingClient.tsx](app/stacksos/spending/SpendingClient.tsx)

Math is sound: `net_value = welcome + statement_credits + benefits − AF`, feasibility-filtered by whether you can hit min spend in the deadline at your budget (with a 1.05× buffer), then sequenced with application-pace spacing (`minGapMonths = 12 / maxCardsPerYear`). Travel Mode swaps cash-floor cpp for redemption-ceiling cpp cleanly without touching the Cash Mode path.

Caveats are **disclosure, not bugs:**
- `benefits_value` defaults to ~100% usage of every toggled benefit — a lounge/credit-heavy card looks better than most people realize.
- "base earn /yr" annualizes a flat rate on assumed constant monthly spend.
- Travel cpp are ceilings (labeled "estimates only," but below the fold).
- The welcome bonus is taxable for cash-back cards but shown pre-tax.

No code change strictly required; consider a one-line "value assumes you use these benefits / before tax" footnote on the card.

---

## 4. CC churner — making it seamless for travel-rewards users

Code: [app/stacksos/spending/SpendingClient.tsx](app/stacksos/spending/SpendingClient.tsx), [lib/five24.ts](lib/five24.ts), [app/stacksos/cards/CardInventoryClient.tsx](app/stacksos/cards/CardInventoryClient.tsx), [lib/travelCpp.ts](lib/travelCpp.ts)

The sequencing engine and Travel Mode are good. The gaps are **discoverability, context, and one missing integration.** Prioritized:

**P1 — Inline 5/24 on every recommended card (highest value, lowest effort).**
`computeFive24()` and the card inventory already exist, but they live on a *separate* page ([CardInventoryClient.tsx](app/stacksos/cards/CardInventoryClient.tsx)). The Spending recommendations don't know your 5/24 status, so the app will happily rank a Chase Sapphire #1 for someone who's at 5/24 and will be auto-denied. **Fix:** read the card inventory into SpendingClient, run `computeFive24`, and badge each Chase rec inline — "✓ Under 5/24" or "⚠ At 5/24 — Chase will likely deny; next slot opens Mar 2027." Pure reuse of existing code.

**P2 — A real "Travel Rewards Plan" timeline.**
`cumulative_months` is already computed per card ([lib/ccSequencer.ts:196-204](lib/ccSequencer.ts#L196)) but only shown as buried text ("Cum: $X in Ymo"). Render it as a horizontal timeline: apply date → spend window → completion → next card, with the application-pace gaps visible. Make it the default view in Travel Mode and let it be shared/printed. This turns "a ranked list" into "a plan."

**P3 — Guided travel onboarding.** Today: find Spending → scroll to Rewards Mode → toggle Cash→Travel → a *second* dropdown appears for the program → optionally open "+ Advanced" to set cpp. Replace with one prompt: "Where do you want to fly/stay?" → auto-sets Travel Mode + program filter + a sensible cpp from `transferPartners`. Kills the two-step discovery.

**P4 — Transfer-partner "what can I book" hints.** The cpp override box ([SpendingClient.tsx:627-701](app/stacksos/spending/SpendingClient.tsx#L627)) is a blank number field. Annotate each currency with a concrete anchor (Hyatt ~2.3¢/night, United business sweet spots, etc.) so people aren't guessing their own valuations.

**P5 — Surface Travel Mode above the fold** and retire the "BETA" tag once P1/P2 land.

I can implement **P1 and P2** next — both reuse data that already exists and don't touch the pricing math. I held off doing it now because SpendingClient is large and revenue-critical and you're away to eyeball it; say go and I'll wire them.

---

## 5. NEW: 0% Intro-APR Float Calculator — built this session

You said: *"on credit cards we don't have a 0% calculator."* Now you do. It models exactly the Blue Business Plus strategy from your transcript.

**Files (all additive, nothing existing changed except 2 lines of nav + analytics):**
- [lib/introAprArbitrage.ts](lib/introAprArbitrage.ts) — pure calculator
- [lib/introAprArbitrage.test.ts](lib/introAprArbitrage.test.ts) — 10 tests, all passing
- [app/stacksos/intro-apr/page.tsx](app/stacksos/intro-apr/page.tsx) — auth-gated server shell (mirrors Savings)
- [app/stacksos/intro-apr/IntroAprClient.tsx](app/stacksos/intro-apr/IntroAprClient.tsx) — UI
- nav: added "0% APR (Beta)" tab in [CheckpointNav.tsx](app/components/CheckpointNav.tsx); 2 analytics events

**The math it nails — the decaying float curve.** A purchase in promo-month *m* floats in your HYSA until you pay the balance at promo end, so it earns `APY × (promoMonths − m) / 12`. Month 0 earns the full APY; later months earn a sliver. This is the exact insight you teach on camera:
> "November purchases earn the full 4.5%… April purchases effectively earn 2.6%" → 4.5% × 7/12 = **2.625%** ✓ (a test pins this)

Then it stacks the three things the strategy combines into a blended return-on-spend:
1. net float interest (after the 1099-INT tax you mention),
2. everyday points/cash-back earn, and
3. the welcome bonus (only if min spend clears inside its window).

**Reproduces your worked example.** Standard offer ($1k/mo × 6mo, 15k MR @ $3k spend, 12-mo 0%, 4.5% APY): float interest **$213.75**, rewards **$270**, blended **8.06% / 8.06x** pre-tax — right in the neighborhood of the ~7.6% you quote (the small delta is the "do you count the first month" convention; the model uses the one that matches your on-camera chart).

**UX:** prefill from any catalog card that carries a 0%-on-purchases intro (33 cards have `intro_apr.purchase_apr_months`), pulls your real HYSA APY from your Savings profile, shows the month-by-month decay table, warns about the go-to APR, and carries your affiliate apply link.

**Verification:** `npx tsc --noEmit` → **0 errors repo-wide**. `npx vitest run lib/introAprArbitrage.test.ts` → **10/10 pass.**

> ⚠️ **Gap to report (per your standing rule):** the full test suite has **3 pre-existing failures** in `lib/data/stateBankBonuses.test.ts` (a `catalogTaxonomy.ts` `excludedStates` is undefined for some bank-bonus rows). These are **not from this work** — I didn't touch those files — but they're red and worth a look. The other 315 tests pass.
>
> I did **not** run `npx next build` (slow) or push anything. Run a build before deploy per your seed-file rule.

---

## Suggested next steps
1. Eyeball `/stacksos/intro-apr`, tweak copy/defaults.
2. Green-light the Paycheck **1b + 1c** fixes (gross→net headline, pass eligibility filters) — quick wins.
3. Decide gross vs incremental for the Savings headline (§2).
4. Say go on churner **P1 (inline 5/24) + P2 (plan timeline)**.
