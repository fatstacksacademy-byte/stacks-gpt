# Overnight accuracy work — June 15→16, 2026

Autonomous run while you slept. Everything below is **build-verified and merged to `main`** unless noted.

## Merged to main
| Commit | What |
|--------|------|
| `f29a383` | **Tier 1** — humanized reward category keys on ~819 card pages; fixed 3 co-brand AFs (United Club $695, Aer Lingus/Iberia $95); Citi Custom Cash → closed-review treatment |
| `120661b` | **Tier 2a** — clean DD-method re-audit for 9 banks whose data was poisoned by wrong-bank values (BofA, PNC, US Bank Smartly, Huntington, KeyBank, USAA, Flushing, Camden National, Unitus). Each method now backed by bank-specific DoC data + issuer terms; adversarial pass dropped unconfirmable claims (e.g. removed Fidelity from BofA, Ally/Schwab from PNC) |
| `8c15f41` | **Tier 2b** — web-verified the 14 major-issuer cards showing $0; only 3 had a real public SUB → applied them (Regions Cash Rewards $200, Amex Marriott Bonvoy Business 150k+$125, USAA Cashback Rewards Plus $200). The other 11 verified as genuinely no-bonus and correctly stay as review pages |
| `ee50050` | **Tier 2c** — verified all 15 AF-bearing Amex cards; flipped the 8 that waive the first-year AF (Hilton Surpass ×2, Hilton Business ×2, Blue Cash Preferred, Morgan Stanley BCP, Delta Gold personal+business) — fixes understated net-year-1 value. Aspire / Platinum / Delta Platinum & Reserve confirmed NOT waived |

Method for 2a/2b: research → **adversarial verification** (drop anything not confirmed by a reputable source), same pattern as the long-form guides.

## Notable verification outcomes (so you can trust the conservatism)
- 11 of 14 "$0 cards" had **no current public SUB** — Citizens Summit & Summit Reserve, US Bank Shield & Smartly, SoFi Everyday (targeted/invite-only) & Unlimited 2%, Synchrony Premier, Mercury IO, FNBO Getaway, State Farm Business, Discover it Miles. Left as reviews rather than fabricating offers.
- The bank DD re-audit **removed bogus methods** (BofA had 30 entries, most unverifiable) and kept only DoC-data-point-backed ones.

## Tier 3 freshness sweeps (CPU scrapers — reports only, nothing auto-applied)
- **`verify:cards` ✅ COMPLETED** — `verification-output/cards-report.md` + `cards-proposed-edits.json`: **536 proposed edits** flagged (incl. 33 wrong-page, 122 no-fields, 81 fetch-errors). These need your triage — NOT applied, because verify has a known false-positive rate (e.g. it false-flagged CSP before). Treat as a worklist, not gospel.
- **`verify:bonuses` ❌ crashed** mid-run (Playwright "browser closed"). No fresh bank report tonight — needs a clean re-run.

## Still open (not started — bigger effort)
- **Card depth** — transfer partners + real point valuations to fix the negative net-year-1 values on premium transferable cards (Venture X, Schwab Plat). Content-heavy.
- **Triage the 536 verify:cards proposals** — worth a pass to catch genuinely stale offers (filter out the wrong-page/fetch-error noise first).
- A handful of catalog notes surfaced by the verification agents (out of scope tonight): e.g. Delta Gold catalog bonus shows 40k but an "up to 90k" public offer is live to 7/15/26; a few rewards arrays use `unit:"points"` on cash-back cards. Minor; flagged for a later pass.

## Safe to assume
All changes are blog/catalog data + render logic; Stacks OS reads the catalog directly so the corrected card numbers (Regions/Marriott/USAA offers, co-brand AFs) flow into its recommendations on next deploy. Each chunk was merged atomically, so nothing is half-applied.
