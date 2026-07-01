-- ============================================================
-- Stacks OS: queue_snapshots — the Pro "your plan got smarter" record
--
-- The sequencer is otherwise 100% stateless: runSequencer() recomputes the
-- recommended queue from (live catalog + profile) on every load and nothing is
-- ever persisted. That means we can't show a Pro user how their plan improved
-- over time — the past projections were never recorded.
--
-- This table captures ONE row per user per month: the 3-year projection totals
-- the dashboard computes, plus the profile inputs' fingerprint. The fingerprint
-- is load-bearing: it's how the UI distinguishes "we re-sequenced you onto more
-- profitable offers" from "the user just raised their paycheck amount." That
-- distinction is the whole credibility of the Pro pitch.
--
-- Written best-effort from the client (lib/queueSnapshots.ts) — code that ships
-- ahead of this migration simply no-ops, so nothing breaks pre-migration.
-- ============================================================

create table if not exists queue_snapshots (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null references auth.users(id) on delete cascade,
  captured_at    date not null,                 -- first-of-month bucket (one row/month)
  paycheck_total  integer not null default 0,
  savings_total   integer not null default 0,
  spending_total  integer not null default 0,
  portfolio_36mo  integer not null default 0,   -- the headline 3-year number
  top_bonuses     jsonb,                         -- [{label, amount}] for the diff narrative
  profile_hash    text,                          -- fingerprint of the inputs behind this projection
  created_at     timestamptz not null default now(),
  unique (user_id, captured_at)
);

alter table queue_snapshots enable row level security;
create policy "Users can manage own queue_snapshots"
  on queue_snapshots for all using (auth.uid() = user_id);

create index if not exists idx_queue_snapshots_user on queue_snapshots(user_id);
