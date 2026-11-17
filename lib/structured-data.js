import { shippingCentsForSubtotal } from "@/lib/commerce";
import { RETURN_DAYS } from "@/lib/store-policies";

/*
 * Shipping and return details for Google (schema.org Offer fields
 * "shippingDetails" and "hasMerchantReturnPolicy"). Built from the same
 * settings as the checkout and the policy pages, so they can't drift.
 */

/** Shipping for one unit at this price, to US addresses (checkout rates). */
export function offerShippingDetails(unitPrice, currency = "USD") {
  const priceCents = Math.round(Number(unitPrice || 0) * 100);

  return {
    "@type": "OfferShippingDetails",
    shippingRate: {
      "@type": "MonetaryAmount",
      value: shippingCentsForSubtotal(priceCents) / 100,
      currency
    },
    shippingDestination: {
      "@type": "DefinedRegion",
      addressCountry: "US"
    }
  };
}

/** Returns Policy page: N days from delivery, by mail, we pay return shipping. */
export function merchantReturnPolicy() {
  return {
    "@type": "MerchantReturnPolicy",
    applicableCountry: "US",
    returnPolicyCategory: "https://schema.org/MerchantReturnFiniteReturnWindow",
    merchantReturnDays: RETURN_DAYS,
    returnMethod: "https://schema.org/ReturnByMail",
    returnFees: "https://schema.org/FreeReturn"
  };
}
