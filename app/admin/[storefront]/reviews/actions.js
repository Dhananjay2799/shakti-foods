"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createSupabaseAdmin } from "@/lib/supabase-admin";
import { getAdminStorefront } from "@/lib/admin-storefronts";

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

function cleanText(
  value,
  maxLength = 5000
) {
  if (typeof value !== "string") {
    return "";
  }

  return value
    .trim()
    .slice(0, maxLength);
}

function getStorefrontFromForm(
  formData
) {
  const storefrontSlug =
    cleanText(
      formData.get("storefrontSlug"),
      100
    );

  const storefrontId =
    cleanText(
      formData.get("storefrontId"),
      100
    );

  const storefront =
    getAdminStorefront(
      storefrontSlug
    );

  if (
    !storefront ||
    storefront.id !== storefrontId
  ) {
    throw new Error(
      "Invalid storefront."
    );
  }

  return storefront;
}

export async function updateProductReview(
  formData
) {
  await requireAdmin();

  const storefront =
    getStorefrontFromForm(
      formData
    );

  const reviewId =
    cleanText(
      formData.get("reviewId"),
      100
    );

  const status =
    cleanText(
      formData.get("status"),
      50
    ).toLowerCase();

  const verifiedPurchase =
    formData.get(
      "verifiedPurchase"
    ) === "on";

  const adminNotes =
    cleanText(
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
      rejected_at,
      storefront
    `)
    .eq("id", reviewId)
    .eq(
      "storefront",
      storefront.id
    )
    .maybeSingle();

  if (currentReviewError) {
    throw new Error(
      currentReviewError.message ||
        "Unable to load review."
    );
  }

  if (!currentReview) {
    throw new Error(
      "Review does not exist for this storefront."
    );
  }

  const now =
    new Date().toISOString();

  const timestampUpdates = {};

  if (status === "approved") {
    if (
      !currentReview.approved_at
    ) {
      timestampUpdates.approved_at =
        now;
    }

    timestampUpdates.rejected_at =
      null;
  }

  if (status === "rejected") {
    if (
      !currentReview.rejected_at
    ) {
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
    .eq("id", reviewId)
    .eq(
      "storefront",
      storefront.id
    );

  if (updateError) {
    throw new Error(
      updateError.message ||
        "Unable to update review."
    );
  }

  const basePath =
    `/admin/${storefront.slug}`;

  revalidatePath(
    `${basePath}/reviews`
  );

  revalidatePath(
    `${basePath}/reviews/${reviewId}`
  );

  redirect(
    `${basePath}/reviews/${reviewId}?updated=1`
  );
}