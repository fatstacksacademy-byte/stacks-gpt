import { NextRequest, NextResponse } from "next/server"
import { affiliateLinks } from "../../../lib/affiliateLinks"
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

  const target = affiliateLinks[bonusId] ?? canonicalUrlForBonus(bonusId)

  if (!target) {
    return NextResponse.json({ error: "bonus_not_found", bonusId }, { status: 404 })
  }

  return NextResponse.redirect(target, 302)
}
