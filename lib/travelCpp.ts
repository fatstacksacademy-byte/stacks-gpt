/**
 * Travel-redemption cents-per-point table for the Spending tab's
 * Travel Mode. Each value is the realistic ceiling someone targeting
 * good (not aspirational) award redemptions can pull — Hyatt at 2.3¢
 * via Category 4-7 redemptions, transferable currencies at 2.0¢ via
 * mid-tier business class or hotel transfers, etc.
 *
 * These are estimates by definition (your mileage will vary). Travel
 * Mode is labelled "Beta" in the UI to set that expectation.
 *
 * For currencies not in the table, getTravelCpp() falls back to the
 * card's catalog cpp_value — which is the cash-floor used by the
 * default Cash Mode (typically 1¢ general / 0.5¢ hotel).
 *
 * Per-user overrides come in via the second argument: any matching
 * key takes precedence over the default table.
 */

import type { CreditCardBonus } from "./data/creditCardBonuses"

export const TRAVEL_CPP: Record<string, number> = {
  "Ultimate Rewards": 0.02,
  "Membership Rewards": 0.02,
  "ThankYou Points": 0.018,
  "Capital One miles": 0.018,
  "World of Hyatt": 0.023,
  "Marriott Bonvoy": 0.008,
  "Hilton Honors": 0.006,
  "United MileagePlus": 0.015,
  "Delta SkyMiles": 0.013,
  "Alaska miles": 0.018,
  "JetBlue TrueBlue": 0.013,
  "cash": 0.01,
}

export function getTravelCpp(
  card: CreditCardBonus,
  overrides?: Record<string, number> | null,
): number {
  const cur = card.bonus_currency
  if (overrides && Object.prototype.hasOwnProperty.call(overrides, cur)) {
    return overrides[cur]
  }
  if (Object.prototype.hasOwnProperty.call(TRAVEL_CPP, cur)) {
    return TRAVEL_CPP[cur]
  }
  return card.cpp_value
}
