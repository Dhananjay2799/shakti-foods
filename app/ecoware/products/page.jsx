import Link from "next/link";

import {
  getStorefrontProducts,
  getStorefrontCategories,
  PUBLIC_STOREFRONTS
} from "@/lib/storefront-products";

function formatPrice(cents) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD"
  }).format(Number(cents || 0) / 100);
}

export const metadata = {
  title: "Products"
};

export default async function EcowareProductsPage({ searchParams }) {
  const queryParams = await Promise.resolve(searchParams || {});

  const selectedCategory = String(queryParams.category || "").trim();

  const [products, categories] = await Promise.all([
    getStorefrontProducts(PUBLIC_STOREFRONTS.ECOWARE),
    getStorefrontCategories(PUBLIC_STOREFRONTS.ECOWARE)
  ]);

  const visibleProducts = selectedCategory
    ? products.filter(
        (product) =>
          product.category_slug === selectedCategory ||
          product.category === selectedCategory
      )
    : products;

  return (
    <section className="mx-auto max-w-7xl px-6 py-16">
      <div>
        <p className="text-xs font-black uppercase tracking-[0.2em] text-black/40">
          Simpli Ecoware
        </p>

        <h1 className="mt-3 text-5xl font-black">Products</h1>

        <p className="mt-4 max-w-2xl text-black/55">
          Sustainable plates, bowls, trays and food-service solutions for home,
          hospitality and commercial use.
        </p>
      </div>

      <div className="mt-10 flex flex-wrap gap-2">
        <Link
          href="/ecoware/products"
          className={`rounded-full px-5 py-3 text-sm font-bold ${
            !selectedCategory
              ? "bg-black text-white"
              : "border border-black/15 bg-white"
          }`}
        >
          All
        </Link>

        {categories.map((category) => (
          <Link
            key={category.id || category.category_id || category.slug}
            href={`/ecoware/products?category=${encodeURIComponent(
              category.slug
            )}`}
            className={`rounded-full px-5 py-3 text-sm font-bold ${
              selectedCategory === category.slug
                ? "bg-black text-white"
                : "border border-black/15 bg-white"
            }`}
          >
            {category.name}
          </Link>
        ))}
      </div>

      <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {visibleProducts.map((product) => (
          <Link
            key={product.id || product.product_id || product.slug}
            href={`/ecoware/products/${product.slug}`}
            className="rounded-3xl border border-black/10 bg-white p-5"
          >
            <div className="aspect-square overflow-hidden rounded-2xl bg-[#f1eee5]">
              {product.image ? (
                <img
                  src={product.image}
                  alt={product.title}
                  className="h-full w-full object-cover"
                />
              ) : null}
            </div>

            <h2 className="mt-5 text-lg font-bold">{product.title}</h2>

            <p className="mt-2 text-sm text-black/50">
              {product.category_name || product.category || "Ecoware"}
            </p>

            <p className="mt-3 font-black">
              {formatPrice(product.price_cents)}
            </p>
          </Link>
        ))}
      </div>

      {visibleProducts.length === 0 && (
        <div className="mt-10 rounded-3xl border border-black/10 bg-white p-12 text-center">
          No products found in this category.
        </div>
      )}
    </section>
  );
}