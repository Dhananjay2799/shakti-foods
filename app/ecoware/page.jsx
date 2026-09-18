import Link from "next/link";

import {
  getStorefrontProducts,
  PUBLIC_STOREFRONTS
} from "@/lib/storefront-products";

function formatPrice(cents) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD"
  }).format(Number(cents || 0) / 100);
}

export default async function EcowareHomePage() {
  const products = await getStorefrontProducts(
    PUBLIC_STOREFRONTS.ECOWARE
  );

  const featuredProducts = products.slice(0, 6);

  return (
    <>
      <section className="mx-auto grid min-h-[620px] max-w-7xl items-center gap-12 px-6 py-20 lg:grid-cols-2">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.24em] text-black/45">
            Simpli Ecoware
          </p>

          <h1 className="mt-5 max-w-3xl text-5xl font-black leading-[0.95] tracking-tight md:text-7xl">
            Better tableware.
            <br />
            Smaller footprint.
          </h1>

          <p className="mt-7 max-w-xl text-lg leading-8 text-black/60">
            Sustainable plates, bowls, trays and food-service
            packaging built for everyday meals, events, restaurants
            and wholesale operations.
          </p>

          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              href="/ecoware/products"
              className="rounded-full bg-black px-7 py-4 text-sm font-bold text-white"
            >
              Shop Products
            </Link>

            <Link
              href="#wholesale"
              className="rounded-full border border-black px-7 py-4 text-sm font-bold"
            >
              Wholesale
            </Link>
          </div>
        </div>

        <div className="rounded-[2rem] bg-[#e8e1d0] p-10">
          <div className="flex min-h-[420px] items-center justify-center">
            <div className="text-center">
              <p className="text-xs font-black uppercase tracking-[0.2em] text-black/40">
                Sustainable Food Service
              </p>

              <p className="mt-5 text-4xl font-black">
                SIMPLI
                <br />
                ECOWARE
              </p>

              <p className="mt-5 text-sm text-black/55">
                Product imagery coming next.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="border-y border-black/10 bg-white">
        <div className="mx-auto grid max-w-7xl grid-cols-2 gap-px md:grid-cols-4">
          {[
            ["01", "Compostable Options"],
            ["02", "Food Service Ready"],
            ["03", "Bulk Ordering"],
            ["04", "Samples Available"]
          ].map(([number, label]) => (
            <div key={number} className="px-6 py-8">
              <p className="text-xs font-bold text-black/35">
                {number}
              </p>

              <p className="mt-2 font-bold">{label}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 py-20">
        <div className="flex items-end justify-between gap-6">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.2em] text-black/40">
              Shop Ecoware
            </p>

            <h2 className="mt-3 text-4xl font-black">
              Featured products
            </h2>
          </div>

          <Link
            href="/ecoware/products"
            className="text-sm font-bold underline"
          >
            View all products
          </Link>
        </div>

        {featuredProducts.length === 0 ? (
          <div className="mt-10 rounded-3xl border border-black/10 bg-white p-10">
            No active Ecoware products found.
          </div>
        ) : (
          <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {featuredProducts.map((product) => (
              <Link
                key={
                  product.id ||
                  product.product_id ||
                  product.slug
                }
                href={`/ecoware/products/${product.slug}`}
                className="group rounded-3xl border border-black/10 bg-white p-5 transition hover:-translate-y-1"
              >
                <div className="aspect-square overflow-hidden rounded-2xl bg-[#f1eee5]">
                  {product.image ? (
                    <img
                      src={product.image}
                      alt={product.title}
                      className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
                    />
                  ) : null}
                </div>

                <div className="mt-5">
                  <p className="text-xs font-bold uppercase tracking-[0.15em] text-black/40">
                    Simpli Ecoware
                  </p>

                  <h3 className="mt-2 text-lg font-bold">
                    {product.title}
                  </h3>

                  <p className="mt-3 font-black">
                    {formatPrice(product.price_cents)}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>

      <section id="wholesale" className="bg-black text-white">
        <div className="mx-auto grid max-w-7xl gap-12 px-6 py-20 lg:grid-cols-2">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-white/45">
              B2B / Wholesale
            </p>

            <h2 className="mt-5 text-5xl font-black">
              Built for businesses that buy in volume.
            </h2>
          </div>

          <div className="flex flex-col justify-center">
            <p className="max-w-xl text-lg leading-8 text-white/65">
              Restaurants, catering businesses, hospitality teams and
              distributors can request volume pricing and custom quotes.
            </p>

            <Link
              href="/wholesale"
              className="mt-8 w-fit rounded-full bg-white px-7 py-4 text-sm font-bold text-black"
            >
              Request Wholesale Pricing
            </Link>
          </div>
        </div>
      </section>

      <section id="samples" className="mx-auto max-w-7xl px-6 py-20">
        <div className="rounded-[2rem] bg-[#e8e1d0] p-10 md:p-16">
          <p className="text-xs font-black uppercase tracking-[0.2em] text-black/40">
            Try before ordering
          </p>

          <h2 className="mt-4 max-w-2xl text-4xl font-black">
            Request Ecoware product samples.
          </h2>

          <p className="mt-5 max-w-xl leading-7 text-black/60">
            Evaluate product quality, dimensions and performance
            before placing a larger commercial order.
          </p>

          <Link
            href="/sample-request"
            className="mt-8 inline-block rounded-full bg-black px-7 py-4 text-sm font-bold text-white"
          >
            Request Samples
          </Link>
        </div>
      </section>
    </>
  );
}