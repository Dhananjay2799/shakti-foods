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
