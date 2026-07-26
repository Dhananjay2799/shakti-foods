import Stripe from "stripe";
import { createSupabaseAdmin } from "@/lib/supabase-admin";

function normalizeStripeOrderItems({
  lineItems,
  orderId
}) {
  if (!Array.isArray(lineItems) || lineItems.length === 0) {
    throw new Error(
      "The Stripe Checkout Session contains no order items."
    );
  }

  return lineItems.map((item) => {
    const stripeProduct = item.price?.product;

    const productId =
      stripeProduct &&
      typeof stripeProduct === "object"
        ? String(
            stripeProduct.metadata?.product_id || ""
          ).trim()
        : "";

    if (!productId) {
      throw new Error(
        `Stripe line item "${item.description || "Product"}" is missing product_id metadata.`
      );
    }

    const quantity = Number(item.quantity || 0);

    if (
      !Number.isSafeInteger(quantity) ||
      quantity <= 0
    ) {
      throw new Error(
        `Invalid Stripe quantity for product ${productId}.`
      );
    }

    const lineTotal = Number(
      item.amount_total || 0
    );

    const stripeUnitAmount = Number(
      item.price?.unit_amount || 0
    );

    const unitPrice =
      Number.isSafeInteger(stripeUnitAmount) &&
      stripeUnitAmount > 0
        ? stripeUnitAmount
        : Math.round(
            lineTotal / Math.max(quantity, 1)
          );

    if (
      !Number.isSafeInteger(unitPrice) ||
      unitPrice <= 0
    ) {
      throw new Error(
        `Invalid Stripe unit price for product ${productId}.`
      );
    }

    const calculatedLineTotal =
      Number.isSafeInteger(lineTotal) &&
      lineTotal > 0
        ? lineTotal
        : unitPrice * quantity;

    return {
      order_id: orderId,
      product_id: productId,
      product_name:
        item.description || "Product",
      quantity,
      unit_price: unitPrice,
      line_total: calculatedLineTotal
    };
  });
}

function orderItemsMatch(
  existingItems,
  expectedItems
) {
  if (
    !Array.isArray(existingItems) ||
    existingItems.length !==
      expectedItems.length
  ) {
    return false;
  }

  const existingByProductId = new Map(
    existingItems.map((item) => [
      String(item.product_id),
      item
    ])
  );

  return expectedItems.every((expected) => {
    const existing = existingByProductId.get(
      String(expected.product_id)
    );

    if (!existing) {
      return false;
    }

    return (
      Number(existing.quantity) ===
        Number(expected.quantity) &&
      Number(existing.unit_price) ===
        Number(expected.unit_price) &&
      Number(existing.line_total) ===
        Number(expected.line_total)
    );
  });
}

async function inventoryAlreadyCompleted({
  supabase,
  orderId,
  orderItems
}) {
  const productIds = [
    ...new Set(
      orderItems.map((item) =>
        String(item.product_id)
      )
    )
  ];

  const { data, error } = await supabase
    .from("inventory_transactions")
    .select("product_id")
    .eq("order_id", orderId)
    .eq("transaction_type", "sale")
    .in("product_id", productIds);

  if (error) {
    console.error(
      "Unable to verify inventory fulfillment:",
      error
    );

    throw new Error(
      error.message ||
        "Unable to verify inventory fulfillment."
    );
  }

  const completedProductIds = new Set(
    (data || []).map((transaction) =>
      String(transaction.product_id)
    )
  );

  return productIds.every((productId) =>
    completedProductIds.has(productId)
  );
}

export async function fulfillCheckoutSession(
  sessionId
) {
  const stripeSecretKey =
    process.env.STRIPE_SECRET_KEY;

  if (!stripeSecretKey) {
    throw new Error(
      "Missing STRIPE_SECRET_KEY."
    );
  }

  const normalizedSessionId = String(
    sessionId || ""
  ).trim();

  if (!normalizedSessionId) {
    throw new Error(
      "Missing Stripe Checkout Session ID."
    );
  }

  const stripe = new Stripe(
    stripeSecretKey
  );

  const supabase =
    createSupabaseAdmin();

  const fullSession =
    await stripe.checkout.sessions.retrieve(
      normalizedSessionId,
      {
        expand: [
          "line_items.data.price.product"
        ]
      }
    );

  /*
   * Do not fulfill merely because the Checkout
   * Session status is "complete". Delayed payment
   * methods may complete checkout before payment
   * actually succeeds.
   */
  if (fullSession.payment_status !== "paid") {
    return {
      fulfilled: false,
      reason:
        "Checkout payment is not complete.",
      sessionId: fullSession.id
    };
  }

  const reservationId = String(
    fullSession.metadata?.reservation_id || ""
  ).trim();

  if (!reservationId) {
    throw new Error(
      `Missing reservation_id for Stripe session ${fullSession.id}.`
    );
  }

  const customer =
    fullSession.customer_details;

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
    typeof fullSession.payment_intent ===
    "string"
      ? fullSession.payment_intent
      : fullSession.payment_intent?.id ||
        null;

  const shippingRate =
    typeof fullSession.shipping_cost
      ?.shipping_rate === "string"
      ? fullSession.shipping_cost
          .shipping_rate
      : fullSession.shipping_cost
          ?.shipping_rate?.id || null;

  /*
   * Load the order created by the checkout route.
   */
  const {
    data: existingOrder,
    error: existingOrderError
  } = await supabase
    .from("orders")
    .select(`
      id,
      reservation_id,
      payment_status,
      fulfillment_status
    `)
    .eq(
      "stripe_session_id",
      fullSession.id
    )
    .maybeSingle();

  if (existingOrderError) {
    console.error(
      "Unable to load checkout order:",
      existingOrderError
    );

    throw new Error(
      existingOrderError.message ||
        "Unable to load checkout order."
    );
  }

  if (
    existingOrder?.reservation_id &&
    String(existingOrder.reservation_id) !==
      reservationId
  ) {
    throw new Error(
      `Reservation mismatch for Stripe session ${fullSession.id}.`
    );
  }

  /*
   * Preserve an existing order when possible.
   * The fallback upsert also lets the webhook
   * recover if the original checkout request
   * created Stripe successfully but the order
   * record was temporarily unavailable.
   *
   * Payment remains pending until inventory
   * completion succeeds.
   */
  const {
    data: order,
    error: orderError
  } = await supabase
    .from("orders")
    .upsert(
      {
        stripe_session_id:
          fullSession.id,
        reservation_id:
          reservationId,
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
        currency: String(
          fullSession.currency || "usd"
        ).toUpperCase(),
        subtotal:
          fullSession.amount_subtotal ||
          0,
        shipping_amount:
          fullSession.total_details
            ?.amount_shipping || 0,
        tax_amount:
          fullSession.total_details
            ?.amount_tax || 0,
        total_amount:
          fullSession.amount_total || 0,
        payment_status:
          existingOrder?.payment_status ||
          "pending",
        fulfillment_status:
          existingOrder
            ?.fulfillment_status ||
          "new",
        updated_at:
          new Date().toISOString()
      },
      {
        onConflict:
          "stripe_session_id"
      }
    )
    .select(`
      id,
      reservation_id,
      payment_status,
      fulfillment_status
    `)
    .single();

  if (orderError || !order) {
    console.error(
      "Unable to save checkout order:",
      orderError
    );

    throw new Error(
      orderError?.message ||
        "Unable to save checkout order."
    );
  }

  const lineItems =
    fullSession.line_items?.data || [];

  const expectedOrderItems =
    normalizeStripeOrderItems({
      lineItems,
      orderId: order.id
    });

  /*
   * Do not delete and recreate existing items.
   * The checkout route already inserts them.
   *
   * If no items exist, the webhook safely
   * creates them. If items exist but do not
   * match Stripe, fulfillment stops instead
   * of destroying potentially valid data.
   */
  const {
    data: existingOrderItems,
    error: existingItemsError
  } = await supabase
    .from("order_items")
    .select(`
      product_id,
      quantity,
      unit_price,
      line_total
    `)
    .eq("order_id", order.id);

  if (existingItemsError) {
    console.error(
      "Unable to load order items:",
      existingItemsError
    );

    throw new Error(
      existingItemsError.message ||
        "Unable to load order items."
    );
  }

  if (
    !existingOrderItems ||
    existingOrderItems.length === 0
  ) {
    const { error: itemInsertError } =
      await supabase
        .from("order_items")
        .insert(expectedOrderItems);

    if (itemInsertError) {
      console.error(
        "Unable to create order items:",
        itemInsertError
      );

      throw new Error(
        itemInsertError.message ||
          "Unable to create order items."
      );
    }
  } else if (
    !orderItemsMatch(
      existingOrderItems,
      expectedOrderItems
    )
  ) {
    throw new Error(
      `Stored order items do not match Stripe session ${fullSession.id}.`
    );
  }

  /*
   * Check inventory transaction history before
   * calling the completion RPC. This protects
   * against duplicate Stripe webhook delivery
   * and also recovers when inventory completion
   * succeeded but the final order update failed.
   */
  const wasInventoryCompleted =
    await inventoryAlreadyCompleted({
      supabase,
      orderId: order.id,
      orderItems: expectedOrderItems
    });

  if (!wasInventoryCompleted) {
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
      console.error(
        "Unable to complete inventory reservation:",
        completionError
      );

      throw new Error(
        completionError.message ||
          "Unable to complete inventory reservation."
      );
    }
  }

  /*
   * Mark the order paid only after inventory
   * completion succeeds or is confirmed to have
   * already succeeded.
   */
  const {
    data: completedOrder,
    error: completedOrderError
  } = await supabase
    .from("orders")
    .update({
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
      currency: String(
        fullSession.currency || "usd"
      ).toUpperCase(),
      subtotal:
        fullSession.amount_subtotal ||
        0,
      shipping_amount:
        fullSession.total_details
          ?.amount_shipping || 0,
      tax_amount:
        fullSession.total_details
          ?.amount_tax || 0,
      total_amount:
        fullSession.amount_total || 0,
      payment_status: "paid",
      fulfillment_status:
        order.fulfillment_status ||
        "new",
      updated_at:
        new Date().toISOString()
    })
    .eq("id", order.id)
    .eq(
      "stripe_session_id",
      fullSession.id
    )
    .select(`
      id,
      payment_status,
      fulfillment_status
    `)
    .single();

  if (
    completedOrderError ||
    !completedOrder
  ) {
    console.error(
      "Inventory completed, but order status could not be updated:",
      completedOrderError
    );

    throw new Error(
      completedOrderError?.message ||
        "Unable to finalize the paid order."
    );
  }

  return {
    fulfilled: true,
    alreadyProcessed:
      wasInventoryCompleted,
    orderId: completedOrder.id,
    sessionId: fullSession.id,
    paymentStatus:
      completedOrder.payment_status,
    fulfillmentStatus:
      completedOrder.fulfillment_status
  };
}