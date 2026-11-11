import { createProduct } from "@/app/admin/products/product-actions";
import ProductForm from "@/components/admin/ProductForm";
import { createSupabaseAdmin } from "@/lib/supabase-admin";
import {
  adminProductsPath,
  requireAdminStore
} from "@/lib/admin-store";

export const dynamic = "force-dynamic";

export default async function NewProductPage({ params }) {
  const resolvedParams = await Promise.resolve(params || {});

  // The new product belongs to the store this page is opened in.
  const storefront = requireAdminStore(resolvedParams.storefront);
  const productsBase = adminProductsPath(storefront);

  const supabase = createSupabaseAdmin();
  const { data: categories, error } = await supabase
    .from("product_categories")
    .select("id, category_id, name")
    .eq("storefront", storefront.id)
    .eq("is_active", true)
    .order("sort_order", { ascending: true })
    .order("name", { ascending: true });

  if (error) {
    console.error(`Unable to load ${storefront.name} categories:`, error);
  }

  return (
    <ProductForm
      mode="create"
      action={createProduct}
      storefront={storefront}
      cancelHref={productsBase}
      categories={categories || []}
    />
  );
}
