-- ============================================================
-- Stacks OS: spending_profile.benefit_usage
--
-- A jsonb column on spending_profile that captures which credit-card
-- benefits the user would actually use. Combined with the per-card
-- benefits registry in lib/cardBenefits.ts, this lets the sequencer
-- compute a personalized value for each card — instead of assuming
-- everyone gets full value from $300 hotel credits, lounge access,
-- and CLEAR memberships they'd never touch.
--
-- Schema is the UserBenefitProfile type in lib/cardBenefits.ts, e.g.:
--   {
--     "uses_travel_credit": true,
--     "uses_uber_credit": true,
--     "uses_lounge_access": false,
--     "uses_clear": false,
--     "needs_global_entry": false,
--     ...
--   }
--
-- Defaults are applied client-side via DEFAULT_BENEFIT_PROFILE in
-- cardBenefits.ts — most flexible-cash credits default ON, lifestyle-
-- specific benefits (lounges, CLEAR, Saks) default OFF.
-- ============================================================

alter table spending_profile
  add column if not exists benefit_usage jsonb;
