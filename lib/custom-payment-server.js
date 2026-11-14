import { createSupabaseAdmin } from "@/lib/supabase-admin";
import {
  CUSTOM_PAYMENT_ORDER_TYPE,
  CUSTOM_PAYMENT_PRODUCT_ID,
  calculateCustomPayment,
  cleanCustomPaymentNote,
  customAmountError,
  customPaymentItemName,
  parseAmountToCents
} from "@/lib/custom-payment";

/*
 * Server side of "Pay a custom amount" (see lib/custom-payment.js).
 * Payment is recorded as an order with order_type "custom_payment" and one
 * line named "Custom payment", so it shows in admin, emails and reports
 * like any other order. No inventory is reserved or sold.
 */

const STOREFRONTS = new Set(["shakti_foods", "ecoware"]);
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export class CustomPaymentInputError extends Error {}

function cleanLine(value, maxLength) {
  return String(value ?? "")
    .replace(/[\u0000-\u001f\u007f]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, maxLength);
}

/** Validates a payment request from the browser and recalculates its total. */
export function readCustomPaymentRequest(body) {
  const storefront = String(body?.storefront || "shakti_foods").trim();

  if (!STOREFRONTS.has(storefront)) {
    throw new CustomPaymentInputError("Invalid storefront.");
  }

  const amountCents = parseAmountToCents(body?.amount);
  const amountError = customAmountError(amountCents);

  if (amountError) {
    throw new CustomPaymentInputError(amountError);
  }

  const customer = body?.customer && typeof body.customer === "object" ? body.customer : {};
  const name = cleanLine(customer.name, 100);
  const email = cleanLine(customer.email, 254).toLowerCase();
  const phone = cleanLine(customer.phone, 40) || null;

  if (!name) {
    throw new CustomPaymentInputError("Please enter your name.");
  }

  if (!EMAIL_PATTERN.test(email)) {
    throw new CustomPaymentInputError("Please enter a valid email address.");
  }

  const includeShipping = body?.includeShipping !== false;
  const includeTax = body?.includeTax !== false;

  return {
    storefront,
    note: cleanCustomPaymentNote(body?.note),
    includeShipping,
    includeTax,
    customer: { name, email, phone },
    ...calculateCustomPayment({ amountCents, includeShipping, includeTax })
  };
}

/** Saves the unpaid order and its single line. Returns the order ID. */
export async function createPendingCustomOrder({ supabase, provider, payment }) {
  const { data: order, error: orderError } = await supabase
    .from("orders")
    .insert({
      storefront: payment.storefront,
      order_type: CUSTOM_PAYMENT_ORDER_TYPE,
      payment_provider: provider,
      payment_method: provider,
      payment_status: "pending",
      fulfillment_status: "new",
      subtotal: payment.amountCents,
      shipping_amount: payment.shippingCents,
      tax_amount: payment.taxCents,
      total_amount: payment.totalCents,
      currency: "USD",
      customer_name: payment.customer.name,
      customer_email: payment.customer.email,
      customer_phone: payment.customer.phone
    })
    .select("id")
    .single();

  if (orderError || !order) {
    console.error("Unable to save custom payment order:", orderError);
    throw new Error("Unable to start the payment. Please try again.");
  }

  const { error: itemError } = await supabase.from("order_items").insert({
    order_id: order.id,
    product_id: CUSTOM_PAYMENT_PRODUCT_ID,
    product_name: customPaymentItemName(payment.note),
    quantity: 1,
    unit_price: payment.amountCents,
    line_total: payment.amountCents
  });

  if (itemError) {
    console.error("Unable to save custom payment line:", itemError);
    await deleteUnpaidCustomOrder(supabase, order.id);
    throw new Error("Unable to start the payment. Please try again.");
  }

  return order.id;
}

/** Removes a custom order that never reached the payment page. */
export async function deleteUnpaidCustomOrder(supabase, orderId) {
  if (!orderId) return;

  const { error } = await supabase
    .from("orders")
    .delete()
    .eq("id", orderId)
    .eq("order_type", CUSTOM_PAYMENT_ORDER_TYPE)
    .eq("payment_status", "pending");

  if (error) {
    console.error("Unable to remove unpaid custom payment order:", { orderId, error });
  }
}

/**
 * Marks an unpaid custom payment as cancelled (Stripe session expired, or
 * the customer closed PayPal). A paid order is never touched.
 */
export async function cancelPendingCustomPayment({ stripeSessionId, paypalOrderId }) {
  const column = stripeSessionId ? "stripe_session_id" : "paypal_order_id";
  const value = String(stripeSessionId || paypalOrderId || "").trim();

  if (!value) {
    return { cancelled: false };
  }

  const supabase = createSupabaseAdmin();
  const { data, error } = await supabase
    .from("orders")
    .update({
      payment_status: "cancelled",
      updated_at: new Date().toISOString()
    })
    .eq(column, value)
    .eq("order_type", CUSTOM_PAYMENT_ORDER_TYPE)
    .eq("payment_status", "pending")
    .select("id");

  if (error) {
    throw new Error(error.message || "Unable to cancel the custom payment.");
  }

  return { cancelled: (data || []).length > 0 };
}
