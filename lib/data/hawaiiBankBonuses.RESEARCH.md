# Hawaii bank-account bonus coverage report

Verified inventory of deposit-account (checking / savings / new-member) cash
bonuses available to **Hawaii residents** from **Hawaii-local institutions**.
Companion to `./hawaiiBankBonuses.ts` (live data) and the nationwide rows in
`./bonuses.ts` / `./savingsBonuses.ts`. Mirrors the methodology of the regional
credit-card work in `./states/RESEARCH.md`.

- **Last full verification:** 2026-06-11
- **Discovery sources:** NCUA Research-a-Credit-Union (active HI charters), FDIC
  BankFind Suite (active HI-HQ banks), Doctor of Credit + bankbonus.com
  (discovery only — never used as a final offer/eligibility source).
- **Authority rule:** every offer in the live catalog was confirmed on the
  institution's **own official page or disclosure** on the verification date.
  Aggregator-only, targeted/by-invitation, merchandise (non-cash), and
  rate-special "offers" are recorded here but **excluded from live data**.

## Headline counts

| Metric | Count |
| --- | --- |
| Institutions reviewed | 33 (6 banks live + 3 defunct/nonexistent, 24 credit unions) |
| Institutions with an active **cash** deposit bonus | 6 |
| Live Hawaii-local offers in catalog | 8 (7 new + 1 refreshed) |
| — statewide | 6 |
| — island/county-specific | 1 (Garden Island FCU — Kauai County) |
| — membership/affiliation-gated | 3 (Aloha Pacific, UH FCU, Garden Island) |
| Stale/expired/targeted offers quarantined to this report | 7 |
| Nationwide offers confirmed available to HI | SoFi, Capital One (360 Checking + Performance Savings), Bank of America, Ally (referral), **U.S. Bank**, **Chase personal checking/savings**, major brokerages — all obtainable by HI residents per direct HI experience |
| Nationwide offers NOT available to HI (HI-excluded) | **Chase BUSINESS deposit accounts only** (no HI Chase branches — confirmed by HI residents). Every other Chase product, incl. Chase personal deposit bonuses and Chase business **credit cards**, is fine in HI. |

## Live Hawaii-local offers (in `hawaiiBankBonuses.ts`)

| ID | Institution | Type | Bonus | Scope | Deadline | Recheck |
| --- | --- | --- | --- | --- | --- | --- |
| bank-of-hawaii-convenience-checking-100-2026 | Bank of Hawaii | Checking (online) | $100 | Statewide | 2026-06-30 | 14d |
| bank-of-hawaii-400-checking-2026 | Bank of Hawaii | Checking (Bankohana II/III) | $100–$400 | Statewide | 2026-06-30 | 14d |
| first-hawaiian-priority-banking-350-checking-2026 | First Hawaiian Bank | Checking | $350 | Statewide | 2026-06-30 | 14d |
| first-hawaiian-pure-checking-50-2026 | First Hawaiian Bank | Checking | $50 | Statewide | 2026-06-30 | 14d |
| hawaii-state-fcu-new-member-50-2026 | Hawaii State FCU | New-member | $50 | Statewide (broad FOM) | 2026-12-31 | 60d |
| aloha-pacific-fcu-direct-deposit-100-2026 | Aloha Pacific FCU | Direct deposit | $100 | Membership (C&C Honolulu + family) | 2026-12-31 | 60d |
| uh-fcu-score100-checking-100-2026 | University of Hawaii FCU | Checking (debit) | $100 Visa card | Membership (UH affiliation) | 2026-12-31 | 60d |
| garden-island-fcu-referral-25-2026 | Garden Island FCU | Referral/new-member | $25 | Kauai County | none stated | 90d |

## Banks reviewed (FDIC BankFind: 6 active HI-HQ charters)

| Institution | Type | Islands served | Active cash bonus | Notes |
| --- | --- | --- | --- | --- |
| Bank of Hawaii | Bank | Statewide (+ Guam/Saipan/Palau) | **YES** — Convenience $100, Bankohana II/III up to $400 (DD in 60d, ends 6/30/26, pays ≤120d) | Recurring: BoH runs this checking promo most years. A $200 savings bonus is advertised by aggregators but **terms conflict (DoC $7,500/5mo vs bankbonus $5,500/4mo) and the official BoH "Savings Special" is a 3.25% rate promo, not a cash bonus** → excluded. |
| First Hawaiian Bank | Bank | Statewide (+ Guam/CNMI) | **YES** — Priority Banking $350 new / $100 upgrade, Pure Checking $50 (DD $500 in 60d, ends 6/30/26) | Recurring Jan–Jun promo. Aggregators listed a 4/30/26 end; official page says 6/30/26 (official governs). |
| Central Pacific Bank | Bank | Statewide | **TARGETED only** — $300 Value Checking, **by-invitation list only**, window 4/20–6/12/26 | Excluded: not publicly available to all new customers + expiring. Business "Exceptional" $1,200/$400 promo **EXPIRED**. Referral program ($50/$20) is existing-customer-only. Recheck for a public renewal. |
| American Savings Bank | Bank | Statewide | **NO** (no verified deposit cash bonus) | DoC "$300–$500 in-branch" traces to an **expired 2017** offer. CDs are rate specials. A $100 Analyzed Checking (business) offer appears only in search-index snapshots of `/business-banking-promo` (page 404s to fetch) → **unverified**. |
| Hawaii National Bank | Bank | Oahu + neighbor islands | **NO** | Rate competition only; no cash bonus on personal or business products. |
| Finance Factors | Bank/thrift | Honolulu, Kauai, Hawaii, Maui, Kalawao (13 branches) | **NO** | HI residents/businesses only; eSavings/eCD online. Rate-only marketing. |
| Territorial Savings Bank | (defunct) | — | n/a | **Merged into Bank of Hope 2025-04-02** (now tsbhawaii.bank). |
| Ohana Pacific Bank | (defunct) | — | n/a | **Acquired by CBB Bancorp 2021-07-01.** |
| "Hawaii Pacific Bank" | (nonexistent) | — | n/a | No FDIC record, any state/status. Likely a misremembered name. |

## Credit unions reviewed

### Large Oahu CUs
| Institution | Islands / FOM | Active bonus | Notes |
| --- | --- | --- | --- |
| Hawaii State FCU (hawaiistatefcu.com) | Statewide; broad FOM (SEGs, family, or charity back-door) | **YES** — New-member $50 (DD $100 in 60d OR 10 debit in 30d), pays ≤90d, ends 12/31/26 | Also a Refer-A-Friend **sweepstakes** ($1,500 drawing) — not a guaranteed bonus, excluded. |
| HawaiiUSA FCU (hawaiiusafcu.com) | Education/SEG-based | **UNVERIFIED** — $100 Welcome Gift advertised, but live 2026 terms/expiration could not be confirmed (site 403; last confirmed deadline 12/31/25) | Excluded from live data per safety rule; recheck the official welcome-gift page. |
| Aloha Pacific FCU (alohapacific.com) | C&C Honolulu employees/groups + family; $5 share | **YES** — Direct Deposit $100 ($500+/mo recurring DD), new + current members, ends 12/31/26 | A $25 referral / KalaRewards $100 appears in aggregators but not confirmed on a current official page → excluded. |
| Hawaiian Financial FCU (hificu.com) | Oahu + Maui County (live/work/worship/school) | **NO** | Only a CD/share-certificate rate special; a 2025 pizza/e-gift promo expired. |
| Honolulu FCU / HOCU (myhocu.com) | Govt/military/SEG/association | **NO** | Ongoing Kasasa rewards only. Aggregator "$120 Kasasa Tunes" is **stale** (product discontinued). |
| University of Hawaii FCU (uhfcu.com) | UH faculty/staff/students + family | **YES** — Score100 $100 Visa Reward Card (5 debit totaling $50 + eStatements in 60d, code SCORE100), ends 12/31/26 | No direct deposit required. New members only. |

### Military / Pearl Harbor area
| Institution | FOM | Active bonus | Notes |
| --- | --- | --- | --- |
| Lōkahi FCU (ex-Hickam FCU, lokahifcu.com) | Oahu community (live/work/worship/school) | **Merchandise only** — tote/towel with new checking + 1 DD | Non-cash → excluded from cash catalog. |
| Pearl Hawaii FCU (ex-Pearl Harbor FCU, pearlhawaii.com) | Oahu community | **NO** | Loan/CD rate specials only. |
| Schofield FCU (schofieldfcu.org) | Schofield/Army-affiliated | **NO** | Debit sweepstakes only (not guaranteed). |
| Navy Federal CU | Military/DoD, **nationwide** | $200 (code CHK26MJ, open by 6/30/26) | **Nationwide member offer, not HI-local** — available to eligible HI military. Not added as a HI-specific row. |
| USAA | Military, **nationwide** | $300 Classic Checking (apply by 6/16/26) | **Nationwide member offer, not HI-local.** |

### Neighbor-island CUs (Maui / Kauai / Hawaii Island / Molokai)
| Institution | County / island | Active bonus | Notes |
| --- | --- | --- | --- |
| Maui County FCU (mauicountyfcu.org) | Maui County | **NO** | Cash Back Checking is ongoing rewards. 2019 $50 bonus expired. |
| Valley Isle Community FCU (vicfcu.org) | Maui island | **NO** | — |
| Kahului FCU (kahuluifcu.com) | Maui | **NO** | FOM not publicly stated. |
| Wailuku FCU (wailukufcu.com) | Central Maui | **NO** | — |
| Gather FCU (ex-Kauai Community FCU, gatherfcu.org) | Kauai | **NO** | Rebranded 2018. |
| Garden Island FCU (gardenislandfcu.com) | **Kauai County** | **YES** — $25/$25 member referral ($1,000+/mo DD, $5 + checking + online banking + eStatements; pays ≤60d) | New referred member gets $25. A 2024 grand-opening $300 promo expired. |
| Kaua'i FCU (ex-Kauai Government Employees FCU, kauaicreditunion.org) | Kauai govt/education/partner | **Sweepstakes only** ("could win $100, 5/quarter") | Not guaranteed → excluded. |
| Kauai Ohana FCU (ex-Kauai Teachers FCU, kauaiohanafcu.org) | Kauai County | **NO** (officially) | A 3rd-party "up to $50 cash" listing is **unconfirmed** on the official site → excluded. |
| CU Hawaii FCU (cuhawaii.com) | Hawaii Island | **NO** (adult) | Keiki Club $70 is a children's-savings **match** (enroll by 6/12/26), not an adult new-member bonus. |
| Big Island FCU (bigislandfcu.com) | Hawaii Island | **NO** | Branch-only opening. |
| HawaiiCentral FCU (hawaiicentral.org) | **Oahu / Honolulu County** (not a neighbor island) | **NO** | — |
| Molokai Community FCU (molokaicommunityfcu.com) | Molokai | **NO** | No self-service online opening evident. |

## Excluded / quarantined (not live)

1. **Bank of Hawaii $200 savings** — conflicting aggregator terms; official is a rate promo, not cash.
2. **Central Pacific Bank $300 Value Checking** — targeted/by-invitation, window ends 6/12/26.
3. **CPB business "Exceptional" $1,200/$400** — expired.
4. **American Savings Bank $100 Analyzed Checking (business)** — only in search index; page not directly verifiable.
5. **HawaiiUSA FCU $100 Welcome Gift** — advertised but 2026 terms unconfirmed (site 403).
6. **Aloha Pacific referral / KalaRewards $100** — aggregator-only, not on a current official page.
7. **Lōkahi FCU tote/towel**, **CU Hawaii Keiki $70 match**, **Kaua'i FCU / Hawaii State / Schofield sweepstakes** — non-cash or non-guaranteed.

## Recurring historical promotions (watch for renewals)

- **Bank of Hawaii** runs the Convenience/Bankohana checking DD promo most years (typically a Jan/Feb–Jun window). Recheck before each summer.
- **First Hawaiian Bank** runs a Jan–Jun Priority Banking / Pure Checking statement-credit promo annually.
- **Central Pacific Bank** runs periodic targeted personal ($300) and business ($400–$1,200) checking promos — watch for a publicly-available version.
- **Hawaii State FCU**, **UH FCU**, and **Aloha Pacific** run calendar-year ($50–$100) member offers that tend to renew each January.

## Freshness / monitoring

- bankbonus.com `promotions-by-state/hawaii` and Doctor of Credit are already
  tracked by the sitemap canary (`scripts/canary/config/sources.json`) for
  *discovery*. Official HI bank promo pages are listed there as `official`
  sources (disabled until a stable sitemap is confirmed) — see that file.
- Deadline-bearing offers (BoH, FHB) auto-quarantine after 2026-06-30 via the
  catalog's expiration logic (`getLiveCatalog` drops expired rows). The
  calendar-year CU offers should be re-verified at the cadence in the table
  above; no-expiration offers (Garden Island) get a 90-day recheck.
- Per the canary's `CrawlStatus` contract, a failed/incomplete crawl never
  removes live offers — only deadline passage or manual review does.
