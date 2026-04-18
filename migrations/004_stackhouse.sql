-- 004_stackhouse.sql
-- Adds the Stackhouse layer on top of Stacks OS. All tables prefixed stackhouse_.
-- No existing table is modified. Safe to run in any order relative to 001-003.
--
-- RLS summary:
--   stackhouse_profiles, stackhouse_side_hustles, stackhouse_modifiers,
--   stackhouse_street_wins           → owner-scoped CRUD (user_id = auth.uid())
--   stackhouse_xp_events             → owner-scoped SELECT only;
--                                      INSERT/UPDATE/DELETE restricted to service role
--                                      (so /stackhouse/api/xp-events is the only way
--                                      to award XP — users cannot self-grant)
--   stackhouse_achievement_definitions → SELECT for any authenticated user;
--                                        writes restricted to service role (seed data)

-- ─── 1. Profile: one row per user, cached rank/xp/purity for fast reads ────
create table if not exists stackhouse_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  class text not null default 'kingpin',
  current_xp integer not null default 0,
  rank integer not null default 1,
  purity_pct numeric(5, 2) not null default 100.00,
  action_points integer not null default 3,          -- phase 2, reserved
  preferences jsonb not null default '{"mode":"stackhouse"}'::jsonb,
  onboarded_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table stackhouse_profiles enable row level security;

create policy "stackhouse_profiles_select_own"
  on stackhouse_profiles for select
  using (auth.uid() = user_id);

create policy "stackhouse_profiles_insert_own"
  on stackhouse_profiles for insert
  with check (auth.uid() = user_id);

create policy "stackhouse_profiles_update_own"
  on stackhouse_profiles for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ─── 2. Side hustles: user-defined quests with inline milestones ──────────
create table if not exists stackhouse_side_hustles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  target_amount numeric(10, 2) not null,
  milestones jsonb not null default '[]'::jsonb,
  -- milestones shape: [{id, threshold, xp_reward, label, completed_at}]
  xp_reward integer not null default 100,
  status text not null default 'active' check (status in ('active', 'completed', 'abandoned')),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists stackhouse_side_hustles_user_idx
  on stackhouse_side_hustles (user_id, status);

alter table stackhouse_side_hustles enable row level security;

create policy "stackhouse_side_hustles_select_own"
  on stackhouse_side_hustles for select
  using (auth.uid() = user_id);

create policy "stackhouse_side_hustles_insert_own"
  on stackhouse_side_hustles for insert
  with check (auth.uid() = user_id);

create policy "stackhouse_side_hustles_update_own"
  on stackhouse_side_hustles for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "stackhouse_side_hustles_delete_own"
  on stackhouse_side_hustles for delete
  using (auth.uid() = user_id);

-- ─── 3. XP ledger: append-only; service-role-only writes ─────────────────
create table if not exists stackhouse_xp_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  source_type text not null check (source_type in (
    'cook_completion', 'milestone_hit', 'side_hustle_complete',
    'daily_round', 'street_win', 'admin_adjust'
  )),
  source_id text,
  amount integer not null,
  note text,
  occurred_at timestamptz not null default now()
);

create index if not exists stackhouse_xp_events_user_idx
  on stackhouse_xp_events (user_id, occurred_at desc);

alter table stackhouse_xp_events enable row level security;

-- Authenticated users can read their own events (history, timeline).
create policy "stackhouse_xp_events_select_own"
  on stackhouse_xp_events for select
  to authenticated
  using (auth.uid() = user_id);

-- No INSERT/UPDATE/DELETE policies for authenticated role = all writes denied.
-- Writes must come from the service role via /stackhouse/api/xp-events,
-- which validates the source before inserting. (Service role bypasses RLS.)

-- ─── 4. Modifiers: join table, cascades from spending_cards ───────────────
create table if not exists stackhouse_modifiers (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  spending_card_id uuid not null references spending_cards(id) on delete cascade,
  modifier_key text not null,
  modifier_params jsonb not null default '{}'::jsonb,
  activated_at timestamptz not null default now(),
  expires_at timestamptz
);

create index if not exists stackhouse_modifiers_user_idx
  on stackhouse_modifiers (user_id);

alter table stackhouse_modifiers enable row level security;

create policy "stackhouse_modifiers_select_own"
  on stackhouse_modifiers for select
  using (auth.uid() = user_id);

create policy "stackhouse_modifiers_insert_own"
  on stackhouse_modifiers for insert
  with check (auth.uid() = user_id);

create policy "stackhouse_modifiers_update_own"
  on stackhouse_modifiers for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "stackhouse_modifiers_delete_own"
  on stackhouse_modifiers for delete
  using (auth.uid() = user_id);

-- ─── 5. Achievement definitions: static seed, admin-only writes ──────────
create table if not exists stackhouse_achievement_definitions (
  key text primary key,
  title_stackhouse text not null,
  title_clean text not null,
  description_stackhouse text,
  description_clean text,
  xp_reward integer not null default 0,
  tier text check (tier in ('bronze', 'silver', 'gold', 'centurion')),
  unlock_criteria jsonb not null default '{}'::jsonb,
  sort_order integer not null default 0
);

alter table stackhouse_achievement_definitions enable row level security;

-- Any authenticated user can browse the achievement catalog.
create policy "stackhouse_achievement_definitions_select_all"
  on stackhouse_achievement_definitions for select
  to authenticated
  using (true);

-- No INSERT/UPDATE/DELETE policies = service-role-only (seeded via SQL).

-- ─── 6. Street wins: earned achievements ─────────────────────────────────
create table if not exists stackhouse_street_wins (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  achievement_key text not null references stackhouse_achievement_definitions(key),
  earned_at timestamptz not null default now(),
  source_context jsonb,
  unique (user_id, achievement_key)
);

create index if not exists stackhouse_street_wins_user_idx
  on stackhouse_street_wins (user_id, earned_at desc);

alter table stackhouse_street_wins enable row level security;

create policy "stackhouse_street_wins_select_own"
  on stackhouse_street_wins for select
  using (auth.uid() = user_id);

-- Writes service-role-only (awarded programmatically via xp-events route).

-- ─── Seed: initial achievement catalog (Phase 1 stubs) ────────────────────
insert into stackhouse_achievement_definitions
  (key, title_stackhouse, title_clean, description_stackhouse, description_clean, xp_reward, tier, unlock_criteria, sort_order)
values
  ('first_cook', 'First cook', 'First bonus',
   'Close your first job without heat.', 'Complete your first bonus.',
   500, 'bronze', '{"count_of_kind":"cook_completion","at_least":1}'::jsonb, 10),
  ('triple_stack', 'Triple stack', 'Three completed',
   'Three jobs in the bag.', 'Three bonuses completed.',
   1000, 'silver', '{"count_of_kind":"cook_completion","at_least":3}'::jsonb, 20),
  ('ten_deep', 'Ten deep', 'Veteran',
   'Ten jobs done clean.', 'Ten bonuses completed.',
   2500, 'gold', '{"count_of_kind":"cook_completion","at_least":10}'::jsonb, 30),
  ('centurion', 'Centurion', 'Century club',
   'A hundred jobs in the books.', 'One hundred bonuses completed.',
   10000, 'centurion', '{"count_of_kind":"cook_completion","at_least":100}'::jsonb, 40),
  ('big_score', 'Big score', 'Heavy hitter',
   'A single $500+ payoff.', 'A single $500+ bonus.',
   500, 'silver', '{"single_amount_at_least":500}'::jsonb, 50),
  ('quick_cook', 'Quick cook', 'Speed run',
   'Completed a job in under 60 days.', 'Bonus completed in under 60 days.',
   750, 'silver', '{"complete_within_days":60}'::jsonb, 60)
on conflict (key) do nothing;
