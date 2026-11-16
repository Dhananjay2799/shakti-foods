-- "How was your rice?" review request emails.
--
-- orders.review_request_sent_at: when the review request for this order
-- was sent (one per order, and at most one per customer every 90 days;
-- see lib/review-request-processor.js).
--
-- email_opt_outs: people who clicked "Unsubscribe" in a review request.
-- They get no more review requests. Server-only (service role), like the
-- other tables: RLS on, no public policies.

alter table public.orders
  add column if not exists review_request_sent_at timestamptz;

create table if not exists public.email_opt_outs (
  email text primary key check (email = lower(btrim(email)) and email <> ''),
  source text not null default 'review_request',
  created_at timestamptz not null default now()
);

alter table public.email_opt_outs enable row level security;
