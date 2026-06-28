-- ============================================================
-- completed_bonuses.dd_method
--
-- Captures WHICH direct-deposit source actually triggered the bonus,
-- recorded when the user marks the "Bonus Posted" step. Values are
-- either "Employer / payroll" or the name of the financial institution
-- the user routed the qualifying deposit from (e.g. "Chase", "Fidelity",
-- "SoFi"). Nullable — optional for the user and for every legacy record.
--
-- This is a forward-looking data point: aggregated, it tells us which
-- DD methods reliably work per bank, feeding the catalog's DD-method
-- guidance. The app writes it best-effort — markBonusPosted() falls back
-- to an update without it if the column isn't present yet, so deploy
-- order (code before migration) can't break the "mark posted" action.
-- ============================================================

alter table completed_bonuses
  add column if not exists dd_method text;
