import crypto from "crypto";
import {
  ADJUSTMENT_PRODUCT_ID,
  MAX_FEE_CENTS,
  MIN_CHARGE_CENTS,
  cleanAdjustmentLabel
} from "@/lib/checkout-adjustment";

/*
 * Server side of the checkout "Adjust amount" (lib/checkout-adjustment.js).
 *
 * The admin code lives only in the CHECKOUT_ADJUST_CODE environment
 * variable (set in Vercel); it is never sent to the browser. A correct
 * code gets a signed token that is valid for a few hours on that device.
 * Every checkout request that changes the amount must carry a valid
 * token, and the server re-checks the amounts. Changing the code in
 * Vercel cancels every token already given out.
 */

const TOKEN_HOURS = 4;
const MIN_CODE_LENGTH = 4;

// Wrong-code attempts, per IP, per server instance (with a delay on every
// failure, guessing a decent code is impractical).
const MAX_FAILURES = 5;
const FAILURE_WINDOW_MS = 15 * 60 * 1000;
const failures = new Map();

export class CheckoutAdjustmentError extends Error {
  constructor(message, status = 400) {
    super(message);
    this.status = status;
  }
}

function adminCode() {
  return String(process.env.CHECKOUT_ADJUST_CODE || "").trim();
}

export function checkoutAdjustEnabled() {
  return adminCode().length >= MIN_CODE_LENGTH;
}

function sha256(value) {
  return crypto.createHash("sha256").update(String(value)).digest();
}

function signingKey() {
  return sha256(
    `checkout-adjust|${adminCode()}|${process.env.SUPABASE_SERVICE_ROLE_KEY || ""}`
  );
}

function sign(payload) {
  return crypto.createHmac("sha256", signingKey()).update(payload).digest("base64url");
}

export function adminCodeMatches(input) {
  if (!checkoutAdjustEnabled()) {
    return false;
  }

  return crypto.timingSafeEqual(sha256(String(input || "").trim()), sha256(adminCode()));
}

export function issueAdjustToken() {
  const payload = Buffer.from(
    JSON.stringify({ exp: Date.now() + TOKEN_HOURS * 60 * 60 * 1000 })
  ).toString("base64url");

  return `${payload}.${sign(payload)}`;
}

export function adjustTokenValid(token) {
  if (!checkoutAdjustEnabled()) {
    return false;
  }

  const [payload, signature] = String(token || "").split(".");

  if (!payload || !signature) {
    return false;
  }

  const expected = Buffer.from(sign(payload));
  const given = Buffer.from(signature);

  if (expected.length !== given.length || !crypto.timingSafeEqual(expected, given)) {
    return false;
  }

  try {
    const { exp } = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
    return Number(exp) > Date.now();
  } catch {
    return false;
  }
}

function recentFailures(key) {
  const now = Date.now();
  const list = (failures.get(key) || []).filter((at) => now - at < FAILURE_WINDOW_MS);
  failures.set(key, list);
  return list;
}

export function tooManyFailures(key) {
  return recentFailures(key).length >= MAX_FAILURES;
}

export function recordFailure(key) {
  recentFailures(key).push(Date.now());
}

export function clientKey(request) {
  return (
    String(request.headers.get("x-forwarded-for") || "")
      .split(",")[0]
      .trim() ||
    request.headers.get("x-real-ip") ||
    "unknown"
  );
}

/**
 * Reads the "adjustment" part of a checkout request. Returns null when
 * nothing is adjusted. Throws CheckoutAdjustmentError when the token is
 * missing/expired or the amounts aren't allowed.
 */
export function readAdjustmentRequest(raw) {
  if (!raw || typeof raw !== "object") {
    return null;
  }

  const feeCents = Number(raw.feeCents || 0);
  const discountCents = Number(raw.discountCents || 0);

  if (feeCents === 0 && discountCents === 0) {
    return null;
  }

  if (!adjustTokenValid(raw.token)) {
    throw new CheckoutAdjustmentError(
      "The admin code has expired. Tap \"Adjust amount\" and enter it again.",
      403
    );
  }

  if (
    !Number.isSafeInteger(feeCents) ||
    !Number.isSafeInteger(discountCents) ||
    feeCents < 0 ||
    discountCents < 0 ||
    (feeCents > 0 && discountCents > 0)
  ) {
    throw new CheckoutAdjustmentError("Invalid amount adjustment.");
  }

  if (feeCents > MAX_FEE_CENTS) {
    throw new CheckoutAdjustmentError("A fee can't be more than $5,000.");
  }

  const kind = feeCents > 0 ? "fee" : "discount";

  return {
    feeCents,
    discountCents,
    label: cleanAdjustmentLabel(raw.label, kind)
  };
}

/**
 * Applies an adjustment to a prepared checkout (lib/checkout/prepare-
 * checkout.js). A fee becomes one more order line and Stripe line; a
 * discount lowers the total and is returned as discountCents.
 */
export function applyCheckoutAdjustment(checkout, adjustment) {
  if (!adjustment) {
    return { ...checkout, discountCents: 0, adjustment: null };
  }

  const { feeCents, discountCents, label } = adjustment;

  if (feeCents > 0) {
    const currency =
      checkout.stripeLineItems?.[0]?.price_data?.currency || "usd";

    return {
      ...checkout,
      subtotalCents: checkout.subtotalCents + feeCents,
      totalAmountCents: checkout.totalAmountCents + feeCents,
      discountCents: 0,
      adjustment,
      orderItems: [
        ...checkout.orderItems,
        {
          product_id: ADJUSTMENT_PRODUCT_ID,
          product_name: label,
          quantity: 1,
          unit_price: feeCents,
          line_total: feeCents
        }
      ],
      stripeLineItems: [
        ...checkout.stripeLineItems,
        {
          quantity: 1,
          price_data: {
            currency,
            unit_amount: feeCents,
            product_data: {
              name: label,
              metadata: { product_id: ADJUSTMENT_PRODUCT_ID }
            }
          }
        }
      ]
    };
  }

  const totalAmountCents = checkout.totalAmountCents - discountCents;

  if (totalAmountCents < MIN_CHARGE_CENTS) {
    throw new CheckoutAdjustmentError("The total after the discount must be at least $0.50.");
  }

  return {
    ...checkout,
    totalAmountCents,
    discountCents,
    adjustment
  };
}
