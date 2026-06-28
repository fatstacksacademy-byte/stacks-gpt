-- ============================================================
-- Stacks OS: discovery leads queue
--
-- Durable, cross-machine home for leads surfaced by the discover
-- pipeline (discover-bonuses + discover-cards). Replaces the local,
-- gitignored review-queue/leads.json — which evaporated on every CI
-- runner, so scheduled discovery never actually fed the catalog and the
-- /admin/discover-review UI only worked on one laptop.
--
-- One table holds BOTH kinds (kind = 'bonus' | 'card'). The two lead
-- shapes differ, so the full typed lead lives in `payload jsonb` and only
-- the columns the queue / dedup / review screen need are promoted to real
-- columns.
--
-- status lifecycle (mirrors the old leads.json + verification_decisions):
--   new       — freshly discovered, awaiting human review
--   approved  — admin wants it promoted into the catalog
--   rejected  — admin says no (not a real / eligible offer)
--   snoozed   — revisit later; keep surfacing in the queue
--   applied   — the promote step wrote it into lib/data/*.ts
--   dismissed — the promote step couldn't use it (dupe / expired / parse)
--
-- dedup: (kind, lead_key) is unique. lead_key is the discover script's own
-- dedupe hash (bonus: leadKey(bank, product, amount); card: sha1 of the
-- normalized card name). Script upserts preserve any human-set status —
-- Supabase is the source of truth for status, NOT the ephemeral local file.
--
-- No FK on the catalog: bonus / card data lives in TS files, not the DB.
-- ============================================================

create table if not exists discovery_leads (
  id uuid primary key default gen_random_uuid(),
  lead_key text not null,
  kind text not null check (kind in ('bonus', 'card')),

  -- promoted display / query columns (full object is in payload)
  name text not null,                 -- product / card name
  institution text,                   -- bank / issuer
  bonus_amount numeric,               -- dollars or points; nullable
  classification text,                -- bonus classification or 'credit_card_bonus'
  confidence numeric,                 -- 0..1
  source_url text,                    -- primary lead source (press / DoC / RWP)
  canonical_url text,                 -- issuer / bank offer page, if found
  flags jsonb not null default '[]',
  payload jsonb not null,             -- full Lead / Proposal object

  -- review lifecycle
  status text not null default 'new'
    check (status in ('new', 'approved', 'rejected', 'snoozed', 'applied', 'dismissed')),
  decided_by text,
  decided_at timestamptz,
  decision_notes text,
  applied_at timestamptz,

  discovered_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- One row per (kind, dedupe-key). Script upserts target this index.
create unique index if not exists uniq_discovery_leads_key
  on discovery_leads(kind, lead_key);

-- Review queue: items still needing eyes (drives the /admin/review count).
create index if not exists idx_discovery_leads_pending
  on discovery_leads(discovered_at desc)
  where status in ('new', 'approved');

-- Promote step: approved but not yet written to the catalog.
create index if not exists idx_discovery_leads_pending_apply
  on discovery_leads(applied_at)
  where status = 'approved' and applied_at is null;

create index if not exists idx_discovery_leads_recent
  on discovery_leads(discovered_at desc);

alter table discovery_leads enable row level security;

-- Admin reads + updates status from the browser (anon client + logged-in
-- session). The discover scripts use the service role, which bypasses RLS
-- for the upsert insert. No public read: leads are pre-publication.
drop policy if exists "Admin can read discovery leads" on discovery_leads;
create policy "Admin can read discovery leads"
  on discovery_leads for select
  using (auth.email() = 'booth.nathaniel@gmail.com');

drop policy if exists "Admin can update discovery leads" on discovery_leads;
create policy "Admin can update discovery leads"
  on discovery_leads for update
  using (auth.email() = 'booth.nathaniel@gmail.com');
