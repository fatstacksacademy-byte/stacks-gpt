-- ============================================================
-- Stacks OS: flag_issue_reports — corrected_value column
--
-- The triage page (app/admin/triage/page.tsx) now has three primary
-- actions instead of two:
--
--   Approve  — stored is wrong; apply extracted → catalog
--   Reject   — extracted is wrong; keep stored; admin writes reason + future instruction
--   Modify   — *both* are wrong; admin enters the correct value + reason + future instruction
--
-- Reject already had a home: a flag_issue_reports row + a parallel
-- verification_decisions row with verdict='dismissed'. Modify adds
-- one new fact — the admin's hand-corrected value — and reuses the
-- same teaching columns (issue_category, issue_description,
-- suggested_fix). The corresponding verification_decisions row gets
-- verdict='approved' with to_value = corrected_value, so the
-- existing bulk-apply pipeline can patch the catalog without any
-- new wiring.
--
-- A null corrected_value means "this report came from Reject" (the
-- admin is saying the verifier was wrong, not providing a correct
-- value). A non-null corrected_value means "Modify".
-- ============================================================

alter table flag_issue_reports
  add column if not exists corrected_value jsonb;

-- Index so the verify pipeline can quickly pull every unresolved
-- hint for (bonus_id, field_path) when biasing future extractions.
create index if not exists idx_flag_issue_reports_unresolved_by_field
  on flag_issue_reports(bonus_id, field_path, reported_at desc)
  where resolved = false;
