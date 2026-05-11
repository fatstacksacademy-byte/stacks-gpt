-- ============================================================
-- Stacks OS: triage decisions log
--
-- Records the admin's verdict on each proposed edit produced by the
-- verify-bonuses pipeline. The /admin/triage UI is the sole writer:
-- the admin walks through the queue and picks Approve / Dismiss / Skip
-- for every (bonus_id, field_path) pair that the verifier surfaced.
--
-- Why a separate table (rather than a column on bonus_verifications)?
--   1. bonus_verifications rows are *per run* — when next week's run
--      writes a fresh problem row, last week's reviewed flag is gone.
--      Decisions must outlive runs so dismissed cases stay dismissed.
--   2. proposed_edits is a JSONB array — a single bonus_verifications
--      row can carry several edits, each needing an independent verdict.
--   3. The verify pipeline (Phase 6 follow-up) will read this table
--      to auto-skip "extracted is wrong, regex false positive" cases
--      it already showed the admin once. snippet_fingerprint lets it
--      detect when the page text actually changed (different fingerprint
--      → re-surface the edit) vs is unchanged (same fingerprint →
--      respect the prior dismissal).
--
-- verdict semantics:
--   approved  — stored is wrong; queue this edit for the next safe-patch
--   dismissed — extracted is wrong (tier mismatch, wrong context, etc.);
--               do not surface again unless the page snippet changes
--   snoozed   — admin will revisit; re-surface on the next run
--
-- No FK on bonus_id: bonus catalog lives in TS files, not in a DB table.
-- ============================================================

create table if not exists verification_decisions (
  id uuid primary key default gen_random_uuid(),
  bonus_id text not null,
  field_path text not null,
  verdict text not null check (verdict in ('approved', 'dismissed', 'snoozed')),
  from_value jsonb,
  to_value jsonb,
  snippet_fingerprint text,
  notes text,
  decided_by text,
  decided_at timestamptz not null default now()
);

create index if not exists idx_verification_decisions_lookup
  on verification_decisions(bonus_id, field_path);

create index if not exists idx_verification_decisions_recent
  on verification_decisions(decided_at desc);

alter table verification_decisions enable row level security;

-- Admin-only read/write. Service role bypasses RLS automatically; these
-- policies cover the case where the browser session (admin's logged-in
-- user) hits the table directly via the anon client.
drop policy if exists "Admin can read verification decisions" on verification_decisions;
create policy "Admin can read verification decisions"
  on verification_decisions for select
  using (auth.email() = 'booth.nathaniel@gmail.com');

drop policy if exists "Admin can insert verification decisions" on verification_decisions;
create policy "Admin can insert verification decisions"
  on verification_decisions for insert
  with check (auth.email() = 'booth.nathaniel@gmail.com');

drop policy if exists "Admin can update verification decisions" on verification_decisions;
create policy "Admin can update verification decisions"
  on verification_decisions for update
  using (auth.email() = 'booth.nathaniel@gmail.com');
