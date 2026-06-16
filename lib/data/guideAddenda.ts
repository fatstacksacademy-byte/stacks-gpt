/**
 * Verified addendum content for the long-form bank-bonus guides.
 * Generated from a web-verified research + adversarial-verification pass
 * (Doctor of Credit + issuer terms + bankbonus.com), June 2026. Low-confidence
 * rows were dropped and per-bank claims independently re-checked before inclusion.
 * Rendered by app/blog/components/GuideAddendum.tsx.
 */

export type GuideTable = { title: string; columns: string[]; rows: string[][]; sources?: string }
export type GuideFaq = { q: string; a: string }
export type GuideSection = { heading: string; body: string }
export type GuideAddendumData = { tables: GuideTable[]; faqs: GuideFaq[]; sections: GuideSection[] }

export const guideAddenda: Record<string, GuideAddendumData> = {
  "bank-account-churning-waiting-periods": {
    "tables": [
      {
        "title": "Bank bonus cooldown matrix (checking)",
        "columns": [
          "Bank",
          "Cooldown period",
          "Window type",
          "Credit-pull type",
          "Early closure fee"
        ],
        "rows": [
          [
            "Chase",
            "24 months from last bonus enrollment date (per product category)",
            "Rolling (per product category)",
            "Soft pull + ChexSystems",
            "Bonus clawed back if closed within 6 months; no separate fee"
          ],
          [
            "Wells Fargo",
            "12 months from last consumer checking bonus",
            "Rolling (bonus-to-bonus)",
            "Soft pull + ChexSystems",
            "No early closure fee reported"
          ],
          [
            "Citi",
            "365 days since owning a prior Citi checking account (raised from 180 days in Jan 2024)",
            "Rolling",
            "Soft pull",
            "No fee; bonus posts ~120 days out (90-day qualification + ~30-day payout)"
          ],
          [
            "US Bank",
            "12 months: no US Bank consumer checking owned/held in last 12 mo AND no consumer checking bonus in last 12 mo",
            "Rolling",
            "Soft pull",
            "No early closure fee reported"
          ],
          [
            "Bank of America",
            "12 months: not owned/co-owned a BofA personal checking account in last 12 mo",
            "Rolling (ownership-based)",
            "Soft pull",
            "No early closure fee reported"
          ],
          [
            "BMO",
            "12 months since closing a BMO personal checking account",
            "Rolling",
            "Soft pull",
            "$50 if closed within 90 days; bonus also clawed back if closed before the offer's hold date (~6 mo)"
          ],
          [
            "PNC",
            "24 months since last PNC promotional premium, PLUS no PNC/affiliated consumer checking owned or closed within last 12 mo",
            "Rolling (layered)",
            "Soft pull",
            "$25 if closed within 180 days (often not charged, YMMV)"
          ],
          [
            "Capital One",
            "Ineligible if you held a 360 Checking account on/after a fixed calendar date that advances per offer (e.g. $400 offer = on/after Jan 1 2024; $300 offer = on/after Jan 1 2023)",
            "Fixed-date (advancing)",
            "Soft pull",
            "No early closure fee reported"
          ],
          [
            "TD Bank",
            "Ineligible if you EVER received a prior TD personal checking bonus, OR closed a TD checking account within last 12 mo (varies by offer)",
            "Lifetime + rolling (varies)",
            "Soft pull",
            "Bonus clawed back if closed within 6 months"
          ],
          [
            "Huntington",
            "One incentive per rolling 12- to 24-month period across deposit relationships (recent offers seen at 24 mo)",
            "Rolling (varies by offer)",
            "Soft pull",
            "Early closing fee may apply if closed within ~6 months"
          ],
          [
            "Citizens",
            "Not a signer on any Citizens personal checking in the prior 6 months",
            "Rolling",
            "Soft pull if you opt out of overdraft protection (otherwise hard)",
            "No early closure fee reported"
          ],
          [
            "SoFi",
            "One bonus per SoFi member (explicit in terms; no documented reset)",
            "Lifetime (one-time)",
            "Soft pull / no hard pull",
            "No early closure fee"
          ],
          [
            "Chime",
            "Bonus is portal-based (Swagbucks/MyPoints etc.), one-time per new account; no Chime-native signup bonus",
            "One-time",
            "No ChexSystems / no EWS / no hard pull",
            "No early closure fee"
          ],
          [
            "Truist",
            "Ineligible if you closed a Truist personal checking account on/after a fixed cutoff date that advances per offer (e.g. on/after 3/26/25)",
            "Fixed-date (advancing)",
            "Soft pull (no hard pull reported on checking)",
            "Bonus forfeit if account closed before payout"
          ],
          [
            "Regions",
            "Ineligible if you held a Regions checking account on/after a fixed cutoff date (fixed-date rule, not a clean rolling window)",
            "Fixed-date",
            "Soft pull",
            "$25 if closed within 180 days"
          ],
          [
            "Fifth Third",
            "Not closed a Fifth Third checking account within the last 13 months",
            "Rolling",
            "Soft pull",
            "No early-closure fee tied to the bonus confirmed"
          ],
          [
            "KeyBank",
            "No KeyBank checking (or Hassle-Free) account in the last 12 months",
            "Rolling",
            "Soft pull",
            "$25 if closed within 180 days"
          ]
        ],
        "sources": "Verified June 2026 against DoC (consistent across offers), DoC + BMO offer terms, DoC + BofA offer terms, DoC + Capital One offer terms."
      },
      {
        "title": "Savings-account bonus: separate cooldown vs checking?",
        "columns": [
          "Bank",
          "Savings bonus separate from checking?",
          "Notes"
        ],
        "rows": [
          [
            "Chase",
            "Yes — separate 24-month timer",
            "Limit is per product category: one checking AND one savings bonus per 2 years, tracked independently"
          ],
          [
            "Wells Fargo",
            "Yes — separate 12-month track",
            "A checking bonus does NOT block a savings bonus; the 12-month exclusion is savings-bonus-to-savings-bonus only"
          ],
          [
            "Citi",
            "Yes — combined offers let you open both",
            "Citi runs combined personal checking/savings offers (up to ~$1,500-$2,000); each leg tied to its own product eligibility"
          ],
          [
            "BMO",
            "Combined offer; one checking + one savings bonus",
            "Checking and savings bonuses are offered together in the same promo; one of each"
          ]
        ],
        "sources": "Verified June 2026 against DoC, DoC + Wells Fargo offer terms, DoC + bankbonus.com, issuer/DoC pages."
      }
    ],
    "faqs": [
      {
        "q": "Is the cooldown measured from when I got the bonus or when I opened/closed the account?",
        "a": "It varies by bank. Chase measures its 24 months from your last bonus enrollment date. Wells Fargo and US Bank measure roughly 12 months from your last bonus (US Bank also requires no account in the last 12 months). Bank of America measures 12 months from when you last owned a checking account. Citizens (6 months), TD, and Fifth Third (13 months) measure from when you closed your prior account, while Capital One, Truist, and Regions instead make you ineligible if you held an account on or after a fixed calendar date. Always confirm the exact trigger in the current offer's terms."
      },
      {
        "q": "What's the difference between a rolling window and a fixed-date cutoff?",
        "a": "A rolling window (e.g. Chase's 24 months, Wells Fargo's and US Bank's 12 months) counts forward from a date unique to you. A fixed-date rule — used by Capital One, Truist, and Regions — makes you ineligible if you held or closed an account on or after a set calendar date that the bank periodically advances. It functions like a multi-year wait but is not a clean rolling window. Clean once-per-calendar-year resets are rare among the big banks."
      },
      {
        "q": "Do banks do a hard credit pull when I open a checking account?",
        "a": "For most major banks the account-opening decision is a soft pull plus a ChexSystems or Early Warning Services (EWS) deposit-history check, which does not affect your credit score. A hard pull is more likely only if you opt into overdraft protection or a linked line of credit — Citizens, for example, is a soft pull only if you decline overdraft protection. Chime uses neither ChexSystems nor a hard pull. Confirm before applying if you're rate-sensitive."
      },
      {
        "q": "Will I lose the bonus if I close the account early?",
        "a": "Often yes. Chase, TD Bank, BMO, and Huntington can claw back the bonus if you close within roughly 6 months, and Truist forfeits it if the account is closed before payout. Some banks also charge a flat early-closure fee: PNC, Regions, and KeyBank list $25 if closed within 180 days (PNC's is often not actually charged), and BMO lists $50 within 90 days. Several banks (Wells Fargo, US Bank, Bank of America, Capital One, Citizens, SoFi) have no commonly-reported early-closure fee. These details change by offer — confirm current terms."
      },
      {
        "q": "Do savings-account bonuses have their own cooldown separate from checking?",
        "a": "At several major banks, yes — checking and savings are treated as separate product categories with independent eligibility, so a recent checking bonus generally won't block a savings bonus. Chase is the clearest example: one checking and one savings bonus per 24 months, each on its own timer. Wells Fargo's 12-month exclusion likewise applies savings-bonus-to-savings-bonus, not checking-to-savings. Citi and BMO commonly bundle a checking + savings offer together. Verify per offer."
      }
    ],
    "sections": [
      {
        "heading": "How to read this matrix",
        "body": "Cooldown periods, fees, and credit-pull behavior are set per offer and change over time — every value here reflects commonly-seen terms verified as of June 2026 and should be confirmed against the current offer's fine print before you apply. 'Rolling' means the clock starts from a date specific to you (last bonus, last enrollment, or last account closure, depending on the bank). 'Fixed-date (advancing)' describes the approach used by Capital One, Truist, and Regions, where eligibility hinges on whether you held or closed an account on or after a set calendar date the bank periodically moves forward — functionally a multi-year wait, but not a clean rolling window."
      },
      {
        "heading": "Credit-pull and ChexSystems caveat",
        "body": "Nearly all the big banks open personal checking with a soft credit pull combined with a ChexSystems or Early Warning Services (EWS) deposit-history review, so opening alone typically doesn't ding your FICO score. A hard pull usually appears only when you add overdraft protection or a linked line of credit — Citizens, for instance, stays a soft pull only if you opt out of overdraft protection. Chime uses neither ChexSystems nor a hard pull. Pull behavior can vary by state, channel (branch vs online), and product, so treat the column as a strong default rather than a guarantee, and check current data-point threads before applying."
      },
      {
        "heading": "Early-closure fees vs bonus clawbacks",
        "body": "Two different penalties are easy to confuse. A bonus clawback means the bank reverses the cash bonus if you close too soon (Chase, TD, BMO, and Huntington commonly enforce a ~6-month window; Truist forfeits if you close before payout). A flat early-account-closure fee is charged regardless of the bonus (PNC/Regions/KeyBank ~$25 within 180 days, though PNC's is frequently waived in practice; BMO ~$50 within 90 days). Some banks have neither. Best practice across the churning community is to keep an account open ~6 months after the bonus posts to avoid clawbacks and reduce blacklisting risk, even where no fee is listed."
      }
    ]
  },
  "chexsystems-guide-bank-bonuses": {
    "tables": [
      {
        "title": "ChexSystems Sensitivity by Bank (Major Banks)",
        "columns": [
          "Bank",
          "Pulls ChexSystems?",
          "Inquiry-Sensitive vs Negative-Only",
          "Known Threshold / Notes",
          "Uses EWS?"
        ],
        "rows": [
          [
            "Chase",
            "Yes (most standard accounts)",
            "Inquiry-sensitive",
            "DoC datapoints: denial at 23 inquiries (possibly ~10+ auto-denied); an 8-inquiries-in-3-months denial was overturned on recon. DoC has flagged Chase tightening on heavy recent inquiries. Chase Secure Banking reportedly uses EWS, not Chex.",
            "Yes (co-owner)"
          ],
          [
            "Citi / Citibank",
            "Yes",
            "Unclear (Chex inquiry-sensitivity not well-documented)",
            "A single aggregator reports denials at 9-10 new openings in 4 months, but DoC's documented Citi sensitivity is to credit-bureau inquiries (6+ from one bureau in 6 months), not ChexSystems. Treat the Chex threshold as unconfirmed.",
            "No (not co-owner)"
          ],
          [
            "Wells Fargo",
            "Yes (most standard accounts)",
            "Negative-only (reported)",
            "Reported to deny on negative Chex balance; not flagged as inquiry-sensitive in available datapoints. Co-owns EWS.",
            "Yes (co-owner)"
          ],
          [
            "Bank of America",
            "Mixed / conflicting reports",
            "Unclear",
            "Sources conflict on whether BofA pulls Chex vs. uses its own underwriting + credit bureau; offers a Safe Balance second-chance account. Co-owns EWS. No reliable inquiry threshold.",
            "Yes (co-owner)"
          ],
          [
            "US Bank",
            "Yes (also leans on EWS)",
            "Not flagged inquiry-sensitive (single-source)",
            "One aggregator reports approval with 15+ inquiries. DoC notes US Bank often prioritizes EWS / internal models. Co-owns EWS. Threshold is single-source.",
            "Yes (co-owner)"
          ],
          [
            "TD Bank",
            "Yes",
            "Not flagged inquiry-sensitive (single-source)",
            "One aggregator reports approval with 15+ inquiries. Threshold is single-source; treat as indicative only.",
            "No (not co-owner)"
          ],
          [
            "PNC",
            "Yes (also leans on EWS)",
            "Possibly volume-sensitive (single-source)",
            "One aggregator reports a denial after ~30+ accounts opened in 3 years. DoC notes PNC often prioritizes EWS / internal models. Co-owns EWS. Threshold is single-source.",
            "Yes (co-owner)"
          ],
          [
            "Capital One (360)",
            "Mixed (per DoC) — usually skips Chex on opening",
            "Neither clearly (proprietary/EWS screen)",
            "DoC rates Cap One 360 'Mixed' for Chex and notes it is EWS-sensitive; usually skips Chex on opening but surprise pulls/denials are reported. Co-owns EWS.",
            "Yes (co-owner)"
          ],
          [
            "Huntington",
            "Yes (soft pull, reported)",
            "Negative-only (reported)",
            "Conflicting sources: some say soft Chex pull, some say no use. Qualify if you owe the bank nothing. No reliable inquiry threshold.",
            "No (not co-owner)"
          ],
          [
            "Fifth Third",
            "Yes",
            "Negative-only (reported)",
            "Reported to check Chex on every new personal account for negative listings (recent NSF / prior closure usually triggers denial; clean report approves).",
            "No (not co-owner)"
          ],
          [
            "Truist",
            "Yes (Chex)",
            "Unclear",
            "Confirmed to pull ChexSystems on checking applications; also co-owns EWS. No reliable inquiry threshold.",
            "Yes (co-owner)"
          ],
          [
            "Discover",
            "No (does not pull ChexSystems)",
            "N/A for Chex (negatives elsewhere may still affect approval)",
            "DoC do/don't-pull list and multiple sources confirm Discover does not check ChexSystems on its Cashback Debit account; no hard pull. A prior 'approved with 15+ inquiries' datapoint is consistent with no Chex pull.",
            "No (not co-owner)"
          ]
        ],
        "sources": "Verified June 2026 against bankcheckingsavings.com, bankcheckingsavings.com; doctorofcredit.com do/don't-pull; CFPB EWS, crediful + thecreditpeople (conflicting); CFPB EWS, crediful; CFPB EWS."
      },
      {
        "title": "Fintechs / Neobanks That Skip ChexSystems (Best Restart Points After Denials)",
        "columns": [
          "Provider",
          "ChexSystems on Open?",
          "Notes"
        ],
        "rows": [
          [
            "Chime",
            "No",
            "No credit check or Chex; explicitly marketed as second-chance banking on Chime's own site."
          ],
          [
            "Varo",
            "No",
            "Varo explicitly states it doesn't use ChexSystems; no minimum deposit."
          ],
          [
            "Current",
            "No",
            "No credit check, no ChexSystems review, no minimum deposit."
          ],
          [
            "GO2bank",
            "No",
            "Rep-confirmed non-ChexSystems bank; debit + direct deposit."
          ],
          [
            "Acorns Checking",
            "No",
            "Rep-confirmed no Chex (checking via partner bank); ties to round-up investing."
          ],
          [
            "Albert Cash",
            "No",
            "Listed as no Chex on signup; debit + savings buckets. Single-source."
          ],
          [
            "Novo (business)",
            "No",
            "No credit check to open; business-focused. Single-source."
          ],
          [
            "SoFi",
            "Disputed",
            "bankbonus.com lists SoFi checking as not using ChexSystems; thecreditpeople reports a soft Chex pull + soft credit check that can deny on negatives. Not reported as inquiry-sensitive. Verify current behavior before applying."
          ]
        ],
        "sources": "Verified June 2026 against bankbonus.com (no-Chex) vs thecreditpeople (soft pull) — conflict, bankbonus.com; crediful, bankbonus.com; crediful; firstcard, bankbonus.com; firstcard."
      },
      {
        "title": "Early Warning Services (EWS) — Co-Owners (per CFPB)",
        "columns": [
          "Bank",
          "EWS Co-Owner",
          "Notes"
        ],
        "rows": [
          [
            "Bank of America",
            "Yes",
            "Co-owns EWS, which operates Zelle; screens via EWS."
          ],
          [
            "Capital One",
            "Yes",
            "Co-owns EWS."
          ],
          [
            "JPMorgan Chase",
            "Yes",
            "Co-owns EWS; Chase Secure Banking reportedly uses EWS rather than Chex."
          ],
          [
            "PNC Bank",
            "Yes",
            "Co-owns EWS."
          ],
          [
            "Truist",
            "Yes",
            "Co-owns EWS; also pulls Chex."
          ],
          [
            "US Bank",
            "Yes",
            "Co-owns EWS; also pulls Chex."
          ],
          [
            "Wells Fargo",
            "Yes",
            "Co-owns EWS; also pulls Chex."
          ]
        ],
        "sources": "Verified June 2026 against CFPB, CFPB; EWS/Zelle (Wikipedia), issuer/DoC pages."
      }
    ],
    "faqs": [
      {
        "q": "How many bank accounts can I open per year before ChexSystems hurts me?",
        "a": "Community data (Doctor of Credit) suggests roughly 6-8 new-account inquiries per year is generally safe, with denials becoming more common around 12+ in a single year. Inquiry-sensitive banks can be stricter — Chase, for instance, has reported denials at higher inquiry counts. Account-opening inquiries stay on your ChexSystems report for about three years. These are rough thresholds that vary by offer and bank, so confirm current terms before applying."
      },
      {
        "q": "Does pulling ChexSystems mean a bank will deny me for too many inquiries?",
        "a": "No. Many banks pull ChexSystems only to check for negative items (unpaid overdrafts, NSF, fraud closures) and will approve you regardless of inquiry count if your record is clean. Only inquiry-sensitive banks decline based on the number of recent inquiries. This pull-vs-inquiry-sensitive distinction is the key thing to check before applying."
      },
      {
        "q": "Which banks skip ChexSystems entirely?",
        "a": "Chime and Varo are the most reliably confirmed no-ChexSystems options (no credit check either). Current and GO2bank also skip it, and Discover's Cashback Debit account does not pull ChexSystems. Capital One 360 usually skips ChexSystems on opening but is rated 'Mixed' by Doctor of Credit, so it isn't a guarantee. These are the best restart points after a ChexSystems-related denial — confirm current policy before applying."
      },
      {
        "q": "What is Early Warning Services and which banks use it?",
        "a": "EWS is a deposit-account reporting agency co-owned by Bank of America, Capital One, JPMorgan Chase, PNC, Truist, US Bank, and Wells Fargo (per CFPB), and it owns and operates Zelle. Those owners and some other banks query EWS in addition to or instead of ChexSystems, so clearing only your ChexSystems file may not be enough at those banks."
      },
      {
        "q": "Does SoFi use ChexSystems?",
        "a": "Sources conflict. SoFi appears on several 'no ChexSystems' lists (including bankbonus.com), but at least one source reports SoFi runs a soft ChexSystems pull plus a soft credit check and can deny on negative items such as an unpaid overdraft, fraud closure, or repeated NSF. It does not appear to be inquiry-sensitive. Treat SoFi as possibly negative-item sensitive and verify current behavior before applying."
      }
    ],
    "sections": [
      {
        "heading": "Pull vs Inquiry-Sensitivity: The Core Distinction",
        "body": "Most large banks PULL ChexSystems (and/or Early Warning Services) when you open a deposit account, but pulling is not the same as being inquiry-sensitive. A bank that only cares about NEGATIVE items (unpaid overdrafts, NSF, fraud closures) will approve you no matter how many recent new-account inquiries you have, as long as your record is clean. An INQUIRY-SENSITIVE bank declines for too many recent inquiries even with a spotless record. For bonus chasing, inquiry-sensitivity is the constraint that matters. General community guidance (Doctor of Credit): roughly 6-8 inquiries per year is usually safe, and problems tend to start around 12+ in a single year. These are rough community thresholds, not hard rules — they vary by offer, by bank, and by online vs. in-branch application, so always confirm current terms."
      },
      {
        "heading": "ChexSystems vs Early Warning Services (EWS)",
        "body": "ChexSystems is the most widely used deposit-account reporting agency (used by roughly 80% of financial institutions). Early Warning Services (EWS) is a separate agency co-owned by seven large banks — Bank of America, Capital One, JPMorgan Chase, PNC, Truist, US Bank, and Wells Fargo (per CFPB) — and it owns and operates the Zelle network. Many big banks query EWS in addition to, or instead of, ChexSystems. Chase Secure Banking, for example, is reported to use EWS rather than ChexSystems. Negative items generally stay on a ChexSystems or EWS report for about five years (up to seven years for certain items under the Fair Credit Reporting Act), while account-opening inquiries stay about three years. Because these co-owners lean on EWS, clearing your ChexSystems record alone may not be enough at those institutions."
      },
      {
        "heading": "Best Starting Points After a Denial",
        "body": "If you've been denied for too many inquiries or have negative items, the most reliable fresh-start options skip ChexSystems entirely: Chime and Varo (no credit check, no Chex — high confidence), plus Current and GO2bank. Among major banks, Discover's Cashback Debit account does not pull ChexSystems either, though a recent overdraft or fraud flag elsewhere can still affect approval. Capital One 360 usually skips ChexSystems on opening but is rated 'Mixed' by Doctor of Credit (surprise pulls and EWS sensitivity are reported), so treat it as a maybe rather than a guarantee. SoFi is commonly listed as no-Chex, but at least one source reports a soft ChexSystems pull that denies on negative items — treat SoFi as possibly negative-sensitive but not inquiry-sensitive. Confirm current behavior before applying."
      }
    ]
  },
  "what-counts-as-direct-deposit": {
    "tables": [
      {
        "title": "Brokerage / ACH-Push Sources — What's Actually Documentable by Destination Bank",
        "columns": [
          "Source (push from)",
          "Where it's reasonably documented to work",
          "Where it does NOT count"
        ],
        "rows": [
          [
            "Fidelity (CMA/brokerage ACH push)",
            "Most widely confirmed brokerage source overall; commonly counts at Citi and Capital One 360",
            "SoFi (employer/payroll/benefits only — external ACH excluded); strict banks (US Bank) reject it. At Chase it is mixed — historically a reliable workaround but with recent failure reports"
          ],
          [
            "Charles Schwab (brokerage ACH push)",
            "Reported reliable at Capital One 360 and Citi",
            "SoFi (external ACH excluded); US Bank; mixed at Chase"
          ],
          [
            "Ally (ACH push)",
            "Reported to count at Capital One 360, Citi, and PNC",
            "Chase (widely reported NOT to count); SoFi (external ACH excluded)"
          ]
        ],
        "sources": "Verified June 2026 against SoFi eligible-DD support page; Citi T&C; secondary DoC/community data points, SoFi issuer terms (exclude bank ACH transfers); Citi Enhanced Direct Deposit terms; DoC community data points (List of Methods page currently 404s), SoFi issuer terms; community data points (no verifiable primary brokerage-by-bank table available), SoFi issuer terms; community/DoC data points (Ally→Chase failures widely reported)."
      },
      {
        "title": "Non-Brokerage Methods — Do They Count as Direct Deposit?",
        "columns": [
          "Method",
          "Counts as DD?",
          "Notes"
        ],
        "rows": [
          [
            "Zelle",
            "No (Citi is the exception)",
            "Chase, US Bank, and SoFi explicitly exclude Zelle. Citi explicitly INCLUDES incoming Zelle in its 'Enhanced Direct Deposit' definition (since 2022)."
          ],
          [
            "PayPal / Venmo (ACH)",
            "Mostly no; Citi is the clear exception",
            "Citi counts P2P-via-ACH (Venmo/PayPal) as Enhanced Direct Deposit — but P2P sent to a Citi DEBIT CARD does NOT qualify. Chase, US Bank, and SoFi explicitly exclude P2P. Capital One has scattered Venmo data points but no published P2P inclusion."
          ],
          [
            "Plain bank-to-bank ACH (self-transfer)",
            "Sometimes at lenient banks; fails at strict ones",
            "Capital One 360 and Citi tend to accept external ACH pushes. SoFi explicitly excludes 'bank ACH funds transfers'; US Bank and Chase reject transfers that code as P2P/non-payroll. Always push from the source, never pull."
          ],
          [
            "RTP / FedNow",
            "Yes at Chase and Capital One when the deposit is from an employer/government source",
            "Chase qualifying-electronic-deposit terms (eff. 3/15/2026) accept employer/government deposits via ACH, RTP, or FedNow. Capital One's definition also lists ACH or Real-Time Payment credits. The rail matters less than whether the deposit codes as employer/government."
          ],
          [
            "Wire transfer",
            "No",
            "Excluded broadly — Chase, US Bank, and Capital One explicitly exclude wires (processed via Fedwire, not ACH). No major bank counts a wire as a qualifying direct deposit."
          ],
          [
            "Tax refund / government payment (ACH)",
            "Usually yes — but NOT universal",
            "Chase explicitly counts government payments including tax refunds as qualifying electronic deposits. However, SoFi explicitly EXCLUDES IRS tax refunds, and some banks do not honor them. Treat as offer-specific, not a guaranteed trigger."
          ]
        ],
        "sources": "Verified June 2026 against Chase and Capital One issuer terms, Chase issuer terms (include); SoFi support page (exclude IRS tax refunds), Chase qualifying-electronic-deposit terms (ACH/RTP/FedNow); Capital One 360 qualifying-DD terms (ACH or RTP), Chase qualifying-electronic-deposit terms (exclude Zelle); US Bank terms; SoFi support page; Citi Enhanced Direct Deposit terms (include Zelle)."
      }
    ],
    "faqs": [
      {
        "q": "Does Zelle count as a direct deposit?",
        "a": "Generally no. Chase, US Bank, and SoFi explicitly exclude Zelle. The notable exception is Citi, whose 'Enhanced Direct Deposit' definition explicitly includes incoming Zelle. Confirm your specific offer's terms."
      },
      {
        "q": "Do PayPal or Venmo ACH transfers count?",
        "a": "Usually not. Citi counts P2P-via-ACH (PayPal/Venmo) as Enhanced Direct Deposit — but only via the ACH network, not P2P sent to a Citi debit card. Chase, US Bank, and SoFi explicitly exclude P2P payments. Capital One has scattered Venmo data points but no published inclusion. Varies by offer — confirm current terms."
      },
      {
        "q": "Does a regular bank-to-bank ACH transfer count?",
        "a": "It depends on the destination bank and how the transfer is coded. Lenient banks (Citi, Capital One 360) often accept a self-initiated external ACH push; strict banks reject transfers that code as P2P or non-payroll — SoFi explicitly excludes 'bank ACH funds transfers,' and Chase/US Bank reject P2P-coded transfers. Always push from the source, never pull."
      },
      {
        "q": "Are RTP and FedNow accepted now?",
        "a": "Yes at Chase, whose qualifying-electronic-deposit terms (effective 3/15/2026) accept employer/government deposits made via ACH, RTP, or FedNow. Capital One's definition also lists ACH or Real-Time Payment credits. The payment rail matters less than whether the deposit is coded as coming from an employer or government source."
      },
      {
        "q": "Which brokerage is the most reliable direct-deposit source?",
        "a": "Fidelity (Cash Management / brokerage) is the most frequently cited working source, and is commonly reported to count at Citi and Capital One 360. None are guaranteed — SoFi rejects all external brokerage/bank ACH pushes by its own terms, US Bank is strict, and Chase results are mixed with recent failures. Re-check current Doctor of Credit data points for your exact offer."
      },
      {
        "q": "Why did a method that used to work stop working?",
        "a": "Because ACH transfers used for person-to-person payments now carry a standardized P2P descriptor (a NACHA rule from 2014-2015) that strict banks read and reject. Brokerage pushes that code as a brokerage withdrawal (e.g., Fidelity) have held up best, but acceptance changes frequently — treat everything in this space as a moving target."
      }
    ],
    "sections": [
      {
        "heading": "How destination banks differ (strict vs. lenient)",
        "body": "Banks fall on a spectrum. Strict: Chase (qualifying deposits must be employer/government via ACH/RTP/FedNow; Zelle and wires excluded; ACH-pull funding can trigger account lockups), US Bank (explicitly excludes person-to-person payments), and SoFi (eligible direct deposit must be from an employer, payroll/benefits provider, or government agency via ACH — external bank ACH transfers, P2P like Zelle/PayPal/Venmo, wires, and even IRS tax refunds are explicitly excluded). Lenient: Citi (its 'Enhanced Direct Deposit' explicitly includes incoming Zelle and P2P-via-ACH such as PayPal/Venmo, though P2P sent to a Citi debit card does not count) and Capital One 360 (qualifying DD is a regular payment from an employer or an outside entity not affiliated with Capital One, via ACH or Real-Time Payment; self-initiated ACH from within Capital One and wires are excluded). Wells Fargo and BMO are under-documented in primary terms; do not rely on specific brokerage-push outcomes for them. Treat every offer as offer-specific and confirm current terms before relying on any method."
      },
      {
        "heading": "Push, never pull",
        "body": "To trigger a direct-deposit requirement you generally must PUSH funds from the source (brokerage or other bank) INTO the destination bonus account, initiated on the source's side. An ACH PULL initiated from the destination account does not code as an incoming deposit and will not count. For Chase specifically, Doctor of Credit's standing PSA warns that ACH activity on a new Chase account — pulls especially, but pushes too in some cases — can trigger account lockups, so depositing a check via mobile/branch or pushing from an external bank is the safer path."
      },
      {
        "heading": "Why ACH transfers get rejected as 'not a direct deposit'",
        "body": "Under NACHA rules that took effect in 2014-2015, ACH transfers used for person-to-person payments carry a standardized descriptor that flags them as P2P (e.g., 'BANK NAME / YOUR NAME / P2P'). Banks that read this metadata (Chase prominently) reject these as direct deposits even when the dollar amount and timing look right. This is why plain self-ACH transfers and some brokerage pushes are mixed or dead at strict banks, while pushes that code as a brokerage withdrawal (Fidelity is the most cited) tend to survive longest. Note: Citi went the other direction in 2022, expanding its 'Enhanced Direct Deposit' definition to deliberately INCLUDE P2P-via-ACH. This is a moving target — check current data points for your exact offer before relying on any method."
      }
    ]
  },
  "bank-bonus-tax-guide-2026": {
    "tables": [
      {
        "title": "Bank-by-bank 1099 behavior for account bonuses",
        "columns": [
          "Bank",
          "Form for cash account bonus",
          "Notable quirks"
        ],
        "rows": [
          [
            "Chase",
            "1099-INT",
            "Points/Ultimate Rewards checking bonuses also on 1099-INT valued at 1c/pt; card referrals reported on 1099-MISC"
          ],
          [
            "Citi",
            "1099-MISC for ThankYou points (cash bonuses generally treated as interest)",
            "ThankYou points from a checking relationship are taxable and reported on 1099-MISC only above the $600 threshold (tax-court backed, Shankar); points earned on card purchases are not taxable"
          ],
          [
            "Wells Fargo",
            "1099-INT (inconsistent)",
            "Some non-interest checking bonuses get no 1099; CSR has stated accounts are non-interest-bearing; debit-usage-required bonuses sometimes omitted"
          ],
          [
            "US Bank",
            "1099-INT (default treatment)",
            "Bonus generally reported as interest income; treatment is the standard default rather than a US-Bank-specific documented quirk"
          ],
          [
            "PNC",
            "Varies / sometimes no form",
            "Multiple data points show PNC often omits the bonus from the 1099-INT (only interest shows); some users got a form, some did not"
          ],
          [
            "TD Bank",
            "1099-MISC",
            "Codes bonus as misc income; reporting is notoriously inconsistent/late; no form below the threshold"
          ],
          [
            "Regions",
            "Varies / sometimes no form",
            "Community reports inconsistent; some report no 1099, others received one (thin data)"
          ],
          [
            "Capital One",
            "1099-INT (checking & savings)",
            "Referrals, courtesy credits, and Global Entry/TSA statement credits reported on 1099-MISC at ~$0.010029/pt (~1c) once the $600 annual total is reached; card welcome bonuses and spend points excluded"
          ],
          [
            "SoFi",
            "1099-INT (welcome bonus + interest, $10+)",
            "Rewards/referral bonuses on 1099-MISC at $600+; amounts consolidated across all SoFi products"
          ],
          [
            "Chime",
            "1099-INT (referee/opening bonus + interest, $10+)",
            "Referrer bonuses, sweepstakes, and prizes on 1099-MISC at $600+ (issuer states this explicitly)"
          ],
          [
            "Discover",
            "1099-INT (interest/new-customer bonus $10+)",
            "New-customer bonus treated as interest; referral/promotional bonuses on 1099-MISC at $600+"
          ],
          [
            "Ally",
            "1099-INT",
            "Treats bonuses and interest as interest income; referral commissions also reported on 1099-INT (issuer help center confirms 1099-INT issuance rules)"
          ]
        ],
        "sources": "Verified June 2026 against Ally Bank help center + community reports, Chime Help Center: What's a 1099 form, Citi ThankYou T&C + FlyerTalk/Tax Court (Shankar) + DoC data points, Discover coverage (dimovtax CPA blog) + DoC framework."
      },
      {
        "title": "Which form, by bonus TYPE (the rule that actually decides it)",
        "columns": [
          "Bonus type",
          "Form",
          "Threshold to require a form"
        ],
        "rows": [
          [
            "Cash checking/savings/CD account bonus",
            "1099-INT",
            "$10 (unchanged)"
          ],
          [
            "Interest earned on account",
            "1099-INT",
            "$10 (unchanged)"
          ],
          [
            "Referral bonus (cash/points)",
            "1099-MISC",
            "$600 thru tax year 2025; $2,000 from tax year 2026 (inflation-adjusted from 2027)"
          ],
          [
            "Misc/non-deposit reward, sweepstakes, courtesy credit",
            "1099-MISC",
            "$600 thru tax year 2025; $2,000 from tax year 2026 (inflation-adjusted from 2027)"
          ],
          [
            "Credit card points sign-up bonus (spend-based)",
            "Generally none (rebate)",
            "Not taxable as income (treated as a purchase rebate)"
          ]
        ],
        "sources": "Verified June 2026 against DoC + IRS form rules, DoC new-law (OBBBA) post, DoC referral + new-law (OBBBA) posts, IRS / issuer T&C."
      }
    ],
    "faqs": [
      {
        "q": "If I don't get a 1099, do I still owe tax on a bank bonus?",
        "a": "Yes. Bank account bonuses are taxable income whether or not a form is issued. A bank not sending a 1099 (often because you were under the $10 INT or $600/$2,000 MISC threshold) does not remove your obligation to self-report the income."
      },
      {
        "q": "Why did I get a 1099-INT for a bonus instead of a 1099-MISC?",
        "a": "Because most cash deposit-account bonuses are treated as interest. 1099-INT applies to bonuses tied to a checking/savings/CD relationship and must be issued at just $10. Misc income (referrals, prizes, non-deposit rewards) uses 1099-MISC instead."
      },
      {
        "q": "Are credit card welcome bonuses taxable like bank bonuses?",
        "a": "Generally no. Spend-based credit card sign-up bonuses are treated as a purchase rebate, not income, so they usually aren't taxed or reported. Bank account cash bonuses are different - they're taxable. Points credited without spending (such as some referrals) can still be reported as income."
      },
      {
        "q": "Did the 1099-MISC threshold really change?",
        "a": "Yes. The One Big Beautiful Bill Act (signed July 4, 2025) raised the 1099-MISC issuance threshold from $600 to $2,000 starting with tax year 2026, with inflation adjustments from 2027. The 1099-INT $10 threshold did not change. Confirm current IRS guidance for your filing year."
      },
      {
        "q": "Why do data points conflict for banks like PNC, Regions, and Wells Fargo?",
        "a": "Reporting varies by specific offer and how each bank classifies that promotion (interest vs. misc income, debit-usage vs. direct-deposit structures). For example, PNC has frequently omitted the bonus from its 1099-INT, and Wells Fargo has called some accounts non-interest-bearing. Treat these as varies-by-offer, confirm the current terms, and report the income regardless of what form arrives."
      }
    ],
    "sections": [
      {
        "heading": "The form is decided by the bonus TYPE, not the bank's preference",
        "body": "Whether you get a 1099-INT or a 1099-MISC is not a free choice the bank makes. IRS rules tie the form to the nature of the payment. A cash bonus for opening or funding a deposit account (checking, savings, CD) is treated as interest and goes on a 1099-INT, which must be issued at just $10. A bonus that is not tied to a deposit relationship - a referral bonus, a sweepstakes prize, a non-deposit reward, or certain courtesy credits - is miscellaneous income and goes on a 1099-MISC. Banks do vary in how they CLASSIFY a given promotion (for example, TD Bank codes some account bonuses as misc income), which is why community data points differ - but once classified, the form follows the type. Always confirm the current offer's terms, since classification can vary by offer."
      },
      {
        "heading": "Thresholds: 1099-INT stays at $10; 1099-MISC jumped to $2,000 for 2026",
        "body": "The 1099-INT reporting threshold remains $10 and is unchanged. The 1099-MISC threshold was $600 for years through tax year 2025. The One Big Beautiful Bill Act, signed July 4, 2025, raised the 1099-MISC threshold to $2,000 beginning with tax year 2026 (forms issued in early 2027), with inflation adjustments from 2027 onward. Practically: for 2026-and-later referral and miscellaneous bonuses, you may not receive a 1099-MISC unless you cross $2,000 with a single payer. (The 1099-K threshold also changed under the same law, reverting to $20,000 and 200 transactions.) Confirm against current IRS guidance, as transition details can shift."
      },
      {
        "heading": "Card points vs. bank account cash - different tax treatment",
        "body": "Credit card sign-up bonuses earned by meeting a spending requirement are generally treated as a rebate on spending, not taxable income, so they typically generate no 1099. Bank ACCOUNT bonuses (cash for opening/funding a deposit account) ARE taxable income and are reported on a 1099-INT or 1099-MISC. The gray area is points/miles credited without spending - including some bank-account points bonuses and referral points - which issuers may value at about 1 cent per point and report as income (Chase reports points checking bonuses on a 1099-INT; Capital One reports referrals and courtesy/Global Entry credits on a 1099-MISC; Citi reports ThankYou points from a checking relationship on a 1099-MISC)."
      }
    ]
  },
  "bank-bonuses-without-direct-deposit": {
    "tables": [
      {
        "title": "Push-DD Compatibility Matrix (which ACH-push source codes as DD at which destination bank) — verified June 2026",
        "columns": [
          "Push source",
          "Destination bank",
          "Codes as DD?",
          "Reliability / notes"
        ],
        "rows": [
          [
            "Fidelity (CMA/brokerage)",
            "Chase",
            "Historically yes; reportedly FAILING early 2026",
            "Multiple 2026 data points say Fidelity->Chase 'no longer works.' Do not rely on it; use a different source for Chase."
          ],
          [
            "Fidelity (CMA/brokerage)",
            "Citibank",
            "Yes",
            "Widely corroborated; Citi accepts Fidelity pushes"
          ],
          [
            "Fidelity (CMA/brokerage)",
            "PNC",
            "Yes",
            "PNC accepts-source list includes Fidelity"
          ],
          [
            "Fidelity (CMA/brokerage)",
            "U.S. Bank",
            "Yes",
            "U.S. Bank accept list includes Fidelity CMA"
          ],
          [
            "Fidelity (CMA/brokerage)",
            "Capital One 360",
            "Yes",
            "Cap One 360 accept list includes Fidelity"
          ],
          [
            "Fidelity (CMA/brokerage)",
            "Wells Fargo",
            "Yes",
            "Wells Fargo accept list includes Fidelity"
          ],
          [
            "Fidelity (CMA/brokerage)",
            "Fifth Third",
            "Yes (thin sourcing)",
            "Listed as accepted in one aggregator; weak corroboration — test small first"
          ],
          [
            "Charles Schwab (brokerage)",
            "Chase",
            "Yes",
            "Schwab appears in Chase accept lists; more reliable for Chase than Fidelity currently"
          ],
          [
            "Charles Schwab (brokerage)",
            "Citibank",
            "Yes",
            "Citi accept list includes Charles Schwab"
          ],
          [
            "Charles Schwab (brokerage)",
            "PNC",
            "Yes",
            "PNC accept list includes Charles Schwab"
          ],
          [
            "Charles Schwab (brokerage)",
            "U.S. Bank",
            "Yes",
            "U.S. Bank accept list includes Charles Schwab"
          ],
          [
            "Charles Schwab (brokerage)",
            "Capital One 360",
            "Yes",
            "Cap One 360 accept list includes Charles Schwab"
          ],
          [
            "Ally Bank (ACH push)",
            "Citibank",
            "Yes",
            "Citi accept list includes Ally"
          ],
          [
            "Ally Bank (ACH push)",
            "U.S. Bank",
            "Yes",
            "U.S. Bank accept list includes Ally"
          ],
          [
            "SoFi (Money/ACH push)",
            "Chase",
            "Yes",
            "Chase accept list includes SoFi Money/Invest"
          ],
          [
            "Capital One 360 (ACH push)",
            "U.S. Bank",
            "Yes",
            "U.S. Bank accept list includes Capital One 360"
          ],
          [
            "Any push source",
            "Bank of America",
            "Conflicting — test small first",
            "One aggregator lists Fidelity 'Money Line' working at BoA; community view is mixed. Treat as unproven."
          ],
          [
            "Any push source",
            "SoFi (as destination)",
            "No — pushes rejected",
            "SoFi rejects Fidelity CMA pushes (3/3 community failures, Apr 2026) and Wise; needs true payroll/benefits ACH-credit instead."
          ]
        ],
        "sources": "Verified June 2026 against bankcheckingsavings + SoFi support docs + community DPs, bankcheckingsavings + dannydealguru, dannydealguru (Cap One 360 accept list), dannydealguru (Chase accept list)."
      },
      {
        "title": "Truly No-DD Bonuses — triggered by debit transactions (no deposit classification needed) — verified June 2026",
        "columns": [
          "Bank / Account",
          "Type",
          "Bonus",
          "Requirement",
          "DD required?"
        ],
        "rows": [
          [
            "Capital One 360 Checking (code DEBIT250)",
            "Checking",
            "$250",
            "20 debit purchases $10+ within 75 days; no deposit requirement",
            "No"
          ],
          [
            "Chase Secure Banking",
            "Checking",
            "$125",
            "10 qualifying txns (debit/Zelle/bill pay/QuickDeposit) in 60 days; exp 7/15/2026",
            "No"
          ],
          [
            "Wells Fargo Clear Access Banking",
            "Checking",
            "$125",
            "10 qualifying posted txns in 60 days; open by 7/14/2026",
            "No"
          ],
          [
            "BMI Federal Credit Union (OH only)",
            "Checking",
            "$100",
            "Code ADD26; 30 debit txns $5+ in 90 days; eStatements; $20 open; exp 6/30/2026",
            "No"
          ]
        ],
        "sources": "Verified June 2026 against Issuer page (account.chase.com/consumer/banking/secure), Issuer page + DoC confirm, Issuer page confirms Clear Access qualifies (accountoffers.wellsfargo.com/checking125), bankbonus.com — Ohio counties only (Franklin/Licking/Fairfield/Pickaway/Madison/Union/Delaware/Morrow); near expiry."
      },
      {
        "title": "Truly No-DD Bonuses — triggered by balance / lump-sum deposit (savings + high-balance checking) — verified June 2026",
        "columns": [
          "Bank / Account",
          "Type",
          "Bonus",
          "Required deposit + hold",
          "Effective annualized yield on deposit*"
        ],
        "rows": [
          [
            "Capital One 360 Performance Savings (code BONUS1500)",
            "Savings",
            "$300 / $750 / $1,500",
            "$20k / $50k / $100k+ deposited within 15 days, then held 90 days after (~105 days total)",
            "~5.2% lowest tier ($300/$20k over ~105d), before base APY"
          ],
          [
            "Barclays Tiered Savings",
            "Savings",
            "$200",
            "$25k deposited within 30 days, held 120 consecutive days; open by 7/31/2026",
            "~2.4% on $25k over ~4 mo, before base APY"
          ],
          [
            "Raisin (code SUMMER26 — HEADSTART expired)",
            "Savings",
            "Up to $1,200",
            "$10k/$25k/$50k/$100k/$200k+ tiers = $60/$150/$300/$600/$1,200; first deposit Jun 1-30 2026; hold 90 days",
            "~2.4% on $200k top tier over 90d; lower tiers vary, before base APY"
          ],
          [
            "Alliant CU Ultimate Opportunity Savings",
            "Savings",
            "$100",
            "$100+/month for 12 consecutive months; balance >=$1,200 at month 12; ends 6/30/2026; nationwide membership",
            "Low (small balance over a full year)"
          ],
          [
            "HSBC Premier Checking",
            "Checking",
            "$1,500 - $5,000",
            "Deposit/invest $150k ($1,500) up to $1M+ ($5,000) within 20 days; hold 3 months; by 6/30/2026",
            "Varies by tier; high-balance only"
          ],
          [
            "Chase Private Client Checking (new-money)",
            "Checking",
            "$1,000 - $3,000",
            "Transfer new money $150k ($1,000) / $250k ($2,000) / $500k+ ($3,000) in 45 days; hold 90 days; ends 7/15/2026",
            "Varies by tier; high-balance only"
          ]
        ],
        "sources": "Verified June 2026 against DoC + bankbonus.com agree; nationwide, DoC + themoneyninja; new-money to checking/savings/JPM Wealth, Issuer page (banking.us.barclays/tiered-savings) + bankbonus.com, Issuer page (us.hsbc.com) + DoC."
      }
    ],
    "faqs": [
      {
        "q": "What is the difference between a 'no-DD bonus' and a 'push-DD workaround'?",
        "a": "A truly no-DD bonus never requires a direct deposit — you earn it by making debit-card transactions, holding a balance, or making a lump-sum deposit (e.g., Capital One DEBIT250 $250 for 20 debit purchases of $10+, or Chase Secure Banking $125 for 10 qualifying transactions). A push-DD workaround is for bonuses that DO require a direct deposit: you originate an ACH push from a brokerage like Fidelity or Schwab that the receiving bank classifies as a DD. It is never guaranteed — confirm current terms."
      },
      {
        "q": "Which push source is most reliable?",
        "a": "Fidelity (Cash Management or brokerage) and Charles Schwab brokerage have the most data points and the widest acceptance. Note an important 2026 change: Fidelity pushes to Chase are reportedly no longer coding as direct deposit, so for a Chase bonus prefer Schwab or a real payroll/benefits credit. Ally, SoFi, and Capital One 360 work at fewer destinations and should be tested first. Push early in the bonus window so you have time to try a second source if the first fails."
      },
      {
        "q": "Is a push DD guaranteed to count?",
        "a": "No. Banks change their DD-detection logic without notice — a push that worked last quarter can fail this quarter (Fidelity at Chase is a current example, and SoFi now rejects Fidelity and Wise pushes entirely). When a bonus is on the line, push early and, for any uncertain destination, send a small-dollar test push before committing the full required amount."
      },
      {
        "q": "Which current bonuses require absolutely no direct deposit?",
        "a": "As of June 2026 the cleanest issuer-confirmed no-DD checking offers are Capital One 360 (code DEBIT250) $250 for 20 debit purchases of $10+ in 75 days, Chase Secure Banking $125 for 10 qualifying transactions in 60 days (exp 7/15/2026), and Wells Fargo Clear Access Banking $125 for 10 transactions in 60 days (exp 7/14/2026). Savings options trigger on a held balance instead — e.g., Barclays $200 on $25k held 120 days, or Capital One Performance Savings $300+ on $20k+ held ~105 days. Confirm current terms before applying."
      },
      {
        "q": "Are no-DD bonuses worth it without a paycheck to route?",
        "a": "Yes — for churners without payroll they are some of the highest-return offers. A $250 debit-transaction bonus that needs only 20 small purchases can be a triple-digit effective annualized return. The trade-offs: no-DD offers tend to be smaller on average ($100-$400) than the biggest DD-required bonuses, and balance-based savings bonuses tie up cash for the hold period."
      }
    ],
    "sections": [
      {
        "heading": "Two distinct paths — keep them separate",
        "body": "There are two ways to skip a payroll direct deposit. (1) Push-DD workaround: the bonus still requires a 'direct deposit,' but you originate an ACH push from a brokerage/bank that the destination codes as DD. (2) Truly no-DD: the bonus never asks for DD at all — it triggers on debit-card transactions, a maintained balance, or a lump-sum deposit. The truly-no-DD path is lower risk because nothing depends on the destination bank's DD-detection logic, which changes without notice."
      },
      {
        "heading": "Which push source to use (and the Chase caveat)",
        "body": "Fidelity Cash Management / brokerage pushes have historically had the most Doctor of Credit data points and code as DD at the widest set of banks (Citi, PNC, U.S. Bank, Capital One 360 are all well-corroborated). Charles Schwab brokerage is a close, sometimes more reliable second. Important 2026 update: multiple data points now report Fidelity pushes to Chase are no longer coding as DD — for a Chase bonus, prefer Schwab or a genuine payroll/benefits ACH credit, and do not assume Fidelity will work. Ally, SoFi, and Capital One 360 pushes work at narrower, less-corroborated sets — treat them as test-first. Push early in the bonus window and confirm the transaction posts as a credit, not a transfer."
      },
      {
        "heading": "Effective-yield framing for savings bonuses",
        "body": "*Effective annualized yield = (bonus / required deposit) annualized over the full hold period, on top of the account's own APY. Watch the real hold length: Capital One Performance Savings $300 on $20,000 is held 90 days AFTER a 15-day funding window (~105 days total), which works out to roughly 5.2% annualized before base APY — not 6%. Barclays $200 on $25,000 held 120 days is ~2.4% annualized. High-balance tiers (HSBC, Chase Private Client) only make sense if six figures would otherwise sit idle — the absolute dollars are large but the percentage return is modest. Confirm current terms before committing funds."
      },
      {
        "heading": "Caveats",
        "body": "Offer terms change frequently — always confirm current requirements, amounts, and expiration on the issuer page before opening. Several offers that appear on early-2026 aggregator lists have since expired or narrowed: TD Bank's $200 savings offer ended 4/30/2026; Raisin's HEADSTART code closed 3/31/2026 (the live equivalent is SUMMER26 at lower payouts); and Ameriprise's savings bonus is restricted to existing Ameriprise clients, so it is not openable by a new no-DD hunter. Bank of America push-DD acceptance is genuinely unproven across sources — test a small-dollar push first. SoFi as a destination rejects pushes from Fidelity and Wise, so it needs true payroll or government-benefit ACH credits."
      }
    ]
  },
  "what-is-early-direct-deposit": {
    "tables": [
      {
        "title": "Banks & Credit Unions That Offer Early Direct Deposit (June 2026)",
        "columns": [
          "Bank / Account",
          "How many days early",
          "Monthly fee",
          "Notable feature"
        ],
        "rows": [
          [
            "Chime (Checking)",
            "Up to 2 days",
            "$0",
            "No-fee model; SpotMe fee-free overdraft up to $200 (needs $200+ monthly DD). MyPay is a separate paycheck advance, not early DD"
          ],
          [
            "SoFi (Checking & Savings)",
            "Up to 2 days",
            "$0",
            "Up to 3.80% APY with eligible DD/boost (3.10% base eligible-DD rate); no account fees"
          ],
          [
            "Capital One 360 Checking",
            "Up to 2 days",
            "$0",
            "Free automatic 'Early Paycheck'; no minimum balance"
          ],
          [
            "Varo",
            "Up to 2 days",
            "$0",
            "Paychecks/pensions/govt benefits qualify; P2P and tax refunds excluded"
          ],
          [
            "Current",
            "Pay: up to 2 days; govt benefits: up to 4 days",
            "$0 (no monthly maintenance fee)",
            "Up to $750 paycheck advance; up to 4.00% APY; fee-free overdraft up to $200"
          ],
          [
            "GO2bank",
            "Pay: up to 2 days; govt benefits: up to 4 days",
            "$5/mo (waived with payroll/govt-benefit DD)",
            "4-day early for govt benefits (SSA, etc.)"
          ],
          [
            "Ally Bank (Spending Account)",
            "Up to 2 days",
            "$0",
            "Up to 8 early DDs per statement cycle; each $10,000 or less; free & automatic"
          ],
          [
            "Discover (Cashback Debit)",
            "Up to 2 days (federal tax refunds: up to 5 days)",
            "$0",
            "1% cash back debit; Early Pay auto for qualifying ACH deposits"
          ],
          [
            "Cash App",
            "Up to 2 days",
            "$0",
            "Requires activated Cash App Card; $300+ monthly DD unlocks extra perks (e.g., free ATM)"
          ],
          [
            "Albert (Cash)",
            "Up to 2 days",
            "Early-pay feature free; Albert membership is a paid subscription",
            "Early pay posts on payer notification; membership product"
          ],
          [
            "Chase Secure Banking",
            "Up to 2 business days",
            "$4.95/mo (waived: $250+ electronic deposits, or owner age 17-24)",
            "No overdraft fees; no enrollment needed"
          ],
          [
            "Wells Fargo (Early Pay Day)",
            "Up to 2 business days",
            "$0 (no fee, no enrollment)",
            "Automatic on eligible personal checking/savings"
          ],
          [
            "Citi (Enhanced Direct Deposit)",
            "Up to 2 days",
            "$0 feature (account fee ~$15/mo waived at ~$250/mo deposits)",
            "Counts Zelle/PayPal/Venmo as DD; Everyday Benefits Account"
          ],
          [
            "TD Bank (TD Early Pay)",
            "Up to 2 business days",
            "$0 (feature is free; standard on eligible accounts)",
            "Eligible TD checking/savings; payroll, pension, govt benefits, tax refunds, military pay"
          ],
          [
            "Fifth Third (Early Pay)",
            "Up to 2 days",
            "$0",
            "Momentum/Express Banking/Preferred; tax refunds & some retirement/child support also eligible"
          ],
          [
            "Citizens Bank (Paid Early)",
            "Up to 2 days",
            "$0 (feature; automatic)",
            "Auto on personal checking/savings/money market with eligible DD"
          ],
          [
            "Huntington Bank (Early Pay)",
            "Up to 2 days",
            "$0",
            "Free for checking customers; no enrollment; valid email needed; may take up to 90 days to identify eligible DDs"
          ],
          [
            "Axos Bank (Direct Deposit Express)",
            "Up to 2 days",
            "$0",
            "Essential Checking & other Axos checking; free & automatic"
          ],
          [
            "USAA",
            "Up to 1-2 business days",
            "$0",
            "Military pay (DFAS), VA benefits, retirement pay; via direct deposit"
          ],
          [
            "Wealthfront (Cash Account)",
            "Up to 2 days",
            "$0",
            "Cash management account with high APY"
          ],
          [
            "OnePay (Cash)",
            "Up to 2 days (3 days from some employers)",
            "$0",
            "Walmart-backed fintech; Cash+ tier needs $500+/mo DD or $5k balance"
          ],
          [
            "Navy Federal Credit Union",
            "1 business day (Active Duty military pay)",
            "$0",
            "Free Active Duty Checking; net pay posts 1 day early; courtesy, not guaranteed"
          ],
          [
            "PenFed Credit Union",
            "Up to 2 days",
            "$0",
            "Payroll, tax refunds, govt benefits, military pay, pensions eligible"
          ],
          [
            "Alliant Credit Union (Early Payday)",
            "Up to 2 days",
            "$0",
            "Paychecks and Social Security eligible; automatic; launched Mar 2025"
          ],
          [
            "Consumers Credit Union",
            "Up to 2 days (free, automatic)",
            "$0 standard",
            "Optional paid 'Early Pay': up to 7 days for $10 (<$5k) / $25 (>$5k) per deposit"
          ],
          [
            "Affinity Federal Credit Union (Cash Back Debit)",
            "Up to 2 days",
            "$0 (with eStatements; $2/mo paper-statement fee otherwise)",
            "1% cash back debit (capped $120/yr); early access depends on payer file timing"
          ],
          [
            "State Department FCU (Early Pay)",
            "Up to 2 business days",
            "$0",
            "No enrollment; included with DD; checking & savings; payroll/pension/govt benefits"
          ],
          [
            "Service Credit Union",
            "Up to 2 business days",
            "$0",
            "Based on when payroll file is received from employer (no special SSA timing)"
          ]
        ],
        "sources": "Verified June 2026 against 53.com/.../early-pay (issuer), affinityfcu.com cash-back-debit (issuer), alliantcreditunion.org early-payday (issuer), ally.com/help/bank/early-direct-deposit (issuer)."
      },
      {
        "title": "Banks That Do NOT Offer Early Direct Deposit (June 2026)",
        "columns": [
          "Bank",
          "Early direct deposit?",
          "Notes"
        ],
        "rows": [
          [
            "Bank of America",
            "No",
            "Deposits post on the scheduled pay date; no early-pay feature advertised"
          ],
          [
            "PNC Bank",
            "No",
            "Multiple 2026 sources confirm no early DD on any account, including Virtual Wallet"
          ],
          [
            "U.S. Bank",
            "No",
            "No early-DD feature listed on Smartly Checking; standard pay-date posting"
          ],
          [
            "Truist",
            "No (not officially advertised)",
            "No advertised early-pay feature; occasional 1-day-early datapoints are not guaranteed and sources conflict"
          ]
        ],
        "sources": "Verified June 2026 against financebuzz.com + finder.com + bankbonus.com (explicit), finder.com (explicit) + usbank.com (no early-pay feature listed), finder.com + financebuzz.com, wallethub.com + community reports (conflicting)."
      }
    ],
    "faqs": [
      {
        "q": "How many days early can I actually get paid?",
        "a": "Most banks and credit unions advertise up to 2 days early for paychecks. A few offer more for government benefits — GO2bank and Current advertise up to 4 days early for government benefits, Discover credits federal tax refunds up to 5 days early, and Consumers Credit Union has an optional paid service that can advance funds up to 7 days. Timing is never guaranteed and depends on when your employer or agency submits the payment file, so it varies by pay period — confirm current terms."
      },
      {
        "q": "Is early direct deposit free?",
        "a": "Usually yes — at SoFi, Chime, Capital One 360, Varo, Ally, Discover, Cash App, PenFed, Alliant, Huntington, Fifth Third, Wells Fargo, TD Bank, Citizens and many others the feature itself is free. Exceptions tied to a monthly account fee: GO2bank ($5/mo, waivable with a direct deposit), Chase Secure Banking ($4.95/mo, waivable), Albert (a paid membership product), and Citi Enhanced Direct Deposit accounts (monthly fee waivable by deposit threshold). Confirm current fees with the bank."
      },
      {
        "q": "Which big banks do NOT offer early direct deposit?",
        "a": "As of June 2026, Bank of America, PNC, and U.S. Bank are widely reported to not offer an early-pay feature. Truist does not officially advertise one (occasional 1-day-early reports are not guaranteed and sources conflict). Note that many large banks DO now offer it — including Chase (Secure Banking), Wells Fargo (Early Pay Day), Citi (Enhanced Direct Deposit), TD Bank, Fifth Third, Huntington, and Citizens — so check your specific bank's current policy."
      },
      {
        "q": "Does early direct deposit work for Social Security and government benefits?",
        "a": "Often, yes. Many institutions (Varo, Alliant, PenFed, Fifth Third, TD Bank, SDFCU and others) treat Social Security, pensions, and other government benefits as eligible direct deposits. GO2bank and Current specifically advertise up to 4 days early for government benefits. Some person-to-person transfers (Venmo, etc.), tax refunds, and bank-to-bank transfers may be excluded at certain banks — terms vary, so confirm with your provider."
      },
      {
        "q": "Why didn't my deposit show up early this time?",
        "a": "Early access depends entirely on when your employer or paying agency sends the payment instructions to your bank. If the file arrives late, your deposit will post on the normal scheduled pay date instead. It's a 'best effort' feature at every institution, can vary pay-to-pay, and may take 1-2 pay cycles (up to 90 days at some banks, like Huntington) to take effect after you first set up direct deposit."
      }
    ],
    "sections": [
      {
        "heading": "What early direct deposit actually is",
        "body": "Early direct deposit (also called early pay or early payday) means your bank credits your paycheck, pension, or government benefit as soon as it receives the payment instructions from your employer or paying agency, instead of waiting for the official pay date. Most institutions advertise 'up to 2 days early.' The exact timing is never guaranteed and depends entirely on when the payer submits the ACH file, so it can vary from one pay period to the next. Confirm current terms with your bank before relying on the early date."
      },
      {
        "heading": "Who gets paid the earliest",
        "body": "Standard paychecks: up to 2 days early at most banks and credit unions on this list. Government benefits can post earlier at some institutions: GO2bank and Current both advertise up to 4 days early for government benefits (e.g., Social Security). Discover credits federal tax refunds up to 5 days early. Consumers Credit Union offers an optional paid 'Early Pay' that can advance pending payroll or government payments up to 7 days early for a per-deposit fee ($10 under $5,000; $25 over). Always treat these as maximums, not guarantees."
      },
      {
        "heading": "Watch the fees",
        "body": "Most early-DD features are free, but a few accounts carry a monthly fee unless waived: GO2bank ($5/mo, waived with a qualifying payroll or government-benefit direct deposit) and Chase Secure Banking ($4.95/mo, waived with $250+ in electronic deposits or for account owners age 17-24). Albert's early-pay feature is free, but the Albert membership/Albert Cash product is a paid subscription. Citi's Enhanced Direct Deposit accounts carry a monthly maintenance fee (about $15) that is waived by meeting a deposit threshold (about $250/month). Note that the early-pay feature itself is free at banks like TD, Wells Fargo, Fifth Third, Huntington, Citizens, Ally and Capital One — confirm current fee and waiver terms before opening."
      }
    ]
  }
}
