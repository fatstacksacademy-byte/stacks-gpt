-- ============================================================
-- Stacks OS: per-currency cpp overrides for the Spending tab's
-- Travel Mode.
--
-- The existing spending_profile.cpp_valuation column is a single
-- numeric — fine as a legacy global cpp placeholder, but Travel
-- Mode needs a per-currency override map (Ultimate Rewards =
-- 0.022, Hyatt = 0.025, etc.). Adding a jsonb sibling rather
-- than retyping the existing column so we don't have to migrate
-- existing rows or update the legacy single-number form inputs
-- in UnifiedProfileForm / WelcomeWizard.
--
-- Shape: { [currency: string]: number }, where the number is
-- the cpp expressed as a decimal (e.g. 0.022 = 2.2 cents).
-- ============================================================

alter table spending_profile
  add column if not exists cpp_overrides jsonb default '{}';
