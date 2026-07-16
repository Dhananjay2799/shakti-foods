import Stripe from "stripe";
import { NextResponse } from "next/server";
import { createSupabaseAdmin } from "@/lib/supabase-admin";
import { fulfillCheckoutSession } from "@/lib/fulfill-checkout";

export const runtime = "nodejs";

export async function POST(request) {
  const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!stripeSecretKey || !webhookSecret) {
    return NextResponse.json(
      {
        message: "Missing Stripe server environment variables."
      },
      { status: 500 }
    );
  }

  const stripe = new Stripe(stripeSecretKey);
  const signature = request.headers.get("stripe-signature");

  if (!signature) {
    return NextResponse.json(
      {
        message: "Missing Stripe signature."
      },
      { status: 400 }
    );
  }

  const rawBody = await request.text();

  let event;

  try {
    event = stripe.webhooks.constructEvent(
      rawBody,
      signature,
      webhookSecret
    );
  } catch (error) {
    console.error(
      "Stripe webhook signature error:",
      error.message
    );

    return NextResponse.json(
      {
        message: `Invalid webhook signature: ${error.message}`
      },
      { status: 400 }
    );
  }

  try {
    switch (event.type) {
      case "checkout.session.completed":
        await saveCompletedOrder(
          stripe,
          event.data.object
        );
        break;

      case "checkout.session.expired":
        await releaseExpiredReservation(
          event.data.object
        );
        break;

      default:
        break;
    }

    return NextResponse.json({
      received: true
    });
  } catch (error) {
    console.error(
      "Webhook processing error:",
      error
    );

    return NextResponse.json(
      {
        message:
          error.message ||
          "Webhook processing failed."
      },
      { status: 500 }
    );
  }
}

async function saveCompletedOrder(stripe, session) {
  const supabase = createSupabaseAdmin();

  const fullSession =
    await stripe.checkout.sessions.retrieve(
      session.id,
      {
        expand: [
          "line_items.data.price.product"
        ]
      }
    );

  const customer = fullSession.customer_details;

  const shippingDetails =
    fullSession.collected_information
      ?.shipping_details ||
    fullSession.shipping_details ||
    null;

  const shippingAddress =
    shippingDetails?.address ||
    customer?.address ||
    null;

  const paymentIntentId =
    typeof fullSession.payment_intent === "string"
      ? fullSession.payment_intent
      : fullSession.payment_intent?.id || null;

  const shippingRate =
    typeof fullSession.shipping_cost
      ?.shipping_rate === "string"
      ? fullSession.shipping_cost.shipping_rate
      : fullSession.shipping_cost
          ?.shipping_rate?.id || null;

  const {
    data: order,
    error: orderError
  } = await supabase
    .from("orders")
    .upsert(
      {
        stripe_session_id: fullSession.id,

        stripe_payment_intent_id:
          paymentIntentId,

        customer_name:
          shippingDetails?.name ||
          customer?.name ||
          null,

        customer_email:
          customer?.email || null,

        customer_phone:
          customer?.phone || null,

        shipping_address:
          shippingAddress,

        shipping_method:
          shippingRate,

        currency:
          fullSession.currency || "usd",

        subtotal:
          fullSession.amount_subtotal || 0,

        shipping_amount:
          fullSession.total_details
            ?.amount_shipping || 0,

        tax_amount:
          fullSession.total_details
            ?.amount_tax || 0,

        total_amount:
          fullSession.amount_total || 0,

        payment_status:
          fullSession.payment_status ||
          "paid",

        fulfillment_status:
          "new",

        updated_at:
          new Date().toISOString()
      },
      {
        onConflict: "stripe_session_id"
      }
    )
    .select()
    .single();

  if (orderError) {
    throw orderError;
  }

  const lineItems =
    fullSession.line_items?.data || [];

  const orderItems = lineItems.map((item) => {
    const stripeProduct =
      item.price?.product;

    const internalProductId =
      typeof stripeProduct === "object"
        ? stripeProduct.metadata
            ?.product_id
        : null;

    const quantity =
      item.quantity || 1;

    const unitPrice =
      item.price?.unit_amount ||
      Math.round(
        (item.amount_total || 0) /
          Math.max(quantity, 1)
      );

    return {
      order_id: order.id,

      product_id:
        internalProductId ||
        item.description ||
        "unknown-product",

      product_name:
        item.description || "Product",

      quantity,

      unit_price:
        unitPrice,

      line_total:
        item.amount_total ||
        unitPrice * quantity
    };
  });

  const {
    error: deleteError
  } = await supabase
    .from("order_items")
    .delete()
    .eq("order_id", order.id);

  if (deleteError) {
    throw deleteError;
  }

  if (orderItems.length > 0) {
    const {
      error: itemError
    } = await supabase
      .from("order_items")
      .insert(orderItems);

    if (itemError) {
      throw itemError;
    }
  }

  const reservationId =
    fullSession.metadata?.reservation_id;

  if (!reservationId) {
    throw new Error(
      `Missing reservation_id for Stripe session ${fullSession.id}.`
    );
  }


  const {
    error: completionError
  } = await supabase.rpc(
    "complete_inventory_reservation",
    {
      p_reservation_id:
        reservationId,

      p_order_id:
        order.id,

      p_stripe_session_id:
        fullSession.id
    }
  );

  if (completionError) {
    throw completionError;
  }
}

async function releaseExpiredReservation(
  session
) {
  const reservationId =
    session.metadata?.reservation_id;

  if (!reservationId) {
    console.error(
      "Expired Stripe session has no reservation_id:",
      session.id
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
    throw releaseError;
  }
}