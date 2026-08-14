import Link from "next/link";
import SectionHeading from "@/components/SectionHeading";
import ProductCatalogSearch from "@/components/ProductCatalogSearch";
import { createSupabaseAdmin } from "@/lib/supabase-admin";
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

async function getUseCaseCollections() {
  const supabase = createSupabaseAdmin();

  const { data, error } = await supabase
    .from("use_case_collections")
    .select(`
      id,
      slug,
      name,
      short_description,
      hero_image_url,
      sort_order
    `)
    .eq("is_active", true)
    .order("sort_order", {
      ascending: true
    });

  if (error) {
    console.error(
      "Unable to load use-case collections:",
      error
    );

    return [];
  }

  return data || [];
}

export default async function ProductsPage({
  searchParams
}) {
  const params = await Promise.resolve(
    searchParams || {}
  );

  const selectedCategory = String(
    params.category || ""
  ).trim();

  const [
    products,
    categories,
    useCaseCollections
  ] = await Promise.all([
    getStorefrontProducts(),
    getStorefrontCategories(),
    getUseCaseCollections()
  ]);

  const visibleProducts = selectedCategory
    ? products.filter(
        (product) =>
          product.categoryId === selectedCategory
      )
    : products;

  /*
   * Show the use-case section when:
   *
   * 1. Customer is viewing all products, or
   * 2. Customer is viewing the tableware category.
   *
   * Don't show Simpli Ecoware use cases when
   * somebody is specifically browsing rice.
   */
  const showUseCases =
    !selectedCategory ||
    selectedCategory === "tableware";

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
            <Link
              href="/products"
              className={[
                "rounded-full px-5 py-3 text-sm font-bold transition",
                !selectedCategory
                  ? "bg-black text-white"
                  : "bg-white text-black shadow-sm hover:bg-[#f1eadf]"
              ].join(" ")}
            >
              All Products
            </Link>

            {categories.map((category) => {
              const active =
                selectedCategory ===
                category.category_id;

              return (
                <Link
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
                </Link>
              );
            })}
          </div>
        </div>
      </section>

      {showUseCases &&
      useCaseCollections.length > 0 ? (
        <section className="section-pad pb-14 md:pb-20">
          <div className="container-brand">
            <div className="rounded-[2rem] bg-white/65 p-6 shadow-soft backdrop-blur-sm md:p-8 lg:p-10">
              <div className="max-w-3xl">
                <div className="text-xs font-black uppercase tracking-[.2em] text-black/45">
                  Simpli Ecoware
                </div>

                <h2 className="mt-3 font-display text-4xl font-bold leading-tight text-black md:text-5xl">
                  Shop by Use Case
                </h2>

                <p className="mt-3 max-w-2xl text-sm leading-7 text-black/60 md:text-base">
                  Find compostable foodservice
                  products selected for your
                  restaurant, event, home,
                  school, catering business,
                  or food truck.
                </p>
              </div>

              <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {useCaseCollections.map(
                  (collection) => (
                    <Link
                      key={collection.id}
                      href={`/collections/${collection.slug}`}
                      className="group relative min-h-[220px] overflow-hidden rounded-[1.75rem] bg-[#f6f1e8] p-6 transition duration-300 hover:-translate-y-1 hover:shadow-soft"
                    >
                      {collection.hero_image_url ? (
                        <>
                          <img
                            src={
                              collection.hero_image_url
                            }
                            alt=""
                            className="absolute inset-0 h-full w-full object-cover transition duration-500 group-hover:scale-[1.04]"
                          />

                          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-black/5" />

                          <div className="relative flex h-full min-h-[172px] flex-col justify-end text-white">
                            <div className="text-xs font-bold uppercase tracking-[.18em] text-white/65">
                              Shop For
                            </div>

                            <h3 className="mt-2 font-display text-3xl font-bold">
                              {collection.name}
                            </h3>

                            {collection.short_description ? (
                              <p className="mt-2 line-clamp-2 text-sm leading-6 text-white/75">
                                {
                                  collection.short_description
                                }
                              </p>
                            ) : null}

                            <div className="mt-4 text-sm font-bold">
                              Explore Collection →
                            </div>
                          </div>
                        </>
                      ) : (
                        <div className="flex h-full min-h-[172px] flex-col">
                          <div className="text-xs font-bold uppercase tracking-[.18em] text-black/40">
                            Shop For
                          </div>

                          <h3 className="mt-3 font-display text-3xl font-bold text-black">
                            {collection.name}
                          </h3>

                          {collection.short_description ? (
                            <p className="mt-3 line-clamp-3 text-sm leading-6 text-black/55">
                              {
                                collection.short_description
                              }
                            </p>
                          ) : null}

                          <div className="mt-auto pt-5 text-sm font-bold text-black">
                            Explore Collection →
                          </div>
                        </div>
                      )}
                    </Link>
                  )
                )}
              </div>
            </div>
          </div>
        </section>
      ) : null}

      <ProductCatalogSearch
        products={visibleProducts}
      />
    </main>
  );
}