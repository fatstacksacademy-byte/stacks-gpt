---
name: savings_v2_features
description: Next round of savings tab features — capital splitting, projections at top, business/brokerage toggle, tax tracking
type: project
---

## Savings Tab V2 Features

1. **Projections at top** — Total earnings visible immediately. "Show full breakdown" expands the table. Don't bury the number.

2. **Capital splitting** — If user has $50k but best bonus only needs $25k, suggest opening multiple bonuses simultaneously. Parallel deployment instead of serial-only.

3. **Hero card checklist** — Like paycheck tab: Account opened → $X deposited → Bonus received → $X withdrawn. Step-by-step tracking.

4. **Business/Brokerage toggle** — Checkbox for "I have a business entity" to show business savings bonuses. Toggle for brokerage bonuses (E*Trade, Schwab, Fidelity cash management, etc.).

5. **Tax reserve tracker** — Default 20% set-aside on all bonus + interest income. Running total of "taxes to set aside." Manual % override. Post-April 15 prompt: "Have you filed? Reduce reserve?" Keep UI simple — just a small line item, not a whole section.

**How to apply:** Build incrementally. Projections at top is the quickest win. Capital splitting changes the sequencer fundamentally. Tax tracker is a UI layer on top of existing earnings data.
