-- ============================================================
-- bonus_deposits.source
--
-- Captures WHERE each individual paycheck deposit came from — either
-- "Employer / payroll" or the name of the account the user pushed it
-- from (e.g. "Chase", "Ally", "Fidelity"). Distinct from
-- completed_bonuses.dd_method (migration 037), which records the single
-- source that ultimately TRIGGERED the bonus; this column records the
-- source of every logged deposit as the user goes.
--
-- Forward-looking data: aggregated, it tells us which funding methods
-- reliably count toward each bank's DD requirement (employer payroll vs.
-- ACH push from a brokerage vs. P2P), feeding the catalog's per-bank DD
-- guidance. Nullable — optional for the user and for every legacy row.
--
-- The app writes it best-effort: addDeposit() falls back to an insert
-- without this column if it isn't present yet, so deploy order (code
-- before migration) can't break the "add deposit" action.
-- ============================================================

alter table bonus_deposits
  add column if not exists source text;
