-- ============================================================
-- Stacks OS: Checking/savings bonus offer verification audit log
--
-- Sister to card_verifications (migration 006) but for bonuses.ts +
-- savingsBonuses.ts. Each row is one bonus's state at the time of
-- one verification run; only problem rows get stored to keep the
-- admin queue focused.
--
-- Until this migration the verify:bonuses cron was running weekly
-- but writing only to the local verification-output/ folder, which
-- GitHub Actions throws away. So checking-bonus issues like the
-- Central Bank 404 sat undetected for weeks. With this table +
-- the persist flag in scripts/verify-bonuses/run.ts, every dead
-- link / promo_removed / expired_text_on_page / no_fields_extracted
-- signal lands in the admin queue alongside the card flags.
--
-- bonus_kind discriminates "checking" vs "savings" so the admin UI
-- can group / colour appropriately.
--
-- No RLS policies — service role only.
-- ============================================================

create table if not exists bonus_verifications (
  id uuid primary key default gen_random_uuid(),
  run_id uuid not null,
  run_at timestamptz not null,
  bonus_id text not null,
  bank_name text not null,
  bonus_kind text not null check (bonus_kind in ('checking', 'savings')),
  url text,
  final_url text,
  status int,
  page_signal text not null,
  field_mismatches jsonb not null default '[]',
  proposed_edits jsonb not null default '[]',
  error_message text,
  reviewed boolean not null default false,
  reviewed_at timestamptz,
  reviewer_notes text,
  created_at timestamptz not null default now()
);

create index if not exists idx_bonus_verifications_run on bonus_verifications(run_id);
create index if not exists idx_bonus_verifications_bonus on bonus_verifications(bonus_id);
create index if not exists idx_bonus_verifications_open on bonus_verifications(bonus_id, run_at desc) where reviewed = false;

alter table bonus_verifications enable row level security;
-- No policies created on purpose: service role only.
