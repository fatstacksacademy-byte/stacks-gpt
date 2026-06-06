// ============================================================
// Stacks OS: affiliate link registry
//
// Single source of truth for every affiliate / referral URL.
//
// To add a new affiliate URL: add ONE line below mapping bonus_id
// (from lib/data/bonuses.ts, savingsBonuses.ts, or creditCardBonuses.ts)
// to the affiliate URL. That's it — no catalog edits, no rendering changes.
//
// Renderers emit `/go/<bonus_id>` via applyUrl(); the route handler at
// app/go/[bonusId]/route.ts decides at click time whether to send the user
// to the affiliate URL (if present here) or the canonical URL (from the
// catalog). When you get approved for a new network, drop the URL here
// and every CTA across Roadmap, blog Apply buttons, Spending, and Savings
// switches automatically on the next request.
// ============================================================

export const affiliateLinks: Record<string, string> = {
  "sofi-checking-savings-300-dd-2026":
    "https://www.sofi.com/invite/money?gcp=a60c6cdf-6311-40b7-a023-19b0417076cf&isAliasGcp=false",
  "discover-it-100-double":
    "https://refer.discover.com/boothnathaniel!4055cae6ab!a",
  "chime-100-referral-checking":
    "https://www.chime.com/r/nathanielbooth10/",
  "varo-money-100-referral-dd":
    "https://www.varomoney.com/r1/?r=Nathaniel2908",
  "capital-one-360-checking-300-offer300":
    "https://i.capitalone.com/GRErGO2HT",
}

// Renderer-facing helper. Always returns a /go/<bonus_id> URL. The redirect
// handler does the affiliate-vs-canonical resolution server-side so the
// renderers never need to know which bonuses have affiliate URLs.
export function applyUrl(bonusId: string): string {
  return `/go/${encodeURIComponent(bonusId)}`
}

export function hasAffiliate(bonusId: string): boolean {
  return bonusId in affiliateLinks
}
