-- ============================================================
-- Stacks OS: contacts + bonus_interests
--
-- Substrate for the in-house email/CRM system (replacing Beehiiv).
-- Two related tables:
--
-- 1. contacts — the canonical record for every email we've ever
--    collected. Newsletter signups, /bonuses "Track this" leads,
--    Stacks OS users, churned customers. Single source of truth so
--    broadcast tools and reminder crons read from one place.
--
--    customer_status:
--      'lead'    — opted into newsletter, no Stacks OS account yet
--      'current' — has an active auth.users row
--      'former'  — had a row but is no longer paying (set via
--                  Stripe webhook when subscription cancels)
--
-- 2. bonus_interests — when someone clicks "Track this bonus" on
--    /bonuses (or a review page) we record (email, bonus_id) so that
--    on Stacks OS signup we can auto-add those bonuses to their
--    tracked list. The claimed_at + claimed_by_user_id columns let
--    the import be idempotent — we only process unclaimed rows.
--
-- No FK on bonus_id: the catalog lives in TS files, not the DB.
-- Email is the join key, not a FK (the contacts row gets upserted
-- on every interest write so the row always exists, but enforcing
-- with a FK would create ordering brittleness for batch imports).
-- ============================================================

create table if not exists contacts (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  first_seen_at timestamptz not null default now(),
  source text,
  newsletter_opted_in boolean not null default false,
  newsletter_opt_in_at timestamptz,
  stacks_os_user_id uuid references auth.users(id) on delete set null,
  customer_status text not null default 'lead'
    check (customer_status in ('lead', 'current', 'former')),
  updated_at timestamptz not null default now()
);

create index if not exists idx_contacts_status on contacts(customer_status);
create index if not exists idx_contacts_stacks_os_user on contacts(stacks_os_user_id);
create index if not exists idx_contacts_newsletter
  on contacts(email) where newsletter_opted_in = true;

create table if not exists bonus_interests (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  bonus_id text not null,
  bonus_type text,
  source_page text,
  created_at timestamptz not null default now(),
  claimed_at timestamptz,
  claimed_by_user_id uuid references auth.users(id) on delete set null
);

create index if not exists idx_bonus_interests_email_unclaimed
  on bonus_interests(email) where claimed_at is null;
create index if not exists idx_bonus_interests_user
  on bonus_interests(claimed_by_user_id);

-- RLS: both tables are server-only. Public writes go through the
-- /api/bonus-interest route which uses the service-role client.
-- Client reads are not permitted (no policies = deny-all under RLS).
alter table contacts enable row level security;
alter table bonus_interests enable row level security;

-- The user can read their own claimed bonus_interests rows (so a
-- "we added X bonuses for you" toast can show in onboarding).
drop policy if exists "Users can read own claimed bonus_interests" on bonus_interests;
create policy "Users can read own claimed bonus_interests"
  on bonus_interests for select
  using (auth.uid() = claimed_by_user_id);
