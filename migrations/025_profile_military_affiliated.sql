-- ============================================================
-- Stacks OS: military affiliation on user_profiles
--
-- USAA, Navy Federal, AAFES Military Star, and a handful of other
-- bonus / card offers are restricted to military-affiliated users
-- (active duty, veteran, dependent, etc).  This column lets the
-- bonus + card filters hide those entries from users who can't
-- benefit from them.
--
-- Pairs with eligibility.military_only (bonuses) and military_only
-- (creditCardBonuses) in the catalog files — when those are true,
-- the entry is filtered out unless user_profiles.military_affiliated
-- is true.
--
-- Default false — most users aren't military.  Onboarding asks the
-- question right after state.
-- ============================================================

alter table user_profiles
  add column if not exists military_affiliated boolean not null default false;
