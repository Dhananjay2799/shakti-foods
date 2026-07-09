# Shakti Foods Website - Version 5

This version includes the latest requested changes.

## Updated

- Removed the hero bottom cards: Rice sizes and Checkout.
- Removed the extra View Cart button/card from the hero.
- Home hero now uses `public/videos/rice-farm.mp4` as the entire section background.
- Added the uploaded `farm.mp4` video as the About page background.
- Added two new products:
  - 9 inch 3 Compartment Plate
  - 5 CP Meal Tray
- Selected rice size buttons are now readable.
- Product category filter buttons are readable when selected.
- All Add to Cart buttons are black with white text so they are visible.
- Main website text color is black.
- Customer Confidence/testimonial section stays dark/white.

## Run locally

```bash
npm install
npm run dev
```

Open:

```text
http://localhost:3000
```

## Build

```bash
npm run build
```

## Video files

Included:

```text
public/videos/rice-farm.mp4
public/videos/farm.mp4
```

Optional EcoWare video:

```text
public/videos/eco-farm.mp4
```

## Product/pricing edits

Edit:

```text
lib/data.js
```

## Stripe checkout setup

Create `.env.local`:

```env
STRIPE_SECRET_KEY=sk_test_your_stripe_secret_key
NEXT_PUBLIC_BASE_URL=http://localhost:3000
NEXT_PUBLIC_WHATSAPP_NUMBER=15551234567
NEXT_PUBLIC_WHATSAPP_MESSAGE=Hello, I want information about Shakti Foods products.
```
