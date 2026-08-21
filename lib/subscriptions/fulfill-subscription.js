import Stripe from "stripe";

import {
  createSupabaseAdmin
} from "@/lib/supabase-admin";

import {
  sendOrderConfirmationEmailSafely
} from "@/lib/order-confirmation-email";


function normalizeIdentifier(
  value,
  fieldName
) {
  const normalized =
    String(value ?? "").trim();

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
  /*
   * Support both Stripe invoice shapes:
   *
   * older/common:
   * invoice.subscription
   *
   * newer:
   * invoice.parent.subscription_details.subscription
   */

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
    invoice?.parent
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


export async function fulfillStripeSubscriptionInvoice({
  stripe,
  invoice
}) {
  if (!stripe) {
    throw new Error(
      "Stripe client is required."
    );
  }

  const invoiceId =
    normalizeIdentifier(
      invoice?.id,
      "Stripe invoice ID"
    );

  /*
   * A paid invoice is required.
   */
  if (
    invoice?.status !== "paid" &&
    invoice?.paid !== true
  ) {
    return {
      fulfilled: false,

      reason:
        "Stripe invoice is not paid.",

      invoiceId
    };
  }


  const stripeSubscriptionId =
    normalizeIdentifier(
      getStripeSubscriptionIdFromInvoice(
        invoice
      ),
      `Stripe subscription ID for invoice ${invoiceId}`
    );


  /*
   * Retrieve Stripe's authoritative subscription
   * so we can read the internal subscription ID
   * from metadata.
   */
  const stripeSubscription =
    await stripe.subscriptions.retrieve(
      stripeSubscriptionId
    );


  const internalSubscriptionId =
    normalizeIdentifier(
      stripeSubscription.metadata
        ?.internal_subscription_id,

      `Internal subscription ID for Stripe subscription ${stripeSubscriptionId}`
    );


  const supabase =
    createSupabaseAdmin();


  /*
   * -------------------------------------------------------
   * Make sure Stripe's subscription belongs to our row.
   * -------------------------------------------------------
   */

  const {
    data: subscription,
    error: subscriptionError
  } = await supabase
    .from("subscriptions")
    .select(`
      id,
      customer_id,
      customer_email,
      customer_name,
      customer_phone,
      payment_provider,
      provider_subscription_id,
      stripe_subscription_id,
      status,
      currency,
      subtotal_cents,
      discount_cents,
      shipping_cents,
      tax_cents,
      total_cents,
      shipping_address
    `)
    .eq(
      "id",
      internalSubscriptionId
    )
    .maybeSingle();


  if (
    subscriptionError ||
    !subscription
  ) {
    throw new Error(
      subscriptionError?.message ||
        `Subscription ${internalSubscriptionId} was not found.`
    );
  }


  if (
    subscription.payment_provider !==
    "stripe"
  ) {
    throw new Error(
      "Subscription payment provider mismatch."
    );
  }


  if (
    subscription.stripe_subscription_id &&
    subscription.stripe_subscription_id !==
      stripeSubscriptionId
  ) {
    throw new Error(
      "Stripe subscription ID does not match the stored subscription."
    );
  }


  /*
   * -------------------------------------------------------
   * Link Stripe IDs if checkout.session.completed has not
   * reached us yet.
   *
   * This makes invoice.paid safe even when webhook events
   * arrive in a different order.
   * -------------------------------------------------------
   */

  const {
    error: linkError
  } = await supabase
    .from("subscriptions")
    .update({
      provider_subscription_id:
        stripeSubscriptionId,

      stripe_subscription_id:
        stripeSubscriptionId,

      stripe_customer_id:
        typeof stripeSubscription.customer ===
        "string"
          ? stripeSubscription.customer
          : stripeSubscription.customer?.id ||
            null,

      status:
        subscription.status ===
        "pending"
          ? "active"
          : subscription.status,

      updated_at:
        new Date().toISOString()
    })
    .eq(
      "id",
      internalSubscriptionId
    );


  if (linkError) {
    throw new Error(
      linkError.message ||
        "Unable to link Stripe subscription."
    );
  }


  /*
   * -------------------------------------------------------
   * Atomic database fulfillment.
   * -------------------------------------------------------
   */

  const {
    data: fulfillmentResult,
    error: fulfillmentError
  } = await supabase.rpc(
    "fulfill_subscription_invoice",
    {
      p_subscription_id:
        internalSubscriptionId,

      p_stripe_invoice_id:
        invoiceId
    }
  );


  if (fulfillmentError) {
    console.error(
      "Unable to fulfill subscription invoice:",
      {
        invoiceId,
        stripeSubscriptionId,
        internalSubscriptionId,
        fulfillmentError
      }
    );

    throw new Error(
      fulfillmentError.message ||
        "Unable to create recurring subscription order."
    );
  }


  const orderId =
    fulfillmentResult?.order_id;

  if (!orderId) {
    throw new Error(
      "Subscription fulfillment did not return an order ID."
    );
  }


  const alreadyProcessed =
    fulfillmentResult
      ?.already_processed ===
      true;


  /*
   * -------------------------------------------------------
   * Load the completed order for email.
   * -------------------------------------------------------
   */

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
        payment_status,
        fulfillment_status,
        subscription_id,
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


  const order =
    orderResult.data;

  const orderItems =
    itemsResult.data || [];


  /*
   * Do not resend confirmation if Stripe retries
   * the invoice.paid webhook.
   */
  let emailResult = {
    sent: false
  };


  if (!alreadyProcessed) {
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

        items:
          orderItems,

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
    "Stripe subscription invoice fulfillment result:",
    {
      invoiceId,
      stripeSubscriptionId,
      internalSubscriptionId,
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

    invoiceId,

    subscriptionId:
      internalSubscriptionId,

    stripeSubscriptionId,

    paymentStatus:
      order.payment_status,

    fulfillmentStatus:
      order.fulfillment_status,

    emailSent:
      emailResult.sent
  };
}