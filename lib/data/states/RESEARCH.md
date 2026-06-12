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

## Batch 2 — Mountain / Southwest (CO, UT, ID, MT, WY, NM, TX, OK) · verified 2026-06-11

### Colorado (CO) — 15 cards, 7 institutions
- **Added:** Bellco (Blue Diamond Signature $200, Colorado Rewards 15k, Platinum), Credit Union of Colorado (Signature 2%, Rewards), Blue FCU [CO/WY] (Everyday Rewards 15k, Cash Back $200, Business Rewards 20k), Westerra (Signature Rewards 1.25pt), Air Academy (Signature Rewards 4x, Platinum), Alpine Bank (Platinum Rewards 5k, Platinum), Meritrust/CO (Platinum Rewards, Platinum Prime).
- **Excluded/unresolved:** Ent + Security Service (owned elsewhere); Canvas (JS-only pages), Elevations (403), Aventa (conn refused), FirstBank (discontinued, migrated to PNC).
- **Sources:** bellco.org, cuofco.org, bluefcu.com, westerracu.com, aacu.com, alpinebank.com, colorado.meritrust.org.

### Utah (UT) — 21 cards, 9 institutions
- **Added:** America First [UT/ID/NV/AZ/NM/OR] (Signature, Platinum), Mountain America [UT/ID/AZ/MT/NV] (Cash Back, Rewards, Low Rate), Goldenwest [UT/ID] (Signature 1.5%, Rewards), Cyprus (Rewards 10k, Cash Back, Low-Rate), Utah First (Orange Platinum), Deseret First (Signature 5/3/2/1%, Platinum Rewards), UCCU (4-3-2-1 Everyday, 4-3-2-1 Travel, Low Rate), Granite (Signature Cashback, Rewards $50), Canyon View (Crimson Rewards).
- **Ownership:** UT module owns America First + Mountain America. Excluded Security Service (TX owns).
- **Unresolved:** Zions Bank, Chartway (no verifiable own-brand consumer card).
- **Sources:** americafirst.com, macu.com, gwcu.org, cypruscu.com, utahfirst.com, dfcu.com, uccu.com, granite.org, canyonviewcu.com.

### Idaho (ID) — 12 ID-HQ cards, 9 institutions (29 total w/ multi-state spillover)
- **Added:** ICCU (Premier Rewards $300, Rewards $200, Gonzaga Premier $300 — all ID/WA/OR), Pioneer (Platinum 10k), P1FCU (Premier Rewards 1.5%, ID/WA/OR), CapEd (Credit Rewards), Westmark (Cobalt Rewards), D.L. Evans Bank (Visa Rewards, Signature Rewards — ID/UT), Frontier (Signature 2pt), Connections (Visa), Beehive (Platinum).
- **Excluded:** PNW + America First/Mountain America/Security Service (already cover ID via multi-state). Idaho First Bank/First Federal (Elan white-label), Icon (merged), Lewis Clark (low-rate only).
- **Sources:** iccu.com, pioneerfcu.org, p1fcu.org, capedcu.com, westmark.org, dlevans.com, frontiercreditunion.com, connectidaho.org, beehive.org.

### Montana (MT) — 17 cards, 7 institutions
- **Added:** Montana CU (Pathway, Basecamp secured, Peak Rewards 1.5%), Rocky Mountain CU (Platinum Rewards, Classic), Valley CU [MT/WY] (Platinum REWARDS, Platinum, Share Secured), Park Side (Premium Rewards, Plus), Vocal (Visa), Altana FCU [MT/WY] (Visa), Stockman Bank (Treasure, World Rewards, + 2 business).
- **Excluded:** First Interstate (Elan), Glacier Bank (FNBO), Opportunity Bank (TCM/ICBA) — nationwide white-label. Whitefish CU (Cloudflare challenge), Helena Community (no distinct page).
- **Sources:** montanacu.com, rmcu.net, valleyfcu.com, parksidefcu.com, vocal.coop, altanafcu.org, stockmanbank.com.

### Wyoming (WY) — 8 cards, 4 institutions
- **Added:** Meridian Trust [WY/NE/CO] (Cash Back), WyHy (Platinum Cash+, Platinum, Secured), Western Vista (Rewards, Platinum), Jonah Bank (Platinum Rewards, Platinum).
- **Excluded:** Bank of Jackson Hole + Trona Valley (Elan); UniWyo (403), Reliant (conn refused); Blue FCU + Security Service (owned elsewhere).
- **Sources:** mymeridiantrust.com, wyhy.org, wvista.com, jonah.bank.

### New Mexico (NM) — 22 cards, 9 institutions
- **Added:** Nusenda (Platinum Rewards 10k, Platinum Cash Rewards 5%, Platinum, Business Rewards), Sandia Area (Ascend 10k, Cash Back 1.5%, Access, Business Cash Back), U.S. Eagle (METAL 2%, Platinum), Del Norte (Elevate 1.5%, Evolve), Rio Grande (Rewards, Everyday), Kirtland (Cash Rebate 5%/1.5%, Rewards 3x, Low Rate), State ECU NM (Platinum), Sunward (Signature $100, Platinum Rebate $100, Platinum Value), First Financial NM (Platinum Rewards).
- **Excluded:** America First/Mountain America/Security Service (owned elsewhere); Everest FCU (NY-based, not NM).
- **Sources:** nusenda.org, sandia.org, useagle.org, dncu.com, riograndecu.org, kirtlandcu.org, secunm.org, gosunward.org, ffnm.org.

### Texas (TX) — 22 cards, 13 institutions
- **Added:** RBFCU (World Cash Back 2%, Business Select 2%), UFCU (Cash Back 1.5%, Travel & Rewards 2pt), Amplify (Everyday Rewards+ 15k [Elan]), A+FCU (Everyday Rewards+ 15k, Max Cash Preferred $150 [Elan]), Velocity (Platinum Rewards, Business Rewards), Credit Human (Rewards Preferred 2%), TDECU (Onyx 2%, Visa Platinum 0.5%), Neighborhood (Signature Cash Rewards 1.5%), Texas Bay (Platinum Rewards), InTouch [TX/NV/MI] (connect!), Security Service [TX/CO/UT] (Power Cash Back $100, Power Travel Rewards 20k, Power Rewards), Texans (Premier Rewards 40k, Cash Rewards 20k), Frost (Business Rewards).
- **Ownership:** TX owns Security Service. Excluded TruWest (AZ owns).
- **Unresolved:** GECU (JS-only), Texas Tech CU/Texas Trust (403), FirstLight (404 card pages) — terms not fetchable.
- **Sources:** rbfcu.org, ufcu.org, goamplify.com, aplusfcu.org, velocitycu.com, credithuman.com, tdecu.org, myncu.com, texasbaycu.org, itcu.org, ssfcu.org, texanscu.org, frostbank.com.

### Oklahoma (OK) — 16 cards, 8 institutions
- **Added:** Tinker (Signature $100, Platinum 2x, Classic, Business), Truity [OK/KS/TX] (Signature Rewards 10k, Platinum Rate), WEOKIE (Everyday Rewards+ 15k, Max Cash Preferred $150 [Elan]), OKCU (Rewards), TTCU (CashBack 1%, Platinum), Allegiance (Everyday Rewards+ 15k, Max Cash Preferred $150 [Elan]), True Sky (Platinum, Gold), Communication FCU [OK/KS] (Platinum Rewards).
- **Unresolved:** Arvest (PerimeterX bot wall), BancFirst + Oklahoma Central (Elan white-label).
- **Sources:** tinkerfcu.org, truitycu.org, weokie.org, okcu.org, ttcu.com, allegiancecu.org, trueskycu.org, comfedcu.org.

## Batch 3 — Midwest wave A (OH, MI, IN, IL, WI, MN) · verified 2026-06-11

Key methodology note for the Midwest: many large CUs (Alliant, Connexus, Verve,
Wings, MSUFCU, Genisys, Consumers/IL, Elements, Notre Dame, LMCU) have a cheap
nationwide association/foundation "backdoor" that makes membership effectively
open to anyone in any state. Per the rule "don't mark a card state-restricted if
it's actually nationwide," those were EXCLUDED as effectively-nationwide, not
listed as regional. Included CUs either have no backdoor or a genuinely
state-anchored core (disclosed in eligibility_notes).

### Ohio (OH) — 13 cards, 8 institutions
- **Added:** Wright-Patt (Platinum Rewards 1.5%, Platinum Low Rate), KEMBA Financial (Visa Signature $300, Platinum Rewards $300), Superior (Visa Rewards 1.5%), Directions [OH/MI] (Cash Back $50, Rewards 5k, Business Rewards), VacationLand (Visa), Credit Union of Ohio (Rewards 1%, Platinum), CME FCU (Business Platinum Rewards), Education First (Rewards First).
- **Excluded:** GECU (403), Seven Seventeen (ACC nationwide backdoor), Telhio + BMI (Elan/no verifiable terms).
- **Sources:** wpcu.coop, kemba.org, superiorcu.com, directionscu.org, vlfcu.org, cuofohio.org, cmefcu.org, educu.org.

### Michigan (MI) — 6 cards, 4 institutions
- **Added:** DFCU Financial [MI/FL] (Platinum MC), Lake Trust (Platinum Elite Rewards, Platinum Elite), Frankenmuth (Diamond MC 2%), Dort Financial (Visa Signature 2%, Platinum Visa).
- **Excluded as effectively-nationwide (donation backdoors):** LMCU, MSUFCU, Genisys, Consumers/Kalamazoo, Honor, Community Choice, ELGA, 4Front(Elan). Unresolved (403/no FOM page): UMCU, Michigan First, Adventure.
- **Sources:** dfcufinancial.com, laketrust.org, frankenmuthcu.org, dortonline.org.

### Indiana (IN) — 10 cards, 8 institutions
- **Added:** IMCU (Visa Signature 1.5pt, Platinum Rewards, Business Rewards), Everwise [IN/MI] (Signature Rewards 1.5pt), Centra [IN/KY] (The You Signature), FORUM (Mastercard 1%), Purdue Federal (Signature up to 2%), Interra (Mastercard Elite 1.5pt + 10k bonus), ProFed (Visa Rewards 1%), Beacon (2% Cash Back).
- **Excluded as effectively-nationwide:** Elements Financial, Notre Dame FCU, Liberty/Evansville Teachers FCU (all open via cheap association donations). Unresolved: Financial Center First (site refused), Hoosier Hills (low-rate only).
- **Sources:** imcu.com, everwisecu.com, centra.org, forumcu.com, purduefed.com, interracu.com, profedcu.org, beaconcu.org.

### Illinois (IL) — 14 cards, 6 institutions
- **Added:** Scott CU [IL/MO] (eXtreme Visa, St. Louis Blues Visa), SIU CU (Visa Rewards Credit, Visa Credit), First Northern (Platinum Premier, Platinum), Land of Lincoln (Platinum Points, Platinum Rate), U of I Community CU (Visa Rewards 50k + 10x campus, Signature Cashback 5/2/1.5%), CEFCU [IL/CA] (Cash Back $150, World, Rewards, Credit MC $50).
- **Excluded:** Credit Union 1/IL (CU1EDA backdoor + Elan), Great Lakes/NuMark (Elan), Consumers/IL + Alliant + BCU (nationwide). Marine, Heartland/IL (FNBO white-label).
- **Sources:** scu.org, siucu.org, fncu.org, llcu.org, uoficreditunion.org, cefcu.com.

### Wisconsin (WI) — 16 cards, 8 institutions
- **Added:** UW Credit Union (Signature Rewards 1.5%+0.5% + 10k, Rewards 0.75%+0.5% + 10k), Royal CU [WI/MN] (Platinum Rewards), WESTconsin [WI/MN] (Platinum), Educators [WI/IL] (Signature Cash Back 1.5%, Platinum), CoVantage [WI/MI/IL] (Cash Back 2% gas/grocery, Great Rate), Community First/WI (Cash Back Signature 1.5% + $200, Great Rewards Platinum, Great Rate Platinum), Simplicity (Rewards Plus 3/2/1, Rewards), TruStone [WI/MN] (Signature 1.5% + 10k, Platinum Rewards, Platinum).
- **Excluded:** Connexus + Verve (ACC nationwide), Capital CU (Elan), Marine (no own-brand). Unresolved (403): Summit, Fox Communities, Landmark, Prospera.
- **Sources:** uwcu.org, rcu.org, westconsincu.org, ecu.com, covantagecu.org, communityfirstcu.org, simplicity.coop, trustonefinancial.org.

### Minnesota (MN) — 17 cards, 5 institutions
- **Added:** TopLine (Rewards Signature 1.5pt, Platinum Rewards, Platinum, Business Rewards), Mid-Minnesota FCU (Premier Rewards 10k + 3x gas, Platinum Rewards, Classic), Magnifi [MN/ND/WI] (Visa Signature 1%, Cash Rewards, Platinum, Business cashRewards), Affinity Plus (Premier Select Rewards 35k, Premier Classic, Business Rewards 40k), Blaze/SPIRE+Hiway [MN/WI] (Signature $225, MN Wild Signature, UMN Alumni Signature).
- **Excluded:** First Community CU (already inline); Wings, US Federal, Ideal, Minnco (foundation/ACC nationwide backdoors or 403); Bremer (merged into Old National 2025); Deere/Empeople (employer-nationwide); TruStone + Royal (WI module owns).
- **Sources:** toplinecu.com, mmfcu.org, mymagnifi.org, affinityplus.org, blazecu.com.

<!-- Batches appended below as they are completed. -->
