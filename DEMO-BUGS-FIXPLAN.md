# Stacks OS Demo — Bug List & Fix Plan
_Source: screen recording `~/Desktop/2026-06-24 15-01-41.mp4` (15:39). Transcribed + root-caused 2026-06-24._

You flagged 6 things during the demo. **5 are real bugs. 1 (Wells Fargo) is correct behavior misread on screen.**
Timestamps below are clickable reference points in the recording.

---

## 🔴 Ship-now (one-liners, high credibility impact) — ✅ ALL THREE FIXED 2026-06-24 (tsc clean, not yet committed)

### BUG 1 — Free dashboard leaks Pro-generated savings bonuses ✅ FIXED
- **@ 3:48–4:01** — _"none of them are generated except for these savings ones for some reason… it's showing a couple in here, I need to fix that."_
- **Root cause:** Savings page renders an **ungated** "Projection Hero" + breakdown table that runs the Pro sequencer. `app/stacksos/savings/SavingsClient.tsx:583` is gated only by `{hasBalance && deployableCash > 0}` — **no `isPaid` check**. Paycheck (`RoadmapClient.tsx:1331`) and Spending (`SpendingClient.tsx:540`) both gate on `isPaid`; savings has TWO sequencer sections and only the *recommended list* (`SavingsClient.tsx:890`) got the gate.
- **Why it surfaced now:** today's commit `8690a22 feat(onboarding): require savings + spending entry` means every new free user lands with `current_balance > 0` → sequencer runs → ungated hero renders phantom bonuses.
- **Fix (1 line):** `SavingsClient.tsx:583` → `{isPaid && hasBalance && deployableCash > 0 && (() => {`
  - Optional perf: also short-circuit the sequencer compute at line ~273.

### BUG 2 — Dashboard shows $999, detail shows $100 (same bonus) ✅ FIXED
- **@ 7:16** — _"for some reason it says 999 on the dashboard, but it's only 100 here. This is the referral bonus."_
- **Root cause:** the two surfaces read **different fields** off the same `savings_entries` row. Dashboard tile uses `expected_total_value` (bonus **+ projected yield**) — `HubClient.tsx:384`. Detail card uses `bonus_amount` (pure bonus = $100) — `SavingsClient.tsx:758,770`. No `999` literal exists in code; it's a stored value (manual add where yield pushed `expected_total_value` to ~999). **Systemic** — any tracked savings entry with non-trivial yield diverges, not just this one.
- **Fix (1 line):** `HubClient.tsx:384` → `amount: e.bonus_amount ?? e.expected_total_value ?? 0,` (dashboard now matches the "$100 bonus" headline). Trade-off: the dashboard in-progress total then sums pure bonus dollars, not bonus+yield — the more conservative/consistent number.

### BUG 3 — "Applied" step pre-checked on every tracked bonus ✅ FIXED (removed the row — see note)
- **@ 7:52–8:07** — _"another glitch… it shows they already applied when they clicked from the website. It shouldn't say that — it should just be tracking it."_
- **Root cause:** **rendering bug, not data.** Tracking from the catalog calls `markBonusStarted` which leaves `current_step = null` (correct, just-tracking). But the active-bonus checklist **hardcodes** a green-checked, strikethrough "Applied" row for every in-progress bonus — `RoadmapClient.tsx:2325-2333` (comment literally says _"Applied — always complete once a bonus is in progress"_).
- **Fix:** make that "Applied" row conditional on the bonus actually having gone through the apply flow (`record.current_step === "applied"`), or fold "Applied" into the computed milestone list so it can't desync. ~9-line localized change, no schema/`trackBonus` change.

---

## 🟡 Next pass — ✅ ALL FIXED 2026-06-24 (tsc + build clean, 346/347 tests pass; the 1 failure is pre-existing in trackBonus.test.ts, unrelated)

### BUG 4 — "Bank Bonuses" catalog flashes/reshuffles when you pick a state ✅ FIXED
- **@ 4:25–4:57** — _"this is a glitch, if you're editing cut this part out"_ … _"move my head over… it's not doing the best job."_
- **Root cause:** `StateOfferBrowser` and `FilterableCatalog` call `useCatalogUnlock()` but **ignore the `hydrated` flag the hook exposes** for exactly this. First paint renders the locked state (email gate shown, GA-local rows filtered out); the effect then flips `unlocked → true` and the whole list re-renders — visible flash + layout shift right as the page appears. For a signed-in user this happens every load.
  - `app/components/StateOfferBrowser.tsx:55`, `app/components/FilterableCatalog.tsx:49`, hook at `app/components/useCatalogUnlock.ts:22,96`.
- **Fix:** destructure `hydrated`, and treat the catalog as "unknown" until `hydrated` (show everything / a stable skeleton, don't render the gate or filter `isLocal` rows until hydrated). Secondary: point the dashboard "Bank Bonuses" link straight at `/bank-bonuses-by-state` to drop the `/bonuses` → 307 redirect hop (`HubClient.tsx:601,693`).

### BUG 3b — Checklist deeper issues (same checklist as Bug 3) ✅ FIXED
- **@ 6:53** — _"I think this is a glitch"_ (vague; #1 cause is Bug 3's hardcoded "Applied"). Two more real ones in the same component, worth fixing in the same pass:
  - **Time-based auto-complete contradicts real data.** `lib/bonusSteps.ts:186,202` auto-checks "Set Up Recurring DD" (~2 wks) and "Deposit Requirement Met" purely on elapsed days — so you can see _"Deposit Requirement Met ✓"_ while the deposit progress bar reads _"$0 of $1,000"_ (`RoadmapClient.tsx:2427-2444`). That internal contradiction reads as glitched.
  - **DD step shows for non-DD bonuses.** `MILESTONE_DEFS` always includes `dd_confirmed` (`bonusSteps.ts:72-78`) and it's rendered unconditionally — tells users to "Set Up Recurring Direct Deposit" on bonuses that don't require DD. `bonusNextStep.ts:117` already branches on `direct_deposit_required`; the milestone checklist should too.

### BUG 5 — Double data entry (friction, not a glitch) ✅ FIXED
- **@ 2:25** — _"now that we made the account, it's going to ask some of the same questions again."_
- The onboarding sales projection collects paycheck / frequency / savings / spend / state, then the post-signup profile asks the same again. Carry the onboarding answers into the profile (querystring or temp store) so signed-up free users don't re-enter everything.

---

## ✅ NOT a bug — Wells Fargo "missing at end of year"
- **@ 11:50** — _"why isn't Wells Fargo showing up again at the end of this year?"_
- **It does re-queue — just in Year 2 (week ~71), and you were viewing Year 1.** WF Everyday Checking (`bonuses.ts:456-495`) has `cooldown_months: 12` + `bonus_posting_days_est: 120`. First payout week 18 + 53-week cooldown = week 71. It **cannot** mathematically reappear inside Year 1 (weeks 1–52); the re-queue logic at `sequencer.ts:436-441` is working. Affects every ~12-month-cooldown bonus identically.
- **Optional UX fix:** in `SequencerClient.tsx`, surface a "Wells Fargo returns in Year 2 (after 12-mo cooldown)" chip in the Year-1 view so it's clear *why* it's gone and that it comes back. The `SlotPlaceholder` already carries `waiting_for` + `available_week`.
- **Two latent gaps found (not the demo bug):** (1) the **savings** sequencer never re-queues at all — every savings bonus is one-and-done regardless of churnability (`savingsSequencer.ts:325` splices permanently). (2) The sequencer honors only the boolean `expired` flag, not offer expiry dates in free text — can schedule Year-2 cycles for promos that will be dead.

---

## Suggested order
1. **Bugs 1, 2, 3** — three small, high-visibility fixes. ~30 min, big credibility win (these are the ones that make a demo look broken).
2. **Bug 4** (catalog hydration flash) + **Bug 3b** (checklist contradictions/DD step).
3. **Bug 5** (double entry) + WF Year-2 legibility chip.
4. Backlog: savings-sequencer re-queue, expiry-date honoring.
