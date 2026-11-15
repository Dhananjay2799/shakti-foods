export const commerce = {
  currency: "USD",

  /*
   * Shipping, by order subtotal (before shipping), for both stores:
   *   under $50          $6.99
   *   $50 up to $250     $10.99
   *   over $250          free
   * Every page and every checkout (cart, Subscribe & Save, custom amount)
   * uses shippingCentsForSubtotal(), so they always agree.
   */
  shipping: {
    smallOrderBelowCents: 5000,
    smallOrderCents: 699,
    standardCents: 1099,
    freeAboveCents: 25000
  },

  // Only used where a customer may choose to add tax (Simpli Ecoware
  // custom payments). Shakti Foods charges no sales tax.
  floridaSampleTaxRate: 0.07
};

/** Shipping in cents for an order subtotal in cents. */
export function shippingCentsForSubtotal(subtotalCents) {
  const subtotal = Number(subtotalCents);
  const rates = commerce.shipping;

  if (!Number.isFinite(subtotal) || subtotal <= 0) {
    return 0;
  }

  if (subtotal > rates.freeAboveCents) {
    return 0;
  }

  return subtotal < rates.smallOrderBelowCents
    ? rates.smallOrderCents
    : rates.standardCents;
}

/** Shipping in dollars for a subtotal in dollars (cart and checkout pages). */
export function getShippingEstimate(subtotal) {
  return shippingCentsForSubtotal(Math.round(Number(subtotal) * 100)) / 100;
}

function rateMoney(cents) {
  return cents % 100 === 0 ? `$${cents / 100}` : `$${(cents / 100).toFixed(2)}`;
}

/** The shipping rates in words, for pages and policies. */
export function shippingRateLines() {
  const rates = commerce.shipping;

  return [
    `Orders under ${rateMoney(rates.smallOrderBelowCents)}: ${rateMoney(rates.smallOrderCents)}`,
    `Orders from ${rateMoney(rates.smallOrderBelowCents)} to ${rateMoney(rates.freeAboveCents)}: ${rateMoney(rates.standardCents)}`,
    `Orders over ${rateMoney(rates.freeAboveCents)}: free`
  ];
}

/*
 * What the cart and checkout show must equal what Stripe/PayPal charge.
 * Checkout charges no sales tax (lib/checkout/prepare-checkout.js sets it
 * to 0), so none is added here. If tax is ever charged, change both.
 */
export function getCheckoutEstimate(subtotal) {
  const shipping = getShippingEstimate(subtotal);
  const tax = 0;
  return { shipping, tax, total: subtotal + shipping + tax };
}
