
import Stripe from "stripe";

import {
  createSupabaseAdmin
} from "@/lib/supabase-admin";

import {
  sendOrderConfirmationEmailSafely
} from "@/lib/order-confirmation-email";


function normalizeText(value, fieldName) {
  const normalized = String(value ?? "").trim();

  if (!normalized) {
    throw new Error(`${fieldName} is required.`);
  }

  return normalized;
}


function getStripeSubscriptionIdFromInvoice(invoice) {
  const direct =
    typeof invoice?.subscription === "string"
      ? invoice.subscription
      : invoice?.subscription?.id;

  if (direct) {
    return String(direct).trim();
  }

  const parentSubscription =
    invoice?.parent?.subscription_details?.subscription;

  if (typeof parentSubscription === "string") {
    return parentSubscription.trim();
  }

  if (parentSubscription?.id) {
    return String(parentSubscription.id).trim();
  }

  return "";
}


async function loadCompletedOrder(supabase, orderId) {
  const [orderResult, itemsResult] = await Promise.all([
    supabase
      .from("orders")
      .select(`
        id,
        customer_name,
        customer_email,
        shipping_address,
        currency,
        subtotal,
        discount_amount,
        shipping_amount,
        tax_amount,
        total_amount,
        payment_provider,
        payment_status,
        fulfillment_status,
        subscription_id,
        payment_reference,
        stripe_invoice_id,
        order_type
      `)
      .eq("id", orderId)
      .single(),

    supabase
      .from("order_items")
      .select(`
        product_id,
        product_name,
        quantity,
        unit_price,
        line_total
      `)
      .eq("order_id", orderId)
      .order("created_at", {
        ascending: true
      })
  ]);

  if (orderResult.error || !orderResult.data) {
    throw new Error(
      orderResult.error?.message ||
      "Unable to load recurring order."
    );
  }

  if (itemsResult.error) {
    throw new Error(
      itemsResult.error.message ||
      "Unable to load recurring order items."
    );
  }

  return {
    order: orderResult.data,
    items: itemsResult.data || []
  };
}


export async function fulfillRecurringSubscriptionPayment({
  subscriptionId,
  paymentProvider,
  paymentReference,
  stripeInvoiceAmounts = null
}) {
  const normalizedSubscriptionId =
    normalizeText(subscriptionId, "Subscription ID");

  const normalizedProvider =
    normalizeText(paymentProvider, "Payment provider")
      .toLowerCase();

  const normalizedReference =
    normalizeText(paymentReference, "Payment reference");

  if (!["stripe", "paypal"].includes(normalizedProvider)) {
    throw new Error(
      `Unsupported recurring payment provider: ${normalizedProvider}`
    );
  }

  const supabase = createSupabaseAdmin();

  /*
   * The database function performs:
   *
   * - Idempotency checks
   * - Order creation
   * - Order item creation
   * - Inventory validation
   * - Inventory deduction
   * - Inventory transaction logging
   *
   * These operations run inside one PostgreSQL transaction.
   */

  if (
    normalizedProvider === "stripe" &&
    !stripeInvoiceAmounts
  ) {
    throw new Error(
      "Verified Stripe invoice amounts are required."
    );
  }

  if (
    normalizedProvider !== "stripe" &&
    stripeInvoiceAmounts
  ) {
    throw new Error(
      "Stripe invoice amounts cannot be supplied for PayPal."
    );
  }

  const { data: fulfillmentResult, error: fulfillmentError } =
    normalizedProvider === "stripe"
      ? await supabase.rpc(
          "fulfill_stripe_subscription_invoice",
          {
            p_subscription_id: normalizedSubscriptionId,
            p_payment_reference: normalizedReference,
            p_subtotal_cents:
              stripeInvoiceAmounts.subtotalCents,
            p_shipping_cents:
              stripeInvoiceAmounts.shippingCents,
            p_tax_cents:
              stripeInvoiceAmounts.taxCents,
            p_total_cents:
              stripeInvoiceAmounts.totalCents,
            p_currency:
              stripeInvoiceAmounts.currency
          }
        )
      : await supabase.rpc(
          "fulfill_recurring_subscription_payment",
          {
            p_subscription_id: normalizedSubscriptionId,
            p_payment_provider: normalizedProvider,
            p_payment_reference: normalizedReference
          }
        );

  if (fulfillmentError) {
    console.error(
      "Recurring subscription fulfillment RPC failed:",
      {
        subscriptionId: normalizedSubscriptionId,
        paymentProvider: normalizedProvider,
        paymentReference: normalizedReference,
        fulfillmentError
      }
    );

    throw new Error(
      fulfillmentError.message ||
      "Unable to fulfill recurring subscription payment."
    );
  }

  const orderId = fulfillmentResult?.order_id;

  if (!orderId) {
    throw new Error(
      "Recurring fulfillment did not return an order ID."
    );
  }

  const alreadyProcessed =
    fulfillmentResult?.already_processed === true;

  const { order, items } =
    await loadCompletedOrder(supabase, orderId);

  /*
   * Duplicate webhook deliveries must not cause
   * duplicate order confirmation emails.
   */

  let emailResult = {
    sent: false
  };

  if (!alreadyProcessed && order.customer_email) {
    emailResult =
      await sendOrderConfirmationEmailSafely({
        to: order.customer_email,
        orderId: order.id,
        customerName:
          order.customer_name || "Customer",

        currency: String(
          order.currency || "USD"
        ).toUpperCase(),

        items,

        subtotal: Number(order.subtotal || 0),

        shippingAmount: Number(
          order.shipping_amount || 0
        ),

        taxAmount: Number(
          order.tax_amount || 0
        ),

        totalAmount: Number(
          order.total_amount || 0
        ),

        shippingAddress:
          order.shipping_address || null
      });
  }

  console.log(
    "Recurring subscription fulfillment completed:",
    {
      subscriptionId: normalizedSubscriptionId,
      paymentProvider: normalizedProvider,
      paymentReference: normalizedReference,
      orderId,
      alreadyProcessed,
      paymentStatus: order.payment_status,
      fulfillmentStatus: order.fulfillment_status,
      emailSent: emailResult.sent
    }
  );

  return {
    fulfilled: true,
    alreadyProcessed,
    orderId,
    subscriptionId: normalizedSubscriptionId,
    paymentProvider: normalizedProvider,
    paymentReference: normalizedReference,
    paymentStatus: order.payment_status,
    fulfillmentStatus: order.fulfillment_status,
    emailSent: emailResult.sent
  };
}


/*
 * =========================================================
 * STRIPE SUBSCRIPTION INVOICE FULFILLMENT
 * =========================================================
 *
 * Rice and recurring shipping are separate Stripe
 * subscription line items.
 *
 * The invoice must be reconciled with our stored
 * subscription before inventory can be deducted.
 */

export async function fulfillStripeSubscriptionInvoice({
  stripe,
  invoice
}) {
  if (!stripe || !(stripe instanceof Stripe)) {
    throw new Error(
      "Stripe client is required."
    );
  }

  const invoiceId =
    normalizeText(invoice?.id, "Stripe invoice ID");

  if (
    invoice?.status !== "paid" &&
    invoice?.paid !== true
  ) {
    return {
      fulfilled: false,
      reason: "Stripe invoice is not paid.",
      invoiceId
    };
  }

  const stripeSubscriptionId = normalizeText(
    getStripeSubscriptionIdFromInvoice(invoice),
    `Stripe subscription ID for invoice ${invoiceId}`
  );

  const stripeSubscription =
    await stripe.subscriptions.retrieve(
      stripeSubscriptionId
    );

  const internalSubscriptionId = normalizeText(
    stripeSubscription?.metadata?.internal_subscription_id,
    `Internal subscription ID for Stripe subscription ${stripeSubscriptionId}`
  );

  /*
   * Fetch the authoritative paid invoice from Stripe.
   */

  const paidInvoice =
    await stripe.invoices.retrieve(invoiceId);

  const supabase = createSupabaseAdmin();

  const { data: stored, error: storedError } =
    await supabase
      .from("subscriptions")
      .select(`
        id,
        payment_provider,
        currency,
        subtotal_cents,
        shipping_cents,
        tax_cents,
        total_cents,
        stripe_subscription_id
      `)
      .eq("id", internalSubscriptionId)
      .single();

  if (
    storedError ||
    !stored ||
    stored.payment_provider !== "stripe"
  ) {
    throw new Error(
      "Cannot verify stored Stripe subscription payment."
    );
  }

  if (
    stored.stripe_subscription_id &&
    stored.stripe_subscription_id !== stripeSubscriptionId
  ) {
    throw new Error(
      "Stripe subscription ID mismatch."
    );
  }

  /*
   * Validate currency amounts as integer cents.
   */

  const money = (value, label) => {
    if (
      !Number.isSafeInteger(value) ||
      value < 0
    ) {
      throw new Error(
        `Stripe invoice ${invoiceId} has invalid ${label}.`
      );
    }

    return value;
  };

  /*
   * Stripe subscription Checkout uses separate
   * recurring line items for rice and shipping.
   *
   * Fetch every invoice line, rather than trusting
   * the potentially truncated embedded invoice list.
   */

  const lines = [];

  for await (
    const line of stripe.invoices.listLineItems(
      invoiceId,
      { limit: 100 }
    )
  ) {
    lines.push(line);
  }

  if (
    lines.length < 1 ||
    lines.length > 2
  ) {
    throw new Error(
      `Stripe invoice ${invoiceId} has an unexpected number of lines.`
    );
  }

  const expectedSubtotal = money(
    Number(stored.subtotal_cents),
    "stored rice subtotal"
  );

  const expectedShipping = money(
    Number(stored.shipping_cents),
    "stored shipping"
  );

  const currency =
    String(paidInvoice.currency || "").toUpperCase();

  const expectedCurrency =
    String(stored.currency || "").toUpperCase();

  let subtotalCents = 0;
  let shippingCents = 0;

  let riceLineCount = 0;
  let shippingLineCount = 0;

  /*
   * Classify invoice lines using Stripe product metadata.
   *
   * This metadata is created by our subscription
   * Checkout endpoint:
   *
   * line_item_type: "rice"
   * line_item_type: "shipping"
   */

  for (const line of lines) {
    const lineAmount =
      money(line.amount, "line amount");

    const priceId =
      typeof line.pricing?.price_details?.price === "string"
        ? line.pricing.price_details.price
        : typeof line.price === "string"
          ? line.price
          : line.price?.id;

    const embeddedProductId =
      line.pricing?.price_details?.product ||
      line.price?.product;

    if (!priceId && !embeddedProductId) {
      throw new Error(
        `Stripe invoice ${invoiceId} has an unidentified price.`
      );
    }

    let productId =
      typeof embeddedProductId === "string"
        ? embeddedProductId
        : embeddedProductId?.id;

    if (!productId) {
      const price =
        await stripe.prices.retrieve(priceId);

      productId =
        typeof price.product === "string"
          ? price.product
          : price.product?.id;
    }

    if (!productId) {
      throw new Error(
        `Stripe invoice ${invoiceId} has no product identifier.`
      );
    }

    const product =
      await stripe.products.retrieve(productId);

    const kind =
      String(product.metadata?.line_item_type || "");

    const productSubscriptionId =
      String(
        product.metadata?.internal_subscription_id ||
        ""
      );

    /*
     * Every invoice line must belong to our
     * internal subscription record.
     */

    if (
      productSubscriptionId !== internalSubscriptionId
    ) {
      throw new Error(
        `Stripe invoice ${invoiceId} contains a foreign subscription line.`
      );
    }

    if (
      String(line.currency || "").toUpperCase() !== currency
    ) {
      throw new Error(
        `Stripe invoice ${invoiceId} has a currency mismatch.`
      );
    }

    /*
     * We do not silently accept prorations,
     * additional discounts, or invoice credits.
     */

    if (
      line.proration === true ||
      line.parent?.subscription_item_details?.proration === true ||
      (line.discount_amounts?.length ?? 0) > 0 ||
      (line.pretax_credit_amounts?.length ?? 0) > 0
    ) {
      throw new Error(
        `Stripe invoice ${invoiceId} requires adjustment reconciliation.`
      );
    }

    if (kind === "rice") {
      riceLineCount++;
      subtotalCents += lineAmount;
    } else if (
      kind === "shipping" &&
      line.quantity === 1
    ) {
      shippingLineCount++;
      shippingCents += lineAmount;
    } else {
      throw new Error(
        `Stripe invoice ${invoiceId} has an unexpected product line.`
      );
    }
  }

  /*
   * Expect exactly one rice line.
   *
   * Shipping is present exactly once when the
   * stored subscription specifies a shipping charge.
   */

  if (
    riceLineCount !== 1 ||
    shippingLineCount !==
      (expectedShipping > 0 ? 1 : 0)
  ) {
    throw new Error(
      `Stripe invoice ${invoiceId} has unexpected rice/shipping lines.`
    );
  }

  const invoiceSubtotal = money(
    paidInvoice.subtotal,
    "subtotal"
  );

  const totalCents = money(
    paidInvoice.total,
    "total"
  );

  const paidCents = money(
    paidInvoice.amount_paid,
    "amount_paid"
  );

  const remainingCents = money(
    paidInvoice.amount_remaining,
    "amount_remaining"
  );

  const discountAmounts =
    paidInvoice.total_discount_amounts || [];

  const pretaxCredits =
    paidInvoice.total_pretax_credit_amounts || [];

  /*
   * Reject unsupported invoice adjustments.
   *
   * Recurring shipping is already part of the
   * invoice subtotal as its own line item.
   *
   * Do not count it a second time using
   * invoice.shipping_cost.
   */

  if (
    !Array.isArray(discountAmounts) ||
    discountAmounts.length !== 0 ||

    !Array.isArray(pretaxCredits) ||
    pretaxCredits.length !== 0 ||

    (paidInvoice.starting_balance ?? 0) !== 0 ||
    (paidInvoice.amount_overpaid ?? 0) !== 0 ||

    (paidInvoice.shipping_cost?.amount_subtotal ?? 0) !== 0 ||

    paidInvoice.status !== "paid" ||
    paidInvoice.paid !== true ||

    remainingCents !== 0 ||
    paidCents !== totalCents ||

    !Number.isSafeInteger(subtotalCents) ||
    !Number.isSafeInteger(shippingCents) ||

    invoiceSubtotal !== subtotalCents + shippingCents ||

    subtotalCents !== expectedSubtotal ||
    shippingCents !== expectedShipping ||

    currency !== expectedCurrency ||

    paidInvoice.automatic_tax?.status === "failed"
  ) {
    throw new Error(
      `Stripe invoice ${invoiceId} requires manual reconciliation.`
    );
  }

  /*
   * Stripe Tax:
   *
   * Calculate tax separately after validating rice
   * and shipping, then verify the reported tax total.
   */

  const taxCents =
    totalCents - subtotalCents - shippingCents;

  const taxLines =
    paidInvoice.total_taxes ?? [];

  const reportedTaxCents =
    Array.isArray(taxLines)
      ? taxLines.reduce(
          (sum, entry) => sum + entry.amount,
          0
        )
      : NaN;

  if (
    !Number.isSafeInteger(taxCents) ||
    taxCents < 0 ||

    !Array.isArray(taxLines) ||

    taxLines.some(
      entry =>
        !Number.isSafeInteger(entry.amount) ||
        entry.amount < 0
    ) ||

    reportedTaxCents !== taxCents
  ) {
    throw new Error(
      `Stripe invoice ${invoiceId} has an unsupported tax breakdown.`
    );
  }

  /*
   * Fulfill only after all reconciliation succeeds.
   *
   * The database transaction creates the order,
   * inserts order items and deducts inventory.
   */

  return fulfillRecurringSubscriptionPayment({
    subscriptionId: internalSubscriptionId,
    paymentProvider: "stripe",
    paymentReference: invoiceId,

    stripeInvoiceAmounts: {
      subtotalCents,
      shippingCents,
      taxCents,
      totalCents,
      currency
    }
  });
}
