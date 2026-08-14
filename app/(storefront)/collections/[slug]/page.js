import { notFound } from "next/navigation";
import Link from "next/link";
import ProductGrid from "@/components/ProductGrid";
import { createSupabaseAdmin } from "@/lib/supabase-admin";
import {
  getStorefrontProducts
} from "@/lib/storefront-products";
import { site } from "@/lib/site";

export const dynamic = "force-dynamic";

async function getCollection(slug) {
  const supabase =
    createSupabaseAdmin();

  const {
    data,
    error
  } = await supabase
    .from("use_case_collections")
    .select(`
      id,
      slug,
      name,
      short_description,
      description,
      hero_image_url,
      seo_title,
      seo_description,
      sort_order,
      is_active
    `)
    .eq("slug", slug)
    .eq("is_active", true)
    .maybeSingle();

  if (error) {
    console.error(
      "Unable to load use-case collection:",
      error
    );

    return null;
  }

  return data;
}

async function getCollectionProductIds(
  collectionId
) {
  const supabase =
    createSupabaseAdmin();

  const {
    data,
    error
  } = await supabase
    .from(
      "product_use_case_collections"
    )
    .select(`
      product_id,
      sort_order
    `)
    .eq(
      "collection_id",
      collectionId
    )
    .order(
      "sort_order",
      {
        ascending: true
      }
    );

  if (error) {
    console.error(
      "Unable to load collection products:",
      error
    );

    return [];
  }

  return data || [];
}

async function getActiveCollections() {
  const supabase =
    createSupabaseAdmin();

  const {
    data,
    error
  } = await supabase
    .from("use_case_collections")
    .select(`
      id,
      slug,
      name
    `)
    .eq("is_active", true)
    .order(
      "sort_order",
      {
        ascending: true
      }
    );

  if (error) {
    console.error(
      "Unable to load collections:",
      error
    );

    return [];
  }

  return data || [];
}

export async function generateMetadata({
  params
}) {
  const resolvedParams =
    await Promise.resolve(params);

  const slug =
    String(
      resolvedParams?.slug || ""
    ).trim();

  if (!slug) {
    return {};
  }

  const collection =
    await getCollection(slug);

  if (!collection) {
    return {};
  }

  const title =
    collection.seo_title ||
    `${collection.name} Compostable Foodservice Products`;

  const description =
    collection.seo_description ||
    collection.short_description ||
    collection.description ||
    "";

  return {
    title,
    description,

    alternates: {
      canonical:
        `/collections/${collection.slug}`
    },

    openGraph: {
      title,
      description,
      url:
        `${site.baseUrl}/collections/${collection.slug}`,

      images:
        collection.hero_image_url
          ? [
              collection.hero_image_url
            ]
          : [],

      type: "website"
    }
  };
}

export default async function CollectionPage({
  params
}) {
  const resolvedParams =
    await Promise.resolve(params);

  const slug =
    String(
      resolvedParams?.slug || ""
    ).trim();

  if (!slug) {
    notFound();
  }

  const collection =
    await getCollection(slug);

  if (!collection) {
    notFound();
  }

  const [
    assignments,
    storefrontProducts,
    collections
  ] = await Promise.all([
    getCollectionProductIds(
      collection.id
    ),

    getStorefrontProducts(),

    getActiveCollections()
  ]);

  /*
   * Preserve the collection-specific
   * sort order stored in Supabase.
   */
  const productsById =
    new Map(
      storefrontProducts.map(
        (product) => [
          product.id,
          product
        ]
      )
    );

  const collectionProducts =
    assignments
      .map(
        (assignment) =>
          productsById.get(
            assignment.product_id
          )
      )
      .filter(Boolean);

  const collectionJsonLd = {
    "@context":
      "https://schema.org",

    "@type":
      "CollectionPage",

    name:
      collection.name,

    description:
      collection.description ||
      collection.short_description,

    url:
      `${site.baseUrl}/collections/${collection.slug}`,

    mainEntity: {
      "@type":
        "ItemList",

      numberOfItems:
        collectionProducts.length,

      itemListElement:
        collectionProducts.map(
          (product, index) => ({
            "@type":
              "ListItem",

            position:
              index + 1,

            url:
              `${site.baseUrl}/products/${product.slug}`,

            name:
              product.name
          })
        )
    }
  };

  return (
    <main className="min-h-screen bg-brand-radial pt-24 text-black md:pt-28">

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html:
            JSON.stringify(
              collectionJsonLd
            )
        }}
      />

      {/* Hero */}
      <section className="section-pad py-14 md:py-20">
        <div className="container-brand">

          <Link
            href="/products?category=tableware"
            className="inline-flex rounded-full bg-white px-4 py-2 text-sm font-bold text-black shadow-sm transition hover:bg-[#f1eadf]"
          >
            ← All Simpli Ecoware
          </Link>

          <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_420px] lg:items-center">

            <div>
              <div className="text-xs font-black uppercase tracking-[.2em] text-black/45">
                Simpli Ecoware
              </div>

              <h1 className="mt-3 max-w-4xl font-display text-5xl font-bold leading-[1.02] text-black md:text-6xl lg:text-7xl">
                {collection.name}
              </h1>

              {collection.short_description ? (
                <p className="mt-5 max-w-3xl text-lg leading-8 text-black/65">
                  {
                    collection.short_description
                  }
                </p>
              ) : null}

              {collection.description ? (
                <p className="mt-4 max-w-3xl text-sm leading-7 text-black/55">
                  {
                    collection.description
                  }
                </p>
              ) : null}

              <div className="mt-6 flex flex-wrap gap-3">
                <span className="rounded-full bg-black px-4 py-2 text-xs font-bold text-white">
                  {
                    collectionProducts.length
                  }{" "}
                  {
                    collectionProducts.length ===
                    1
                      ? "Product"
                      : "Products"
                  }
                </span>

                <span className="rounded-full bg-[#eee3d2] px-4 py-2 text-xs font-bold text-black">
                  Compostable Foodservice
                </span>
              </div>
            </div>

            {collection.hero_image_url ? (
              <div className="overflow-hidden rounded-[2rem] bg-white shadow-soft">
                <img
                  src={
                    collection.hero_image_url
                  }
                  alt={`${collection.name} Simpli Ecoware collection`}
                  className="aspect-[4/3] h-full w-full object-cover"
                />
              </div>
            ) : (
              <div className="rounded-[2rem] bg-white p-8 shadow-soft">
                <div className="text-xs font-black uppercase tracking-[.18em] text-black/40">
                  Designed For
                </div>

                <div className="mt-3 font-display text-4xl font-bold text-black">
                  {collection.name}
                </div>

                <p className="mt-4 text-sm leading-7 text-black/60">
                  Heavy-duty,
                  plant-based foodservice
                  products selected for this
                  use case.
                </p>

                <div className="mt-6 grid gap-3">
                  <div className="rounded-2xl bg-[#f8f6f1] px-4 py-3 text-sm font-bold">
                    100% Sugarcane Bagasse
                  </div>

                  <div className="rounded-2xl bg-[#f8f6f1] px-4 py-3 text-sm font-bold">
                    Compostable
                  </div>

                  <div className="rounded-2xl bg-[#f8f6f1] px-4 py-3 text-sm font-bold">
                    Microwave & Freezer Safe
                  </div>

                  <div className="rounded-2xl bg-[#f8f6f1] px-4 py-3 text-sm font-bold">
                    Leak & Oil Resistant
                  </div>
                </div>
              </div>
            )}

          </div>
        </div>
      </section>

      {/* Collection navigation */}
      <section className="section-pad pb-8">
        <div className="container-brand">

          <div className="text-xs font-bold uppercase tracking-[.18em] text-black/40">
            Shop By Use Case
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            {collections.map(
              (item) => {
                const active =
                  item.slug ===
                  collection.slug;

                return (
                  <Link
                    key={item.id}
                    href={`/collections/${item.slug}`}
                    className={[
                      "rounded-full px-5 py-3 text-sm font-bold transition",
                      active
                        ? "bg-black text-white"
                        : "bg-white text-black shadow-sm hover:bg-[#f1eadf]"
                    ].join(" ")}
                  >
                    {item.name}
                  </Link>
                );
              }
            )}
          </div>

        </div>
      </section>

      {/* Products */}
      <section className="section-pad pt-8">
        <div className="container-brand">

          <div className="max-w-3xl">
            <div className="text-xs font-bold uppercase tracking-[.18em] text-black/40">
              Recommended Products
            </div>

            <h2 className="mt-2 font-display text-4xl font-bold text-black md:text-5xl">
              Products for{" "}
              {collection.name}
            </h2>
          </div>

        </div>
      </section>

      <ProductGrid
        products={collectionProducts}
      />

      {/* B2B CTA */}
      <section className="section-pad pb-20">
        <div className="container-brand">

          <div className="rounded-[2rem] bg-black p-7 text-white md:p-10">

            <div className="text-xs font-bold uppercase tracking-[.18em] text-white/50">
              High-Volume Orders
            </div>

            <div className="mt-3 grid gap-6 md:grid-cols-[1fr_auto] md:items-end">

              <div>
                <h2 className="font-display text-4xl font-bold md:text-5xl">
                  Need wholesale quantities?
                </h2>

                <p className="mt-3 max-w-2xl text-sm leading-7 text-white/65">
                  Tell us what you need,
                  expected quantities and
                  delivery location. Our team
                  can review your requirements
                  and provide wholesale pricing.
                </p>
              </div>

              <Link
                href="/contact?type=wholesale"
                className="inline-flex justify-center rounded-full bg-white px-6 py-3.5 text-sm font-bold text-black transition hover:bg-[#eee3d2]"
              >
                Request Wholesale Price
              </Link>

            </div>
          </div>

        </div>
      </section>

    </main>
  );
}