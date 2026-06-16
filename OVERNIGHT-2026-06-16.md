# Overnight accuracy work — June 15→16, 2026

Autonomous run while you slept. Everything below is **build-verified and merged to `main`** unless noted.

## Merged to main
| Commit | What |
|--------|------|
| `f29a383` | **Tier 1** — humanized reward category keys on ~819 card pages; fixed 3 co-brand AFs (United Club $695, Aer Lingus/Iberia $95); Citi Custom Cash → closed-review treatment |
| `120661b` | **Tier 2a** — clean DD-method re-audit for 9 banks whose data was poisoned by wrong-bank values (BofA, PNC, US Bank Smartly, Huntington, KeyBank, USAA, Flushing, Camden National, Unitus). Each method now backed by bank-specific DoC data + issuer terms; adversarial pass dropped unconfirmable claims (e.g. removed Fidelity from BofA, Ally/Schwab from PNC) |
| `8c15f41` | **Tier 2b** — web-verified the 14 major-issuer cards showing $0; only 3 had a real public SUB → applied them (Regions Cash Rewards $200, Amex Marriott Bonvoy Business 150k+$125, USAA Cashback Rewards Plus $200). The other 11 verified as genuinely no-bonus and correctly stay as review pages |

Method for 2a/2b: research → **adversarial verification** (drop anything not confirmed by a reputable source), same pattern as the long-form guides.

## Notable verification outcomes (so you can trust the conservatism)
- 11 of 14 "$0 cards" had **no current public SUB** — Citizens Summit & Summit Reserve, US Bank Shield & Smartly, SoFi Everyday (targeted/invite-only) & Unlimited 2%, Synchrony Premier, Mercury IO, FNBO Getaway, State Farm Business, Discover it Miles. Left as reviews rather than fabricating offers.
- The bank DD re-audit **removed bogus methods** (BofA had 30 entries, most unverifiable) and kept only DoC-data-point-backed ones.

## Not done / flagged
- **Tier 2c (annual-fee-waiver math on Amex Delta/Hilton cluster)** — pending (needs per-card verification; lower impact). [status updated below if completed]
- **Tier 3 freshness sweeps** — `verify:bonuses` **crashed** near the end (Playwright "browser closed"); `verify:cards` was still running (~478/1103) and is slow/flaky. No fresh report produced. These are CPU/free and auto-apply nothing; worth a clean re-run when you're around. (Prior Jun 14 `verification-output/report.md` + `proposed-edits.json` exist if useful.)
- **Card depth** (transfer partners + real point valuations to fix negative net-year-1 values) — larger content effort, not started.

## Safe to assume
All changes are blog/catalog data + render logic; Stacks OS reads the catalog directly so the corrected card numbers (Regions/Marriott/USAA offers, co-brand AFs) flow into its recommendations on next deploy. Each chunk was merged atomically, so nothing is half-applied.
