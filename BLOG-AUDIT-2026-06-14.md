# Blog Content Audit Report — FatStacks Academy
*Date: June 14, 2026*

> Part 1 of 2 — Editorial pages + bank bonus pages (203 banks, 69 DD cross-references).
> Part 2 (credit cards) is appended below once the card-audit re-run completes.

---

## Executive Summary

The blog has a structurally sound editorial foundation with 11 static pages covering the right keyword targets, but is outgunned on depth across nearly every page — ranging from 4x shorter (cooldown guide) to 70x shorter (best checking bonuses) than top competitors. The most urgent problems are factual errors in bank review pages that will cost users their bonuses: SoFi marks Fidelity and Chase ACH pushes as working when DoC lists both as explicitly failing; Capital One 360 lists a $500 bonus that doesn't exist; BMO's early closure fee is listed as $0 when it's $50; and at least eight bank pages show expired dates on live offers. The DD method cross-reference against 69 banks found systemic accuracy issues in roughly 60% of banks audited, with the most dangerous pattern being "mixed" labels applied as generic templates to CUs and regional banks with strict official terms that almost certainly exclude the methods flagged as uncertain.

---

## Critical Issues (Fix First)

These issues actively damage credibility, send users to a competitor, or cause bonus failures.

**1. Factual errors that will fail real bonuses**

- **SoFi ($300 checking):** Fidelity ACH push and Chase ACH push both marked `works: true` — DoC lists both as explicitly NOT working. SoFi's fine print excludes external bank ACH transfers not from employers. A user following this advice will miss their bonus.
- **Capital One 360 checking:** Bonus listed as $500. Current offers are $300 (OFFER300) and $400 (GET400/FLASH400). No $500 offer exists anywhere in DoC, BankBonus, or Capital One's own site.
- **BMO checking:** `early_closure_fee: 0` and a bullet point reading "No early closure fee" — BMO charges $50 if closed within 90 days. This is a direct financial harm to readers who close early expecting no penalty.
- **Venmo/PayPal at Capital One 360:** Both marked `works: true (confirmed 10+ data points)` — DoC does not list either as working for Capital One.
- **Chase (both personal pages):** Ally ACH push and Capital One ACH push marked as NOT working — DoC lists both as confirmed working. Wrong negatives are more damaging than missing positives because they stop users from earning bonuses they could get.
- **Grow Financial:** `direct_deposit_required: false` in bonuses.ts but DoC confirms DD IS required (two $500 DDs within 90 days). The fundamental offer framing is wrong.
- **Rho:** Lowest tier bonus listed as $250, DoC page title says $350. Also misclassified as `product_type: 'savings'` — it's a business checking account.

**2. Expired dates on live offers**

- Bank of America: flagged as expired May 31, 2026 — extended to September 30, 2026
- Wells Fargo Business $825: flagged "Expires May 5, 2026" — extended to July 7, 2026
- BMO Business $1,000: flagged as expired Apr 30, 2026 — active through August 31, 2026
- KeyBank Business: `expired: true` — active through August 21, 2026
- TD Bank savings: page says April 30, 2026 — current offer expires July 30, 2026
- US Bank $450: catalog shows 2026-06-18 — BankBonus shows extended to July 18, 2026
- Regions Bank: `expired: true` — registration deadline Dec 31, 2026

Any user hitting these pages via search will see a "dead" offer and leave. This affects SEO signals (bounce rate, dwell time) and affiliate conversion.

**3. Pages with no DD section where DD is required**

GreenFi, Four Leaf FCU, Horizon Bank, Provident Bank, Ascend Bank, and Chase (tiered) all require a direct deposit to earn the bonus, but have no DD methods section at all. GreenFi explicitly excludes bank-to-bank ACH transfers, which is exactly what a user would try without a warning.

**4. DD sections that shouldn't exist**

Bluevine Business, PNC Business, Central Bank Business, PeoplesBank, Grasshopper Bank, 4Front CU, and PerCapita all have `direct_deposit_required: false` in bonuses.ts but still show DD method content. This actively misleads users into thinking they need to set up a direct deposit when they don't.

**5. Best checking bonuses page at 420 words**

This page is 6-70x shorter than every competitor (Fortune: 2,800 words; DoC: 8,000+ words; Hustler Money Blog: 30,000+ words). It is missing credit pull type, cooldown periods, expiration dates, ChexSystems data, fee waiver conditions, and a comparison table. There is also a likely factual error: the meta description cites BMO at $600 but the current BMO offer is $400.

**6. Best savings bonuses and best credit cards June 2026 pages**

Both at 380 words. Best savings has no comparison table, no tax section, no expiration dates, no FAQ, and the key differentiator (effective APY methodology) exists only in the meta description, not the article body. Best credit cards June 2026 has all four takeaway fields as TODO placeholders — no real editorial copy has shipped for any of the four featured cards.

---

## Static Editorial Pages — Detailed Analysis

Ranked by priority (critical → high → medium).

### 1. Best Checking Account Bonuses of 2026 — CRITICAL
**Word count: 420 | Competitor range: 2,800–30,000+**

Current state: A dynamic ranked list with a brief "How to Get Started" section and a YouTube CTA. No FAQ, no comparison table, no video embed, no ChexSystems section, no eligibility rules, no cooldown periods, no ACH/DD workarounds, no affiliate direct-apply links.

What competitors do better: Fortune provides a structured comparison table with bonus amount, DD requirement, timeframe, monthly fee, and expiration date for every offer. Hustler Money Blog adds credit pull type (soft vs. hard) and ChexSystems sensitivity per offer. DoC layers in churn window, stacking opportunities (Chase checking + savings = $900), portal bonuses (Swagbucks layering), and promo codes. Even the lightest competitor (Fortune at 2,800 words) is 6x longer.

Meta description cites BMO at $600 but current BMO offer is $400.

Improvements needed:
- Expand to 2,500–3,000 words minimum
- Add a comparison table: Bank | Bonus | Min DD | Timeframe | Monthly Fee | Expiration | Credit Pull | ChexSystems
- Add credit pull type and ChexSystems sensitivity per offer
- Add cooldown/churn window data per bank (US Bank 12 months, Chase 24 months, etc.)
- Add a bonus stacking section (Chase checking + savings, portal overlays)
- Add a "no direct deposit required" callout for applicable offers
- Add tax implications (one paragraph minimum — 1099-INT at $10+)
- Add an FAQ covering the top 5-7 reader questions
- Fix BMO amount in meta description

### 2. Best Savings Account Bonuses of 2026 — CRITICAL
**Word count: 380 | Competitor range: 900–6,500+**

Current state: A ranked list sorted by effective APY, a thin "How Savings Bonuses Work" section, and a YouTube CTA. No comparison table, no tax section, no expiration dates, no eligibility notes, no FAQ, no "how to choose" framework, no FDIC callout.

The effective APY angle is genuinely differentiated — no major competitor uses it as a primary sort. But it is mentioned only in the meta description. The "16.2% effective APY" claim for Chase $600 never appears in the article body with any calculation.

"Capital rotation tip" is jargon that bounces new readers. The Ally $100 on "$60 in deposits" claim needs clarification — it reads as a typo.

Improvements needed:
- Add a sortable comparison table: Institution | Bonus | Min Deposit | Hold Period | Base APY | Effective APY | Expiration
- Expand offer count from 4 to 8–10 minimum (BankBonus covers 20)
- Show the effective APY calculation in the article body with a worked example (Chase: $600 on $15,000 for 90 days = 16% annualized)
- Add expiration dates per offer
- Add eligibility lookback periods per institution
- Add a tax section: 1099-INT treatment, taxable even without form received
- Add an FAQ: "Are savings bonuses taxable?", "Can I do multiple at once?", "What if I close early?"
- Add a "Is it worth it?" section comparing bonus effective APY vs best HYSA (Raisin at 4.10%)
- Add a Federal Reserve rate context paragraph
- Replace "Capital rotation tip" with plain-English explanation

### 3. Best Credit Cards — June 2026 — CRITICAL
**Word count: 380 | Competitor range: 4,500–9,000+**

Current state: Four ranked picks with no takeaway copy (all four are marked TODO), a methodology paragraph, a Stacks OS CTA, and a YouTube promo block. The videoId for June 2026 is not set, so no embed renders. No FAQ, no comparison table, no earning rates, no spend requirement context, no transfer partner info, no point valuations, no credit score guidance.

The CSP June 10, 2026 product refresh (new 3x gas/EV charging, expanded hotel credit, TSA PreCheck credit) is not covered. NerdWallet is already publishing on this. The page misses the CSR at 150k (highest ever per DoC). Stacks OS CTA is placed before readers have seen any actual card content.

Improvements needed:
- Write actual takeaway copy for all four featured cards before anything else
- Add a comparison table: Card | Bonus | Spend Req | Annual Fee | Net Year-1 Value | Earning Highlights | Transfer Partners | Credit Score
- Add point valuations in cents-per-point (UR at 2.0cpp, MR at 2.0cpp, C1 Miles at 1.7cpp)
- Cover the CSP June 2026 product changes
- Add a 5/24 plain-English explanation before the implication is stated
- Add spend requirement math: monthly spend needed to hit each bonus in the 3-month window
- Add a "who should skip this card" note per pick
- Add an FAQ: "Can I get CSP if I had it before?", "What is 5/24?", "Can I get CSP and IBP together?"
- Move Stacks OS CTA to after full card coverage
- Set the videoId for June 2026 or remove the embed block
- Expand to 1,500–2,000 words minimum

### 4. Best Bank Account Bonuses of 2026 — CRITICAL
**Word count: 1,100 | Competitor range: 4,500–15,000+**

Current state: Ranked tables for checking and savings, a "How Bank Bonuses Work" section, a 4-step guide, a Stacks OS CTA, and an FAQ. The best-structured page in the thin-content group, but still 4–14x shorter than every major competitor.

Missing entire content categories competitors treat as required: business bonuses (DoC has 40+), state-specific restrictions, soft vs. hard credit pull disclosure, churn windows, portal stacking, no-DD callout, tax implications, promo codes, payout timelines, per-offer expiration dates.

The "$3,000–$5,000+ per year" earnings claim has no worked example. The Chase $600 "16.2% effective APY" claim needs the math shown. The BMO $600 top-line number needs a qualifier that it requires $8,000 in direct deposits.

Improvements needed:
- Expand to 3,000–4,000 words minimum
- Add a business bank bonuses section with 5–8 entries
- Add expiration dates to every offer in ranked tables
- Add credit pull type (soft vs. hard) per offer
- Add churn window data per institution
- Add a "No Direct Deposit Required" callout sub-section
- Add a tax implications paragraph
- Add portal stacking section (Rakuten, TopCashback, referral programs)
- Add a "post-bonus strategy" note (account closure windows, clawback risk)
- Add a macro context paragraph (Fed rate cycle)
- Include promo codes or "promo code required" flag where applicable

### 5. Best Bank Bonuses — June 2026 — HIGH
**Word count: 520**

Current state: Four pick cards (Bank of America, Wintrust, US Bank Smartly, Chase Total Checking), a methodology paragraph, a Stacks OS CTA, a YouTube promo, and previous-months navigation. All four takeaway fields are marked TODO — no editorial copy shipped.

The US Bank Smartly bonus expiration is June 18, 2026 — four days from publication date. Needs an urgent "ACT FAST" callout. The Stacks OS CTA appears at 520 words before any real content is delivered.

Improvements needed:
- Write takeaway copy for all four cards immediately
- Add a quick-reference comparison table at top
- Expand from 4 to 8–12 offers with an "honorable mentions" tier
- Add soft/hard pull and ChexSystems sensitivity per offer
- Add a 1099-INT tax note
- Add state/geographic availability per offer
- Add bonus posting timeline per offer
- Add a "what counts as direct deposit" note per bank
- Add a savings account bonus section (2–3 picks)
- Add an FAQ
- Move Stacks OS CTA below first full set of editorial content
- Urgent: flag US Bank June 18 expiration prominently

### 6. Bank Bonus Cooldown Periods (Churning Waiting Periods) — HIGH
**Word count: 2,800 | Competitor range: 5,000–6,000+**

Solid structural foundation. Covers core Chase/Wells Fargo/Capital One/SoFi rules, has a cooldown matrix, a "Repeatable Tier" section, and a "Danger List." A real resource, just outgunned on operational depth.

Two highest-risk gaps: no ChexSystems section and no savings account cooldowns in the matrix.

The "24-Month Standard" heading implies universality — but 12 months is actually more common (US Bank, Wells Fargo, Citi, BMO, PNC). Calendar-year vs. rolling-window distinction is absent. Hancock Whitney and Truist reset January 1st — a December churn opportunity. The SoFi "once per lifetime" claim needs a caveat.

Improvements needed:
- Add a "Churn Window Type" column: rolling vs. calendar-year reset
- Add savings account cooldown rows
- Add a ChexSystems risk section
- Add a credit pull type column per bank
- Add a fee avoidance table (early closure fees by bank)
- Add a household/spouse stacking section
- Add a sample 12-month sequencing calendar
- Add startup capital guidance ($5,000–$10,000)
- Add a tax section
- Document Citizens Bank 6-month cooldown
- Rename "The Danger List" to "Lifetime Eligibility Restrictions"
- Clarify the "24-Month Standard" heading — lead with "12 months is most common"
- Add verbatim fine-print excerpts for top 5 banks

### 7. ChexSystems Guide for Bank Bonuses — HIGH
**Word count: 2,400 | Competitor range: 2,400–15,000+**

Strong conceptual coverage. Competitive in length with Hustler Money Blog but lacks institution-level data.

Biggest gap: no named-bank sensitivity table. DoC has 400+ institutions; Hustler Money Blog has 70+ with specific inquiry thresholds. The "80% of banks use ChexSystems" claim is accurate but misleading without the follow-on that many banks pull ChexSystems but are not inquiry-sensitive — treating pull and sensitivity as the same thing is a fundamental framing error for a churning audience.

Improvements needed:
- Add a named-bank sensitivity table (20–30 banks) with sensitivity level and inquiry threshold
- Add inquiry-sensitivity vs. negative-item-sensitivity distinction prominently
- Add inquiry velocity math (worked example)
- Add a sequencing strategy section
- Add "How to read your ChexSystems report" subsection
- Add a fintechs/neobanks subsection (Chime, SoFi, Dave, Varo skip ChexSystems)
- Expand the dispute section to all 6 steps
- Add a practical recovery timeline table
- Note the ChexSystems numeric score (0–9999)
- Add the EWS bank-specific list (BofA, Wells Fargo)
- Note that freezing ChexSystems does NOT clear negative items

### 8. What Counts as a Direct Deposit — HIGH
**Word count: 2,200 | Competitor range: DoC 35,000+**

Real content, competitive in structure. But missing the brokerage push data that is the primary reason churners visit this keyword.

The "What Definitely Does NOT Count" section is prose; competitors use a two-column table. "Does Zelle count?" is the single most-searched sub-question and the answer is buried in the Citi section.

Improvements needed:
- Add a brokerage push table: Fidelity / Schwab / Vanguard / Robinhood / E*Trade × major destination banks
- Add explicit "worked / did not work" columns to the per-bank breakdown
- Expand workarounds section (tax refunds, cashback portal payouts, Amex Serve/Bluebird push, brokerage withdrawals)
- Add a "P2P crackdown" warning (enforcement tightening since ~2022)
- Add RTP / FedNow as a qualifying payment rail
- Add a self-employed / gig worker section
- Add a Chime intermediary strategy note with T&C risk caveat
- Expand Chase section to note which bonuses don't require DD
- Add "terms change" warning (screenshot terms at enrollment)
- Promote "Does Zelle count?" to a standalone FAQ entry
- Convert "What Does NOT Count" to a two-column table

### 9. Bank Bonus Tax Guide 2026 — HIGH
**Word count: 1,800 | Competitor range: 1,800–3,000+**

Comparable in length but lacks concrete tables and institution-specific data.

The 1099-INT vs 1099-MISC framing could cause confusion: the type of bonus (not just amount) determines the form — cash account bonuses default to 1099-INT at $10; miscellaneous income defaults to 1099-MISC at $600. No bank-by-bank 1099 behavior data.

Improvements needed:
- Add a bank-by-bank 1099 behavior table (top 10–15 banks, form type, threshold, quirks)
- Add a four-scenario tax calculation table (TX/CA/NY/FL at different incomes)
- Add a referral bonus tax treatment section
- Add a points-valued bonuses section
- Explain the CP2000 IRS notice
- Add the IRS.gov Information Return Documents lookup
- Clarify the $1,500 Schedule B threshold
- Add a tracking spreadsheet template
- Expand FAQ (fee deductibility, estimated quarterly payments, corrected 1099 handling)
- Fix the 1099-INT vs 1099-MISC framing to emphasize bonus type
- Name the 9 no-income-tax states explicitly

### 10. Bank Bonuses Without Direct Deposit — HIGH
**Word count: 1,850 | Competitor range: 3,500–5,500+**

Has a genuine technical differentiator (live table from bonuses.ts). But the "push-DD workarounds" and "truly no DD required" audiences are conflated in structure.

Improvements needed:
- Add an effective yield column to the live table
- Add a push-DD compatibility matrix (source × destination bank)
- Add a self-employed / contractor section
- Expand savings bonus section
- Add a 1099 / tax treatment callout
- Separate "truly no DD" and "push-DD workaround" into distinct sections
- Add a "what changed this month" status log
- Rename "Push-DD Workarounds" to "Direct Deposit Alternatives"
- Add comparison table: no-DD offers vs best DD-required offers

### 11. What Is Early Direct Deposit (2026 Guide) — MEDIUM
**Word count: 2,800 | Competitor range: 2,800–3,500+**

The strongest long-form editorial page. The double-dip angle is genuinely differentiated. Outgunned primarily on bank count (27 vs. 42–55+) and missing a named "does NOT offer" list.

Improvements needed:
- Expand bank count toward 40+
- Add a comparison table: Bank | Account | Early Window | Monthly Fee | Notable Feature
- Add a dedicated "Banks That Do NOT Offer Early DD" section (BofA, Citi, PNC, Truist, US Bank)
- Add GO2bank (4-day early) and Service FCU (6-day Social Security)
- Add government benefits coverage
- Add a troubleshooting FAQ
- Add pros/cons
- Add 1–2 sentences on paycheck advance apps (Dave, Albert, Earnin)
- Add per-bank activation requirement column
- Add credit union options that DO offer early DD
- Strengthen the bank bonus double-dip section with concrete examples
- Reframe the NACHA stat: "What if the deposit gets reversed?"

---

## DD Method Accuracy — Bank-by-Bank

⚠️ = errors that could directly cause a user to fail their bonus.

| Bank | Accuracy | Top Issue |
|------|----------|-----------|
| PSECU | mostly-accurate | Ally/Chase ACH push listed as "mixed" with no supporting data; official T&C excludes both |
| Capital One 360 | has-gaps | ⚠️ Venmo and PayPal marked as working (10+ data points) — DoC does not list either as working |
| Varo | has-gaps | PayPal/Venmo labeled "mixed" instead of unconfirmed; missing Alliant, M&T, USAA |
| Bank of America | needs-update | Entire DD audit poisoned by wrong-bank data (Ally Bank methods fed in) — all conclusions invalid |
| PNC Bank | has-gaps | Entire DD audit poisoned by wrong-bank data (BofA methods fed in) — re-audit required |
| Chase (personal) | has-gaps | ⚠️ Ally ACH push and Capital One ACH push marked NOT working — DoC lists both as confirmed working |
| Wells Fargo | has-gaps | ⚠️ PayPal and Venmo marked NOT working — DoC lists both as working methods |
| BMO | has-gaps | Schwab listed as "mixed" — DoC lists as confirmed working; Robinhood and Wise missing entirely |
| Affinity FCU | has-gaps | Brex ACH confirmed working per DoC aggregator but not on site at all |
| KeyPoint CU | needs-update | Fidelity and Ally listed as "mixed" — official terms explicitly exclude "recurring transfers from other sources" |
| Chime | has-gaps | ⚠️ Cash App missing (DoC confirms working); Zelle marked false (DoC has no not-working entry for Chime) |
| SoFi | needs-update | ⚠️ Fidelity and Chase ACH push marked works:true — DoC explicitly lists both as NOT working |
| Citi | mostly-accurate | Zelle presented with no caveats — DoC flags mixed/some caution; Relay Financial missing |
| U.S. Bank | needs-update | DD audit poisoned by wrong-bank data (BofA methods fed in) — re-audit required |
| 316 Financial | mostly-accurate | Fidelity and Ally listed as "mixed" — official terms exclude bank-to-bank transfers |
| Chase Business | has-gaps | ACH credits broadly are primary qualifying method (22+ DoC data points) — not mentioned; P2P crackdown not warned |
| Citi Business | has-gaps | ⚠️ P2P/ACH workarounds entirely omitted — Citi's most notable EDD characteristic |
| Central Bank Business | needs-update | ⚠️ `direct_deposit_required: false` but DD methods section still present |
| Bluevine Business | needs-update | ⚠️ "Payroll" listed as DD method but bonus has no DD requirement |
| PenFed CU | has-gaps | Fidelity listed as "mixed" — PenFed requires payroll/pension/government/military/tax refund coding |
| NASA FCU | has-gaps | Gig economy payers (DoorDash, Uber) explicitly qualify per T&C but not mentioned |
| Charles Schwab | needs-update | ⚠️ Bonus requires net asset deposit ($25k–$100k held 12 months), not payroll DD — entire DD section wrong |
| 4Front CU | needs-update | ⚠️ Bonus has NO DD requirement; site lists 6 DD methods implying DD is needed |
| Country Bank | has-gaps | ⚠️ Bill pay and generic ACH also qualify (added 10/22/24 per DoC) — not mentioned |
| Purdue FCU | has-gaps | ⚠️ PayPal and Venmo marked NOT working — fine print says "any ACH aggregate counts" |
| Grow Financial | needs-update | ⚠️ `direct_deposit_required: false` but DD IS required (two $500 DDs within 90 days) |
| GreenFi | missing-dd-section | ⚠️ DD section absent; DD required ($200+ employer/payroll/benefits within 45 days); bank-to-bank ACH excluded |
| Four Leaf FCU | missing-dd-section | ⚠️ DD section absent; recurring paycheck/pension/government $500+ required |
| PerCapita | missing-dd-section | ⚠️ Bonus requires NO DD — requires $300+ debit spend/month for 12 months |
| Horizon Bank | missing-dd-section | ⚠️ DD section absent; $500+ recurring DD within 90 days; promo code America250 not documented |
| Provident Bank | missing-dd-section | ⚠️ DD section absent; 2 separate $500 DDs within 60 days OR one ACH automatic debit |
| Ascend Bank | missing-dd-section | ⚠️ DD section absent; teller/ATM/mobile deposits explicitly excluded |
| Chase (tiered) | missing-dd-section | ⚠️ No dd_methods field; Ally/Capital One/BofA pushes confirmed failing by DoC not warned against |
| Rho | needs-update | ⚠️ Lowest tier listed as $250 — DoC title says $350; misclassified as savings (it's business checking) |

*(Plus ~35 more banks audited at mostly-accurate / has-gaps; full set in workflow output. Note: a recurring bug fed wrong-bank DD data into ~12 bank audits — those need a clean re-audit.)*

---

## Banks Missing DD Info (Require DD But Have No DD Methods Section)

1. **GreenFi** — $200+ DD from employer/payroll/benefits within 45 days; bank-to-bank ACH explicitly excluded.
2. **Four Leaf FCU** — Recurring $500+ paycheck/pension/government for all three tiers; one-time deposits disqualify.
3. **Horizon Bank** — $500+ recurring DD within 90 days; promo code America250 required, not documented.
4. **Provident Bank** — Two separate $500 DDs within 60 days, or one ACH automatic debit as alternative.
5. **Ascend Bank** — First qualifying DD within 30 days triggers $100; teller/ATM/mobile excluded.
6. **Chase (tiered $900)** — No `dd_methods` field; rich DoC community data (Fidelity CMA works; Ally/Capital One/BofA fail) not captured.

PerCapita has a missing-dd-section flag but its bonus does NOT require DD ($300+ debit spend/month) — mislabeled.

---

## Prioritized Action List

**Tier 1 — Fix Today (factual errors causing active harm)**

1. SoFi DD: mark Fidelity and Chase ACH push NOT working; add Astra and Relay Financial as working; add Alliant to not-working
2. Capital One 360: change bonus from $500 to $400 (GET400/FLASH400); add $300 fallback (OFFER300); add $250 no-DD alt (DEBIT250)
3. BMO: change `early_closure_fee` $0 → $50; remove "No early closure fee" pro
4. Chase DD: remove Ally and Capital One ACH push from "not working"; add Amex Bluebird/Serve/Checking as confirmed working
5. Wells Fargo DD: remove PayPal and Venmo from "not working"
6. Grow Financial: `direct_deposit_required` false → true; flag all 6 DD entries unconfirmed
7. 4Front CU: remove all 6 DD entries; add "NO DD required" note
8. PerCapita: remove DD framing; add correct requirement ($300+ debit/month for 12 months)
9. Rho: tier 1 $250 → $350; `product_type` savings → business_checking
10. Charles Schwab: replace DD section with deposit mechanics (net asset deposit, not payroll DD)

**Tier 2 — Fix This Week (stale/expired data)**

11–17. Update expirations: BofA → Sep 30; WF Business $825 → Jul 7; BMO Business → Aug 31 (set expired:false, tiered $400/$750/$1,000/$1,500); KeyBank Business → Aug 21; TD savings → Jul 30 (funding window 30→20); US Bank → Jul 18; Regions → set expired:false, cooldown 12mo, add code EZV3F2M
18. Flag US Bank June 18 expiration urgently on best-bank-bonuses-june-2026
19. Chase monthly fee $12 → $15 (effective Aug 24, 2025)
20. Citi: add $425 tier ($6,000+ EDDs) and $475 regional tier; add Relay Financial
21. Chase savings combo: $500 doesn't match live offer — update to current $900 checking+savings combo
22. Capital One 360 savings APY 3.40% → 4.35%; resolve lookback conflict (Jan 2024 vs Jan 2022)
23. Fifth Third: update all "$400" → "$350" (stepped down April 2026)
24–28. Add DD sections: GreenFi, Four Leaf FCU, Horizon Bank, Provident Bank, Ascend Bank

**Tier 3 — Fix This Sprint (missing info costing affiliate clicks)**

29. Expand best-checking-bonuses-2026 (420 → 2,500+ words)
30. Write takeaways for 4 picks on best-bank-bonuses-june-2026
31. Write takeaways for 4 picks on best-credit-cards-june-2026
32. Expand best-savings-bonuses-2026 (380 → 1,500+ words)
33. Expand best-credit-cards-june-2026 (380 → 1,500+ words)
34. Remove DD sections from Bluevine/PNC/Central Bank/PeoplesBank/M&T/Grasshopper Business
35. Citizens Bank: add DD minimum ($1,000/60 days), debit bonus ($2/txn up to $100), 15-state list
36. Downgrade "Fidelity ACH mixed" → "likely does not work" for 8 strict CUs (KeyPoint, 316, Citadel, Visions, Redstone, Stanford, Travis, GECU)
37. Add Chase (tiered) dd_methods: Fidelity CMA, Chase Business→Personal, TreasuryDirect; not-working list Ally/Capital One/BofA
38–50. Per-bank DD method corrections (Capital One 360, Citi, BMO, Chime, SoFi, Huntington bureau→EWS, BMO Business, Citi Business, Wells Fargo waivers, Chime window/code, PenFed, NASA FCU, Upgrade)

**Tier 4 — Content Expansion (next sprint)**

51–58. Deep expansion of the 7 long-form editorial pages per the per-page notes above.

---

## Quick Wins (Under 1 Hour Each)

1. SoFi: flip Fidelity and Chase ACH from works:true to works:false (5 min)
2. Capital One 360: bonus_amount $500 → $400 (5 min)
3. BMO: early_closure_fee $0 → $50; remove "No early closure fee" pro (10 min)
4. Update all seven expired-but-live offer dates (20 min total)
5. Add "ACT FAST: US Bank expires June 18" callout (5 min)
6. Chase monthly fee $12 → $15 (10 min)
7. Add promo code PAID100 to Chime page (5 min)
8. Add promo code America250 to Horizon Bank page (5 min)
9. Add promo code EZV3F2M to Regions page; set cooldown 12mo (10 min)
10. Add promo code DD500SPRING2026 to Visions FCU; note tiered $200/$300/$500 (10 min)
11. Remove Ally and Capital One ACH push from Chase "not working" (5 min)
12. Downgrade template "Fidelity ACH: mixed" → "likely does not work" for 8 strict CUs (30 min)
13. Rho tier 1 $250 → $350; product_type → business_checking (10 min)
14. Chase tiered $900 page product_type savings → checking (5 min)
15. Add "no DD required" note to 4Front/Bluevine/PNC/PeoplesBank/M&T Business (20 min total)
16. Write takeaway copy for the 4 picks on best-bank-bonuses-june-2026 (30 min)
17. Citizens Bank: add debit bonus + eligible states list (15 min)
18. Capital One 360 savings: add soft-pull note (5 min)

---

*Audit stats: 11 static pages, 203 bank entries, 69 banks DD-cross-referenced, 63 with discrepancies.*

---
---

# Blog Content Audit Report — Part 2: Credit Cards
*Date: June 14, 2026*

## Executive Summary

The credit-card catalog is **half-broken at the foundation**. Of 408 card entries, **208 (51%) are non-functional "$0 after $0" template stubs** that publish a page with no offer. The other 200 entries carry real content — but even there, **offer accuracy is poor and content depth lags every major competitor**.

Three findings stand out:

1. **The broken-template problem is not a credit-union edge case.** It hits the biggest, highest-traffic issuers head-on: US Bank (16 stubs), BofA (12), Citi (12), Amex (9), Capital One (9), Wells Fargo (8), Discover (7), Chase (7). These are the exact queries ("Bank of America Travel Rewards bonus," "Discover it," "Capital One Savor") that drive churning traffic — and we serve a blank offer.

2. **Real-card offers are frequently wrong, and worse, wrong with confidence.** Of the ~120 real major cards audited, a large share are `outdated` or `wrong` — and many include a fabricated FAQ line: *"As verified directly from the issuer offer page, the current bonus is X."* That line appears on the Chase Sapphire Preferred (says 60k/75k; live offer is **100k**), Amex Platinum (says guaranteed 175k; it's an "as high as" targeted offer), Amex Gold (says $6k spend; it's **$8k**), and dozens more. We are asserting issuer-verified accuracy on numbers that are stale or never existed. That is the single biggest trust and compliance liability in the catalog.

3. **Even when the offer is right, the content is thin.** Across virtually every transferable-points card we omit transfer partners, real point valuations, and the travel-credit stack that offsets the annual fee. We value Chase UR, Amex MR, Hyatt, and Avios at a flat 1¢ — producing absurd outputs like a **negative year-one value on the Capital One Venture X** and a **-$335 on the Amex Schwab Platinum**. NerdWallet and TPG lead with exactly the content we're missing.

**Competitive position:** On the cards where we have accurate, current data (Chase Ink Cash/Unlimited 100k, Citi AAdvantage Platinum 80k, BofA Premium Rewards) we are occasionally *ahead* of slow aggregators. But the median card page is a thin, often-stale stub that would lose every head-to-head against NerdWallet, TPG, or Doctor of Credit. We cannot rank or convert on this catalog as-is.

---

## Critical: Broken Templates ($0/$0)

**Scale: 208 of 408 entries (51%) render a "$0 after $0" offer.** These are live, indexable pages that promise a sign-up bonus and deliver nothing. They are the worst possible outcome for an affiliate blog: they consume crawl budget, dilute domain authority with thin content, and — if a user does land on one — convert at zero while signaling to Google that the site is low-quality.

**The damage is concentrated at major issuers (126 of the 208 broken), not just CUs:**

| Issuer | Broken stubs |
|---|---|
| US Bank | 16 |
| Bank of America | 12 |
| Citi | 12 |
| Amex | 9 |
| Capital One | 9 |
| Wells Fargo | 8 |
| Synchrony | 8 |
| Chase | 7 |
| Discover | 7 |
| Truist | 7 |
| USAA | 6 |
| Coastal | 5 |
| Barclays / Cardless / City National | 4 each |

These include flagship, high-search-volume products: **Bank of America Premium Rewards, Travel Rewards, Customized Cash; Capital One Savor and Platinum; Discover it (the entire Discover lineup); Chase Amazon/Marriott Boundless/Instacart/DoorDash; Citi AAdvantage Platinum Select, Costco, Double Cash family; Wells Fargo Autograph and Active Cash.**

Several of these cards have *real, currently-live, valuable* offers (Discover Cashback Match, BofA Premium Rewards 60k, Citi AAdvantage Platinum 80k). The page exists, the offer exists in the wild — but the catalog never populated it. This is pure lost revenue on the easiest-to-monetize queries we have.

**Why this is the #1 priority:** every other problem in this report degrades a working page. This one means the page never worked. 51% of the catalog is a liability rather than an asset.

---

## Broken Major Cards — Recovered Offers

> NOTE: The per-card web-recovery pass was deferred — it was the step that repeatedly exhausted the session usage cap (it re-ran ~112 web-research agents on every workflow resume before synthesis could run). The broken-major list (126 cards) is flagged `regenerate-has-offer` pending per-card lookup. The recommendation is uniform: **regenerate from the catalog generator (`scripts/generate-blog-content`); if the catalog has no live SUB, remove the page.** Below are the recovered/known current offers for the highest-value broken majors — these are immediately fixable because the live offer is documented elsewhere in this audit or is a stable public offer.

| Card | Real Current Bonus | Spend | AF | Action |
|---|---|---|---|---|
| Discover it Cash Back | Cashback Match (doubles all year-1 cash back, unlimited) | none | $0 | Re-model as Cashback Match, not a flat $ SUB; drop referral-only $100 |
| BofA Premium Rewards | 60,000 pts ($600) | $4,000/90d | $95 | Regenerate; add Preferred Rewards multiplier |
| BofA Unlimited Cash Rewards | $200 | $1,000/90d | $0 | Regenerate |
| BofA Travel Rewards | ~25,000 pts (verify) | varies | $0 | Regenerate from issuer |
| Capital One Savor | $250 (elevated, since 6/9/26) | $500/3mo | $0 | Regenerate |
| Citi AAdvantage Platinum Select | 80,000 miles | $3,500/4mo | $99 (waived yr1) | Regenerate (live record exists at citi-aadvantage-platinum-select-80k) |
| Citi AAdvantage MileUp | ~10,000–15,000 miles (verify) | varies | $0 | Regenerate from issuer |
| Citi Double Cash | $200 (20,000 TYP) | $1,500/6mo | $0 | Regenerate (live record exists at citi-double-cash-200) |
| Citi Costco Anywhere | no SUB (Costco card has no welcome bonus) | — | $0 | **Remove** — no offer to publish |
| Chase Amazon Prime Visa | $100–$200 Amazon gift card on approval | none | $0 | Regenerate as instant-gift-card offer |
| Chase Marriott Bonvoy Boundless | ~3 free nights / 60k+ (verify current) | $3,000/3mo | $95 | Regenerate from issuer |
| Wells Fargo Autograph | 20,000 pts ($200) | $1,000/3mo | $0 | Regenerate |
| Wells Fargo Active Cash | $200 | $500/3mo | $0 | Regenerate (note: existing wf-active-cash-200 has wrong $1,500 spend) |
| Wells Fargo Signify Business Cash | $500 (50k pts) | $5,000/3mo | $0 | Regenerate |
| Amex Marriott Bonvoy Business | 150,000 + $125 credit | $8,000/6mo | $125 | Regenerate (matches the marriott-business audit) |
| Amex Delta SkyMiles Platinum (personal) | ~90,000 (elevated, ends 7/15/26) | varies | $350 | Regenerate from issuer |
| Elan Fidelity Rewards | varies / often no SUB | — | $0 | Verify; likely **remove** |
| USAA Eagle Navigator | ~30,000 pts (verify) | varies | $95 | Regenerate from issuer |

**Process note:** Per the standing rule on 404s, any broken-major where the issuer page doesn't resolve should be checked against DoC, the institution site, and bankbonus.com before being removed. Cards confirmed to have **no welcome offer at all** (Costco Anywhere, several store/auto cards) should be **removed**, not regenerated — publishing a "sign-up bonus" page for a card with no SUB is its own accuracy problem.

---

## Broken Minor/CU Cards

**82 broken minor/CU stubs.** These are overwhelmingly small credit-union platinum/classic cards (Hawaii CU family, VyStar, City National, Coastal, Maui County, Koolau, Gather, etc.) plus a handful of fintech co-brands (Bilt Mastercard, Apple Card, Coinbase One, Gemini, Fold Bitcoin, Robinhood Gold/Platinum, Venmo, PayPal Debit).

**Recommendation — split by whether a real SUB exists:**

- **Regenerate-from-catalog (real, searchable products with potential offers):** `bilt-mastercard`, `goldman-sachs-apple-card-rwp`, `coastal-robinhood-gold-rwp`, `coastal-robinhood-platinum-rwp`, `first-electronic-bank-coinbase-one-rwp`, `webbank-gemini-rwp`, `sutton-bank-fold-bitcoin-rewards-rwp`, `cardless-avianca-lifemiles-rwp` / `-elite-rwp`, `cardless-bilt-blue-rwp` / `-obsidian-rwp`, `unfcu-unfcu-azure-rwp` / `-elite-rwp`, `langley-fcu-signature-cash-back-rwp`, `first-tech-federal-*` (2), `ubs-ubs-visa-infinite-rwp`, `cross-river-bank-upgrade-triple-rewards-rwp`, `celtic-bank-rocket-card-rwp`. Many of these genuinely have no traditional SUB (Bilt, Apple Card) — model them honestly ("no welcome bonus; here's why people get it") rather than faking one.

- **Remove (tiny single-CU classic/secured/gold cards with no SUB and near-zero search demand):** the entire Hawaii CU cluster (`aloha-pacific-*`, `big-island-*`, `cu-hawaii-*`, `ewa-fcu-*`, `fhb-*`, `garden-island-*`, `gather-*`, `hawaii-central-*`, `hawaii-community-*`, `hawaii-schools-*`, `hawaiiusa-*`, `hfs-*`, `hificu-*`, `hlefcu-*`, `hsfcu-*`, `kauai-fcu-*`, `koolau-*`, `lokahi-*`, `maui-county-fcu-*`, `uhfcu-*`), plus `abound-fcu-*`, `affinity-fcu-*`, `aod-fcu-*`, `fairwinds-cu-*`, `signature-fcu-*`, `star-one-*`, `vystar-*` secured/classic tiers, `cpb-secured` / `cpb-max-cash-secured`, `exchange-credit-program-aafes-military-star-rwp`, `lead-bank-nibbles-pet-rewards-rwp`, `continental-bank-novo-business-rwp`, `paypal-paypal-debit-rwp` (a debit card — doesn't belong in a credit-card catalog at all).

The Hawaii-CU cluster alone is ~40 of the 82. These are almost certainly the false-positive imports flagged in the prior catalog audit (CU family-page URLs scraped as products). They will never rank against the issuer's own site and should be deleted in bulk.

---

## Real Cards — Offer Accuracy Problems

These pages publish a wrong or stale offer **with a confident verification claim**, which is worse than a blank stub — a reader trusts the number and acts on it. Grouped by severity.

**Wrong bonus amount (overstated or fabricated) — fix immediately:**

- **Chase Sapphire Preferred** (`chase-chase-sapphire-preferred-rwp` and `chase-sapphire-preferred-75k`): shows 60k / 75k; **live offer is 100,000** (best-ever, confirmed by Chase newsroom + TPG). We're understating the flagship churning card by 25k–40k points during its best-ever window.
- **Chase Sapphire Reserve Business**: shows 150k/$20k; **live is 200k/$30k** as of 6/14–15.
- **Capital One Venture X** (`capital-one-venture-x-100k`): claims 100,000/$4,000/3mo — **a combination that has never existed**. Live is 75k/$4k. The 100k offer required $10k/6mo and expired Jan 2026.
- **Citi Strata Elite** (`citi-strata-elite-100k`): shows 100k; **live is 75k** (100k promo expired). Internal record says 70k — three different numbers.
- **Amex Marriott Brilliant** (`amex-marriott-brilliant-200k`): advertises 200k as "currently offering"; that offer **expired ~May 13, 2026**. Live is 150k tiered. The accurate sibling record is wrongly flagged expired while this dead one stays live.
- **Citi Tractor Supply**: "5,000 after $50" appears fabricated; real offer is 2,000 pts after a $20 purchase.

**Wrong/stale via internal data drift (structured record updated, blog prose never re-synced — page renders the stale number):**

- **Southwest Priority** (60k/$2k prose vs 90k/$3k data), **Southwest Premier** (55k/$1.5k vs 85k/$2k), **Southwest Plus** (50k vs 80k), **United Business** (75k vs 110k+2k PQP), **United Club Business** (80k vs 110k), **United Explorer-85k** (85k vs 60k), **United Gateway** (30k vs 40k), **IHG Premier / Premier-175k** (140k vs 185k), **IHG Traveler** (80k vs 125k), **Navy Federal cashRewards / Plus** ($200/$2k vs $250/$2.5k), **JetBlue Premier** (80k vs 100k), **Associated Bank Everyday Rewards+** (15k/$500 vs 25k/$1k), **Virgin Atlantic Red** (40k vs 60k), **CSR-125k** (data says 150k, prose 125k).

These are the most fixable accuracy bugs: the correct number already lives in `creditCardBonuses.ts`; the blog content layer in `cardBlogContent.ts` just needs to be regenerated for these IDs. **A single re-sync pass would fix ~15 cards.**

**Stale-down (offer reverted; we still show the elevated number) and missing waivers:**

- Amex elevated-offer cluster — **Platinum** ($8k vs $12k spend; "guaranteed 175k" is now targeted "as high as"), **Gold** ($6k vs $8k spend), **Green** (60k expired → 40k), **Business Gold** (70k/$10k vs 90k/$15k), **Schwab Platinum** (80k vs 150k, ends 7/8/26), **Morgan Stanley BCP** ($250 vs $350 + waived AF), **BCP** ($250 vs $300 + first-year fee waiver).
- Annual-fee-waiver omissions (we charge the fee in year-one math when it's actually waived): **Delta Gold/Gold Business/Platinum Business**, **Hilton Surpass/Business/Honors**, **United Explorer auto** (shows $0 AF — it's $150), **Chase United Club auto** (shows $0 AF — it's **$695**), **Chase Aer Lingus/Iberia auto** (shows $0 AF — it's $95).

**Closed / unobtainable cards still marketed as live:**

- **Citi Custom Cash** (`citi-custom-cash-200`): **closed to new applications May 28, 2026**, but `expired: false` and the page says "currently offering." A reader will click through and cannot apply.
- **Capital One Spark Miles for Business / Venture Business** (`capital-one-spark-miles-50k`): rebranded April 2026; old name no longer obtainable, and the stored 50k/$4.5k now describes a *different* card (VentureOne Business).

---

## Real Cards — Content Depth vs Competitors

On the cards where the offer is *correct*, we still lose to NerdWallet/TPG on substance. The gaps are consistent:

**1. Transfer partners are almost universally absent.** Every transferable-currency card — CSP, CSR, Ink Preferred, all Amex MR cards, all Capital One Venture cards, Citi Strata Premier/Elite, all Avios cards (Aer Lingus, BA, Iberia), JetBlue, Aeroplan — omits the partner list and ratios. This is the *entire value proposition* of these cards and the first thing competitors lead with. Example: Capital One Venture X's whole pitch is 15+ 1:1 transfer partners; our page lists none and values miles at 0.5¢.

**2. Point valuations are wrong, usually a flat 1¢ (or 0.5¢), which breaks the value math.** Real damage:
- **Capital One Venture X**: -$20 net year-one (ignores $300 travel credit + 10k anniversary miles; uses 0.5¢).
- **Amex Schwab Platinum**: **-$335** net year-one (ignores $3,000+ in credits; uses 0.7¢ when the card guarantees 1.1¢ Schwab cash-out).
- **Hilton Aspire / Honors Aspire**: claims "$0 in credits" when the card carries ~$789/yr.
- **World of Hyatt (personal + business)**: valued at 0.4–0.6¢ and lumped with Hilton/Marriott — but Hyatt is the *most* valuable hotel currency (~1.7¢). We tell readers to undervalue the best card.
- **Avios cards**: 1¢ instead of ~1.4¢ (TPG); understates every BA/Iberia/Aer Lingus bonus by ~40%.

**3. Travel-credit stacks that offset the annual fee are missing.** Citi AAdvantage Executive ($360/yr in Avis/Grubhub/Lyft credits — we show $100), Chase United Club ($810/yr — we say "$0 credits"), Amex Business Platinum, Delta cards (companion certs, free checked bags), IHG (anniversary free night, 4th-night-free), Marriott (annual free night award). These are the "is it worth the fee" answer competitors always provide.

**4. Earning structures are wrong or hidden.** Many cards omit category caps that define the product: Amex BCE/BBC ($6,000/yr per-category and $50k/yr caps), Chase Ink Cash ($25k combined 5x cap), Ink Preferred ($150k 3x cap), PNC Cash Rewards ($8k combined cap), AAA Daily Advantage ($500/yr cap). Co-brand cards mislabel the headline category as a generic "travel portal" (see next section).

---

## Card Content: Systemic Issues

These bugs recur across nearly every auto-generated `-rwp` entry and point to defects in the generator/scraper, not one-off mistakes:

1. **Raw category keys leak into reader-facing copy.** Pros lists literally render `3x on airfare_(portal)`, `gas_stations`, `all_other`, `quarterly_categories`, `specified_store(s)`, `hotels_(portal)`, `auto_parts_&_service`, `8x on special`, `2x on all_other`. This appears on dozens of cards and is the single most visible "this site is auto-generated garbage" signal. **Fix once in the template/mapping layer.**

2. **"Travel portal" mislabeling on co-brand cards.** The generator maps every airline/hotel co-brand's headline category to a generic Chase/Capital-One-style "portal." So Delta cards show "3x airfare (portal)" instead of "3x Delta purchases"; Aer Lingus/BA/Iberia show portal airfare instead of direct-flight Avios; Wyndham/Hilton/Marriott/IHG/MGM/Caesars/NCL/Carnival show "hotels (portal)" / "cruises (portal)." Several also carry a fabricated **"Travel Portal Redemption"** key benefit on cards that have no portal at all (Carnival, Emirates, Cathay, GM, Wyndham). This is both ugly *and* factually wrong.

3. **Cash-back cards mislabeled as points cards.** Amex BCE, BCP, BBC, Schwab Investor, Quicksilver, Savor, Spark Cash family, AAA Daily/Travel Advantage, Associated Bank Max Cash, FNBO Evergreen, Verizon — all flat cash-back products — render with `unit: "points"`, `cpp_value: 1`, and summaries citing a nonsensical "**100.0¢ per-point valuation**." "6% cash back" shows as "6x." This misframes the product and produces gibberish.

4. **$0 / negative net-year-one value math.** Driven by the flat valuations + empty credit fields above. Negative or near-zero net values appear on premium cards that are obviously worth holding (Venture X, Schwab Platinum, United Club, the Aspire cards), making the strongest cards look worthless.

5. **Self-referential comparison text.** The "comparison" field compares cards to themselves: Amex Business Green "closest comparison is the American Express Business Green," Amex Gold vs Amex Gold, Capital One Venture vs Venture, Citi Strata Premier referencing the expired 75k. Same template bug also injects the stale "75,000 ThankYou Points" string into ~15 unrelated comparison blocks.

6. **Fabricated "verified directly from the issuer offer page" FAQ line.** Templated onto pages regardless of whether the number is current. This is the trust/compliance issue called out in the summary — it asserts issuer verification on stale and never-existent offers.

7. **Generic, card-agnostic strategy copy.** "Downgrade or cancel before the next AF posts" appears verbatim on **$0-annual-fee cards** (UPromise, BofA Royal One). "Route utilities, groceries, gas, streaming through it" appears on a Norwegian Cruise co-brand. The strategy section is a template that ignores the actual product.

8. **5/24 self-contradiction on business cards.** Ink Cash, Ink Unlimited, Ink Preferred, Hyatt Business cons say "counts against your personal card velocity" while the same page's FAQ correctly says business cards don't add to 5/24 — contradicting itself *and* the standing house rule.

---

## Prioritized Card Action List

Ranked by impact (traffic × conversion × trust risk):

1. **Fix the fabricated "issuer-verified" FAQ line globally.** Remove or gate it behind an actual recent-verification check. Highest trust/compliance risk; touches every stale page. (Template fix.)

2. **Re-sync blog prose to structured data for the ~15 drift cards** (Southwest ×4, United ×5, IHG ×4, Navy Federal ×2, JetBlue Premier, Virgin Atlantic, Associated Bank, CSR). Correct numbers already exist in `creditCardBonuses.ts`. One regeneration pass.

3. **Regenerate the 126 broken-major stubs; remove those with no SUB.** Start with the highest-volume issuers (US Bank, BofA, Citi, Discover, Capital One, Chase, Wells Fargo). These are blank pages on prime queries.

4. **Update the high-traffic flagship offers that are flat-out wrong:** CSP → 100k, CSR Business → 200k/$30k, Venture X-100k → 75k (kill the never-existent combo), Strata Elite → 75k, Marriott Brilliant 200k → 150k (and fix the expired-flag swap).

5. **Fix the template/mapping defects** (raw category keys, portal mislabeling, cash-vs-points unit, self-comparison, generic strategy/FAQ). One generator fix corrects hundreds of pages at once.

6. **Correct the annual-fee-waiver and "$0 credits" errors** (Delta cluster, Hilton cluster, United Club $695, United/Aer Lingus/Iberia auto cards showing $0 AF). These mislead on cost.

7. **Pull or re-model closed/rebranded cards** (Citi Custom Cash closed; Spark Miles → Venture Business rebrand).

8. **Fix point valuations + add transfer partners** on the top ~20 transferable-points cards (CSP, CSR, Ink Preferred, Amex Gold/Platinum/Green, all Venture cards, Strata Premier/Elite, Avios cards, Hyatt). Biggest depth gap vs TPG/NerdWallet.

9. **Delete the ~40 Hawaii-CU + tiny-CU broken stubs** (false-positive imports). Quick cleanup, removes thin-content drag.

10. **Add fee-offsetting credit stacks** to premium cards (AAdvantage Executive, Business Platinum, IHG/Marriott/Hyatt anniversary perks).

---

## Quick Wins (Under 1 Hour Each)

Bounded, high-confidence fixes:

- **Re-sync the ~15 data-drift cards** (#2 above) — mechanical regeneration, correct values already stored.
- **Flip the Marriott Brilliant expired flags:** `amex-marriott-bonvoy-brilliant-rwp` (accurate 150k) is wrongly marked expired; `amex-marriott-brilliant-200k` (dead 200k offer) is live. Swap them.
- **Set `expired: true` on Citi Custom Cash** (closed 5/28/26) and add the product-change-only note + Double Cash alternative.
- **Fix the four "$0 AF" co-brand auto-cards:** United Club ($695), United Explorer ($150 waived yr1), Aer Lingus ($95), Iberia ($95). Single-field fixes that currently mis-state the entire card.
- **Correct `wf-active-cash-200` spend** from $1,500 → $500.
- **Correct the four AF/spend single-field errors:** Amex Graphite AF $250 → $295; Frontier AF $89 → $99; Capital One Venture X Business spend $20k → $30k; IHG Premier Business spend $3k → $4k.
- **Fix Amex BCE `bestFor`** — it's contaminated copy from a USAA 1.5% card (wrong bonus, wrong rewards, wrong issuer tie).
- **Remove the false "No Foreign Transaction Fees" claim** from Amex Business Green (it charges 2.7%) and the false "Travel Portal Redemption" benefit from Carnival/Emirates/Cathay/GM/Wyndham.
- **Delete `paypal-paypal-debit-rwp`** — a debit card in a credit-card catalog.
- **Bulk-delete the Hawaii-CU stub cluster** (~40 IDs listed in the Broken Minor section) — almost certainly scraper false positives.
- **Fix Capital One Savor bonus** $200 → $250 (elevated since 6/9/26) and the raw `8x on special` key → "8% Capital One Entertainment."

**Relevant files:** `lib/data/creditCardBonuses.ts` (structured records) and `lib/data/cardBlogContent.ts` (blog prose layer). The data-drift bugs are specifically the two files disagreeing for the same card ID — the prose layer is consistently the stale one and needs regeneration from the structured layer.

---

*Card audit stats: 408 entries · 200 real (158 major + 42 minor, all audited vs competitors) · 208 broken templates (126 major + 82 minor). Per-card offer-recovery for broken majors deferred (session-cap); regenerate via `scripts/generate-blog-content`.*
