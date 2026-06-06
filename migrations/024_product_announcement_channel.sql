-- ============================================================
-- Stacks OS: product_announcements channel
--
-- Adds a second broadcast channel that's independent from the
-- newsletter opt-in. Use case: announce freemium / new feature to
-- existing Stacks OS users who never opted into the newsletter, but
-- *are* paying customers and reasonably expect product updates from
-- the software they pay for. Newsletter remains the only channel for
-- leads (no account) — product news to non-customers makes no sense.
--
-- Two changes, one migration:
--
-- 1. contacts.product_announcements_opted_in (bool, default true)
--    Defaults to true because most consumers expect product news from
--    software they pay for; one-click unsubscribe in the email footer
--    is the escape hatch.
--
-- 2. broadcasts.channel ('newsletter' | 'product')
--    Drives which consent column the broadcast send loop reads. The
--    'product' channel additionally restricts the audience to
--    customer_status IN ('current','former') in lib/email/broadcast.ts
--    so leads never receive product email.
-- ============================================================

alter table contacts
  add column if not exists product_announcements_opted_in boolean not null default true;

create index if not exists idx_contacts_product_opt_in
  on contacts(email)
  where product_announcements_opted_in = true;

alter table broadcasts
  add column if not exists channel text not null default 'newsletter'
    check (channel in ('newsletter', 'product'));
