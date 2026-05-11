-- ============================================================
-- Stacks OS: flag issue reports
--
-- The triage page surfaces flags from the verify pipeline. Approve /
-- Dismiss / Skip captures *what* to do with each flag; this table
-- captures *why the flag was wrong* and *what to change so it stops
-- happening*. Together those two fields are training data for the
-- heuristic classifier (auto-triage-remaining.ts) and the regex
-- extractor (scripts/_shared/extract.ts).
--
-- Submitting a report also writes a parallel "dismissed" decision
-- (the API does this), so reporting gets the flag out of the queue
-- without the admin needing two clicks.
--
-- issue_category is a free-form text but the UI populates it from a
-- short controlled vocabulary so we can group reports later:
--   regex_false_positive, wrong_page, tier_mismatch, conditional_value,
--   snippet_too_narrow, expired_misread, other
--
-- No FK on bonus_id: bonus catalog lives in TS files, not in a DB table.
-- ============================================================

create table if not exists flag_issue_reports (
  id uuid primary key default gen_random_uuid(),
  bonus_id text not null,
  field_path text not null,
  from_value jsonb,
  to_value jsonb,
  url text,
  page_signal text,
  snippet text,
  issue_category text not null,
  issue_description text not null check (length(issue_description) >= 20),
  suggested_fix text not null check (length(suggested_fix) >= 20),
  reported_by text,
  reported_at timestamptz not null default now(),
  resolved boolean not null default false,
  resolved_at timestamptz,
  resolution_notes text
);

create index if not exists idx_flag_issue_reports_unresolved
  on flag_issue_reports(reported_at desc)
  where resolved = false;

create index if not exists idx_flag_issue_reports_bonus
  on flag_issue_reports(bonus_id, field_path);

create index if not exists idx_flag_issue_reports_category
  on flag_issue_reports(issue_category);

alter table flag_issue_reports enable row level security;

drop policy if exists "Admin can read flag issue reports" on flag_issue_reports;
create policy "Admin can read flag issue reports"
  on flag_issue_reports for select
  using (auth.email() = 'booth.nathaniel@gmail.com');

drop policy if exists "Admin can insert flag issue reports" on flag_issue_reports;
create policy "Admin can insert flag issue reports"
  on flag_issue_reports for insert
  with check (auth.email() = 'booth.nathaniel@gmail.com');

drop policy if exists "Admin can update flag issue reports" on flag_issue_reports;
create policy "Admin can update flag issue reports"
  on flag_issue_reports for update
  using (auth.email() = 'booth.nathaniel@gmail.com');
