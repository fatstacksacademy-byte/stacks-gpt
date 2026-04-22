-- ============================================================
-- Stacks OS: cross-source consensus fields on verification state
--
-- Phase 3 of the bonus verification pipeline. Each bonus can carry
-- a secondary source URL (usually a Doctor of Credit article) in
-- addition to its primary bank page. The verifier now fetches both
-- and compares bonus_amount; the outcome is persisted here so the
-- UI can show "Bank page & DoC agree ✓" next to the freshness badge.
--
-- Columns are nullable because plenty of bonuses are single-source
-- (no DoC link available) — NULL sources_agree means "not checked,"
-- which is semantically different from false.
-- ============================================================

alter table catalog_verification_state
  add column if not exists sources_agree boolean,
  add column if not exists consensus_disagreements text[],
  add column if not exists secondary_source_url text,
  add column if not exists secondary_source_kind text
    check (secondary_source_kind is null or secondary_source_kind in ('bank_page', 'doc', 'other'));
