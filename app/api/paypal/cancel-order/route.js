import { NextResponse } from "next/server";
import { createSupabaseAdmin } from "@/lib/supabase-admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request) {
  try {
    const body = await request.json();

    const reservationId = String(
      body?.reservationId || ""
    ).trim();

    const paypalOrderId = String(
      body?.paypalOrderId || ""
    ).trim();

    if (!reservationId) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Reservation ID is required."
        },
        {
          status: 400
        }
      );
    }

    const supabase =
      createSupabaseAdmin();

    const {
      data: reservation,
      error: reservationError
    } = await supabase
      .from("checkout_reservations")
      .select(`
        id,
        status
      `)
      .eq(
        "id",
        reservationId
      )
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
      reservation.status !==
      "pending"
    ) {
      return NextResponse.json({
        success: true,
        released: false,
        reason:
          "reservation_not_pending"
      });
    }

    const {
      data: order,
      error: orderError
    } = await supabase
      .from("orders")
      .select(`
        id,
        payment_status,
        paypal_order_id
      `)
      .eq(
        "reservation_id",
        reservationId
      )
      .maybeSingle();

    if (orderError) {
      throw new Error(
        orderError.message ||
          "Unable to verify PayPal order."
      );
    }

    if (
      order?.payment_status ===
      "paid"
    ) {
      return NextResponse.json(
        {
          success: false,
          released: false,
          error:
            "Paid orders cannot be cancelled."
        },
        {
          status: 409
        }
      );
    }

    if (
      paypalOrderId &&
      order?.paypal_order_id &&
      String(
        order.paypal_order_id
      ) !== paypalOrderId
    ) {
      return NextResponse.json(
        {
          success: false,
          released: false,
          error:
            "PayPal order does not match this reservation."
        },
        {
          status: 409
        }
      );
    }

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
          "Unable to release inventory reservation."
      );
    }

    if (order?.id) {
      const {
        error: updateError
      } = await supabase
        .from("orders")
        .update({
          payment_status:
            "cancelled",
          updated_at:
            new Date()
              .toISOString()
        })
        .eq(
          "id",
          order.id
        )
        .neq(
          "payment_status",
          "paid"
        );

      if (updateError) {
        console.error(
          "Reservation released, but PayPal order status could not be updated:",
          updateError
        );
      }
    }

    return NextResponse.json({
      success: true,
      released: true
    });
  } catch (error) {
    console.error(
      "PayPal cancellation failed:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Unable to cancel PayPal checkout."
      },
      {
        status: 500
      }
    );
  }
}