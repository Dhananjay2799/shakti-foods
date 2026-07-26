"use server";

import { randomUUID } from "crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createSupabaseAdmin } from "@/lib/supabase-admin";

const STORAGE_BUCKET = "product-images";
const MAX_FILE_SIZE = 8 * 1024 * 1024;

const ALLOWED_IMAGE_TYPES = new Set([
  "primary",
  "gallery",
  "thumbnail",
  "lifestyle",
  "packaging"
]);

const ALLOWED_MIME_TYPES = new Map([
  ["image/jpeg", "jpg"],
  ["image/png", "png"],
  ["image/webp", "webp"]
]);

function getAdminEmailAllowlist() {
  return new Set(
    String(process.env.ADMIN_EMAILS || "")
      .split(",")
      .map((email) => email.trim().toLowerCase())
      .filter(Boolean)
  );
}

async function requireAdmin() {
  const authClient = await createClient();

  const {
    data: { user },
    error
  } = await authClient.auth.getUser();

  if (error || !user) {
    redirect("/admin/login");
  }

  const appRole = String(
    user.app_metadata?.role || ""
  ).toLowerCase();

  const appRoles = Array.isArray(user.app_metadata?.roles)
    ? user.app_metadata.roles.map((role) =>
        String(role).toLowerCase()
      )
    : [];

  const email = String(user.email || "").toLowerCase();

  const isAdmin =
    appRole === "admin" ||
    appRoles.includes("admin") ||
    user.app_metadata?.is_admin === true ||
    getAdminEmailAllowlist().has(email);

  if (!isAdmin) {
    console.warn("Unauthorized admin action attempt", {
      userId: user.id,
      email: user.email || null
    });

    redirect("/admin/login?error=unauthorized");
  }

  return user;
}

function requiredText(formData, fieldName) {
  return String(formData.get(fieldName) || "").trim();
}

function optionalText(formData, fieldName) {
  const value = requiredText(formData, fieldName);
  return value || null;
}

function checkboxValue(formData, fieldName) {
  return formData.get(fieldName) === "on";
}

function normalizeImageType(value) {
  const normalizedValue = String(value || "").trim();

  if (!ALLOWED_IMAGE_TYPES.has(normalizedValue)) {
    throw new Error("Invalid image type.");
  }

  return normalizedValue;
}

function normalizeSortOrder(value, fallback = 0) {
  const rawValue = String(value ?? "").trim();

  if (!/^\d+$/.test(rawValue)) {
    return fallback;
  }

  const parsedValue = Number(rawValue);

  if (!Number.isSafeInteger(parsedValue) || parsedValue < 0) {
    return fallback;
  }

  return parsedValue;
}

function getValidatedImage(formData) {
  const uploadedFile = formData.get("file");

  if (
    !uploadedFile ||
    typeof uploadedFile !== "object" ||
    typeof uploadedFile.arrayBuffer !== "function"
  ) {
    throw new Error("Select an image to upload.");
  }

  if (!uploadedFile.name) {
    throw new Error("The selected image has no filename.");
  }

  if (uploadedFile.size <= 0) {
    throw new Error("The selected image is empty.");
  }

  if (uploadedFile.size > MAX_FILE_SIZE) {
    throw new Error("The image cannot exceed 8 MB.");
  }

  const extension = ALLOWED_MIME_TYPES.get(uploadedFile.type);

  if (!extension) {
    throw new Error(
      "Only JPG, JPEG, PNG, and WebP images are allowed."
    );
  }

  return { file: uploadedFile, extension };
}

function cleanFilename(filename) {
  return String(filename || "product-image")
    .trim()
    .replace(/[^\w.\-() ]+/g, "_")
    .replace(/\s+/g, " ")
    .slice(0, 255);
}

function cleanPathSegment(value) {
  const cleanedValue = String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "");

  return cleanedValue || "product";
}

function getStoragePath({ productId, imageType, extension }) {
  const year = String(new Date().getUTCFullYear());

  return [
    cleanPathSegment(productId),
    year,
    cleanPathSegment(imageType),
    `${randomUUID()}.${extension}`
  ].join("/");
}

function refreshProductImagePages(productId) {
  revalidatePath("/admin");
  revalidatePath("/admin/products");
  revalidatePath(`/admin/products/${productId}`);
  revalidatePath(`/admin/products/${productId}/images`);
  revalidatePath("/products");
  revalidatePath(`/products/${productId}`);
}

async function verifyProduct(supabase, productId) {
  const { data, error } = await supabase
    .from("inventory")
    .select("product_id, product_name, is_active")
    .eq("product_id", productId)
    .maybeSingle();

  if (error) {
    console.error("Unable to verify product:", error);
    throw new Error(error.message || "Unable to verify product.");
  }

  if (!data) {
    throw new Error("Product record was not found.");
  }

  return data;
}

async function getProductImage({ supabase, productId, imageId }) {
  const { data, error } = await supabase
    .from("product_images")
    .select(`
      id,
      product_id,
      image_type,
      title,
      alt_text,
      storage_bucket,
      storage_path,
      original_filename,
      mime_type,
      file_size_bytes,
      width,
      height,
      sort_order,
      is_primary,
      is_active,
      created_at,
      uploaded_by_user_id,
      uploaded_by_email
    `)
    .eq("id", imageId)
    .eq("product_id", productId)
    .maybeSingle();

  if (error) {
    console.error("Unable to load product image:", error);
    throw new Error(
      error.message || "Unable to verify product image."
    );
  }

  if (!data) {
    throw new Error("Product image was not found.");
  }

  return data;
}

async function getNextSortOrder({ supabase, productId }) {
  const { data, error } = await supabase
    .from("product_images")
    .select("sort_order")
    .eq("product_id", productId)
    .order("sort_order", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error("Unable to determine image order:", error);
    throw new Error(
      error.message || "Unable to determine image order."
    );
  }

  return Number(data?.sort_order || 0) + 1;
}

async function productHasPrimaryImage({
  supabase,
  productId,
  excludeImageId = null
}) {
  let query = supabase
    .from("product_images")
    .select("id")
    .eq("product_id", productId)
    .eq("is_primary", true)
    .eq("is_active", true)
    .limit(1);

  if (excludeImageId) {
    query = query.neq("id", excludeImageId);
  }

  const { data, error } = await query.maybeSingle();

  if (error) {
    console.error("Unable to check primary product image:", error);
    throw new Error(
      error.message || "Unable to check the primary product image."
    );
  }

  return Boolean(data);
}

async function getExistingPrimaryImages({
  supabase,
  productId,
  excludeImageId = null
}) {
  let query = supabase
    .from("product_images")
    .select("id, image_type, is_primary, is_active")
    .eq("product_id", productId)
    .eq("is_primary", true);

  if (excludeImageId) {
    query = query.neq("id", excludeImageId);
  }

  const { data, error } = await query;

  if (error) {
    console.error("Unable to load existing primary images:", error);
    throw new Error(
      error.message || "Unable to load existing primary images."
    );
  }

  return data || [];
}

async function restorePrimaryImages({
  supabase,
  productId,
  primaryImages
}) {
  for (const image of primaryImages) {
    const { error } = await supabase
      .from("product_images")
      .update({
        is_primary: true,
        image_type: image.image_type || "primary",
        is_active: image.is_active
      })
      .eq("id", image.id)
      .eq("product_id", productId);

    if (error) {
      console.error("Unable to restore previous primary image:", {
        imageId: image.id,
        error
      });
    }
  }
}

async function promoteImageToPrimary({
  supabase,
  productId,
  imageId
}) {
  const previousPrimaryImages = await getExistingPrimaryImages({
    supabase,
    productId,
    excludeImageId: imageId
  });

  const { error: clearError } = await supabase
    .from("product_images")
    .update({
      is_primary: false,
      image_type: "gallery"
    })
    .eq("product_id", productId)
    .eq("is_primary", true)
    .neq("id", imageId);

  if (clearError) {
    console.error("Unable to clear existing primary image:", clearError);
    throw new Error(
      clearError.message || "Unable to clear the previous primary image."
    );
  }

  const { error: promoteError } = await supabase
    .from("product_images")
    .update({
      image_type: "primary",
      is_primary: true,
      is_active: true
    })
    .eq("id", imageId)
    .eq("product_id", productId);

  if (promoteError) {
    console.error("Unable to promote product image:", promoteError);

    await restorePrimaryImages({
      supabase,
      productId,
      primaryImages: previousPrimaryImages
    });

    throw new Error(
      promoteError.message || "Unable to set the primary product image."
    );
  }
}

async function assignReplacementPrimary({
  supabase,
  productId,
  excludeImageId = null
}) {
  const alreadyHasPrimary = await productHasPrimaryImage({
    supabase,
    productId,
    excludeImageId
  });

  if (alreadyHasPrimary) {
    return false;
  }

  let replacementQuery = supabase
    .from("product_images")
    .select("id")
    .eq("product_id", productId)
    .eq("is_active", true)
    .eq("is_primary", false)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true })
    .limit(1);

  if (excludeImageId) {
    replacementQuery = replacementQuery.neq("id", excludeImageId);
  }

  const { data: replacement, error } =
    await replacementQuery.maybeSingle();

  if (error) {
    console.error("Unable to find replacement primary image:", error);
    throw new Error(
      error.message || "Unable to find a replacement primary image."
    );
  }

  if (!replacement) {
    return false;
  }

  await promoteImageToPrimary({
    supabase,
    productId,
    imageId: replacement.id
  });

  return true;
}

async function removeStoredImage({
  supabase,
  bucket,
  path,
  throwOnError = false
}) {
  try {
    const { error } = await supabase.storage
      .from(bucket)
      .remove([path]);

    if (error) {
      console.error("Unable to remove stored product image:", error);

      if (throwOnError) {
        throw new Error(
          error.message || "Unable to remove the stored product image."
        );
      }

      return false;
    }

    return true;
  } catch (error) {
    console.error("Unexpected storage cleanup error:", error);

    if (throwOnError) {
      throw error;
    }

    return false;
  }
}

export async function uploadProductImage(formData) {
  const user = await requireAdmin();

  const productId = requiredText(formData, "productId");
  const requestedImageType = normalizeImageType(
    requiredText(formData, "imageType") || "gallery"
  );
  const altText = requiredText(formData, "altText");

  if (!productId) {
    throw new Error("Product ID is required.");
  }

  if (!altText) {
    throw new Error("Alternative text is required.");
  }

  const { file, extension } = getValidatedImage(formData);
  const supabase = createSupabaseAdmin();

  await verifyProduct(supabase, productId);

  const existingPrimary = await productHasPrimaryImage({
    supabase,
    productId
  });

  const requestedPrimary =
    requestedImageType === "primary" ||
    checkboxValue(formData, "isPrimary");

  const shouldBePrimary = requestedPrimary || !existingPrimary;

  const finalImageType = shouldBePrimary
    ? "primary"
    : requestedImageType === "primary"
      ? "gallery"
      : requestedImageType;

  const nextSortOrder = await getNextSortOrder({
    supabase,
    productId
  });

  const storagePath = getStoragePath({
    productId,
    imageType: finalImageType,
    extension
  });

  const imageBuffer = await file.arrayBuffer();

  const { error: uploadError } = await supabase.storage
    .from(STORAGE_BUCKET)
    .upload(storagePath, imageBuffer, {
      contentType: file.type,
      cacheControl: "31536000",
      upsert: false
    });

  if (uploadError) {
    console.error("Unable to upload product image:", uploadError);
    throw new Error(
      uploadError.message || "Unable to upload product image."
    );
  }

  const insertImageType = shouldBePrimary ? "gallery" : finalImageType;

  const { data: createdImage, error: databaseError } = await supabase
    .from("product_images")
    .insert({
      product_id: productId,
      image_type: insertImageType,
      title: optionalText(formData, "title"),
      alt_text: altText,
      storage_bucket: STORAGE_BUCKET,
      storage_path: storagePath,
      original_filename: cleanFilename(file.name),
      mime_type: file.type,
      file_size_bytes: file.size,
      width: null,
      height: null,
      sort_order: nextSortOrder,
      is_primary: false,
      is_active: true,
      uploaded_by_user_id: user.id,
      uploaded_by_email: user.email || null
    })
    .select("id")
    .single();

  if (databaseError || !createdImage) {
    console.error("Unable to save product image metadata:", databaseError);

    await removeStoredImage({
      supabase,
      bucket: STORAGE_BUCKET,
      path: storagePath
    });

    throw new Error(
      databaseError?.message ||
        "Unable to save product image information."
    );
  }

  if (shouldBePrimary) {
    try {
      await promoteImageToPrimary({
        supabase,
        productId,
        imageId: createdImage.id
      });
    } catch (error) {
      await supabase
        .from("product_images")
        .delete()
        .eq("id", createdImage.id)
        .eq("product_id", productId);

      await removeStoredImage({
        supabase,
        bucket: STORAGE_BUCKET,
        path: storagePath
      });

      throw error;
    }
  }

  refreshProductImagePages(productId);
  redirect(`/admin/products/${productId}/images?uploaded=1`);
}

export async function updateProductImage(formData) {
  await requireAdmin();

  const productId = requiredText(formData, "productId");
  const imageId = requiredText(formData, "imageId");
  const requestedImageType = normalizeImageType(
    requiredText(formData, "imageType")
  );
  const altText = requiredText(formData, "altText");

  if (!productId || !imageId) {
    throw new Error("Missing product image information.");
  }

  if (!altText) {
    throw new Error("Alternative text is required.");
  }

  const supabase = createSupabaseAdmin();

  const existingImage = await getProductImage({
    supabase,
    productId,
    imageId
  });

  const requestedPrimary =
    requestedImageType === "primary" ||
    checkboxValue(formData, "isPrimary");

  const isActive = checkboxValue(formData, "isActive");
  const finalPrimary = requestedPrimary && isActive;

  const finalImageType = finalPrimary
    ? "primary"
    : requestedImageType === "primary"
      ? "gallery"
      : requestedImageType;

  const sortOrder = normalizeSortOrder(
    formData.get("sortOrder"),
    existingImage.sort_order
  );

  const { error: updateError } = await supabase
    .from("product_images")
    .update({
      image_type: finalPrimary ? "gallery" : finalImageType,
      title: optionalText(formData, "title"),
      alt_text: altText,
      sort_order: sortOrder,
      is_primary: finalPrimary ? existingImage.is_primary : false,
      is_active: isActive
    })
    .eq("id", imageId)
    .eq("product_id", productId);

  if (updateError) {
    console.error("Unable to update product image:", updateError);
    throw new Error(
      updateError.message || "Unable to update product image."
    );
  }

  if (finalPrimary) {
    await promoteImageToPrimary({
      supabase,
      productId,
      imageId
    });
  } else if (existingImage.is_primary) {
    await assignReplacementPrimary({
      supabase,
      productId,
      excludeImageId: imageId
    });
  }

  refreshProductImagePages(productId);
  redirect(`/admin/products/${productId}/images?updated=1`);
}

export async function setPrimaryProductImage(formData) {
  await requireAdmin();

  const productId = requiredText(formData, "productId");
  const imageId = requiredText(formData, "imageId");

  if (!productId || !imageId) {
    throw new Error("Missing product image information.");
  }

  const supabase = createSupabaseAdmin();

  await getProductImage({
    supabase,
    productId,
    imageId
  });

  await promoteImageToPrimary({
    supabase,
    productId,
    imageId
  });

  refreshProductImagePages(productId);
  redirect(
    `/admin/products/${productId}/images?primaryChanged=1`
  );
}

export async function toggleProductImageStatus(formData) {
  await requireAdmin();

  const productId = requiredText(formData, "productId");
  const imageId = requiredText(formData, "imageId");
  const nextActive =
    requiredText(formData, "nextActive") === "true";

  if (!productId || !imageId) {
    throw new Error("Missing product image information.");
  }

  const supabase = createSupabaseAdmin();

  const existingImage = await getProductImage({
    supabase,
    productId,
    imageId
  });

  const updateData = {
    is_active: nextActive
  };

  if (!nextActive && existingImage.is_primary) {
    updateData.is_primary = false;
    updateData.image_type = "gallery";
  }

  const { error } = await supabase
    .from("product_images")
    .update(updateData)
    .eq("id", imageId)
    .eq("product_id", productId);

  if (error) {
    console.error("Unable to change image status:", error);
    throw new Error(
      error.message || "Unable to change product image status."
    );
  }

  if (!nextActive && existingImage.is_primary) {
    await assignReplacementPrimary({
      supabase,
      productId,
      excludeImageId: imageId
    });
  }

  refreshProductImagePages(productId);
  redirect(
    `/admin/products/${productId}/images?statusChanged=1`
  );
}

export async function deleteProductImage(formData) {
  await requireAdmin();

  const productId = requiredText(formData, "productId");
  const imageId = requiredText(formData, "imageId");

  if (!productId || !imageId) {
    throw new Error("Missing product image information.");
  }

  const supabase = createSupabaseAdmin();

  const image = await getProductImage({
    supabase,
    productId,
    imageId
  });

  const { error: databaseDeleteError } = await supabase
    .from("product_images")
    .delete()
    .eq("id", imageId)
    .eq("product_id", productId);

  if (databaseDeleteError) {
    console.error(
      "Unable to delete product image record:",
      databaseDeleteError
    );
    throw new Error(
      databaseDeleteError.message ||
        "Unable to delete the product image record."
    );
  }

  if (image.is_primary) {
    await assignReplacementPrimary({
      supabase,
      productId,
      excludeImageId: imageId
    });
  }

  await removeStoredImage({
    supabase,
    bucket: image.storage_bucket,
    path: image.storage_path
  });

  refreshProductImagePages(productId);
  redirect(`/admin/products/${productId}/images?deleted=1`);
}

async function swapImageSortOrders({
  supabase,
  productId,
  firstImage,
  secondImage
}) {
  const temporaryOrder =
    Math.max(
      Number(firstImage.sort_order),
      Number(secondImage.sort_order)
    ) + 1000000;

  const { error: temporaryError } = await supabase
    .from("product_images")
    .update({ sort_order: temporaryOrder })
    .eq("id", firstImage.id)
    .eq("product_id", productId);

  if (temporaryError) {
    throw new Error(
      temporaryError.message || "Unable to reorder product images."
    );
  }

  const { error: secondError } = await supabase
    .from("product_images")
    .update({ sort_order: firstImage.sort_order })
    .eq("id", secondImage.id)
    .eq("product_id", productId);

  if (secondError) {
    await supabase
      .from("product_images")
      .update({ sort_order: firstImage.sort_order })
      .eq("id", firstImage.id)
      .eq("product_id", productId);

    throw new Error(
      secondError.message || "Unable to reorder product images."
    );
  }

  const { error: firstError } = await supabase
    .from("product_images")
    .update({ sort_order: secondImage.sort_order })
    .eq("id", firstImage.id)
    .eq("product_id", productId);

  if (firstError) {
    await supabase
      .from("product_images")
      .update({ sort_order: secondImage.sort_order })
      .eq("id", secondImage.id)
      .eq("product_id", productId);

    await supabase
      .from("product_images")
      .update({ sort_order: firstImage.sort_order })
      .eq("id", firstImage.id)
      .eq("product_id", productId);

    throw new Error(
      firstError.message || "Unable to reorder product images."
    );
  }
}

export async function moveProductImageUp(formData) {
  await requireAdmin();

  const productId = requiredText(formData, "productId");
  const imageId = requiredText(formData, "imageId");

  if (!productId || !imageId) {
    throw new Error("Missing product image information.");
  }

  const supabase = createSupabaseAdmin();

  const currentImage = await getProductImage({
    supabase,
    productId,
    imageId
  });

  const { data: previousImage, error: previousError } =
    await supabase
      .from("product_images")
      .select("id, sort_order")
      .eq("product_id", productId)
      .lt("sort_order", currentImage.sort_order)
      .order("sort_order", { ascending: false })
      .limit(1)
      .maybeSingle();

  if (previousError) {
    console.error("Unable to load previous image:", previousError);
    throw new Error(
      previousError.message || "Unable to reorder product images."
    );
  }

  if (!previousImage) {
    redirect(`/admin/products/${productId}/images`);
  }

  await swapImageSortOrders({
    supabase,
    productId,
    firstImage: currentImage,
    secondImage: previousImage
  });

  refreshProductImagePages(productId);
  redirect(`/admin/products/${productId}/images?reordered=1`);
}

export async function moveProductImageDown(formData) {
  await requireAdmin();

  const productId = requiredText(formData, "productId");
  const imageId = requiredText(formData, "imageId");

  if (!productId || !imageId) {
    throw new Error("Missing product image information.");
  }

  const supabase = createSupabaseAdmin();

  const currentImage = await getProductImage({
    supabase,
    productId,
    imageId
  });

  const { data: nextImage, error: nextError } = await supabase
    .from("product_images")
    .select("id, sort_order")
    .eq("product_id", productId)
    .gt("sort_order", currentImage.sort_order)
    .order("sort_order", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (nextError) {
    console.error("Unable to load next image:", nextError);
    throw new Error(
      nextError.message || "Unable to reorder product images."
    );
  }

  if (!nextImage) {
    redirect(`/admin/products/${productId}/images`);
  }

  await swapImageSortOrders({
    supabase,
    productId,
    firstImage: currentImage,
    secondImage: nextImage
  });

  refreshProductImagePages(productId);
  redirect(`/admin/products/${productId}/images?reordered=1`);
}
