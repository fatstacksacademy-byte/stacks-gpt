export type BtOffer = {
  id: string
  card_name: string
  issuer: string
  bt_fee_pct: number
  intro_months: number
  intro_apr: number
  estimated_limit: number
  notes?: string
}

export const btOffers: BtOffer[] = [
  {
    id: "nfcu-2pct-visa",
    card_name: "NFCU 2% Cash Rewards Visa",
    issuer: "NFCU",
    bt_fee_pct: 0,
    intro_months: 12,
    intro_apr: 0,
    estimated_limit: 20000,
    notes: "Approved 2026-05. Plan to deploy ~$18.5k against Amex BBC 2 cliff.",
  },
]
