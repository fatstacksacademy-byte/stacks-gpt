# State combined-sweep progress (started 2026-06-12)

Goal: bring every state to Hawaii-depth for BOTH credit cards and deposit bonuses.
Research output lands in /tmp/state-sweep/{state}.md. Integration into the repo
(builder modules + institutions.ts + stateBankBonuses.ts + recurringBankOffers.ts +
tests + commit) happens AFTER, on a clean branch — NOT the dirty travel branch.

## Prioritization
Thinnest card coverage among populous states first (institutions reviewed in RESEARCH.md):
VA 3, MI 4, NJ 4, NY 4, IL 6, OH 8 ... then NC 7, PA 9, GA/FL 9 (already deep), then
the rest. Deposit per-institution is thin EVERYWHERE (institutions.ts is non-exhaustive).

## Wave 1 — launched 2026-06-12 ~16:24 (background)
- [x] New York — DONE 16:47. ~36 reviewed (triples coverage); +8 deposit, +2 cards (Reliant FCU, Corning CU — verify Corning assoc path). new-york.md.
      Date-bound deposits → recurringBankOffers: TrustCo 6/30, MCU 8/6, Pioneer 7/31, Walden 12/31, FourLeaf 12/31.
      Aggregator traps caught: Northern CU $250 (actually 2024 window), NBT $400 (expired + targeted). Exclude HVCU card (backdoor).
- [x] Michigan — DONE 16:35. 31 reviewed; +7 deposit, +2 card. michigan.md.
      Flags: cscu.org dead→crypto-scam redirect; financialplus.org=IL not MI (use myfpcu.com);
      AAC $200 checking EXPIRED; several "referrals" pay Visa gift cards not cash.
      Set card=none for DFCU/Frankenmuth/Dort/Lake Trust/Wings/Everwise/Huntington/Fifth Third/UMCU/Genisys/Community Choice/Vibe/Michigan First.
- [x] New Jersey — DONE 16:43. 23 reviewed; +11 deposit (8 standard + 3 referral), +4 cards (Columbia x2, Picatinny, XCEL). new-jersey.md.
      Existing 4 NJ cards (Garden Savings x2, Members 1st NJ, Jersey Shore, Atlantic x2) confirmed NO signup bonus.
      Exclude per backdoor rule: Affinity/Aspire cards. Merges: Lakeland→Provident, Investors→Citizens.
- [x] Virginia — DONE 16:41. 24 reviewed; +1 deposit (Lafayette FCU $150 = RENEWAL, flip expired→active), +9 card issuers/12 cards. virginia.md.
      Merges: NextMark→Apple FCU; Member One→VACU. ABNB now abnbfcu.org. Burke & Herbert card = merchandise redemption (flag).
      Targeted (exclude): Atlantic Union $400 mailer, Freedom First $50 referral-gated.
- [x] Ohio — DONE 16:58. 33 reviewed; +3 deposit (BMI FCU $200, F&M $25, +KeyBank $300/$500 reconfirm), +4 cards (GECU Cincinnati x3 + First Service FCU 2% no-bonus). ohio.md.
      Stale-aggregator: BMI "$500" actually $200. Wrong domains: 7-17 CU=717cu.com; "Members First OH" doesn't exist (memfirstcu=UT, membersfirstccu=IL).
      S&T Bank $300 = HOLD (OH eligibility not on own page). Add First Service FCU 2% as no-bonus card entry.
- [x] Illinois — DONE 16:41. ~26 reviewed; +4 deposit, +7 card issuers. illinois.md.
      Watch: TWO "Consumers CU" — IL high-yield = myconsumers.org (Gurnee); consumerscu.org = MI/IN, EXCLUDE.
      Merges: Motorola Empl CU→Alliant; Illinois Community CU→Credit Union 1. Fill card outcomes for Associated/Together/CommunityAmerica (already deposit rows).

- [x] Maryland — DONE 17:05. 24 reviewed; +7 deposit, +2 cards (Andrews FCU; SDFCU=backdoor, exclude). maryland.md.
      Lafayette FCU: flip expired→active ($150 new-checking live). Mergers: Atlantic Financial FCU→Freedom FCU; Sandy Spring→Atlantic Union; PeoplesBank→Orrstown.
      Disambiguation: "Municipal CU $150-350" = NYC nymcu.org, NOT MD MECU. Point Breeze "$275 tiered" unsupported; only $150 referral real.
- [x] North Carolina — DONE 17:11. 24 reviewed; +3 deposit (North State Bank $200, ValleyStar $250, Sharonview $25 ref), +0 cards (all 20 existing reconfirmed). north-carolina.md.
      North State fee is $20 not $25 (bankbonus stale). Coastal Rewards card bonus EXPIRED 4/30/26 (FNBO white-label → recurring watch).
- [x] Massachusetts — DONE 17:11. 33 reviewed; +6 deposit (Cambridge Savings $500+, Berkshire $300, PeoplesBank $350, bankESB $300...), +2 cards (Needham Bank, HUECU). massachusetts.md.
      7 expired→renewal watch (Eastern, Salem Five, Metro CU, Middlesex, Cape Cod 5...). Country Bank $400 = geo/invite-targeted. MIT FCU cards = Elan, exclude.
- [x] Georgia — DONE 17:13. 27 reviewed; +3 deposit (LGE $350⭐, Synovus $50 ref, Five Star $50) +SouthState $200, +0 cards. georgia.md.
      Stale aggregators: Georgia's Own "$300"→actually $240; Robins "$250"→$200 official. Heritage CU→redirects to Connexus (backdoor, skip).

- [x] Pennsylvania — DONE 17:24. 34 reviewed; +11 deposit (+6 referral), +3 cards (American Heritage CU x2, Clearview FCU). pennsylvania.md.
      UPDATE existing: Penn Community Bank $400→$475 (deadline 6/27/26). Two distinct: First Commonwealth BANK (fcbanking.com) vs FCU (firstcomcu.org), both live $400 — don't conflate.
      Exclude: Ardent CU (went backdoor + card expired), Provident Elan cards, Northwest mailer-only. Susquehanna Community Bank → acquired by Truist.

- [x] Texas — DONE 17:30. 38 reviewed; +13 deposit, +1 card (American Airlines CU). texas.md.
      Bank of Texas up to $850 (San Antonio MSA only), GECU El Paso $300, Broadway $300... Eligibility caveats: EECU/DATCU/Shell/A+ are SEG/county-gated. Add AA CU as new issuer.
- [x] Washington — DONE 17:34 (file written before session-limit killed final msg). 30 reviewed; +4 deposit (Numerica $300, Horizon $200, Verity $150, BECU $100 ref), +3 cards (WECU x2, Verity). washington.md.
      RECLASS: First Tech FCU deposit now EXPIRED (window closed 2/28/25); Sound CU referral expired. Inspirus CU defunct→merged into Gesa (resolves a REVERIFY 403 note).

## ===== CHECKPOINT @ session usage limit (resets 9pm HST) =====
## DONE: 13 states — reports on disk in /tmp/state-sweep/ AND backed up to ~/Downloads/state-sweep-backup/
   NY MI NJ VA OH IL MD NC MA GA PA TX WA
   Running totals: ~+86 deposit offers, ~+31 card bonuses verified; many merger/stale-aggregator/domain catches.

## REDO — completed after resume:
- [x] Missouri — DONE ~22:15 HST. 27 reviewed; +6 deposit (Arsenal $300, Alltru $300, Mainstreet $300, Guaranty $300, Central Bank MW $300, Academy $500), UPGRADE Together $200→$300, +3 cards (CommunityAmerica Visa Sig 15k pts, Midwest BankCentre World $500, Platinum $50). missouri.md.
      Stale agg: First Federal KC "$300" = EXPIRED. First Bank "$500" = APY not cash. UMB "15k pts" = no window (unresolved). Vantage CU = ECONNREFUSED (REVERIFY). Together card checked = already in catalog.
- [x] Arizona — DONE ~22:17 HST. 20 reviewed; +8 deposit (Credit Union West $350, OneAZ $350, AZ Financial $300↑, America First AZ $250, Desert Financial $200, Vantage West $100↑, AZ Central $200/$500), +5 cards (NBAz Reserve $500/50k, Agility $200, Premium Premier $150, Premium Elite $300; CU West World 10k pts). arizona.md.
      REVERIFY resolved: Pinnacle Bank AZ = defunct (→AZFCU); AmSW CU = no bonus; TOPCU→ICCU. Expired watch: TruWest $200, Pyramid FCU $200, AZFCU promo.
- [x] California — DONE ~22:30 HST. 34 reviewed; +13 deposit (USC CU $400, First Entertainment $350, Frontwave $350, SF FCU $300, Wescom $200 ref, Exchange Bank $150 ⚠️EXPIRES 6/15!, Fremont $150, Mission Fed $100, Cal Coast $100, Golden 1 $50 student, Pacific Service $50 ref...), +0 new cards (28-card CA catalog already deep). california.md.
      Expired: SAFE CU, Premier America Goals26, SF Fire direct $300, Logix, Kinecta, UNIFY. REVERIFY still: Golden 1 card, Schools Financial, Premier America Smart Spending (403).
      TIME-SENSITIVE: Exchange Bank $150 closes 6/15/2026 (2 days).
- [x] Florida — DONE ~22:40 HST. 33 reviewed; +6 deposit (Power Financial $100-250, Community First FL $200, FLCU $300, CAMPUS USA $150, FL West Coast CU $200), +3 cards (Power Financial Visa Sig 10k, PenAir 20k, FSU CU 5k — verify FSU FOM). florida.md.
      UPDATE: Achieva catalog says $150 → live page now $50 (stale, fix). Amerant $300/$600 EXPIRED 11/24/25 (watch renewal). GTE Heritage/Go Premier cards = backdoor, excluded. Unresolved: Orlando CU points join-bonus.
- [x] Tennessee — DONE ~22:50 HST. 22 reviewed; +1 deposit (First Horizon up to $700 ⚠️exp ~6/30), +2 cards (Redstone FCU Visa Sig $150/3k — also serves TN counties; TVFCU 25k pts/$250/1k exp 6/30 — Elan white-label, flag). tennessee.md.
      Unresolved: Home Federal TN (ECONNREFUSED), Cornerstone FCU (404), Alcoa TN FCU (ECONNREFUSED). Eastman CU domain = ecu.org (not eastmancu.com), Cloudflare-walled.
      Launching: KY.

- [x] Indiana — DONE ~22:35 HST. 24 reviewed; +4 deposit (Old National $300/$600 ⚠️exp 6/30, STAR Financial $300, IU CU $70 ref, Purdue FCU $50 ref), +0 cards (all local own-brand = Elan/Sync white-label). indiana.md.
      Confirmed: Everwise $250 still live, Interra MC Elite 10k pts still live. IMCU $200 = EXPIRED 3/31/26. Unresolved: 5Star FCU (refused connection). Elements/Notre Dame/ETFCU = nationwide backdoor.

## QUEUED (never launched), by pop:
   AL LA KY OR CT NV UT NM ID MT OK KS NE IA MS AR NH ME RI VT DE WV DC ND SD WY
   (27 states remaining). HI = reference, skip.
- [x] Colorado — DONE ~23:00 HST. 30+ reviewed; +10 deposit (Bellco $300, Ent $200, Air Academy $250, BOK Financial up to $950, Bank of CO $750 biz, Partner CO CU $250 biz, PNC ex-FirstBank up to $400), +13 card offers across 9 institutions (Bellco x2, Ent x4, Vectra, CU of CO, CU of Denver, Canvas, Elevations, Climb, Denver Fire FCU). colorado.md.
      KEY: FirstBank CO DEAD (PNC acquired 1/5/2026). Sooper CU → rebranded to Climb CU (climbcu.org). Elevations $350 EXPIRED May 2025. Pikes Peak CU = Elan, excluded. Aventa + Colorado CU = ECONNREFUSED (UNRESOLVED).
- [x] South Carolina — DONE ~23:05 HST. 25+ reviewed; +5 deposit (Carolina Trust FCU $300 exp 8/31, REV FCU $250, SouthState $200 personal + $400 biz exp 6/30, Bank of Travelers Rest $100), +1 card (REV FCU 30k pts/$3k). south-carolina.md.
      SouthState $300 aggregator figure = NOT confirmed (official page shows $200/EARN200 only). SC Federal $100 = employer-only. Anderson Brothers/Countybank = Elan/TCM, excluded. UNRESOLVED: Coastal, Self-Help, LGFCU, Founders, Spero, CresCom, Arthur State (all 403).
- [x] Louisiana — DONE ~23:15 HST. 20+ reviewed; +2 deposit (Campus FCU $225 code CFCU4YOU; La Capitol $100 = SEG-only, not publicly claimable), +6 cards (La Capitol CB Visa Sig $150, Pelican Premier 30k/$3k exp 12/31, Pelican Points 15k/$1.5k, Keesler Visa Sig $100, Keesler Visa Plat 10k, Neighbors Biz $500). louisiana.md.
      Rebrands: ASI+Louisiana FCU→OnPath; Louisiana USA FCU→Formation CU; Jefferson Financial→Keesler. Neighbors/Pelican/EFCU/Red River = open-membership backdoor — flag cards as accessible-nationally. Red River CU card = UNRESOLVED (403). b1BANK = 403, unresolved.
- [x] Minnesota — DONE ~23:25 HST. 40 reviewed; +7 deposit (TruStone up to $500, Blaze $225, TopLine $300, Wings $500 exp 6/30 [backdoor], Think Bank $200 ⚠️exp 6/29, Old National up to $600 ⚠️exp 6/30, MN Bank & Trust up to $600), +5 cards (Affinity Plus 35k pts [backdoor], TruStone $100, Blaze $225, Alerus $150-500, Stearns Bank 25k biz). minnesota.md.
      Mergers: Spire+Hiway→Blaze CU (1/1/24), Firefly→TruStone, Bremer→Old National (5/1/25). TIME-SENSITIVE: Think $200 exp 6/29, Old National $600 exp 6/30. Backdoor: Wings/Blaze/Affinity Plus open-membership.
- [x] Alabama — DONE ~23:35 HST. 35 reviewed; +6 deposit (Redstone $475 summer exp 10/3, Redstone Youth $200 exp 7/3, Alabama CU $100 [caution: placeholder text on promos page], Alabama CU $25 student, Five Star $50 Class of 2026 ⚠️EXPIRES 6/30, MAX CU $50 ref), +8 cards (Redstone Visa Sig $150, MAX CU $50, Alabama ONE Transcend 5k pts, Alabama ONE Milestone 5k pts, Bryant Bank x4 [verify issuer]). alabama.md.
      Redstone FOM = 1,800+ partners, NOT nationwide backdoor — keep in catalog. New South FSB + AL Exchange Bank = defunct. Avadian = 403 (UNRESOLVED). Bryant Bank cards = verify white-label before adding.
- [x] Wisconsin — DONE (completed before limit hit). 35+ reviewed; +10 deposit (Associated $600 personal + $750 biz exp 6/30, Summit CU, PyraMax $300 exp 12/31 + $100 exp 8/31, Town Bank/Wintrust $300-500, Waukesha State $250 NO DD req exp 12/31, North Shore $400 ⚠️EXPIRED 6/13, North Shore student $50, BMO), +5 cards (UW CU, Landmark x3, Bank First). wisconsin.md.
      Elan white-label: Associated/PyraMax/North Shore/Waukesha cards = excluded. CoVantage = nationwide backdoor ($10 donation). Summit 403/UNRESOLVED card bonus. Landmark deposit $300 EXPIRED May 2024.

## REDO (hit session limit ~23:35 HST, stubs only — no content):
   CT, KY, NV, OR, UT — re-launch after 2am reset.

## QUEUED remaining (never launched):
   NM ID MT OK KS NE IA MS AR NH ME RI VT DE WV DC ND SD WY (19 states)

## ===== RESUME PLAN (target 2am HST) =====
1. Re-read this file. DONE reports are in /tmp/state-sweep/ (+ ~/Downloads backup).
2. Re-run the 6 REDO states, then work through QUEUED in waves of ~6 background agents
   (general-purpose, run_in_background). Use the per-state prompt pattern from this session:
   combined cards+deposit, official-page proof only, own-domain WebSearch fallback
   (Wayback/web.archive.org is BLOCKED here), skip nationwide+white-label per REVERIFY.md,
   write each to /tmp/state-sweep/{state}.md. Keep ~6-8 in flight; refill on completion.
3. Throttle: this run hit the account limit at ~21 parallel-ish agents over ~70 min. On
   resume, cap at ~6 concurrent and pace so we don't re-trip the limit.
4. After all states swept: INTEGRATION (separate step, needs clean branch — NOT the dirty
   travel branch). See checklist below. Ask user about branch strategy before committing.

## ENV LEARNING (in all prompts): web.archive.org/Wayback BLOCKED from WebFetch.
Fallback = WebSearch restricted to institution's OWN domain (allowed_domains). Never aggregator text as proof.

## Integration checklist (per state, when back on a clean branch)
1. New cards -> lib/data/states/{state}.ts via _builder.ts; wire into index.ts (already wired).
2. New deposit offers -> lib/data/stateBankBonuses.ts.
3. Expired/seasonal -> lib/data/recurringBankOffers.ts (renewal watch).
4. Update lib/data/states/institutions.ts rows (reviewed date, deposit/card outcome, ids); append new institutions.
5. Unresolved -> append to REVERIFY.md.
6. npm test, npx tsc --noEmit, eslint changed, npm run build. Commit. Do NOT push.
