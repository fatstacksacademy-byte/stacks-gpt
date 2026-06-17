-- ============================================================
-- completed_bonuses.bonus_posted_date
--
-- Records WHEN a bonus actually posted to the account — a distinct
-- event from opened_date (account opened) and closed_date (account
-- closed). Set when the user checks the "Bonus Posted" step and
-- enters a date; nullable for every legacy/in-flight record.
--
-- The app writes this column best-effort: markBonusPosted() falls back
-- to an update without it if the column isn't present yet, so deploy
-- order (code before migration) can't break the "mark posted" action.
-- ============================================================

alter table completed_bonuses
  add column if not exists bonus_posted_date date;
