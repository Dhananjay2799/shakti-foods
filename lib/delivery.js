import { shippingCentsForSubtotal } from "@/lib/commerce";

/*
 * How a cart order reaches the customer, chosen on the checkout page
 * before paying. Stripe and PayPal then charge for that choice only:
 *   - "shipping": shipped to the customer's address, at the rates in
 *     lib/commerce.js (the address is collected by Stripe/PayPal).
 *   - "pickup": the customer collects it in Weston, Florida. Free, and no
 *     shipping address is asked for.
 */

export const DELIVERY_SHIPPING = "shipping";
export const DELIVERY_PICKUP = "pickup";

export const PICKUP_LOCATION = "Weston, Florida";
export const PICKUP_METHOD_NAME = `Local Pickup - ${PICKUP_LOCATION}`;

/** Anything other than "pickup" means shipping. */
export function normalizeDeliveryMethod(value) {
  return String(value || "").trim().toLowerCase() === DELIVERY_PICKUP
    ? DELIVERY_PICKUP
    : DELIVERY_SHIPPING;
}

export function isPickupMethodName(name) {
  return /\bpick\s*-?\s*up\b/i.test(String(name || ""));
}

/** Shipping in cents for a subtotal in cents and a delivery choice. */
export function deliveryShippingCents(subtotalCents, deliveryMethod) {
  return normalizeDeliveryMethod(deliveryMethod) === DELIVERY_PICKUP
    ? 0
    : shippingCentsForSubtotal(subtotalCents);
}

/** Name saved on the order and shown at Stripe, in emails and in admin. */
export function deliveryMethodName(deliveryMethod, shippingCents) {
  if (normalizeDeliveryMethod(deliveryMethod) === DELIVERY_PICKUP) {
    return PICKUP_METHOD_NAME;
  }

  return Number(shippingCents) === 0 ? "Free Standard Shipping" : "Standard Shipping";
}
