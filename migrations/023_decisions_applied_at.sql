-- ============================================================
-- Stacks OS: applied_at columns on decision + override tables
--
-- Phase 1 of the auto-apply-decisions work: closes the loop between
-- admin Approve / Modify clicks in /admin/triage (and /admin/card-triage)
-- and the live lib/data/*.ts catalog files.
--
-- scripts/apply-decisions-to-catalog.ts pulls every row where
-- applied_at IS NULL, mutates the catalog file accordingly, then stamps
-- applied_at when the write succeeds. Re-running the script is safe —
-- already-applied rows are skipped, so a partially-completed run can be
-- resumed without re-applying the successful edits.
-- ============================================================

alter table verification_decisions
  add column if not exists applied_at timestamptz;

create index if not exists idx_verification_decisions_pending_apply
  on verification_decisions(applied_at)
  where applied_at is null;

alter table card_verification_decisions
  add column if not exists applied_at timestamptz;

create index if not exists idx_card_verification_decisions_pending_apply
  on card_verification_decisions(applied_at)
  where applied_at is null;

alter table bonus_url_overrides
  add column if not exists applied_at timestamptz;

create index if not exists idx_bonus_url_overrides_pending_apply
  on bonus_url_overrides(applied_at)
  where applied_at is null and is_active = true;

alter table card_url_overrides
  add column if not exists applied_at timestamptz;

create index if not exists idx_card_url_overrides_pending_apply
  on card_url_overrides(applied_at)
  where applied_at is null and is_active = true;
