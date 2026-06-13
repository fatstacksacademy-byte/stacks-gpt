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

## REDO — completed after 2am reset:
- [x] Oregon — DONE 2026-06-13. 20+ reviewed; +6 deposit (Oregon State CU $300 + $300 student, Banner Bank $250/$500 ⚠️exp 6/30 + $250/$500 savings, Mid Oregon CU $50 exp 7/12), +4 cards (OnPoint x3 — $100/10k/5k pts; OCCU 10k pts). oregon.md.
      Advantis → merged into Rivermark (no bonus). OCCU domain = myoccu.org (not oregoncommunitycu.org). Pacific Crest FCU = likely defunct. Clackamas FCU → Embold CU. Wauna/Point West cards still UNRESOLVED.
- [x] Nevada — DONE 2026-06-13. 15+ reviewed; +1 deposit (Greater Nevada $250 — SEG-restricted, not broadly claimable), +2 cards (Nevada State Bank Reserve $500/50k + Elite $300/30k — Zions own-brand). nevada.md.
      Clark County CU → rebranded to Create CU (createcu.org). Meadows Bank → Meadows Financial. GNCU cards = Elan, excluded. NSB $350 checking EXPIRED 4/7/26.
- [x] Kentucky — DONE 2026-06-13. 20+ reviewed; +2 deposit (Stock Yards B&T $200 no deadline, Ashland CU $50 code FREE50), +2 cards (Commonwealth CU MY Card 25k pts/$250 via FFA $8 assoc, L&N FCU $50/$1k). kentucky.md.
      Park Community CU card = "coming soon" (unresolved). Louisville Metro Police CU → merged into Commonwealth CU. Republic Bank $200 biz EXPIRED.
- [x] Connecticut — DONE 2026-06-13. 20+ reviewed; +1 deposit (Berkshire Bank $300 ⚠️exp 6/30, CT/MA/NY/RI/VT eligible), +0 cards (all Elan white-label or no bonus). connecticut.md.
      American Eagle FCU $200 = recurring seasonal (last Nov 2023 — watch). 360 FCU Visa 5k pts = summer promo, likely recurs. Savings Bank of Manchester domain expired (may have merged).
- [x] Utah — DONE 2026-06-13. 20+ reviewed; +3 deposit (Cyprus CU $300 exp 7/31, America First $350, UFirst CU up to $500), +6 cards (Zions Reserve $500/50k, Premier $150/15k, Vivid 30k pts; Goldenwest $100 exp 9/30; Cyprus 10k pts; Jordan CU 10k pts). utah.md.
      Chartway = nationwide backdoor ($10 donation), excluded. Domain fixes: gwcu.org, ufirstcu.com, dfcu.com, altabank.com.
- [x] Montana — DONE 2026-06-13. DRY — 0 deposit bonuses, 0 card bonuses. First Interstate $600 EXPIRED 11/21/25. Rocky Mountain Bank absorbed by Glacier/Stockman mid-2024. Glacier/Opportunity Bank/Big Sky = FNBO/TCM white-label excluded. montana.md.
- [x] Wyoming — DONE 2026-06-13. DRY — 0 deposit bonuses, 0 card bonuses. Meridian Trust $200 EXPIRED 12/31/25. First Interstate $600 EXPIRED. Hilltop Bank = Elan excluded. wyoming.md.
- [x] New Mexico — DONE 2026-06-13. 15+ reviewed; +0 verified deposit (NM Bank & Trust $150/$400 = TLS error, UNRESOLVED), +3 cards (Sunward FCU $100/Visa Sig; Nusenda 10k pts/$500 [NM Wilderness Alliance open-membership]; Kirtland CU 5% cash back — military FOM only). new-mexico.md.
      Sandia Lab FCU → rebranded to Sunward FCU (Nov 2024). Sunflower Bank $200 EXPIRED 12/31/25. White Sands FCU = Elan, excluded.
- [x] Idaho — DONE 2026-06-13. 15+ reviewed; +2 deposit (Banner Bank $250/$500 exp 6/30; Tech CU $500 exp 6/30 — Boise/Nampa geo-restricted), +2 cards (ICCU Rewards $200/32k pts; ICCU Premier $300/48k pts — open to any ID resident). idaho.md.
      Bank of Idaho acquired by Glacier (May 2025), branches split to Citizens Community/Mountain West/Wheatland. ICCU $150 checking EXPIRED 12/31/24.
- [x] Nebraska — DONE 2026-06-13. 20+ reviewed; +2 deposit (Bankers Trust $400 ⚠️exp 6/30, Union B&T $50 UNL students only), +1 card (FNBO Evergreen $200/20k pts/$1k — national FNBO product). nebraska.md.
      SAC FCU = Cobalt CU (rebranded 2018). NebraskaLand/Five Points Bank cards = Elan excluded.
- [x] Iowa — DONE 2026-06-13. 20+ reviewed; +3 deposit (Dupaco CU $300 no deadline; QCBT $300 exp 8/31; Bankers Trust $400 ⚠️exp 6/30), +2 cards (GreenState World MC $250/25k pts, Platinum $150/15k pts). iowa.md.
      UICCU = GreenState CU (rebranded 2019). Community State Bank $400 + MidWestOne $350 EXPIRED.
- [x] Oklahoma — DONE 2026-06-13. 20+ reviewed; +7 deposit (WEOKIE $200 exp 7/31; CFCU $300 ⚠️exp 6/22 in-branch only; Tinker $25; Equity Bank BLOOM/MATCH/SURGE $400 each exp 6/30/7/31/9/30; Equity SHOCKERS $200 exp 6/28), +0 cards (Arvest = PerimeterX, 6 CU sites unreachable). oklahoma.md.
      TIME-SENSITIVE: CFCU $300 expires 6/22 (9 days). Equity BLOOM $400 expires 6/30.
- [x] Kansas — DONE 2026-06-13. 20+ reviewed; +6 deposit (Mainstreet CU $300 ⚠️exp 6/30; CommunityAmerica $150/$250/$400 exp 7/31; Equity Bank x4 same as OK), +1 card (Meritrust CU $200/20k pts/$1k no deadline). kansas.md.
      TIME-SENSITIVE: Mainstreet $300 exp 6/30. Sunflower Bank $200 EXPIRED 12/25. Quest CU Topeka may be defunct.
- [x] Delaware — DONE 2026-06-13. DRY — 0 bonuses. WSFS Bank cards → migrated to Elan 6/5/2026 (SEC 8-K). Del-One/DEXSTA = no bonus. delaware.md.
- [x] Washington DC — DONE 2026-06-13. DRY — 0 public bonuses. NIHFCU = referral-only. John Marshall = APY special (not cash). SDFCU/DCU/Hanscom = excluded. district-of-columbia.md.
- [x] Rhode Island — DONE 2026-06-13. 15+ reviewed; +2 deposit (Washington Trust $200 code Free200; Navigant CU $100 code JOURNEY100_2026 exp 12/31), +2 cards (Navigant Cash Back World $100/$1k; Elite $150/$2k; RICU 10k ScoreCard pts soft). rhode-island.md.
      Pawtucket CU → merged into Coastal1. Washington Trust/BankNewport/Westerly/Coastal1 = Elan/TCM, excluded. Greenwood = nationwide backdoor.
- [x] Vermont — DONE 2026-06-13. DRY — 0 deposit bonuses, 0 card bonuses. VT FCU + Credit Union of VT merged Jan 2026 ($100 dividend = internal, not public). NorthCountry BT promos EXPIRED 3/31+4/15/26. Merchants Bank VT = now Community Bank NA (2017). vermont.md.
- [x] Mississippi — DONE 2026-06-13. 20+ reviewed; +1 deposit (Magnolia FCU $100 no deadline), +2 cards (Keesler FCU Visa Sig $100/$1.5k; Visa Plat 10k pts/$1k). mississippi.md.
      Cadence Bank → now Huntington (2/1/2026). Simmons $450 EXPIRED 3/30/26. Renasant = Elan, excluded. cbms.com domain for sale.
- [x] Arkansas — DONE 2026-06-13. 20+ reviewed; +1 deposit (Stone Bank $200 — veterans/military/first responders/healthcare/educators only), +3 cards (Arvest Cobalt Visa Sig $150/15k pts + Cash Back $150 both $500/3 billing cycles; Simmons Rewards Visa Sig 30k pts/$3k/93 days). arkansas.md.
      Simmons $450 checking EXPIRED 3/30/26. Arvest PerimeterX-blocked — card terms confirmed via indexed docs. Generations Bank Raisin bonus EXPIRED.
- [x] New Hampshire — DONE 2026-06-13. 15+ reviewed; +1 deposit (Bellwether CU $300 ⚠️exp 6/30), +3 cards (Bellwether Smart Rewards 5k pts/$1k; Smart Cash $50/$1k; Triangle CU 5k pts/$1k). new-hampshire.md.
      Lighthouse CU (formerly Northeast CU) = nationwide backdoor (free Lighthouse Foundation membership). Northway Bank → absorbed by Camden National (ME) Jan 2025. GSCU still 403.
- [x] Maine — DONE 2026-06-13. 20+ reviewed; +1 deposit (cPort CU $100 no deadline), +1 card (Bangor Savings everblue ~$100/10k pts/$500 — spot-check amount). maine.md.
      Infinity FCU → now Empeople (merged with IL Deere Employees CU = nationwide). Five County CU → rebranded Ancorum CU. Camden National/cPort/Katahdin = Elan/Fiserv white-label. Maine State CU 5k pts EXPIRED 12/31/25.
- [x] Alaska — DONE 2026-06-13. DRY deposits confirmed. Northrim Bank 25k pts card = spend/window not disclosed on own pages (UNRESOLVED — Card Assets white-label). alaska.md.
      Alaska USA FCU → Global Credit Union. Mariners Cash Back fee-waiver EXPIRED 5/31/26. Denali FCU → Nuvision Federal (CA). ALPS FCU pending merger with Tongass FCU.
- [x] North Dakota — DONE 2026-06-13. Near-dry; +1 deposit (Starion Bank $100 no DD req), +0 cards. north-dakota.md.
      Gate City $100 EXPIRED 4/22-23/26 (two-day event). Dakota West CU cards still pre-launch. Capital CU = Elan, excluded.
- [x] South Dakota — DONE 2026-06-13. Near-dry; +1 deposit (First National Bank Sioux Falls $350 exp 9/30), +0 cards. south-dakota.md.
      American Bank & Trust $500/$350 EXPIRED ~4/30/26. Black Hills FCU = 403 (unresolved card + FOM). Sioux Falls FCU → rebranded Levo CU.
- [x] West Virginia — DONE 2026-06-13. 20+ reviewed; +3 deposit (City National WV $200 + $100 teen; First Community Bank $20 personal/$50 biz), +0 cards (WesBanco/CNB/Pendleton = Elan/TCM, all excluded). west-virginia.md.
      WesBanco $400/$350 + MVB $150/$200 all EXPIRED. EPCU domain parked (defunct?). WV United FCU → rebranded Element FCU (elementfcu.org).

## ===== SWEEP COMPLETE — ALL 51 STATES DONE (2026-06-13) =====
States: NY NJ VA OH IL MD NC MA GA PA TX WA MI MO AZ CA FL TN IN SC CO MN WI AL LA OR KY CT NV UT NM ID MT WY OK KS NE IA MS AR NH ME RI VT DE DC WV ND SD AK
(HI = reference implementation, not re-swept)

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
