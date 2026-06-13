# Florida (FL) — Combined Deposit + Credit-Card Sweep

**Date:** 2026-06-12
**Scope:** Local/regional FL banks & credit unions. For EACH: a single visit to its official site checking BOTH (a) new-account deposit bonus AND (b) credit-card sign-up bonus. Card side was already the deepest of any state (~31 cards across 9 issuers + VyStar inline), so DEPOSIT is prioritized; only genuinely-missing card gaps are filled.

---

## SUMMARY

- **Institutions reviewed this pass: ~33** (Suncoast, GTE, FAIRWINDS, SCCU, Achieva, Tropical, Dade County FCU, Power Financial, JetStream, We Florida, Addition, Insight, McCoy, Orlando CU, 121 Financial=merged, Community First FL, First Florida, FLCU, CAMPUS USA, PenAir, Tyndall, Eglin, Innovations, FSU/Champions First, Seacoast, Amerant, BankUnited, City National FL, EverBank, Synovus, Centennial, FWCCU, CCU Florida, Pinellas FCU, VyStar, MIDFLORIDA; Partnership Financial = IL/skipped).
- **NEW VERIFIED deposit bonuses (not already cataloged): 6** — Power Financial Welcome Gift ($100 tiered→$250), Power Financial Savings Accelerator ($150/$10k, max $750), Community First FL ($200), Florida Credit Union ($300), CAMPUS USA ($150), Florida West Coast CU ($200, also a new institution).
- **NEW VERIFIED card bonuses (not already cataloged): 3** — Power Financial Visa Signature (10k/$3k/90d), PenAir Rewards MC (20k/$1k/90d), FSU/Champions First Rewards (5k/$1k/90d, FOM-caveat). [Plus GTE Heritage & Go Premier 10k/$3k cards = genuine but excluded as nationwide-backdoor issuer.]
- **Unresolved: 1** (Orlando CU points join-bonus not confirmable on a live page) + 1 caveat (FSU/Champions First FOM = 403, backdoor status unconfirmed).
- **Re-confirmed existing + flags:** FAIRWINDS/Addition/MIDFLORIDA/Seacoast deposit rows verified live; **Achieva flagged — current page reads $50, catalog says $150 (likely stale).** Card side had NO new genuinely-state-restricted gaps among the 9 already-cataloged issuers.
- Card side remained the deepest of any state; deposit was the productive axis (6 new), as expected.

---

## Already in catalog (baseline — re-confirmed where revisited)

**Deposit (stateBankBonuses.ts / recurringBankOffers.ts):**
- Valley Bank — $100 checking (multi-state)
- Achieva CU — $150 checking
- Addition Financial CU — $100 checking
- FAIRWINDS CU — $50 checking (online-open new members)
- Fifth Third Bank — $350/$400 checking (multi-state)
- Wings CU — $500 checking (multi-state, promo WINGS26)
- MIDFLORIDA CU — $400 checking
- Grow Financial FCU — $300 checking (FL/SC)
- Seacoast Bank — $300 checking (FL/GA)
- Hancock Whitney — $600 checking/savings (Gulf South incl. FL)
- GTE Financial — EXPIRED (Bolts24 Lightning jersey, non-cash, expired 1/31/26)

**Cards (florida.ts + VyStar inline):** SCCU (4), MIDFLORIDA (4), Grow (6), Addition (3), Florida CU (3), CAMPUS USA (3), Community First FL (4), First Florida (1), CCU Florida (3), VyStar (3 inline).

---

## Findings by institution

### Suncoast Credit Union — suncoast.com — credit union — FOM: 39+ FL counties (largest CU in FL; community charter)
- **DEPOSIT:** No publicly-claimable new-account cash bonus. Own-domain search (site 403/Cloudflare to WebFetch) surfaced only: a member referral ("$25 for you and $25 for them"), a "Year of No Payments Giveaway" (a **sweepstakes/random drawing — NOT publicly claimable**), and a "Smart Start Certificate Welcome Offer" (Suncoast covers the initial $50 deposit on a starter CD if you contribute $40+/mo — a savings-builder, not a cash bonus). High-yield checking pays 7.00% APY on $0–500 (rate special, not a bonus). → **No qualifying deposit bonus.**
- **CARD:** Visa cards (Rewards Visa, Cash Rewards, Classic Starter, Share-Secured) earn ScoreCard points (1x; 2x gas/groceries/tolls), no annual fee — but **no sign-up/welcome bonus advertised**. → No card bonus.
- Source: suncoast.com own-domain WebSearch (2026-06-12); WebFetch returned HTTP 403.

### GTE Financial — gtefinancial.org — credit union (community + CU Savers backdoor) — FOM: Tampa-area zips OR join via "CU Savers" non-profit club (nationwide backdoor)
- **DEPOSIT:** No new checking/savings cash bonus (confirmed via official checking page). Prior Bolts24 promo (Lightning jersey, non-cash) expired 1/31/26. → **No qualifying deposit bonus.**
- **CARD (found, but EXCLUDED by policy):** GTE **Heritage Card** — *"10,000 bonus points after spending $3,000 within the first three months"* (4x travel/dining, 2x EV/gas/groceries/home improvement). GTE **Go Premier** — *"10,000 bonus points after spending $3,000 within the first three months"* (3x fuel/travel/dining, no AF). Go To / Go Forward = no signup bonus. These ARE genuine, advertised signup bonuses, BUT GTE is a confirmed nationwide-backdoor issuer (membership via the **CU Savers** non-profit educational club, open to anyone) — per REVERIFY.md it is deliberately excluded from the state-restricted module. Logged here for completeness; not a new state-restricted add.
- Source: gtefinancial.org/borrow/credit-cards + /services/eligibility (CU Savers) (2026-06-12).

### FAIRWINDS Credit Union — fairwinds.org — credit union — FOM: Central FL community charter
- **DEPOSIT (already in catalog — re-confirmed live):** $50 to a new checking account. Eligibility: **new members who opened membership ONLINE** only (excludes existing members, <18, employees, Ramsey Smart Bundle). Complete 3 of 5 activities within **60 days** of opening the Membership Share: (1) $500 in qualifying direct deposits [paycheck/pension/govt ACH; P2P excluded], (2) enroll in Change it Up, (3) one qualifying debit purchase, (4) open a savings/CD, (5) open any consumer loan or credit card. Paid same/next business day after all activities satisfied; account must be in good standing, non-negative, not closed/restricted. No fixed deadline. → matches `fairwinds-cu-50-checking-2026`.
- **CARD:** No credit card welcome bonus mentioned on the offer page. (FAIRWINDS = nationwide-backdoor for cards per REVERIFY; deposit-only here.) → No card bonus.
- Source: fairwinds.org/terms/maximize-your-membership (2026-06-12).

### Space Coast Credit Union (SCCU) — sccu.com — credit union — FOM: 34 FL east-coast counties (Flagler→Miami-Dade)
- **DEPOSIT:** 100% free checking, no hidden fees / no transaction requirements — **no new-account cash bonus advertised**. (Site is PerimeterX/perfdrive bot-walled to WebFetch; own-domain WebSearch confirms.) → No deposit bonus.
- **CARD (already in catalog):** Visa Signature (25k pts / $3k / 3mo — already in florida.ts), Platinum, Low Rate, Secured. No NEW card gap. → Already cataloged.
- Source: sccu.com own-domain WebSearch (2026-06-12); WebFetch blocked (perfdrive).

### Achieva Credit Union — achievacu.com — credit union — FOM: FL community charter (Tampa Bay / west-central)
- **DEPOSIT (already in catalog — but AMOUNT DISCREPANCY, likely now lower):** Own-domain search of the live CheckingOffer page (2026-06-12) describes the **current** personal offer as **$50** (not the $150 in catalog row `achieva-cu-150-checking-2026`): "$50 bonus for members 18+ who set up and receive two or more qualified direct deposits totaling $500 or more per month into their existing Achieva Checking or Achieva Checking Plus account." Prior-bonus-in-past-12-months excluded. The $400 business-checking promo ended 12/31/2025. **FLAG: the catalog $150 appears stale — current advertised amount reads $50.** (WebFetch to the page returned 404/bot-block; own-domain search is the only obtainable proof.)
- **CARD:** No credit card welcome bonus surfaced. (Achieva = nationwide-backdoor for cards per REVERIFY; deposit-only.) → No card bonus.
- Source: achievacu.com/Promo/CheckingOffer via own-domain WebSearch (2026-06-12).

### Tropical Financial Credit Union — tropicalfcu.com — credit union — FOM: Miami-Dade, Broward, Palm Beach, St. Lucie, Martin, Hendry, Collier, Lee, Sarasota, Monroe, Charlotte, Manatee
- **DEPOSIT:** Free Daily Rewards Checking (2¢ back per debit swipe, no monthly fee) — a rewards feature, **not a new-account cash bonus**. No new-member deposit bonus surfaced on own-domain search. → No deposit bonus.
- **CARD:** Platinum Rewards Mastercard earns 1 pt/$1 (UChoose redemption); **no sign-up/welcome bonus advertised**. (Matches REVERIFY note: Tropical "no fetchable card page" / no qualifying signup bonus.) → No card bonus.
- Source: tropicalfcu.com own-domain WebSearch (2026-06-12); WebFetch returned 404.

### Dade County Federal Credit Union — dcfcu.org — credit union — FOM: Miami-Dade (county employees + community SEGs)
- **DEPOSIT:** Promotions page surfaced no new-account checking/savings cash bonus. Secure Plus Checking offers cash-back/ID-protection (a paid premium account feature, not a signup bonus). → No deposit bonus.
- **CARD:** No card welcome bonus surfaced. → No card bonus.
- Source: dcfcu.org/promotions via own-domain WebSearch (2026-06-12); WebFetch returned 404.

### Power Financial Credit Union (PFCU) — powerfi.org — credit union — FOM: 13 FL counties (Broward, Miami-Dade, Palm Beach, Lee, Collier, Charlotte, Martin, Monroe, St. Lucie, Hillsborough, Manatee, Pinellas, Sarasota) + family + SEGs (FPL/NextEra, Ryder, Sanitas, Bonefish & Tarpon Trust — joinable from anywhere)
- **DEPOSIT — NEW, VERIFIED-ACTIVE:** "Welcome Gift" tiered new-member bonus. **$100** for opening a checking account; **$150** checking + consumer loan; **$200** checking + consumer loan + credit card; **$250** checking + consumer loan + credit card + mortgage. Promo code **"JT"** at membership opening. Requirement: open checking with a min direct deposit OR initial deposit of **$500 that remains in the account for at least 90 days**, and the checking must stay open 90 days. Must be a member. Paid to PFCU account **no later than 120 days after account opening**. 1099 may be issued. New members. (Online-open supported; powerfi.org "Join-Now".) No fixed end date stated.
- **DEPOSIT (second offer):** "Savings Accelerator Bonus" page exists (separate cash bonus on a savings/deposit product) — see note below; not fully parsed. Also Cash Back Checking pays 6.00% APY up to $15k with activity (rate special, not a signup bonus).
- **CARD — NEW, VERIFIED-ACTIVE:** PFCU **Visa Signature** rewards card — *"earn 10,000 bonus points if you spend $3,000 in the first 90 days."* No annual fee (cash-back rewards card). Visa Platinum = no rewards/no bonus. Current BT promo: 0% until June 2027, $0 BT fee, expires 6/30/2026.
- **NOTE:** Membership has a couple of from-anywhere SEG paths (FPL/NextEra & Ryder employees nationwide; Bonefish & Tarpon Trust conservation nonprofit). These are narrow employer/association paths, not a cheap open foundation backdoor — PFCU is a genuine South-FL regional CU comparable to SCCU/MIDFLORIDA. Recommend ADDING both the deposit bonus and the Visa Signature card to the FL catalog.
- Source: powerfi.org/About/Membership/Welcome-Gift, /Personal/Borrow/Personal-Credit-Cards/Visa-Signature-Credit-Card, /About/Membership/Join-Now via own-domain WebSearch (2026-06-12); WebFetch returned 403.

### JetStream Federal Credit Union — jetstreamfcu.org — credit union — FOM: Miami-Dade & Puerto Rico
- **DEPOSIT — EXPIRED:** New-member referral bonus ($50 to new member + $50 referrer) for opening membership savings + checking + e-Statements — but the offer was **valid Feb 1–Dec 31, 2023 (EXPIRED)** and is **referral-only** (requires an existing member to refer), so not a publicly-claimable standalone new-account bonus even if renewed. → No qualifying deposit bonus.
- **CARD:** No card signup bonus surfaced. → No card bonus.
- Source: jetstreamfcu.org/index.php/referral (WebFetch, 2026-06-12).

### Power Financial CU — Savings Accelerator Bonus (second PFCU deposit offer) — NEW, VERIFIED-ACTIVE
- **DEPOSIT — NEW, VERIFIED-ACTIVE:** Tiered "new money" savings bonus: **$150 bonus for every $10,000 deposited, maximum $750** (i.e. $50k caps it). New money = funds from a source not affiliated with PFCU; up to $50,000 from an external account. New money + existing balance must remain for a **minimum of 5 consecutive calendar months**. Paid as a statement credit, allow up to 60 days; 1099-INT. (Same FOM/eligibility as PFCU above.) Recommend adding alongside the Welcome Gift.
- Source: powerfi.org/Savings-Accelerator-Bonus via own-domain WebSearch (2026-06-12).

### We Florida Financial — wefloridafinancial.com — credit union — FOM: Broward/South FL community charter
- **DEPOSIT:** Promos page shows only product/rate features (e.g. Ultra Checking 3.25% APY) — **no new-account cash bonus or deposit bonus**. → No deposit bonus.
- **CARD:** Rewards Visa earns 3x dining/grocery, 2x gas, 1x else (intro 1.99% APR) — **no sign-up/welcome bonus advertised**. → No card bonus.
- Source: wefloridafinancial.com/promos (WebFetch) + /personal/credit-card own-domain WebSearch (2026-06-12).

### Partnership Financial Credit Union — mypfcu.org — NOT A FLORIDA INSTITUTION
- Listed in the sweep brief, but Partnership Financial CU is headquartered in **Illinois** (mypfcu.org, 847 area code). No FL field of membership. **Skipped — out of state.**

### Addition Financial Credit Union — additionfi.com — credit union — FOM: 43 FL + 5 S. GA counties (formerly CFE FCU)
- **DEPOSIT (already in catalog — re-confirmed, enrichable):** Current live structure: **$100** for a first-time **Benefits Checking** ($2,000/mo direct deposit OR 20 debit txns ≥$10 each within 60 days) OR **$50** for a first-time **Classic Checking** ($1,000 DD OR 10 debit txns within 60 days). First-time account holders only; excludes anyone whose account closed within 90 days or with a negative balance. Paid within **7 business days** after requirements met; **clawback** if account closed within 90 days. → Matches `addition-financial-cu-100-checking-2026`; could enrich with the $50 Classic tier + clawback/payout detail. (The "up to $300/$400" figures seen in aggregated search are older/marketing copy — the live offer page reads $100/$50.)
- **CARD (already in catalog):** Premier Rewards Visa (10k/$1k/3mo) + Premier Cash ($100/$500/3mo) + Platinum — already in florida.ts. No new gap.
- Source: pages.additionfi.com/checking-bonus (WebFetch, 2026-06-12).

### Insight Credit Union — insightcreditunion.com — credit union — FOM: Central FL (Orange, Seminole, Lake, Volusia, etc.)
- **DEPOSIT:** Promotions page = rate specials only (Incentive Checking 4.75% APY, 12-mo CD 3.70% APY) — **no fixed-dollar new-account cash bonus**. → No deposit bonus.
- **CARD:** No card welcome bonus advertised. → No card bonus.
- Source: insightcreditunion.com/why-insight/promotions (WebFetch, 2026-06-12).

### McCoy Federal Credit Union — mccoyfcu.org — credit union — FOM: Orange + 7 Central FL counties
- **DEPOSIT:** No new-account cash/deposit bonus on any checking product (Smarter/Smart/Simply/Fresh Start/Easy Checking). Debit rewards points only. → No deposit bonus.
- **CARD:** Visa Signature Rewards (1.25 pt/$1), Platinum Rewards (1 pt/$1) — **no sign-up/welcome bonus advertised**. → No card bonus.
- Source: mccoyfcu.org/promotions/easy-checking.html + card pages (WebFetch, 2026-06-12).

### Orlando Credit Union (O Financial) — orlandocreditunion.org — credit union — FOM: Orange + Central FL counties
- **DEPOSIT:** Live checking page shows **no new-member welcome cash bonus** (only ongoing "My Debit Offers" merchant rewards). An aggregated search snippet referenced a "1,000 pts join + 1,500 pts setup" rewards-points bonus, but the rewards page 404'd and the live checking page contradicts it → **not confirmable on a live official page; no qualifying deposit bonus.**
- **CARD:** Visa Smart cards (no annual fee, intro 1.99-6.99% APR) — no sign-up bonus advertised. → No card bonus.
- Source: orlandocreditunion.org/checking-savings/checking-accounts (WebFetch, 2026-06-12); /rewards returned 404.

### 121 Financial Credit Union — 121fcu.org — MERGED INTO VYSTAR
- 121 Financial has officially merged into **VyStar Credit Union**; accounts converted. No longer a separate institution. **Skipped — defunct.** (VyStar deposit + cards already covered inline.)

### Community First Credit Union of Florida — communityfirstfl.org — credit union — FOM: 17 FL counties (Duval, Clay, Nassau, St. Johns, Orange, Broward, Palm Beach, etc.)
- **DEPOSIT — NEW, VERIFIED-ACTIVE:** **$200** with a new Community First consumer checking account. Promo code **FREECHECK** (online). Requirements within first 90 days: **$1,000+ in deposits** AND **10+ debit card transactions**. **No direct deposit required.** Paid **day 91-97** from opening. **New customers only** (existing/previously-closed checking holders excluded). No minimum balance, no monthly maintenance fee. **Clawback:** reward forfeited if checking closed before the reward is deposited. Online or in-person open. No fixed deadline ("offers may end at any time"). → **NOT currently in catalog as a deposit bonus** (only Community First cards are cataloged). Recommend ADDING.
- **CARD (already in catalog):** Visa Signature ($150 / $1,000 / 90d, 1.5% cash back), Platinum Rewards (10k pts / $1,000 / 90d = $150), Platinum, Secured — all already in florida.ts.
- Source: communityfirstfl.org/personal-banking/checking/checking-bonus (WebFetch, 2026-06-12).

### First Florida Credit Union — firstflorida.org — credit union — FOM: ~39 FL counties + 20+ SEGs
- **DEPOSIT — referral-only / modest:** Only a **$50 Visa Reward Card** via the member-referral program — requires registering through a referral link, then within 90 days either a recurring direct deposit of $250+ into a new checking OR a new loan. Delivered as a Visa Reward Card 4-6 weeks after completion. **Referral-link-gated, paid as a gift card** → flag as not a standard publicly-claimable standalone new-account bonus. No standalone checking bonus on the open-account page. → No qualifying standalone deposit bonus.
- **CARD (already in catalog):** First Florida Diamond Rewards Visa (7,500 pts on first purchase in 90d) — already in florida.ts.
- Source: firstflorida.org/member-referral-program via own-domain WebSearch (2026-06-12).

### Florida Credit Union (FLCU) — flcu.org — credit union — FOM: 48 North/Central FL counties
- **DEPOSIT — NEW, VERIFIED-ACTIVE:** **$300** bonus on a free personal full-service checking account. Promo code **26CHK300**. Requirements: credit approval + **$5 initial open deposit**; **$500 cumulative direct deposit within first 60 days** (electronic paycheck/pension/govt benefit — P2P like Venmo/PayPal/Cash App excluded). **Prior-customer limit: anyone who held an FCU checking in the past 24 months is ineligible.** 18+; **one bonus per household.** Paid after account is open & in good standing **90 days**; reported on 1099-INT. No monthly maintenance fee. No fixed deadline ("limited time, can be cancelled at any time"). A combined "up to $700" promo = this $300 checking + up to $400 auto-refinance rebate (promo AUTO26; refi is not a deposit bonus). → **NOT currently in catalog as a deposit bonus** (only FLCU cards are cataloged). Recommend ADDING.
- **CARD (already in catalog):** FCU Select Visa Signature (15k pts / $3,000 / 90d), Platinum Wave Rewards, Platinum Rate — already in florida.ts.
- Source: flcu.org/300/ and flcu.org/700/ (WebFetch, 2026-06-12).

### CAMPUS USA Credit Union — campuscu.com — credit union — FOM: 24 FL counties + UF affiliations
- **DEPOSIT — NEW, VERIFIED-ACTIVE:** **$150** bonus on "In it for You Checking" (the "$300" headline reflects marketing; disclosed bonus is $150). Requirements: credit approval + **$5 opening deposit** to savings; elect **eDocuments** and establish **direct deposit of at least $200 within the first 90 days**; account remains open after 90 days → $150 paid. (Plus a separate small mobile-deposit bonus for first-time mobile depositors.) → **NOT currently in catalog as a deposit bonus** (only Campus cards cataloged). Recommend ADDING.
- **CARD (already in catalog):** CAMPUS Platinum Rewards Mastercard (10k pts / $1,000 / 90d), Platinum, CMN Platinum — already in florida.ts.
- Source: campuscu.com/checking-bonus/ + /personal-banking/in-it-for-you-checking/ via own-domain WebSearch (2026-06-12); WebFetch returned 404.

### PenAir Credit Union — penair.org — credit union — FOM: Pensacola FL + Mobile AL + Panama City FL region
- **DEPOSIT:** No new-account checking/savings cash bonus (offer page shows only no-fee checking + high-yield checking dividend qualifiers). → No deposit bonus.
- **CARD — NEW, VERIFIED-ACTIVE:** PenAir **Rewards Mastercard** — *"20,000 PenAir Rewards bonus points after making purchases totaling at least $1,000 that post within 90 days of account open date."* 1 pt/$1; **no annual fee, no balance transfer fee**; points valid 3 years; redeem for cash back/gift cards/travel/merchandise. → **NEW card, not in catalog.** Regional FOM (FL Panhandle + S. Alabama). Recommend ADDING (verify membership isn't a nationwide backdoor before adding; FOM appears geographic).
- Source: penair.org/credit-cards/rewards/ (WebFetch, 2026-06-12).

### Tyndall Federal Credit Union — tyndall.org — credit union — FOM: FL Panhandle + S. Alabama
- **DEPOSIT:** No new-account cash bonus. "Relationship Reward" = a special **dividend** for maintaining checking + activity (not a signup bonus); "My Offers" page empty; Certificate Promo = rate special. → No deposit bonus.
- **CARD:** Everyday Rewards Credit Card — no sign-up/welcome bonus advertised. → No card bonus.
- Source: tyndall.org/my-offers + info.tyndall.org/relationshipreward (WebFetch + own-domain search, 2026-06-12).

### Eglin Federal Credit Union — eglinfcu.org — credit union — FOM: Okaloosa/Walton + Eglin AFB region
- **DEPOSIT:** Free Premium Checking, $5 open, ChexSystems/consumer-report review noted — **no new-account cash bonus**. → No deposit bonus.
- **CARD:** Eglin Platinum Rewards Mastercard (up to 10 pts/$1 on select categories, 7.9% APR, no fees) — **no sign-up/welcome bonus advertised**. → No card bonus.
- Source: eglinfcu.org/mastercard/ + /checking/ via own-domain WebSearch (2026-06-12).

### Innovations Financial Credit Union — innovationsfcu.org — credit union — FOM: Bay County / Panama City region
- **DEPOSIT:** Ignite Rewards Checking ($5 membership) — **no new-account cash bonus advertised**. → No deposit bonus.
- **CARD:** Platinum & Rewards Visa (7.50% APR, no fees) — **no sign-up/welcome bonus advertised**. → No card bonus.
- Source: innovationsfcu.org/accounts/checking/ + /loans/credit-cards/ via own-domain WebSearch (2026-06-12).

### FSU Credit Union / Champions First Credit Union — championsfirst.org (fsucu.org redirects) — credit union — FOM: North Florida (Tallahassee/FSU community charter; rebranded "Champions First" 2026)
- **DEPOSIT:** No new-account checking cash bonus surfaced on news-promotions (page 403/blocked; own-domain search found only a card BT promo + a "New Year Clean Slate" loan promo). $5 membership to open. → No confirmed deposit bonus.
- **CARD — NEW, VERIFIED-ACTIVE (membership caveat):** Champions First **Rewards Credit Card** — *"5,000 bonus points after spending $1,000 within the first 90 days."* (Also a BT promo 0% APR for transfers processed 1/15/2026–5/31/2026, now expired for new transfers.) → NEW card. **CAVEAT: membership-eligibility page was 403/blocked — could not confirm whether FOM is North-FL-restricted or has a nationwide backdoor. Confirm FOM before adding.** Modest 5k bonus.
- Source: championsfirst.org/champions-choice-credit-card-rewards/ via own-domain WebSearch (2026-06-12); membership + promotions pages returned 403.

## FL Banks

### Seacoast Bank — seacoastbank.com — bank — FL/GA
- **DEPOSIT (already in catalog — re-confirmed, enrichable):** **$300** for a new Seacoast checking ($250 for $500+ direct deposits in first 90 days) **+ $50** for 15+ debit transactions in 90 days = **up to $350**. FL or GA resident, 18+; new customers only (excludes anyone who closed a Seacoast account within 12 months). Valid **12/15/2025–12/31/2026 (ACTIVE)**. Paid within 95 days. → Matches `seacoast-bank-300-checking-2026`; could enrich with the +$50 debit tier ($350 total).
- **CARD:** No credit card sign-up bonus on the offer page. → No card bonus.
- Source: seacoastbank.com/switch300 (WebFetch, 2026-06-12).

### Amerant Bank — amerantbank.com — bank — FL (Miami) + TX/Houston
- **DEPOSIT — EXPIRED (seasonal, likely recurring):** Value Checking tiered bonus **$300** (avg $10,000 over 3 cycles) / **$600** (avg $25,000), FL residents, $500+ direct deposit in 90 days, one per customer / not in past 2 years — but the verified instance was **valid 08/06/2025–11/24/2025 (EXPIRED)**. A live "/checking-bonus/" landing + "Miami Dolphins" co-brand page exist but did not surface current dated terms via WebFetch. → No CURRENTLY-verifiable active deposit bonus; watch for renewal (seasonal). 
- **CARD:** No consumer card sign-up bonus surfaced. → No card bonus.
- Source: amerantbank.com/checking-bonus/ + own-domain WebSearch (2026-06-12).

### BankUnited — bankunited.com — bank — FL
- **DEPOSIT:** Vertical Rewards Premier Checking = intro APY rate special (up to 3.00% APY for 3 cycles, $10,000 min open, $20/mo fee under $10k) — **a rate promo, not a cash signup bonus**. → No qualifying deposit bonus.
- **CARD:** No consumer card sign-up bonus surfaced. → No card bonus.
- Source: bankunited.com/personal/checking-accounts own-domain WebSearch (2026-06-12).

### City National Bank of Florida — citynational.com — bank — FL
- **DEPOSIT — BUSINESS ONLY:** $1,000 bonus on a new **Business** Select Checking ($100 min open, new-to-bank $50,000 deposited in 30 days + maintained 3 cycles), valid **12/1/2025–3/31/2026** (expires soon), new clients only. **No personal checking bonus** found. → No publicly-claimable PERSONAL deposit bonus (business-only flag).
- **CARD:** No consumer card sign-up bonus surfaced. → No card bonus.
- Source: citynational.com own-domain WebSearch (2026-06-12).

### EverBank (formerly TIAA Bank) — everbank.com — bank — Jacksonville HQ, online nationwide
- **DEPOSIT:** Performance Checking / Performance Savings = high-yield, ATM-fee reimbursement, no monthly fee — **no new-customer cash bonus surfaced** (rate-focused). EverBank is effectively a nationwide online bank. → No qualifying deposit bonus.
- **CARD:** No consumer credit card. → No card bonus.
- Source: everbank.com/banking own-domain WebSearch (2026-06-12).

### Synovus Bank — synovus.com — bank — multi-state Southeast incl. FL (already cataloged/nationwide)
- **DEPOSIT — referral-only:** Refer-a-Friend $50 for the referred person (open Plus/Inspire/Budget Checking, 5 debit txns in 60 days, paid within 120 days) — **referral-gated**, not a standard publicly-claimable bonus. → No qualifying standalone deposit bonus. (Synovus already excluded per REVERIFY.)
- **CARD:** No state-specific card bonus. → n/a.
- Source: synovus.com/personal/refer-a-friend own-domain WebSearch (2026-06-12).

### Centennial Bank (Home BancShares) — my100bank.com — bank — AR/FL/AL/TX/NY
- **DEPOSIT:** Freedom Checking / Diamond Checking ($100 open, no min balance) — **no new-customer cash bonus surfaced**. → No deposit bonus.
- **CARD:** No consumer card sign-up bonus surfaced. → No card bonus.
- Source: my100bank.com own-domain WebSearch (2026-06-12).

## Discovery pass (additional CUs)

### Florida West Coast Credit Union (FWCCU) — fwccu.com — credit union — FOM: Tampa Bay / Hillsborough region (1942 charter)
- **DEPOSIT — NEW, VERIFIED-ACTIVE:** **$200** on a new FREE Checking account. Requirement: **new direct deposit of $1,500+/month**, first DD posting **within 60 days** of opening. **$20 opening deposit.** New checking only (existing checking holders excluded). Paid **within 90 days** of opening; reported to IRS. No monthly service fee. Valid **as of January 1, 2026 (ACTIVE)**, may be cancelled anytime. → **NEW institution + NEW deposit bonus, not in catalog.** Recommend ADDING.
- **CARD:** Offers credit cards but **no sign-up bonus** on the offer page. → No card bonus.
- Source: fwccu.com/get-200 (WebFetch, 2026-06-12).

### Community Credit Union of Florida (CCU) — ccuflorida.org — credit union — FOM: Brevard, Indian River, Orange, Osceola, Polk, Volusia
- **DEPOSIT — NON-CASH PRIZE (flag):** Current new-checking promo gives a **cruise vacation voucher for two** (after a $1,000/mo direct deposit maintained 90 days) — a **merchandise/travel prize, NOT publicly-claimable cash → flagged, not added.** A "$500 Checking Bonus" landing page exists but its live content is just rate-based Free Checking Plus (2.50% APY up to $10k) with **no actual $500 cash bonus**. → No qualifying CASH deposit bonus.
- **CARD (already in catalog):** CCU Florida Visa Platinum Rewards / Low-Rate / Secured — already in florida.ts.
- Source: ccuflorida.org/home/landing/checkinganddebitcard + /checkingbonus (WebFetch + own-domain search, 2026-06-12).

### Pinellas Federal Credit Union — pinellasfcu.org — credit union — FOM: Pinellas County (govt/SEG)
- **DEPOSIT:** Kasasa Rewards Checking (5.00% APY or 5% cash back up to $15/mo) = rate/rewards account, **not a new-account cash signup bonus**. $5 + $5 app fee to join. → No deposit bonus.
- **CARD:** "Newly designed rewards card" — **no sign-up bonus surfaced**. → No card bonus.
- Source: pinellasfcu.org own-domain WebSearch (2026-06-12).

### VyStar Credit Union — vystarcu.org — credit union (deposit + cards already covered inline)
- **DEPOSIT — branch-restricted / not broadly claimable:** Current promotions: VyStar+ Checking "up to $50/mo savings" (ongoing perk, not signup cash) and a **Hamlin-branch-only** offer ($25 + $150 for recurring DD + 15 debit txns in 90 days + referral $25×10), valid only for accounts opened **at the VyStar Hamlin branch before 8/31/2026**. The cash bonus is **geo/branch-restricted → not broadly publicly claimable** statewide. → No broadly-claimable deposit bonus to add.
- **CARD (already inline):** VyStar Visa Signature Cash Back / Rewards / Orlando Magic — already in creditCardBonuses.ts.
- Source: vystarcu.org/who-we-are/promotions own-domain WebSearch (2026-06-12).

### MIDFLORIDA Credit Union — midflorida.com — re-confirm (already in catalog)
- **DEPOSIT (already in catalog — re-confirmed live, enrichable):** **$400** Free Checking ($4,000 cumulative ACH payroll/pension/govt DD + 40 debit purchases within 75 days; $50 to open; bonus after 90 days; one per SSN; past holders/prior recipients ineligible). **Alt $200 tier** ($2,000 DD + 20 debit txns). Valid as of June 1, 2026. → Matches `midflorida-cu-400-checking-2026`; could enrich with the $200 alt tier.
- Source: midflorida.com/current-offers/$400-bonus-free-checking own-domain WebSearch (2026-06-12).

---

## THREE BUCKETS

### A. VERIFIED-ACTIVE — NEW (not already in catalog) — recommend adding

**Deposit bonuses:**
1. **Power Financial CU — Welcome Gift $100 tiered** (→$150/$200/$250), promo code JT, $500 DD/initial held 90 days. powerfi.org/About/Membership/Welcome-Gift
2. **Power Financial CU — Savings Accelerator Bonus** $150 per $10k new money, max $750, held 5 months. powerfi.org/Savings-Accelerator-Bonus
3. **Community First CU of Florida — $200 checking**, code FREECHECK, $1,000 deposits + 10 debit txns/90 days, no DD required. communityfirstfl.org/personal-banking/checking/checking-bonus
4. **Florida Credit Union (FLCU) — $300 checking**, code 26CHK300, $5 open + $500 DD/60 days, prior-24-month limit. flcu.org/300/
5. **CAMPUS USA CU — $150 checking** ("In it for You"), $5 open + eDocs + $200 DD/90 days. campuscu.com/checking-bonus/
6. **Florida West Coast CU (FWCCU) — $200 checking**, $1,500/mo DD (first within 60 days), $20 open. fwccu.com/get-200  *(also a NEW institution)*

**Card bonuses:**
7. **Power Financial CU — Visa Signature** 10,000 pts / $3,000 / 90 days, no AF. powerfi.org/.../Visa-Signature-Credit-Card
8. **PenAir CU — Rewards Mastercard** 20,000 pts / $1,000 / 90 days, no AF (FL Panhandle + S. AL). penair.org/credit-cards/rewards/
9. **FSU CU / Champions First — Rewards Card** 5,000 pts / $1,000 / 90 days *(CAVEAT: confirm FOM isn't a nationwide backdoor before adding; membership page was 403)*. championsfirst.org/champions-choice-credit-card-rewards/

### A2. VERIFIED-ACTIVE — already in catalog (re-confirmed; some enrichable)
- FAIRWINDS $50 checking (re-confirmed). 
- Addition Financial $100/$50 checking (re-confirmed; enrich with $50 Classic tier + clawback).
- MIDFLORIDA $400 checking (re-confirmed; enrich with $200 alt tier).
- Seacoast Bank $300 checking (re-confirmed; enrich with +$50 debit tier = $350).
- Achieva checking — **FLAG: current advertised amount reads $50, not the $150 in catalog (likely stale — update or re-verify).**
- (Grow $300, Wings $500, Valley $100, Fifth Third, Hancock Whitney — multi-state rows, not re-fetched this pass.)
- Cards: SCCU, MIDFLORIDA, Grow, Addition, FLCU, CAMPUS, Community First FL, First Florida, CCU Florida, VyStar — all re-confirmed present, no new gaps.

### B. EXPIRED / seasonal / non-cash / business-only (NOT publicly claimable now)
- **GTE Financial Heritage & Go Premier cards** — 10k/$3k/3mo each, GENUINE but GTE = nationwide-backdoor issuer (CU Savers club) → excluded by policy.
- **Amerant Bank $300/$600 checking** — expired 11/24/2025 (seasonal; watch for renewal). Only Digital CD rate specials live now.
- **JetStream FCU $50 new-member** — expired 12/31/2023 + referral-only.
- **City National Bank of FL $1,000** — BUSINESS checking only, ends 3/31/2026.
- **CCU Florida cruise voucher** — non-cash merchandise/travel prize.
- **VyStar Hamlin-branch bonus** — geo/branch-restricted (one branch, by 8/31/2026).
- **First Florida $50 / Synovus $50 / Suncoast $25 / Achieva $100 / JetStream $50** — referral-gated and/or paid as gift cards → not standard publicly-claimable.
- **GTE Bolts24** — expired 1/31/26, non-cash (Lightning jersey).

### C. UNRESOLVED (own-domain proof unobtainable)
- **Orlando Credit Union** — an aggregated snippet referenced a points join-bonus (1,000 + 1,500 pts) but the rewards page 404'd and the live checking page shows no welcome bonus → could not confirm on a live official page.
- **FSU CU / Champions First membership FOM** — card bonus verified, but membership-eligibility page returned 403 → backdoor status unconfirmed (listed in bucket A with caveat).

---

## Institutions reviewed with NOTHING publicly claimable found
Suncoast CU (sweepstakes + referral only), GTE Financial (deposit), Space Coast CU (deposit), Tropical Financial CU, Dade County FCU, We Florida Financial, Insight CU, McCoy FCU, Tyndall FCU (deposit), Eglin FCU, Innovations FCU, Pinellas FCU, BankUnited, EverBank, Centennial Bank, Amerant (currently). Partnership Financial CU = Illinois (out of state). 121 Financial CU = merged into VyStar (defunct).

---

## Sources (all official institution domains unless noted; verified 2026-06-12)
suncoast.com, gtefinancial.org, fairwinds.org, sccu.com, achievacu.com, tropicalfcu.com, dcfcu.org, powerfi.org, jetstreamfcu.org, wefloridafinancial.com, mypfcu.org (IL), additionfi.com, insightcreditunion.com, mccoyfcu.org, orlandocreditunion.org, 121fcu.org, communityfirstfl.org, firstflorida.org, flcu.org, campuscu.com, penair.org, tyndall.org, eglinfcu.org, innovationsfcu.org, championsfirst.org (fsucu.org), seacoastbank.com, amerantbank.com, bankunited.com, citynational.com, everbank.com, synovus.com, my100bank.com, fwccu.com, ccuflorida.org, pinellasfcu.org, vystarcu.org, midflorida.com. Discovery only: doctorofcredit.com. WebFetch was 403/404/PerimeterX on several CU sites (Suncoast, SCCU, Achieva, PFCU, Champions First, Dade, Tropical) — own-domain WebSearch used as fallback per protocol; Wayback is blocked here.

