# Overlay recon — anchored to spoken phrases (FIX #6)

- spec: `overlay-spec.demo.json`
- words: `build/biz-20apy/cut-words.json`
- overlays: 2  PASS: 1  FAIL: 1  (waived: 0)
- generic stoplist (cannot satisfy a PASS): account, accounts, apy, bank, banks, bonus, bonuses, interest, money, percent

## [PASS] chase-400-intro
- anchor: "earning over $400 over the next 90 days"  (near 25.0s)
- window: [0:24.35 .. 0:27.14]  (anchor score 1.0)
- spoken (±1s): "account, it could be earning over $400 over the next 90 days. So the difference between"
- matched (specific): $400
- missing: chase, 73%
- number $400: present

## [FAIL] clawback-churn-graphic
- anchor: "might claw a few other bonuses I'll mention"  (near 422.0s)
- window: [7:02.19 .. 7:04.55]  (anchor score 0.3333)
- spoken (±1s): "might claw few other bonuses I'll mention that are active right now, just to"
- missing: clawback, termination, forfeit, reverse
- reasons: anchor not found (best score 0.3333 < 0.4); no assert_token spoken in window
