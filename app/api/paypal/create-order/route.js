import { NextResponse } from "next/server";
import { createPayPalOrder } from "@/lib/paypal";
import { createSupabaseAdmin } from "@/lib/supabase-admin";
import {
  prepareCheckout,
  releaseCheckoutReservation,
  deleteIncompleteOrder
} from "@/lib/checkout/prepare-checkout";

export const runtime = "nodejs";

function centsToPayPalAmount(cents) {
  const amount = Number(cents);

  if (
    !Number.isSafeInteger(amount) ||
    amount <= 0
  ) {
    throw new Error(
      "The PayPal payment total is invalid."
    );
  }

  return (amount / 100).toFixed(2);
}

export async function POST(request) {
  let reservationId = null;
  let createdOrderId = null;
  let paypalOrderId = null;
  let createdRecoveryId = null;
  let supabase = null;

  try {
    let body;

    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        {
          message:
            "Invalid PayPal checkout request."
        },
        { status: 400 }
      );
    }

    const storefront = String(
      body?.storefront || "shakti_foods"
    ).trim();

    const allowedStorefronts = new Set([
      "shakti_foods",
      "ecoware"
    ]);

    if (!allowedStorefronts.has(storefront)) {
      return NextResponse.json(
        {
          message: "Invalid storefront."
        },
        { status: 400 }
      );
    }

    const businessName =
      storefront === "ecoware"
        ? "Simpli Ecoware"
        : "Shakti Foods";

    const rawCartItems = Array.isArray(
      body?.items
    )
      ? body.items
      : [];

    if (rawCartItems.length === 0) {
      return NextResponse.json(
        {
          message: "Cart is empty."
        },
        { status: 400 }
      );
    }

    const rawCustomer =
      body?.customer &&
      typeof body.customer === "object"
        ? body.customer
        : {};

    const customerName =
      String(
        rawCustomer.name || ""
      ).trim();

    const customerEmail =
      String(
        rawCustomer.email || ""
      )
        .trim()
        .toLowerCase();

    const customerPhone =
      String(
        rawCustomer.phone || ""
      ).trim() || null;

    const marketingEmailConsent =
      rawCustomer.marketingEmailConsent ===
      true;

    if (!customerName) {
      return NextResponse.json(
        {
          message:
            "Customer name is required."
        },
        { status: 400 }
      );
    }

    if (
      !customerEmail ||
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
        customerEmail
      )
    ) {
      return NextResponse.json(
        {
          message:
            "A valid customer email address is required."
        },
        { status: 400 }
      );
    }

    /*
     * This performs server-trusted pricing,
     * inventory validation, shipping calculation
     * and inventory reservation.
     */
    const checkout =
      await prepareCheckout(
        rawCartItems,
        storefront
      );

    reservationId =
      checkout.reservationId;

    supabase =
      createSupabaseAdmin();

    /*
     * Create the pending database order first.
     */
    const {
      data: order,
      error: orderError
    } = await supabase
      .from("orders")
      .insert({
        storefront,
        payment_provider: "paypal",
        reservation_id: reservationId,

        payment_status: "pending",
        fulfillment_status: "new",

        subtotal:
          checkout.subtotalCents,

        shipping_amount:
          checkout.shippingAmountCents,

        tax_amount:
          checkout.taxAmountCents,

        total_amount:
          checkout.totalAmountCents,

        currency:
          checkout.currency
      })
      .select("id")
      .single();

    if (orderError || !order) {
      console.error(
        "Unable to create pending PayPal order:",
        orderError
      );

      throw new Error(
        orderError?.message ||
          "Unable to create the PayPal order record."
      );
    }

    createdOrderId = order.id;

    const recoverySnapshot =
      checkout.orderItems.map((item) => ({
        product_id:
          item.product_id,

        product_name:
          item.product_name,

        quantity:
          item.quantity,

        unit_price:
          item.unit_price,

        line_total:
          item.line_total
      }));

    const {
      data: recovery,
      error: recoveryError
    } = await supabase
      .from("cart_recovery_sessions")
      .insert({
        reservation_id:
          reservationId,

        order_id:
          order.id,

        payment_provider:
          "paypal",

        email:
          customerEmail,

        phone:
          customerPhone,

        marketing_email_consent:
          marketingEmailConsent,

        /*
        * A supplied phone number does not
        * constitute SMS consent.
        */
        sms_consent:
          false,

        cart_snapshot:
          recoverySnapshot,

        subtotal_cents:
          checkout.subtotalCents,

        shipping_cents:
          checkout.shippingAmountCents,

        tax_cents:
          checkout.taxAmountCents,

        total_cents:
          checkout.totalAmountCents,

        currency:
          checkout.currency,

        status:
          "active"
      })
      .select("id")
      .single();

    if (recoveryError) {
      console.error(
        "Unable to create PayPal cart recovery session:",
        recoveryError
      );
    } else {
      createdRecoveryId =
        recovery.id;
    }

    const orderItems =
      checkout.orderItems.map((item) => ({
        order_id: order.id,
        ...item
      }));

    const {
      error: orderItemsError
    } = await supabase
      .from("order_items")
      .insert(orderItems);

    if (orderItemsError) {
      console.error(
        "Unable to save PayPal order items:",
        orderItemsError
      );

      throw new Error(
        orderItemsError.message ||
          "Unable to save PayPal order items."
      );
    }

    /*
     * Create the PayPal order using the trusted
     * amount calculated by prepareCheckout().
     */
    const paypalOrder =
      await createPayPalOrder({
        amount: centsToPayPalAmount(
          checkout.totalAmountCents
        ),

        currency:
          checkout.currency,

        referenceId:
          order.id,

        customId:
          reservationId,

        description:
          `${businessName} Order`,

        brandName:
          businessName
      });

    console.log(
      "PayPal order created:",
      {
        paypalOrderId:
          paypalOrder?.id,

        status:
          paypalOrder?.status,

        expectedOrderId:
          order.id,

        expectedReservationId:
          reservationId
      }
    );

    if (!paypalOrder?.id) {
      throw new Error(
        "PayPal did not return an order ID."
      );
    }

    paypalOrderId =
      paypalOrder.id;

    const {
      error: linkOrderError
    } = await supabase
      .from("orders")
      .update({
        paypal_order_id:
          paypalOrderId,

        updated_at:
          new Date().toISOString()
      })
      .eq("id", order.id);

    if (linkOrderError) {
      console.error(
        "Unable to link PayPal order:",
        linkOrderError
      );

      throw new Error(
        "The PayPal order was created, but it could not be linked to the database order."
      );
    }

    return NextResponse.json({
      success: true,
      orderId: paypalOrderId,
      internalOrderId: order.id,
      reservationId
    });
  } catch (error) {
    console.error(
      "PayPal order creation error:",
      {
        reservationId,
        createdOrderId,
        paypalOrderId,
        error
      }
    );

    if (createdRecoveryId) {
      const {
        error: recoveryDeleteError
      } = await supabase
        .from("cart_recovery_sessions")
        .delete()
        .eq(
          "id",
          createdRecoveryId
        );

      if (recoveryDeleteError) {
        console.error(
          "Unable to clean up PayPal cart recovery session:",
          recoveryDeleteError
        );
      }

      createdRecoveryId = null;
    }
    
    if (createdOrderId) {
      await deleteIncompleteOrder(
        createdOrderId
      );

      createdOrderId = null;
    }

    if (reservationId) {
      await releaseCheckoutReservation(
        reservationId
      );

      reservationId = null;
    }

    const message =
      error instanceof Error
        ? error.message
        : "Unable to create PayPal checkout.";

    return NextResponse.json(
      { message },
      { status: 400 }
    );
  }
}