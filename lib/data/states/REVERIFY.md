# Re-verification backlog — regional card catalog

Institutions surfaced during discovery that were **logged as unresolved** (never
fabricated) because their card terms could not be confirmed on an official,
fetchable issuer page during the research passes. Each is a candidate to add once
its terms are verifiable. Grouped by *why* it stalled, so they can be retried by
strategy.

Compiled 2026-06-12. Source: per-batch "Unresolved" notes in `RESEARCH.md`.

---

## A. Bot-walled (403 / Cloudflare / PerimeterX / JS-only / timeout)
Official site blocked automated fetches. Retry via a real browser session or the
Wayback Machine (200-status snapshots of the card/disclosure URLs), as was done
successfully for CT.

| State | Institution | Note |
|-------|-------------|------|
| CA | Golden 1 CU + Schools Financial | golden1.com timed out every fetch |
| WA | Gesa, Verity, Inspirus | 403 / redirect at fetch time |
| AK | ALPS FCU, Matanuska Valley FCU | official pages 403/blocked |
| CO | Canvas (JS-only), Elevations (403), Aventa (conn refused) | |
| TX | GECU (JS-only), Texas Tech CU, Texas Trust (403), FirstLight (404) | |
| OK | Arvest | PerimeterX bot wall |
| MI | UMCU, Michigan First, Adventure | 403 / no FOM page |
| IN | Financial Center First | site refused connection |
| WI | Summit, Fox Communities, Landmark, Prospera | 403 |
| ND | Capital CU (ND) | 403 |
| SD | Black Hills FCU | 403 (also charitable-fund backdoor — check before adding) |
| KS | Quest CU | site timed out |
| TN | Eastman CU | Cloudflare 403 |
| AL | Avadian | 403 |
| LA | Neighbors FCU, La Capitol FCU, b1BANK | all 403 |
| FL | Suncoast | 403 |
| SC | Coastal, Self-Help, LGFCU/Civic | 403 |
| SC | Founders, SC Federal | 403 |
| NH | Granite State CU | gscu.org HTTP 403 |
| RI | Rhode Island CU | 403/404 on official pages (also 50-mile MA/CT FOM) |

## B. Terms behind a third-party portal (find the official disclosure PDF)
Card exists and is genuinely the institution's, but rates/rewards live on a
processor portal (Fiserv myaccountaccess, cardmanager.net) or an agent issuer
(TCM). Retry by locating the official rate/disclosure document.

| State | Institution | Note |
|-------|-------------|------|
| ME | cPort CU | Fiserv myaccountaccess portal, no official disclosure found |
| MA | Cooperative Bank of Cape Cod | TCM-issued; full Cape-anchored Visa lineup but no disclosure PDF |
| RI | Westerly Community CU | terms on third-party cardmanager.net |

## C. Earn rate / APR undisclosed on the official card page
Official card page exists but omits the spend rate, APR, or bonus terms. Retry
by checking the institution's rate sheet / application-and-solicitation disclosure.

| State | Institution | Note |
|-------|-------------|------|
| AZ | Pinnacle Bank AZ | earn rate undisclosed |
| AZ | American Southwest CU, Tucson Old Pueblo CU | no verifiable terms |
| NV | Boulder Dam CU | no rates/rewards on official card page |
| UT | Zions Bank, Chartway | no verifiable own-brand consumer card |
| IN | Hoosier Hills | low-rate only, no rewards terms |
| MO | Vantage CU (no fetchable FOM page), St. Louis Community CU (off-site terms) | |
| KY | Park Community, Greater Kentucky | no published terms |
| GA | LGE, Center Parc, Family First, Health Center | no fetchable card page |
| FL | Tropical Financial | no fetchable card page |
| ME | Camden National Bank | no verifiable consumer card terms |
| OR | Wauna CU, Point West CU | rewards Visa exists, terms not on official page |
| AK | Northrim ("25,000 points" lacks spend/window) | re-check for a qualifying bonus + window |

## D. Discovery not completed (institutions not yet reached)
No blocker found — simply not pursued to a verified page this pass.

| State | Institution |
|-------|-------------|
| ME | Infinity FCU, Five County CU, Katahdin Trust, Acadia FCU, Maine Family FCU |
| CT | 360 FCU (only a business Visa surfaced; check for a consumer card) |

## E. Time-gated (re-check after launch)
| State | Institution | Note |
|-------|-------------|------|
| ND | Dakota West | cards "coming July 2026" — re-check after launch |
| AK | Mariners | first-year-fee-waiver promo expired 5/31/2026 — re-check for a current promo |

---

## Not re-verification candidates (deliberately excluded — do not re-add)
For reference, so these aren't mistaken for gaps. Excluded because the issuer is
**effectively nationwide** (cheap ACC/AFA/FFA/foundation/donation membership
backdoor) or the card is an **Elan/FNBO/Fiserv/TCM white-label nationwide
product**, not a genuinely state-restricted offer:

- **Nationwide-backdoor CUs:** Connexus, Verve, Commonwealth CU, UK FCU, Ascend
  FCU, Barksdale, OnPath, Red River CU, Sharonview, Heritage Trust/REV, GTE,
  Achieva, Fairwinds, Elements Financial, Notre Dame FCU, Liberty/Evansville
  Teachers FCU, LMCU, MSUFCU, Genisys, Consumers (Kalamazoo), Honor, Community
  Choice, ELGA, Credit Union of America, Hudson Valley CU, Jovia, Service CU,
  St. Mary's Bank, Rockland FCU, Workers CU, Hanscom FCU, DCU, EastRise, Greenwood
  CU, Northeast/Lighthouse CU, NHFCU.
- **White-label (Elan/FNBO/Fiserv/TCM):** Harborstone, Denali State Bank, Greater
  Nevada, Financial Horizons, BancFirst, Oklahoma Central, INTRUST, Capital CU,
  Gate City, Bell Bank, Cornerstone, 4Front, Tennessee Valley FCU, 1st MS FCU,
  AllSouth, Eastern Bank, BankFive, Coastal1, Centreville Bank, Charter Oak,
  Nutmeg State, Connex, Liberty Bank (CT).
- **Nationwide bank-issued / already cataloged inline:** BofA Alaska Airlines,
  Simmons Bank, Synovus, Citizens Bank, First PREMIER/Premier Bankcard, BECU,
  Ent, VyStar, First Community CU, CommunityAmerica, First Tech FCU, Star One,
  Bethpage/FourLeaf.
