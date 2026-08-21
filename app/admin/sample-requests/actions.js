"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createSupabaseAdmin } from "@/lib/supabase-admin";
import {
  sendSampleRequestEmailSafely
} from "@/lib/sample-request-email";

const VALID_STATUSES = new Set([
  "new",
  "approved",
  "rejected",
  "shipped",
  "completed"
]);

const VALID_CARRIERS = new Set([
  "",
  "usps",
  "ups",
  "fedex",
  "other"
]);

async function requireAdmin() {
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

function cleanText(value, maxLength = 2000) {
  if (typeof value !== "string") {
    return "";
  }

  return value
    .trim()
    .slice(0, maxLength);
}

function buildTimestampUpdates(
  previousStatus,
  nextStatus,
  request
) {
  const now = new Date().toISOString();

  const updates = {};

  if (
    nextStatus === "approved" &&
    !request.approved_at
  ) {
    updates.approved_at = now;
  }

  if (
    nextStatus === "rejected" &&
    !request.rejected_at
  ) {
    updates.rejected_at = now;
  }

  if (
    nextStatus === "shipped" &&
    !request.shipped_at
  ) {
    updates.shipped_at = now;
  }

  if (
    nextStatus === "completed" &&
    !request.completed_at
  ) {
    updates.completed_at = now;
  }

  /*
   * We preserve historical timestamps even
   * if an admin changes the status later.
   * That gives us an audit-style timeline.
   */
  return updates;
}

export async function updateSampleRequest(
  formData
) {
  await requireAdmin();

  const requestId =
    cleanText(
      formData.get("requestId"),
      100
    );

  const status =
    cleanText(
      formData.get("status"),
      50
    ).toLowerCase();

  const shippingCarrier =
    cleanText(
      formData.get("shippingCarrier"),
      50
    ).toLowerCase();

  const trackingNumber =
    cleanText(
      formData.get("trackingNumber"),
      200
    );

  const trackingUrl =
    cleanText(
      formData.get("trackingUrl"),
      1000
    );

  const internalNotes =
    cleanText(
      formData.get("internalNotes"),
      5000
    );

  if (!requestId) {
    throw new Error(
      "Sample request ID is required."
    );
  }

  if (!VALID_STATUSES.has(status)) {
    throw new Error(
      "Invalid sample request status."
    );
  }

  if (
    !VALID_CARRIERS.has(
      shippingCarrier
    )
  ) {
    throw new Error(
      "Invalid shipping carrier."
    );
  }

  if (
    trackingUrl &&
    !/^https?:\/\//i.test(
      trackingUrl
    )
  ) {
    throw new Error(
      "Tracking URL must start with http:// or https://."
    );
  }

  if (
  status === "shipped" &&
  (!shippingCarrier || !trackingNumber)
) {
  redirect(
    `/admin/sample-requests/${requestId}` +
      "?error=shipping-required"
  );
}

  const supabase =
    createSupabaseAdmin();

  const {
    data: currentRequest,
    error: currentRequestError
  } = await supabase
    .from("sample_requests")
    .select(`
        id,
        status,
        customer_name,
        business_name,
        email,
        product_name,
        shipping_carrier,
        tracking_number,
        tracking_url,
        approved_at,
        rejected_at,
        shipped_at,
        completed_at
    `)
    .eq("id", requestId)
    .maybeSingle();

  if (currentRequestError) {
    console.error(
      "Unable to load sample request before update:",
      currentRequestError
    );

    throw new Error(
      currentRequestError.message ||
        "Unable to load sample request."
    );
  }

  if (!currentRequest) {
    throw new Error(
      "Sample request does not exist."
    );
  }

  const timestampUpdates =
    buildTimestampUpdates(
      currentRequest.status,
      status,
      currentRequest
    );

  const {
    error: updateError
  } = await supabase
    .from("sample_requests")
    .update({
      status,

      shipping_carrier:
        shippingCarrier || null,

      tracking_number:
        trackingNumber || null,

      tracking_url:
        trackingUrl || null,

      internal_notes:
        internalNotes || null,

      ...timestampUpdates
    })
    .eq("id", requestId);

  if (updateError) {
    console.error(
      "Unable to update sample request:",
      updateError
    );

    throw new Error(
      updateError.message ||
        "Unable to update sample request."
    );
  }

  const statusChanged =
    currentRequest.status !== status;

    if (statusChanged) {
    const emailEligibleStatuses =
        new Set([
        "approved",
        "rejected",
        "shipped",
        "completed"
        ]);

    if (emailEligibleStatuses.has(status)) {
        await sendSampleRequestEmailSafely({
        customerEmail:
            currentRequest.email,

        request: {
            id:
            currentRequest.id,

            status,

            customer_name:
            currentRequest.customer_name,

            business_name:
            currentRequest.business_name,

            product_name:
            currentRequest.product_name,

            shipping_carrier:
            shippingCarrier ||
            currentRequest.shipping_carrier ||
            null,

            tracking_number:
            trackingNumber ||
            currentRequest.tracking_number ||
            null,

            tracking_url:
            trackingUrl ||
            currentRequest.tracking_url ||
            null
        }
      });
    }
  }

  revalidatePath(
    "/admin/sample-requests"
  );

  revalidatePath(
    `/admin/sample-requests/${requestId}`
  );

  redirect(
    `/admin/sample-requests/${requestId}`
  );
}