import Stripe from "stripe";
import { createSupabaseAdmin } from "@/lib/supabase-admin";

export async function fulfillCheckoutSession(sessionId) {
  if (!process.env.STRIPE_SECRET_KEY) {
    throw new Error("Missing STRIPE_SECRET_KEY.");
  }

  if (!sessionId) {
    throw new Error("Missing Stripe Checkout Session ID.");
  }

  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
  const supabase = createSupabaseAdmin();

  const fullSession = await stripe.checkout.sessions.retrieve(sessionId, {
    expand: ["line_items.data.price.product"]
  });

  if (
    fullSession.payment_status !== "paid" &&
    fullSession.status !== "complete"
  ) {
    return {
      fulfilled: false,
      reason: "Checkout payment is not complete."
    };
  }

  const reservationId = fullSession.metadata?.reservation_id;

  if (!reservationId) {
    throw new Error(
      `Missing reservation_id for Stripe session ${fullSession.id}.`
    );
  }

  const customer = fullSession.customer_details;

  const shippingDetails =
    fullSession.collected_information?.shipping_details ||
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
    typeof fullSession.shipping_cost?.shipping_rate === "string"
      ? fullSession.shipping_cost.shipping_rate
      : fullSession.shipping_cost?.shipping_rate?.id || null;

  const { data: order, error: orderError } = await supabase
    .from("orders")
    .upsert(
      {
        stripe_session_id: fullSession.id,
        stripe_payment_intent_id: paymentIntentId,
        customer_name:
          shippingDetails?.name ||
          customer?.name ||
          null,
        customer_email: customer?.email || null,
        customer_phone: customer?.phone || null,
        shipping_address: shippingAddress,
        shipping_method: shippingRate,
        currency: fullSession.currency || "usd",
        subtotal: fullSession.amount_subtotal || 0,
        shipping_amount:
          fullSession.total_details?.amount_shipping || 0,
        tax_amount:
          fullSession.total_details?.amount_tax || 0,
        total_amount: fullSession.amount_total || 0,
        payment_status: fullSession.payment_status || "paid",
        fulfillment_status: "new",
        updated_at: new Date().toISOString()
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

  const lineItems = fullSession.line_items?.data || [];

  const orderItems = lineItems.map((item) => {
    const stripeProduct = item.price?.product;

    const productId =
      typeof stripeProduct === "object"
        ? stripeProduct.metadata?.product_id
        : null;

    const quantity = item.quantity || 1;

    const unitPrice =
      item.price?.unit_amount ||
      Math.round(
        (item.amount_total || 0) /
          Math.max(quantity, 1)
      );

    return {
      order_id: order.id,
      product_id:
        productId ||
        item.description ||
        "unknown-product",
      product_name: item.description || "Product",
      quantity,
      unit_price: unitPrice,
      line_total:
        item.amount_total ||
        unitPrice * quantity
    };
  });

  const { error: deleteError } = await supabase
    .from("order_items")
    .delete()
    .eq("order_id", order.id);

  if (deleteError) {
    throw deleteError;
  }

  if (orderItems.length > 0) {
    const { error: itemError } = await supabase
      .from("order_items")
      .insert(orderItems);

    if (itemError) {
      throw itemError;
    }
  }

  const { error: completionError } = await supabase.rpc(
    "complete_inventory_reservation",
    {
      p_reservation_id: reservationId,
      p_order_id: order.id,
      p_stripe_session_id: fullSession.id
    }
  );

  if (completionError) {
    throw completionError;
  }

  return {
    fulfilled: true,
    orderId: order.id,
    sessionId: fullSession.id
  };
}