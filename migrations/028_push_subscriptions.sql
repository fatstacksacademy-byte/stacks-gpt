-- ============================================================
-- Stacks OS: web push subscriptions
--
-- Stores one row per (user, device) push subscription so the
-- deadline-reminders + weekly-digest crons can send notifications
-- straight to the user's lock screen — Android Chrome, desktop
-- Chrome / Edge / Firefox, and iOS Safari 16.4+ (installed PWAs only).
--
-- The endpoint URL is unique per push subscription, so a user with
-- 3 devices ends up with 3 rows.  The browser also rotates endpoints
-- occasionally; we upsert on endpoint to keep the row count sane.
--
-- p256dh + auth are the public-key material the Web Push protocol
-- needs to encrypt the payload to the subscription.  We store them as
-- text (base64url) and reconstruct the keys server-side.
-- ============================================================

create table if not exists push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  user_agent text,
  created_at timestamptz not null default now(),
  -- Updated each time we successfully deliver a push; useful for pruning
  -- subscriptions that have been silently dead for weeks.
  last_used_at timestamptz,
  -- Set when the push provider returns 404 / 410 (subscription expired).
  -- Soft-delete so we keep the row for analytics.
  expired_at timestamptz
);

create index if not exists idx_push_subscriptions_user
  on push_subscriptions(user_id)
  where expired_at is null;

create index if not exists idx_push_subscriptions_active
  on push_subscriptions(last_used_at desc)
  where expired_at is null;

alter table push_subscriptions enable row level security;

drop policy if exists "Users read own push subs" on push_subscriptions;
create policy "Users read own push subs"
  on push_subscriptions for select
  using (auth.uid() = user_id);

drop policy if exists "Users insert own push subs" on push_subscriptions;
create policy "Users insert own push subs"
  on push_subscriptions for insert
  with check (auth.uid() = user_id);

drop policy if exists "Users delete own push subs" on push_subscriptions;
create policy "Users delete own push subs"
  on push_subscriptions for delete
  using (auth.uid() = user_id);
