-- ============================================================
-- Stacks OS: Base tab — bank/brokerage account inventory
--
-- Mirrors owned_cards but for cash + brokerage accounts. Lets the user
-- snapshot their full balance sheet in one place and powers the
-- "move to higher APY" + "best card for your spend" recommendations.
--
-- Account types intentionally limited:
--   checking  — daily-spend account
--   savings   — any non-brokerage savings; HYSA distinguished by APY
--   brokerage — taxable brokerage / IRA / 401k
-- ============================================================

create table if not exists owned_accounts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  institution text not null,
  account_type text not null check (account_type in ('checking', 'savings', 'brokerage')),
  nickname text,
  current_balance numeric not null default 0,
  apy numeric,
  role text,                                  -- primary-dd | emergency-fund | bonus-hunting | sock-drawer
  notes text,
  opened_date date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table owned_accounts enable row level security;
create policy "Users can manage own owned_accounts"
  on owned_accounts for all using (auth.uid() = user_id);

create index if not exists idx_owned_accounts_user on owned_accounts(user_id);
