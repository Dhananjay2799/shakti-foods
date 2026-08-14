import Stripe from "stripe";
import { NextResponse } from "next/server";
import { createSupabaseAdmin } from "@/lib/supabase-admin";

export const runtime = "nodejs";

export async function POST(request) {
  try {
    const body = await request.json();

    const sessionId = String(
      body?.sessionId || ""
    ).trim();

    const reservationId = String(
      body?.reservationId || ""
    ).trim();

    if (!sessionId || !reservationId) {
      return NextResponse.json(
        {
          message:
            "Missing checkout session information."
        },
        { status: 400 }
      );
    }

    const stripeSecretKey =
      process.env.STRIPE_SECRET_KEY;

    if (!stripeSecretKey) {
      throw new Error(
        "Stripe is not configured."
      );
    }

    const stripe = new Stripe(
      stripeSecretKey
    );

    const session =
      await stripe.checkout.sessions.retrieve(
        sessionId
      );

    /*
     * Do not release inventory for a completed
     * or paid checkout.
     */
    if (
      session.status === "complete" ||
      session.payment_status === "paid"
    ) {
      return NextResponse.json({
        success: true,
        released: false,
        reason: "checkout_completed"
      });
    }

    /*
     * Expire the Stripe session first so payment
     * can no longer be submitted afterward.
     */
    if (session.status === "open") {
      await stripe.checkout.sessions.expire(
        sessionId
      );
    }

    const supabase =
      createSupabaseAdmin();

    const {
      data: reservation,
      error: reservationError
    } = await supabase
      .from("checkout_reservations")
      .select(
        "id, stripe_session_id, status"
      )
      .eq("id", reservationId)
      .maybeSingle();

    if (
      reservationError ||
      !reservation
    ) {
      throw new Error(
        reservationError?.message ||
          "Reservation was not found."
      );
    }

    if (
      reservation.stripe_session_id !==
      sessionId
    ) {
      return NextResponse.json(
        {
          message:
            "Checkout session and reservation do not match."
        },
        { status: 409 }
      );
    }

    if (
      reservation.status === "pending"
    ) {
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
            "Unable to release reservation."
        );
      }
    }

        /*
    * Keep the recovery record after inventory
    * is released so the customer can be
    * contacted/restored later.
    *
    * Only active recovery sessions should move
    * to abandoned. Completed/recovered sessions
    * must never move backward.
    */
    /*
  * Capture any customer contact information
  * Stripe collected before the checkout was
  * abandoned.
  *
  * A collected phone number does NOT imply
  * SMS marketing consent.
  */
  const customerDetails =
    session.customer_details || {};

  const recoveryEmail =
    typeof customerDetails.email === "string"
      ? customerDetails.email
          .trim()
          .toLowerCase()
      : null;

  const recoveryPhone =
    typeof customerDetails.phone === "string"
      ? customerDetails.phone.trim()
      : null;

  const abandonedAt =
    new Date().toISOString();

  const recoveryUpdate = {
    status:
      "abandoned",

    abandoned_at:
      abandonedAt,

    /*
    * Never infer marketing consent merely
    * because Stripe collected contact data.
    */
    sms_consent:
      false
  };

  /*
  * Do not overwrite previously captured
  * contact information with null.
  */
  if (recoveryEmail) {
    recoveryUpdate.email =
      recoveryEmail;
  }

  if (recoveryPhone) {
    recoveryUpdate.phone =
      recoveryPhone;
  }

  const {
    data: updatedRecovery,
    error: recoveryError
  } = await supabase
    .from("cart_recovery_sessions")
    .update(recoveryUpdate)
    .eq(
      "reservation_id",
      reservationId
    )
    .eq(
      "status",
      "active"
    )
    .select(`
      id,
      email,
      phone,
      status,
      abandoned_at
    `);

  if (recoveryError) {
    console.error(
      "Unable to mark cart recovery session abandoned:",
      {
        reservationId,
        sessionId,
        recoveryError
      }
    );
  } else {
    console.log(
      "Cart recovery session abandoned:",
      {
        reservationId,
        sessionId,
        emailCaptured:
          Boolean(recoveryEmail),
        phoneCaptured:
          Boolean(recoveryPhone),
        updatedRows:
          updatedRecovery?.length || 0
      }
    );
  }

    return NextResponse.json({
      success: true,
      released:
        reservation.status === "pending"
    });
  } catch (error) {
    console.error(
      "Checkout abandonment error:",
      error
    );

    return NextResponse.json(
      {
        message:
          error instanceof Error
            ? error.message
            : "Unable to cancel checkout."
      },
      { status: 500 }
    );
  }
}