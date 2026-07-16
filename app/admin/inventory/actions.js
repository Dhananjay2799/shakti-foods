"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createSupabaseAdmin } from "@/lib/supabase-admin";

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

export async function adjustInventory(formData) {
  await requireAdmin();

  const productId = String(
    formData.get("productId") || ""
  ).trim();

  const adjustment = Number(
    formData.get("adjustment")
  );

  const reason = String(
    formData.get("reason") || "manual_adjustment"
  ).trim();

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

  const supabase = createSupabaseAdmin();

  const { data: inventoryItem, error: loadError } =
    await supabase
      .from("inventory")
      .select(
        "product_id, product_name, stock_quantity, reserved_quantity"
      )
      .eq("product_id", productId)
      .single();

  if (loadError || !inventoryItem) {
    throw new Error(
      loadError?.message ||
        "Inventory product was not found."
    );
  }

  const currentStock = Number(
    inventoryItem.stock_quantity || 0
  );

  const newStock = currentStock + adjustment;

  if (newStock < 0) {
    throw new Error(
      `Stock cannot go below zero. Current stock is ${currentStock}.`
    );
  }

  const { error: updateError } = await supabase
    .from("inventory")
    .update({
      stock_quantity: newStock,
      updated_at: new Date().toISOString()
    })
    .eq("product_id", productId);

  if (updateError) {
    throw new Error(
      updateError.message ||
        "Unable to update inventory."
    );
  }

  const { error: transactionError } =
    await supabase
      .from("inventory_transactions")
      .insert({
        product_id: productId,
        transaction_type: "manual_adjustment",
        quantity_change: adjustment,
        stock_before: currentStock,
        stock_after: newStock,
        notes: reason
      });

  if (transactionError) {
    console.error(
      "Unable to record inventory transaction:",
      transactionError
    );
  }

  revalidatePath("/admin");
  revalidatePath("/admin/inventory");
}

export async function updateInventorySettings(
  formData
) {
  await requireAdmin();

  const productId = String(
    formData.get("productId") || ""
  ).trim();

  const lowStockThreshold = Number(
    formData.get("lowStockThreshold")
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
      "Low-stock threshold must be zero or greater."
    );
  }

  const supabase = createSupabaseAdmin();

  const { error } = await supabase
    .from("inventory")
    .update({
      low_stock_threshold: lowStockThreshold,
      is_active: isActive,
      updated_at: new Date().toISOString()
    })
    .eq("product_id", productId);

  if (error) {
    throw new Error(
      error.message ||
        "Unable to update product settings."
    );
  }

  revalidatePath("/admin");
  revalidatePath("/admin/inventory");
}