"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createSupabaseAdmin } from "@/lib/supabase-admin";
import { sendTransactionalEmail } from "@/lib/email";
import { buildOrderStatusEmail } from "@/lib/order-email-template";

const allowedStatuses = Object.freeze([
  "new",
  "processing",
  "packed",
  "shipped",
  "delivered",
  "canceled"
]);

const allowedCarriers = Object.freeze([
  "",
  "ups",
  "fedex",
  "usps",
  "dhl",
  "local_pickup",
  "other"
]);

function normalizeText(value, maxLength = 500) {
  return String(value || "")
    .trim()
    .slice(0, maxLength);
}

function generateTrackingUrl(
  carrier,
  trackingNumber
) {
  if (!trackingNumber) {
    return null;
  }

  const encodedTrackingNumber =
    encodeURIComponent(trackingNumber);

  switch (carrier) {
    case "ups":
      return (
        "https://www.ups.com/track" +
        `?tracknum=${encodedTrackingNumber}`
      );

    case "fedex":
      return (
        "https://www.fedex.com/fedextrack/" +
        `?tracknumbers=${encodedTrackingNumber}`
      );

    case "usps":
      return (
        "https://tools.usps.com/go/" +
        "TrackConfirmAction" +
        `?qtc_tLabels1=${encodedTrackingNumber}`
      );

    case "dhl":
      return (
        "https://www.dhl.com/us-en/home/" +
        "tracking.html" +
        `?tracking-id=${encodedTrackingNumber}`
      );

    default:
      return null;
  }
}

async function requireAuthenticatedAdmin() {
  const authClient = await createClient();

  const {
    data: { user },
    error
  } = await authClient.auth.getUser();

  if (error || !user) {
    redirect("/admin/login");
  }

  return user;
}

function getStatusTimestampUpdates(
  previousStatus,
  nextStatus
) {
  const now = new Date().toISOString();
  const updates = {};

  if (
    nextStatus === "packed" &&
    previousStatus !== "packed"
  ) {
    updates.packed_at = now;
  }

  if (
    nextStatus === "shipped" &&
    previousStatus !== "shipped"
  ) {
    updates.shipped_at = now;
  }

  if (
    nextStatus === "delivered" &&
    previousStatus !== "delivered"
  ) {
    updates.delivered_at = now;
  }

  if (
    nextStatus === "canceled" &&
    previousStatus !== "canceled"
  ) {
    updates.canceled_at = now;
  }

  return updates;
}

export async function updateOrderDetails(
  formData
) {
  const orderId = normalizeText(
    formData.get("orderId"),
    100
  );

  const fulfillmentStatus = normalizeText(
    formData.get("fulfillmentStatus"),
    30
  ).toLowerCase();

  const shippingCarrier = normalizeText(
    formData.get("shippingCarrier"),
    50
  ).toLowerCase();

  const trackingNumber = normalizeText(
    formData.get("trackingNumber"),
    150
  );

  const internalNotes = normalizeText(
    formData.get("internalNotes"),
    5000
  );

  console.log("Status:", fulfillmentStatus);
  console.log("Carrier:", shippingCarrier);
  console.log("Tracking:", trackingNumber);
  console.log("Notes:", internalNotes);

  if (!orderId) {
    throw new Error("Missing order ID.");
  }

  if (
    !allowedStatuses.includes(
      fulfillmentStatus
    )
  ) {
    throw new Error(
      "Invalid fulfillment status."
    );
  }

  if (
    !allowedCarriers.includes(
      shippingCarrier
    )
  ) {
    throw new Error(
      "Invalid shipping carrier."
    );
  }

  if (
    fulfillmentStatus === "shipped" &&
    shippingCarrier !== "local_pickup" &&
    !trackingNumber
  ) {
    throw new Error(
      "A tracking number is required before marking a shipped order."
    );
  }

  await requireAuthenticatedAdmin();

  const supabase = createSupabaseAdmin();

  const {
    data: existingOrder,
    error: readError
  } = await supabase
    .from("orders")
    .select(`
      id,
      fulfillment_status,
      packed_at,
      shipped_at,
      delivered_at,
      canceled_at
    `)
    .eq("id", orderId)
    .single();

  if (readError || !existingOrder) {
    console.error(
      "Unable to load order before update:",
      readError
    );

    throw new Error(
      readError?.message ||
        "The requested order could not be found."
    );
  }

  const trackingUrl = generateTrackingUrl(
    shippingCarrier,
    trackingNumber
  );

  const timestampUpdates =
    getStatusTimestampUpdates(
      existingOrder.fulfillment_status,
      fulfillmentStatus
    );

  const updatePayload = {
    fulfillment_status:
      fulfillmentStatus,

    shipping_carrier:
      shippingCarrier || null,

    tracking_number:
      trackingNumber || null,

    tracking_url:
      trackingUrl,

    internal_notes:
      internalNotes || null,

    updated_at:
      new Date().toISOString(),

    ...timestampUpdates
  };

  const {
    data: updatedOrder,
    error: updateError
  } = await supabase
    .from("orders")
    .update(updatePayload)
    .eq("id", orderId)
    .select(`
      id,
      fulfillment_status,
      shipping_carrier,
      tracking_number,
      tracking_url,
      packed_at,
      shipped_at,
      delivered_at,
      canceled_at,
      updated_at
    `)
    .single();

  if (updateError) {
    console.error(
      "Unable to update order details:",
      updateError
    );

    throw new Error(
      updateError.message ||
        "Unable to update order details."
    );
  }

  /*
 * Send customer email after
 * the database update succeeds.
 */
if (
  existingOrder.fulfillment_status !==
  fulfillmentStatus
) {
  try {
    const [
      emailOrderResult,
      orderItemsResult
    ] = await Promise.all([
      supabase
        .from("orders")
        .select(`
          id,
          customer_name,
          customer_email,
          fulfillment_status,
          total_amount,
          shipping_carrier,
          tracking_number,
          tracking_url
        `)
        .eq("id", orderId)
        .single(),

      supabase
        .from("order_items")
        .select(`
          product_name,
          quantity,
          line_total
        `)
        .eq("order_id", orderId)
    ]);

    if (emailOrderResult.error) {
      throw new Error(
        emailOrderResult.error.message ||
          "Unable to load order email details."
      );
    }

    if (orderItemsResult.error) {
      throw new Error(
        orderItemsResult.error.message ||
          "Unable to load order items for email."
      );
    }

    const emailOrder =
      emailOrderResult.data;

    const orderItems =
      orderItemsResult.data || [];

    if (emailOrder?.customer_email) {
      const email =
        buildOrderStatusEmail({
          order: emailOrder,
          items: orderItems
        });

      await sendTransactionalEmail({
        to: emailOrder.customer_email,
        subject: email.subject,
        html: email.html,
        text: email.text,
        idempotencyKey:
          `order-status/${orderId}/${fulfillmentStatus}/${updatedOrder.updated_at}`
      });
    }
  } catch (emailError) {
    console.error(
      "Unable to send customer email:",
      emailError
    );
  }
}

  /*
   * Future Kafka integration point:
   *
   * Publish an event only after the database update succeeds.
   *
   * Example:
   * await publishOrderEvent({
   *   eventType:
   *     `order.${fulfillmentStatus}`,
   *   orderId,
   *   previousStatus:
   *     existingOrder.fulfillment_status,
   *   newStatus:
   *     fulfillmentStatus,
   *   occurredAt:
   *     updatedOrder.updated_at
   * });
   */

  revalidatePath("/admin");
  revalidatePath("/admin/orders");
  revalidatePath(
    `/admin/orders/${orderId}`
  );

  return {
    success: true,
    order: updatedOrder
  };
}

/*
 * Keep this action temporarily so existing forms continue
 * working until the order-details page is updated.
 */
export async function updateFulfillmentStatus(
  formData
) {
  await requireAuthenticatedAdmin();
  
  const orderId = normalizeText(
    formData.get("orderId"),
    100
  );

  const fulfillmentStatus =
    normalizeText(
      formData.get("fulfillmentStatus"),
      30
    );

  const supabase = createSupabaseAdmin();

  const {
    data: existingOrder,
    error
  } = await supabase
    .from("orders")
    .select(`
      shipping_carrier,
      tracking_number,
      internal_notes
    `)
    .eq("id", orderId)
    .single();

  if (error || !existingOrder) {
    throw new Error(
      error?.message ||
        "Unable to load order."
    );
  }

  const combinedFormData =
    new FormData();

  combinedFormData.set(
    "orderId",
    orderId
  );

  combinedFormData.set(
    "fulfillmentStatus",
    fulfillmentStatus
  );

  combinedFormData.set(
    "shippingCarrier",
    existingOrder.shipping_carrier || ""
  );

  combinedFormData.set(
    "trackingNumber",
    existingOrder.tracking_number || ""
  );

  combinedFormData.set(
    "internalNotes",
    existingOrder.internal_notes || ""
  );

  return updateOrderDetails(
    combinedFormData
  );
}