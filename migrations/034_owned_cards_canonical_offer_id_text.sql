-- ============================================================
-- owned_cards.canonical_offer_id  uuid → text
--
-- This column links an owned card back to the catalog offer it was
-- tracked from. Every catalog id in this app is a STRING SLUG
-- (e.g. "chase-chase-ink-business-cash-rwp"), not a UUID — so the
-- original `uuid` type rejected every catalog-sourced insert with:
--   invalid input syntax for type uuid: "chase-chase-ink-business-cash-rwp"
--
-- That broke "Track this bonus" (lib/trackBonus.ts), the "Already have"
-- form, and the Portfolio Gaps add — all three pass card.id here.
-- No catalog-sourced row ever persisted (the insert always failed), so
-- there is no real data to migrate; the USING cast is just for safety.
--
-- savings_entries has the same latent mismatch but works around it by
-- storing the slug in bonus_name and leaving canonical_offer_id null —
-- owned_cards has no spare text field, so we fix the type instead and
-- keep the linkage.
-- ============================================================

alter table owned_cards
  alter column canonical_offer_id type text using canonical_offer_id::text;
