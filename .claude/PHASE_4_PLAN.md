# Phase 4 — nightly catalog pipeline

## v1 (shipped)

`.github/workflows/nightly-catalog-pipeline.yml` runs at 13:00 UTC daily.

```
verify:bonuses --persist
verify:cards   --persist        (best-effort, allowed to fail)
catalog:apply-decisions --write
if lib/data/* changed → open PR
else → exit clean
```

### Required secrets

In the repo's Settings → Secrets and variables → Actions:

- `ANTHROPIC_API_KEY` — needed for verify escalation
- `NEXT_PUBLIC_SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`

### What the user does

1. Triage flags at `/admin/triage` + `/admin/card-triage` whenever convenient. Decisions land in Supabase.
2. Nightly cron applies any new `verdict='approved'` decisions to the live catalog files.
3. A PR opens against `main` with the diff. Merge it (or close + reset the decision via `scripts/revert-decisions.ts` if something looks wrong).

### What v1 does NOT do

- **Doesn't run discover.** Discover writes to `review-queue/leads.json` which is gitignored, so the CI runner can't persist state across runs. The user's local `npm run discover:bonuses` remains the source of new leads.
- **Doesn't run promote-leads.** Same reason — it needs the local leads.json state.
- **Doesn't surface verify findings to a queue for the user.** Verify writes to Supabase tables; the user already gets those via `/admin/triage` next time they open it.

---

## v2 plan (when ready)

The blocker is "lead status lives in a gitignored local file." Fixing it lets v2 add discover + promote-leads to the nightly pipeline.

### Migration

```sql
create table discover_lead_status (
  lead_id text primary key,                              -- the 12-char id from leads.json
  status text not null check (status in ('new','approved','dismissed','snoozed','applied')),
  decided_by text,
  decided_at timestamptz not null default now(),
  decision_notes text,
  applied_target_file text,                              -- 'bonuses.ts' | 'savingsBonuses.ts' | 'creditCardBonuses.ts'
  applied_target_id text,                                -- the catalog id this lead became
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_discover_lead_status_open
  on discover_lead_status(status, decided_at desc)
  where status = 'approved';

alter table discover_lead_status enable row level security;
-- Admin-only RLS policies same as the verification_decisions table.
```

### App + script changes

- **`/api/admin?action=discover-queue`**: read leads from `leads.json`, LEFT JOIN on `discover_lead_status` by lead_id for status. New leads default to `status='new'`.
- **`/api/admin?action=discover-decide`**: upsert `discover_lead_status` instead of mutating `leads.json`.
- **`scripts/promote-approved-leads/run.ts`**: read approved leads via Supabase, not `leads.json`. Write applied/dismissed status back to Supabase.
- **`/admin/discover-review` page**: no change — it talks through the API.

### v2 workflow additions

```
discover:bonuses                    (writes new leads to leads.json — committed at end)
verify:bonuses --persist
verify:cards   --persist
catalog:apply-decisions --write     (Phase 1 — already in v1)
catalog:promote-leads --write       (Phase 3 — new in v2)
commit leads.json + lib/data        (state persistence + PR)
```

### Why this is deferred

- v1 covers the highest-frequency case (admin triage → catalog). That's where the bulk of the manual work was.
- Promote-leads is bursty (only fires after `/admin/discover-review` triage), so even running it locally on-demand is fine.
- v2 is a clean migration but a meaningful one — touches the page, the API, the script, and adds a table. Worth doing when the user has a clear quiet window.
