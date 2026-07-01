# Stacks OS — Streamline Plan

_Audit + roadmap written overnight 2026-06-30 → for your morning review._
_Author: Claude (took over from the other UI window after commit `250204d`)._

---

## The one idea (read this if you read nothing else)

**Stacks OS has all the right pieces but no single spine.** Every screen should answer one
question: _"What is my single most profitable move right now, and what do I tap?"_ You already
built the brain that knows the answer (the velocity sequencer). The job now is to make the whole
app **look, feel, and read like the Paycheck mission board** — one aesthetic, one metaphor
(bonuses are quest cards), one obvious next action, great on a phone — with the **collective $1B
heist** sitting on top as the emotional "why."

Three things make it feel clunky today, and all three are fixable without adding features:

1. **The dashboard is a different app.** Paycheck/Savings/Spending are the dark "mission board."
   The Dashboard — the first screen everyone lands on — is still the old **light** theme with
   dark islands floating in it. Jarring. _(This is the thing you flagged, and it's my #1 fix
   tonight.)_
2. **13 sections, desktop-first nav.** A horizontal-scroll top tab bar, no mobile bottom nav.
   Too many doors.
3. **Deadlines and Pro-value are under-shown.** The data exists; the app doesn't surface
   "what's due this week" at a glance, and Pro users never _see_ the queue getting smarter.

---

## What I ported the north-star FROM

The other window built `app/card-preview/page.tsx` as the **north-star** — a mobile-first
(max-width 560, single column) dark mission board. Each bonus is a quest card with phases
(offer → applying → recon → active → waiting), a `FatStackMeter` cash-pile hero, XP progress
bars, gold money accents, and deadlines rendered as **"⏱ 12d left · by Jul 25"** that turn
amber (`#f59e0b`) when ≤14 days. That is the aesthetic every surface should match.

### Canonical design tokens (now centralized in `lib/stacksTheme.ts`)

```
board   #0a0c10   page background        text     #ffffff  primary
panel   #161922   raised card            textDim  #cdd2db  body
panel2  #0f1219   inset / inputs         textMute #9aa1ad  secondary
panel3  #12151c   alt row                textFaint#6b7280  labels/caps
border  #23262e   hairline               gold     #f7d774  money / received
border2 #2a2e38   input border           amber    #f59e0b  urgent (≤14d)

module accents (gradient from → to, fg text, glow):
  paycheck  blue    #3b82f6 → #2563eb   fg #60a5fa
  spending  purple  #7c3aed → #6d28d9   fg #a78bfa
  savings   green   #0d9668 → #0b7a55   fg #34d399
```

Until tonight these were **copy-pasted inline** in RoadmapClient, SavingsClient, SpendingClient,
CheckpointNav, DashboardGoalBar — which is exactly why the dashboard drifted. They now import
one module.

---

## Prioritized roadmap

### ✅ TONIGHT — shipped while you slept (see "What I did" at the bottom)
- Extracted `lib/stacksTheme.ts` (single source of truth for the palette + module accents +
  urgency colors).
- **Re-themed the entire Dashboard to the dark mission board** so it matches Paycheck:
  `HubClient` shell, `StartedBonusesList` (the main to-do), `DashboardViewTabs`, the empty state,
  the Pro-upsell card, footer, past-due banner. Added `/stacksos` to the nav's dark routes so the
  top bar is dark there too.
- Build-verified (`npm run build`) and committed locally (NOT pushed).

### 🔜 BEFORE THE NEWSLETTER (tomorrow AM — ~1–2 hrs, highest ROI on new traffic)
When Mr. Fat Stacks announces the heist, 111 subscribers + video viewers land. The heist backend
is **already live** (`/api/heist`, `AcademyLedger`, real user data). What it needs:
1. **Landing hook flip.** Change `StacksOSLanding` headline from "track bonuses free" →
   heist-led: _"Join the heist. Find your most profitable bank bonus in 60 seconds."_ Keep "free"
   as a badge, not the headline. `app/stacksos/StacksOSLanding.tsx:145`.
2. **Guided first win.** End onboarding on ONE spotlighted bonus ("Start here: Chase, $300, one
   direct deposit") instead of a catalog dump / paywall wall. `app/onboarding/…`.
3. **Heist counts everything.** Today `getHeistTotal()` only sums paycheck bonuses; add
   savings + spending completed rows so the "$X of $1B reclaimed" number is honest and bigger.
   `lib/stackhouse/heist.ts:40-70`.
4. **Mr. Fat Stacks framing** in `AcademyLedger` copy ("Beautiful Bank Bandits", recruits count)
   so the counter matches the newsletter voice.

### 📅 THIS WEEK — the spine + mobile
5. **"Next Move" card.** A single persistent _"Your next move: open X, route one paycheck,
   collect $Y — you're $Z from your next stack"_ at the top of the dashboard and each module.
   Feed it from the sequencer's #1 pick. This is the core intuitiveness fix.
6. **Mobile bottom nav.** Collapse 13 sections → 5 primary (Dashboard · Paycheck · Savings ·
   Spending · More) with a bottom tab bar under 768px; everything else (Debt, 0% APR, Card Value,
   Sequencer, History, Import, Taxes, Profile) into a "More" drawer. `CheckpointNav.tsx`.
7. **Container width fix.** Modules use `maxWidth: 1100`; north-star is 560. Switch content
   containers to `width: min(100%, 640px)` so phones stop crushing/overflowing. One-liner per
   surface (HubClient:665, RoadmapClient, Savings, Spending).
8. **Deadline clarity.** (a) A "⚠️ Due soon" digest strip above the to-do list: _"3 due in 7
   days, 1 overdue."_ (b) Surface spending-card deadlines on the dashboard (today they're
   invisible outside the Spending tab). (c) Show holding-period-end / safe-to-close / expected
   payout on the card face, not just when expanded. Unify urgency colors to the amber/red tokens.

### 🌱 NEXT — depth & Pro value
9. **Level up Spending to Savings' quality.** Spending has no NextStepBar and no spend logger —
   it feels half-built next to Savings' LiquidityTimeline. Add both so all three modules feel
   identical.
10. **Pro value: "your queue got smarter."** _(Details below — needs a small new table.)_
11. **Cross-module linking.** "You got the Chase checking bonus — open the Chase savings bonus
    too." Reuse `getLinkedBonuses()`/`getComboFor()` already in RoadmapClient.
12. **Milestone celebrations.** Page-level confetti + "we hit $50M collectively" banners.
13. **Finish the theme sweep.** Debt, Cards, Card Value, 0% APR, Taxes, Import, Profile are still
    light. Port them to `stacksTheme` once the high-traffic surfaces are done.

---

## Pro-value feature: "your queue got more profitable over time"

**You asked specifically about showing Pro users how updates re-sequenced their queue to be more
profitable.** Here's the honest state and the plan.

**Today the queue is 100% stateless.** `runSequencer()` is a pure function of (live catalog +
profile); nothing is ever saved. There is **no history** of what the queue projected last month —
so we literally cannot show a real user their April-vs-now curve, because it was never recorded.

**To make it real (minimal):** one small table, snapshotted monthly by a cron.

```sql
create table queue_snapshots (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id),
  captured_at date not null,
  paycheck_total int, savings_total int, spending_total int, portfolio_36mo int,
  top_bonuses jsonb,        -- [{bank_name, net_bonus}] for the diff narrative
  profile_hash text,        -- CRUCIAL: tells "we found better bonuses" from "user changed inputs"
  unique (user_id, captured_at)
);
```
The sequencers are already pure/importable, so a monthly cron can recompute per Pro user and
upsert a row. ~1 day of work. The `profile_hash` is load-bearing — without it you can't prove the
_app_ got smarter vs. the user just raised their paycheck. That distinction IS the pitch.

**Demo you can build TODAY without new data (genuine, not faked):** git history of
`lib/data/bonuses.ts` is dense and dated (58 commits since March). Pick month-boundary commits,
`git show <sha>:lib/data/bonuses.ts`, run the sequencer against each with a fixed demo profile,
and plot `total_bonus` over time — a real _"your plan was worth $X in April, $Y now"_ line driven
by actual catalog improvements (Amex $300 added Jun 14, the CSP **75k→100k** bump, the June
regional/CU expansion). The only thing held constant is the demo profile — which is exactly what
isolates "the app got smarter" from "your inputs changed." Great for a marketing screenshot / the
Pro upsell; real per-user curves need the table above.

---

## Per-area audit detail (with file:line)

### Visual consistency — conformance matrix
| Surface | Status | Biggest divergence |
|---|---|---|
| `card-preview` (north-star) | reference | — |
| Paycheck `RoadmapClient` | ✅ conforms | — |
| Savings `SavingsClient` | ✅ conforms | — |
| Spending `SpendingClient` | ✅ conforms | no NextStepBar / spend logger |
| **Dashboard `HubClient`** | **❌ was light → fixed tonight** | white bg, `#111` text, green accents, `StartedBonusesList`+`DashboardViewTabs` light |
| Debt / Cards / 0%APR / Card Value / Taxes / Import / Profile | ❌ light | still old light theme — phase 13 |

### Deadlines — where they live
- Computed correctly in `lib/bonusNextStep.ts`; **email + push reminders already exist**
  (`app/api/cron/deadline-reminders/route.ts`, T-7 & T-1).
- In-app gaps: **no "due soon" digest**; **spending deadlines invisible on dashboard**; holding/
  safe-close/payout dates hidden until a card is expanded; urgency colors inconsistent
  (paycheck amber, savings blue dots, spending none).

### Mobile / IA
- Nav: horizontal-scroll top bar, 7 visible tabs + dropdown, no bottom nav (`CheckpointNav.tsx`).
- Containers: everything `maxWidth: 1100` (north-star is 560). Persists to 320px → overflow.
- Worst offenders: deposit-source input `maxWidth:320` hardcoded (RoadmapClient:720); Spending
  5-col stat grid `minWidth:120×5=600px` (SpendingClient:548); Savings table overflow (~741).

### Onboarding / first-win
- Landing sells "free tracking" (a chore); the magic (sequencer) is hidden behind Pro.
- Funnel has too many choice points; no single guided first bonus. Empty state offers 4 doors
  instead of 1 obvious one (`HubClient` `EmptyDashboardCta`).

---

## Open decisions for you (nothing blocks tonight's work)
- **Primary nav count:** I recommend 5 (Dashboard/Paycheck/Savings/Spending/More). OK?
- **"Free" positioning:** lead the landing with the heist, or with "free forever tracker"? I lean
  heist-led with free as a badge.
- **Theme sweep scope:** do you want Debt/Cards/etc. dark too, or keep the "tools" light on
  purpose? I lean: all dark, one app.

---

## What I did tonight (details)

Local commit `feat(stacksos): dashboard → dark mission board + shared theme tokens` (top of the
`fee-and-biz` branch). **Build passes. Not pushed** — it's a review checkpoint; `git show HEAD`
to see the full diff, or just open the Dashboard next to the Paycheck tab.

Files:
- **`lib/stacksTheme.ts`** (new) — the single source of truth: `DK` palette, `MODULE` accents,
  `URGENCY_DK`, `moduleGradient()`. Import from here everywhere from now on.
- **`app/stacksos/HubClient.tsx`** — wrapped the page in the dark board; re-themed header, the
  "Free" chip, action buttons, the Pro-upsell projection card (now gold-accented), the tax link,
  the past-due banner, and the whole `EmptyDashboardCta` (4 cards).
- **`app/components/StartedBonusesList.tsx`** — the big one: the dashboard to-do list is now dark
  quest cards with module-gradient buttons, dark urgency rails, dark XP bars, dark checklist
  drawer, dark deposit-source picker.
- **`app/components/DashboardViewTabs.tsx`**, **`HistoricalWinsList.tsx`**, **`PushOptIn.tsx`** —
  segmented control, history rows, and the push-reminder banner all dark.
- **`app/components/CheckpointNav.tsx`** — the top bar now renders dark on `/stacksos` (exact) so
  it flows into the board instead of a white bar over black. Light tool routes untouched.

**Two things to eyeball in the morning:**
1. Open the Dashboard on your phone next to Paycheck — they should now feel like one app. (I
   couldn't screenshot it headlessly since it's behind login; the build is green and the tokens
   are shared, but your eyes are the final check.)
2. `PortfolioCard` (the "3-Year Projection" green gradient hero in the Projection tab) I left as a
   deliberate colored accent — tell me if you'd rather it be a flat dark panel.

**Deliberately NOT done tonight** (need your call / too risky unreviewed): the "Next Move" spine
card, the mobile bottom nav, the deadline digest, and the `queue_snapshots` Pro feature. Those
are the top of the roadmap above — say the word and I'll build the next one.

---

## Session 2 — features shipped (pushed to `fee-and-biz`)

All build-green and pushed. **One action needed from you: run `migrations/041_queue_snapshots.sql`
in Supabase** — the queue-history feature degrades quietly until it exists (no data shown, nothing
breaks), same pattern as the deposit-source column.

- **BUG FIX — BoA card wouldn't flip.** Root cause: when you tap "I applied," the bonus enters
  `current_step: "applied"` and `renderStandardWorkingCard` early-returns a pending-application
  card *before* the flip button — so an applied bonus was the one state with no way to see its
  requirements. Added a "ⓘ Requirements" flip to that pending card. (`RoadmapClient.tsx`)
- **Next Move spine** — `NextMoveCard` at the top of the dashboard: one line telling you the
  single highest-priority action (most-urgent in-progress step, or "start your first bonus"),
  with the reward, deadline, and a CTA. This is the app's new answer to "what do I do right now?"
- **Mobile bottom nav** — `BottomNav`: 5 thumb targets (Home · Paycheck · Savings · Spending ·
  More) + a "More" sheet for the 8 tool routes. The top tab scroller is now hidden under 768px.
- **Deadline digest** — `DeadlineDigest` above the to-do list: "⚠️ N overdue · ⏱ N due this
  week · next deadline in Xd," or a calm "nothing due" confirmation.
- **Pro queue-history** — `queue_snapshots` table + best-effort monthly snapshot writer +
  `QueueTrendCard` on the Projection tab showing the 3-year plan climbing over time with a
  sparkline. Records a fingerprint of your inputs so it can honestly separate "we found better
  offers" from "you changed your paycheck." (Needs the migration to start collecting; a genuine
  git-history backfill for a marketing demo is still in the roadmap above.)

**Decisions I made for you** (all reversible): nav = 5 items; theme sweep = all-dark (bottom nav
+ all dashboard surfaces dark). I did **not** touch the landing-page copy (heist-led vs
free-led) — that's outward-facing marketing and I'd rather you approve the wording; it's the
`BEFORE THE NEWSLETTER` item above.

**Still to eyeball on a phone:** the bottom nav + Next Move card + digest all render for real
users behind login — build is green and logic is shared, but give it a look on your device.
</content>
</invoke>
