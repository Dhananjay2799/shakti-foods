/*
 * Rules for removing a product from the admin.
 *
 * Archive: always allowed. Hides the product from the store website and the
 * main product list; orders, stock history and reviews are kept, and it can
 * be restored.
 *
 * Delete permanently: only for a product that nothing else refers to (it was
 * never ordered, sampled, quoted, subscribed to or reviewed, and has no stock
 * history). It removes the product and the rows that exist only for it.
 */

export const PRODUCT_HISTORY_TABLES = Object.freeze([
  { table: "order_items", label: "order line" },
  { table: "inventory_transactions", label: "stock history entry" },
  { table: "subscription_items", label: "subscription" },
  { table: "sample_requests", label: "sample request" },
  { table: "wholesale_inquiries", label: "wholesale inquiry" },
  { table: "wholesale_quote_items", label: "wholesale quote line" },
  { table: "product_reviews", label: "customer review" }
]);

// Rows that only describe this product; removed with it, before the product.
export const PRODUCT_OWNED_TABLES = Object.freeze([
  "product_price_tiers",
  "product_specifications",
  "product_certifications",
  "product_subscription_frequencies",
  "product_subscription_settings",
  "product_images",
  "inventory"
]);

export const PRODUCT_IMAGE_BUCKET = "product-images";

/**
 * Counts what refers to the product. A table that cannot be checked counts as
 * a blocker, so a product is never erased on an incomplete check.
 */
export async function getProductDeleteBlockers(supabase, productId) {
  const checks = await Promise.all(
    PRODUCT_HISTORY_TABLES.map(async ({ table, label }) => {
      const { count, error } = await supabase
        .from(table)
        .select("product_id", { count: "exact", head: true })
        .eq("product_id", productId);

      if (error) {
        console.error("Unable to check product history before delete:", {
          table,
          productId,
          message: error.message
        });

        return { table, label, count: null, error: error.message };
      }

      return { table, label, count: Number(count || 0) };
    })
  );

  const blockers = checks.filter(
    (check) => check.count === null || check.count > 0
  );

  return {
    canDeletePermanently: blockers.length === 0,
    blockers,
    checks
  };
}

export function describeBlocker({ label, count }) {
  if (count === null) {
    return `${label}s (could not be checked)`;
  }

  return `${count} ${label}${count === 1 ? "" : "s"}`;
}
