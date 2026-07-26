import Link from "next/link";
import { Plus } from "lucide-react";
import { createSupabaseAdmin } from "@/lib/supabase-admin";
import { products as catalogProducts } from "@/lib/data";

export const dynamic = "force-dynamic";

export default async function AdminProductsPage() {
  const supabase = createSupabaseAdmin();

  // Query products as the primary table along with inventory and specifications
  const [
    productsResult,
    inventoryResult,
    specificationsResult
  ] = await Promise.all([
    supabase
      .from("products")
      .select("*")
      .is("deleted_at", null)
      .order("created_at", { ascending: false }),

    supabase
      .from("inventory")
      .select("*"),

    supabase
      .from("product_specifications")
      .select("product_id")
  ]);

  // Catch database errors and return a clear error view
  if (productsResult.error || inventoryResult.error || specificationsResult.error) {
    return (
      <main className="min-h-screen bg-[#f8f6f1]">
        <div className="mx-auto max-w-7xl px-5 py-10 md:px-8 md:py-12">
          <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-red-800">
            <h2 className="font-display text-xl font-bold">Unable to load product catalog</h2>
            <p className="mt-2 text-sm text-red-700">
              There was an issue fetching data from the database. Please try refreshing the page or check your Supabase credentials.
            </p>
            {process.env.NODE_ENV === "development" && (
              <details className="mt-4 cursor-pointer text-xs font-mono text-red-600">
                <summary className="font-semibold">Technical error details</summary>
                <pre className="mt-2 whitespace-pre-wrap rounded bg-red-100 p-3">
                  {JSON.stringify(
                    {
                      productsError: productsResult.error,
                      inventoryError: inventoryResult.error,
                      specificationsError: specificationsResult.error,
                    },
                    null,
                    2
                  )}
                </pre>
              </details>
            )}
          </div>
        </div>
      </main>
    );
  }

  const rawProducts = productsResult.data || [];
  const inventoryList = inventoryResult.data || [];

  // Map inventory and specifications by product_id for fast lookups
  const inventoryByProductId = new Map(
    inventoryList.map((item) => [item.product_id, item])
  );

  const specificationIds = new Set(
    (specificationsResult.data || []).map((item) => item.product_id)
  );

  const catalogById = new Map(
    catalogProducts.map((product) => [product.id, product])
  );

  return (
    <main className="min-h-screen bg-[#f8f6f1]">
      <div className="mx-auto max-w-7xl px-5 py-10 md:px-8 md:py-12">
        <div className="flex flex-wrap items-end justify-between gap-5">
          <div>
            <div className="text-sm font-bold uppercase tracking-[.18em] text-black/50">
              Catalog Management
            </div>

            <h1 className="mt-2 font-display text-5xl font-bold text-black">
              Products
            </h1>

            <p className="mt-2 text-black/60">
              Manage product details, images, specifications, certifications, pricing, and inventory.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Link
              href="/admin"
              className="rounded-full bg-white px-5 py-3 font-bold text-black shadow transition hover:bg-[#f1eadf]"
            >
              Dashboard
            </Link>

            <Link
              href="/admin/products/new"
              className="inline-flex items-center gap-2 rounded-full bg-black px-5 py-3 text-sm font-bold text-white transition hover:bg-black/80"
            >
              <Plus size={17} /> Add Product
            </Link>
          </div>
        </div>

        <section className="mt-10 overflow-hidden rounded-[2rem] bg-white shadow">
          {rawProducts.length === 0 ? (
            <div className="p-8 text-black/60">
              No products were found.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[900px] text-left">
                <thead>
                  <tr className="border-b border-black/10 bg-[#faf7f1] text-sm text-black/55">
                    <th className="px-6 py-4">Product</th>
                    <th className="px-6 py-4">Product ID</th>
                    <th className="px-6 py-4">Stock</th>
                    <th className="px-6 py-4">Status</th>
                    <th className="px-6 py-4">Specifications</th>
                    <th className="px-6 py-4">Edit</th>
                  </tr>
                </thead>

                <tbody>
                  {rawProducts.map((product) => {
                    const productId = product.product_id || product.id;
                    const inventory = inventoryByProductId.get(productId) || {};
                    const catalogProduct = catalogById.get(productId);

                    const stockQuantity = Number(inventory.stock_quantity || 0);
                    const reservedQuantity = Number(inventory.reserved_quantity || 0);
                    
                    // Safely clamp availability to 0
                    const available = Math.max(stockQuantity - reservedQuantity, 0);

                    const hasSpecifications = specificationIds.has(productId);

                    // Normalize status string to lowercase
                    const status = String(
                      product.status || (inventory.is_active ? "active" : "draft")
                    ).toLowerCase();

                    return (
                      <tr
                        key={product.id || productId}
                        className="border-b border-black/5 transition hover:bg-[#fcfaf6]"
                      >
                        <td className="px-6 py-5">
                          <div className="font-bold text-black">
                            {product.title || product.name || inventory.product_name || "Untitled Product"}
                          </div>

                          {catalogProduct?.badge ? (
                            <div className="mt-1 text-sm text-black/50">
                              {catalogProduct.badge}
                            </div>
                          ) : null}
                        </td>

                        <td className="px-6 py-5 text-black/60">
                          {productId}
                        </td>

                        <td className="px-6 py-5">
                          <div className="font-bold text-black">
                            {available.toLocaleString()} available
                          </div>

                          <div className="mt-1 text-sm text-black/50">
                            Stock {stockQuantity.toLocaleString()}, reserved {reservedQuantity.toLocaleString()}
                          </div>
                        </td>

                        <td className="px-6 py-5">
                          <span
                            className={`rounded-full px-3 py-1 text-sm font-bold capitalize ${
                              status === "active"
                                ? "bg-green-100 text-green-800"
                                : status === "draft"
                                ? "bg-amber-100 text-amber-800"
                                : "bg-gray-200 text-gray-700"
                            }`}
                          >
                            {status}
                          </span>
                        </td>

                        <td className="px-6 py-5">
                          <span
                            className={`rounded-full px-3 py-1 text-sm font-bold ${
                              hasSpecifications
                                ? "bg-green-100 text-green-800"
                                : "bg-amber-100 text-amber-800"
                            }`}
                          >
                            {hasSpecifications ? "Added" : "Missing"}
                          </span>
                        </td>

                        <td className="px-6 py-5">
                          <Link
                            href={`/admin/products/${productId}`}
                            className="inline-flex rounded-full bg-black px-4 py-2 text-sm font-bold text-white transition hover:bg-black/80"
                          >
                            Edit Product
                          </Link>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}