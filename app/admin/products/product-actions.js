"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createSupabaseAdmin } from "@/lib/supabase-admin";

const ALLOWED_STATUSES = Object.freeze([
  "draft",
  "active",
  "archived"
]);

const PRODUCT_IMAGE_BUCKET = Object.freeze(["product-images"]);

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

function requiredText(formData, fieldName) {
  return String(
    formData.get(fieldName) || ""
  ).trim();
}

function optionalText(formData, fieldName) {
  const value = String(
    formData.get(fieldName) || ""
  ).trim();

  return value || null;
}

function checkboxValue(formData, fieldName) {
  return formData.get(fieldName) === "on";
}

function normalizeIdentifier(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function normalizeStatus(value) {
  const status = String(value || "draft")
    .trim()
    .toLowerCase();

  if (!ALLOWED_STATUSES.includes(status)) {
    throw new Error(
      "Invalid product status."
    );
  }

  return status;
}

function parseMoneyToCents(
  formData,
  fieldName,
  {
    required = false
  } = {}
) {
  const rawValue = String(
    formData.get(fieldName) || ""
  ).trim();

  if (!rawValue) {
    if (required) {
      throw new Error(
        `${fieldName} is required.`
      );
    }

    return null;
  }

  const amount = Number(rawValue);

  if (
    !Number.isFinite(amount) ||
    amount < 0
  ) {
    throw new Error(
      `${fieldName} must be a valid non-negative amount.`
    );
  }

  return Math.round(amount * 100);
}

function parseOptionalMoney(formData, fieldName) {
  const rawValue = String(
    formData.get(fieldName) || ""
  ).trim();

  if (!rawValue) {
    return null;
  }

  const amount = Number(rawValue);

  if (!Number.isFinite(amount) || amount < 0) {
    throw new Error(
      `${fieldName} must be a valid non-negative amount.`
    );
  }

  return Number(amount.toFixed(2));
}

function parseNonNegativeInteger(
  formData,
  fieldName,
  fallback = 0
) {
  const rawValue = String(
    formData.get(fieldName) || ""
  ).trim();

  if (!rawValue) {
    return fallback;
  }

  const value = Number.parseInt(
    rawValue,
    10
  );

  if (
    !Number.isFinite(value) ||
    value < 0
  ) {
    throw new Error(
      `${fieldName} must be zero or greater.`
    );
  }

  return value;
}

function refreshProductPages({
  productId,
  slug
}) {
  revalidatePath("/admin");
  revalidatePath("/admin/products");
  revalidatePath("/admin/inventory");
  revalidatePath("/products");

  if (productId) {
    revalidatePath(
      `/admin/products/${productId}`
    );

    revalidatePath(
      `/admin/products/${productId}/edit`
    );

    revalidatePath(
      `/admin/products/${productId}/images`
    );

    revalidatePath(
      `/products/${productId}`
    );
  }

  if (slug && slug !== productId) {
    revalidatePath(
      `/products/${slug}`
    );
  }
}

async function getProduct({
  supabase,
  productId
}) {
  const { data, error } = await supabase
    .from("products")
    .select("*")
    .eq("product_id", productId)
    .is("deleted_at", null)
    .maybeSingle();

  if (error) {
    console.error(
      "Unable to load product:",
      error
    );

    throw new Error(
      error.message ||
        "Unable to load product."
    );
  }

  if (!data) {
    throw new Error(
      "Product was not found."
    );
  }

  return data;
}

async function assertIdentifiersAvailable({
  supabase,
  productId,
  slug,
  sku,
  excludeProductId = null
}) {
  let productIdQuery = supabase
    .from("products")
    .select("product_id")
    .eq("product_id", productId)
    .is("deleted_at", null)
    .limit(1);

  if (excludeProductId) {
    productIdQuery =
      productIdQuery.neq(
        "product_id",
        excludeProductId
      );
  }

  const {
    data: productIdMatch,
    error: productIdError
  } = await productIdQuery.maybeSingle();

  if (productIdError) {
    throw new Error(
      productIdError.message ||
        "Unable to verify the product ID."
    );
  }

  if (productIdMatch) {
    throw new Error(
      "That product ID is already in use."
    );
  }

  let slugQuery = supabase
    .from("products")
    .select("product_id")
    .eq("slug", slug)
    .is("deleted_at", null)
    .limit(1);

  if (excludeProductId) {
    slugQuery = slugQuery.neq(
      "product_id",
      excludeProductId
    );
  }

  const {
    data: slugMatch,
    error: slugError
  } = await slugQuery.maybeSingle();

  if (slugError) {
    throw new Error(
      slugError.message ||
        "Unable to verify the product slug."
    );
  }

  if (slugMatch) {
    throw new Error(
      "That product URL slug is already in use."
    );
  }

  if (sku) {
    let skuQuery = supabase
      .from("products")
      .select("product_id")
      .eq("sku", sku)
      .is("deleted_at", null)
      .limit(1);

    if (excludeProductId) {
      skuQuery = skuQuery.neq(
        "product_id",
        excludeProductId
      );
    }

    const {
      data: skuMatch,
      error: skuError
    } = await skuQuery.maybeSingle();

    if (skuError) {
      throw new Error(
        skuError.message ||
          "Unable to verify the SKU."
      );
    }

    if (skuMatch) {
      throw new Error(
        "That SKU is already in use."
      );
    }
  }
}

function readProductForm(formData) {
  const title = requiredText(
    formData,
    "title"
  );

  const productId =
    normalizeIdentifier(
      requiredText(
        formData,
        "productId"
      ) || title
    );

  const slug =
    normalizeIdentifier(
      requiredText(
        formData,
        "slug"
      ) || productId
    );

  const skuValue = optionalText(
    formData,
    "sku"
  );

  const sku = skuValue
    ? skuValue.toUpperCase()
    : null;

  const status = normalizeStatus(
    requiredText(
      formData,
      "status"
    ) || "draft"
  );

  if (!title) {
    throw new Error(
      "Product title is required."
    );
  }

  if (!productId) {
    throw new Error(
      "Product ID is required."
    );
  }

  if (!slug) {
    throw new Error(
      "Product slug is required."
    );
  }

  const priceCents =
    parseMoneyToCents(
      formData,
      "price",
      {
        required: true
      }
    );

  const compareAtPrice =
    parseOptionalMoney(
      formData,
      "compareAtPrice"
    );

  const costCents =
    parseMoneyToCents(
      formData,
      "cost"
    );

  const sellingPrice = priceCents / 100;

  if (
    compareAtPrice !== null &&
    compareAtPrice < sellingPrice
  ) {
    throw new Error(
      "Compare-at price must be equal to or greater than the selling price."
    );
  }

  return {
    productId,
    slug,
    sku,
    status,

    productData: {
      product_id: productId,
      slug,
      sku,
      title,

      short_description:
        optionalText(
          formData,
          "shortDescription"
        ),

      description:
        optionalText(
          formData,
          "description"
        ),

      category:
        optionalText(
          formData,
          "category"
        ) || "uncategorized",

      subcategory:
        optionalText(
          formData,
          "subcategory"
        ),

      price_cents: priceCents,

      compare_at_price: compareAtPrice,

      cost_cents: costCents,

      currency:
        (
          optionalText(
            formData,
            "currency"
          ) || "USD"
        ).toUpperCase(),

      pack_size:
        optionalText(
          formData,
          "packSize"
        ),

      unit_label:
        optionalText(
          formData,
          "unitLabel"
        ),

      weight_label:
        optionalText(
          formData,
          "weightLabel"
        ),

      status,

      is_active:
        status === "active",

      featured:
        checkboxValue(
          formData,
          "featured"
        ),

      best_seller:
        checkboxValue(
          formData,
          "bestSeller"
        ),

      new_arrival:
        checkboxValue(
          formData,
          "newArrival"
        ),

      display_order:
        parseNonNegativeInteger(
          formData,
          "displayOrder",
          999
        ),

      taxable:
        checkboxValue(
          formData,
          "taxable"
        ),

      requires_shipping:
        checkboxValue(
          formData,
          "requiresShipping"
        ),

      seo_title:
        optionalText(
          formData,
          "seoTitle"
        ),

      seo_description:
        optionalText(
          formData,
          "seoDescription"
        )
    },

    inventoryData: {
      stock_quantity:
        parseNonNegativeInteger(
          formData,
          "initialStock",
          0
        ),

      low_stock_threshold:
        parseNonNegativeInteger(
          formData,
          "lowStockThreshold",
          5
        )
    }
  };
}

export async function createProduct(
  formData
) {
  const user = await requireAdmin();

  const {
    productId,
    slug,
    sku,
    productData,
    inventoryData
  } = readProductForm(formData);

  const supabase =
    createSupabaseAdmin();

  await assertIdentifiersAvailable({
    supabase,
    productId,
    slug,
    sku
  });

  const {
    data: createdProduct,
    error: productError
  } = await supabase
    .from("products")
    .insert({
      ...productData,
      created_by_user_id: user.id,
      created_by_email:
        user.email || null,
      updated_by_user_id: user.id,
      updated_by_email:
        user.email || null
    })
    .select(
      "product_id, slug, title, status"
    )
    .single();

  if (productError) {
    console.error(
      "Unable to create product:",
      productError
    );

    throw new Error(
      productError.message ||
        "Unable to create product."
    );
  }

  const {
    error: inventoryError
  } = await supabase
    .from("inventory")
    .insert({
      product_id: productId,
      product_name: productData.title,

      stock_quantity:
        inventoryData.stock_quantity,

      reserved_quantity: 0,

      low_stock_threshold:
        inventoryData.low_stock_threshold,

      is_active:
        productData.is_active
    });

  if (inventoryError) {
    console.error(
      "Unable to create inventory record:",
      inventoryError
    );

    const { error: rollbackError } =
      await supabase
        .from("products")
        .delete()
        .eq(
          "product_id",
          productId
        );

    if (rollbackError) {
      console.error(
        "Unable to roll back product creation:",
        rollbackError
      );
    }

    throw new Error(
      inventoryError.message ||
        "The product could not be added to inventory."
    );
  }

  refreshProductPages({
    productId:
      createdProduct.product_id,
    slug: createdProduct.slug
  });

  redirect(
    `/admin/products/${createdProduct.product_id}?created=1`
  );
}

export async function updateProduct(
  formData
) {
  const user = await requireAdmin();

  const originalProductId =
    requiredText(
      formData,
      "originalProductId"
    );

  if (!originalProductId) {
    throw new Error(
      "Original product ID is required."
    );
  }

  const {
    productId,
    slug,
    sku,
    productData,
    inventoryData
  } = readProductForm(formData);

  const supabase =
    createSupabaseAdmin();

  const existingProduct =
    await getProduct({
      supabase,
      productId:
        originalProductId
    });

  await assertIdentifiersAvailable({
    supabase,
    productId,
    slug,
    sku,
    excludeProductId:
      originalProductId
  });

  const {
    error: productError
  } = await supabase
    .from("products")
    .update({
      ...productData,
      updated_by_user_id: user.id,
      updated_by_email:
        user.email || null
    })
    .eq(
      "product_id",
      originalProductId
    )
    .is("deleted_at", null);

  if (productError) {
    console.error(
      "Unable to update product:",
      productError
    );

    throw new Error(
      productError.message ||
        "Unable to update product."
    );
  }

  const {
    error: inventoryError
  } = await supabase
    .from("inventory")
    .update({
      product_id: productId,
      product_name: productData.title,

      stock_quantity:
        inventoryData.stock_quantity,

      low_stock_threshold:
        inventoryData.low_stock_threshold,

      is_active:
        productData.is_active
    })
    .eq(
      "product_id",
      originalProductId
    );

  if (inventoryError) {
    console.error(
      "Unable to update product inventory:",
      inventoryError
    );

    const { error: rollbackError } =
      await supabase
        .from("products")
        .update({
          product_id:
            existingProduct.product_id,
          slug:
            existingProduct.slug,
          sku:
            existingProduct.sku,
          title:
            existingProduct.title,
          short_description:
            existingProduct.short_description,
          description:
            existingProduct.description,
          category:
            existingProduct.category,
          subcategory:
            existingProduct.subcategory,
          price_cents:
            existingProduct.price_cents,
          compare_at_price:
            existingProduct.compare_at_price,
          cost_cents:
            existingProduct.cost_cents,
          currency:
            existingProduct.currency,
          pack_size:
            existingProduct.pack_size,
          unit_label:
            existingProduct.unit_label,
          weight_label:
            existingProduct.weight_label,
          status:
            existingProduct.status,
          is_active:
            existingProduct.is_active,
          featured:
            existingProduct.featured,
          best_seller:
            existingProduct.best_seller,
          new_arrival:
            existingProduct.new_arrival,
          display_order:
            existingProduct.display_order,
          taxable:
            existingProduct.taxable,
          requires_shipping:
            existingProduct.requires_shipping,
          seo_title:
            existingProduct.seo_title,
          seo_description:
            existingProduct.seo_description
        })
        .eq(
          "product_id",
          productId
        );

    if (rollbackError) {
      console.error(
        "Unable to roll back product update:",
        rollbackError
      );
    }

    throw new Error(
      inventoryError.message ||
        "The product was not updated because the inventory record could not be changed."
    );
  }

  refreshProductPages({
    productId:
      originalProductId,
    slug:
      existingProduct.slug
  });

  refreshProductPages({
    productId,
    slug
  });

  redirect(
    `/admin/products/${productId}?updated=1`
  );
}

export async function archiveProduct(
  formData
) {
  const user = await requireAdmin();

  const productId = requiredText(
    formData,
    "productId"
  );

  if (!productId) {
    throw new Error(
      "Product ID is required."
    );
  }

  const supabase =
    createSupabaseAdmin();

  const product = await getProduct({
    supabase,
    productId
  });

  const {
    error: productError
  } = await supabase
    .from("products")
    .update({
      status: "archived",
      is_active: false,
      archived_at:
        new Date().toISOString(),
      updated_by_user_id: user.id,
      updated_by_email:
        user.email || null
    })
    .eq("product_id", productId);

  if (productError) {
    throw new Error(
      productError.message ||
        "Unable to archive product."
    );
  }

  const {
    error: inventoryError
  } = await supabase
    .from("inventory")
    .update({
      is_active: false
    })
    .eq("product_id", productId);

  if (inventoryError) {
    console.error(
      "Unable to deactivate archived inventory:",
      inventoryError
    );
  }

  refreshProductPages({
    productId,
    slug: product.slug
  });

  redirect(
    `/admin/products/${productId}?archived=1`
  );
}

export async function restoreProduct(
  formData
) {
  const user = await requireAdmin();

  const productId = requiredText(
    formData,
    "productId"
  );

  const restoreAs = normalizeStatus(
    requiredText(
      formData,
      "restoreAs"
    ) || "draft"
  );

  if (restoreAs === "archived") {
    throw new Error(
      "Restore status must be Draft or Active."
    );
  }

  if (!productId) {
    throw new Error(
      "Product ID is required."
    );
  }

  const supabase =
    createSupabaseAdmin();

  const product = await getProduct({
    supabase,
    productId
  });

  const {
    error: productError
  } = await supabase
    .from("products")
    .update({
      status: restoreAs,
      is_active:
        restoreAs === "active",
      archived_at: null,
      updated_by_user_id: user.id,
      updated_by_email:
        user.email || null
    })
    .eq("product_id", productId);

  if (productError) {
    throw new Error(
      productError.message ||
        "Unable to restore product."
    );
  }

  const {
    error: inventoryError
  } = await supabase
    .from("inventory")
    .update({
      is_active:
        restoreAs === "active"
    })
    .eq("product_id", productId);

  if (inventoryError) {
    console.error(
      "Unable to update restored inventory:",
      inventoryError
    );
  }

  refreshProductPages({
    productId,
    slug: product.slug
  });

  redirect(
    `/admin/products/${productId}?restored=1`
  );
}

export async function deleteProductPermanently(
  formData
) {
  await requireAdmin();

  const productId = requiredText(
    formData,
    "productId"
  );

  const confirmation =
    requiredText(
      formData,
      "confirmation"
    );

  if (!productId) {
    throw new Error(
      "Product ID is required."
    );
  }

  if (confirmation !== productId) {
    throw new Error(
      "Enter the exact product ID to confirm permanent deletion."
    );
  }

  const supabase =
    createSupabaseAdmin();

  const product = await getProduct({
    supabase,
    productId
  });

  /*
   * Prevent deletion when order history references
   * this product.
   */
  const {
    count: orderItemCount,
    error: orderCheckError
  } = await supabase
    .from("order_items")
    .select("id", {
      count: "exact",
      head: true
    })
    .eq("product_id", productId);

  if (orderCheckError) {
    console.error(
      "Unable to check product order history:",
      orderCheckError
    );

    throw new Error(
      orderCheckError.message ||
        "Unable to verify whether this product can be deleted."
    );
  }

  if (Number(orderItemCount || 0) > 0) {
    throw new Error(
      "This product has order history and cannot be permanently deleted. Archive it instead."
    );
  }

  const {
    count: transactionCount,
    error: transactionCheckError
  } = await supabase
    .from("inventory_transactions")
    .select("id", {
      count: "exact",
      head: true
    })
    .eq("product_id", productId);

  if (transactionCheckError) {
    console.error(
      "Unable to check inventory history:",
      transactionCheckError
    );

    throw new Error(
      transactionCheckError.message ||
        "Unable to verify the product inventory history."
    );
  }

  if (Number(transactionCount || 0) > 0) {
    throw new Error(
      "This product has inventory transaction history and cannot be permanently deleted. Archive it instead."
    );
  }

  // 1. Collect image storage paths BEFORE database deletion
  const {
    data: productImages,
    error: imageReadError
  } = await supabase
    .from("product_images")
    .select(
      "storage_bucket, storage_path"
    )
    .eq("product_id", productId);

  if (imageReadError) {
    throw new Error(
      imageReadError.message ||
        "Unable to load product images before deletion."
    );
  }

  const storagePaths = (
    productImages || []
  )
    .filter(
      (image) =>
        image.storage_bucket ===
          PRODUCT_IMAGE_BUCKET &&
        image.storage_path
    )
    .map(
      (image) => image.storage_path
    );

  // 2. Delete database records FIRST (inventory then product)
  const {
    error: inventoryDeleteError
  } = await supabase
    .from("inventory")
    .delete()
    .eq("product_id", productId);

  if (inventoryDeleteError) {
    throw new Error(
      inventoryDeleteError.message ||
        "Unable to remove the inventory record."
    );
  }

  const {
    error: productDeleteError
  } = await supabase
    .from("products")
    .delete()
    .eq("product_id", productId);

  if (productDeleteError) {
    throw new Error(
      productDeleteError.message ||
        "Unable to permanently delete product."
    );
  }

  // 3. Clean up Storage files AFTER successful database removal
  if (storagePaths.length > 0) {
    const {
      error: storageDeleteError
    } = await supabase.storage
      .from(PRODUCT_IMAGE_BUCKET)
      .remove(storagePaths);

    if (storageDeleteError) {
      console.error(
        "Product was deleted, but some image files could not be removed from storage:",
        storageDeleteError
      );
    }
  }

  refreshProductPages({
    productId,
    slug: product.slug
  });

  redirect(
    "/admin/products?deleted=1"
  );
}