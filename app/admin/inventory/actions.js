"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createSupabaseAdmin } from "@/lib/supabase-admin";

const allowedAdjustmentReasons = Object.freeze([
  "purchase_order_received",
  "customer_return",
  "warehouse_damage",
  "cycle_count_adjustment",
  "shrinkage",
  "supplier_replacement",
  "transfer_in",
  "transfer_out",
  "stock_received",
  "damaged",
  "correction",
  "returned",
  "other"
]);

function normalizeText(value, maxLength = 500) {
  return String(value || "")
    .trim()
    .slice(0, maxLength);
}

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
    console.warn("Unauthorized inventory action", {
      userId: user.id,
      email: user.email || null
    });

    redirect("/admin/login?error=unauthorized");
  }

  return user;
}

function revalidateInventoryPaths(productId) {
  revalidatePath("/admin");
  revalidatePath("/admin/inventory");
  revalidatePath("/admin/inventory/history");
  revalidatePath("/admin/products");

  if (productId) {
    revalidatePath(`/admin/inventory/${productId}`);
  }
}

export async function adjustInventory(formData) {
  const adminUser = await requireAdmin();

  const productId = normalizeText(
    formData.get("productId"),
    150
  );

  const adjustmentValue = normalizeText(
    formData.get("adjustment"),
    30
  );

  const adjustment = Number(adjustmentValue);

  const reason = normalizeText(
    formData.get("reason") || "other",
    100
  ).toLowerCase();

  if (!productId) {
    throw new Error("Missing product ID.");
  }

  if (
    !Number.isInteger(adjustment) ||
    adjustment === 0
  ) {
    throw new Error(
      "Adjustment must be a non-zero whole number."
    );
  }

  if (
    adjustment < -1000000 ||
    adjustment > 1000000
  ) {
    throw new Error(
      "Adjustment exceeds the permitted range."
    );
  }

  if (!allowedAdjustmentReasons.includes(reason)) {
    throw new Error(
      "Invalid inventory adjustment reason."
    );
  }

  const supabase = createSupabaseAdmin();

  const { data, error } = await supabase.rpc(
    "adjust_inventory_stock",
    {
      p_product_id: productId,
      p_adjustment: adjustment,
      p_reason: reason,
      p_admin_user_id: adminUser.id,
      p_admin_email: adminUser.email || null
    }
  );

  if (error) {
    console.error(
      "Unable to adjust inventory:",
      error
    );

    if (
      error.message?.includes(
        "below reserved quantity"
      )
    ) {
      throw new Error(
        "This adjustment would reduce stock below the quantity currently reserved for customers."
      );
    }

    if (
      error.message?.includes(
        "Stock cannot go below zero"
      )
    ) {
      throw new Error(error.message);
    }

    throw new Error(
      error.message ||
        "Unable to adjust inventory."
    );
  }

  const result = Array.isArray(data)
    ? data[0]
    : data;

  if (!result) {
    throw new Error(
      "The inventory adjustment completed without returning a result."
    );
  }

  /*
   * Future Kafka integration should use the
   * transactional outbox pattern. The outbox
   * record should be inserted by the same RPC.
   */

  revalidateInventoryPaths(productId);

  return {
    success: true,
    inventory: {
      productId: result.product_id,
      productName: result.product_name,
      stockBefore: Number(result.stock_before),
      stockAfter: Number(result.stock_after),
      reservedQuantity: Number(
        result.reserved_quantity
      ),
      availableQuantity: Number(
        result.available_quantity
      ),
      isLowStock: Boolean(result.is_low_stock),
      isOutOfStock: Boolean(
        result.is_out_of_stock
      ),
      transactionId: result.transaction_id,
      updatedAt: result.updated_at
    }
  };
}

export async function updateInventorySettings(
  formData
) {
  await requireAdmin();

  const productId = normalizeText(
    formData.get("productId"),
    150
  );

  const lowStockThresholdValue =
    normalizeText(
      formData.get("lowStockThreshold"),
      30
    );

  const lowStockThreshold = Number(
    lowStockThresholdValue
  );

  const isActive =
    formData.get("isActive") === "on";

  if (!productId) {
    throw new Error("Missing product ID.");
  }

  if (
    !Number.isInteger(lowStockThreshold) ||
    lowStockThreshold < 0
  ) {
    throw new Error(
      "Low-stock threshold must be a whole number of zero or greater."
    );
  }

  if (lowStockThreshold > 1000000) {
    throw new Error(
      "Low-stock threshold exceeds the permitted range."
    );
  }

  const supabase = createSupabaseAdmin();

  const { data, error } = await supabase
    .from("inventory")
    .update({
      low_stock_threshold: lowStockThreshold,
      is_active: isActive,
      updated_at: new Date().toISOString()
    })
    .eq("product_id", productId)
    .select(`
      product_id,
      low_stock_threshold,
      is_active,
      updated_at
    `)
    .single();

  if (error) {
    console.error(
      "Unable to update inventory settings:",
      error
    );

    throw new Error(
      error.message ||
        "Unable to update product settings."
    );
  }

  revalidateInventoryPaths(productId);

  return {
    success: true,
    inventory: data
  };
}