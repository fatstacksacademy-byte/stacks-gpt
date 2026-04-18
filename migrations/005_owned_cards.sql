-- ============================================================
-- Stacks OS: Promote spending_cards to owned_cards
--
-- Spending tab is the churning campaign (SUB hunting). The Base tab
-- (incoming) owns the steady-state view: which cards you hold, what
-- role each plays, issuer standing, etc. Both tabs read from the same
-- table — this migration renames it and adds a `role` column for the
-- Base tab's steady-state assignment.
--
-- Existing `status` column is unchanged: it remains the SUB lifecycle
-- indicator (planned / active / completed / canceled).
-- `role` is a separate dimension: null until the user assigns one.
-- ============================================================

alter table spending_cards rename to owned_cards;

alter index idx_spending_cards_user rename to idx_owned_cards_user;

drop policy if exists "Users can manage own spending_cards" on owned_cards;
create policy "Users can manage own owned_cards"
  on owned_cards for all using (auth.uid() = user_id);

alter table owned_cards add column if not exists role text
  check (role in (
    'sub-in-progress',
    'daily-driver',
    'sock-drawer',
    'retention-pending',
    'downgrade-candidate'
  ));

-- Backfill a sensible default role from existing status.
-- Cards actively working a SUB → sub-in-progress.
-- Cards with a completed SUB → daily-driver (user can reassign to sock-drawer).
-- Planned & canceled cards have no role yet.
update owned_cards set role = 'sub-in-progress' where status = 'active' and role is null;
update owned_cards set role = 'daily-driver'    where status = 'completed' and role is null;
