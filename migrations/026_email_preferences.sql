-- ============================================================
-- Stacks OS: email_preferences + email_sent_log
--
-- Two tables that together let us send deadline reminders and a
-- weekly digest *without* spamming users:
--
--   email_preferences — per-user opt-in flags. Defaults to "on" for
--     authenticated users so reminders work out of the box; a single
--     unsubscribe_token in the URL flips everything off without
--     requiring a login.
--
--   email_sent_log    — idempotency record. The cron scans candidates
--     daily, but we only want to send a "deposit deadline in 7 days"
--     email once per (user_id, bonus_key, kind). The log makes the
--     cron safely re-runnable.
--
-- bonus_key is a free-form text: for catalog checking bonuses we
-- store the completed_bonuses.id (UUID), for custom bonuses the
-- custom_bonuses.id, for spending cards the owned_cards.id, for
-- savings entries the savings_entries.id. We never join across
-- those tables so a plain text key is fine and avoids 4 FKs.
-- ============================================================

create table if not exists email_preferences (
  user_id uuid primary key references auth.users(id) on delete cascade,
  deadline_reminders boolean not null default true,
  weekly_digest boolean not null default true,
  unsubscribe_token text not null default encode(gen_random_bytes(24), 'hex'),
  unsubscribed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists idx_email_preferences_unsubscribe_token
  on email_preferences(unsubscribe_token);

alter table email_preferences enable row level security;

drop policy if exists "Users read own email prefs" on email_preferences;
create policy "Users read own email prefs"
  on email_preferences for select
  using (auth.uid() = user_id);

drop policy if exists "Users update own email prefs" on email_preferences;
create policy "Users update own email prefs"
  on email_preferences for update
  using (auth.uid() = user_id);

drop policy if exists "Users insert own email prefs" on email_preferences;
create policy "Users insert own email prefs"
  on email_preferences for insert
  with check (auth.uid() = user_id);

-- ============================================================

create table if not exists email_sent_log (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  -- Kind labels: "deadline_t7", "deadline_t1", "weekly_digest"
  kind text not null,
  -- bonus_key is empty for digest emails.
  bonus_key text not null default '',
  sent_at timestamptz not null default now(),
  -- Resend message id for debugging delivery failures.
  resend_message_id text
);

-- One row per (user, bonus, kind) keeps the cron idempotent.
create unique index if not exists idx_email_sent_log_dedup
  on email_sent_log(user_id, kind, bonus_key);

create index if not exists idx_email_sent_log_user_recent
  on email_sent_log(user_id, sent_at desc);

alter table email_sent_log enable row level security;

-- No user-facing policies; only the service role (cron) writes/reads here.
