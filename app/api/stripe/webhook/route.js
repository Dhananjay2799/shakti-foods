import Stripe from "stripe";
import { NextResponse } from "next/server";
import { fulfillCheckoutSession } from "@/lib/fulfill-checkout";
import { createSupabaseAdmin } from "@/lib/supabase-admin";
import {
  fulfillStripeSubscriptionInvoice
} from "@/lib/subscriptions/fulfill-subscription";

export const runtime = "nodejs";

export async function POST(request) {
  const stripeSecretKey =
    process.env.STRIPE_SECRET_KEY;

  const webhookSecret =
    process.env.STRIPE_WEBHOOK_SECRET;

  if (!stripeSecretKey || !webhookSecret) {
    return NextResponse.json(
      {
        message:
          "Missing Stripe server environment variables."
      },
      { status: 500 }
    );
  }

  const stripe = new Stripe(
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
      { status: 400 }
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
      { status: 400 }
    );
  }

  try {
    switch (event.type) {
      case "checkout.session.completed":
      case "checkout.session.async_payment_succeeded": {
        const session =
          event.data.object;

        const orderType =
          String(
            session.metadata?.order_type ||
              ""
          )
            .trim()
            .toLowerCase();

        /*
         * Subscription Checkout Sessions must
         * never use normal retail fulfillment.
         */
        if (orderType === "subscription") {
          await completeStripeSubscriptionCheckout({
            stripe,
            session,
            eventId: event.id
          });

          break;
        }

        const result =
          await fulfillCheckoutSession(
            session.id
          );

        /*
         * Payment succeeded:
         * capture customer contact details and
         * permanently stop cart recovery.
         */

        console.log(
          "Stripe checkout fulfillment result:",
          {
            eventId: event.id,
            sessionId: session.id,
            result
          }
        );

        break;
      }

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

      case "invoice.paid": {
        const invoice =
          event.data.object;

        const hasSubscription =
          Boolean(
            invoice.subscription ||
              invoice.parent
                ?.subscription_details
                ?.subscription
          );

        if (!hasSubscription) {
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
            eventId: event.id,
            invoiceId: invoice.id,
            result
          }
        );

        break;
      }

      case "invoice.payment_failed": {
        await handleStripeSubscriptionPaymentFailure(
          event.data.object
        );

        break;
      }

      case "checkout.session.expired": {
        await releaseExpiredReservation(
          event.data.object
        );

        break;
      }

      case "checkout.session.async_payment_failed": {
        await releaseExpiredReservation(
          event.data.object
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
      { status: 500 }
    );
  }
}

/*
 * Handles Stripe sessions that expire or
 * whose asynchronous payment fails.
 *
 * Inventory is released, while the separate
 * recovery record is preserved and marked
 * abandoned.
 */
async function releaseExpiredReservation(
  session
) {
  const reservationId =
    session.metadata?.reservation_id;

  if (!reservationId) {
    console.warn(
      `Stripe session ${session.id} has no reservation_id.`
    );

    return;
  }

  const supabase =
    createSupabaseAdmin();

  /*
   * Release inventory first.
   */
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

  /*
   * Preserve the cart snapshot but mark it
   * eligible for recovery.
   *
   * Only active recovery sessions are changed,
   * so a completed/recovered record cannot be
   * accidentally moved backward.
   */
  const {
    error: recoveryError
  } = await supabase
    .from("cart_recovery_sessions")
    .update({
      status: "abandoned",
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
        sessionId: session.id,
        recoveryError
      }
    );
  }

  console.log(
    `Released inventory reservation ${reservationId} for Stripe session ${session.id}.`
  );
}

/*
 * Successful payment:
 *
 * - store Stripe customer contact information
 * - mark recovery completed
 * - prevent future abandoned-cart messages
 *
 * A collected phone number is NOT automatically
 * treated as SMS marketing consent.
 */
async function completeStripeRecovery(
  session
) {
  const reservationId =
    session.metadata?.reservation_id;

  if (!reservationId) {
    console.warn(
      `Stripe session ${session.id} has no reservation_id for recovery completion.`
    );

    return;
  }

  const customerDetails =
    session.customer_details || {};

  const email =
    typeof customerDetails.email === "string"
      ? customerDetails.email
          .trim()
          .toLowerCase()
      : null;

  const phone =
    typeof customerDetails.phone === "string"
      ? customerDetails.phone.trim()
      : null;

  const supabase =
    createSupabaseAdmin();

  const {
    error
  } = await supabase
    .from("cart_recovery_sessions")
    .update({
      email,
      phone,

      status: "completed",

      completed_at:
        new Date().toISOString(),

      /*
       * Stripe collecting a phone number does
       * not constitute SMS marketing consent.
       */
      sms_consent: false
    })
    .eq(
      "reservation_id",
      reservationId
    )
    .in(
      "status",
      [
        "active",
        "abandoned"
      ]
    );

  if (error) {
    console.error(
      "Unable to complete Stripe recovery session:",
      {
        reservationId,
        sessionId: session.id,
        error
      }
    );
  }
}

function stripeTimestampToIso(
  timestamp
) {
  if (!timestamp) {
    return null;
  }

  const date =
    new Date(Number(timestamp) * 1000);

  return Number.isNaN(date.getTime())
    ? null
    : date.toISOString();
}

async function completeStripeSubscriptionCheckout({
  stripe,
  session,
  eventId
}) {
  const internalSubscriptionId =
    session.metadata?.internal_subscription_id;

  if (!internalSubscriptionId) {
    throw new Error(
      `Stripe subscription session ${session.id} is missing internal_subscription_id.`
    );
  }

  const stripeSubscriptionId =
    typeof session.subscription === "string"
      ? session.subscription
      : session.subscription?.id;

  if (!stripeSubscriptionId) {
    throw new Error(
      `Stripe subscription session ${session.id} has no subscription ID.`
    );
  }

  const stripeSubscription =
    typeof session.subscription === "object" &&
    session.subscription
      ? session.subscription
      : await stripe.subscriptions.retrieve(
          stripeSubscriptionId
        );

  const supabase =
    createSupabaseAdmin();

  const { error } = await supabase
    .from("subscriptions")
    .update({
      status: "active",
      stripe_subscription_id:
        stripeSubscription.id,
      stripe_customer_id:
        typeof session.customer === "string"
          ? session.customer
          : session.customer?.id || null,
      updated_at:
        new Date().toISOString()
    })
    .eq("id", internalSubscriptionId);

  if (error) {
    throw new Error(
      error.message ||
        "Unable to complete Stripe subscription checkout."
    );
  }

  console.log(
    "Stripe subscription checkout completed:",
    {
      eventId,
      sessionId: session.id,
      internalSubscriptionId,
      stripeSubscriptionId: stripeSubscription.id
    }
  );
}

async function syncStripeSubscription(
  stripeSubscription
) {
  const internalSubscriptionId =
    stripeSubscription.metadata
      ?.internal_subscription_id;

  if (!internalSubscriptionId) {
    return;
  }

  const supabase =
    createSupabaseAdmin();

  const { error } = await supabase
    .from("subscriptions")
    .update({
      status:
        stripeSubscription.status ||
        "active",
      stripe_subscription_id:
        stripeSubscription.id,
      updated_at:
        new Date().toISOString()
    })
    .eq("id", internalSubscriptionId);

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
      status: stripeSubscription.status
    }
  );
}

async function cancelStripeSubscription(
  stripeSubscription
) {
  const internalSubscriptionId =
    stripeSubscription.metadata
      ?.internal_subscription_id;

  if (!internalSubscriptionId) {
    return;
  }

  const now =
    new Date().toISOString();

  const supabase =
    createSupabaseAdmin();

  const { error } = await supabase
    .from("subscriptions")
    .update({
      status: "canceled",
      canceled_at:
        stripeTimestampToIso(
          stripeSubscription.ended_at
        ) || now,
      updated_at: now
    })
    .eq("id", internalSubscriptionId);

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

async function handleStripeSubscriptionPaymentFailure(
  invoice
) {
  const stripeSubscriptionId =
    typeof invoice.subscription === "string"
      ? invoice.subscription
      : invoice.subscription?.id;

  if (!stripeSubscriptionId) {
    return;
  }

  const supabase =
    createSupabaseAdmin();

  const { error } = await supabase
    .from("subscriptions")
    .update({
      status: "past_due",
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
      invoiceId: invoice.id,
      stripeSubscriptionId
    }
  );
}