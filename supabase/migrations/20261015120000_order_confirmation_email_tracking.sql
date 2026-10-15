-- Track the order confirmation email for each order so a failed send
-- (Resend outage, missing RESEND_API_KEY, ...) can be retried automatically.
--
-- Safe to run more than once. Existing orders keep a NULL status and are
-- never re-sent; only orders whose confirmation fails after this migration
-- are picked up by the daily retry in /api/cron/cart-recovery.

alter table public.orders
  add column if not exists confirmation_email_status text,
  add column if not exists confirmation_email_sent_at timestamptz,
  add column if not exists confirmation_email_attempts integer not null default 0,
  add column if not exists confirmation_email_last_error text;

alter table public.orders
  drop constraint if exists orders_confirmation_email_status_check;

alter table public.orders
  add constraint orders_confirmation_email_status_check
  check (
    confirmation_email_status is null
    or confirmation_email_status in ('sent', 'failed')
  );

create index if not exists orders_confirmation_email_retry_idx
  on public.orders (created_at)
  where confirmation_email_status = 'failed';
