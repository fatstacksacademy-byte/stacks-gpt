-- ============================================================
-- Stacks OS: "Already have" flow — incomplete_info flag
--
-- When a user tells us "I already have this card/account" but skips
-- entering the dates (opened/closed/bonus_received), we still record
-- the row so the catalog sequencer stops recommending the card/bonus
-- again, but mark it incomplete so downstream math that depends on
-- dates (cooldown calculations, churn eligibility, lifetime earnings)
-- can skip or warn on it.
--
-- Defaults to false so existing rows are treated as fully-known.
-- ============================================================

alter table owned_cards
  add column if not exists incomplete_info boolean not null default false;

alter table savings_entries
  add column if not exists incomplete_info boolean not null default false;
