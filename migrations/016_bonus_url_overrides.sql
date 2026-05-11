-- ============================================================
-- Stacks OS: bonus URL overrides
--
-- When the verify-bonuses pipeline fetches the wrong page (a homepage
-- instead of an offer page, a tier matrix instead of a specific tier,
-- a stale redirect, etc.), the admin can manually find the correct URL
-- via the /admin/triage UI and record it here. The pipeline (Phase 6
-- follow-up) reads this table on its next run and uses override_url in
-- place of bonuses.source_links[0] for the matching bonus_id.
--
-- discovery_method is intentionally free-form prose: the admin must
-- describe HOW they found the page so the find-offer-links script can
-- learn from documented heuristics over time. We force at least 10
-- chars in the API layer (CHECK constraint here too for defensive depth).
--
-- Only one row per bonus_id may be is_active = true at a time. New
-- inserts deactivate prior actives in the API; the partial unique index
-- below enforces it at the DB layer too.
--
-- No FK on bonus_id: bonus catalog lives in TS files, not in a DB table.
-- ============================================================

create table if not exists bonus_url_overrides (
  id uuid primary key default gen_random_uuid(),
  bonus_id text not null,
  override_url text not null,
  previous_url text,
  discovery_method text not null check (length(discovery_method) >= 10),
  is_active boolean not null default true,
  created_by text,
  created_at timestamptz not null default now()
);

-- Lookup index for the verify pipeline: given a bonus_id, find its
-- active override (if any). Partial index keeps the index small.
create index if not exists idx_bonus_url_overrides_active
  on bonus_url_overrides(bonus_id)
  where is_active = true;

-- Enforce "only one active override per bonus_id" at the DB layer.
create unique index if not exists uniq_bonus_url_overrides_one_active
  on bonus_url_overrides(bonus_id)
  where is_active = true;

-- Recent-history index for the audit table on the triage page.
create index if not exists idx_bonus_url_overrides_recent
  on bonus_url_overrides(created_at desc);

alter table bonus_url_overrides enable row level security;

-- Admin-only read/write. Service role bypasses RLS automatically; these
-- policies cover the case where the browser session (admin's logged-in
-- user) hits the table directly via the anon client.
drop policy if exists "Admin can read bonus url overrides" on bonus_url_overrides;
create policy "Admin can read bonus url overrides"
  on bonus_url_overrides for select
  using (auth.email() = 'booth.nathaniel@gmail.com');

drop policy if exists "Admin can insert bonus url overrides" on bonus_url_overrides;
create policy "Admin can insert bonus url overrides"
  on bonus_url_overrides for insert
  with check (auth.email() = 'booth.nathaniel@gmail.com');

drop policy if exists "Admin can update bonus url overrides" on bonus_url_overrides;
create policy "Admin can update bonus url overrides"
  on bonus_url_overrides for update
  using (auth.email() = 'booth.nathaniel@gmail.com');

drop policy if exists "Admin can delete bonus url overrides" on bonus_url_overrides;
create policy "Admin can delete bonus url overrides"
  on bonus_url_overrides for delete
  using (auth.email() = 'booth.nathaniel@gmail.com');
