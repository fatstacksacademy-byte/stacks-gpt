# Fee-strategy calculator — design proposal
**2026-06-16** · "is it worth dodging the monthly fee, paying it, or closing early?"

You raised this on the **First Hawaiian Bank Priority Banking $350** bonus. It's a great feature because the right answer is usually **counterintuitive**, and the catalog already stores almost everything needed to compute it.

---

## The decision a bonus-hunter actually faces

A fee-bearing checking bonus has up to four ways to handle the monthly maintenance fee, and they trade off differently:

| Strategy | What you do | Cost |
|---|---|---|
| **A. Pay the fee** | Keep the account open through the must-keep-open window, eat the monthly fee, close after | `fee × months_open` |
| **B. Waive via balance** | Park the waiver minimum balance so the fee is $0 | opportunity cost: `balance × (yourHYSA − accountAPY) / 12 × months` |
| **C. Waive via DD / activity** | Route a qualifying DD (or N debits) each cycle | ~$0 financial, but consumes DD-slot capacity |
| **D. Close early** | Close right after the bonus posts, skip remaining fees | `fee × months_until_post + early_closure_fee` — **and $0 (bonus clawed back) if the bank forfeits it on early close** |

The non-obvious part: **B and D often LOSE money**, and the calculator's job is to prove which one wins for a given bonus + the user's HYSA rate.

### The two break-evens that drive everything

**Park-vs-pay (B vs A):** parking the waiver balance beats paying the fee only when
```
waiver_balance  <  monthly_fee × 12 / (yourHYSA_APY − accountAPY)
```
At a 4.5% HYSA and a $15/mo fee, that threshold is **$4,000**. If the waiver demands more than that parked, just pay the fee.

**Close-early-vs-ride-it-out (D vs A):** closing early beats paying only when
```
early_closure_fee  <  monthly_fee × (months_you'd_otherwise_stay − months_until_bonus_posts)
```
…and only if early closure doesn't claw the bonus back.

---

## FHB Priority Banking $350 — worked example (why this matters)

From the catalog ([lib/data/hawaiiBankBonuses.ts:125](lib/data/hawaiiBankBonuses.ts#L125)): bonus **$350**, fee **$15/mo**, waivable by **$6,000 balance OR $2,000+ DD/cycle**, **$75 early-closing fee if closed within 180 days**, bonus posts **~day 45**, must stay open **180 days**. The bonus only requires a **$500** DD — which does *not* meet the $2,000 fee-waiver DD.

At a 4.5% HYSA, the four strategies net:

| Strategy | Math | Net |
|---|---|---|
| **C. Waive via $2,000+ DD/cycle** | $350 − $0 | **$350** ✅ best |
| **A. Pay $15/mo, close at day 180** | $350 − ($15 × 6) | **$260** |
| **D. Close early ~day 60, eat $75 ECF** | $350 − ($15 × 2) − $75 | **$245** |
| **B. Park $6,000 to waive** | $350 − ($6,000 × 4.5%/12 × 6) = $350 − $135 | **$215** ❌ worst |

**The recommendation the tool would print:** *"Route a $2,000+ direct deposit each statement cycle to waive the fee entirely — nets the full $350. If you can't, just pay the $90 in fees and close at day 180. Do **not** park $6,000 to dodge the fee (it costs you $135 in forgone HYSA interest — more than the fee itself), and do **not** close early (the $75 closing fee is more than the $60 of fees you'd save)."*

Both "clever" moves (park to waive, close early) are traps here, and only this calculation reveals it. That's the pitch.

---

## Data model — mostly already there

The checking schema already carries the inputs (confirmed in [lib/data/bonuses.ts](lib/data/bonuses.ts) + the FHB row):
- ✅ `fees.monthly_fee`
- ✅ `fees.monthly_fee_waiver_text` (free text — see below)
- ✅ `fees.early_closure_fee`
- ✅ `timeline.must_remain_open_days` (doubles as the ECF window for FHB)
- ✅ `timeline.bonus_posting_days_est`
- ✅ `requirements.min_balance`, `min_opening_deposit`

What's worth **adding** (small, optional, backfill on high-value bonuses first):
- `fees.fee_waiver` (structured): `{ min_balance?: number; dd_per_cycle?: number; debits_per_cycle?: number }` — parsed from the existing waiver text. Without it, the engine can regex the text as a fallback.
- `fees.early_closure_window_days` — often equals `must_remain_open_days`; default to it.
- `fees.early_closure_clawback?: boolean` — does closing early forfeit the bonus? (FHB: no; many do.) This flips strategy D between "viable" and "never."
- `fees.account_apy?: number` — what parked cash earns at this bank (default 0 for checking; matters for strategy B).

---

## Where it lives — three sizes

**S — pure engine + inline hint (½ day).**
`lib/feeStrategy.ts` → `analyzeFeeStrategy({ bonus fee fields, hysaApy, accountApy }): { strategies: {kind, net, note}[]; best; breakEvens }`. Pure + unit-tested (the BBP/0%-APR calculator is the template). Surface the `best` line as a one-liner on each fee-bearing bonus card: *"Best fee play: route a $2k DD to waive → nets $350."* Pull `hysaApy` from the savings profile (already wired into the 0% tool).

**M — feed it into the sequencer's `net_bonus` (+½ day).**
Today [lib/sequencer.ts](lib/sequencer.ts#L12) `calcNetBonus` only models "pay the fee over the hold period" or "DD-waived." Replace it with `analyzeFeeStrategy(...).best.net` so the **paycheck planner ranks bonuses by their true best-case net**, and the per-card fee note shows the chosen strategy. This makes the gross→net work I just shipped genuinely accurate (right now a min-balance-waivable fee is treated as always-paid).

**L — standalone "Fee Strategy" mini-tool (+1 day).**
A `/stacksos/intro-apr`-style page: pick a bonus (or enter fee/waiver/ECF/keep-open by hand), see the four strategies ranked with the break-even callouts and a "what if my HYSA were X%" slider. Good shareable/teaching artifact (a natural YouTube companion — "the $6k-parking trap").

**Recommendation:** do **S + M together** — one engine, surfaced inline *and* wired into the planner's ranking. That fixes a real accuracy gap (fee-waiver opportunity cost is currently ignored) and gives every bonus a concrete fee play, with the standalone tool (L) as a fast follow if you want the teaching surface.

---

## Open questions for you
1. Should the engine assume the user **can always meet a DD-based waiver** (best case), or gate it on remaining DD-slot capacity from the paycheck profile? (Affects whether strategy C is offered.)
2. For early closure, do you want a **per-bank clawback flag** (accurate but a data lift) or a **conservative default** ("assume early close forfeits the bonus unless flagged safe")?
3. Default `account_apy` — assume **0%** for checking unless the row says otherwise? (FHB checking is ~0%, so B's opportunity cost ≈ full HYSA rate.)
