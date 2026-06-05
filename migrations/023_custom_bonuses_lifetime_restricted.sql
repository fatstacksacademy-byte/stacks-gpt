alter table custom_bonuses
  add column if not exists lifetime_restricted boolean;
