import Stripe from "stripe";
import { NextResponse } from "next/server";
import { fulfillCheckoutSession } from "@/lib/fulfill-checkout";

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

        const result =
          await fulfillCheckoutSession(
            session.id
          );

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

  console.log(
    `Released inventory reservation ${reservationId} for Stripe session ${session.id}.`
  );
}