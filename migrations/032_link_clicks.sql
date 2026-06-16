-- ============================================================
-- Affiliate click registry
--
-- One row per /go/<bonusId> redirect (every "Apply"/"Open Account"
-- CTA in the app routes through that handler). Powers:
--   • clicks-per-card / per-issuer / per-surface analytics
--   • referral-link rotation (served_url + link_label let you tally
--     usage per individual link and retire one as it nears its cap)
--
-- Writes happen with the service-role key (bypasses RLS). Admin reads.
-- ============================================================

create table if not exists link_clicks (
  id          bigint generated always as identity primary key,
  bonus_id    text        not null,
  served_url  text,        -- the link the user was actually sent to (supports rotation)
  link_label  text,        -- short label/code for the served link (per-link tallies)
  src         text,        -- surface that drove the click (?src=cardfinder|stacksos|blog|…)
  referer     text,
  user_agent  text,
  user_id     uuid,        -- authed user if a session was present (nullable)
  ip_hash     text,        -- sha-256(ip + salt), truncated; no raw IP stored
  clicked_at  timestamptz not null default now()
);

create index if not exists link_clicks_bonus_idx on link_clicks (bonus_id, clicked_at desc);
create index if not exists link_clicks_label_idx on link_clicks (link_label, clicked_at desc);

alter table link_clicks enable row level security;

-- Inserts use the service-role key (RLS bypassed). Only the admin can read.
drop policy if exists "Admin read link_clicks" on link_clicks;
create policy "Admin read link_clicks"
  on link_clicks for select
  using (auth.email() = 'booth.nathaniel@gmail.com');
