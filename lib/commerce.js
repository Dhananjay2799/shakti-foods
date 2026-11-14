export const commerce = {
  freeShippingThreshold: 99,
  standardShipping: 9.99,
  floridaSampleTaxRate: 0.07,
  currency: "USD"
};

export function getShippingEstimate(subtotal) {
  if (subtotal <= 0) return 0;
  return subtotal >= commerce.freeShippingThreshold ? 0 : commerce.standardShipping;
}

export function getTaxEstimate(subtotal, shipping = 0) {
  return (subtotal + shipping) * commerce.floridaSampleTaxRate;
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
