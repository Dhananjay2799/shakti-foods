import Link from "next/link";
import { notFound } from "next/navigation";
import { createSupabaseAdmin } from "@/lib/supabase-admin";
import { getAdminStorefront } from "@/lib/admin-storefronts";

export const dynamic = "force-dynamic";

export default async function AdminProductsPage({ params }) {
  const resolvedParams = await Promise.resolve(params);
  const storefront = getAdminStorefront(resolvedParams.storefront);

  if (!storefront) {
    notFound();
  }

  const supabase = createSupabaseAdmin();

  const [productsResult, inventoryResult, categoriesResult] = await Promise.all([
    supabase
      .from("products")
      .select("*")
      .eq("storefront", storefront.id)
      .is("deleted_at", null)
      .order("created_at", { ascending: false }),

    supabase
      .from("inventory")
      .select("*")
      .eq("storefront", storefront.id),

    supabase
      .from("product_categories")
      .select("*")
      .eq("is_active", true)
  ]);

  const products = productsResult.data || [];
  const inventory = inventoryResult.data || [];
  const categories = categoriesResult.data || [];

  const inventoryByProductId = new Map(
    inventory.map((item) => [item.product_id, item])
  );

  const categoryById = new Map(
    categories.map((cat) => [cat.category_id, cat])
  );

  const basePath = `/admin/${storefront.slug}`;

  return (
    <div className="grid gap-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="text-sm font-bold uppercase tracking-[0.18em] text-black/50">
            {storefront.name} Catalog
          </div>
          <h1 className="mt-2 font-display text-4xl font-bold text-black md:text-5xl">
            Products
          </h1>
          <p className="mt-2 text-black/60">
            Manage {storefront.name} product details, images, specifications, certifications, pricing, and inventory.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <Link
            href={basePath}
            className="rounded-full bg-white px-5 py-3 text-sm font-bold text-black shadow transition hover:bg-black/5"
          >
            ← Back to Dashboard
          </Link>
          <Link
            href={`${basePath}/products/new`}
            className="rounded-full bg-black px-6 py-3 text-sm font-bold text-white transition hover:bg-black/80"
          >
            + Add Product
          </Link>
        </div>
      </div>

      <div className="overflow-hidden rounded-3xl border border-black/10 bg-white shadow-soft">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-black">
            <thead className="border-b border-black/10 bg-[#fbf9f5] font-bold text-black/60 uppercase text-[11px] tracking-wider">
              <tr>
                <th scope="col" className="px-6 py-4">Product</th>
                <th scope="col" className="px-6 py-4">Category</th>
                <th scope="col" className="px-6 py-4">Price</th>
                <th scope="col" className="px-6 py-4">Stock</th>
                <th scope="col" className="px-6 py-4">Status</th>
                <th scope="col" className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-black/5">
              {products.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-black/50 font-medium">
                    No products found for {storefront.name}.
                  </td>
                </tr>
              ) : (
                products.map((product) => {
                  const inv = inventoryByProductId.get(product.product_id);
                  const cat = categoryById.get(product.category);
                  const price = (Number(product.price_cents || 0) / 100).toFixed(2);
                  const availableStock = inv
                    ? Math.max(Number(inv.stock_quantity || 0) - Number(inv.reserved_quantity || 0), 0)
                    : 0;

                  return (
                    <tr key={product.id || product.product_id} className="transition hover:bg-black/[0.02]">
                      <td className="px-6 py-4 font-bold text-black">
                        <div>{product.title || product.product_id}</div>
                        <div className="text-xs font-normal text-black/40">{product.product_id}</div>
                      </td>
                      <td className="px-6 py-4 text-black/70">
                        {cat?.name || product.category || "Uncategorized"}
                      </td>
                      <td className="px-6 py-4 font-semibold text-black">
                        ${price}
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-bold ${
                          availableStock > 0 ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"
                        }`}>
                          {availableStock} in stock
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-bold uppercase tracking-wider ${
                          product.status === "active" && product.is_active
                            ? "bg-blue-50 text-blue-700"
                            : "bg-gray-100 text-gray-600"
                        }`}>
                          {product.status || "draft"}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <Link
                          href={`${basePath}/products/${product.product_id || product.id}`}
                          className="font-bold text-black underline underline-offset-4 hover:text-black/70"
                        >
                          Edit
                        </Link>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}