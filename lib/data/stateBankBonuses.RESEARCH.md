# All-states bank-bonus coverage — research report

Companion to `./stateBankBonuses.ts` (live data), the Hawaii catalog
(`./hawaiiBankBonuses.ts`), and the nationwide rows in `./bonuses.ts`. Verified,
official-source-first state-LOCAL deposit-account bonuses (regional banks + state
credit unions) for the 49 states + DC, surfaced on
`/bank-bonuses-by-state/<state>`.

- **Verification pass completed:** 2026-06-12 (8 regional researchers, official
  institution pages / official-domain disclosure as the sole proof; aggregators
  for discovery only).
- **Not committed** (per owner instruction — this is an autonomous overnight build).

## Headline counts

| Metric | Value |
| --- | --- |
| New verified offers added to `stateBankBonuses.ts` (live) | **61** |
| Seeds verified but excluded as already in the base catalog | 12 |
| States/DC with ≥1 local offer (base catalog + this module) | **48 of 51** |
| Pre-existing state-restricted rows already in `bonuses.ts` | 69 |
| States with NO local offer anywhere | AK, SD, WY |

## Verified NEW offers by region (live in `stateBankBonuses.ts`)

**West (CA/OR/WA/NV):** Provident CU $475 (CA), First Tech FCU up to $500
(CA/OR/WA), Patelco $50 (CA), Banner Bank $250/$500 (OR/WA/CA/ID), Gesa $250
(WA/OR/ID), OnPoint $50 (OR/WA), Greater Nevada $150 (NV), Clark County CU $100 (NV).
(BECU $150 — superseded by base catalog.)

**Mountain/SW (AZ/CO/UT/ID/NM):** Bellco $300 (CO), Ent $200 (CO), Desert
Financial $200 (AZ), Arizona Financial up to $200 (AZ), Vantage West $50 (AZ),
America First $350 (UT/AZ/NV/ID/NM/OR), Canyon View $150 (UT), Sunward $200 (NM).
MT & WY: none verified.

**South-Central (OK/TX/LA/MO):** WEOKIE $200 (OK), Truity $100 (OK), Bank of
Oklahoma $300 student (OK), A+ FCU $50 (TX), Campus Federal $225 (LA), La Capitol
$100 SEG-only (LA), CommunityAmerica $150–$400 (MO/KS/IL), Together CU $200 (MO/IL).
(Hancock Whitney — superseded.)

**Upper Midwest (MN/WI/IA/ND):** Wings up to $500 (MN/WI/FL/GA/MI), TopLine $300
(MN), Bell Bank $100 (MN/ND/AZ), Royal CU $400 (WI/MN, window closed 6/12),
Associated Bank up to $600 (WI/IL/MN), Summit $200 (WI), Dupaco $300 (IA/IL/WI),
Bankers Trust $400 (IA/NE/AZ), First Community CU $100 (ND). NE & SD: none verified.

**Great Lakes (MI/OH/IN/IL):** Everwise $250 (IN/MI), Michigan First $100 (MI),
Flagstar $200 (MI/NY), Dollar Bank up to $400 (PA/OH/VA/MD), CEFCU up to $225 (IL),
First Financial Bank $100 (OH/IN/IL/KY). (Fifth Third, Huntington — superseded.)

**Southeast (FL/GA):** Addition Financial $100 (FL), Achieva $150 (FL), Fairwinds
$50 (FL), Georgia's Own $240 (GA), Robins Financial $200 (GA, eligible ZIPs).
AL/MS/TN: none verified. (MidFlorida, Grow Financial, Seacoast, Delta Community —
superseded.)

**Carolinas/Mid-Atlantic (SC/VA/MD/DC):** SECU Maryland $350 (MD/DC/DE/VA/WV/PA),
Northwest FCU up to $500 (VA), Apple FCU $70 student (VA), Tower FCU $75 (MD/DC/VA),
SC Federal $100 Bank-at-Work (SC). NC/WV/KY/DE: no NEW public offer (base catalog
+ multi-state regionals cover them). (SouthState — superseded.)

**Northeast/New England (NY/NJ/PA/RI/MA/NH/ME):** M&T Bank $250 personal
(NY/NJ/PA/CT/MD/DE/VA/WV/DC), Provident Bank $300 (NJ/NY/PA — NOTE: also in base
catalog; kept only the M&T personal which base lacks), Columbia Bank $300 (NJ),
Affinity FCU $100 (NJ), Valley Bank $100 (NJ/NY/FL/AL), Citadel up to $500 (PA),
Penn Community $400 (PA), TruMark $250 points (PA), Navigant $100 (RI), Rockland
Trust $300 (MA), Cambridge Savings $300 (MA), St. Mary's Bank $300 (NH), cPort $100
(ME). Berkshire $300 (MA/CT/NY/RI/VT) — superseded. CT/VT covered by base/Berkshire.

## Superseded — verified but already in `bonuses.ts` (excluded from live export)

These 12 banks already have a state-restricted row in the base catalog. Their
freshly-verified 2026-06-12 seeds are retained in `stateBankBonuses.ts` as
research records but filtered out of the live export to prevent duplicate
listings. **Reconcile on next refresh** — several base rows may carry older
amounts/deadlines than what was verified today:

| Bank | Base-catalog id | Base amount | Verified-today amount |
| --- | --- | --- | --- |
| BECU | becu-500-checking-2026 | $500 | $150 new-member (different product) |
| Delta Community | delta-community-200-checking-2026 | $200 | $250 (NEWCHECKING250, ends 6/30) |
| Fifth Third | fifth-third-400-checking-2026 | $400 | $350 ($500 DD, ends 6/30) |
| Grow Financial | grow-financial-300-checking-2026 | $300 | $300 (matches) |
| Hancock Whitney | hancock-whitney-600-checking-2026 | $600 | $600 (matches; footprint MS added) |
| Huntington | huntington-400-perks-checking-2026 | $400 | up to $600 (Platinum, ends 6/15) |
| MidFlorida | midflorida-400-checking-2026 | $400 | $400 (matches) |
| Provident Bank | provident-bank-300-checking-2026 | $300 | $300 (matches, ends 7/19) |
| Seacoast | seacoast-400-checking-2026 | $400 | $300 (+GA) |
| SouthState | southstate-300-checking-2026 | $300 | $200 (EARN200) |
| Visions FCU | visions-fcu-500-checking-2026 | $500 | $200–$500 tiered (ends 6/30) |
| Berkshire Bank | berkshire-bank-300-checking-2026 | $300 | $300 (matches) |

## Reconciliation of superseded base-catalog rows (2026-06-12)

After this pass, most base rows already matched the verified figures (Delta $250,
Fifth Third $350, Huntington $600, Grow $300, MidFlorida $400, Provident $300,
Hancock $600, Berkshire $300). Corrections applied to `bonuses.ts`:

- **BECU** `becu-500-checking-2026`: amount **$500 → $150** (the row already had the
  exact verified terms — WPNEW2026, 10 transactions/30 days, no DD — but the wrong
  amount; official page shows $150). Added `expiration_date` 2026-12-31.
- **SouthState** `southstate-300-checking-2026`: added `expiration_date` 2026-06-30
  (the row stated the deadline in text but had no structured field, so it never
  auto-quarantined). 8-state footprint left intact — SouthState's 2024 mergers do
  reach TX/CO. (Note: a separate official EARN200 $200 SC/NC/VA offer also exists.)
- **Huntington** `huntington-400-perks-checking-2026`: added `expiration_date`
  2026-06-15 so the imminent deadline auto-quarantines.
- Each touched row stamped `offer_verified_at: 2026-06-12`.

Recommendation: the other deadline-bearing base rows (Delta 6/30, Fifth Third 6/30,
Visions 6/30, Hancock 6/30, Berkshire 6/30, Provident 7/19) still lack a structured
`expiration_date` — they're captured in the renewal registry (below) but won't
auto-quarantine until those fields are added. The base catalog is actively
maintained by a parallel process; these were left for that owner to avoid edit
collisions.

## Renewal / historical registry → `recurringBankOffers.ts`

A new reference module records offers that have run before — expired ones (so a
recurrence is recognized instantly) and currently-live-but-soon-expiring ones that
historically renew. It is NOT spread into the live catalog; future verification
passes (and the `scripts/` discover/verify jobs) can read it to jump straight to the
official URL and check for a renewal instead of re-discovering each institution.
Seeded with ~40 offers from this sweep (FNBO EARN500, Service CU summer, SAFE,
Simmons, Telhio, Eastern, Metro, Apple Bank, etc., plus the seasonal renewers like
Bank of Hawaii, First Hawaiian, Royal CU, Huntington, Citadel, SECU MD, Visions).

## Quarantined — discoverable but NOT added (targeted, expired, unverified, non-cash)

- **Targeted / mailer-only / by-invitation (not publicly claimable):** Arvest
  (get150 mailer), Central Bank MO ($300 mailer/code), Mazuma ($100 Preferred
  Partner employees), City National Bank WV ($200 "select customers"), Atlantic
  Union Bank ($400/$200 mailer code), American Heritage CU (invitation-only),
  Pinnacle Financial TN (Group Banking employer-only), Service CU NH (group/UNH/
  SubCom affiliate promos only — general $250 expired).
- **Expired before 2026-06-12:** First Interstate $600 (CO/MT), Simmons $450 (AR),
  Arkansas FCU $225, Telhio (OH), Directions (OH), Indiana Members CU $200, BankPlus
  $200 (MS), Redstone $475 (AL), Avadian Q1 (AL), Lafayette FCU $150/$100 (DC),
  Members 1st $50 (PA), Metro CU $500, Eastern Bank, Salem Five $500 (MA), Apple
  Bank $300 (NY), Hudson Valley $500 (NY), Broadview $350 (NY), Liberty Bank $100 (CT).
- **Unverified on official domain (left out per safety rule):** FourLeaf FCU up to
  $550 (NY, page un-renderable), Patriot FCU $50 (PA), Bellwether MyMoney "gift"
  amount (NH), Landmark CU ~$300 (WI), FNBO EARN500 (NE — gated/404), Telcoe $475
  (AR — PDF lingers, not advertised), LGE $350 (GA — only $75 referral confirmed),
  Y-12 $300 (TN — not on current pages), Wintrust/Hinsdale (IL — no dated window).
- **Rate specials / rewards-checking / sweepstakes / non-cash (out of scope):**
  numerous (e.g. Connexus, Cobalt, First PREMIER Reward, Kasasa accounts, MSU FCU
  state-employee-only, VyStar perk-value, GTE Bolts24 jersey).

## States with NO local offer anywhere

**Alaska, South Dakota, Wyoming** — every reviewed institution offered only free
checking, rate-rewards accounts, referral-with-referrer, or sweepstakes; no
publicly-claimable new-account cash bonus on an official page as of 2026-06-12.
Recheck quarterly.

## Recurring historical promotions (watch for renewals)

FNBO (NE) runs an annual EARN500 checking promo; Redstone (AL) and Telcoe (AR) run
anniversary new-member bonuses; Eastern Bank (MA) and Metro CU (MA) run periodic
stacked offers; Service CU (NH) runs a summer public checking bonus. Several CU
calendar-year offers (CommunityAmerica, Citadel, SECU MD, Visions) tend to renew.

## Freshness / monitoring

Deadline-bearing offers auto-quarantine after their date via `getLiveCatalog`
(expired rows dropped). `recheck_days` on each row sets the cadence for
no-expiration offers (7–60 days). bankbonus.com `promotions-by-state` and Doctor
of Credit remain the sitemap-canary discovery feeds. A failed/incomplete crawl
never removes a live offer — only deadline passage or manual review does.
