-- ============================================================
-- Stacks OS: card triage tables
--
-- Parallel to migrations 015–018 (which built the same surface for
-- bank-bonus verification). Three tables that together let the admin:
--
--   • Approve / Reject / Modify each card_verifications proposed edit
--     and have those decisions persist across runs.
--   • Override the offer_link the verify-cards pipeline fetches when
--     the catalog URL is broken / wrong.
--   • Capture a structured lesson for every Reject + Modify so the
--     next verify-cards run can pass the admin's note + corrected
--     value into Claude's escalation prompt.
--
-- card_verifications already exists (migration 006); these tables
-- extend it the same way the bonus tables extend bonus_verifications.
-- ============================================================

-- ---------- card_url_overrides ----------

create table if not exists card_url_overrides (
  id uuid primary key default gen_random_uuid(),
  card_id text not null,
  override_url text not null,
  previous_url text,
  discovery_method text not null check (length(discovery_method) >= 10),
  is_active boolean not null default true,
  created_by text,
  created_at timestamptz not null default now()
);

create index if not exists idx_card_url_overrides_active
  on card_url_overrides(card_id)
  where is_active = true;

create unique index if not exists uniq_card_url_overrides_one_active
  on card_url_overrides(card_id)
  where is_active = true;

create index if not exists idx_card_url_overrides_recent
  on card_url_overrides(created_at desc);

alter table card_url_overrides enable row level security;

drop policy if exists "Admin can read card url overrides" on card_url_overrides;
create policy "Admin can read card url overrides"
  on card_url_overrides for select
  using (auth.email() = 'booth.nathaniel@gmail.com');

drop policy if exists "Admin can insert card url overrides" on card_url_overrides;
create policy "Admin can insert card url overrides"
  on card_url_overrides for insert
  with check (auth.email() = 'booth.nathaniel@gmail.com');

drop policy if exists "Admin can update card url overrides" on card_url_overrides;
create policy "Admin can update card url overrides"
  on card_url_overrides for update
  using (auth.email() = 'booth.nathaniel@gmail.com');

drop policy if exists "Admin can delete card url overrides" on card_url_overrides;
create policy "Admin can delete card url overrides"
  on card_url_overrides for delete
  using (auth.email() = 'booth.nathaniel@gmail.com');

-- ---------- card_verification_decisions ----------

create table if not exists card_verification_decisions (
  id uuid primary key default gen_random_uuid(),
  card_id text not null,
  field_path text not null,
  verdict text not null check (verdict in ('approved', 'dismissed', 'snoozed')),
  from_value jsonb,
  to_value jsonb,
  snippet_fingerprint text,
  notes text,
  decided_by text,
  decided_at timestamptz not null default now()
);

create index if not exists idx_card_verification_decisions_lookup
  on card_verification_decisions(card_id, field_path);

create index if not exists idx_card_verification_decisions_recent
  on card_verification_decisions(decided_at desc);

alter table card_verification_decisions enable row level security;

drop policy if exists "Admin can read card verification decisions" on card_verification_decisions;
create policy "Admin can read card verification decisions"
  on card_verification_decisions for select
  using (auth.email() = 'booth.nathaniel@gmail.com');

drop policy if exists "Admin can insert card verification decisions" on card_verification_decisions;
create policy "Admin can insert card verification decisions"
  on card_verification_decisions for insert
  with check (auth.email() = 'booth.nathaniel@gmail.com');

drop policy if exists "Admin can update card verification decisions" on card_verification_decisions;
create policy "Admin can update card verification decisions"
  on card_verification_decisions for update
  using (auth.email() = 'booth.nathaniel@gmail.com');

-- ---------- card_flag_issue_reports ----------

create table if not exists card_flag_issue_reports (
  id uuid primary key default gen_random_uuid(),
  card_id text not null,
  field_path text not null,
  from_value jsonb,
  to_value jsonb,
  corrected_value jsonb,  -- null = Reject (stored is right). non-null = Modify (use this value).
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

create index if not exists idx_card_flag_issue_reports_unresolved
  on card_flag_issue_reports(reported_at desc)
  where resolved = false;

create index if not exists idx_card_flag_issue_reports_card
  on card_flag_issue_reports(card_id, field_path);

create index if not exists idx_card_flag_issue_reports_category
  on card_flag_issue_reports(issue_category);

create index if not exists idx_card_flag_issue_reports_unresolved_by_field
  on card_flag_issue_reports(card_id, field_path, reported_at desc)
  where resolved = false;

alter table card_flag_issue_reports enable row level security;

drop policy if exists "Admin can read card flag issue reports" on card_flag_issue_reports;
create policy "Admin can read card flag issue reports"
  on card_flag_issue_reports for select
  using (auth.email() = 'booth.nathaniel@gmail.com');

drop policy if exists "Admin can insert card flag issue reports" on card_flag_issue_reports;
create policy "Admin can insert card flag issue reports"
  on card_flag_issue_reports for insert
  with check (auth.email() = 'booth.nathaniel@gmail.com');

drop policy if exists "Admin can update card flag issue reports" on card_flag_issue_reports;
create policy "Admin can update card flag issue reports"
  on card_flag_issue_reports for update
  using (auth.email() = 'booth.nathaniel@gmail.com');
