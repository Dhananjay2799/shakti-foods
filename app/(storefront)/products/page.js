import SectionHeading from "@/components/SectionHeading";
import ProductCatalogSearch from "@/components/ProductCatalogSearch";
import {
  getStorefrontCategories,
  getStorefrontProducts
} from "@/lib/storefront-products";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Products",
  description:
    "Shop Shakti Foods premium Basmati rice and Simpli Ecoware compostable plates, bowls, trays, and food boxes."
};

export default async function ProductsPage({
  searchParams
}) {
  const params = await Promise.resolve(
    searchParams || {}
  );

  const selectedCategory = String(
    params.category || ""
  ).trim();

  const [products, categories] =
    await Promise.all([
      getStorefrontProducts(),
      getStorefrontCategories()
    ]);

  const visibleProducts = selectedCategory
    ? products.filter(
        (product) =>
          product.categoryId === selectedCategory
      )
    : products;

  return (
    <main className="bg-brand-radial pt-24 text-black md:pt-28">
      <section className="section-pad py-14 md:py-20">
        <div className="container-brand">
          <SectionHeading
            eyebrow="Products"
            title="Premium rice and Simpli Ecoware collections."
            text="Buy products online or request wholesale pricing for rice and compostable foodservice products."
          />

          <div className="mt-8 flex flex-wrap gap-3">
            <a
              href="/products"
              className={[
                "rounded-full px-5 py-3 text-sm font-bold transition",
                !selectedCategory
                  ? "bg-black text-white"
                  : "bg-white text-black shadow-sm hover:bg-[#f1eadf]"
              ].join(" ")}
            >
              All Products
            </a>

            {categories.map((category) => {
              const active =
                selectedCategory ===
                category.category_id;

              return (
                <a
                  key={category.id}
                  href={`/products?category=${encodeURIComponent(
                    category.category_id
                  )}`}
                  className={[
                    "rounded-full px-5 py-3 text-sm font-bold transition",
                    active
                      ? "bg-black text-white"
                      : "bg-white text-black shadow-sm hover:bg-[#f1eadf]"
                  ].join(" ")}
                >
                  {category.name}
                </a>
              );
            })}
          </div>
        </div>
      </section>

      <ProductCatalogSearch
        products={visibleProducts}
      />
    </main>
  );
}