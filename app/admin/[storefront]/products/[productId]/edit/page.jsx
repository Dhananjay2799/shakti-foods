import { notFound } from "next/navigation";
import EditProductForm from "@/components/admin/EditProductForm";
import { createSupabaseAdmin } from "@/lib/supabase-admin";
import { updateProduct } from "@/app/admin/products/product-actions";
import {
  adminProductsPath,
  requireAdminStore,
  requireStoreProduct
} from "@/lib/admin-store";
import { getStorefrontPageUrl } from "@/lib/storefront-config";
import { normalizeProductEditTab } from "@/lib/admin-product-tabs";

export const dynamic = "force-dynamic";

export default async function EditProductPage({
  params,
  searchParams
}) {
  const resolvedParams =
    await Promise.resolve(
      params || {}
    );

  const resolvedSearchParams =
    await Promise.resolve(searchParams || {});

  // ?tab=pricing opens that tab; ?saved=<time> follows a save.
  const initialTab = normalizeProductEditTab(resolvedSearchParams.tab);
  const savedAt = String(resolvedSearchParams.saved || "");

  const productId =
    decodeURIComponent(
      String(
        resolvedParams.productId || ""
      ).trim()
    );

  if (!productId) {
    notFound();
  }

  // Only this store's products; another store's product opens in its store.
  const storefront = requireAdminStore(resolvedParams.storefront);

  await requireStoreProduct({
    storefront,
    productId,
    suffix: "/edit",
    select: "product_id"
  });

  const productBase = adminProductsPath(storefront, productId);

  const supabase =
    createSupabaseAdmin();

  const [
    productResult,
    inventoryResult,
    categoriesResult,
    priceTiersResult,
    subscriptionSettingsResult,
    subscriptionFrequenciesResult
  ] = await Promise.all([
    supabase
      .from("products")
      .select("*")
      .eq("product_id", productId)
      .is("deleted_at", null)
      .maybeSingle(),

    supabase
      .from("inventory")
      .select(`
        product_id,
        stock_quantity,
        reserved_quantity,
        low_stock_threshold,
        is_active
      `)
      .eq("product_id", productId)
      .maybeSingle(),

    supabase
      .from("product_categories")
      .select(`
        id,
        category_id,
        name,
        is_active,
        sort_order
      `)
      // Only this store's categories.
      .eq("storefront", storefront.id)
      .order("sort_order", {
        ascending: true
      })
      .order("name", {
        ascending: true
      }),

    supabase
      .from("product_price_tiers")
      .select(`
        id,
        product_id,
        min_quantity,
        max_quantity,
        unit_price_cents,
        tier_name,
        sort_order,
        is_active
      `)
      .eq("product_id", productId)
      .order("sort_order", {
        ascending: true
      })
      .order("min_quantity", {
        ascending: true
      }),

    supabase
      .from(
        "product_subscription_settings"
      )
      .select(`
        product_id,
        is_enabled,
        discount_percent,
        minimum_quantity
      `)
      .eq("product_id", productId)
      .maybeSingle(),

    supabase
      .from(
        "product_subscription_frequencies"
      )
      .select(`
        id,
        product_id,
        interval_unit,
        interval_count,
        label,
        sort_order,
        is_active
      `)
      .eq("product_id", productId)
      .order("sort_order", {
        ascending: true
      })
  ]);

  if (
    productResult.error ||
    !productResult.data
  ) {
    console.error(
      "Unable to load product:",
      productResult.error
    );

    notFound();
  }

  if (inventoryResult.error) {
    console.error(
      "Unable to load inventory:",
      inventoryResult.error
    );
  }

  if (priceTiersResult.error) {
  console.error(
    "Unable to load price tiers:",
    priceTiersResult.error
  );
}

  const priceTiers =
    priceTiersResult.data || [];

  if (subscriptionSettingsResult.error) {
    console.error(
      "Unable to load subscription settings:",
      subscriptionSettingsResult.error
    );
  }

  if (subscriptionFrequenciesResult.error) {
    console.error(
      "Unable to load subscription frequencies:",
      subscriptionFrequenciesResult.error
    );
  }

  const subscriptionSettings =
    subscriptionSettingsResult.data || {
      is_enabled: false,
      discount_percent: 10,
      minimum_quantity: 1
    };

  const subscriptionFrequencies =
    subscriptionFrequenciesResult.data || [];

  const hasSubscriptionFrequency = (
    unit,
    count
  ) =>
    subscriptionFrequencies.some(
      (frequency) =>
        frequency.interval_unit === unit &&
        Number(
          frequency.interval_count
        ) === count &&
        frequency.is_active !== false
    );

  const product =
    productResult.data;

  const inventory =
    inventoryResult.data || {
      stock_quantity: 0,
      reserved_quantity: 0,
      low_stock_threshold: 5,
      is_active: false
    };

  const categories =
    categoriesResult.data || [];

  return (
    <EditProductForm
      // A new key after each save starts the form fresh from the saved values.
      key={savedAt || "edit"}
      action={updateProduct}
      storefront={{ slug: storefront.slug, name: storefront.name }}
      product={product}
      inventory={inventory}
      categories={categories}
      priceTiers={priceTiers}
      subscriptionSettings={subscriptionSettings}
      frequencies={{
        2: hasSubscriptionFrequency("week", 2),
        4: hasSubscriptionFrequency("week", 4),
        8: hasSubscriptionFrequency("week", 8)
      }}
      links={{
        images: `${productBase}/images`,
        certifications: `${productBase}/certifications`,
        storefront: getStorefrontPageUrl(
          storefront.id,
          `/products/${product.slug}`
        ),
        delete: `${productBase}/delete`
      }}
      initialTab={initialTab}
      justSaved={Boolean(savedAt)}
    />
  );
}
