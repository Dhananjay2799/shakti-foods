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