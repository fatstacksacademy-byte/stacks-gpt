-- ============================================================
-- Stacks OS: savings_entries transaction-requirement milestone
--
-- Several business-checking bonuses require a number of debit/electronic
-- transactions (or a card-spend total) during the maintenance window in
-- addition to the deposit — e.g. Capital One (10 electronic txns/90d),
-- U.S. Bank (6 txns/60d), Chase Business (5 txns/90d), Provident CU
-- ($400 purchases for 2 months). The liquidity timeline previously had no
-- step for this, so users could hold the balance, never run the swipes, and
-- silently forfeit the bonus.
--
-- This adds a nullable timestamp milestone, matching the pattern from
-- migration 028: NULL = "transactions not yet completed", a timestamp =
-- "user marked the transaction requirement done on that date." Only shown on
-- the hero card for bonuses whose catalog entry sets `requires_transactions`.
-- ============================================================

alter table savings_entries
  add column if not exists transactions_done_at timestamptz;
