# State regional credit-card catalog — research report

Verified local & regional bank / credit-union credit cards available to residents
of each U.S. state, surfaced on `/spending` when a state is selected. Built with
`./_builder.ts`, aggregated in `./index.ts`, spread into
`../creditCardBonuses.ts`. Hawaii is the reference implementation
(`../hawaiiCreditCardBonuses.ts`) and is preserved untouched.

## Methodology

1. Work state by state. No speculative entries.
2. Discovery via the NCUA active credit-union list + quarterly call-report data
   (prioritizing CUs reporting active credit-card balances/loans, e.g. ACCT_396 /
   ACCT_993) and FDIC BankFind / official state banking records for banks.
3. Every product verified on the issuer's official website, official disclosure
   PDF, or official card-program page. Secondary sources (aggregators) are used
   for *discovery only* — never as the final offer or eligibility source.
4. Include cards available *within* the state, not merely issuers headquartered
   there. Do not mark a card state-restricted if it is actually nationwide.
5. Exclude discontinued cards and expired promotions.
6. Never invent a signup bonus — `bonus_amount: 0` when none is officially
   advertised. Include only confirmed fields when terms are incomplete.
7. Sort within a state by signup value, then card name (handled by the UI).

Already covered inline in `../creditCardBonuses.ts` (NOT duplicated here): BECU
(WA/OR/ID/SC), Ent (CO), VyStar (FL/GA), First Community CU (ND/MN),
CommunityAmerica (nationwide). Hawaii: see the dedicated module.

## Per-state log

Format per state: **Institutions reviewed** · **Active card issuers found** ·
**Cards added** · **Institutions unresolved** · **Official sources** ·
**Verification date**.

## Batch 1 — West (CA, OR, WA, AK, NV, AZ) · verified 2026-06-11

### California (CA) — 28 cards, 11 institutions
- **Institutions reviewed:** SchoolsFirst FCU, Golden 1 CU, Patelco CU, SDCCU, Mission Fed, Redwood CU, SAFE CU, Travis CU, Wescom CU, Kinecta FCU, Logix FCU, Provident CU, Schools Financial CU, Star One CU, First Tech FCU.
- **Active card issuers found / added:** SchoolsFirst (Rewards MC w/ 10k activation, School Employee 1.5%, Inspire, Share-Secured), Patelco (Points Rewards World 2x gas/grocery + $200, Pure low-rate, Progress Student), Mission Fed (Premier World 3x + $250 no-FTF, Preferred Platinum Rewards $150, Preferred Platinum $150), Redwood (Signature 1.5pt, Platinum, Credit Builder), SAFE (Cash Back+ Signature 5%/3%, Cash Back), SDCCU (Signature 2pt + 10k, Cash Rewards 1%, Fly Miles Plus), Wescom (Knott's $200, Bruin Edge/UCLA $500, MyRewards $100, Active 0%), Travis (Platinum 2x + 15k, Signature 1.5% + 20k), Logix (World Rewards 1.5pt + $100; multi-state CA/AZ/MA/MD/ME/NH/NV/VA), Kinecta (MyPerks 3% + $200; CA/NY), Provident (World+ Travel 2x + Priority Pass + Global Entry, Cash Back 1.5%, Provident Visa).
- **Institutions unresolved:** Golden 1 CU + Schools Financial (golden1.com timed out on every fetch — excluded rather than rely on secondary sources); First Tech FCU + Star One CU (already inline in catalog / effectively nationwide FOM — not duplicated).
- **Sources:** schoolsfirstfcu.org, patelco.org, missionfed.com, redwoodcu.org, safecu.org, sdccu.com, wescom.org, traviscu.org, logixbanking.com, kinecta.org, providentcu.org (card + membership pages).

### Oregon (OR) — 15 cards, 11 institutions
- **Institutions reviewed:** OnPoint, OCCU, Unitus, Rogue, Rivermark (merged w/ Advantis 2024), Oregon State CU, Maps, Mid Oregon, Trailhead, Consolidated, Pacific NW FCU, SELCO, First Tech, Wauna, Point West, Northwest Community (→TwinStar). BECU excluded (already inline).
- **Added:** OnPoint (Signature Cash Back $100, Signature Rewards 10k, Platinum Rewards 5k), OCCU (NICE PERKS 10k), Unitus (Cash Back 2%, Platinum Rewards), Rogue (Signature Rewards 4% dining; OR/ID/CA), Rivermark (Cash Back 1.5%), Oregon State CU (Signature 1.5%), Maps (World MC, Cashback MC), Mid Oregon (Everyday Rewards 10k), Trailhead (Rewards 10k), Consolidated (Signature Rewards), Pacific NW FCU (Cash Awards). Most serve OR+SW WA.
- **Unresolved:** Wauna CU, Point West CU (rewards Visa exists but terms not confirmable on an official fetched page); SELCO (no rewards card); First Tech excluded (nationwide FOM).
- **Sources:** onpointcu.com, myoccu.org, unitusccu.com, roguecu.org, rivermarkcu.org, oregonstatecu.com, mapscu.com, midoregon.com, trailheadcu.org, consolidatedccu.com, pnwfcu.org.

### Washington (WA) — 16 cards, 9 institutions
- **Institutions reviewed:** WSECU, Gesa, Sound, Numerica, STCU, Salal, Verity, iQ, TwinStar/Peak, Kitsap, Solarity, Harborstone, Inspirus, Washington Trust Bank. BECU excluded (already inline).
- **Added:** WSECU (Cash Back Signature, Platinum Rewards), Sound (Rewards 10k, Cash Back), Numerica (Visa Luna 1.5%/$29 AF, Platinum; WA/ID), STCU (Premier Rewards World 3x + 15k, Rewards World 10k; WA/ID/OR), Salal (Rewards; WA/OR), iQ (Signature Travel 3x + 25k, Platinum Cash Back; WA/OR), Peak/TwinStar (Platinum Rewards; WA/OR), Kitsap (Cash Back $100, Rewards 5k), Washington Trust Bank (Clearly Cash Back Signature + Platinum; WA/ID/OR).
- **Unresolved:** Gesa, Verity, Inspirus (official sites returned 403 / redirected at fetch time — omitted despite discovery hits); Harborstone (Elan, no verifiable official terms); Solarity, HomeStreet (no rewards consumer card).
- **Sources:** wsecu.org, soundcu.com, numericacu.com, stcu.org, salalcu.org, iqcu.com, peakcu.org, kitsapcu.org, watrust.com.

### Alaska (AK) — 24 cards, 7 institutions
- **Institutions reviewed:** Global CU (formerly Alaska USA), Credit Union 1, Northrim Bank, First National Bank Alaska, Denali State Bank, Spirit of Alaska FCU, True North FCU, MAC FCU, Matanuska Valley FCU, ALPS FCU.
- **Added:** Global CU (Global Visa, Seattle Mariners Cash Back; AK/WA/CA/AZ/ID), Credit Union 1 (Platinum/Gold/Classic/Chrome/Secured), Northrim (Platinum, Payback, Preferred, World, World Elite, + 2 business), Spirit of Alaska (Visa Platinum, Classic, Business), True North (Mastercard, Secured), MAC FCU (Visa), FNBA (Mastercard, FirstCredit Secured).
- **Unresolved:** Denali State Bank (Elan, no terms on official page); ALPS FCU + Matanuska Valley FCU (official pages 403/blocked). No bonus invented (Northrim's "25,000 points" lacks a spend/window → bonus_amount 0). Mariners first-year-fee-waiver promo expired 5/31/2026 → waiver not applied. BofA Alaska Airlines Visa excluded (nationwide).
- **Sources:** globalcu.org, cu1.org, northrim.com, spiritofak.com, truenorthfcu.org, macfcu.org, fnbalaska.com.

### Nevada (NV) — 8 cards, 4 institutions
- **Institutions reviewed:** One Nevada CU, Create CU (formerly Clark County CU), Silver State Schools CU, WestStar CU, Greater Nevada CU, Financial Horizons CU, Boulder Dam CU.
- **Added:** One Nevada (Signature Rewards, Platinum Rewards, Platinum Share Secured), Create CU (Infinity Rewards 1%, Platinum Rewards 0.5%), Silver State Schools (Cash Back 2%, Low Rate), WestStar (FlexRewards Platinum MC, verified via official disclosure PDF).
- **Unresolved:** Greater Nevada CU + Financial Horizons CU (Elan/Fiserv white-label routed through third-party portals, no distinct local terms on an official page); Boulder Dam CU (no rates/rewards published on official card page).
- **Sources:** onenevada.org, createcu.org, silverstatecu.com, weststar.org.

### Arizona (AZ) — 13 cards, 10 institutions
- **Institutions reviewed:** Desert Financial, OneAZ, Arizona Financial, Hughes FCU, TruWest (AZ+TX), Vantage West, Pima Federal, SunWest, Credit Union West, American Southwest CU, Tucson Old Pueblo CU, Pinnacle Bank AZ, Foothills Bank, Republic Bank of AZ.
- **Added:** Vantage West (Signature Rewards $200), Desert Financial (Max Cash Preferred $150, Everyday Rewards+ 15k — Elan apply links), Pima Federal (Signature Rewards 10k), TruWest (Platinum Points $100, Signature $100; AZ/TX), Arizona Financial (Signature Cash Back 1.5%), OneAZ (Signature 1.5%, Choice Rewards), Credit Union West (World Rewards 1.5x), SunWest (Rewards 1x), Hughes Federal (Visa Platinum low-rate), Foothills Bank (Visa Business).
- **Unresolved:** Pinnacle Bank AZ (earn rate undisclosed), American Southwest CU + Tucson Old Pueblo CU (no verifiable terms), Republic Bank of AZ (no card product page).
- **Sources:** desertfinancial.com, oneazcu.com, arizonafinancial.org, hughesfcu.org, truwest.org, vantagewest.org, pimafederal.org, mysunwest.com, cuwest.org, foothillsbank.com.

<!-- Batches appended below as they are completed. -->
