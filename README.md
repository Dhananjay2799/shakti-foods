# Shakti Foods - V10 Mobile Checkout Fixed

This version fixes the mobile/Stripe testing issues.

## Fixed

1. Stripe 404 after payment:
   - Added `app/checkout/success/page.js`
   - Added `components/CheckoutSuccessClient.jsx`
   - Stripe now redirects to `/checkout/success` after payment.

2. Slow mobile background videos:
   - Updated `components/VideoBackground.jsx`
   - Desktop still plays the video.
   - Mobile does not load video; it shows the poster/background image instead.
   - This is much faster and avoids mobile autoplay issues.

## Test locally

```bash
npm install
npm run dev
```

Open:

```text
http://localhost:3000
```

## Test Stripe Sandbox

Use:

```text
4242 4242 4242 4242
```

Use any future expiry date, any CVC, and any ZIP.

## Environment

For local testing:

```env
STRIPE_SECRET_KEY=sk_test_your_key
NEXT_PUBLIC_BASE_URL=http://localhost:3000
STRIPE_AUTOMATIC_TAX=false
```

Restart after env changes:

```bash
npm run dev
```

## Two websites, one codebase

| Site | URL | Env var |
| --- | --- | --- |
| Shakti Foods | https://shakti-foods.com | `NEXT_PUBLIC_BASE_URL` |
| Simpli Ecoware | https://simpliecoware.vercel.app | `NEXT_PUBLIC_ECOWARE_URL` |

`middleware.js` serves the Ecoware pages (under `app/ecoware`) on the Ecoware
domain. Everything sent outside the page — order confirmation, shipping and
cart-recovery emails, Stripe success/cancel redirects — uses the storefront
recorded on the order (`lib/storefront-config.js`), so each customer only ever
sees the brand and website they bought from.

## Order emails

Customer emails are sent with [Resend](https://resend.com). See `.env.example`.

- `RESEND_API_KEY` is **required**; without it checkout still succeeds but no
  confirmation is sent.
- `ORDER_EMAIL_FROM` must use a domain verified in Resend. Ecoware mail uses the
  same address with the "Simpli Ecoware" name unless `ECOWARE_ORDER_EMAIL_FROM`
  is set.
- Run `supabase/migrations/20261015120000_order_confirmation_email_tracking.sql`
  in the Supabase SQL editor to record each confirmation's status. Failed sends
  are then retried once a day by the existing `/api/cron/cart-recovery` job (up
  to 5 attempts within 7 days). Until the migration is run, confirmations work
  as before but are not retried.
