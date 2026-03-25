-- ============================================================
-- Stacks OS: Spending & Savings tables
-- Run this in Supabase SQL Editor
-- ============================================================

-- 1. spending_cards — manual credit card / spending bonus tracking
create table if not exists spending_cards (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  card_name text not null,
  issuer text,
  signup_bonus_value numeric,
  annual_fee numeric default 0,
  spend_requirement numeric,
  spend_deadline date,
  opened_date date,
  category_multipliers jsonb default '{}',
  expected_value numeric,
  actual_value numeric,
  status text not null default 'planned' check (status in ('planned', 'active', 'completed', 'canceled')),
  source_type text not null default 'manual',
  canonical_offer_id uuid,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table spending_cards enable row level security;
create policy "Users can manage own spending_cards"
  on spending_cards for all using (auth.uid() = user_id);

create index idx_spending_cards_user on spending_cards(user_id);


-- 2. savings_entries — manual savings bonus / APY tracking
create table if not exists savings_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  institution_name text not null,
  bonus_name text,
  bonus_amount numeric,
  deposit_required numeric,
  holding_period_days int,
  offer_apy numeric,
  promo_apy numeric,
  estimated_yield numeric,
  expected_total_value numeric,
  actual_value numeric,
  opened_date date,
  deadline date,
  status text not null default 'planned' check (status in ('planned', 'active', 'completed', 'canceled')),
  source_type text not null default 'manual',
  canonical_offer_id uuid,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table savings_entries enable row level security;
create policy "Users can manage own savings_entries"
  on savings_entries for all using (auth.uid() = user_id);

create index idx_savings_entries_user on savings_entries(user_id);


-- 3. spending_profile — user's current spending baseline
create table if not exists spending_profile (
  user_id uuid primary key references auth.users(id) on delete cascade,
  monthly_spend numeric,
  category_spend jsonb default '{}',
  current_cards jsonb default '{}',
  current_multipliers jsonb default '{}',
  rewards_valuation text default 'cashback',
  cpp_valuation numeric,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table spending_profile enable row level security;
create policy "Users can manage own spending_profile"
  on spending_profile for all using (auth.uid() = user_id);


-- 4. savings_profile — user's current savings baseline
create table if not exists savings_profile (
  user_id uuid primary key references auth.users(id) on delete cascade,
  current_balance numeric,
  current_apy numeric,
  current_institution text,
  emergency_fund numeric,
  cash_reserves numeric,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table savings_profile enable row level security;
create policy "Users can manage own savings_profile"
  on savings_profile for all using (auth.uid() = user_id);
