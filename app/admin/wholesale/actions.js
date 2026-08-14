"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createSupabaseAdmin } from "@/lib/supabase-admin";
import {
  sendWholesaleInquiryEmailSafely
} from "@/lib/wholesale-inquiry-email";

const VALID_STATUSES = new Set([
  "new",
  "contacted",
  "quoted",
  "won",
  "lost"
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

function cleanText(value, maxLength = 5000) {
  if (typeof value !== "string") {
    return "";
  }

  return value
    .trim()
    .slice(0, maxLength);
}

function buildTimestampUpdates(
  nextStatus,
  inquiry
) {
  const now = new Date().toISOString();

  const updates = {};

  if (
    nextStatus === "contacted" &&
    !inquiry.contacted_at
  ) {
    updates.contacted_at = now;
  }

  if (
    nextStatus === "quoted" &&
    !inquiry.quoted_at
  ) {
    updates.quoted_at = now;
  }

  if (nextStatus === "won") {
    if (!inquiry.won_at) {
      updates.won_at = now;
    }

    updates.lost_at = null;
  }

  if (nextStatus === "lost") {
    if (!inquiry.lost_at) {
      updates.lost_at = now;
    }

    updates.won_at = null;
  }

  return updates;
}

export async function updateWholesaleInquiry(
  formData
) {
  await requireAdmin();

  const inquiryId =
    cleanText(
      formData.get("inquiryId"),
      100
    );

  const status =
    cleanText(
      formData.get("status"),
      50
    ).toLowerCase();

  const internalNotes =
    cleanText(
      formData.get("internalNotes"),
      5000
    );

  if (!inquiryId) {
    throw new Error(
      "Wholesale inquiry ID is required."
    );
  }

  if (!VALID_STATUSES.has(status)) {
    throw new Error(
      "Invalid wholesale inquiry status."
    );
  }

  const supabase =
    createSupabaseAdmin();

  const {
    data: currentInquiry,
    error: currentInquiryError
  } = await supabase
    .from("wholesale_inquiries")
    .select(`
        id,
        status,
        customer_name,
        business_name,
        email,
        product_name,
        estimated_quantity,
        quantity_unit,
        contacted_at,
        quoted_at,
        won_at,
        lost_at
        `)
    .eq("id", inquiryId)
    .maybeSingle();

  if (currentInquiryError) {
    console.error(
      "Unable to load wholesale inquiry before update:",
      currentInquiryError
    );

    throw new Error(
      currentInquiryError.message ||
        "Unable to load wholesale inquiry."
    );
  }

  if (!currentInquiry) {
    throw new Error(
      "Wholesale inquiry does not exist."
    );
  }

  const timestampUpdates =
    buildTimestampUpdates(
      status,
      currentInquiry
    );

  const {
    error: updateError
  } = await supabase
    .from("wholesale_inquiries")
    .update({
      status,

      internal_notes:
        internalNotes || null,

      ...timestampUpdates
    })
    .eq("id", inquiryId);

  if (updateError) {
    console.error(
      "Unable to update wholesale inquiry:",
      updateError
    );

    throw new Error(
      updateError.message ||
        "Unable to update wholesale inquiry."
    );
  }

  const statusChanged =
    currentInquiry.status !== status;

    if (statusChanged) {
    const emailStatuses =
        new Set([
        "contacted",
        "quoted",
        "won",
        "lost"
        ]);

    if (emailStatuses.has(status)) {
        await sendWholesaleInquiryEmailSafely({
        customerEmail:
            currentInquiry.email,

        inquiry: {
            id:
            currentInquiry.id,

            status,

            customer_name:
            currentInquiry.customer_name,

            business_name:
            currentInquiry.business_name,

            product_name:
            currentInquiry.product_name,

            estimated_quantity:
            currentInquiry.estimated_quantity,

            quantity_unit:
            currentInquiry.quantity_unit
        }
        });
    }
    }
  
  revalidatePath(
    "/admin/wholesale"
  );

  revalidatePath(
    `/admin/wholesale/${inquiryId}`
  );

  redirect(
    `/admin/wholesale/${inquiryId}`
  );
}