alter table custom_bonuses
  add column if not exists monthly_fee numeric,
  add column if not exists monthly_fee_waiver_text text,
  add column if not exists early_closure_fee numeric;
