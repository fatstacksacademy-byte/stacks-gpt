/**
 * Shared per-state institution inventory — the canonical discovery + review log.
 *
 * Built so a combined card+deposit sweep (see ./SWEEP.md) never re-runs NCUA/FDIC
 * discovery: read this list first, check only what's stale, and APPEND newly-found
 * institutions. Each row records, per institution, the last review date and the
 * outcome for BOTH products (deposit bonus + credit card), cross-linked to the
 * live-catalog id when an offer is active.
 *
 * Seeded 2026-06-12 from the institutions that surfaced an offer in the bank-bonus
 * sweep (../stateBankBonuses.ts, ../hawaiiBankBonuses.ts, ../recurringBankOffers.ts).
 * `card` is "not_checked" on every seed row because that sweep only verified
 * deposit products — the combined sweep fills card outcomes going forward. This is
 * a GROWING file: it is NOT exhaustive yet (no-offer institutions reviewed in the
 * sweep aren't all captured). Append as each state gets a Hawaii-depth pass.
 */

export type SweepOutcome =
  | "active"       // a live offer exists (see *_offer_id)
  | "expired"      // ran before; watch for renewal (see recurringBankOffers.ts)
  | "targeted"     // exists but invitation/mailer/employer-only, not publicly claimable
  | "unverified"   // discoverable but could not be confirmed on an official page
  | "none"         // reviewed, no offer
  | "not_checked"  // not yet reviewed for this product

export type StateInstitution = {
  name: string
  domain: string
  type: "bank" | "credit_union"
  /** Postal codes where it operates / its offers are available. */
  states: string[]
  /** ISO date this institution was last reviewed for any product. */
  reviewed: string
  deposit: SweepOutcome
  deposit_offer_id?: string
  card: SweepOutcome
  card_offer_id?: string
  notes?: string
}

export const stateInstitutions: StateInstitution[] = [
  { name: "Redstone Federal Credit Union", domain: "redfcu.org", type: "credit_union", states: ["AL","TN"], reviewed: "2026-06-12", deposit: "expired", card: "not_checked", notes: "renewal watch — see recurringBankOffers.ts" },
  { name: "Valley Bank", domain: "valley.com", type: "bank", states: ["AL","FL","NJ","NY"], reviewed: "2026-06-12", deposit: "active", deposit_offer_id: "valley-bank-100-checking-2026", card: "not_checked" },
  { name: "Arkansas Federal Credit Union", domain: "afcu.org", type: "credit_union", states: ["AR"], reviewed: "2026-06-12", deposit: "expired", card: "not_checked", notes: "renewal watch — see recurringBankOffers.ts" },
  { name: "Simmons Bank", domain: "simmonsbank.com", type: "bank", states: ["AR","KS","MO","OK","TN","TX"], reviewed: "2026-06-12", deposit: "expired", card: "not_checked", notes: "renewal watch — see recurringBankOffers.ts" },
  { name: "Telcoe Federal Credit Union", domain: "telcoe.com", type: "credit_union", states: ["AR"], reviewed: "2026-06-12", deposit: "expired", card: "not_checked", notes: "renewal watch — see recurringBankOffers.ts" },
  { name: "America First Credit Union", domain: "americafirst.com", type: "credit_union", states: ["AZ","ID","NM","NV","OR","UT"], reviewed: "2026-06-12", deposit: "active", deposit_offer_id: "america-first-cu-350-checking-2026", card: "not_checked" },
  { name: "Arizona Financial Credit Union", domain: "arizonafinancial.org", type: "credit_union", states: ["AZ"], reviewed: "2026-06-12", deposit: "active", deposit_offer_id: "arizona-financial-cu-300-checking-2026", card: "not_checked" },
  { name: "Bankers Trust", domain: "bankerstrust.com", type: "bank", states: ["AZ","IA","NE"], reviewed: "2026-06-12", deposit: "active", deposit_offer_id: "bankers-trust-400-checking-2026", card: "not_checked" },
  { name: "Bell Bank", domain: "bell.bank", type: "bank", states: ["AZ","MN","ND"], reviewed: "2026-06-12", deposit: "active", deposit_offer_id: "bell-bank-100-checking-2026", card: "not_checked" },
  { name: "Desert Financial Credit Union", domain: "desertfinancial.com", type: "credit_union", states: ["AZ"], reviewed: "2026-06-12", deposit: "active", deposit_offer_id: "desert-financial-cu-200-checking-2026", card: "not_checked" },
  { name: "Vantage West Credit Union", domain: "vantagewest.org", type: "credit_union", states: ["AZ"], reviewed: "2026-06-12", deposit: "active", deposit_offer_id: "vantage-west-cu-100-checking-2026", card: "not_checked" },
  { name: "Banner Bank", domain: "bannerbank.com", type: "bank", states: ["CA","ID","OR","WA"], reviewed: "2026-06-12", deposit: "active", deposit_offer_id: "banner-bank-500-checking-2026", card: "not_checked" },
  { name: "First Tech Federal Credit Union", domain: "firsttechfed.com", type: "credit_union", states: ["CA","OR","WA"], reviewed: "2026-06-12", deposit: "active", deposit_offer_id: "first-tech-fcu-500-checking-2026", card: "not_checked" },
  { name: "Patelco Credit Union", domain: "patelco.org", type: "credit_union", states: ["CA"], reviewed: "2026-06-12", deposit: "active", deposit_offer_id: "patelco-cu-50-referral-2026", card: "not_checked" },
  { name: "Provident Credit Union", domain: "providentcu.org", type: "credit_union", states: ["CA"], reviewed: "2026-06-12", deposit: "active", deposit_offer_id: "provident-cu-475-checking-2026", card: "not_checked" },
  { name: "SAFE Credit Union", domain: "safecu.org", type: "credit_union", states: ["CA"], reviewed: "2026-06-12", deposit: "expired", card: "not_checked", notes: "renewal watch — see recurringBankOffers.ts" },
  { name: "Bellco Credit Union", domain: "bellco.org", type: "credit_union", states: ["CO"], reviewed: "2026-06-12", deposit: "active", deposit_offer_id: "bellco-cu-300-checking-2026", card: "not_checked" },
  { name: "Ent Credit Union", domain: "ent.com", type: "credit_union", states: ["CO"], reviewed: "2026-06-12", deposit: "active", deposit_offer_id: "ent-cu-200-checking-2026", card: "not_checked" },
  { name: "First Interstate Bank", domain: "firstinterstatebank.com", type: "bank", states: ["CO","ID","MT","ND","SD","WY"], reviewed: "2026-06-12", deposit: "expired", card: "not_checked", notes: "renewal watch — see recurringBankOffers.ts" },
  { name: "Huntington Bank", domain: "huntington.com", type: "bank", states: ["CO","IL","IN","KY","MI","MN","NC","OH","PA","SC","TX","WI","WV"], reviewed: "2026-06-12", deposit: "active", deposit_offer_id: "huntington-400-perks-checking-2026", card: "not_checked" },
  { name: "Liberty Bank", domain: "liberty-bank.com", type: "bank", states: ["CT"], reviewed: "2026-06-12", deposit: "expired", card: "not_checked", notes: "renewal watch — see recurringBankOffers.ts" },
  { name: "M&T Bank", domain: "checking.mtb.com", type: "bank", states: ["CT","DC","DE","MD","NJ","NY","PA","VA","WV"], reviewed: "2026-06-12", deposit: "active", deposit_offer_id: "mt-bank-250-checking-2026", card: "not_checked" },
  { name: "Lafayette Federal Credit Union", domain: "lfcu.org", type: "credit_union", states: ["DC","MD","VA"], reviewed: "2026-06-12", deposit: "expired", card: "not_checked", notes: "renewal watch — see recurringBankOffers.ts" },
  { name: "SECU Maryland", domain: "secumd.org", type: "credit_union", states: ["DC","DE","MD","PA","VA","WV"], reviewed: "2026-06-12", deposit: "active", deposit_offer_id: "secu-md-350-checking-2026", card: "not_checked" },
  { name: "Tower Federal Credit Union", domain: "towerfcu.org", type: "credit_union", states: ["DC","MD","VA"], reviewed: "2026-06-12", deposit: "active", deposit_offer_id: "tower-fcu-75-checking-2026", card: "not_checked" },
  { name: "Achieva Credit Union", domain: "achievacu.com", type: "credit_union", states: ["FL"], reviewed: "2026-06-12", deposit: "active", deposit_offer_id: "achieva-cu-50-checking-2026", card: "not_checked" },
  { name: "Addition Financial Credit Union", domain: "additionfi.com", type: "credit_union", states: ["FL"], reviewed: "2026-06-12", deposit: "active", deposit_offer_id: "addition-financial-cu-100-checking-2026", card: "not_checked" },
  { name: "FAIRWINDS Credit Union", domain: "fairwinds.org", type: "credit_union", states: ["FL"], reviewed: "2026-06-12", deposit: "active", deposit_offer_id: "fairwinds-cu-50-checking-2026", card: "not_checked" },
  { name: "Fifth Third Bank", domain: "53.com", type: "bank", states: ["FL","GA","IL","IN","KY","MI","NC","OH","SC","TN","WV"], reviewed: "2026-06-12", deposit: "active", deposit_offer_id: "fifth-third-400-checking-2026", card: "not_checked" },
  { name: "GTE Financial", domain: "gtefinancial.org", type: "bank", states: ["FL"], reviewed: "2026-06-12", deposit: "expired", card: "not_checked", notes: "renewal watch — see recurringBankOffers.ts" },
  { name: "Wings Credit Union", domain: "wingscu.com", type: "credit_union", states: ["FL","GA","MI","MN","WI"], reviewed: "2026-06-12", deposit: "active", deposit_offer_id: "wings-cu-500-checking-2026", card: "not_checked" },
  { name: "Delta Community Credit Union", domain: "deltacommunitycu.com", type: "credit_union", states: ["GA"], reviewed: "2026-06-12", deposit: "active", deposit_offer_id: "delta-community-200-checking-2026", card: "not_checked" },
  { name: "Georgia's Own Credit Union", domain: "georgiasown.org", type: "credit_union", states: ["GA"], reviewed: "2026-06-12", deposit: "active", deposit_offer_id: "georgias-own-cu-240-checking-2026", card: "not_checked" },
  { name: "Robins Financial Credit Union", domain: "robinsfcu.org", type: "credit_union", states: ["GA"], reviewed: "2026-06-12", deposit: "active", deposit_offer_id: "robins-financial-cu-200-checking-2026", card: "not_checked" },
  { name: "Aloha Pacific Federal Credit Union", domain: "alohapacific.com", type: "credit_union", states: ["HI"], reviewed: "2026-06-11", deposit: "active", deposit_offer_id: "aloha-pacific-fcu-direct-deposit-100-2026", card: "not_checked" },
  { name: "Bank of Hawaii", domain: "boh.com", type: "bank", states: ["HI"], reviewed: "2026-06-11", deposit: "active", deposit_offer_id: "bank-of-hawaii-convenience-checking-100-2026", card: "not_checked" },
  { name: "First Hawaiian Bank", domain: "fhb.com", type: "bank", states: ["HI"], reviewed: "2026-06-11", deposit: "active", deposit_offer_id: "first-hawaiian-priority-banking-350-checking-2026", card: "not_checked" },
  { name: "Garden Island Federal Credit Union", domain: "gardenislandfcu.com", type: "credit_union", states: ["HI"], reviewed: "2026-06-11", deposit: "active", deposit_offer_id: "garden-island-fcu-referral-25-2026", card: "not_checked" },
  { name: "Hawaii State Federal Credit Union", domain: "hawaiistatefcu.com", type: "credit_union", states: ["HI"], reviewed: "2026-06-11", deposit: "active", deposit_offer_id: "hawaii-state-fcu-new-member-50-2026", card: "not_checked" },
  { name: "University of Hawaii Federal Credit Union", domain: "uhfcu.com", type: "credit_union", states: ["HI"], reviewed: "2026-06-11", deposit: "active", deposit_offer_id: "uh-fcu-score100-checking-100-2026", card: "not_checked" },
  { name: "Dupaco Community Credit Union", domain: "dupaco.com", type: "credit_union", states: ["IA","IL","WI"], reviewed: "2026-06-12", deposit: "active", deposit_offer_id: "dupaco-cu-300-checking-2026", card: "not_checked" },
  { name: "First National Bank of Omaha (FNBO)", domain: "pages.fnbo.com", type: "bank", states: ["IA","NE","SD","WI"], reviewed: "2026-06-12", deposit: "expired", card: "not_checked", notes: "renewal watch — see recurringBankOffers.ts" },
  { name: "Gesa Credit Union", domain: "gesa.com", type: "credit_union", states: ["ID","OR","WA"], reviewed: "2026-06-12", deposit: "active", deposit_offer_id: "gesa-cu-250-checking-2026", card: "not_checked" },
  { name: "Idaho Central Credit Union", domain: "iccu.com", type: "credit_union", states: ["ID"], reviewed: "2026-06-12", deposit: "expired", card: "not_checked", notes: "renewal watch — see recurringBankOffers.ts" },
  { name: "Associated Bank", domain: "associatedbank.com", type: "bank", states: ["IL","MN","WI"], reviewed: "2026-06-12", deposit: "active", deposit_offer_id: "associated-bank-600-checking-2026", card: "not_checked" },
  { name: "CEFCU", domain: "cefcu.com", type: "credit_union", states: ["IL"], reviewed: "2026-06-12", deposit: "active", deposit_offer_id: "cefcu-225-checking-2026", card: "not_checked" },
  { name: "CommunityAmerica Credit Union", domain: "communityamerica.com", type: "credit_union", states: ["IL","KS","MO"], reviewed: "2026-06-12", deposit: "active", deposit_offer_id: "communityamerica-cu-400-checking-2026", card: "not_checked" },
  { name: "First Financial Bank", domain: "bankatfirst.com", type: "bank", states: ["IL","IN","KY","OH"], reviewed: "2026-06-12", deposit: "active", deposit_offer_id: "first-financial-bank-100-checking-2026", card: "not_checked" },
  { name: "Together Credit Union", domain: "togethercu.org", type: "credit_union", states: ["IL","MO"], reviewed: "2026-06-12", deposit: "active", deposit_offer_id: "together-cu-300-checking-2026", card: "not_checked" },
  { name: "Everwise Credit Union", domain: "everwisecu.com", type: "credit_union", states: ["IN","MI"], reviewed: "2026-06-12", deposit: "active", deposit_offer_id: "everwise-cu-250-checking-2026", card: "not_checked" },
  { name: "Indiana Members Credit Union", domain: "imcu.com", type: "credit_union", states: ["IN"], reviewed: "2026-06-12", deposit: "expired", card: "not_checked", notes: "renewal watch — see recurringBankOffers.ts" },
  { name: "Campus Federal Credit Union", domain: "campusfederal.org", type: "credit_union", states: ["LA"], reviewed: "2026-06-12", deposit: "active", deposit_offer_id: "campus-federal-225-checking-2026", card: "not_checked" },
  { name: "La Capitol Federal Credit Union", domain: "go.lacapfcu.org", type: "credit_union", states: ["LA"], reviewed: "2026-06-12", deposit: "active", deposit_offer_id: "la-capitol-fcu-100-checking-2026", card: "not_checked" },
  { name: "Cambridge Savings Bank", domain: "cambridgesavings.com", type: "bank", states: ["MA"], reviewed: "2026-06-12", deposit: "active", deposit_offer_id: "cambridge-savings-300-checking-2026", card: "not_checked" },
  { name: "Eastern Bank", domain: "easternbank.com", type: "bank", states: ["MA","NH","RI"], reviewed: "2026-06-12", deposit: "expired", card: "not_checked", notes: "renewal watch — see recurringBankOffers.ts" },
  { name: "Metro Credit Union", domain: "metrocu.org", type: "credit_union", states: ["MA"], reviewed: "2026-06-12", deposit: "expired", card: "not_checked", notes: "renewal watch — see recurringBankOffers.ts" },
  { name: "Rockland Trust", domain: "rocklandtrust.com", type: "bank", states: ["MA"], reviewed: "2026-06-12", deposit: "active", deposit_offer_id: "rockland-trust-300-checking-2026", card: "not_checked" },
  { name: "Salem Five", domain: "salemfive.com", type: "bank", states: ["MA"], reviewed: "2026-06-12", deposit: "expired", card: "not_checked", notes: "renewal watch — see recurringBankOffers.ts" },
  { name: "Dollar Bank", domain: "dollar.bank", type: "bank", states: ["MD","OH","PA","VA"], reviewed: "2026-06-12", deposit: "active", deposit_offer_id: "dollar-bank-400-checking-2026", card: "not_checked" },
  { name: "cPort Credit Union", domain: "cportcu.org", type: "credit_union", states: ["ME"], reviewed: "2026-06-12", deposit: "active", deposit_offer_id: "cport-cu-100-checking-2026", card: "not_checked" },
  { name: "Flagstar Bank", domain: "flagstar.com", type: "bank", states: ["MI","NY"], reviewed: "2026-06-12", deposit: "active", deposit_offer_id: "flagstar-bank-200-checking-2026", card: "not_checked" },
  { name: "Michigan First Credit Union", domain: "michiganfirst.com", type: "credit_union", states: ["MI"], reviewed: "2026-06-12", deposit: "active", deposit_offer_id: "michigan-first-cu-100-checking-2026", card: "not_checked" },
  { name: "Royal Credit Union", domain: "rcu.org", type: "credit_union", states: ["MN","WI"], reviewed: "2026-06-12", deposit: "active", deposit_offer_id: "royal-cu-400-checking-2026", card: "not_checked" },
  { name: "TopLine Financial Credit Union", domain: "toplinecu.com", type: "credit_union", states: ["MN"], reviewed: "2026-06-12", deposit: "active", deposit_offer_id: "topline-cu-300-checking-2026", card: "not_checked" },
  { name: "BankPlus", domain: "bankplus.net", type: "bank", states: ["MS"], reviewed: "2026-06-12", deposit: "expired", card: "not_checked", notes: "renewal watch — see recurringBankOffers.ts" },
  { name: "First Community Credit Union (ND)", domain: "myfccu.com", type: "credit_union", states: ["ND"], reviewed: "2026-06-12", deposit: "active", deposit_offer_id: "first-community-cu-nd-100-checking-2026", card: "not_checked" },
  { name: "Service Credit Union", domain: "servicecu.org", type: "credit_union", states: ["NH"], reviewed: "2026-06-12", deposit: "expired", card: "not_checked", notes: "renewal watch — see recurringBankOffers.ts" },
  { name: "St. Mary's Bank", domain: "stmarysbank.com", type: "credit_union", states: ["NH"], reviewed: "2026-06-12", deposit: "active", deposit_offer_id: "st-marys-bank-300-checking-2026", card: "not_checked" },
  { name: "Affinity Federal Credit Union", domain: "affinityfcu.com", type: "credit_union", states: ["NJ"], reviewed: "2026-06-12", deposit: "active", deposit_offer_id: "affinity-fcu-100-checking-2026", card: "not_checked" },
  { name: "Columbia Bank (NJ)", domain: "columbiabankonline.com", type: "bank", states: ["NJ"], reviewed: "2026-06-12", deposit: "active", deposit_offer_id: "columbia-bank-nj-300-checking-2026", card: "not_checked" },
  { name: "Provident Bank (NJ)", domain: "provident.bank", type: "bank", states: ["NJ","NY","PA"], reviewed: "2026-06-12", deposit: "active", deposit_offer_id: "provident-bank-300-checking-2026", card: "not_checked" },
  { name: "Sunward Credit Union", domain: "gosunward.org", type: "credit_union", states: ["NM"], reviewed: "2026-06-12", deposit: "active", deposit_offer_id: "sunward-slfcu-200-checking-2026", card: "not_checked" },
  { name: "Clark County Credit Union", domain: "cccu.com", type: "credit_union", states: ["NV"], reviewed: "2026-06-12", deposit: "active", deposit_offer_id: "clark-county-cu-100-checking-2026", card: "not_checked" },
  { name: "Greater Nevada Credit Union", domain: "livegreater.gncu.org", type: "credit_union", states: ["NV"], reviewed: "2026-06-12", deposit: "active", deposit_offer_id: "greater-nevada-cu-150-checking-2026", card: "not_checked" },
  { name: "Apple Bank", domain: "applebank.com", type: "bank", states: ["NY"], reviewed: "2026-06-12", deposit: "expired", card: "not_checked", notes: "renewal watch — see recurringBankOffers.ts" },
  { name: "Broadview Federal Credit Union", domain: "broadviewfcu.com", type: "credit_union", states: ["NY"], reviewed: "2026-06-12", deposit: "expired", card: "not_checked", notes: "renewal watch — see recurringBankOffers.ts" },
  { name: "Hudson Valley Credit Union", domain: "hvcu.org", type: "credit_union", states: ["NY"], reviewed: "2026-06-12", deposit: "expired", card: "not_checked", notes: "renewal watch — see recurringBankOffers.ts" },
  { name: "Visions Federal Credit Union", domain: "visionsfcu.org", type: "credit_union", states: ["NY"], reviewed: "2026-06-12", deposit: "active", deposit_offer_id: "visions-fcu-500-checking-2026", card: "not_checked" },
  { name: "Telhio Credit Union", domain: "telhio.org", type: "credit_union", states: ["OH"], reviewed: "2026-06-12", deposit: "expired", card: "not_checked", notes: "renewal watch — see recurringBankOffers.ts" },
  { name: "Bank of Oklahoma", domain: "bankofoklahoma.com", type: "bank", states: ["OK"], reviewed: "2026-06-12", deposit: "active", deposit_offer_id: "bok-financial-300-student-checking-2026", card: "not_checked" },
  { name: "Truity Credit Union", domain: "truitycu.org", type: "credit_union", states: ["OK"], reviewed: "2026-06-12", deposit: "active", deposit_offer_id: "truity-cu-100-checking-2026", card: "not_checked" },
  { name: "WEOKIE Federal Credit Union", domain: "weokie.org", type: "credit_union", states: ["OK"], reviewed: "2026-06-12", deposit: "active", deposit_offer_id: "weokie-fcu-200-checking-2026", card: "not_checked" },
  { name: "OnPoint Community Credit Union", domain: "onpointcu.com", type: "credit_union", states: ["OR","WA"], reviewed: "2026-06-12", deposit: "active", deposit_offer_id: "onpoint-cu-50-referral-2026", card: "not_checked" },
  { name: "Unitus Community Credit Union", domain: "unitusccu.com", type: "credit_union", states: ["OR","WA"], reviewed: "2026-06-12", deposit: "expired", card: "not_checked", notes: "renewal watch — see recurringBankOffers.ts" },
  { name: "Citadel Credit Union", domain: "citadelbanking.com", type: "credit_union", states: ["PA"], reviewed: "2026-06-12", deposit: "active", deposit_offer_id: "citadel-cu-500-checking-2026", card: "not_checked" },
  { name: "Penn Community Bank", domain: "penncommunitybank.com", type: "bank", states: ["PA"], reviewed: "2026-06-12", deposit: "active", deposit_offer_id: "penn-community-bank-475-checking-2026", card: "not_checked" },
  { name: "TruMark Financial Credit Union", domain: "trumark.com", type: "credit_union", states: ["PA"], reviewed: "2026-06-12", deposit: "active", deposit_offer_id: "trumark-financial-cu-250-checking-2026", card: "not_checked" },
  { name: "Navigant Credit Union", domain: "navigantcu.org", type: "credit_union", states: ["RI"], reviewed: "2026-06-12", deposit: "active", deposit_offer_id: "navigant-cu-100-checking-2026", card: "not_checked" },
  { name: "South Carolina Federal Credit Union", domain: "scfederal.org", type: "credit_union", states: ["SC"], reviewed: "2026-06-12", deposit: "active", deposit_offer_id: "sc-federal-cu-100-checking-2026", card: "not_checked" },
  { name: "A+ Federal Credit Union", domain: "aplusfcu.org", type: "credit_union", states: ["TX"], reviewed: "2026-06-12", deposit: "active", deposit_offer_id: "aplus-fcu-50-checking-2026", card: "not_checked" },
  { name: "Canyon View Credit Union", domain: "canyonviewcu.com", type: "credit_union", states: ["UT"], reviewed: "2026-06-12", deposit: "active", deposit_offer_id: "canyon-view-cu-150-checking-2026", card: "not_checked" },
  { name: "Apple Federal Credit Union", domain: "applefcu.org", type: "credit_union", states: ["VA"], reviewed: "2026-06-12", deposit: "active", deposit_offer_id: "apple-fcu-70-student-checking-2026", card: "not_checked" },
  { name: "Northwest Federal Credit Union", domain: "nwfcu.org", type: "credit_union", states: ["VA"], reviewed: "2026-06-12", deposit: "active", deposit_offer_id: "northwest-fcu-500-checking-2026", card: "not_checked" },
  { name: "Summit Credit Union", domain: "summitcreditunion.com", type: "credit_union", states: ["WI"], reviewed: "2026-06-12", deposit: "active", deposit_offer_id: "summit-cu-200-checking-2026", card: "not_checked" },
]
