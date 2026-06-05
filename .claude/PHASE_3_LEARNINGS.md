# Phase 3 — Auto-populate discover-approved leads to live catalog

Learnings from the 2026-06-05 manual run on 20 approved leads. Of the 20:
**7 became live catalog entries; 13 were duplicates / expired / out-of-scope.**

## Headline finding: most leads are duplicates

| Outcome | Count |
|---|---|
| Live entry created | 7 |
| Duplicate of existing entry (same offer or same bank covered) | 9 |
| Expired offer | 1 |
| Out of scope (Netspend prepaid) | 1 |
| Time-limited promo, not a SUB change | 2 |

**Implication for Phase 3:** the pipeline needs an aggressive dedup gate BEFORE expensive enrichment. Check `bank_name + product_type + bonus_amount` against the catalog and short-circuit if a match exists. Probably saves ~65% of Claude calls.

## What DoC alone gives you

For every lead where a DoC review exists, the article gives:
- All numeric fields (bonus, deposit window, monthly fee, posting timeline)
- Tier structures (when present)
- ChexSystems sensitivity (DoC commentary is the canonical source)
- State restrictions, eligibility paths, lifetime/cooldown language
- Promo codes
- Expiration dates

The bank canonical URL would just confirm. **Skip the bank fetch for Phase 3 v1.**

## Schema picker rule

The product_type on the bank's side ("checking" vs "savings") is misleading. What matters is the bonus mechanic:

| Mechanic | File |
|---|---|
| Recurring DD drives the bonus | `bonuses.ts` |
| Lump-sum balance hold drives the bonus | `savingsBonuses.ts` |
| Card-style SUB (min_spend / spend_months / annual_fee) | `creditCardBonuses.ts` |

Examples:
- Chase $900 Total Checking — checking account but $15k hold dominates → savings
- Rho $1k Business Checking — checking name, balance-hold tiers → savings
- Percapita $300 — checking with $25/mo debit-spend → bonuses (no schema fits cleanly)

## Edge cases that need human judgment

1. **Time-limited promos on existing cards.** Target Circle "$100 spend bonus 6/14-26", Chase Amazon Prime "$200 no-spend 6/11-7/9". Discover surfaces these as new bonuses but they're transient. Skip unless the underlying card's SUB changes.

2. **Expired offers in the queue.** Amex Delta increased offer expired 04/01; Grasshopper refresh expired 5/15. Discover doesn't check expiration. Phase 3 should fail-skip when DoC says "Status: expired" or the offer's stated end date is past.

3. **Non-bank products.** Netspend is a prepaid card platform, not a bank checking account. The classifier got this wrong. Phase 3 needs a "is this actually a bank account" check (heuristic: keywords like "prepaid", "card platform" in DoC).

4. **Multi-step long-tail tiers.** Four Leaf FCU pays $350 + $100 at 12mo + $100 at 24mo. The catalog schema represents the headline ($550 total) but the mechanic doesn't fit `dd_count_required` cleanly. `other_requirements_text` packs it.

5. **Split-account bonuses.** AdelFi $100 checking + $100 savings — modeled as two entries (one per file). Could automate by detecting "$X checking + $Y savings" patterns.

## Schema gaps observed

- **Debit-spend mechanic** (Percapita): no `debit_spend_per_month` field. Could add one or pack into `other_requirements_text`.
- **Long-tail tier earning** (Four Leaf): no native model for "$X now, $Y at month N". Adequate via `other_requirements_text`.
- **Membership eligibility paths** for credit unions (Four Leaf, AdelFi) — DoC sometimes doesn't include. Hand-research often needed.

## Inconsistencies to clean up before Phase 3 ships

- **`chex_sensitive` is inconsistent across same-bank entries.** Chase $400 said "medium"; reality is "low" (Chase doesn't pull ChexSystems). Should do a one-time bank-wide normalization sweep. Candidates: Chase, Capital One, Wells Fargo.

## Cost model for Phase 3

Per lead with WebFetch + Claude classification:
- 1 DoC WebFetch: ~$0.05
- 1 Claude entry-generation call (Sonnet 4.5, ~1500 tokens out): ~$0.02
- **~$0.07 per lead**, or **~$1.50 per 20-lead batch**

Adding the bank canonical URL fetch (sometimes needed for terms verification):
- ~$0.05 more
- **~$0.12 per lead** in the high-care path

## Suggested Phase 3 pipeline shape

```
for each approved lead in leads.json:
  # Cheap dedup gate (free)
  if existing_catalog_entry_matches(bank, product_type, bonus_amount):
    mark dismissed, note duplicate; continue

  # DoC enrichment ($0.05)
  doc_data = webfetch_with_claude(lead.source_urls[0], schema_prompt)

  # Expiration check (free)
  if doc_data.expired or doc_data.expiration_date < today:
    mark dismissed, note expired; continue

  # Non-bank check (free)
  if doc_data.is_prepaid_or_card_platform:
    mark dismissed, note out-of-scope; continue

  # Schema picker (free)
  target_file = pick_file(doc_data.mechanic)

  # Entry generation ($0.02)
  entry = generate_entry(doc_data, schema_for(target_file))

  # Validate ($0)
  if entry passes schema validation:
    append to target_file
    mark applied
  else:
    mark snoozed for human review
```

Expected hit rate (based on this run): ~35% of approved leads become live entries. Rest are auto-dismissed with clear reasons.
