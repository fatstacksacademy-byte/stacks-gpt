-- ============================================================
-- Stacks OS: broadcasts + broadcast_sends
--
-- The mass-email side of the in-house email system. Companion to
-- migration 020 (contacts + bonus_interests) and migration 019
-- (email_preferences for transactional per-user reminders).
--
-- Two-table model:
--
--   broadcasts — one row per campaign. Holds the subject + body +
--     segment definition (jsonb predicate against the contacts
--     table) and aggregate stats. status field gates whether sends
--     have started so a draft can be edited until it's sent.
--
--   broadcast_sends — one row per recipient. Stores the Resend
--     message id so we can correlate with webhook events (opens,
--     clicks, bounces) later without coupling now.
--
-- Why a contacts.unsubscribe_token: the existing email_preferences
-- system from migration 019 only handles authenticated users. The
-- newsletter side needs to unsubscribe non-user contacts (leads
-- who never created an account), so each contacts row gets its own
-- token. Reuses the same one-click pattern.
-- ============================================================

alter table contacts
  add column if not exists unsubscribe_token text not null
    default encode(gen_random_bytes(24), 'hex');

create unique index if not exists idx_contacts_unsubscribe_token
  on contacts(unsubscribe_token);

-- ============================================================

create table if not exists broadcasts (
  id uuid primary key default gen_random_uuid(),
  subject text not null,
  html_body text not null,
  text_body text not null,
  -- Segment is a structured predicate evaluated server-side, e.g.
  --   { "newsletter_opted_in": true, "customer_status": "current" }
  -- Empty object = everyone with newsletter_opted_in=true (the
  -- default audience for broadcasts).
  segment_filter jsonb not null default '{}'::jsonb,
  status text not null default 'draft'
    check (status in ('draft', 'sending', 'sent', 'failed')),
  total_recipients integer not null default 0,
  total_sent integer not null default 0,
  total_failed integer not null default 0,
  created_at timestamptz not null default now(),
  sent_at timestamptz,
  created_by uuid references auth.users(id) on delete set null
);

create index if not exists idx_broadcasts_status on broadcasts(status, created_at desc);

create table if not exists broadcast_sends (
  id uuid primary key default gen_random_uuid(),
  broadcast_id uuid not null references broadcasts(id) on delete cascade,
  contact_id uuid not null references contacts(id) on delete cascade,
  email text not null,
  resend_message_id text,
  sent_at timestamptz,
  opened_at timestamptz,
  clicked_at timestamptz,
  error text,
  created_at timestamptz not null default now()
);

create index if not exists idx_broadcast_sends_broadcast on broadcast_sends(broadcast_id);
create index if not exists idx_broadcast_sends_contact on broadcast_sends(contact_id);
create unique index if not exists idx_broadcast_sends_unique
  on broadcast_sends(broadcast_id, contact_id);

-- RLS: admin-only via service-role client. No public policies.
alter table broadcasts enable row level security;
alter table broadcast_sends enable row level security;
