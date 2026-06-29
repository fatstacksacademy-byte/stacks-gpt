-- ============================================================
-- card_accounts.bonus_earned — welcome-bonus history for lifetime rules
--
-- The approval-odds engine (lib/issuerRules.ts) needs to know which
-- products the user has ALREADY earned a welcome bonus on, because some
-- issuers pay each bonus only once:
--   - Amex: once-per-lifetime per product (the big one). Applies even
--     after the card is closed, so we read held AND closed card_accounts.
--   - Citi / Chase Sapphire: family bonus locked for 48 months after the
--     last bonus on that family.
--
-- bonus_earned is a tri-state via NULL:
--   true   — user confirms they earned this product's welcome bonus
--   false  — user confirms they did NOT (e.g. product change, no SUB)
--   null   — unknown → the engine surfaces a "needs more info" asterisk
--
-- bonus_earned_date is optional; it sharpens the 48-month family rules.
-- Both nullable — optional for the user and for every legacy record.
-- ============================================================

alter table card_accounts
  add column if not exists bonus_earned boolean;

alter table card_accounts
  add column if not exists bonus_earned_date date;
