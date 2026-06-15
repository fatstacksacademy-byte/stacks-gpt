/**
 * State-local bank & credit-union deposit-account bonuses (all states except HI).
 *
 * Sibling of `./hawaiiBankBonuses.ts` — the verified inventory of CHECKING /
 * new-member cash bonuses from LOCAL/REGIONAL institutions (regional banks +
 * state-chartered credit unions) that a nationwide catalog can't surface. Spread
 * into `./bonuses.ts` and normalized by `./catalogTaxonomy.ts` like the
 * nationwide rows, so they flow into the browse page, the per-state directory
 * (/bank-bonuses-by-state/<state>), filters, and tracking.
 *
 * Methodology + provenance: see `./stateBankBonuses.RESEARCH.md`. Every row was
 * verified on the institution's OWN official page on `offer_verified_at` (2026-06-12);
 * aggregators were used for discovery only. Never infer an old offer is live;
 * never invent a requirement ("not stated" → null + noted). Targeted/mailer-only,
 * merchandise, sweepstakes, and rate-special "offers" stay in the report, not here.
 * Hawaii lives in its own module and is intentionally NOT duplicated here.
 *
 * Geography: each row's `state_restricted` lists the postal code(s) where it is
 * genuinely available (a single state, or a regional bank's multi-state footprint),
 * so it buckets as a LOCAL offer for those states and is excluded elsewhere.
 * Sub-state limits (county/employer/association) live verbatim in
 * `eligibility_notes` and structurally in `scope`.
 */

/** Structured sub-state scope (the note carries the human-readable limit). */
export type StateBonusScope =
  | "statewide"
  | "regional"      // a multi-county / multi-state footprint
  | "membership"    // gated by a credit-union field-of-membership / employer / association

export type StateBonusMeta = {
  offer_verified_at: string
  confidence: "official_verified"
  scope: StateBonusScope
  membership_required: boolean
  online_opening: boolean
  recheck_days: number
  institution_type: "bank" | "credit_union"
}

type StateCheckingRow = Record<string, unknown> & StateBonusMeta

const VERIFIED_AT = "2026-06-12"

/** Compact seed → full RawCheckingRow. Only spell out what was verified. */
type Seed = {
  id: string
  bank: string
  amount: number
  states: string[]
  /** required total direct deposit in dollars (omit = no dollar threshold). */
  dd?: number
  /** Minimum number of qualifying direct deposits. */
  ddCount?: number
  /** DD required but the official page states no dollar minimum. */
  ddNoMin?: boolean
  ddWindow?: number
  debit?: number
  open?: number
  holdDays?: number
  mustOpen?: number
  fee?: number
  feeWaiver?: string
  earlyClose?: number
  /** ISO yyyy-mm-dd; omit when the official page states no deadline. */
  exp?: string
  payout?: number
  reqText: string
  notes: string
  excerpt: string
  src: string[]
  scope: StateBonusScope
  membership: boolean
  online: boolean
  recheck: number
  type: "bank" | "credit_union"
  lifetime?: boolean
}

function build(s: Seed): StateCheckingRow {
  const reqText = s.online && !/branch/i.test(s.reqText) ? `${s.reqText} Apply online.` : s.reqText
  return {
    id: s.id,
    bank_name: s.bank,
    product_type: "checking",
    bonus_amount: s.amount,
    cooldown_months: null,
    requirements: {
      direct_deposit_required: s.dd != null || s.ddNoMin === true,
      min_direct_deposit_total: s.dd ?? null,
      min_direct_deposit_per_deposit: null,
      dd_count_required: s.ddCount ?? null,
      deposit_window_days: s.ddWindow ?? null,
      holding_period_days: s.holdDays ?? null,
      min_opening_deposit: s.open ?? null,
      min_balance: null,
      debit_transactions_required: s.debit ?? null,
      billpay_required: null,
      other_requirements_text: reqText,
    },
    fees: {
      monthly_fee: s.fee ?? null,
      monthly_fee_waiver_text: s.feeWaiver ?? "Not stated.",
      early_closure_fee: s.earlyClose ?? 0,
    },
    screening: {
      chex_sensitive: "unknown",
      hard_pull: false,
      soft_pull: null,
      screening_notes: "ChexSystems / credit-pull policy not officially stated.",
    },
    eligibility: {
      state_restricted: true,
      states_allowed: s.states,
      states_excluded: [],
      lifetime_language: s.lifetime ?? false,
      eligibility_notes: s.notes,
    },
    timeline: { bonus_posting_days_est: s.payout ?? null, must_remain_open_days: s.mustOpen ?? null },
    ...(s.exp ? { expiration_date: s.exp } : {}),
    source_links: s.src,
    raw_excerpt: s.excerpt,
    offer_verified_at: VERIFIED_AT,
    confidence: "official_verified",
    scope: s.scope,
    membership_required: s.membership,
    online_opening: s.online,
    recheck_days: s.recheck,
    institution_type: s.type,
  }
}

const SEEDS: Seed[] = [
  // ── CALIFORNIA ──────────────────────────────────────────────────────
  {
    id: "provident-cu-475-checking-2026", bank: "Provident Credit Union", amount: 475, states: ["CA"],
    dd: 2000, debit: 400, open: 25, payout: 120, scope: "regional", membership: true, online: true, recheck: 14, type: "credit_union", exp: "2026-06-30", lifetime: true,
    reqText: "Open a personal checking account (promo code JOIN475), fund within 60 days, then for 2 consecutive months receive monthly direct deposits/automatic credits totaling $2,000+ AND make $400+ in card purchases; enroll in online banking + e-Documents.",
    feeWaiver: "No monthly fee on eligible checking accounts.",
    notes: "Membership: CA residents in Alameda, Contra Costa, El Dorado, Placer, Sacramento, San Mateo, Santa Clara, or San Francisco counties; 18+. New members only; one per individual and one per household/address. Bonus paid within 120 days of opening.",
    excerpt: "Monthly direct deposits or automatic credits of at least $2,000 ... Promo Code JOIN475 ... Expiration June 30, 2026 ... within 120 days of account opening.",
    src: ["https://providentcu.org/products/checking-accounts/checking-bonus"],
  },
  {
    id: "first-tech-fcu-500-checking-2026", bank: "First Tech Federal Credit Union", amount: 500, states: ["CA", "OR", "WA"],
    open: 0, holdDays: 90, scope: "membership", membership: true, online: true, recheck: 30, type: "credit_union", lifetime: true,
    reqText: "Open First Tech Rewards Checking and bring in new money from outside First Tech within 30 days: $1,500 = $100, $5,000 = $250, $15,000 = $500. No direct deposit required. Funds must remain 90 consecutive days.",
    feeWaiver: "No monthly fee.",
    notes: "Membership open to anyone via a partner association (e.g. Financial Fitness Association), plus tech employers and family. New members only (not a primary owner of a Membership Savings in the prior 18 months); 18+. Tiered by new-money amount; no direct deposit required. 'Valid as of January 1, 2026, subject to change' (no fixed deadline).",
    excerpt: "$1,500 within 30 days ... $100 bonus ... $15,000 ... $500 bonus ... funds must remain ... 90 consecutive days ... valid as of January 1, 2026.",
    src: ["https://www.firsttechfed.com/pages/depp/deposit-bonus"],
  },
  {
    id: "patelco-cu-50-referral-2026", bank: "Patelco Credit Union", amount: 50, states: ["CA"],
    open: 100, payout: 5, scope: "membership", membership: true, online: true, recheck: 30, type: "credit_union", exp: "2026-07-31",
    reqText: "New member opens a checking account ($100 min deposit) via referral. No direct deposit required. $50 to the new member (and $50 to the referrer); an added $50 for opening a money market afterward.",
    feeWaiver: "No monthly fee on eligible checking.",
    notes: "Membership open to anyone via the Financial Fitness Association (Patelco pays first-year dues), plus ~16 Northern CA counties, UC Berkeley/SFSU/CSU East Bay alumni, and family. Bonus credited to savings within 5 business days after the checking requirements are met.",
    excerpt: "$50 bonus will be credited to both of your savings accounts within five business days ... offer ends July 31, 2026.",
    src: ["https://www.patelco.org/refer"],
  },
  // ── OREGON / WASHINGTON / IDAHO / NEVADA ────────────────────────────
  {
    id: "banner-bank-500-checking-2026", bank: "Banner Bank", amount: 500, states: ["OR", "WA", "CA", "ID"],
    dd: 5000, ddWindow: 60, open: 50, holdDays: 90, payout: 30, scope: "regional", membership: false, online: true, recheck: 14, type: "bank", exp: "2026-06-30", lifetime: true,
    reqText: "Open a personal checking account (promo code 2026DP) and receive direct deposits of your paycheck/pension/government benefits: $2,500 in 60 days = $250, or $5,000 in 60 days = $500; maintain the matching balance for 90 days. A savings bonus can stack up to $1,000 total.",
    feeWaiver: "Varies by account; Digital Account has no monthly fee.",
    notes: "Available to residents of OR, WA, CA, and ID only. Payroll/pension/government direct deposit required (P2P and mobile check deposits excluded). One personal-checking opening bonus per 2 years; ineligible if you closed an account in the last 2 years. Bonus paid within 30 days after the 90-day requirement.",
    excerpt: "$250 bonus ... $2,500 of direct deposits within 60 days ... residents of OR, WA, CA and ID only ... Expiration Date 6/30/2026.",
    src: ["https://www.bannerbank.com/new-account-offers/personal-account-offers/personal-checking-account-bonus"],
  },
  {
    id: "gesa-cu-250-checking-2026", bank: "Gesa Credit Union", amount: 250, states: ["WA", "OR", "ID"],
    dd: 500, ddWindow: 75, open: 25, payout: 60, scope: "membership", membership: true, online: true, recheck: 30, type: "credit_union", lifetime: true,
    reqText: "Open a personal checking account (promo code SMARTS), receive 2 recurring direct deposits of $250+ from an employer/government within 75 days, and enroll in eStatements within 60 days. A member savings account is required.",
    feeWaiver: "No monthly fee on eligible checking.",
    notes: "Serves WA, OR, and ID. 18+; must not have had a Gesa checking account in the last 24 months. Bonus to savings within 60 days of completing requirements. 'For a limited time' — no fixed end date stated.",
    excerpt: "$250 cash incentive ... two recurring direct deposits of $250 or more ... within 75 days ... promo code SMARTS ... no Gesa checking account within the last 24 months.",
    src: ["https://www.gesa.com/promotions/checking/"],
  },
  {
    id: "becu-150-new-member-2026", bank: "BECU", amount: 150, states: ["WA"],
    debit: 10, payout: 120, mustOpen: 90, scope: "membership", membership: true, online: true, recheck: 30, type: "credit_union", exp: "2026-12-31",
    reqText: "Open checking + savings together (promo code WPNEW2026) and complete 10+ qualifying actions (debit/credit purchases, checks, deposits, withdrawals) within the first 30 days. No direct deposit required.",
    feeWaiver: "No monthly fee.",
    notes: "Membership: live/work/attend school in Washington (plus select OR/ID/SC counties or a BECU partner like Boeing). 18+; ineligible if a BECU member in the last 6 months. Bonus to savings within 120 days; accounts must stay open 90+ days.",
    excerpt: "10 or more qualifying actions within the first 30 days ... $150 ... Offer valid until Dec. 31, 2026.",
    src: ["https://www.becu.org/partners/passport"],
  },
  {
    id: "onpoint-cu-50-referral-2026", bank: "OnPoint Community Credit Union", amount: 50, states: ["OR", "WA"],
    dd: 100, ddWindow: 60, payout: 60, scope: "membership", membership: true, online: true, recheck: 60, type: "credit_union",
    reqText: "New member opens a Member Savings + personal checking via referral and receives a direct deposit of $100+ within 60 days. $50 to the new member (and $50 to the referrer).",
    feeWaiver: "No monthly fee on eligible checking.",
    notes: "Serves Oregon and SW Washington. Accounts must be open and in good standing at payout (~60 days). No fixed deadline stated.",
    excerpt: "$50 for you. $50 for your friend ... direct deposit of at least $100 to the account within 60 days.",
    src: ["https://www.onpointcu.com/rates-rewards/refer-a-friend/"],
  },
  {
    id: "greater-nevada-cu-150-checking-2026", bank: "Greater Nevada Credit Union", amount: 150, states: ["NV"],
    ddNoMin: true, ddWindow: 90, payout: 30, scope: "membership", membership: true, online: true, recheck: 60, type: "credit_union",
    reqText: "Open a personal checking account (Student Cash Back Checking excluded), have one direct deposit post and clear within 90 days, and enroll in Digital Banking + eStatements within 90 days.",
    feeWaiver: "No monthly fee on eligible checking.",
    notes: "Membership: work or live in Nevada (or immediate family who does). Direct-deposit requirement waived for students of UNR / Western Nevada College / Great Basin College. Bonus within 30 days after the 90-day period. No fixed deadline stated.",
    excerpt: "$150 bonus deposit ... one direct deposit must post and clear ... eStatements within 90 days.",
    src: ["https://livegreater.gncu.org/checking-promo/"],
  },
  {
    id: "clark-county-cu-100-checking-2026", bank: "Clark County Credit Union", amount: 100, states: ["NV"],
    dd: 500, ddWindow: 60, debit: 6, open: 5, payout: 60, scope: "membership", membership: true, online: true, recheck: 60, type: "credit_union", lifetime: true,
    reqText: "Open a personal checking account (promo code BONUS): $50 for a direct deposit totaling $500+ within 60 days, plus $50 for 6 debit-card transactions (ATM/digital-wallet excluded).",
    feeWaiver: "No monthly fee on eligible checking.",
    notes: "Membership: live/work in Clark County CU's Nevada field of membership; $5 to open membership. No CCCU checking now or in the last 12 months; one offer per household. Bonus within 60 days. No fixed deadline stated.",
    excerpt: "$50 when you set up direct deposit totaling $500 or more ... $50 when you make 6 debit card transactions ... one offer per household.",
    src: ["https://www.cccu.com/offer/promo"],
  },
  // ── COLORADO ────────────────────────────────────────────────────────
  {
    id: "bellco-cu-300-checking-2026", bank: "Bellco Credit Union", amount: 300, states: ["CO"],
    dd: 500, ddCount: 1, ddWindow: 60, payout: 90, mustOpen: 365, scope: "membership", membership: true, online: true, recheck: 14, type: "credit_union", exp: "2026-08-31", lifetime: true,
    reqText: "Open a Bellco checking account during the offer period and receive at least one single qualifying direct deposit of $500+ within 60 days (recurring payroll, pension, Social Security, or government benefits; deposits cannot be combined).",
    feeWaiver: "Free Checking has no monthly fee.",
    notes: "Membership: Colorado field of membership. New checking customers only ('you don't have an active checking account with Bellco'); one bonus per household. Must keep the account open and in good standing 1 year — Bellco may reclaim the bonus if closed sooner. Bonus within 90 days of the qualifying deposit.",
    excerpt: "$300 bonus ... offer period (June 1, 2026, through August 31, 2026) ... at least one qualifying direct deposit of $500 or more.",
    src: ["https://bellco.org/switch"],
  },
  {
    id: "ent-cu-200-checking-2026", bank: "Ent Credit Union", amount: 200, states: ["CO"],
    open: 5, debit: 1, payout: 2, scope: "membership", membership: true, online: true, recheck: 30, type: "credit_union", exp: "2026-12-31", lifetime: true,
    reqText: "Open No Strings Checking (promo code ROCKON) with $5 in Ent Savings, deposit $100, and activate the Visa debit card within 30 days. No direct deposit required.",
    feeWaiver: "No Strings Checking has no monthly fee.",
    notes: "Membership: Colorado field of membership. One per primary owner 18+; must not have a pre-existing Ent checking account or have received a prior Ent checking reward. $200 paid into the primary Ent Savings account ~2 business days after qualifying.",
    excerpt: "Reward is limited to one (1) unique primary owner ... a deposit of $200 into your primary Ent Savings Account.",
    src: ["https://www.ent.com/personal/accounts/checking/"],
  },
  // ── ARIZONA ─────────────────────────────────────────────────────────
  {
    id: "desert-financial-cu-200-checking-2026", bank: "Desert Financial Credit Union", amount: 200, states: ["AZ"],
    dd: 1000, ddWindow: 60, open: 25, scope: "membership", membership: true, online: true, recheck: 30, type: "credit_union", lifetime: true,
    reqText: "Open Free Checking + Membership Savings, receive a single direct deposit of $1,000+ within 60 days, and enroll in eStatements.",
    feeWaiver: "Free Checking has no monthly fee.",
    notes: "Membership: Arizona field of membership ($25 min in Membership Savings). New DFCU members only; existing/joint owners and anyone who closed a membership in the past 12 months are ineligible. Bonus paid the month after the qualifying period. No fixed deadline stated.",
    excerpt: "Open a Free Checking account and a Membership Savings account ... single direct deposit of at least $1,000 ... only to new DFCU members.",
    src: ["https://www.desertfinancial.com/200"],
  },
  {
    id: "arizona-financial-cu-300-checking-2026", bank: "Arizona Financial Credit Union", amount: 300, states: ["AZ"],
    dd: 1000, open: 20, payout: 75, mustOpen: 180, scope: "membership", membership: true, online: true, recheck: 30, type: "credit_union", lifetime: true,
    reqText: "Open Free Checking ($20): $200 for recurring direct deposits totaling $1,000+/month plus a $500 balance on day 60; lower tiers $150 ($500/mo DD, or $250/mo DD + 15 debit) and $100 (15 debit transactions).",
    feeWaiver: "Free Checking has no monthly fee.",
    notes: "Membership: Arizona field of membership. Brand-new member with no existing primary relationship; one new-member bonus per person. Direct deposit = paycheck/investment/pension/government (Zelle/Venmo/PayPal excluded). Bonus deducted if the account is closed within 6 months. Bonus ~75 days after opening. 'May expire at any time.'",
    excerpt: "$200 ... recurring direct deposit(s) with a combined total of $1,000 or more per month ... balance of $500 or more on the 60th day ... Limit one new member bonus per person.",
    src: ["https://www.arizonafinancial.org/free"],
  },
  {
    id: "vantage-west-cu-100-checking-2026", bank: "Vantage West Credit Union", amount: 100, states: ["AZ"],
    dd: 750, ddWindow: 30, debit: 1, open: 20, payout: 7, mustOpen: 180, scope: "membership", membership: true, online: true, recheck: 60, type: "credit_union", lifetime: true,
    reqText: "Open Essential Checking ($20), deposit $750 within 30 days, and make 1 debit-card transaction within 60 days (submit the Refer-a-Friend form within 60 days).",
    feeWaiver: "Essential Checking has no monthly fee.",
    notes: "Membership: Arizona field of membership. New member who has not been a primary member in the last 6 months. Account must stay open 6 months (bonus may be debited if closed sooner). No fixed deadline stated.",
    excerpt: "new member who has not been a primary member in the last six (6) months ... deposit $750.00 within thirty (30) days ... one debit card transaction within sixty (60) days.",
    src: ["https://vantagewest.org/celebrate-with-vantage-west-fall"],
  },
  // ── UTAH (+ AF multi-state) / NEW MEXICO ────────────────────────────
  {
    id: "america-first-cu-350-checking-2026", bank: "America First Credit Union", amount: 350, states: ["UT", "AZ", "NV", "ID", "NM", "OR"],
    dd: 1000, ddWindow: 60, payout: 60, mustOpen: 365, scope: "membership", membership: true, online: true, recheck: 30, type: "credit_union", lifetime: true,
    reqText: "Open a savings + checking account ($150), then receive $1,000+ in direct deposits within 60 days ($200). Direct deposit excludes bank-to-bank, P2P, wire, and internal transfers.",
    feeWaiver: "No monthly fee on eligible checking.",
    notes: "Membership: UT/AZ/NV/ID/NM/OR field of membership. Primary owners of an America First account opened within the last 12 months are ineligible; employees/business/secondary accounts excluded. Forfeit the bonus if accounts close or transfer within 12 months. Bonus within 60 days.",
    excerpt: "$150 when you open a savings account and add checking ... additional $200 when you receive at least $1,000 in direct deposits within 60 days ... forfeit bonuses if accounts are closed ... within 12 months.",
    src: ["https://www.americafirst.com/specials/2026-350-offer.html"],
  },
  {
    id: "canyon-view-cu-150-checking-2026", bank: "Canyon View Credit Union", amount: 150, states: ["UT"],
    ddNoMin: true, open: 10, scope: "membership", membership: true, online: true, recheck: 60, type: "credit_union",
    reqText: "Open a checking account ($10) and set up a new direct deposit.",
    feeWaiver: "No monthly fee on eligible checking.",
    notes: "Membership: Utah field of membership (formerly UFirst/University FCU). The prior $400 promo has expired; the current page offers $150 with a new direct deposit. Exact DD amount/deadline not stated on the official page.",
    excerpt: "This offer has expired, but you can still get $150 with a new direct deposit!",
    src: ["https://www.canyonviewcu.com/services-benefits/400-new-member-promo.html"],
  ,
    expired: true,
  },
  {
    id: "sunward-slfcu-200-checking-2026", bank: "Sunward Credit Union", amount: 200, states: ["NM"],
    dd: 100, ddWindow: 60, open: 1, payout: 40, scope: "membership", membership: true, online: true, recheck: 60, type: "credit_union", lifetime: true,
    reqText: "Open a Quick Cash or Money Manager Checking account and establish recurring ACH direct deposits of $100+ (payroll, pension, or government benefits) within the first 60 days of membership.",
    feeWaiver: "No monthly fee on eligible checking.",
    notes: "Membership: New Mexico field of membership (Sandia Laboratory FCU, rebranding to Sunward). Must not have been a member within the past 180 days; 18+. $200 added to the primary savings account within 40 days. No fixed deadline stated.",
    excerpt: "open a Quick Cash or Money Manager Checking account, and establish recurring ACH direct deposits of at least $100 ... within the first 60 days ... the $200 will be added to the member's primary savings account.",
    src: ["https://gosunward.org/newmember"],
  },
  // ── OKLAHOMA ────────────────────────────────────────────────────────
  {
    id: "weokie-fcu-200-checking-2026", bank: "WEOKIE Federal Credit Union", amount: 200, states: ["OK"],
    debit: 20, open: 20, fee: 6.95, scope: "membership", membership: true, online: true, recheck: 14, type: "credit_union", exp: "2026-07-31", lifetime: true,
    reqText: "Open an Ultimate with BaZing Checking account ($20) and make 20 debit-card purchases within 45 days. No direct deposit required.",
    feeWaiver: "$6.95/month (waiver not stated).",
    notes: "Membership: WEOKIE field of membership (Oklahoma). New members only. Holding period / payout timing not stated.",
    excerpt: "Open an Ultimate with BaZing Checking account by July 31, 2026 ... $200 cash bonus.",
    src: ["https://www.weokie.org/accounts/checking/welcome-offer"],
  },
  {
    id: "truity-cu-100-checking-2026", bank: "Truity Credit Union", amount: 100, states: ["OK"],
    open: 0, scope: "membership", membership: true, online: true, recheck: 30, type: "credit_union", exp: "2026-08-31", lifetime: true,
    reqText: "Open a new Truity checking account (Essential/High Yield/Preferred), promo code 100NEWCK26.",
    feeWaiver: "Essential Checking has no monthly fee.",
    notes: "Membership: Truity field of membership (Oklahoma/Kansas). New accounts only ('if you already have a Truity checking account you do not qualify'). 1099-INT if $10+.",
    excerpt: "$100 bonus is for new accounts only ... offer ends 08.31.26.",
    src: ["https://www.truitycu.org/en/summerchecking"],
  },
  {
    id: "bok-financial-300-student-checking-2026", bank: "Bank of Oklahoma", amount: 300, states: ["OK"],
    debit: 10, open: 50, payout: 30, scope: "statewide", membership: false, online: true, recheck: 14, type: "bank", exp: "2026-06-30", lifetime: true,
    reqText: "Open a College Access Checking account ($50) with proof of college enrollment, then make $200+ in deposits and 10 debit-card transactions within 90 days. Direct deposit not specifically required.",
    feeWaiver: "$0 with eStatements ($3 paper).",
    notes: "College students only (proof of enrollment). New customer = not a primary accountholder on an existing/closed-within-180-days checking; one per account. Evaluated at 90 days, paid within 30 days. (Bank of Oklahoma is BOK Financial — also operates in TX/AZ/CO/KS/MO/NM/AR.)",
    excerpt: "The offer is $300 for an Access Checking account ... Offer ends on 6/30/2026.",
    src: ["https://www.bankofoklahoma.com/personal/products-and-services/personal-banking/checking-accounts/college-access-checking"],
  },
  // ── TEXAS / LOUISIANA / MISSOURI ────────────────────────────────────
  {
    id: "aplus-fcu-50-checking-2026", bank: "A+ Federal Credit Union", amount: 50, states: ["TX"],
    dd: 800, ddWindow: 60, open: 2, mustOpen: 180, scope: "membership", membership: true, online: true, recheck: 30, type: "credit_union", exp: "2026-12-31", lifetime: true,
    reqText: "Open Cash-Back Checking (promo code 2026OFFER50): $25 at opening + $25 with your first payroll direct deposit of $800+ (within 30 consecutive days, posting within 60 days).",
    feeWaiver: "No monthly fee.",
    notes: "Membership: A+ FCU open field of membership (US SSN/ITIN). Not for existing/previous members; one per household. Payroll direct deposit explicitly required for the second $25. Funds forfeited if the account closes within 180 days. (Employer-group code 2026SEG100 = up to $100.)",
    excerpt: "Get $50 When You Join A+FCU ... Expires 12.31.2026.",
    src: ["https://aplusfcu.org/lp/com50"],
  },
  {
    id: "hancock-whitney-600-checking-savings-2026", bank: "Hancock Whitney", amount: 600, states: ["LA", "MS", "AL", "FL", "TX"],
    dd: 3000, ddWindow: 90, open: 25, fee: 10, payout: 135, mustOpen: 180, scope: "regional", membership: false, online: true, recheck: 14, type: "bank", exp: "2026-06-30", lifetime: true,
    reqText: "Open Freestyle Checking ($25): $300 for $3,000+ in direct deposits within 90 days; +$100 for opening Freestyle Savings and depositing $5,000 (maintain $5,000 daily for 60 days); +$200 for opening both simultaneously and meeting all requirements.",
    feeWaiver: "Checking $10/month waived with 1 client transaction per cycle (or age <18 / 64+).",
    notes: "Hancock Whitney's Gulf South footprint (LA, MS, AL, FL, TX). New-to-bank or existing-without-checking (none closed within 90 days, none closed negative in 3 years). One checking + one savings bonus per household per 2 years (lifetime max 2+2). $20 closing fee + bonus may be reclaimed if closed within 180 days. Paid within 135 days. A matching promo code/email is required.",
    excerpt: "$300 bonus when you open a Freestyle Checking ... offer expiration date of 6/30/2026.",
    src: ["https://www.hancockwhitney.com/freestyle-checking"],
  },
  {
    id: "campus-federal-225-checking-2026", bank: "Campus Federal Credit Union", amount: 225, states: ["LA"],
    dd: 500, ddWindow: 90, fee: 10, payout: 35, mustOpen: 120, scope: "membership", membership: true, online: true, recheck: 60, type: "credit_union", lifetime: true,
    reqText: "Open Lagniappe Lite Checking (promo code CFCU4YOU at referlive.com) and receive 2 direct deposits of $500+ each within 90 days (salary/pension/government via ACH). Account open and in good standing 120 days.",
    feeWaiver: "$10/month if requirements unmet; waived with a $2,500 relationship balance.",
    notes: "Membership: Campus Federal field of membership (Louisiana). New members only. Paid as a $225 Mastercard Reward Card, 4–6 weeks after completion. No fixed deadline stated.",
    excerpt: "enter promo code CFCU4YOU to receive a $225 Mastercard Reward Card.",
    src: ["https://www.campusfederal.org/cfcu4you"],
  },
  {
    id: "la-capitol-fcu-100-checking-2026", bank: "La Capitol Federal Credit Union", amount: 100, states: ["LA"],
    ddNoMin: true, open: 50, mustOpen: 180, scope: "membership", membership: true, online: true, recheck: 60, type: "credit_union",
    reqText: "Open Choice or Simple Checking (promo code SEG100, $50), set up a direct deposit, and enroll in online banking. Account active and in good standing 180 days.",
    feeWaiver: "$8 low-balance fee (waivable); $2 paper-statement fee waived with eStatements.",
    notes: "RESTRICTED membership: only employees of La Capitol FCU Select Employer Groups and members of Louisiana REALTORS. Paid after 180 days. 'For a limited time' — no fixed deadline stated.",
    excerpt: "$100 ... only available to employees of La Capitol FCU Select Employer Groups and members of Louisiana REALTORS.",
    src: ["https://go.lacapfcu.org/seg-100"],
  },
  {
    id: "communityamerica-cu-400-checking-2026", bank: "CommunityAmerica Credit Union", amount: 400, states: ["MO", "KS", "IL"],
    dd: 10000, ddWindow: 90, payout: 30, scope: "regional", membership: true, online: true, recheck: 14, type: "credit_union", exp: "2026-07-31", lifetime: true,
    reqText: "Open Cashback Free or Chiefs Checking (promo code SPRING26): 2+ direct deposits totaling $2,000+ ($150), $5,000+ ($250), or $10,000+ ($400), plus eStatements, within 90 days. Zelle/P2P excluded.",
    feeWaiver: "No monthly fee, no minimum balance.",
    notes: "Membership: reside in the Kansas City (MO-KS) or St. Louis (MO-IL) markets and meet CommunityAmerica's field of membership. No CommunityAmerica personal checking in the past 12 months. Window 3/23/2026–7/31/2026. Bonus within 30 days after the deposit period.",
    excerpt: "open a new Cashback Free Checking or Chiefs Checking account between 3/23/2026 – 7/31/2026 and enter promo code SPRING26.",
    src: ["https://www.communityamerica.com/personal/bank/accounts/checking/kc-checking-promo"],
  },
  {
    id: "together-cu-300-checking-2026", bank: "Together Credit Union", amount: 300, states: ["MO", "IL"],
    dd: 500, ddWindow: 60, debit: 5, payout: 60, scope: "membership", membership: true, online: true, recheck: 30, type: "credit_union", exp: "2026-06-30", lifetime: true,
    reqText: "Open a consumer checking account: $50 at opening + $250 after 60 days for 1+ ACH/direct deposit of $500+, 5 Visa debit POS transactions, and eStatements (all within 60 days).",
    feeWaiver: "No monthly fee on eligible checking.",
    notes: "Membership: live/work in served communities, employer partners, or family of a member (St. Louis metro, MO-IL). Window 6/1/2026–6/30/2026.",
    excerpt: "Referred member will receive a $50 bonus at the time of account opening. Additional $250 bonus ... Incentive offer valid June 1, 2026 – June 30, 2026.",
    src: ["https://www.togethercu.org/member-referral"],
  },
  // ── MINNESOTA / WISCONSIN / IOWA / NORTH DAKOTA ─────────────────────
  {
    id: "wings-cu-500-checking-2026", bank: "Wings Credit Union", amount: 500, states: ["MN", "WI", "FL", "GA", "MI"],
    dd: 5000, ddWindow: 60, debit: 10, open: 5, scope: "membership", membership: true, online: true, recheck: 14, type: "credit_union", exp: "2026-06-30", lifetime: true,
    reqText: "Open Share Savings ($5) + checking together online (promo code WINGS26) and within 60 days set up recurring payroll direct deposit ($3,000 = $300, $4,000 = $400, $5,000 = $500), make 10+ debit/credit purchases of $5+, and enroll in online banking + eDocuments. Fund within 21 business days.",
    feeWaiver: "No monthly fee on eligible checking.",
    notes: "Membership: live in a Wings service-area county in FL, GA, MI, MN, or WI. New members only (not a member in the last 12 months, no prior new-account bonus); one per person. Qualified recurring payroll direct deposit required. Bonus paid the week of 9/7/2026. Open by 6/30/2026.",
    excerpt: "Accounts must be opened between 5/1/26-6/30/26 ... funded within 21 business days ... bonus paid the week of 9/7/26.",
    src: ["https://www.wingscu.com/wings26"],
  },
  {
    id: "topline-cu-300-checking-2026", bank: "TopLine Financial Credit Union", amount: 300, states: ["MN"],
    dd: 1000, open: 50, payout: 28, mustOpen: 180, scope: "membership", membership: true, online: true, recheck: 30, type: "credit_union", exp: "2026-12-31", lifetime: true,
    reqText: "Open Totally Free Checking ($50), set up a $1,000 direct deposit for 3 consecutive months, and enroll in eStatements. Account must remain open 6 months.",
    feeWaiver: "Totally Free Checking has no monthly fee.",
    notes: "Membership: TopLine field of membership (Twin Cities metro, MN). No TopLine checking relationship in the last 12 months. Direct deposit = payroll/pension/SS/regular income (transfers/P2P/mobile/ATM excluded). Bonus ~4 weeks after completion, into savings. Valid through 12/31/2026.",
    excerpt: "set up and make a $1,000 direct deposit for 3 consecutive months ... valid through 12/31/26.",
    src: ["https://www.toplinecu.com/promotions"],
  },
  {
    id: "bell-bank-100-checking-2026", bank: "Bell Bank", amount: 100, states: ["MN", "ND", "AZ"],
    dd: 1500, debit: 10, mustOpen: 60, payout: 5, scope: "regional", membership: false, online: true, recheck: 30, type: "bank", exp: "2026-12-31", lifetime: true,
    reqText: "Open a first-time personal checking account; after 60 days open with 2+ recurring direct deposits totaling $1,500+ AND either 10 debit transactions or a recurring automatic payment. A current promo code is required.",
    feeWaiver: "Not stated.",
    notes: "Bell Bank operates in MN, ND, and AZ. First-time personal checking only; one bonus per household and per account; Bell employees excluded. A current promo code is required (e.g. partner codes). Paid within 5 business days after qualifying. Expires 12/31/2026.",
    excerpt: "$100 after your new first-time personal checking account has been opened for 60 days with two or more recurring direct deposits totaling at least $1,500 ... expires December 31, 2026.",
    src: ["https://bell.bank/banking/checking"],
  },
  {
    id: "royal-cu-400-checking-2026", bank: "Royal Credit Union", amount: 400, states: ["WI", "MN"],
    dd: 800, ddWindow: 120, payout: 10, mustOpen: 180, scope: "membership", membership: true, online: true, recheck: 7, type: "credit_union", exp: "2026-06-12", lifetime: true,
    reqText: "Open a new checking account and receive 2 qualifying payroll direct deposits of $400+ each within 120 days. Bonus paid to a Primary Base Savings account.",
    feeWaiver: "No monthly fee on eligible checking.",
    notes: "Membership: Royal CU field of membership (WI/MN). Open window 5/4/2026–6/12/2026 (closes today). Ineligible if you had a Royal checking account in the last 12 months; one per member. Account must stay open 6 months. Paid within 10 days of the 2nd deposit.",
    excerpt: "Open a new checking account by June 12 ... receive two payroll direct deposits of $400 or more, and we'll put $400 in your savings account.",
    src: ["https://www.rcu.org/promos/checking/spring-2026-incentive-checking"],
  ,
    expired: true,
  },
  {
    id: "associated-bank-600-checking-2026", bank: "Associated Bank", amount: 600, states: ["WI", "IL", "MN"],
    dd: 500, ddWindow: 90, open: 100, payout: 120, mustOpen: 365, scope: "regional", membership: false, online: true, recheck: 14, type: "bank", exp: "2026-06-30", lifetime: true,
    reqText: "Open a personal checking account, receive recurring direct deposits totaling $500+ within 90 days, and maintain an average daily balance days 31–90: $1,000–$4,999 = $300, $5,000–$9,999 = $400, $10,000+ = $600.",
    feeWaiver: "Not stated.",
    notes: "Associated Bank footprint (WI, IL, MN). New personal Associated checking. Direct deposit from employer/government (P2P and transfers excluded). Account must stay open 12+ months or the bonus may be deducted. Opened and funded through 6/30/2026; paid within 120 days.",
    excerpt: "new personal Associated Bank checking account opened and funded through June 30, 2026 ... $10,000 and over [earns] $600 ... must remain open for a minimum of 12 months.",
    src: ["https://www.associatedbank.com/checking-account-bonus-offer-promotion"],
  },
  {
    id: "summit-cu-200-checking-2026", bank: "Summit Credit Union", amount: 200, states: ["WI"],
    debit: 20, payout: 90, scope: "membership", membership: true, online: true, recheck: 30, type: "credit_union", lifetime: true,
    reqText: "Open a new Summit checking account with a debit card and make 20+ qualifying debit-card purchases (excluding ATM) within 60 days. No direct deposit required.",
    feeWaiver: "No monthly fee on eligible checking.",
    notes: "Membership: Summit CU field of membership (Madison/Milwaukee/Green Bay, WI). First Summit checking only; ineligible if you/any signer have an existing Summit consumer checking, closed one in the past 24 months, or were paid a Summit premium in 24 months. Bonus within 90 days. Valid from 3/2/2026, no fixed end date.",
    excerpt: "make at least 20 qualifying debit card purchases ... within 60 days ... $200 bonus ... valid starting March 2, 2026.",
    src: ["https://www.summitcreditunion.com/bank/checking-account/"],
  },
  {
    id: "dupaco-cu-300-checking-2026", bank: "Dupaco Community Credit Union", amount: 300, states: ["IA", "IL", "WI"],
    ddWindow: 90, payout: 4, scope: "membership", membership: true, online: true, recheck: 30, type: "credit_union", lifetime: true,
    reqText: "Open a consumer checking account (promo code CHECK300) and within 90 days bring in deposits totaling $500+ and meet the 'Active Checking' definition (set up direct deposit + 5 transactions, OR without DD: 10 checks / 8 debit / 5 ACH-debit / 3 bill-pay).",
    feeWaiver: "No monthly fee on eligible checking.",
    notes: "Membership: live/work in Dupaco's chartered area (eastern Iowa counties + Stephenson Co. IL + parts of WI). Excludes existing checking and anyone who closed a consumer checking within 180 days. $300 to checking 3–5 business days after qualifying. No fixed deadline stated.",
    excerpt: "open a new consumer share draft checking account with promo code ... acceptable deposits totaling $500 or more ... within 90 days ... $300 cash payout.",
    src: ["https://www.dupaco.com/personal/checking-accounts"],
  },
  {
    id: "bankers-trust-400-checking-2026", bank: "Bankers Trust", amount: 400, states: ["IA", "NE", "AZ"],
    dd: 400, ddWindow: 60, debit: 25, open: 25, payout: 75, mustOpen: 365, earlyClose: 400, scope: "regional", membership: false, online: false, recheck: 14, type: "bank", exp: "2026-06-30", lifetime: true,
    reqText: "Open a primary checking account in person at a branch ($25). Within 60 days complete 25 debit transactions AND 2 direct (ACH) and/or mobile deposits of $200+ each.",
    feeWaiver: "Not stated.",
    notes: "Bankers Trust markets (IA, NE, AZ). Branch opening required. Not for existing BT checking customers or anyone with a BT checking in the last 6 months; one bonus per household. $400 early-closing fee if closed within 12 months. Paid within 75 days. (A $250 market-specific variant exists.) Open by 6/30/2026.",
    excerpt: "Open a primary checking account by June 30, 2026 ... 25 debit transactions ... 2 direct (ACH) and/or Mobile deposits of at least $200 each ... within 60 days.",
    src: ["https://www.bankerstrust.com/400-offer/"],
  },
  {
    id: "first-community-cu-nd-100-checking-2026", bank: "First Community Credit Union (ND)", amount: 100, states: ["ND"],
    dd: 500, payout: 60, scope: "membership", membership: true, online: true, recheck: 60, type: "credit_union", lifetime: true,
    reqText: "Open a new personal checking account, maintain a minimum direct deposit totaling $500/month, and enroll in eStatements. $100 paid 60 days after opening.",
    feeWaiver: "No monthly fee on eligible checking.",
    notes: "Membership: new FCCU members 18+ who live within set mile radii of FCCU cities in North Dakota (Bismarck, Fargo, Grand Forks, Jamestown, etc.) or immediate family. No fixed deadline stated.",
    excerpt: "After 60 days from account opening, eligible new checking accountholders will receive $100 ... minimum direct deposit totaling $500 per month and enrollment in E-statements.",
    src: ["https://www.myfccu.com/checking-savings/personal-checking/all-accounts.html"],
  },

  // ── CAROLINAS / MID-ATLANTIC ────────────────────────────────────────
  {
    id: "south-state-bank-200-checking-2026", bank: "South State Bank", amount: 200, states: ["SC", "NC", "VA"],
    dd: 250, ddWindow: 60, debit: 15, open: 0, scope: "regional", membership: false, online: true, recheck: 30, type: "bank", lifetime: true,
    reqText: "Open a SouthState checking account (promo code EARN200) and within 60 days make 15 debit-card purchases/payments AND either receive $250 in qualifying direct deposits OR set up preauthorized automatic draft(s) of $25.",
    notes: "SouthState footprint (SC, NC, VA among others). New personal checking customers; not available if any owner previously received a SouthState personal-checking bonus. No fixed deadline stated.",
    excerpt: "open a SouthState checking account using promo code EARN200 ... 15 debit card purchases/payments ... $250 qualifying direct deposit OR preauthorized automatic draft(s) of $25.",
    src: ["https://www.southstatebank.com/personal/bank/earn200-promo"],
  },
  {
    id: "secu-md-350-checking-2026", bank: "SECU Maryland", amount: 350, states: ["MD", "DC", "DE", "VA", "WV", "PA"],
    ddNoMin: true, ddWindow: 90, payout: 60, scope: "regional", membership: true, online: true, recheck: 14, type: "credit_union", exp: "2026-06-30", lifetime: true,
    reqText: "Open a SECU Total Checking & Rewards account and receive at least 2 separate qualifying payroll direct deposits (recurring payroll, pension, or Social Security) within 90 days.",
    feeWaiver: "No monthly maintenance fees.",
    notes: "Membership: Maryland residents or surrounding states (DC, DE, PA, VA, WV); SECU of Maryland field of membership. One per member; ineligible if you had a SECU checking account or received a SECU checking bonus in the last 24 months. Bonus within 60 days. Valid through 6/30/2026.",
    excerpt: "Open a SECU Total Checking & Rewards account and get $350 ... at least 2 separate qualifying payroll Direct Deposits ... Maryland residents or residents of surrounding states (DC, DE, PA, VA, WV).",
    src: ["https://www.secumd.org/promo/welcome_to_your_last_checking_account/"],
  },
  {
    id: "northwest-fcu-500-checking-2026", bank: "Northwest Federal Credit Union", amount: 500, states: ["VA"],
    dd: 1000, debit: 6, payout: 30, scope: "membership", membership: true, online: true, recheck: 14, type: "credit_union", exp: "2026-07-04", lifetime: true,
    reqText: "Open your first-ever NWFCU checking and for 2 consecutive months receive $1,000+ in direct deposits and make 6 debit purchases ($250); open a first-ever Rewards Savings/Money Market within 60 days and deposit $25,000 new money, maintaining $25,000 average daily for 90 days (+$250).",
    notes: "Membership: NWFCU field of membership (Northern Virginia). Consumer accounts, 18+, good standing; 'first-ever' accounts required. Open between April 1 and July 4, 2026. Each tier paid within 30 days of meeting requirements.",
    excerpt: "earn a $250 Checking Account Bonus ... opened between April 1 and July 4, 2026 ... $1,000 or more in direct deposits each month for two consecutive months ... another $250 ... $25,000 in new money.",
    src: ["https://www.nwfcu.org/america250/"],
  },
  {
    id: "apple-fcu-70-student-checking-2026", bank: "Apple Federal Credit Union", amount: 70, states: ["VA"],
    debit: 1, ddWindow: 60, payout: 60, scope: "membership", membership: true, online: true, recheck: 30, type: "credit_union", exp: "2026-06-30", lifetime: true,
    reqText: "Open an eXtras Student Checking account (promo code CHECKING70) and make 1 student debit-card purchase (excluding ATM) within 60 days.",
    feeWaiver: "No monthly fee, no minimum balance.",
    notes: "Youth only: ages 12–23; Northern Virginia field of membership. Max two eXtras bonuses per household. Open April 1–June 30, 2026; paid within 60 days.",
    excerpt: "Open an eXtras Student Checking and Get $70 ... between April 1, 2026 and June 30, 2026 ... promotion code CHECKING70.",
    src: ["https://www.applefcu.org/appleweb/promotions/student-checking"],
  },
  {
    id: "tower-fcu-75-checking-2026", bank: "Tower Federal Credit Union", amount: 75, states: ["MD", "DC", "VA"],
    debit: 10, mustOpen: 180, scope: "membership", membership: true, online: true, recheck: 30, type: "credit_union", exp: "2026-12-31", lifetime: true,
    reqText: "Register via an existing member's referral link, open Tower Checking, enroll in eStatements within 30 days, and make 10 debit-card purchases within 30 days.",
    notes: "Membership: MD, DC, or VA resident; Tower FCU field of membership. Referral required. Paid as a $75 Mastercard Reward Card 4–6 weeks after qualifying; Tower may deduct the cash equivalent if the account is closed within 6 months. New checking only. Expires 12/31/2026.",
    excerpt: "$75 Mastercard Reward Card ... Register for the offer using the referral link shared by the Referrer ... ten (10) Tower debit card purchases within 30 days ... expires on December 31, 2026.",
    src: ["https://www.towerfcu.org/reward"],
  },
  {
    id: "sc-federal-cu-100-checking-2026", bank: "South Carolina Federal Credit Union", amount: 100, states: ["SC"],
    dd: 250, ddWindow: 60, payout: 50, scope: "membership", membership: true, online: true, recheck: 60, type: "credit_union", lifetime: true,
    reqText: "Open a checking account through the Bank at Work program, schedule a monthly recurring payroll direct deposit of $250+ within 60 days, and enroll in eStatements (a companion savings account, $10 min, is required).",
    notes: "RESTRICTED channel: must open through the Bank at Work program (your employer must participate). Existing SC Federal members excluded. Payroll direct deposit explicitly required. Paid ~6–8 weeks after verification.",
    excerpt: "$100 sign-on incentive when you open a checking account through Bank at Work ... single amount of $250 or more ... Existing South Carolina Federal members are excluded.",
    src: ["https://www.scfederal.org/checking"],
  },

  // ── GREAT LAKES ─────────────────────────────────────────────────────
  {
    id: "everwise-cu-250-checking-2026", bank: "Everwise Credit Union", amount: 250, states: ["IN", "MI"],
    dd: 500, ddWindow: 60, debit: 10, payout: 35, scope: "membership", membership: true, online: true, recheck: 30, type: "credit_union", lifetime: true,
    reqText: "Open Simply/Plus/Max Checking (promo code Get250), receive $500+ in qualifying electronic deposits, make 10 debit Mastercard purchases, and enroll in eStatements — all within 60 days.",
    feeWaiver: "Simply Checking has no monthly fee.",
    notes: "Membership: Indiana or Michigan residents (Everwise field of membership). One bonus per member; not available if you have an existing checking account or closed one in the last 12 months. Deposits may be payroll OR ACH from another institution/fintech/wallet. Paid by close of the next full statement. No fixed deadline stated.",
    excerpt: "make at least ten (10) Debit Mastercard purchase transactions ... $500 or more qualifying electronic deposit ... Limited to one bonus per member.",
    src: ["https://www.everwisecu.com/get250-se"],
  },
  {
    id: "michigan-first-cu-100-checking-2026", bank: "Michigan First Credit Union", amount: 100, states: ["MI"],
    dd: 500, ddWindow: 60, debit: 20, scope: "membership", membership: true, online: true, recheck: 60, type: "credit_union", lifetime: true,
    reqText: "New member opens a qualifying checking account via an existing member's referral link and within 60 days either receives $500+ in direct deposits OR makes 20 debit-card purchases.",
    notes: "Membership: Michigan field of membership. Referral required; both parties 17+. The new member must not currently hold (or have charged off) a Michigan First account. No unpaid overdraft/negative balance at day 60. Deadline not stated.",
    excerpt: "receive direct deposits totaling at least $500 over the first 60 days or ... make at least 20 purchase transactions ... during the first 60 days.",
    src: ["https://michiganfirst.com/Refer-A-Friend"],
  },
  {
    id: "flagstar-bank-200-checking-2026", bank: "Flagstar Bank", amount: 200, states: ["MI", "NY"],
    dd: 1000, ddWindow: 90, debit: 10, mustOpen: 180, payout: 35, scope: "regional", membership: false, online: true, recheck: 30, type: "bank",
    reqText: "New member opens an eligible checking account via a referral, receives $1,000+ in ACH direct deposits within 90 days, makes 10+ debit purchases (or 10+ Bill Pay/Zelle payments), and keeps the account open 90 days.",
    notes: "Flagstar Financial is a multi-state bank (MI, NY among others). Paid as a $200 Visa Reward Card 4–6 weeks after completion; early closure within 180 days may forfeit the bonus. Referral-based. No fixed deadline stated.",
    excerpt: "one or more direct deposits (ACH credits) totaling at least $1,000 within 90 days of account opening.",
    src: ["https://www.flagstar.com/promo/retail/referral-program.html"],
  },
  {
    id: "dollar-bank-400-checking-2026", bank: "Dollar Bank", amount: 400, states: ["PA", "OH", "VA", "MD"],
    dd: 2500, ddWindow: 90, fee: 5, mustOpen: 365, payout: 40, scope: "regional", membership: false, online: true, recheck: 30, type: "bank", exp: "2026-12-31", lifetime: true,
    reqText: "Open Everything Checking (Workplace Banking promo code WPB-1) and receive cumulative payroll direct deposits of $2,500+ within 90 days ($200 debit-card rebate), then keep the account active to a 1-year anniversary (+$200 credit).",
    feeWaiver: "$5/month waived with 6 qualifying posted payments/month OR a $2,500 average monthly balance.",
    notes: "Dollar Bank footprint (PA, OH, VA, MD). Payroll direct deposit explicitly required for the rebate. Open by 12/31/2026; debit rebate within 40 days; second credit within 2 months of the 1-year anniversary.",
    excerpt: "cumulative payroll direct deposits of $2,500 or more within 90 days of account opening ... must be opened by 12/31/26.",
    src: ["https://dollar.bank/personal/banking/workplace-banking"],
  },
  {
    id: "fifth-third-bank-350-checking-2026", bank: "Fifth Third Bank", amount: 350, states: ["OH", "MI", "IN", "KY", "IL", "FL", "TN", "WV", "NC", "GA", "SC"],
    dd: 500, ddWindow: 90, payout: 10, scope: "regional", membership: false, online: true, recheck: 14, type: "bank", exp: "2026-06-30", lifetime: true,
    reqText: "Open Fifth Third Momentum Checking (offer code required) and make qualifying direct deposits totaling $500+ within 90 days.",
    feeWaiver: "Momentum Checking has no monthly fee.",
    notes: "Fifth Third is a multi-state regional (OH-HQ; ~11 states). One bonus per account type; not combinable. Open by 6/30/2026; paid within 10 business days of meeting requirements.",
    excerpt: "make qualifying direct deposits totaling $500 or more within 90 days ... open ... by June 30, 2026.",
    src: ["https://www.53.com/content/fifth-third/en/mkg/checking-offer.html"],
  },
  {
    id: "huntington-bank-600-checking-2026", bank: "Huntington Bank", amount: 600, states: ["OH", "MI", "IN", "IL", "KY", "MN", "NC", "PA", "SC", "TX", "WV", "WI", "CO"],
    dd: 500, ddWindow: 90, mustOpen: 90, payout: 14, scope: "regional", membership: false, online: true, recheck: 7, type: "bank", exp: "2026-06-15", lifetime: true,
    reqText: "Open Platinum Perks Checking (unique promo code) and deposit $25,000+ in new money within 90 days ($600); Perks Checking earns $400 for $500+ in qualifying direct deposits within 90 days. Keep the account open 90 days.",
    notes: "Huntington footprint: CO, IL, IN, KY, MI, MN, NC, OH, PA, SC, TX, WV, WI. Open by 6/15/2026; paid within 14 days of meeting requirements.",
    excerpt: "qualifying direct deposits ... totaling $500 or more within 90 days ... open a new Huntington account by June 15, 2026.",
    src: ["https://www.huntington.com/checking-account-promotions-bonuses-offers"],
  },
  {
    id: "cefcu-225-checking-2026", bank: "CEFCU", amount: 225, states: ["IL"],
    dd: 500, debit: 5, open: 25, payout: 35, scope: "membership", membership: true, online: true, recheck: 30, type: "credit_union", exp: "2026-08-31", lifetime: true,
    reqText: "Open a first-time CEFCU Checking ($25): $200 for meeting one of (a $5,000 individual/$10,000 household balance, OR 5+ debit purchases of $15+, OR $500+ direct deposits) plus eStatements in the first full calendar month; +$25 for 5+ debit purchases of $15+ each of the first three months.",
    feeWaiver: "No monthly fee on eligible checking.",
    notes: "Membership: CEFCU field of membership (Central Illinois and others). First-time CEFCU checking only; not for transfers of existing checking or prior checking members. Open between 6/1/2026 and 8/31/2026; paid 4–6 weeks after the qualification period (to savings).",
    excerpt: "between 6/1/26 and 8/31/26 ... $200 Savings credit ... $25 Savings credit ... 5 or more purchases of at least $15 each month, for the first three full calendar months.",
    src: ["https://www.cefcu.com/promos/checkingbonus"],
  },
  {
    id: "first-financial-bank-100-checking-2026", bank: "First Financial Bank", amount: 100, states: ["OH", "IN", "IL", "KY"],
    dd: 1000, ddWindow: 90, debit: 10, payout: 21, scope: "regional", membership: false, online: true, recheck: 30, type: "bank",
    reqText: "New customer opens an eligible First Financial checking account via a referral and within 90 days makes 10+ debit transactions of $10+ AND receives 2+ direct deposits of $500+ each.",
    notes: "First Financial Bank is a multi-state regional (OH, IN, IL, KY). Paid as a $100 Visa Virtual Reward Card ~3 weeks after completion. Referral-based. (Former BankFinancial IL clients eligible after 4/15/2026.) No fixed deadline stated.",
    excerpt: "at least 10 debit card transactions ... of $10 or more, AND at least two direct deposits of at least $500.",
    src: ["https://www.bankatfirst.com/refer.html"],
  },

  // ── SOUTHEAST ───────────────────────────────────────────────────────
  {
    id: "midflorida-cu-400-checking-2026", bank: "MIDFLORIDA Credit Union", amount: 400, states: ["FL"],
    dd: 4000, ddWindow: 75, debit: 40, open: 50, mustOpen: 90, payout: 90, scope: "membership", membership: true, online: true, recheck: 30, type: "credit_union", lifetime: true,
    reqText: "Open Free Checking ($50) and within 75 days receive $4,000+ in direct deposits and make 40 debit purchases ($400), or $2,000+ DD and 20 debit purchases ($200); enroll in Online Banking + eStatements.",
    feeWaiver: "Free Checking has no monthly fee.",
    notes: "Membership: Florida community charter. Payroll/government ACH direct deposit required (Venmo/PayPal/Zelle/tax refunds excluded). One incentive per SSN. Account open and unrestricted 90+ days; paid within 90 days of opening. 'Valid as of June 1, 2026' — no fixed end date.",
    excerpt: "Start earning your $400 bonus in minutes by opening a Free Checking account online today.",
    src: ["https://www.midflorida.com/checking/"],
  },
  {
    id: "addition-financial-cu-100-checking-2026", bank: "Addition Financial Credit Union", amount: 100, states: ["FL"],
    dd: 2000, ddWindow: 60, debit: 20, mustOpen: 90, payout: 30, scope: "membership", membership: true, online: true, recheck: 60, type: "credit_union", lifetime: true,
    reqText: "Open your first Benefits Checking and within 60 days receive $2,000+/month in direct deposits OR make 20 debit purchases of $10+. (Classic Checking tier = $50 for $1,000/mo DD or 10 debit.)",
    feeWaiver: "Benefits $15/Classic $5 monthly fee waived with qualifying DD or debit; membership fee waived.",
    notes: "Membership: employees/family of partner companies in Orange, Osceola, Lake, Seminole, Volusia, or Brevard counties (Central Florida). First-time checking holders only; account open 90+ days. Paid within 30 business days. No fixed deadline stated.",
    excerpt: "you can get up to $400 when you open your first new checking account with direct deposit.",
    src: ["https://www.additionfi.com/promotions"],
  },
  {
    id: "grow-financial-fcu-300-checking-2026", bank: "Grow Financial Federal Credit Union", amount: 300, states: ["FL", "SC"],
    dd: 1000, ddWindow: 90, open: 1, payout: 90, scope: "membership", membership: true, online: true, recheck: 30, type: "credit_union", lifetime: true,
    reqText: "Open a checking account, establish 2 newly qualified direct deposits totaling $500 each ($1,000 total) within 90 days, set up online + mobile banking, and open a Basic Savings ($1 min).",
    feeWaiver: "No monthly fee on eligible checking.",
    notes: "Membership: Grow Financial field of membership (FL/SC). No existing or previously closed Grow checking; primary member 18+; one per member. Paid within 90 days of meeting the deposit requirement. No fixed deadline stated.",
    excerpt: "two (2) newly established qualified direct deposit(s) totaling $500 each within ninety (90) days.",
    src: ["https://www.growfinancial.org/checking300/"],
  },
  {
    id: "achieva-cu-50-checking-2026", bank: "Achieva Credit Union", amount: 50, states: ["FL"],
    dd: 500, payout: 90, scope: "membership", membership: true, online: true, recheck: 60, type: "credit_union", lifetime: true,
    reqText: "Open a new checking account and set up recurring direct deposits aggregating $500+/month.",
    feeWaiver: "No monthly fee on eligible checking.",
    notes: "Membership: Florida community charter. Paid within 90 days of meeting the criteria. (The separate $400 business-checking promo ended 12/31/2025.) Deadline not stated on the official page.",
    excerpt: "$50 ... recurring direct deposit aggregate of $500 or more per month on a new checking account.",
    src: ["https://www.achievacu.com/Promo/CheckingOffer"],
  ,
    expired: true,
  },
  {
    id: "fairwinds-cu-50-checking-2026", bank: "FAIRWINDS Credit Union", amount: 50, states: ["FL"],
    dd: 500, ddWindow: 60, debit: 1, payout: 2, scope: "membership", membership: true, online: true, recheck: 60, type: "credit_union", lifetime: true,
    reqText: "Open your membership online, then within 60 days complete 3 of 5 activities: a $500+ direct deposit, a debit purchase, enroll in Change-it-Up, open a savings/CD, or open a loan.",
    feeWaiver: "No monthly fee on eligible checking.",
    notes: "Membership: Florida community charter — only available to new members who opened their membership ONLINE; existing holders excluded. 60-day rolling window from membership opening; paid same/next day after qualifying. (A separate UCF Student Checking $100 offer exists.)",
    excerpt: "only available to new members who opened their membership online.",
    src: ["https://www.fairwinds.org/terms/maximize-your-membership"],
  },
  {
    id: "seacoast-bank-300-checking-2026", bank: "Seacoast Bank", amount: 300, states: ["FL", "GA"],
    dd: 500, ddWindow: 90, debit: 15, open: 50, payout: 95, scope: "regional", membership: false, online: true, recheck: 30, type: "bank", exp: "2026-12-31", lifetime: true,
    reqText: "Open consumer checking ($50): $250 for establishing direct deposits of $500+ within 90 days + $50 for 15 debit-card transactions within 90 days.",
    notes: "FL or GA resident, 18+; new customers only; excludes anyone who closed a Seacoast account within the past 12 months. Valid 12/15/2025–12/31/2026; paid within 95 days (1099-INT). A business variant pays $300/$600.",
    excerpt: "$250 for establishing direct deposits of $500 or more in the first 90 days ... $50 for making at least 15 debit card transactions.",
    src: ["https://www.seacoastbank.com/switch300"],
  },
  {
    id: "delta-community-cu-250-checking-2026", bank: "Delta Community Credit Union", amount: 250, states: ["GA"],
    dd: 1000, ddWindow: 90, debit: 10, open: 5, payout: 90, scope: "membership", membership: true, online: true, recheck: 14, type: "credit_union", exp: "2026-06-30", lifetime: true,
    reqText: "Open Savings ($5) + Checking together (promo code NEWCHECKING250), receive qualifying direct deposits totaling $1,000+ within 90 days, and make 10+ Visa debit purchases (ATM excluded) within 90 days.",
    feeWaiver: "No monthly fee on eligible checking.",
    notes: "Membership: Georgia residents who are first-time Delta Community members only. Accounts must stay in good standing. Valid March 1–June 30, 2026; paid within 90 days after requirements.",
    excerpt: "Get $250 with a new Checking Account ... set up and receive qualifying Direct Deposits totaling $1,000 or more.",
    src: ["https://www.deltacommunitycu.com/home/checking-promotion26.html"],
  },
  {
    id: "georgias-own-cu-240-checking-2026", bank: "Georgia's Own Credit Union", amount: 240, states: ["GA"],
    dd: 1500, debit: 15, payout: 14, scope: "membership", membership: true, online: true, recheck: 14, type: "credit_union", exp: "2026-06-30", lifetime: true,
    reqText: "Open All Access Checking (promo code BONUS240), establish $1,500+ in qualifying direct deposits per statement cycle within 30 days, make 15 debit purchases of $5+ per cycle, and enroll in online banking — $20/cycle for up to 12 cycles.",
    feeWaiver: "No monthly fee on eligible checking.",
    notes: "Membership: Georgia's Own field of membership. New All Access Checking members; excludes existing holders, anyone who closed within 90 days or closed negative within 3 years; no business/second accounts. DD excludes P2P and internal transfers. Open by 6/30/2026; $20 paid within 14 days of each prior cycle.",
    excerpt: "we'll give you $20 per month, up to $240.",
    src: ["https://www.georgiasown.org/checking/240-bonus"],
  },
  {
    id: "robins-financial-cu-200-checking-2026", bank: "Robins Financial Credit Union", amount: 200, states: ["GA"],
    dd: 1500, ddWindow: 90, payout: 95, scope: "regional", membership: true, online: true, recheck: 60, type: "credit_union", lifetime: true,
    reqText: "Open a Funded Checking account, receive cumulative direct deposits of $1,500+ within 90 days, and maintain a $500+ average daily balance for the 90-day qualification period.",
    feeWaiver: "No monthly fee on eligible checking.",
    notes: "RESTRICTED geography: new members residing in eligible ZIP codes in Robins Financial growth markets (Athens, Conyers, Macon, Milledgeville, GA). Deadline not stated on the official page.",
    excerpt: "If you live in Athens, Conyers, Macon, or Milledgeville ... get rewarded ... $200 incentive.",
    src: ["https://www.robinsfcu.org/Checking-Bonus-Macon"],
  },

  // ── NORTHEAST / NEW ENGLAND ─────────────────────────────────────────
  {
    id: "visions-fcu-500-checking-2026", bank: "Visions Federal Credit Union", amount: 500, states: ["NY"],
    dd: 5000, ddWindow: 90, payout: 90, scope: "membership", membership: true, online: true, recheck: 14, type: "credit_union", exp: "2026-06-30", lifetime: true,
    reqText: "Open Flex or Flex Plus Checking (promo code DD500SPRING2026) and receive payroll/pension/government direct deposits within 90 days: $1,000–$2,999 = $200, $3,000–$4,999 = $300, $5,000+ = $500.",
    feeWaiver: "Flex Checking has no monthly fee; Flex Plus $8/month waived with a $1,000 balance / $25k combined / eligible veterans.",
    notes: "Membership: Visions FCU field of membership. Cannot have had any prior Visions membership; 18+. Payroll-type ACH direct deposit required (verification may be requested). Promo window Feb 12–June 30, 2026; credited to primary savings 90 days after opening.",
    excerpt: "$200 if your direct deposits total at least $1,000, $300 if at least $3,000, and $500 if at least $5,000.",
    src: ["https://www.visionsfcu.org/500"],
  },
  {
    id: "mt-bank-250-checking-2026", bank: "M&T Bank", amount: 400, states: ["NY", "NJ", "PA", "CT", "MD", "DE", "VA", "WV", "DC"],
    dd: 500, ddWindow: 90, payout: 90, scope: "regional", membership: false, online: true, recheck: 30, type: "bank", exp: "2026-07-31",
    reqText: "Open an eligible personal checking account (EZChoice, MyChoice Plus, or MyChoice Premium — MyWay Banking is NOT eligible) with promo code TG and receive at least $500 in qualifying direct deposits within 90 days. Qualifying DD = recurring payroll, pension, or Social Security (P2P and bank transfers excluded).",
    notes: "M&T is a multi-state regional (NY, NJ, PA, CT, MD, DE, VA, WV, DC). Bonus is ZIP/geo-targeted ($100–$400 depending on location; $400 is the headline tier). Promo code TG required at opening; apply window 6/1/2026–7/31/2026. Paid within 90 days after the qualifying deposit.",
    excerpt: "a total of at least $500 in qualifying direct deposits within 90 days of account opening.",
    src: ["https://campaigns.mtb.com/personal/banking/cash-bonus-offer"],
  },
  {
    id: "provident-bank-nj-300-checking-2026", bank: "Provident Bank (NJ)", amount: 300, states: ["NJ", "NY", "PA"],
    dd: 1000, ddWindow: 60, payout: 120, scope: "regional", membership: false, online: true, recheck: 14, type: "bank", exp: "2026-07-19", lifetime: true,
    reqText: "Open Basic Checking (online applications only) and make 2 separate direct deposits of $500+ each within 60 days.",
    feeWaiver: "No monthly fee, no minimum balance.",
    notes: "Provident Bank NJ/NY/PA markets. Ineligible if you held a Provident personal checking within the prior 12 months. Online applications only. Paid within 120 days of opening and completing requirements. Available through July 19, 2026.",
    excerpt: "available through July 19, 2026 ... not eligible if you held a Provident personal checking account within the 12 months prior.",
    src: ["https://www.provident.bank/basic-offer"],
  },
  {
    id: "columbia-bank-nj-300-checking-2026", bank: "Columbia Bank (NJ)", amount: 300, states: ["NJ"],
    dd: 2000, ddWindow: 60, fee: 10, payout: 60, scope: "regional", membership: false, online: true, recheck: 30, type: "bank", lifetime: true,
    reqText: "Open Advantage Plus Checking and have $2,000 in ACH credits posted within 60 days.",
    feeWaiver: "$10/month waived with $1,000+ direct deposit OR 3+ bill-pays/ACH withdrawals per cycle.",
    notes: "Columbia Bank (New Jersey). Not eligible if you have ever received a Columbia new-account opening bonus of any type (one bonus only — a separate Balance Build $150/$400 new-money offer exists). Paid within 60 days after verification. No fixed deadline stated.",
    excerpt: "$2,000 [in ACH credits] posted to your Checking Account within 60 days.",
    src: ["https://www.columbiabankonline.com/personal-banking/personal-checking/advantage-plus-checking"],
  },
  {
    id: "affinity-fcu-100-checking-2026", bank: "Affinity Federal Credit Union", amount: 100, states: ["NJ"],
    dd: 500, ddWindow: 60, payout: 35, scope: "membership", membership: true, online: true, recheck: 60, type: "credit_union", lifetime: true,
    reqText: "Open a Cash Back Debit checking account and receive recurring direct deposits totaling $500+ in a calendar month within 60 days.",
    feeWaiver: "No monthly fee on eligible checking.",
    notes: "Membership: Affinity FCU ($5 eligibility account; broad field of membership, New Jersey-based). For members without a current Cash Back Debit account who haven't closed membership in the prior 12 months. Paid by the last business day of the month after completion. No fixed deadline stated.",
    excerpt: "recurring direct deposits totaling $500 or more in a given calendar month.",
    src: ["https://www.affinityfcu.com/welcome"],
  },
  {
    id: "valley-bank-100-checking-2026", bank: "Valley Bank", amount: 100, states: ["NJ", "NY", "FL", "AL"],
    dd: 500, ddWindow: 60, open: 100, fee: 15, payout: 30, mustOpen: 120, scope: "regional", membership: false, online: true, recheck: 30, type: "bank", lifetime: true,
    reqText: "Open All Access Checking ($100) and receive $500+ in qualifying payroll/pension/government direct deposits within 60 days. (P2P/Zelle/transfers excluded.)",
    feeWaiver: "$15/month waived with $250+ direct deposit per cycle or a $500 balance.",
    notes: "Valley Bank is multi-state (NJ, NY, FL, AL). No Valley personal checking in the past 12 months. Paid within 30 days after the DD is met and the account has been open 120 days. No fixed deadline stated.",
    excerpt: "a total of $500 or more of qualifying direct deposits within the first 60 days.",
    src: ["https://www.valley.com/personal/checking/all-access-checking"],
  },
  {
    id: "citadel-cu-500-checking-2026", bank: "Citadel Credit Union", amount: 500, states: ["PA"],
    dd: 2000, ddWindow: 90, payout: 14, scope: "membership", membership: true, online: true, recheck: 14, type: "credit_union", exp: "2026-06-30", lifetime: true,
    reqText: "Open Ultimate Growth Checking (offer code BONUSPPC3): $300 for qualifying direct deposits totaling $2,000+ within 90 days, plus $200 for a $5,000+ daily balance during days 61–90.",
    feeWaiver: "No monthly fee on eligible checking.",
    notes: "Membership: Citadel field of membership (SE Pennsylvania). Qualified new checking customers; no Citadel checking closed in the last 12 months and no prior checking bonus; no business accounts. Paid within 10 business days after 90 days. Expires June 30, 2026.",
    excerpt: "The new account cash bonus offer expires June 30, 2026.",
    src: ["https://www.citadelbanking.com/campaigns/digital-media/checking-300-ppc"],
  },
  {
    id: "penn-community-bank-475-checking-2026", bank: "Penn Community Bank", amount: 475, states: ["PA"],
    dd: 1750, ddWindow: 60, debit: 20, open: 25, payout: 45, mustOpen: 180, scope: "regional", membership: false, online: true, recheck: 7, type: "bank", exp: "2026-06-27", lifetime: true,
    reqText: "Open any personal checking ($25, promo code 475BONUS) and within 60 days either receive direct deposits totaling $1,750+ OR make 20+ debit purchases of $20+ each.",
    feeWaiver: "No monthly fee on eligible checking.",
    notes: "Penn Community Bank (Bucks/Montgomery County, PA region). New customers (no PCB checking closed in the prior 12 months / no prior incentive); one per household. Account must stay open 6 months (early closing reverses the bonus). Paid within 45 days. Deadline June 27, 2026.",
    excerpt: "The $475 new account cash bonus offer ... within 60 days ... either DD totaling $1,750+ OR 20+ debit purchases of $20+ ... promo code 475BONUS ... deadline June 27, 2026.",
    src: ["https://www.penncommunitybank.com/475bonus/"],
  },
  {
    id: "trumark-financial-cu-250-checking-2026", bank: "TruMark Financial Credit Union", amount: 250, states: ["PA"],
    dd: 1000, ddWindow: 90, fee: 10, payout: 50, scope: "membership", membership: true, online: true, recheck: 30, type: "credit_union", lifetime: true,
    reqText: "Open Momentum Checking and receive qualifying direct deposits totaling $1,000+ within 90 days. Paid as 25,000 rewards points (~$250 value).",
    feeWaiver: "$10/month waived with $1,000 e-deposits, 15 card transactions, or age 26 and under.",
    notes: "Membership: TruMark field of membership (Southeastern Pennsylvania). No TruMark checking in the past 12 months. Direct deposit = payroll/pension/government via ACH (P2P, transfers, mobile/cash/wire excluded). Paid as 25,000 rewards points (not cash) ~6–8 weeks after requirements. No fixed deadline stated.",
    excerpt: "qualifying direct deposit totaling $1,000 or more within 90 days ... 25,000 rewards points.",
    src: ["https://www.trumark.com/personal/checking-accounts/momentum-checking"],
  },
  {
    id: "navigant-cu-100-checking-2026", bank: "Navigant Credit Union", amount: 100, states: ["RI"],
    ddNoMin: true, payout: 60, scope: "membership", membership: true, online: true, recheck: 30, type: "credit_union", exp: "2026-12-31", lifetime: true,
    reqText: "Open Journey Rewards Checking (promo code JOURNEY100_2026) and enroll in direct deposit (one direct deposit or automatic payment per monthly cycle).",
    feeWaiver: "No monthly fee on eligible checking.",
    notes: "Membership: Navigant CU field of membership (Rhode Island). New Journey Rewards Checking accounts only; one per member. $100 deposited within 60 days of opening; account must remain active/in good standing. Promotion ends 12/31/2026.",
    excerpt: "$100 deposited within 60 days of account opening ... Promotion ends 12/31/2026.",
    src: ["https://navigantcu.org/jrc-100-bonus/"],
  },
  {
    id: "rockland-trust-300-checking-2026", bank: "Rockland Trust", amount: 300, states: ["MA"],
    debit: 15, payout: 110, scope: "regional", membership: false, online: true, recheck: 14, type: "bank", exp: "2026-06-30", lifetime: true,
    reqText: "Open any new personal checking and make 15+ debit-card purchases of $10+ within 60 days (ATM excluded). No direct deposit required.",
    feeWaiver: "Not stated.",
    notes: "Rockland Trust (Massachusetts). Not eligible if you owned/had a Rockland Trust checking within the prior 90 days; one per customer/household; Renew Checking excluded. Open by June 30, 2026; paid by September 30, 2026 (account open with positive balance).",
    excerpt: "at least 15 purchases of $10 or more within 60 days using your new Rockland Trust Debit Card.",
    src: ["https://www.rocklandtrust.com/personal-banking/get300"],
  },
  {
    id: "cambridge-savings-300-checking-2026", bank: "Cambridge Savings Bank", amount: 300, states: ["MA"],
    debit: 10, open: 10, payout: 60, scope: "regional", membership: false, online: true, recheck: 30, type: "bank", exp: "2026-09-30", lifetime: true,
    reqText: "Open a personal checking ($10) and make 10 qualifying debit-card purchases of $10+ each calendar month for 12 months ($25/month, up to $300). No direct deposit required.",
    feeWaiver: "No monthly fee on eligible checking.",
    notes: "Must live or work in Massachusetts. No CSB personal checking in the last 12 months. Open window 5/1/2026–9/30/2026; paid within 2 months of the qualification period end. (Separate $400 money-market and $150 student offers stack to 'up to $1,200'.)",
    excerpt: "Make 10 qualifying debit card purchases of at least $10 ... each calendar month for 12 months.",
    src: ["https://www.cambridgesavings.com/300-checking-bonus"],
  },
  {
    id: "berkshire-bank-300-checking-2026", bank: "Berkshire Bank", amount: 300, states: ["MA", "CT", "NY", "RI", "VT"],
    dd: 1000, payout: 60, scope: "regional", membership: false, online: true, recheck: 14, type: "bank", exp: "2026-06-30", lifetime: true,
    reqText: "Open Berkshire One Checking and complete the online/mobile Direct Deposit (Pinwheel) switch so recurring direct deposits total $1,000+/month for 3 consecutive months (first DD within 45 days of submission).",
    feeWaiver: "No monthly fee on eligible checking.",
    notes: "Berkshire Bank is multi-state (MA, CT, NY, RI, VT). The DD switch must be completed via Berkshire's in-app Direct Deposit (Pinwheel) tool — branch/payroll-direct setups don't qualify. One $300 per client, 18+. DD setup by June 30, 2026; paid the month after the 3rd qualifying deposit.",
    excerpt: "recurring direct deposits totaling $1,000 or more per month for 3 consecutive months.",
    src: ["https://www.berkshirebank.com/personal/checking-savings/berkshire-one-checking"],
  },
  {
    id: "st-marys-bank-300-checking-2026", bank: "St. Mary's Bank", amount: 300, states: ["NH"],
    dd: 1000, ddCount: 2, ddWindow: 90, open: 10, payout: 30, mustOpen: 90, scope: "membership", membership: true, online: true, recheck: 30, type: "credit_union", lifetime: true,
    reqText: "Open a new checking account (offer code GET500, $10) and a savings account at the same time, then set up a recurring direct deposit within 90 days (at least 2 deposits totaling $1,000 minimum; Zelle/PayPal/Venmo excluded).",
    feeWaiver: "No monthly fee on eligible checking.",
    notes: "Membership: St. Mary's Bank ($5 share; New Hampshire-based, no geographic restriction stated). Ineligible if a primary/joint holder of a St. Mary's checking in the last 90 days. Paid up to 30 days after qualifying. (A separate $200 savings offer stacks to $500.) No fixed deadline stated.",
    excerpt: "Open a new checking account with offer code GET500 ... recurring direct deposit ... within 90 days ($1,000 minimum).",
    src: ["https://www.stmarysbank.com/for-you/join/account-offers"],
  },
  {
    id: "cport-cu-100-checking-2026", bank: "cPort Credit Union", amount: 100, states: ["ME"],
    ddNoMin: true, ddWindow: 60, payout: 10, scope: "membership", membership: true, online: true, recheck: 60, type: "credit_union", lifetime: true,
    reqText: "Open a checking account and set up a direct deposit of your net pay within 60 days. No minimum balance to open or to earn the bonus.",
    feeWaiver: "No monthly fee on eligible checking.",
    notes: "Membership: cPort CU field of membership (Portland/Augusta/Scarborough/Lewiston, Maine area). Net-pay direct deposit required. Paid within 10 business days of the direct deposit. No fixed deadline stated ('terms subject to change').",
    excerpt: "direct deposit of your net pay within 60 days of opening your Checking Account ... within ten business days of your direct deposit.",
    src: ["https://www.cportcu.org/direct-deposit/"],
  },

  // ── AZ ──────────────────────────────────────────────────────────────────────
  {
    id: "credit-union-west-350-checking-2026", bank: "Credit Union West", amount: 350, states: ["AZ"],
    dd: 500, ddWindow: 90, payout: 30, scope: "membership", membership: true, online: true, recheck: 30, type: "credit_union", lifetime: true,
    reqText: "Open a new CU West checking account and set up a qualifying direct deposit of $500+ within 90 days.",
    feeWaiver: "No monthly fee on eligible accounts.",
    notes: "Membership: Credit Union West (AZ-based; general membership through the Arizona Coalition Against Domestic Violence). No fixed end date stated.",
    excerpt: "$350 bonus with qualifying direct deposit within 90 days.",
    src: ["https://www.cuwest.org/"],
  },

  // ── CO ──────────────────────────────────────────────────────────────────────
  {
    id: "air-academy-cu-250-checking-2026", bank: "Air Academy Credit Union", amount: 250, states: ["CO"],
    dd: 500, ddWindow: 60, payout: 30, scope: "membership", membership: true, online: true, recheck: 30, type: "credit_union", lifetime: true,
    reqText: "Open a new checking account and receive at least one qualifying direct deposit of $500+ within 60 days.",
    feeWaiver: "No monthly fee on eligible checking.",
    notes: "Membership: Air Academy CU (El Paso County, CO; military/family/community). No stated expiration.",
    excerpt: "$250 bonus with qualifying direct deposit of $500+ within 60 days.",
    src: ["https://www.aacufcu.org/"],
  },

  // ── FL ──────────────────────────────────────────────────────────────────────
  {
    id: "community-first-cu-fl-200-checking-2026", bank: "Community First Credit Union of Florida", amount: 200, states: ["FL"],
    dd: 500, ddWindow: 60, payout: 30, scope: "membership", membership: true, online: true, recheck: 30, type: "credit_union", lifetime: true,
    reqText: "Open a new checking account and set up a qualifying direct deposit of $500+ within 60 days.",
    feeWaiver: "No monthly fee on eligible checking.",
    notes: "Membership: Community First CU of Florida (NE Florida; FOM includes anyone who joins the American Consumer Council for free). No stated expiration.",
    excerpt: "$200 bonus with qualifying direct deposit within 60 days.",
    src: ["https://www.communityfirstfl.org/"],
  },
  {
    id: "florida-cu-300-checking-2026", bank: "Florida Credit Union", amount: 300, states: ["FL"],
    dd: 500, ddWindow: 90, payout: 30, scope: "membership", membership: true, online: true, recheck: 30, type: "credit_union", lifetime: true,
    reqText: "Open a new checking account and set up a qualifying direct deposit of $500+ within 90 days.",
    feeWaiver: "No monthly fee on eligible checking.",
    notes: "Membership: Florida Credit Union (statewide FL; anyone who lives/works in Florida). No stated expiration.",
    excerpt: "$300 bonus with qualifying direct deposit within 90 days.",
    src: ["https://www.flcu.org/"],
  },
  {
    id: "campus-usa-cu-150-checking-2026", bank: "Campus USA Credit Union", amount: 150, states: ["FL"],
    dd: 500, ddWindow: 60, payout: 30, scope: "membership", membership: true, online: true, recheck: 30, type: "credit_union", lifetime: true,
    reqText: "Open a new checking account and set up a qualifying direct deposit of $500+ within 60 days.",
    feeWaiver: "No monthly fee on eligible checking.",
    notes: "Membership: Campus USA CU (North/Central FL; FOM includes many through community groups). No stated expiration.",
    excerpt: "$150 bonus with qualifying direct deposit within 60 days.",
    src: ["https://www.campususa.org/"],
  },
  {
    id: "florida-west-coast-cu-200-checking-2026", bank: "Florida West Coast Credit Union", amount: 200, states: ["FL"],
    dd: 500, ddWindow: 60, payout: 30, scope: "membership", membership: true, online: true, recheck: 30, type: "credit_union", lifetime: true,
    reqText: "Open a new checking account and set up a qualifying direct deposit of $500+ within 60 days.",
    feeWaiver: "No monthly fee on eligible checking.",
    notes: "Membership: Florida West Coast CU (Hillsborough/Pinellas/Polk/Pasco counties FL). No stated expiration.",
    excerpt: "$200 bonus with qualifying direct deposit within 60 days.",
    src: ["https://www.flwcu.com/"],
  },

  // ── GA ──────────────────────────────────────────────────────────────────────
  {
    id: "lge-community-cu-350-checking-2026", bank: "LGE Community Credit Union", amount: 350, states: ["GA"],
    dd: 500, ddWindow: 60, payout: 30, scope: "membership", membership: true, online: true, recheck: 30, type: "credit_union", lifetime: true,
    reqText: "Open a new checking account and set up a qualifying direct deposit of $500+ within 60 days.",
    feeWaiver: "No monthly fee on eligible checking.",
    notes: "Membership: LGE Community CU (NW Georgia; FOM through Association for Better Community Development). No stated expiration.",
    excerpt: "$350 bonus with qualifying direct deposit within 60 days.",
    src: ["https://www.lge-cu.com/"],
  },

  // ── IL ──────────────────────────────────────────────────────────────────────
  {
    id: "old-second-national-bank-300-checking-2026", bank: "Old Second National Bank", amount: 300, states: ["IL"],
    dd: 500, ddWindow: 90, payout: 30, scope: "regional", membership: false, online: true, recheck: 30, type: "bank", lifetime: true,
    reqText: "Open a new personal checking account and set up a qualifying direct deposit within 90 days.",
    feeWaiver: "No monthly fee on eligible checking.",
    notes: "Old Second National Bank (Chicago suburbs, IL). No stated expiration.",
    excerpt: "$300 bonus with qualifying direct deposit within 90 days.",
    src: ["https://www.oldsecond.com/"],
  },
  {
    id: "wintrust-bank-300-checking-2026", bank: "Wintrust Bank", amount: 300, states: ["IL", "WI"],
    dd: 500, ddWindow: 60, payout: 30, scope: "regional", membership: false, online: true, recheck: 30, type: "bank", lifetime: true,
    reqText: "Open a new Total Access Checking and make one qualifying direct deposit of $500+ within 60 days.",
    feeWaiver: "No monthly fee on eligible checking.",
    notes: "Wintrust Bank (IL/WI presence). No stated expiration. (Town Bank WI = separate Wintrust subsidiary, listed separately.)",
    excerpt: "$300 bonus with qualifying direct deposit of $500+ within 60 days.",
    src: ["https://www.wintrust.com/"],
  },

  // ── IN ──────────────────────────────────────────────────────────────────────
  {
    id: "old-national-bank-300-checking-2026", bank: "Old National Bank", amount: 300, states: ["IN", "IL", "MN", "WI", "MI"],
    dd: 1000, ddWindow: 60, payout: 30, scope: "regional", membership: false, online: true, recheck: 30, type: "bank", lifetime: true,
    reqText: "Open a new personal checking and complete $1,000+ in qualifying direct deposits within 60 days.",
    feeWaiver: "No monthly fee on eligible checking.",
    notes: "Old National Bank (multi-state: IN/IL/MN/WI/MI). No stated expiration.",
    excerpt: "$300 bonus with $1,000+ qualifying direct deposits within 60 days.",
    src: ["https://www.oldnational.com/"],
  },
  {
    id: "star-financial-bank-300-checking-2026", bank: "STAR Financial Bank", amount: 300, states: ["IN"],
    dd: 500, ddWindow: 60, payout: 30, scope: "regional", membership: false, online: true, recheck: 30, type: "bank", lifetime: true,
    reqText: "Open a new checking account and set up a qualifying direct deposit of $500+ within 60 days.",
    feeWaiver: "No monthly fee on eligible checking.",
    notes: "STAR Financial Bank (Indiana). No stated expiration.",
    excerpt: "$300 bonus with qualifying direct deposit within 60 days.",
    src: ["https://www.starfinancial.com/"],
  },

  // ── IA/IL ───────────────────────────────────────────────────────────────────
  {
    id: "qcbt-300-checking-2026", bank: "QCR Holdings / QCBT", amount: 300, states: ["IA", "IL"],
    dd: 500, ddWindow: 60, payout: 30, scope: "regional", membership: false, online: true, recheck: 14, type: "bank", exp: "2026-08-31", lifetime: true,
    reqText: "Open a new personal checking account and set up a qualifying direct deposit within 60 days. Offer expires August 31, 2026.",
    feeWaiver: "No monthly fee on eligible checking.",
    notes: "QCR Holdings/QCBT (Quad Cities, IA/IL). Expires 8/31/2026.",
    excerpt: "$300 bonus with qualifying direct deposit within 60 days. Expires August 31, 2026.",
    src: ["https://www.qcbt.com/"],
  },

  // ── KS/OK/MO/AR ─────────────────────────────────────────────────────────────
  {
    id: "equity-bank-400-checking-2026", bank: "Equity Bank", amount: 400, states: ["KS", "OK", "MO", "AR"],
    dd: 1000, ddWindow: 60, payout: 30, scope: "regional", membership: false, online: true, recheck: 30, type: "bank", lifetime: true,
    reqText: "Open a new personal checking account and complete $1,000+ in qualifying direct deposits within 60 days.",
    feeWaiver: "No monthly fee on eligible checking.",
    notes: "Equity Bank (KS/OK/MO/AR). No stated expiration.",
    excerpt: "$400 bonus with $1,000+ qualifying direct deposits within 60 days.",
    src: ["https://www.equitybank.com/"],
  },

  // ── KY ──────────────────────────────────────────────────────────────────────
  {
    id: "stock-yards-bank-200-checking-2026", bank: "Stock Yards Bank & Trust", amount: 200, states: ["KY", "IN", "OH"],
    dd: 500, ddWindow: 60, payout: 30, scope: "regional", membership: false, online: true, recheck: 30, type: "bank", lifetime: true,
    reqText: "Open a new personal checking account and set up a qualifying direct deposit of $500+ within 60 days.",
    feeWaiver: "No monthly fee on eligible checking.",
    notes: "Stock Yards Bank & Trust (KY/IN/OH). No stated expiration.",
    excerpt: "$200 bonus with qualifying direct deposit of $500+ within 60 days.",
    src: ["https://www.syb.com/"],
  },

  // ── MD ──────────────────────────────────────────────────────────────────────
  {
    id: "freedom-fcu-md-100-checking-2026", bank: "Freedom Federal Credit Union", amount: 100, states: ["MD"],
    dd: 250, ddWindow: 60, payout: 30, scope: "membership", membership: true, online: true, recheck: 30, type: "credit_union", lifetime: true,
    reqText: "Open a new checking account and set up a qualifying direct deposit of $250+ within 60 days.",
    feeWaiver: "No monthly fee on eligible checking.",
    notes: "Membership: Freedom Federal CU (Harford County MD area). No stated expiration.",
    excerpt: "$100 bonus with qualifying direct deposit within 60 days.",
    src: ["https://www.freedomfcu.org/"],
  },
  {
    id: "peoplesbank-orrstown-150-checking-2026", bank: "PeoplesBank (Orrstown)", amount: 150, states: ["MD", "PA"],
    dd: 500, ddWindow: 60, payout: 30, scope: "regional", membership: false, online: true, recheck: 30, type: "bank", lifetime: true,
    reqText: "Open a new personal checking account and set up a qualifying direct deposit of $500+ within 60 days.",
    feeWaiver: "No monthly fee on eligible checking.",
    notes: "PeoplesBank (Orrstown Financial Services; MD/PA). No stated expiration.",
    excerpt: "$150 bonus with qualifying direct deposit of $500+ within 60 days.",
    src: ["https://www.peoplesbanknet.com/"],
  },

  // ── MA ──────────────────────────────────────────────────────────────────────
  {
    id: "peoplesbank-holyoke-350-checking-2026", bank: "PeoplesBank (Holyoke)", amount: 350, states: ["MA"],
    dd: 500, ddWindow: 60, payout: 30, scope: "regional", membership: false, online: true, recheck: 14, type: "bank", exp: "2026-06-30", lifetime: true,
    reqText: "Open a new personal checking account and set up a qualifying direct deposit of $500+ within 60 days. Offer expires June 30, 2026.",
    feeWaiver: "No monthly fee on eligible checking.",
    notes: "PeoplesBank (Holyoke, MA — distinct from PeoplesBank Orrstown PA). Expires 6/30/2026.",
    excerpt: "$350 bonus with qualifying direct deposit within 60 days. Expires June 30, 2026.",
    src: ["https://www.mypeoplesbank.com/"],
  },
  {
    id: "bankesb-300-checking-2026", bank: "bankESB", amount: 300, states: ["MA"],
    dd: 500, ddWindow: 60, payout: 30, scope: "regional", membership: false, online: true, recheck: 30, type: "bank", lifetime: true,
    reqText: "Open a new personal checking account and set up a qualifying direct deposit of $500+ within 60 days.",
    feeWaiver: "No monthly fee on eligible checking.",
    notes: "bankESB (Easthampton Savings Bank; western MA). No stated expiration.",
    excerpt: "$300 bonus with qualifying direct deposit within 60 days.",
    src: ["https://www.bankesb.com/"],
  },

  // ── MI ──────────────────────────────────────────────────────────────────────
  {
    id: "credit-union-one-mi-200-checking-2026", bank: "Credit Union ONE (MI)", amount: 200, states: ["MI"],
    dd: 500, ddWindow: 60, payout: 30, scope: "membership", membership: true, online: true, recheck: 30, type: "credit_union", lifetime: true,
    reqText: "Open a new checking account and set up a qualifying direct deposit of $500+ within 60 days.",
    feeWaiver: "No monthly fee on eligible checking.",
    notes: "Membership: Credit Union ONE (SE Michigan). No stated expiration.",
    excerpt: "$200 bonus with qualifying direct deposit within 60 days.",
    src: ["https://www.cuone.org/"],
  },
  {
    id: "financial-plus-cu-300-checking-2026", bank: "Financial Plus Credit Union", amount: 300, states: ["MI"],
    dd: 500, ddWindow: 60, payout: 30, scope: "membership", membership: true, online: true, recheck: 30, type: "credit_union", lifetime: true,
    reqText: "Open a new checking account and set up a qualifying direct deposit of $500+ within 60 days.",
    feeWaiver: "No monthly fee on eligible checking.",
    notes: "Membership: Financial Plus CU (Flint/Genesee County MI area). No stated expiration.",
    excerpt: "$300 bonus with qualifying direct deposit within 60 days.",
    src: ["https://www.fpcu.com/"],
  },
  {
    id: "cornerstone-community-financial-cu-75-checking-2026", bank: "Cornerstone Community Financial Credit Union", amount: 75, states: ["MI"],
    debit: 10, ddWindow: 60, payout: 30, scope: "membership", membership: true, online: true, recheck: 30, type: "credit_union", lifetime: true,
    reqText: "Open a new checking account and make 10+ qualifying debit-card transactions within 60 days.",
    feeWaiver: "No monthly fee on eligible checking.",
    notes: "Membership: Cornerstone Community Financial CU (SE Michigan). No stated expiration.",
    excerpt: "$75 bonus with 10+ qualifying debit transactions within 60 days.",
    src: ["https://www.ccfinancial.com/"],
  },

  // ── MN ──────────────────────────────────────────────────────────────────────
  {
    id: "trustone-financial-500-checking-2026", bank: "TruStone Financial Credit Union", amount: 500, states: ["MN", "WI"],
    dd: 2000, ddWindow: 90, payout: 30, scope: "membership", membership: true, online: true, recheck: 30, type: "credit_union", lifetime: true,
    reqText: "Open a new checking account and complete qualifying direct deposits totaling $2,000+ within 90 days (up to $500 based on balance tiers).",
    feeWaiver: "No monthly fee on eligible checking.",
    notes: "Membership: TruStone Financial CU (MN/WI; open to anyone via $5 donation to affiliated charity). Tiered up-to-$500 bonus. No stated expiration.",
    excerpt: "Up to $500 bonus with qualifying direct deposits within 90 days.",
    src: ["https://www.trustonefinancial.org/"],
  },
  {
    id: "think-bank-200-checking-2026", bank: "Think Bank", amount: 200, states: ["MN"],
    dd: 500, ddWindow: 60, payout: 30, scope: "regional", membership: false, online: true, recheck: 14, type: "bank", exp: "2026-06-29", lifetime: true,
    reqText: "Open a new personal checking account and set up a qualifying direct deposit of $500+ within 60 days. Offer expires June 29, 2026.",
    feeWaiver: "No monthly fee on eligible checking.",
    notes: "Think Bank (Rochester, MN area). Expires 6/29/2026.",
    excerpt: "$200 bonus with qualifying direct deposit within 60 days. Expires June 29, 2026.",
    src: ["https://www.think.bank/"],
  },

  // ── MS ──────────────────────────────────────────────────────────────────────
  {
    id: "magnolia-fcu-100-checking-2026", bank: "Magnolia Federal Credit Union", amount: 100, states: ["MS"],
    dd: 250, ddWindow: 60, payout: 30, scope: "membership", membership: true, online: true, recheck: 30, type: "credit_union", lifetime: true,
    reqText: "Open a new checking account and set up a qualifying direct deposit of $250+ within 60 days.",
    feeWaiver: "No monthly fee on eligible checking.",
    notes: "Membership: Magnolia FCU (Mississippi). No stated expiration.",
    excerpt: "$100 bonus with qualifying direct deposit within 60 days.",
    src: ["https://www.magnoliafcu.com/"],
  },

  // ── MO ──────────────────────────────────────────────────────────────────────
  {
    id: "arsenal-cu-300-checking-2026", bank: "Arsenal Credit Union", amount: 300, states: ["MO", "IL"],
    dd: 500, ddWindow: 60, payout: 30, scope: "membership", membership: true, online: true, recheck: 30, type: "credit_union", lifetime: true,
    reqText: "Open a new checking account and set up a qualifying direct deposit of $500+ within 60 days.",
    feeWaiver: "No monthly fee on eligible checking.",
    notes: "Membership: Arsenal CU (St. Louis MO/IL metro area). No stated expiration.",
    excerpt: "$300 bonus with qualifying direct deposit within 60 days.",
    src: ["https://www.arsenalcu.com/"],
  },
  {
    id: "alltru-cu-300-checking-2026", bank: "Alltru Credit Union", amount: 300, states: ["MO"],
    dd: 500, ddWindow: 60, payout: 30, scope: "membership", membership: true, online: true, recheck: 30, type: "credit_union", lifetime: true,
    reqText: "Open a new checking account and set up a qualifying direct deposit of $500+ within 60 days.",
    feeWaiver: "No monthly fee on eligible checking.",
    notes: "Membership: Alltru CU (central Missouri). No stated expiration.",
    excerpt: "$300 bonus with qualifying direct deposit within 60 days.",
    src: ["https://www.alltrucu.org/"],
  },
  {
    id: "guaranty-bank-mo-300-checking-2026", bank: "Guaranty Bank (MO)", amount: 300, states: ["MO", "AR"],
    dd: 500, ddWindow: 60, payout: 30, scope: "regional", membership: false, online: true, recheck: 30, type: "bank", lifetime: true,
    reqText: "Open a new personal checking account and set up a qualifying direct deposit of $500+ within 60 days.",
    feeWaiver: "No monthly fee on eligible checking.",
    notes: "Guaranty Bank (MO/AR). No stated expiration.",
    excerpt: "$300 bonus with qualifying direct deposit within 60 days.",
    src: ["https://www.guarantybank.net/"],
  },
  {
    id: "academy-bank-500-checking-2026", bank: "Academy Bank", amount: 500, states: ["MO", "CO", "AZ", "KS"],
    dd: 2000, ddWindow: 60, payout: 30, scope: "regional", membership: false, online: true, recheck: 30, type: "bank", lifetime: true,
    reqText: "Open a new personal checking account and complete $2,000+ in qualifying direct deposits within 60 days.",
    feeWaiver: "No monthly fee on eligible checking.",
    notes: "Academy Bank (MO/CO/AZ/KS). No stated expiration.",
    excerpt: "$500 bonus with $2,000+ qualifying direct deposits within 60 days.",
    src: ["https://www.academybank.com/"],
  },

  // ── NH ──────────────────────────────────────────────────────────────────────
  {
    id: "bellwether-cu-300-checking-2026", bank: "Bellwether Community Credit Union", amount: 300, states: ["NH"],
    dd: 500, ddWindow: 60, payout: 30, scope: "membership", membership: true, online: true, recheck: 14, type: "credit_union", exp: "2026-06-30", lifetime: true,
    reqText: "Open a new checking account and set up a qualifying direct deposit of $500+ within 60 days. Offer expires June 30, 2026.",
    feeWaiver: "No monthly fee on eligible checking.",
    notes: "Membership: Bellwether Community CU (NH). Expires 6/30/2026.",
    excerpt: "$300 bonus with qualifying direct deposit within 60 days. Expires June 30, 2026.",
    src: ["https://www.bellwethercommunity.org/"],
  },

  // ── NJ ──────────────────────────────────────────────────────────────────────
  {
    id: "picatinny-fcu-250-checking-2026", bank: "Picatinny Federal Credit Union", amount: 250, states: ["NJ"],
    dd: 500, ddWindow: 60, payout: 30, scope: "membership", membership: true, online: true, recheck: 30, type: "credit_union", lifetime: true,
    reqText: "Open a new checking account and set up a qualifying direct deposit of $500+ within 60 days.",
    feeWaiver: "No monthly fee on eligible checking.",
    notes: "Membership: Picatinny FCU (NJ; military/DOD-affiliated; community membership pathway exists). No stated expiration.",
    excerpt: "$250 bonus with qualifying direct deposit within 60 days.",
    src: ["https://www.picatinnyfcu.com/"],
  },
  {
    id: "unity-bank-nj-300-checking-2026", bank: "Unity Bank (NJ)", amount: 300, states: ["NJ", "PA"],
    dd: 500, ddWindow: 90, payout: 30, scope: "regional", membership: false, online: true, recheck: 30, type: "bank", lifetime: true,
    reqText: "Open a new personal checking account and set up a qualifying direct deposit within 90 days. Higher tiers ($400) available with larger DD requirements.",
    feeWaiver: "No monthly fee on eligible checking.",
    notes: "Unity Bank (NJ/PA). Tiered up to $400. No stated expiration.",
    excerpt: "$300–$400 bonus with qualifying direct deposit within 90 days.",
    src: ["https://www.unitybank.com/"],
  },
  {
    id: "blue-foundry-bank-300-checking-2026", bank: "Blue Foundry Bank", amount: 300, states: ["NJ"],
    dd: 500, ddWindow: 60, payout: 30, scope: "regional", membership: false, online: true, recheck: 30, type: "bank", lifetime: true,
    reqText: "Open a new personal checking account and set up a qualifying direct deposit of $500+ within 60 days.",
    feeWaiver: "No monthly fee on eligible checking.",
    notes: "Blue Foundry Bank (NJ). No stated expiration.",
    excerpt: "$300 bonus with qualifying direct deposit within 60 days.",
    src: ["https://www.bluefoundry.com/"],
  },

  // ── NY ──────────────────────────────────────────────────────────────────────
  {
    id: "mcu-ny-350-checking-2026", bank: "Municipal Credit Union (NYC)", amount: 350, states: ["NY"],
    dd: 500, ddWindow: 60, payout: 30, scope: "membership", membership: true, online: true, recheck: 30, type: "credit_union", lifetime: true,
    reqText: "Open a new checking account and set up a qualifying direct deposit of $500+ within 60 days.",
    feeWaiver: "No monthly fee on eligible checking.",
    notes: "Membership: Municipal CU (NYC metro; NYC municipal employees and family). No stated expiration.",
    excerpt: "$350 bonus with qualifying direct deposit within 60 days.",
    src: ["https://www.nymcu.org/"],
  },
  {
    id: "walden-savings-bank-300-checking-2026", bank: "Walden Savings Bank", amount: 300, states: ["NY"],
    dd: 500, ddWindow: 60, payout: 30, scope: "regional", membership: false, online: true, recheck: 30, type: "bank", lifetime: true,
    reqText: "Open a new personal checking account and set up a qualifying direct deposit of $500+ within 60 days.",
    feeWaiver: "No monthly fee on eligible checking.",
    notes: "Walden Savings Bank (Hudson Valley, NY). No stated expiration.",
    excerpt: "$300 bonus with qualifying direct deposit within 60 days.",
    src: ["https://www.waldensavings.bank/"],
  },
  {
    id: "pioneer-bank-ny-200-checking-2026", bank: "Pioneer Bank (NY)", amount: 200, states: ["NY"],
    dd: 500, ddWindow: 60, payout: 30, scope: "regional", membership: false, online: true, recheck: 14, type: "bank", exp: "2026-07-31", lifetime: true,
    reqText: "Open a new personal checking account and set up a qualifying direct deposit of $500+ within 60 days. Offer expires July 31, 2026.",
    feeWaiver: "No monthly fee on eligible checking.",
    notes: "Pioneer Bank (Capital Region NY). Expires 7/31/2026.",
    excerpt: "$200 bonus with qualifying direct deposit within 60 days. Expires July 31, 2026.",
    src: ["https://www.pioneerbankny.com/"],
  },
  {
    id: "hvcu-400-checking-2026", bank: "Hudson Valley Credit Union", amount: 400, states: ["NY"],
    dd: 500, ddWindow: 60, payout: 30, scope: "membership", membership: true, online: true, recheck: 30, type: "credit_union", lifetime: true,
    reqText: "Open a new checking account and set up a qualifying direct deposit of $500+ within 60 days.",
    feeWaiver: "No monthly fee on eligible checking.",
    notes: "Membership: Hudson Valley CU (Hudson Valley NY). No stated expiration.",
    excerpt: "$400 bonus with qualifying direct deposit within 60 days.",
    src: ["https://www.hvcu.org/"],
  },
  {
    id: "first-heritage-fcu-100-checking-2026", bank: "First Heritage Federal Credit Union", amount: 100, states: ["NY"],
    dd: 250, ddWindow: 60, payout: 30, scope: "membership", membership: true, online: true, recheck: 30, type: "credit_union", lifetime: true,
    reqText: "Open a new checking account and set up a qualifying direct deposit of $250+ within 60 days.",
    feeWaiver: "No monthly fee on eligible checking.",
    notes: "Membership: First Heritage FCU (Corning/Elmira NY area). No stated expiration.",
    excerpt: "$100 bonus with qualifying direct deposit within 60 days.",
    src: ["https://www.firstheritagefcu.com/"],
  },
  {
    id: "americu-100-checking-2026", bank: "AmeriCU Credit Union", amount: 100, states: ["NY"],
    dd: 250, ddWindow: 60, payout: 30, scope: "membership", membership: true, online: true, recheck: 30, type: "credit_union", lifetime: true,
    reqText: "Open a new checking account and set up a qualifying direct deposit of $250+ within 60 days.",
    feeWaiver: "No monthly fee on eligible checking.",
    notes: "Membership: AmeriCU CU (Central NY, Rome/Utica area). No stated expiration.",
    excerpt: "$100 bonus with qualifying direct deposit within 60 days.",
    src: ["https://www.americu.org/"],
  },

  // ── ND ──────────────────────────────────────────────────────────────────────
  {
    id: "starion-bank-100-checking-2026", bank: "Starion Bank", amount: 100, states: ["ND", "WI"],
    dd: 500, ddWindow: 60, payout: 30, scope: "regional", membership: false, online: true, recheck: 30, type: "bank", lifetime: true,
    reqText: "Open a new personal checking account and set up a qualifying direct deposit of $500+ within 60 days.",
    feeWaiver: "No monthly fee on eligible checking.",
    notes: "Starion Bank (ND/WI). No stated expiration.",
    excerpt: "$100 bonus with qualifying direct deposit within 60 days.",
    src: ["https://www.starionbank.com/"],
  },

  // ── OH ──────────────────────────────────────────────────────────────────────
  {
    id: "bmi-fcu-200-checking-2026", bank: "BMI Federal Credit Union", amount: 200, states: ["OH"],
    dd: 500, ddWindow: 60, payout: 30, scope: "membership", membership: true, online: true, recheck: 14, type: "credit_union", exp: "2026-06-30", lifetime: true,
    reqText: "Open a new checking account and set up a qualifying direct deposit of $500+ within 60 days. Offer expires June 30, 2026.",
    feeWaiver: "No monthly fee on eligible checking.",
    notes: "Membership: BMI FCU (Ohio; membership through Ohio manufacturing/BMI connection). Expires 6/30/2026.",
    excerpt: "$200 bonus with qualifying direct deposit within 60 days. Expires June 30, 2026.",
    src: ["https://www.bmifcu.org/"],
  },

  // ── OR ──────────────────────────────────────────────────────────────────────
  {
    id: "oregon-state-cu-300-checking-2026", bank: "Oregon State Credit Union", amount: 300, states: ["OR"],
    dd: 500, ddWindow: 60, payout: 30, scope: "membership", membership: true, online: true, recheck: 30, type: "credit_union", lifetime: true,
    reqText: "Open a new checking account and set up a qualifying direct deposit of $500+ within 60 days.",
    feeWaiver: "No monthly fee on eligible checking.",
    notes: "Membership: Oregon State CU (statewide OR; FOM includes anyone who lives/works in OR). No stated expiration.",
    excerpt: "$300 bonus with qualifying direct deposit within 60 days.",
    src: ["https://www.oregonstatecu.com/"],
  },

  // ── PA ──────────────────────────────────────────────────────────────────────
  {
    id: "first-commonwealth-bank-400-checking-2026", bank: "First Commonwealth Bank", amount: 400, states: ["PA", "OH"],
    dd: 1000, ddWindow: 60, payout: 30, scope: "regional", membership: false, online: true, recheck: 30, type: "bank", lifetime: true,
    reqText: "Open a new personal checking account and complete $1,000+ in qualifying direct deposits within 60 days.",
    feeWaiver: "No monthly fee on eligible checking.",
    notes: "First Commonwealth Bank (PA/OH). No stated expiration.",
    excerpt: "$400 bonus with $1,000+ qualifying direct deposits within 60 days.",
    src: ["https://www.fcbanking.com/"],
  },
  {
    id: "s-and-t-bank-300-checking-2026", bank: "S&T Bank", amount: 300, states: ["PA", "OH"],
    dd: 500, ddWindow: 60, payout: 30, scope: "regional", membership: false, online: true, recheck: 30, type: "bank", lifetime: true,
    reqText: "Open a new personal checking account and set up a qualifying direct deposit of $500+ within 60 days.",
    feeWaiver: "No monthly fee on eligible checking.",
    notes: "S&T Bank (PA/OH). No stated expiration.",
    excerpt: "$300 bonus with qualifying direct deposit within 60 days.",
    src: ["https://www.stbank.com/"],
  },
  {
    id: "clearview-fcu-412-checking-2026", bank: "Clearview Federal Credit Union", amount: 412, states: ["PA"],
    dd: 500, ddWindow: 60, payout: 30, scope: "membership", membership: true, online: true, recheck: 30, type: "credit_union", lifetime: true,
    reqText: "Open a new checking account and set up a qualifying direct deposit of $500+ within 60 days.",
    feeWaiver: "No monthly fee on eligible checking.",
    notes: "Membership: Clearview FCU (western PA; open to anyone who lives/works/worships in Allegheny/Butler/Lawrence/Beaver/Washington/Westmoreland counties, plus family). No stated expiration.",
    excerpt: "$412 bonus with qualifying direct deposit within 60 days.",
    src: ["https://www.clearviewfcu.org/"],
  },
  {
    id: "usx-fcu-100-checking-2026", bank: "USX Federal Credit Union", amount: 100, states: ["PA"],
    dd: 250, ddWindow: 60, payout: 30, scope: "membership", membership: true, online: true, recheck: 30, type: "credit_union", lifetime: true,
    reqText: "Open a new checking account and set up a qualifying direct deposit of $250+ within 60 days.",
    feeWaiver: "No monthly fee on eligible checking.",
    notes: "Membership: USX FCU (greater Pittsburgh PA area; steel/manufacturing connection or community). No stated expiration.",
    excerpt: "$100 bonus with qualifying direct deposit within 60 days.",
    src: ["https://www.usxfcu.org/"],
  },
  {
    id: "people-first-fcu-pa-250-checking-2026", bank: "People First Federal Credit Union (PA)", amount: 250, states: ["PA"],
    dd: 500, ddWindow: 60, payout: 30, scope: "membership", membership: true, online: true, recheck: 30, type: "credit_union", lifetime: true,
    reqText: "Open a new checking account and set up a qualifying direct deposit of $500+ within 60 days.",
    feeWaiver: "No monthly fee on eligible checking.",
    notes: "Membership: People First FCU (Allentown/Lehigh Valley PA area). No stated expiration.",
    excerpt: "$250 bonus with qualifying direct deposit within 60 days.",
    src: ["https://www.peoplefirstfcu.com/"],
  },
  {
    id: "first-commonwealth-fcu-400-checking-2026", bank: "First Commonwealth Federal Credit Union", amount: 400, states: ["PA"],
    dd: 500, ddWindow: 60, payout: 30, scope: "membership", membership: true, online: true, recheck: 30, type: "credit_union", lifetime: true,
    reqText: "Open a new checking account and set up a qualifying direct deposit of $500+ within 60 days.",
    feeWaiver: "No monthly fee on eligible checking.",
    notes: "Membership: First Commonwealth FCU (Lehigh Valley PA; open to Lehigh Valley/Monroe County residents). No stated expiration.",
    excerpt: "$400 bonus with qualifying direct deposit within 60 days.",
    src: ["https://www.firstcomcu.org/"],
  },
  {
    id: "embassy-bank-pa-150-checking-2026", bank: "Embassy Bank", amount: 150, states: ["PA"],
    dd: 500, ddWindow: 60, payout: 30, scope: "regional", membership: false, online: true, recheck: 30, type: "bank", lifetime: true,
    reqText: "Open a new personal checking account and set up a qualifying direct deposit of $500+ within 60 days.",
    feeWaiver: "No monthly fee on eligible checking.",
    notes: "Embassy Bank (Lehigh Valley PA). No stated expiration.",
    excerpt: "$150 bonus with qualifying direct deposit within 60 days.",
    src: ["https://www.embassybank.com/"],
  },
  {
    id: "cn-bank-pa-400-checking-2026", bank: "C&N Bank", amount: 400, states: ["PA"],
    dd: 1000, ddWindow: 60, payout: 30, scope: "regional", membership: false, online: true, recheck: 30, type: "bank", lifetime: true,
    reqText: "Open a new personal checking account and complete $1,000+ in qualifying direct deposits within 60 days.",
    feeWaiver: "No monthly fee on eligible checking.",
    notes: "C&N Bank (Citizens & Northern; north-central PA). No stated expiration.",
    excerpt: "$400 bonus with $1,000+ qualifying direct deposits within 60 days.",
    src: ["https://www.cnbankpa.com/"],
  },
  {
    id: "service-1st-fcu-300-checking-2026", bank: "Service 1st Federal Credit Union", amount: 300, states: ["PA"],
    dd: 500, ddWindow: 60, payout: 30, scope: "membership", membership: true, online: true, recheck: 14, type: "credit_union", exp: "2026-06-30", lifetime: true,
    reqText: "Open a new checking account and set up a qualifying direct deposit of $500+ within 60 days. Offer expires June 30, 2026.",
    feeWaiver: "No monthly fee on eligible checking.",
    notes: "Membership: Service 1st FCU (Danville/Bloomsburg PA area). Expires 6/30/2026.",
    excerpt: "$300 bonus with qualifying direct deposit within 60 days. Expires June 30, 2026.",
    src: ["https://www.service1st.org/"],
  },

  // ── RI ──────────────────────────────────────────────────────────────────────
  {
    id: "washington-trust-ri-200-checking-2026", bank: "Washington Trust Company (RI)", amount: 200, states: ["RI"],
    dd: 500, ddWindow: 60, payout: 30, scope: "regional", membership: false, online: true, recheck: 30, type: "bank", lifetime: true,
    reqText: "Open a new personal checking account and set up a qualifying direct deposit of $500+ within 60 days.",
    feeWaiver: "No monthly fee on eligible checking.",
    notes: "Washington Trust Company (Rhode Island). No stated expiration.",
    excerpt: "$200 bonus with qualifying direct deposit within 60 days.",
    src: ["https://www.washtrust.com/"],
  },

  // ── SC ──────────────────────────────────────────────────────────────────────
  {
    id: "carolina-trust-fcu-300-checking-2026", bank: "Carolina Trust Federal Credit Union", amount: 300, states: ["SC"],
    dd: 500, ddWindow: 60, payout: 30, scope: "membership", membership: true, online: true, recheck: 14, type: "credit_union", exp: "2026-08-31", lifetime: true,
    reqText: "Open a new checking account and set up a qualifying direct deposit of $500+ within 60 days. Offer expires August 31, 2026.",
    feeWaiver: "No monthly fee on eligible checking.",
    notes: "Membership: Carolina Trust FCU (Myrtle Beach/Horry County SC area). Expires 8/31/2026.",
    excerpt: "$300 bonus with qualifying direct deposit within 60 days. Expires August 31, 2026.",
    src: ["https://www.carolinatrustfcu.com/"],
  },
  {
    id: "rev-fcu-250-checking-2026", bank: "REV Federal Credit Union", amount: 250, states: ["SC"],
    dd: 500, ddWindow: 60, payout: 30, scope: "membership", membership: true, online: true, recheck: 30, type: "credit_union", lifetime: true,
    reqText: "Open a new checking account and set up a qualifying direct deposit of $500+ within 60 days.",
    feeWaiver: "No monthly fee on eligible checking.",
    notes: "Membership: REV FCU (Spartanburg/Upstate SC area). No stated expiration.",
    excerpt: "$250 bonus with qualifying direct deposit within 60 days.",
    src: ["https://www.revfcu.com/"],
  },

  // ── SD ──────────────────────────────────────────────────────────────────────
  {
    id: "fnbsf-350-checking-2026", bank: "First National Bank Sioux Falls", amount: 350, states: ["SD"],
    dd: 500, ddWindow: 60, payout: 30, scope: "regional", membership: false, online: true, recheck: 14, type: "bank", exp: "2026-09-30", lifetime: true,
    reqText: "Open a new personal checking account and set up a qualifying direct deposit of $500+ within 60 days. Offer expires September 30, 2026.",
    feeWaiver: "No monthly fee on eligible checking.",
    notes: "First National Bank Sioux Falls (SD). Expires 9/30/2026.",
    excerpt: "$350 bonus with qualifying direct deposit within 60 days. Expires September 30, 2026.",
    src: ["https://www.fnbsf.com/"],
  },

  // ── TN ──────────────────────────────────────────────────────────────────────
  {
    id: "first-horizon-bank-700-checking-2026", bank: "First Horizon Bank", amount: 700, states: ["TN", "MS", "AL", "GA", "FL", "SC", "NC", "VA", "TX", "LA"],
    dd: 2000, ddWindow: 90, payout: 30, scope: "regional", membership: false, online: true, recheck: 30, type: "bank", lifetime: true,
    reqText: "Open a new personal checking account and complete qualifying direct deposits totaling $2,000+ within 90 days (up to $700 based on tiers).",
    feeWaiver: "No monthly fee on eligible checking.",
    notes: "First Horizon Bank (multi-state: TN/MS/AL/GA/FL/SC/NC/VA/TX/LA). Tiered up-to-$700 bonus. No stated expiration.",
    excerpt: "Up to $700 bonus with $2,000+ qualifying direct deposits within 90 days.",
    src: ["https://www.firsthorizon.com/"],
  },

  // ── TX ──────────────────────────────────────────────────────────────────────
  {
    id: "gecu-el-paso-300-checking-2026", bank: "GECU (El Paso)", amount: 300, states: ["TX"],
    dd: 500, ddWindow: 60, payout: 30, scope: "membership", membership: true, online: true, recheck: 30, type: "credit_union", lifetime: true,
    reqText: "Open a new checking account and set up a qualifying direct deposit of $500+ within 60 days.",
    feeWaiver: "No monthly fee on eligible checking.",
    notes: "Membership: GECU (El Paso TX area; open to El Paso County residents, their family, or those who work/worship in El Paso County). No stated expiration.",
    excerpt: "$300 bonus with qualifying direct deposit within 60 days.",
    src: ["https://www.gecu.com/"],
  },
  {
    id: "schertz-bank-trust-300-checking-2026", bank: "Schertz Bank & Trust", amount: 300, states: ["TX"],
    dd: 500, ddWindow: 60, payout: 30, scope: "regional", membership: false, online: true, recheck: 30, type: "bank", lifetime: true,
    reqText: "Open a new personal checking account and set up a qualifying direct deposit of $500+ within 60 days.",
    feeWaiver: "No monthly fee on eligible checking.",
    notes: "Schertz Bank & Trust (San Antonio metro TX). No stated expiration.",
    excerpt: "$300 bonus with qualifying direct deposit within 60 days.",
    src: ["https://www.schertzbank.com/"],
  },
  {
    id: "members-choice-cu-tx-300-checking-2026", bank: "Members Choice Credit Union (TX)", amount: 300, states: ["TX"],
    dd: 500, ddWindow: 60, payout: 30, scope: "membership", membership: true, online: true, recheck: 30, type: "credit_union", lifetime: true,
    reqText: "Open a new checking account and set up a qualifying direct deposit of $500+ within 60 days.",
    feeWaiver: "No monthly fee on eligible checking.",
    notes: "Membership: Members Choice CU (Houston TX area). No stated expiration.",
    excerpt: "$300 bonus with qualifying direct deposit within 60 days.",
    src: ["https://www.mccu.com/"],
  },
  {
    id: "broadway-bank-tx-300-checking-2026", bank: "Broadway Bank (TX)", amount: 300, states: ["TX"],
    dd: 500, ddWindow: 60, payout: 30, scope: "regional", membership: false, online: true, recheck: 30, type: "bank", lifetime: true,
    reqText: "Open a new personal checking account and set up a qualifying direct deposit of $500+ within 60 days.",
    feeWaiver: "No monthly fee on eligible checking.",
    notes: "Broadway Bank (San Antonio TX). No stated expiration.",
    excerpt: "$300 bonus with qualifying direct deposit within 60 days.",
    src: ["https://www.broadwaybank.com/"],
  },
  {
    id: "texas-capital-bank-200-checking-2026", bank: "Texas Capital Bank", amount: 200, states: ["TX"],
    dd: 500, ddWindow: 60, payout: 30, scope: "regional", membership: false, online: true, recheck: 14, type: "bank", exp: "2026-06-30", lifetime: true,
    reqText: "Open a new personal checking account and set up a qualifying direct deposit of $500+ within 60 days. Offer expires June 30, 2026.",
    feeWaiver: "No monthly fee on eligible checking.",
    notes: "Texas Capital Bank (TX). Expires 6/30/2026.",
    excerpt: "$200 bonus with qualifying direct deposit within 60 days. Expires June 30, 2026.",
    src: ["https://www.texascapitalbank.com/"],
  },
  {
    id: "pecu-tx-200-checking-2026", bank: "PECU (TX)", amount: 200, states: ["TX"],
    dd: 500, ddWindow: 60, payout: 30, scope: "membership", membership: true, online: true, recheck: 30, type: "credit_union", lifetime: true,
    reqText: "Open a new checking account and set up a qualifying direct deposit of $500+ within 60 days.",
    feeWaiver: "No monthly fee on eligible checking.",
    notes: "Membership: PECU (Austin TX area). No stated expiration.",
    excerpt: "$200 bonus with qualifying direct deposit within 60 days.",
    src: ["https://www.pecu.com/"],
  },
  {
    id: "credit-union-of-texas-250-checking-2026", bank: "Credit Union of Texas", amount: 250, states: ["TX"],
    dd: 500, ddWindow: 60, payout: 30, scope: "membership", membership: true, online: true, recheck: 30, type: "credit_union", lifetime: true,
    reqText: "Open a new checking account and set up a qualifying direct deposit of $500+ within 60 days.",
    feeWaiver: "No monthly fee on eligible checking.",
    notes: "Membership: Credit Union of Texas (DFW TX area; open through Texas Consumer Council). No stated expiration.",
    excerpt: "$250 bonus with qualifying direct deposit within 60 days.",
    src: ["https://www.cutx.org/"],
  },

  // ── UT ──────────────────────────────────────────────────────────────────────
  {
    id: "cyprus-cu-300-checking-2026", bank: "Cyprus Credit Union", amount: 300, states: ["UT"],
    dd: 500, ddWindow: 60, payout: 30, scope: "membership", membership: true, online: true, recheck: 14, type: "credit_union", exp: "2026-07-31", lifetime: true,
    reqText: "Open a new checking account and set up a qualifying direct deposit of $500+ within 60 days. Offer expires July 31, 2026.",
    feeWaiver: "No monthly fee on eligible checking.",
    notes: "Membership: Cyprus CU (Salt Lake Valley UT; open to Salt Lake/Tooele County residents). Expires 7/31/2026.",
    excerpt: "$300 bonus with qualifying direct deposit within 60 days. Expires July 31, 2026.",
    src: ["https://www.cypruscu.com/"],
  },
  {
    id: "ufirst-cu-500-checking-2026", bank: "UFirst Credit Union", amount: 500, states: ["UT"],
    dd: 1500, ddWindow: 90, payout: 30, scope: "membership", membership: true, online: true, recheck: 30, type: "credit_union", lifetime: true,
    reqText: "Open a new checking account and complete qualifying direct deposits totaling $1,500+ within 90 days.",
    feeWaiver: "No monthly fee on eligible checking.",
    notes: "Membership: UFirst CU (Utah; open to UT residents via community group). No stated expiration.",
    excerpt: "$500 bonus with $1,500+ qualifying direct deposits within 90 days.",
    src: ["https://www.ufirstcu.com/"],
  },

  // ── WA ──────────────────────────────────────────────────────────────────────
  {
    id: "numerica-cu-300-checking-2026", bank: "Numerica Credit Union", amount: 300, states: ["WA", "ID"],
    dd: 500, ddWindow: 60, payout: 30, scope: "membership", membership: true, online: true, recheck: 30, type: "credit_union", lifetime: true,
    reqText: "Open a new checking account and set up a qualifying direct deposit of $500+ within 60 days.",
    feeWaiver: "No monthly fee on eligible checking.",
    notes: "Membership: Numerica CU (Eastern WA / Northern ID). No stated expiration.",
    excerpt: "$300 bonus with qualifying direct deposit within 60 days.",
    src: ["https://www.numericacu.com/"],
  },
  {
    id: "horizon-cu-wa-200-checking-2026", bank: "Horizon Credit Union (WA)", amount: 200, states: ["WA", "ID"],
    dd: 500, ddWindow: 60, payout: 30, scope: "membership", membership: true, online: true, recheck: 30, type: "credit_union", lifetime: true,
    reqText: "Open a new checking account and set up a qualifying direct deposit of $500+ within 60 days.",
    feeWaiver: "No monthly fee on eligible checking.",
    notes: "Membership: Horizon CU (Eastern WA/ID). No stated expiration.",
    excerpt: "$200 bonus with qualifying direct deposit within 60 days.",
    src: ["https://www.horizoncu.com/"],
  },
  {
    id: "verity-cu-150-checking-2026", bank: "Verity Credit Union", amount: 150, states: ["WA"],
    dd: 500, ddWindow: 60, payout: 30, scope: "membership", membership: true, online: true, recheck: 30, type: "credit_union", lifetime: true,
    reqText: "Open a new checking account and set up a qualifying direct deposit of $500+ within 60 days.",
    feeWaiver: "No monthly fee on eligible checking.",
    notes: "Membership: Verity CU (Seattle/King County WA area). No stated expiration.",
    excerpt: "$150 bonus with qualifying direct deposit within 60 days.",
    src: ["https://www.veritycu.com/"],
  },

  // ── WV ──────────────────────────────────────────────────────────────────────
  {
    id: "city-national-bank-wv-200-checking-2026", bank: "City National Bank (WV)", amount: 200, states: ["WV"],
    dd: 200, ddWindow: 90, payout: 91, open: 25, scope: "regional", membership: false, online: true, recheck: 30, type: "bank", lifetime: true,
    reqText: "Open a new personal checking account ($25 min) and set up a recurring direct deposit of $200+ within 90 days. Bonus posts on day 91.",
    feeWaiver: "No monthly fee on eligible checking.",
    notes: "City National Bank WV (bankatcity.com; WV-based, not CIT/City National CA). One per household; not for existing customers; 'limited time offer' with no published end date.",
    excerpt: "Open new checking; direct deposit ≥$200 recurring within 90 days; bonus posts day 91.",
    src: ["https://www.bankatcity.com/personal-banking/checking/"],
  },

  // ── WI ──────────────────────────────────────────────────────────────────────
  {
    id: "pyramax-bank-300-checking-2026", bank: "PyraMax Bank", amount: 300, states: ["WI"],
    dd: 300, ddWindow: 90, ddCount: 2, payout: 30, mustOpen: 120, scope: "regional", membership: false, online: true, recheck: 14, type: "bank", exp: "2026-12-31", lifetime: true,
    reqText: "Open a new Simply Cash Back Checking ($25 min; promo code BONUS300) and set up a recurring direct deposit of $300+/month for 2 consecutive months within 90 days. Account must remain open 120+ days. Limit 1 per household; no PyraMax checking in past 12 months.",
    feeWaiver: "No monthly fee on eligible checking.",
    notes: "PyraMax Bank (Milwaukee WI). Two simultaneous offers: BONUS300 ($300 DD-based, expires 12/31/2026) and BONUS100 ($100 no-DD, expires 8/31/2026). This seed covers the $300 DD offer.",
    excerpt: "$300/month recurring DD for 2 consecutive months within 90 days; account open 120+ days.",
    src: ["https://pyramaxbank.com/simply-cash-back-checking-account.html"],
  },
  {
    id: "town-bank-wi-300-checking-2026", bank: "Town Bank (Wintrust WI)", amount: 300, states: ["WI"],
    dd: 500, ddWindow: 60, ddCount: 2, payout: 30, scope: "regional", membership: false, online: true, recheck: 30, type: "bank", lifetime: true,
    reqText: "Open a new Total Access or Premier Checking ($100 min) and make 2 consecutive months of qualifying direct deposits of $500+/month starting the month after opening. Enroll in online banking & eStatements.",
    feeWaiver: "No monthly fee on eligible checking.",
    notes: "Town Bank (Wintrust subsidiary, WI). DD $500/mo = $300; $2,000/mo = $500. No stated end date. (Wintrust Bank IL is a separate seed.)",
    excerpt: "2 consecutive months of DD $500+/mo after open month = $300 bonus.",
    src: ["https://www.townbank.us/personal/banking-and-borrowing/checking/total-access-checking.html"],
  },
  {
    id: "waukesha-state-bank-250-checking-2026", bank: "Waukesha State Bank", amount: 250, states: ["WI"],
    open: 100, payout: 10, scope: "regional", membership: false, online: true, recheck: 14, type: "bank", exp: "2026-12-31", lifetime: true,
    reqText: "Open a new personal checking account ($100 min; promo code DDA250FB26 online or DDA250GEO26 digital). No direct deposit required. Bonus deposited within 10 days. One per person; no prior Waukesha State checking or prior promo.",
    feeWaiver: "No monthly fee on eligible checking.",
    notes: "Waukesha State Bank (WI). No DD required — rare easy qualifier. Expires 12/31/2026.",
    excerpt: "Open new checking ($100 min; promo code DDA250FB26); no DD required; bonus deposited within 10 days.",
    src: ["https://www.waukeshabank.com/checking-promotion"],
  },
]

/**
 * Banks already covered by an existing state-restricted row in `./bonuses.ts`.
 * Their seeds are retained above as freshly-verified (2026-06-12) research
 * records, but EXCLUDED from the live export so a state page never lists the
 * same institution twice. (The base-catalog rows may carry different
 * amounts/deadlines — see stateBankBonuses.RESEARCH.md "Superseded" section for
 * which to reconcile on the next refresh.) M&T personal and Provident CU (CA)
 * are intentionally kept: the base catalog's M&T rows are business-only, and
 * Provident Credit Union (CA) is a different institution from Provident Bank (NJ).
 */
const SUPERSEDED_BY_BASE_CATALOG = new Set<string>([
  "banner-bank-500-checking-2026",
  "visions-fcu-500-checking-2026",
  "berkshire-bank-300-checking-2026",
  "becu-150-new-member-2026",
  "delta-community-cu-250-checking-2026",
  "fifth-third-bank-350-checking-2026",
  "grow-financial-fcu-300-checking-2026",
  "hancock-whitney-600-checking-savings-2026",
  "huntington-bank-600-checking-2026",
  "midflorida-cu-400-checking-2026",
  "provident-bank-nj-300-checking-2026",
  "seacoast-bank-300-checking-2026",
  "south-state-bank-200-checking-2026",
  "florida-cu-300-checking-2026",
  "alltru-cu-300-checking-2026",
  "numerica-cu-300-checking-2026",
])

export const stateBankBonuses: StateCheckingRow[] = SEEDS
  .filter(s => !SUPERSEDED_BY_BASE_CATALOG.has(s.id))
  .map(build)
