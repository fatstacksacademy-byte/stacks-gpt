-- ============================================================
-- Stacks OS: contacts.beehiiv_* sync columns
--
-- Records the outcome of the Beehiiv subscribe attempt on each
-- contact so we can tell from Supabase whether a lead actually
-- reached Beehiiv. Previously the /api/catalog-unlock route
-- swallowed the Beehiiv result into a console.error and always
-- returned ok:true, so a missing API key and a real subscribe
-- looked identical from the outside.
--
--   beehiiv_status          — Beehiiv subscription status on success
--                             ('validating' | 'active' | ...), null
--                             when never synced or the attempt failed.
--   beehiiv_subscription_id — the sub_... id; proof it landed.
--   beehiiv_synced_at       — timestamp of the last attempt (set on
--                             every attempt, success or failure).
--   beehiiv_error           — short diagnostic when the last attempt
--                             failed/was skipped; null on success.
--
-- Find leads that never reached Beehiiv:
--   select email, beehiiv_error from contacts
--   where newsletter_opted_in and beehiiv_subscription_id is null;
-- ============================================================

alter table contacts
  add column if not exists beehiiv_status text,
  add column if not exists beehiiv_subscription_id text,
  add column if not exists beehiiv_synced_at timestamptz,
  add column if not exists beehiiv_error text;
