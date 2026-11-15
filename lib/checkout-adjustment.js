import { parseAmountToCents } from "@/lib/custom-payment";

/*
 * "Adjust amount" on the checkout page. After entering the admin code,
 * the owner can add a fee (e.g. a card fee), give a discount, or set the
 * order total, for that one order. Customers can't use it without the
 * code; the server checks the code and every amount (see
 * lib/checkout-adjustment-server.js).
 *
 *   - A fee is saved as its own order line (product_id below), so it shows
 *     on Stripe, PayPal, receipts and in admin like any line.
 *   - A discount is saved as the order's discount_amount (a one-time
 *     Stripe coupon; a lower PayPal total).
 */

export const ADJUSTMENT_PRODUCT_ID = "checkout-adjustment";

/** Order lines that aren't stock: no inventory, no shipping box. */
const NON_INVENTORY_PRODUCT_IDS = new Set([ADJUSTMENT_PRODUCT_ID, "custom-payment"]);

export function isInventoryProductId(productId) {
  return !NON_INVENTORY_PRODUCT_IDS.has(String(productId || "").trim());
}

/** Stripe's smallest card charge in USD. */
export const MIN_CHARGE_CENTS = 50;
export const MAX_FEE_CENTS = 500_000;
export const ADJUSTMENT_LABEL_MAX = 40;

export const ADJUSTMENT_MODES = {
  FEE: "fee",
  DISCOUNT: "discount",
  TOTAL: "total"
};

export function defaultAdjustmentLabel(kind) {
  return kind === "discount" ? "Discount" : "Service fee";
}

/** One short line of plain text. */
export function cleanAdjustmentLabel(value, kind = "fee") {
  const text = String(value ?? "")
    .replace(/[\u0000-\u001f\u007f<>]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, ADJUSTMENT_LABEL_MAX);

  return text || defaultAdjustmentLabel(kind);
}

function parsePercent(value) {
  const text = String(value ?? "").trim().replace(/%$/, "");

  if (!/^\d{1,3}(\.\d{1,2})?$/.test(text)) {
    return null;
  }

  const percent = Number(text);

  return percent > 0 && percent <= 100 ? percent : null;
}

/**
 * Turns what the owner typed into cents.
 *   mode "fee" | "discount": value in dollars, or a percent of the order
 *     total before the adjustment (unit "percent").
 *   mode "total": the new order total in dollars.
 * Returns { feeCents, discountCents, error }.
 */
export function adjustmentFromInput({ mode, unit, value, baseTotalCents }) {
  const base = Number(baseTotalCents) || 0;
  const none = { feeCents: 0, discountCents: 0, error: "" };

  if (String(value ?? "").trim() === "") {
    return { ...none, error: "Enter an amount." };
  }

  let cents;

  if (mode === ADJUSTMENT_MODES.TOTAL) {
    const target = parseAmountToCents(value);

    if (target === null) {
      return { ...none, error: "Enter the new total, for example 25.00." };
    }

    if (target < MIN_CHARGE_CENTS) {
      return { ...none, error: "The total must be at least $0.50." };
    }

    const difference = target - base;

    return difference >= 0
      ? { ...none, feeCents: Math.min(difference, MAX_FEE_CENTS) }
      : { ...none, discountCents: -difference };
  }

  if (unit === "percent") {
    const percent = parsePercent(value);

    if (percent === null) {
      return { ...none, error: "Enter a percent between 0.01 and 100." };
    }

    cents = Math.round((base * percent) / 100);
  } else {
    cents = parseAmountToCents(value);

    if (cents === null) {
      return { ...none, error: "Enter an amount, for example 2.50." };
    }
  }

  if (cents <= 0) {
    return { ...none, error: "The amount must be more than $0." };
  }

  if (mode === ADJUSTMENT_MODES.DISCOUNT) {
    if (base - cents < MIN_CHARGE_CENTS) {
      return { ...none, error: "The total after the discount must be at least $0.50." };
    }

    return { ...none, discountCents: cents };
  }

  if (cents > MAX_FEE_CENTS) {
    return { ...none, error: "A fee can't be more than $5,000." };
  }

  return { ...none, feeCents: cents };
}
