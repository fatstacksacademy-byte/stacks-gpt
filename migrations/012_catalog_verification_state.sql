-- ============================================================
-- Stacks OS: catalog verification state
--
-- Powers the "Verified 4h ago ✓" freshness badge on every bonus /
-- card in the UI. One row per catalog id, updated on every verify
-- run (both successful and problem rows — unlike bonus_verifications
-- which only stores issues).
--
-- confidence rules (enforced in the verify scripts, not SQL):
--   high   = page_signal=ok, 0 mismatches
--   medium = ok + 1-2 mismatches, or ambiguous signals
--   low    = offer_dead, card_name_mismatch, redirected_to_generic,
--            fetch_error, no_fields_extracted, 3+ mismatches
--
-- Read path is public (anon users see badges), write path is service-role.
-- ============================================================

create table if not exists catalog_verification_state (
  catalog_id text primary key,
  catalog_kind text not null check (catalog_kind in ('card', 'checking', 'savings')),
  verified_at timestamptz not null,
  verification_source text not null default 'bank_page',
  confidence text not null check (confidence in ('high', 'medium', 'low')),
  mismatch_count int not null default 0,
  page_signal text,
  updated_at timestamptz not null default now()
);

create index if not exists idx_catalog_verification_state_kind
  on catalog_verification_state(catalog_kind, verified_at desc);

alter table catalog_verification_state enable row level security;

drop policy if exists "Anyone can read catalog verification state" on catalog_verification_state;
create policy "Anyone can read catalog verification state"
  on catalog_verification_state for select using (true);
-- No insert/update policy: service role bypasses RLS. Verify cron is the only writer.
