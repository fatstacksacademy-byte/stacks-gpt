---
name: savings_capital_deployment_sequencer
description: User wants a savings bonus sequencer under the savings tab that takes total savings amount and sequences by effective APY, with 12-month and year-2 projections
type: project
---

Build a capital deployment sequencer for savings bonuses under the /stacksos/savings tab.

**Why:** Users have idle savings and want to maximize returns by rotating through savings bonus offers, similar to how the paycheck sequencer works for checking bonuses.

**How to apply:**
- User inputs total savings available to deploy
- Sequencer ranks savings bonuses by effective APY (bonus + base APY over hold period)
- Shows a roadmap: which bank to park money at, for how long, then move to the next
- 12-month projected earnings view + year 2 projection
- Similar UI to the paycheck sequencer/roadmap

Also: add remaining ~50 smaller checking bonuses ($200-$300 single-state) from the 50-state scrape data.
