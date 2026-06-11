-- ============================================================
-- Stacks OS: credit card accounts (held-card inventory)
--
-- The bonus/churning system tracks bonuses earned (completed_bonuses).
-- This table tracks the user's full credit-card INVENTORY — every card
-- they hold or have held, with its open date — which is what 5/24 and
-- churning-eligibility math actually need.
--
-- Unlike completed_bonuses (keyed to a catalog bonus_id), a card here may
-- NOT be in our catalog (old cards, cards we don't track). 5/24 counts ALL
-- personal cards opened in the last 24 months, so we must store them all.
--
-- Populated by the credit-report import (open dates come from the report),
-- by the statement import, or manually. catalog_card_id links to a
-- creditCardBonuses entry when we recognize the card.
-- ============================================================

create table if not exists card_accounts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  issuer text not null,
  product_name text,
  -- Business cards from most issuers don't report to personal credit, so they
  -- don't count toward Chase 5/24. We store the classification to apply that.
  card_type text not null default 'personal' check (card_type in ('personal','business')),
  -- Required for 5/24 / churning math. Date the account was opened.
  open_date date not null,
  -- Closed cards still count toward 5/24 until 24 months pass, so we keep them.
  closed_date date,
  credit_limit numeric,
  -- creditCardBonuses catalog id when recognized, else null.
  catalog_card_id text,
  -- Where this record came from: 'credit_report' | 'statement' | 'manual'.
  source text not null default 'manual',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_card_accounts_user
  on card_accounts(user_id);

create index if not exists idx_card_accounts_user_open
  on card_accounts(user_id, open_date desc);

alter table card_accounts enable row level security;

drop policy if exists "Users read own card accounts" on card_accounts;
create policy "Users read own card accounts"
  on card_accounts for select
  using (auth.uid() = user_id);

drop policy if exists "Users insert own card accounts" on card_accounts;
create policy "Users insert own card accounts"
  on card_accounts for insert
  with check (auth.uid() = user_id);

drop policy if exists "Users update own card accounts" on card_accounts;
create policy "Users update own card accounts"
  on card_accounts for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Users delete own card accounts" on card_accounts;
create policy "Users delete own card accounts"
  on card_accounts for delete
  using (auth.uid() = user_id);
