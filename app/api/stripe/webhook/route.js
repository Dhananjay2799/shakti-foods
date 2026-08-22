import Stripe from "stripe";
import { NextResponse } from "next/server";

import {
  fulfillCheckoutSession
} from "@/lib/fulfill-checkout";

import {
  createSupabaseAdmin
} from "@/lib/supabase-admin";

import {
  fulfillStripeSubscriptionInvoice
} from "@/lib/subscriptions/fulfill-subscription";

export const runtime = "nodejs";


export async function POST(request) {
  const stripeSecretKey =
    process.env.STRIPE_SECRET_KEY;

  const webhookSecret =
    process.env.STRIPE_WEBHOOK_SECRET;

  if (
    !stripeSecretKey ||
    !webhookSecret
  ) {
    return NextResponse.json(
      {
        message:
          "Missing Stripe server environment variables."
      },
      {
        status: 500
      }
    );
  }

  const stripe =
    new Stripe(
      stripeSecretKey
    );

  const signature =
    request.headers.get(
      "stripe-signature"
    );

  if (!signature) {
    return NextResponse.json(
      {
        message:
          "Missing Stripe signature."
      },
      {
        status: 400
      }
    );
  }

  const rawBody =
    await request.text();

  let event;

  try {
    event =
      stripe.webhooks.constructEvent(
        rawBody,
        signature,
        webhookSecret
      );
  } catch (error) {
    console.error(
      "Stripe webhook signature error:",
      error
    );

    return NextResponse.json(
      {
        message:
          error instanceof Error
            ? `Invalid webhook signature: ${error.message}`
            : "Invalid webhook signature."
      },
      {
        status: 400
      }
    );
  }

  try {
    switch (event.type) {

      /*
       * ===================================================
       * CHECKOUT SESSION COMPLETED
       * ===================================================
       */

      case "checkout.session.completed":
      case "checkout.session.async_payment_succeeded": {
        const session =
          event.data.object;

        const orderType =
          String(
            session.metadata
              ?.order_type ||
            ""
          )
            .trim()
            .toLowerCase();

        /*
         * Subscription Checkout Sessions NEVER
         * use the retail reservation fulfillment
         * workflow.
         */
        if (
          orderType ===
          "subscription"
        ) {
          await completeStripeSubscriptionCheckout({
            stripe,
            session,
            eventId:
              event.id
          });

          break;
        }

        /*
         * Existing one-time retail checkout.
         */
        const result =
          await fulfillCheckoutSession(
            session.id
          );

        console.log(
          "Stripe checkout fulfillment result:",
          {
            eventId:
              event.id,

            sessionId:
              session.id,

            result
          }
        );

        break;
      }


      /*
       * ===================================================
       * SUBSCRIPTION LIFECYCLE
       * ===================================================
       */

      case "customer.subscription.created":
      case "customer.subscription.updated": {
        await syncStripeSubscription(
          event.data.object
        );

        break;
      }


      case "customer.subscription.deleted": {
        await cancelStripeSubscription(
          event.data.object
        );

        break;
      }


      /*
       * ===================================================
       * SUBSCRIPTION PAYMENT SUCCESS
       * ===================================================
       */

      case "invoice.paid": {
        const invoice =
          event.data.object;

        const stripeSubscriptionId =
          getStripeSubscriptionIdFromInvoice(
            invoice
          );

        /*
         * Ignore invoices that are not associated
         * with a subscription.
         */
        if (!stripeSubscriptionId) {
          console.log(
            "Ignoring non-subscription Stripe invoice:",
            invoice.id
          );

          break;
        }

        const result =
          await fulfillStripeSubscriptionInvoice({
            stripe,
            invoice
          });

        console.log(
          "Stripe recurring invoice result:",
          {
            eventId:
              event.id,

            invoiceId:
              invoice.id,

            stripeSubscriptionId,

            result
          }
        );

        break;
      }


      /*
       * ===================================================
       * SUBSCRIPTION PAYMENT FAILURE
       * ===================================================
       */

      case "invoice.payment_failed": {
        await handleStripeSubscriptionPaymentFailure(
          event.data.object
        );

        break;
      }


      /*
       * ===================================================
       * ONE-TIME CHECKOUT FAILURE / EXPIRATION
       * ===================================================
       */

      case "checkout.session.expired":
      case "checkout.session.async_payment_failed": {
        const session =
          event.data.object;

        const orderType =
          String(
            session.metadata
              ?.order_type ||
            ""
          )
            .trim()
            .toLowerCase();

        /*
         * Subscription Checkout Sessions have no
         * checkout inventory reservation.
         */
        if (
          orderType ===
          "subscription"
        ) {
          await abandonPendingStripeSubscription(
            session
          );

          break;
        }

        await releaseExpiredReservation(
          session
        );

        break;
      }


      default:
        console.log(
          `Unhandled Stripe event: ${event.type}`
        );
    }

    return NextResponse.json({
      received: true
    });

  } catch (error) {
    console.error(
      `Webhook processing failed for event ${event.id}:`,
      error
    );

    return NextResponse.json(
      {
        message:
          error instanceof Error
            ? error.message
            : "Webhook processing failed."
      },
      {
        status: 500
      }
    );
  }
}


/*
 * =========================================================
 * COMMON HELPERS
 * =========================================================
 */

function stripeTimestampToIso(
  value
) {
  const timestamp =
    Number(value);

  if (
    !Number.isFinite(timestamp) ||
    timestamp <= 0
  ) {
    return null;
  }

  return new Date(
    timestamp * 1000
  ).toISOString();
}


function mapStripeSubscriptionStatus(
  value
) {
  switch (
    String(
      value || ""
    )
      .trim()
      .toLowerCase()
  ) {

    case "active":
    case "trialing":
      return "active";

    case "past_due":
    case "unpaid":
      return "past_due";

    case "paused":
      return "paused";

    case "canceled":
      return "canceled";

    case "incomplete_expired":
      return "ended";

    case "incomplete":
    default:
      return "pending";
  }
}


function getStripeSubscriptionIdFromInvoice(
  invoice
) {
  const direct =
    typeof invoice
      ?.subscription ===
    "string"
      ? invoice.subscription
      : invoice
          ?.subscription
          ?.id;

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


/*
 * =========================================================
 * SUBSCRIPTION CHECKOUT COMPLETION
 * =========================================================
 */

async function completeStripeSubscriptionCheckout({
  stripe,
  session,
  eventId
}) {
  const internalSubscriptionId =
    String(
      session.metadata
        ?.internal_subscription_id ||
      ""
    ).trim();

  if (!internalSubscriptionId) {
    throw new Error(
      `Stripe subscription session ${session.id} is missing internal_subscription_id.`
    );
  }

  const stripeSubscriptionId =
    typeof session.subscription ===
    "string"
      ? session.subscription
      : session.subscription?.id;

  if (!stripeSubscriptionId) {
    throw new Error(
      `Stripe subscription session ${session.id} has no subscription ID.`
    );
  }

  const stripeSubscription =
    await stripe
      .subscriptions
      .retrieve(
        stripeSubscriptionId
      );

  const supabase =
    createSupabaseAdmin();

  const now =
    new Date().toISOString();

  const customerDetails =
    session.customer_details ||
    {};

  const customerEmail =
    typeof customerDetails.email ===
    "string"
      ? customerDetails.email
          .trim()
          .toLowerCase()
      : null;

  const customerName =
    typeof customerDetails.name ===
    "string"
      ? customerDetails.name.trim()
      : null;

  const customerPhone =
    typeof customerDetails.phone ===
    "string"
      ? customerDetails.phone.trim()
      : null;

  const stripeCustomerId =
    typeof stripeSubscription.customer ===
    "string"
      ? stripeSubscription.customer
      : stripeSubscription.customer?.id ||
        (
          typeof session.customer ===
          "string"
            ? session.customer
            : session.customer?.id ||
              null
        );

  const currentPeriodStart =
    stripeTimestampToIso(
      stripeSubscription
        .current_period_start
    );

  const currentPeriodEnd =
    stripeTimestampToIso(
      stripeSubscription
        .current_period_end
    );

  const updatePayload = {
    payment_provider:
      "stripe",

    provider_subscription_id:
      stripeSubscription.id,

    stripe_subscription_id:
      stripeSubscription.id,

    stripe_customer_id:
      stripeCustomerId,

    status:
      mapStripeSubscriptionStatus(
        stripeSubscription.status
      ),

    updated_at:
      now
  };

  if (customerEmail) {
    updatePayload.customer_email =
      customerEmail;
  }

  if (customerName) {
    updatePayload.customer_name =
      customerName;
  }

  if (customerPhone) {
    updatePayload.customer_phone =
      customerPhone;
  }

  if (currentPeriodStart) {
    updatePayload.current_period_start =
      currentPeriodStart;
  }

  if (currentPeriodEnd) {
    updatePayload.current_period_end =
      currentPeriodEnd;

    updatePayload.next_billing_at =
      currentPeriodEnd;
  }

  /*
   * Save Stripe's collected shipping address.
   */
  const shippingDetails =
    session
      .collected_information
      ?.shipping_details ||
    session.shipping_details ||
    null;

  if (
    shippingDetails?.address
  ) {
    updatePayload.shipping_address =
      shippingDetails.address;
  }

  const {
    data: updatedSubscription,
    error
  } = await supabase
    .from("subscriptions")
    .update(
      updatePayload
    )
    .eq(
      "id",
      internalSubscriptionId
    )
    .eq(
      "payment_provider",
      "stripe"
    )
    .select(`
      id,
      status,
      stripe_customer_id,
      stripe_subscription_id,
      provider_subscription_id
    `)
    .maybeSingle();

  if (
    error ||
    !updatedSubscription
  ) {
    throw new Error(
      error?.message ||
        "Unable to complete Stripe subscription checkout."
    );
  }

  console.log(
    "Stripe subscription checkout completed:",
    {
      eventId,

      sessionId:
        session.id,

      internalSubscriptionId,

      stripeSubscriptionId:
        stripeSubscription.id,

      status:
        updatedSubscription.status
    }
  );
}


/*
 * =========================================================
 * SUBSCRIPTION SYNCHRONIZATION
 * =========================================================
 */

async function syncStripeSubscription(
  stripeSubscription
) {
  const internalSubscriptionId =
    String(
      stripeSubscription
        .metadata
        ?.internal_subscription_id ||
      ""
    ).trim();

  if (!internalSubscriptionId) {
    console.warn(
      "Stripe subscription event missing internal_subscription_id:",
      stripeSubscription.id
    );

    return;
  }

  const supabase =
    createSupabaseAdmin();

  const now =
    new Date().toISOString();

  const status =
    mapStripeSubscriptionStatus(
      stripeSubscription.status
    );

  const currentPeriodStart =
    stripeTimestampToIso(
      stripeSubscription
        .current_period_start
    );

  const currentPeriodEnd =
    stripeTimestampToIso(
      stripeSubscription
        .current_period_end
    );

  const stripeCustomerId =
    typeof stripeSubscription.customer ===
    "string"
      ? stripeSubscription.customer
      : stripeSubscription
          .customer
          ?.id ||
        null;

  const updatePayload = {
    payment_provider:
      "stripe",

    provider_subscription_id:
      stripeSubscription.id,

    stripe_subscription_id:
      stripeSubscription.id,

    stripe_customer_id:
      stripeCustomerId,

    status,

    updated_at:
      now
  };

  if (currentPeriodStart) {
    updatePayload.current_period_start =
      currentPeriodStart;
  }

  if (currentPeriodEnd) {
    updatePayload.current_period_end =
      currentPeriodEnd;

    updatePayload.next_billing_at =
      currentPeriodEnd;
  }

  if (
    status === "canceled"
  ) {
    updatePayload.canceled_at =
      stripeTimestampToIso(
        stripeSubscription
          .canceled_at
      ) || now;
  }

  const {
    error
  } = await supabase
    .from("subscriptions")
    .update(
      updatePayload
    )
    .eq(
      "id",
      internalSubscriptionId
    );

  if (error) {
    throw new Error(
      error.message ||
        "Unable to sync Stripe subscription."
    );
  }

  console.log(
    "Stripe subscription synced:",
    {
      internalSubscriptionId,

      stripeSubscriptionId:
        stripeSubscription.id,

      status
    }
  );
}


/*
 * =========================================================
 * SUBSCRIPTION CANCELLATION
 * =========================================================
 */

async function cancelStripeSubscription(
  stripeSubscription
) {
  const internalSubscriptionId =
    String(
      stripeSubscription
        .metadata
        ?.internal_subscription_id ||
      ""
    ).trim();

  if (!internalSubscriptionId) {
    console.warn(
      "Canceled Stripe subscription missing internal_subscription_id:",
      stripeSubscription.id
    );

    return;
  }

  const supabase =
    createSupabaseAdmin();

  const now =
    new Date().toISOString();

  const canceledAt =
    stripeTimestampToIso(
      stripeSubscription
        .canceled_at
    ) || now;

  const endedAt =
    stripeTimestampToIso(
      stripeSubscription
        .ended_at
    ) || now;

  const {
    error
  } = await supabase
    .from("subscriptions")
    .update({
      status:
        "canceled",

      canceled_at:
        canceledAt,

      ended_at:
        endedAt,

      next_billing_at:
        null,

      updated_at:
        now
    })
    .eq(
      "id",
      internalSubscriptionId
    );

  if (error) {
    throw new Error(
      error.message ||
        "Unable to cancel Stripe subscription."
    );
  }

  console.log(
    "Stripe subscription canceled:",
    {
      internalSubscriptionId,

      stripeSubscriptionId:
        stripeSubscription.id
    }
  );
}


/*
 * =========================================================
 * SUBSCRIPTION PAYMENT FAILURE
 * =========================================================
 */

async function handleStripeSubscriptionPaymentFailure(
  invoice
) {
  const stripeSubscriptionId =
    getStripeSubscriptionIdFromInvoice(
      invoice
    );

  if (!stripeSubscriptionId) {
    console.log(
      "Ignoring non-subscription failed invoice:",
      invoice.id
    );

    return;
  }

  const supabase =
    createSupabaseAdmin();

  const {
    error
  } = await supabase
    .from("subscriptions")
    .update({
      status:
        "past_due",

      updated_at:
        new Date().toISOString()
    })
    .eq(
      "stripe_subscription_id",
      stripeSubscriptionId
    );

  if (error) {
    throw new Error(
      error.message ||
        "Unable to mark subscription past due."
    );
  }

  console.log(
    "Stripe subscription payment failed:",
    {
      invoiceId:
        invoice.id,

      stripeSubscriptionId
    }
  );
}


/*
 * =========================================================
 * ABANDONED SUBSCRIPTION CHECKOUT
 * =========================================================
 */

async function abandonPendingStripeSubscription(
  session
) {
  const internalSubscriptionId =
    String(
      session.metadata
        ?.internal_subscription_id ||
      ""
    ).trim();

  if (!internalSubscriptionId) {
    return;
  }

  const supabase =
    createSupabaseAdmin();

  const {
    error
  } = await supabase
    .from("subscriptions")
    .update({
      status:
        "ended",

      ended_at:
        new Date().toISOString(),

      updated_at:
        new Date().toISOString()
    })
    .eq(
      "id",
      internalSubscriptionId
    )
    .eq(
      "status",
      "pending"
    );

  if (error) {
    console.error(
      "Unable to close abandoned Stripe subscription checkout:",
      {
        internalSubscriptionId,
        sessionId:
          session.id,
        error
      }
    );
  }
}


/*
 * =========================================================
 * EXISTING ONE-TIME CHECKOUT RESERVATION RELEASE
 * =========================================================
 */

async function releaseExpiredReservation(
  session
) {
  const reservationId =
    session.metadata
      ?.reservation_id;

  if (!reservationId) {
    console.warn(
      `Stripe session ${session.id} has no reservation_id.`
    );

    return;
  }

  const supabase =
    createSupabaseAdmin();

  const {
    error: releaseError
  } = await supabase.rpc(
    "release_inventory_reservation",
    {
      p_reservation_id:
        reservationId
    }
  );

  if (releaseError) {
    throw new Error(
      releaseError.message ||
        `Unable to release reservation ${reservationId}.`
    );
  }

  const {
    error: recoveryError
  } = await supabase
    .from(
      "cart_recovery_sessions"
    )
    .update({
      status:
        "abandoned",

      abandoned_at:
        new Date().toISOString()
    })
    .eq(
      "reservation_id",
      reservationId
    )
    .eq(
      "status",
      "active"
    );

  if (recoveryError) {
    console.error(
      "Unable to mark Stripe recovery session abandoned:",
      {
        reservationId,

        sessionId:
          session.id,

        recoveryError
      }
    );
  }

  console.log(
    `Released inventory reservation ${reservationId} for Stripe session ${session.id}.`
  );
}