import { NextRequest, NextResponse, after } from "next/server"
import { affiliateLinks } from "../../../lib/affiliateLinks"
import { logClick } from "../../../lib/clickLog"
import { pickPooledLink } from "../../../lib/referralPools"
import { bonuses } from "../../../lib/data/bonuses"
import { savingsBonuses } from "../../../lib/data/savingsBonuses"
import { creditCardBonuses } from "../../../lib/data/creditCardBonuses"

export const dynamic = "force-dynamic"

const cardOfferUrls = new Map(
  creditCardBonuses
    .filter(card => card.offer_link)
    .map(card => [card.id, card.offer_link] as const),
)

// Centralized affiliate redirect. Every "Apply" / "Open Account" CTA in the
// app points to /go/<bonus_id>. This handler decides at click time whether
// to redirect to an affiliate URL (from lib/affiliateLinks.ts) or the
// canonical URL stored in the catalog. Adding an affiliate URL = one line
// in lib/affiliateLinks.ts; no rendering changes needed.

function canonicalUrlForBonus(bonusId: string): string | null {
  const bonus = (bonuses as Array<{ id: string; source_links?: string[] }>).find(b => b.id === bonusId)
  if (bonus?.source_links?.[0]) return bonus.source_links[0]

  const savings = savingsBonuses.find(b => b.id === bonusId)
  if (savings?.source_links?.[0]) return savings.source_links[0]

  const cardUrl = cardOfferUrls.get(bonusId)
  if (cardUrl) return cardUrl

  return null
}

export async function GET(_req: NextRequest, { params }: { params: Promise<{ bonusId: string }> }) {
  const { bonusId } = await params

  // Rotating referral pool (e.g. Chase business) takes precedence so clicks
  // spread across multiple links; falls back to the affiliate map / catalog link.
  const pooled = pickPooledLink(bonusId)
  const target = pooled?.url ?? affiliateLinks[bonusId] ?? canonicalUrlForBonus(bonusId)

  if (!target) {
    return NextResponse.json({ error: "bonus_not_found", bonusId }, { status: 404 })
  }

  // Best-effort click logging — runs after the response is sent so the
  // redirect stays instant; logClick swallows its own errors.
  try {
    const src = new URL(_req.url).searchParams.get("src") ?? undefined
    const ip = _req.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
    after(() =>
      logClick({
        bonusId,
        servedUrl: target,
        linkLabel: pooled?.label,
        src,
        referer: _req.headers.get("referer") ?? undefined,
        userAgent: _req.headers.get("user-agent") ?? undefined,
        ip,
      }),
    )
  } catch {
    // logging must never block the redirect
  }

  return NextResponse.redirect(target, 302)
}
