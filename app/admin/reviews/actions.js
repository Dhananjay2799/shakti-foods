"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createSupabaseAdmin } from "@/lib/supabase-admin";

const VALID_STATUSES = new Set([
  "pending",
  "approved",
  "rejected"
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

export async function updateProductReview(
  formData
) {
  await requireAdmin();

  const reviewId = cleanText(
    formData.get("reviewId"),
    100
  );

  const status = cleanText(
    formData.get("status"),
    50
  ).toLowerCase();

  const verifiedPurchase =
    formData.get("verifiedPurchase") === "on";

  const adminNotes = cleanText(
    formData.get("adminNotes"),
    5000
  );

  if (!reviewId) {
    throw new Error(
      "Review ID is required."
    );
  }

  if (!VALID_STATUSES.has(status)) {
    throw new Error(
      "Invalid review status."
    );
  }

  const supabase =
    createSupabaseAdmin();

  const {
    data: currentReview,
    error: currentReviewError
  } = await supabase
    .from("product_reviews")
    .select(`
      id,
      product_id,
      status,
      approved_at,
      rejected_at
    `)
    .eq("id", reviewId)
    .maybeSingle();

  if (currentReviewError) {
    throw new Error(
      currentReviewError.message ||
        "Unable to load review."
    );
  }

  if (!currentReview) {
    throw new Error(
      "Review does not exist."
    );
  }

  const now =
    new Date().toISOString();

  const timestampUpdates = {};

  if (status === "approved") {
    if (!currentReview.approved_at) {
      timestampUpdates.approved_at =
        now;
    }

    timestampUpdates.rejected_at =
      null;
  }

  if (status === "rejected") {
    if (!currentReview.rejected_at) {
      timestampUpdates.rejected_at =
        now;
    }

    timestampUpdates.approved_at =
      null;
  }

  if (status === "pending") {
    timestampUpdates.approved_at =
      null;

    timestampUpdates.rejected_at =
      null;
  }

  const {
    error: updateError
  } = await supabase
    .from("product_reviews")
    .update({
      status,
      verified_purchase:
        verifiedPurchase,
      admin_notes:
        adminNotes || null,
      ...timestampUpdates
    })
    .eq("id", reviewId);

  if (updateError) {
    throw new Error(
      updateError.message ||
        "Unable to update review."
    );
  }

  revalidatePath(
    "/admin/reviews"
  );

  revalidatePath(
    `/admin/reviews/${reviewId}`
  );

  /*
   * Your product pages are force-dynamic,
   * so the newly approved review will be
   * read from Supabase on the next request.
   */
  redirect(
    `/admin/reviews/${reviewId}`
  );
}