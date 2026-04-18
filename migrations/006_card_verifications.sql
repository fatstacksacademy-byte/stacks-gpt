-- ============================================================
-- Stacks OS: Credit card offer verification audit log
--
-- Each row is a single card's state at the time of one verification
-- run. Only cards WITH issues get persisted (OK cards aren't worth
-- storing — saves space and keeps the admin queue focused).
--
-- Workflow:
--   1. GitHub Actions weekly cron runs `npm run verify:cards -- --persist`
--   2. Script writes one row per problem card per run
--   3. Admin /admin/cards-review queries the latest unreviewed row per
--      card and surfaces actionable issues with approve/dismiss buttons
--   4. When admin marks `reviewed = true`, the issue clears from the
--      queue. If next week's run still finds the issue, a new row is
--      inserted and it reappears (the issue isn't actually fixed).
--
-- No RLS policies — service role only. Admin API route is the read path.
-- ============================================================

create table if not exists card_verifications (
  id uuid primary key default gen_random_uuid(),
  run_id uuid not null,
  run_at timestamptz not null,
  card_id text not null,
  card_name text not null,
  issuer text,
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

create index if not exists idx_card_verifications_run on card_verifications(run_id);
create index if not exists idx_card_verifications_card on card_verifications(card_id);
create index if not exists idx_card_verifications_open on card_verifications(card_id, run_at desc) where reviewed = false;

alter table card_verifications enable row level security;
-- No policies created on purpose: client access is denied by default.
-- Service role bypasses RLS for both inserts (cron) and reads (admin API).
