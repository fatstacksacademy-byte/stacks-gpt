-- ============================================================
-- Stacks OS: "Already have" flow — extend incomplete_info to checking bonuses
--
-- Mirrors migration 008 for the completed_bonuses table. When the
-- user tells us "I had this checking bonus at some point" but skips
-- entering dates, the row still gets recorded (so the sequencer stops
-- recommending the offer again), but with incomplete_info=true so the
-- churn cooldown logic — which reads closed_date — can detect the gap
-- and exclude the record instead of treating null dates as zero
-- elapsed time.
-- ============================================================

alter table completed_bonuses
  add column if not exists incomplete_info boolean not null default false;
