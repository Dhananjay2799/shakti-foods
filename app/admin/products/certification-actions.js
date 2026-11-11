"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createSupabaseAdmin } from "@/lib/supabase-admin";
import { products as catalogProducts } from "@/lib/data";
import { getAdminStorefrontById } from "@/lib/admin-storefronts";

const allowedStatuses = [
  "unverified",
  "pending",
  "verified",
  "expired",
  "rejected"
];

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

function optionalText(formData, field) {
  const value = String(
    formData.get(field) || ""
  ).trim();

  return value || null;
}

// Certifications page inside the product's own store admin.
async function productCertificationsPath(productId, query = "") {
  const id = encodeURIComponent(productId);

  try {
    const { data } = await createSupabaseAdmin()
      .from("products")
      .select("storefront")
      .eq("product_id", productId)
      .maybeSingle();

    const store = getAdminStorefrontById(data?.storefront);

    if (store) {
      return `/admin/${store.slug}/products/${id}/certifications${query}`;
    }
  } catch (error) {
    console.error("Unable to find the product's store:", error);
  }

  // Old shared URL; it redirects to the right store.
  return `/admin/products/${id}/certifications${query}`;
}

function refreshCertificationPages(productId) {
  revalidatePath("/admin", "layout");
  revalidatePath("/admin/products");
  revalidatePath(`/admin/products/${productId}`);
  revalidatePath(
    `/admin/products/${productId}/certifications`
  );

  const catalogProduct = catalogProducts.find(
    (product) => product.id === productId
  );

  if (catalogProduct?.slug) {
    revalidatePath(
      `/products/${catalogProduct.slug}`
    );
  }
}

export async function saveProductCertification(
  formData
) {
  await requireAdmin();

  const productId = String(
    formData.get("productId") || ""
  ).trim();

  const certificationId = String(
    formData.get("certificationId") || ""
  ).trim();

  const verificationStatus = String(
    formData.get("verificationStatus") ||
      "unverified"
  ).trim();

  if (!productId) {
    throw new Error("Missing product ID.");
  }

  if (!certificationId) {
    throw new Error(
      "Select a certification."
    );
  }

  if (
    !allowedStatuses.includes(
      verificationStatus
    )
  ) {
    throw new Error(
      "Invalid verification status."
    );
  }

  const supabase = createSupabaseAdmin();

  const { error } = await supabase
    .from("product_certifications")
    .upsert(
      {
        product_id: productId,
        certification_id:
          certificationId,

        certificate_number:
          optionalText(
            formData,
            "certificateNumber"
          ),

        issued_at:
          optionalText(
            formData,
            "issuedAt"
          ),

        expires_at:
          optionalText(
            formData,
            "expiresAt"
          ),

        document_url:
          optionalText(
            formData,
            "documentUrl"
          ),

        verification_status:
          verificationStatus
      },
      {
        onConflict:
          "product_id,certification_id"
      }
    );

  if (error) {
    console.error(
      "Unable to save certification:",
      error
    );

    throw new Error(
      error.message ||
        "Unable to save certification."
    );
  }

  refreshCertificationPages(productId);

  // Back to the list (this also clears the form) with a confirmation.
  redirect(await productCertificationsPath(productId, "?saved=1"));
}

export async function removeProductCertification(
  formData
) {
  await requireAdmin();

  const productId = String(
    formData.get("productId") || ""
  ).trim();

  const assignmentId = String(
    formData.get("assignmentId") || ""
  ).trim();

  if (!productId || !assignmentId) {
    throw new Error(
      "Missing certification information."
    );
  }

  const supabase = createSupabaseAdmin();

  const { error } = await supabase
    .from("product_certifications")
    .delete()
    .eq("id", assignmentId)
    .eq("product_id", productId);

  if (error) {
    console.error(
      "Unable to remove certification:",
      error
    );

    throw new Error(
      error.message ||
        "Unable to remove certification."
    );
  }

  refreshCertificationPages(productId);

  redirect(await productCertificationsPath(productId, "?removed=1"));
}
