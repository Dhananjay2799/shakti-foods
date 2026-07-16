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

export function getCheckoutEstimate(subtotal) {
  const shipping = getShippingEstimate(subtotal);
  const tax = getTaxEstimate(subtotal, shipping);
  return { shipping, tax, total: subtotal + shipping + tax };
}
