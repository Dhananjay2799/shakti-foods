/*
 * Quantity price tiers ("5+ Unit Price"). The cart and checkout must pick
 * the same tier, or the total on the site and the amount charged by
 * Stripe/PayPal disagree. Both use this function.
 *
 * A tier switched off in admin (is_active false) never applies. When
 * several tiers match, the one with the highest minimum quantity wins.
 */
export function findActivePriceTier(tiers, quantity) {
  const matching = (Array.isArray(tiers) ? tiers : []).filter((tier) => {
    if (tier?.is_active !== true) {
      return false;
    }

    const minQuantity = Number(tier.min_quantity);
    const maxQuantity = tier.max_quantity == null ? null : Number(tier.max_quantity);

    return (
      Number.isSafeInteger(minQuantity) &&
      quantity >= minQuantity &&
      (maxQuantity === null || quantity <= maxQuantity)
    );
  });

  matching.sort((a, b) => Number(b.min_quantity) - Number(a.min_quantity));

  return matching[0] || null;
}
