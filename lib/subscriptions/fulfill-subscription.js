import Stripe from "stripe";

import {
  createSupabaseAdmin
} from "@/lib/supabase-admin";

import {
  sendOrderConfirmationEmailSafely
} from "@/lib/order-confirmation-email";


function normalizeText(
  value,
  fieldName
) {
  const normalized =
    String(
      value ?? ""
    ).trim();

  if (!normalized) {
    throw new Error(
      `${fieldName} is required.`
    );
  }

  return normalized;
}


function getStripeSubscriptionIdFromInvoice(
  invoice
) {
  const direct =
    typeof invoice?.subscription ===
    "string"
      ? invoice.subscription
      : invoice?.subscription?.id;

  if (direct) {
    return String(
      direct
    ).trim();
  }

  const parentSubscription =
    invoice
      ?.parent
      ?.subscription_details
      ?.subscription;

  if (
    typeof parentSubscription ===
    "string"
  ) {
    return parentSubscription.trim();
  }

  if (
    parentSubscription?.id
  ) {
    return String(
      parentSubscription.id
    ).trim();
  }

  return "";
}


async function loadCompletedOrder(
  supabase,
  orderId
) {
  const [
    orderResult,
    itemsResult
  ] = await Promise.all([
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
      .eq(
        "id",
        orderId
      )
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
      .eq(
        "order_id",
        orderId
      )
      .order(
        "created_at",
        {
          ascending: true
        }
      )
  ]);

  if (
    orderResult.error ||
    !orderResult.data
  ) {
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
    order:
      orderResult.data,

    items:
      itemsResult.data || []
  };
}


export async function fulfillRecurringSubscriptionPayment({
  subscriptionId,
  paymentProvider,
  paymentReference
}) {
  const normalizedSubscriptionId =
    normalizeText(
      subscriptionId,
      "Subscription ID"
    );

  const normalizedProvider =
    normalizeText(
      paymentProvider,
      "Payment provider"
    )
      .toLowerCase();

  const normalizedReference =
    normalizeText(
      paymentReference,
      "Payment reference"
    );

  if (
    ![
      "stripe",
      "paypal"
    ].includes(
      normalizedProvider
    )
  ) {
    throw new Error(
      `Unsupported recurring payment provider: ${normalizedProvider}`
    );
  }

  const supabase =
    createSupabaseAdmin();

  /*
   * One PostgreSQL transaction handles:
   *
   * - duplicate protection
   * - order creation
   * - order items
   * - inventory validation
   * - inventory deduction
   * - inventory transaction
   */
  const {
    data: fulfillmentResult,
    error: fulfillmentError
  } = await supabase.rpc(
    "fulfill_recurring_subscription_payment",
    {
      p_subscription_id:
        normalizedSubscriptionId,

      p_payment_provider:
        normalizedProvider,

      p_payment_reference:
        normalizedReference
    }
  );

  if (fulfillmentError) {
    console.error(
      "Recurring subscription fulfillment RPC failed:",
      {
        subscriptionId:
          normalizedSubscriptionId,

        paymentProvider:
          normalizedProvider,

        paymentReference:
          normalizedReference,

        fulfillmentError
      }
    );

    throw new Error(
      fulfillmentError.message ||
        "Unable to fulfill recurring subscription payment."
    );
  }

  const orderId =
    fulfillmentResult
      ?.order_id;

  if (!orderId) {
    throw new Error(
      "Recurring fulfillment did not return an order ID."
    );
  }

  const alreadyProcessed =
    fulfillmentResult
      ?.already_processed ===
      true;

  const {
    order,
    items
  } = await loadCompletedOrder(
    supabase,
    orderId
  );

  /*
   * Webhook retries must never resend
   * order-confirmation email.
   */
  let emailResult = {
    sent: false
  };

  if (
    !alreadyProcessed &&
    order.customer_email
  ) {
    emailResult =
      await sendOrderConfirmationEmailSafely({
        to:
          order.customer_email,

        orderId:
          order.id,

        customerName:
          order.customer_name ||
          "Customer",

        currency:
          String(
            order.currency ||
            "USD"
          ).toUpperCase(),

        items,

        subtotal:
          Number(
            order.subtotal || 0
          ),

        shippingAmount:
          Number(
            order.shipping_amount || 0
          ),

        taxAmount:
          Number(
            order.tax_amount || 0
          ),

        totalAmount:
          Number(
            order.total_amount || 0
          ),

        shippingAddress:
          order.shipping_address ||
          null
      });
  }

  console.log(
    "Recurring subscription fulfillment completed:",
    {
      subscriptionId:
        normalizedSubscriptionId,

      paymentProvider:
        normalizedProvider,

      paymentReference:
        normalizedReference,

      orderId,

      alreadyProcessed,

      paymentStatus:
        order.payment_status,

      fulfillmentStatus:
        order.fulfillment_status,

      emailSent:
        emailResult.sent
    }
  );

  return {
    fulfilled:
      true,

    alreadyProcessed,

    orderId,

    subscriptionId:
      normalizedSubscriptionId,

    paymentProvider:
      normalizedProvider,

    paymentReference:
      normalizedReference,

    paymentStatus:
      order.payment_status,

    fulfillmentStatus:
      order.fulfillment_status,

    emailSent:
      emailResult.sent
  };
}


/*
 * Stripe adapter.
 *
 * Converts Stripe's invoice/subscription
 * representation into our provider-neutral
 * fulfillment call.
 */
export async function fulfillStripeSubscriptionInvoice({
  stripe,
  invoice
}) {
  if (
    !stripe ||
    !(stripe instanceof Stripe)
  ) {
    throw new Error(
      "Stripe client is required."
    );
  }

  const invoiceId =
    normalizeText(
      invoice?.id,
      "Stripe invoice ID"
    );

  if (
    invoice?.status !== "paid" &&
    invoice?.paid !== true
  ) {
    return {
      fulfilled:
        false,

      reason:
        "Stripe invoice is not paid.",

      invoiceId
    };
  }

  const stripeSubscriptionId =
    normalizeText(
      getStripeSubscriptionIdFromInvoice(
        invoice
      ),
      `Stripe subscription ID for invoice ${invoiceId}`
    );

  const stripeSubscription =
    await stripe
      .subscriptions
      .retrieve(
        stripeSubscriptionId
      );

  const internalSubscriptionId =
    normalizeText(
      stripeSubscription
        ?.metadata
        ?.internal_subscription_id,

      `Internal subscription ID for Stripe subscription ${stripeSubscriptionId}`
    );

  return fulfillRecurringSubscriptionPayment({
    subscriptionId:
      internalSubscriptionId,

    paymentProvider:
      "stripe",

    paymentReference:
      invoiceId
  });
}