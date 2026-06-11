-- ============================================================
-- Stacks OS: savings_entries milestone timestamps
--
-- Replaces the previous localStorage-only milestone tracking
-- (`stacks:savings:{entryId}:opened` and `:deposited`) with persisted
-- timestamps. Each milestone is nullable — NULL means "not yet done";
-- a timestamp means "user marked this complete on that date." Storing
-- the time (rather than a boolean) lets the liquidity timeline show
-- when each step happened and survives reminders/cron filtering.
--
-- Three milestones replace what used to live in localStorage:
--   account_opened_at — user confirmed the account is open and live
--   funded_at         — required deposit has hit the account
--   bonus_posted_at   — cash bonus has posted (the moment they can
--                        legitimately call the bonus "earned"; the
--                        existing `actual_value` field captures the
--                        amount, this one captures the date)
--
-- closed_at / status="completed" already exist on the row, so the
-- final "safe to withdraw" / "closed" milestone keeps its existing
-- representation. Migrating the existing flow is intentionally
-- additive — no behavior change for rows where these columns are
-- null, and the SavingsClient will backfill from localStorage on
-- first load after deploy.
-- ============================================================

alter table savings_entries
  add column if not exists account_opened_at timestamptz,
  add column if not exists funded_at         timestamptz,
  add column if not exists bonus_posted_at   timestamptz;

-- Helpful when filtering "needs attention" rows in the dashboard /
-- reminder cron — entries whose required milestones are still null.
create index if not exists idx_savings_entries_pending_milestones
  on savings_entries (user_id)
  where status = 'active'
    and (account_opened_at is null or funded_at is null);
