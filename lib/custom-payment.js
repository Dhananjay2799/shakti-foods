import { commerce } from "@/lib/commerce";

/*
 * "Pay a custom amount": the customer types an amount (for example a price
 * agreed on WhatsApp or an invoice total) and pays it by card or PayPal,
 * with no products in the cart. Shipping and sales tax are optional.
 *
 * This file is shared by the payment page and the server, so the total a
 * customer sees is the total they are charged. The server always
 * recalculates it; nothing the browser sends is trusted as a total.
 */

export const CUSTOM_PAYMENT_ORDER_TYPE = "custom_payment";

/** product_id of the single line saved with each custom payment. */
export const CUSTOM_PAYMENT_PRODUCT_ID = "custom-payment";

/** PayPal purchase-unit custom_id that marks a custom payment. */
export const CUSTOM_PAYMENT_PAYPAL_CUSTOM_ID = "custom_payment";

export const CUSTOM_PAYMENT_MIN_CENTS = 100;
export const CUSTOM_PAYMENT_MAX_CENTS = 5_000_000;
export const CUSTOM_PAYMENT_NOTE_MAX_LENGTH = 120;

const STANDARD_SHIPPING_CENTS = Math.round(commerce.standardShipping * 100);
const FREE_SHIPPING_FROM_CENTS = Math.round(commerce.freeShippingThreshold * 100);
const TAX_RATE = commerce.floridaSampleTaxRate;

export const CUSTOM_PAYMENT_TAX_PERCENT = Math.round(TAX_RATE * 1000) / 10;

/**
 * Parses an amount typed by a person ("25", "25.5", "1,250.00", "$40")
 * into cents. Returns null when it isn't a valid amount.
 */
export function parseAmountToCents(value) {
  const text = String(value ?? "")
    .trim()
    .replace(/^\$\s*/, "")
    .replace(/,/g, "");

  if (!/^\d{1,7}(\.\d{0,2})?$/.test(text)) {
    return null;
  }

  const [whole, fraction = ""] = text.split(".");
  const cents = Number(whole) * 100 + Number(fraction.padEnd(2, "0"));

  return Number.isSafeInteger(cents) ? cents : null;
}

/** Shipping, tax and total for a custom payment, all in cents. */
export function calculateCustomPayment({
  amountCents,
  includeShipping = true,
  includeTax = true
}) {
  const amount = Number.isSafeInteger(amountCents) && amountCents > 0 ? amountCents : 0;

  const shippingCents =
    includeShipping && amount > 0
      ? amount >= FREE_SHIPPING_FROM_CENTS
        ? 0
        : STANDARD_SHIPPING_CENTS
      : 0;

  const taxCents =
    includeTax && amount > 0
      ? Math.round((amount + shippingCents) * TAX_RATE)
      : 0;

  return {
    amountCents: amount,
    shippingCents,
    taxCents,
    totalCents: amount + shippingCents + taxCents
  };
}

/** Problem with an amount in cents, or "" when it can be paid. */
export function customAmountError(amountCents) {
  if (amountCents === null || amountCents === undefined) {
    return "Enter an amount, for example 25.00.";
  }

  if (amountCents < CUSTOM_PAYMENT_MIN_CENTS) {
    return `The amount must be at least $${(CUSTOM_PAYMENT_MIN_CENTS / 100).toFixed(2)}.`;
  }

  if (amountCents > CUSTOM_PAYMENT_MAX_CENTS) {
    return `The amount can't be more than $${(CUSTOM_PAYMENT_MAX_CENTS / 100).toLocaleString("en-US")}. For a larger payment, please contact us.`;
  }

  return "";
}

/** One line of plain text, at most CUSTOM_PAYMENT_NOTE_MAX_LENGTH characters. */
export function cleanCustomPaymentNote(value) {
  return String(value ?? "")
    .replace(/[\u0000-\u001f\u007f]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, CUSTOM_PAYMENT_NOTE_MAX_LENGTH);
}

/** Line name used on the order, receipt and admin pages. */
export function customPaymentItemName(note) {
  const cleaned = cleanCustomPaymentNote(note);

  return cleaned ? `Custom payment: ${cleaned}` : "Custom payment";
}
