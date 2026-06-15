-- ============================================================
-- Monthly blog picks — bank bonuses + credit cards
--
-- Admin saves monthly picks here via /admin/blog-posts.
-- Blog pages read from these tables (public SELECT) and fall
-- back to the static TS arrays when no DB row exists.
-- ============================================================

create table if not exists monthly_bank_picks (
  month_slug    text primary key,
  month_label   text        not null,
  published_date date        not null,
  video_id      text,
  intro         text        not null default '',
  picks         jsonb       not null default '[]',
  updated_at    timestamptz not null default now()
);

create table if not exists monthly_card_picks (
  month_slug    text primary key,
  month_label   text        not null,
  published_date date        not null,
  video_id      text,
  intro         text        not null default '',
  picks         jsonb       not null default '[]',
  updated_at    timestamptz not null default now()
);

alter table monthly_bank_picks enable row level security;
alter table monthly_card_picks enable row level security;

-- Blog pages need to read without auth
drop policy if exists "Public read monthly_bank_picks" on monthly_bank_picks;
create policy "Public read monthly_bank_picks"
  on monthly_bank_picks for select using (true);

drop policy if exists "Public read monthly_card_picks" on monthly_card_picks;
create policy "Public read monthly_card_picks"
  on monthly_card_picks for select using (true);

-- Only the admin email can write
drop policy if exists "Admin write monthly_bank_picks" on monthly_bank_picks;
create policy "Admin write monthly_bank_picks"
  on monthly_bank_picks for all
  using   (auth.email() = 'booth.nathaniel@gmail.com')
  with check (auth.email() = 'booth.nathaniel@gmail.com');

drop policy if exists "Admin write monthly_card_picks" on monthly_card_picks;
create policy "Admin write monthly_card_picks"
  on monthly_card_picks for all
  using   (auth.email() = 'booth.nathaniel@gmail.com')
  with check (auth.email() = 'booth.nathaniel@gmail.com');
