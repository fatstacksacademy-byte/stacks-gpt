-- ============================================================
-- credit_profiles — the soft inputs to approval odds
--
-- Held cards + open dates (card_accounts) drive the HARD velocity gates
-- (5/24, 2/90, 7/12, …). This table holds the SOFT signals that shift a
-- verdict between "clear" and "caution" and let the engine drop the
-- "needs more info" asterisk:
--   - score                — current FICO/Vantage (the headline number)
--   - hard_inquiries_6mo   — recent inquiries; issuers get sensitive past ~6
--   - hard_inquiries_12mo  — wider window for BofA 7/12-style rules
--   - utilization_pct      — reported revolving utilization (0–100)
--   - annual_income        — gates premium-card approvals / credit lines
--
-- Every field is nullable: the engine degrades gracefully and tells the
-- user exactly which field to add to sharpen each verdict. One row per
-- user, keyed by user_id (upsert on conflict), mirroring savings_profile.
-- ============================================================

create table if not exists credit_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  score int check (score is null or (score between 300 and 900)),
  hard_inquiries_6mo int check (hard_inquiries_6mo is null or hard_inquiries_6mo >= 0),
  hard_inquiries_12mo int check (hard_inquiries_12mo is null or hard_inquiries_12mo >= 0),
  utilization_pct numeric check (utilization_pct is null or (utilization_pct between 0 and 100)),
  annual_income numeric check (annual_income is null or annual_income >= 0),
  updated_at timestamptz not null default now()
);

alter table credit_profiles enable row level security;

drop policy if exists "Users can manage own credit_profiles" on credit_profiles;
create policy "Users can manage own credit_profiles"
  on credit_profiles for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
