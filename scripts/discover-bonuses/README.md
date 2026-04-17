# discover-bonuses

Automated bonus discovery pipeline. Pulls leads from public RSS feeds and Reddit's JSON API, follows each lead to the bank's own offer page for canonical details, dedupes, classifies, and writes a human-reviewable queue.

**IP-safe**: we only extract lead metadata (bank, product, amount, URL). We never store article bodies from source sites. Canonical details come from the bank's own page.

## Sources

Configure in `config/sources.json`. v1 defaults:

- `doctor-of-credit` — RSS, enabled
- `r-churning` — Reddit JSON, enabled
- `r-bankbonuses` — Reddit JSON, disabled
- `hustler-money-blog` — RSS, disabled
- `bankbonus` — sitemap, disabled

Add/disable by editing the JSON. Supported types: `rss`, `reddit`, `sitemap`.

## Usage

```bash
# Full run (pull + classify + enrich + queue)
npm run discover:bonuses

# Dry run (no files written)
npm run discover:bonuses -- --dry-run

# Skip the Playwright enrichment step
npm run discover:bonuses -- --no-enrich

# Skip the Claude classifier fallback
npm run discover:bonuses -- --no-claude

# Only one source
npm run discover:bonuses -- --source=r-churning

# Limit leads after dedupe
npm run discover:bonuses -- --limit=10

# After manually setting status:"approved" on entries in review-queue/leads.json:
npm run discover:bonuses -- --apply-approved
# → writes lib/data/bonuses.draft.ts (or creditCardBonuses.draft.ts)
# You then review that draft file and copy entries into the live data file.
```

## Output

- `review-queue/leads.json` — canonical queue (persists across runs; human-set `status` fields are preserved)
- `review-queue/digests/YYYY-MM-DD.md` — human-readable digest of **new** leads per run
- `logs/discover-YYYY-MM-DD.jsonl` — full debug log

Both `review-queue/` and `logs/` are gitignored.

## Guardrails

- `robots.txt` fetched per host and honored (Disallow paths skipped, logged)
- Per-host rate limit: 1.5s default (Reddit: 2s), configurable per source in `sources.json` or via `BONUS_BOT_THROTTLE_SECONDS` env
- User-Agent: `StackOS-BonusBot/1.0 (+https://fatstacksacademy.com/bot)` — override via `BONUS_BOT_UA` env
- Claude Haiku budget: 20 calls/run max (configurable via `BONUS_BOT_MAX_CLAUDE_CALLS`)
- Lead metadata only — never source article bodies

## Human review loop

1. `npm run discover:bonuses` — fills the queue
2. Review `review-queue/digests/<today>.md`
3. Edit `review-queue/leads.json` — set `"status": "approved"` on entries you want
4. `npm run discover:bonuses -- --apply-approved` — drops drafts into `lib/data/*.draft.ts`
5. Copy/edit from the draft file into the live `lib/data/bonuses.ts` or `creditCardBonuses.ts`
6. Commit

Draft files are NOT imported by the app — they're review-only.

## Scheduling (later)

Nothing about this script assumes it must run locally. To move to a cron job:
- GitHub Action: `schedule: cron: "0 12 * * *"`; run `npm run discover:bonuses`, commit `review-queue/` changes back to repo via PR.
- Server cron: same command. Make `.cache/`, `review-queue/`, `logs/` paths writable.
