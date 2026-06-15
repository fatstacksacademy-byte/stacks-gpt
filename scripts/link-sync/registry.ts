/**
 * Standalone affiliate-link registry for YouTube video descriptions.
 *
 * This is the single source of truth for "what link should be live right now"
 * for every program you promote in your descriptions — a superset of the
 * website catalog (lib/affiliateLinks.ts), because YouTube descriptions also
 * carry Amex cards and one-off affiliates that never appear on the site.
 *
 * WORKFLOW
 *  - Rotated a link (very common with Amex)?  Move the old URL into `aliases`
 *    and set `currentUrl` to the new one. Next `linksync:apply` propagates it
 *    to every video automatically.
 *  - Amex link died and you don't have a new one yet?  Leave `currentUrl: ""`.
 *    The scan flags every video still pointing at the dead link as
 *    "needs-current" so you know exactly where to paste the fresh link.
 *
 * SAFETY
 *  - Only links equal to a known `alias` are auto-rewritten.
 *  - A link that merely matches `domainMatch` (+ optional `contextKeywords`)
 *    but isn't a known alias is flagged "review", never auto-changed —
 *    because one domain (e.g. referyourchasecard.com) serves many products.
 */
import type { LinkProgram } from "./types"

export const linkRegistry: LinkProgram[] = [
  // ── Chase — refer-a-friend links are per-link-code on referyourchasecard.com.
  // Business vs personal share the domain, so they're disambiguated by context.
  {
    key: "chase-business-referral",
    label: "Chase Ink / Sapphire business (refer-a-friend)",
    issuer: "chase",
    currentUrl: "https://www.referyourchasecard.com/21f/WDA5Q4R6ON",
    aliases: [
      // Prior business-referral codes — all dead 404s, each confirmed via
      // Ink/business video context — folded into the current link 2026-06-13.
      "https://www.referyourchasecard.com/21e/I1HNZSS5VJ",
      "https://www.referyourchasecard.com/21w/JGH8LGVPQW",
      "https://www.referyourchasecard.com/21s/G4IBDPC80F",
      "https://www.referyourchasecard.com/21r/NDU6Y7HM6K",
      "https://www.referyourchasecard.com/21p/XM7VHVBCDT",
      "https://www.referyourchasecard.com/21p/UFD454IRJX",
      "https://www.referyourchasecard.com/21o/5PJZBSYS3C",
      "https://www.referyourchasecard.com/18N/JNRWOLYH82",
    ],
    domainMatch: /referyourchasecard\.com/i,
    contextKeywords: ["ink", "business", "sapphire reserve business"],
    notes: "One link covers all Chase business Ink + Sapphire Reserve Business cards.",
  },
  {
    // Placeholder so personal Chase referrals don't get mistaken for the
    // business one. Fill currentUrl when you have a personal refer link.
    key: "chase-personal-referral",
    label: "Chase Sapphire / Freedom personal (refer-a-friend)",
    issuer: "chase",
    currentUrl: "",
    domainMatch: /referyourchasecard\.com/i,
    contextKeywords: ["sapphire preferred", "freedom", "personal"],
    notes: "No personal referral link set yet — add one to enable sync.",
  },

  // ── Amex — refer-a-friend links rotate and expire to a 200-OK "no longer
  // available" page. currentUrl stays empty until you paste a fresh one from
  // your Amex account; expiredFingerprints catch the dead pages on live check.
  {
    key: "amex-referral-generic",
    label: "American Express refer-a-friend",
    issuer: "amex",
    currentUrl: "",
    rotates: true,
    domainMatch: /americanexpress\.com\/(en-us\/)?referral|refer\.amex|amex\.co\b/i,
    expiredFingerprints: [
      "no longer available",
      "link you followed has expired",
      "referral link is invalid",
      "offer is no longer available",
      "we can't find the page",
    ],
    notes:
      "Amex links can only be regenerated from your account. Add per-card entries below as you collect their refer links.",
  },

  // ── Bank-bonus affiliates carried over from the website registry
  // (lib/affiliateLinks.ts). Domain matches let the scan spot older variants.
  {
    key: "sofi-money",
    label: "SoFi Checking & Savings",
    issuer: "sofi",
    currentUrl:
      "https://www.sofi.com/invite/money?gcp=a60c6cdf-6311-40b7-a023-19b0417076cf&isAliasGcp=false",
    domainMatch: /sofi\.com\/invite/i,
  },
  {
    key: "discover-it",
    label: "Discover it (double cashback)",
    issuer: "discover",
    currentUrl: "https://refer.discover.com/boothnathaniel!4055cae6ab!a",
    domainMatch: /refer\.discover\.com/i,
  },
  {
    key: "chime",
    label: "Chime checking",
    issuer: "chime",
    currentUrl: "https://www.chime.com/r/nathanielbooth10/",
    domainMatch: /chime\.com\/r\//i,
  },
  {
    key: "varo",
    label: "Varo Money",
    issuer: "varo",
    currentUrl: "https://www.varomoney.com/r1/?r=Nathaniel2908",
    domainMatch: /varomoney\.com\/r1/i,
  },
  {
    key: "capital-one-360",
    label: "Capital One 360 Checking",
    issuer: "capital one",
    currentUrl: "https://i.capitalone.com/GRErGO2HT",
    domainMatch: /i\.capitalone\.com/i,
  },
  {
    key: "bofa-customized-cash",
    label: "Bank of America Customized Cash Rewards",
    issuer: "bank of america",
    currentUrl: "https://www.bankofamerica.com/refer?prod=ccr&refid=CR2IP1EM-CCCR01",
    domainMatch: /bankofamerica\.com\/refer/i,
  },
]

/**
 * Heuristic: does a URL look like *some* affiliate/referral link, even if no
 * program claims it? Used to flag "orphan" links you set up long ago and
 * forgot — the ones a whole-channel scan is meant to surface.
 */
const AFFILIATE_SHAPE =
  /(refer|referral|invite|\/r\/|[?&](ref|referral|r|aff|affid|invite|gcp)=|\.link\/|fbuy\.io|partnerstack|impact\.com|sjv\.io|prf\.hn|go2cloud|anrdoezrs|dpbolvw|kqzyfj|tkqlhce)/i

export function looksAffiliate(url: string): boolean {
  return AFFILIATE_SHAPE.test(url)
}
