-- ============================================================
-- Stacks OS: page-observation log (Phase 5 — temporal change tracking)
--
-- Every verify run records what the extractor actually saw on each
-- source page. Enables change detection across runs — "this bonus
-- went from $400 to $500 three days ago" — which powers:
--
--   1. "Just bumped" badges in UX  ("bumped 60k → 125k, 3d ago")
--   2. The weekly "what changed this week" newsletter, auto-generated
--   3. Historical range signal ("this offer has ranged $300-$600")
--
-- Distinct from `catalog_verification_state` (which stores only the
-- latest state per bonus, one row total) — observations append-only.
--
-- Distinct from `bonus_verifications` (which logs problem rows with
-- field-level mismatches) — observations capture the raw extraction
-- regardless of whether there's a mismatch.
-- ============================================================

create table if not exists bonus_page_observations (
  id uuid primary key default gen_random_uuid(),
  catalog_id text not null,
  catalog_kind text not null check (catalog_kind in ('card', 'checking', 'savings')),
  observed_at timestamptz not null,
  run_id uuid,
  source_url text,
  extracted jsonb not null,       -- raw extractor output (bonus_amount, fees, spend, etc.)
  stored_snapshot jsonb not null, -- catalog values at time of observation, for diff
  created_at timestamptz not null default now()
);

create index if not exists idx_observations_catalog_time
  on bonus_page_observations(catalog_id, observed_at desc);

-- Recent-runs index for the "what changed this week" weekly cron.
create index if not exists idx_observations_recent
  on bonus_page_observations(observed_at desc);

alter table bonus_page_observations enable row level security;
drop policy if exists "Anyone can read page observations" on bonus_page_observations;
create policy "Anyone can read page observations"
  on bonus_page_observations for select using (true);
-- Service role only writes.
