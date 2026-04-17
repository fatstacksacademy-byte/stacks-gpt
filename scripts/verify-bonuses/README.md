# verify-bonuses

Verification workflow that visits every bonus's source bank page with Playwright, extracts key terms (bonus amount, DD threshold, deposit window, monthly fee, expiration), and compares against the stored values in `lib/data/bonuses.ts` and `lib/data/savingsBonuses.ts`.

## Tiered design — minimize Claude usage

| Tier | Engine | Triggers |
|---|---|---|
| 1 | Regex on rendered text | Most exact matches resolve here — zero LLM calls |
| 2 | HTTP status / redirect / "expired" text | Marks dead offers automatically |
| 3 | Claude Haiku 4.5 | Only when a value disagrees but is plausibly a wording change (≤ 20 calls/run budget) |

## Usage

```bash
# Full run (all non-expired bonuses)
npm run verify:bonuses

# Smoke test on a few
npm run verify:bonuses -- --limit=3

# Re-run a single bonus
npm run verify:bonuses -- --only=nasa-fcu-300-checking-2026

# Skip cache (force re-fetch)
npm run verify:bonuses -- --no-cache

# Skip Claude escalation (free, regex-only pass)
npm run verify:bonuses -- --no-escalate

# Also check entries marked expired
npm run verify:bonuses -- --include-expired
```

## Output

Written to `verification-output/` (gitignored):

- `report.md` — human-readable summary with per-bonus issues
- `results.json` — full structured results
- `proposed-edits.json` — auto-generated edits ready to apply
- `needs-review.json` — ambiguous cases the human should eyeball

Fetched page text is cached in `.cache/verify-bonuses/` for 24 h (keyed by bonus id + URL hash). Re-runs skip unchanged pages.

## Env

- `ANTHROPIC_API_KEY` — only needed if Tier 3 escalation fires. Without it, the run completes but prints a warning on each ambiguous field.

## Dependencies added

- `playwright` (+ Chromium headless shell via `npx playwright install chromium`)
- `p-limit` — concurrency control (3 tabs)
- `tsx` — TypeScript script runner
- `@anthropic-ai/sdk` — Tier 3 judgment only
