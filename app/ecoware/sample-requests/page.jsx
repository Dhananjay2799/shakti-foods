import Link from "next/link";

import {
  getStorefrontProducts,
  PUBLIC_STOREFRONTS
} from "@/lib/storefront-products";

import EcowareSampleRequestPicker from "@/components/ecoware/EcowareSampleRequestPicker";

/*
 * Free sample requests for Simpli Ecoware (linked from the home page
 * "Request Samples" button). Submissions use the same form and API as the
 * product pages: POST /api/sample-requests.
 */

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Request Samples",
  description:
    "Request free Simpli Ecoware samples to evaluate product quality, dimensions and performance before placing a larger commercial order."
};

// The sample request API accepts tableware products only.
function isSampleEligible(product) {
  return (
    product?.categoryId === "tableware" ||
    product?.category === "tableware"
  );
}

async function loadSampleProducts() {
  try {
    const products = await getStorefrontProducts(
      PUBLIC_STOREFRONTS.ECOWARE
    );

    return products.filter(isSampleEligible).map((product) => ({
      id: product.id,
      slug: product.slug,
      name: product.title || product.name,
      image: product.image || ""
    }));
  } catch (error) {
    console.error("Unable to load Ecoware sample products:", error);
    return [];
  }
}

export default async function EcowareSampleRequestsPage({ searchParams }) {
  const resolvedSearchParams = await Promise.resolve(searchParams || {});
  const requested = String(resolvedSearchParams.product || "")
    .trim()
    .toLowerCase();

  const products = await loadSampleProducts();

  // ?product= accepts a product slug or id, e.g. from a product page link.
  const initialProduct = products.find(
    (product) =>
      String(product.slug || "").toLowerCase() === requested ||
      String(product.id || "").toLowerCase() === requested
  );

  return (
    <main className="min-h-screen bg-[#faf8f2] text-black">
      <div className="mx-auto max-w-[1440px] px-4 pb-16 pt-[126px] sm:px-8 sm:pt-[138px] lg:px-12 lg:pb-24 lg:pt-[146px]">
        <div className="flex items-center gap-2 text-[11px] font-medium text-black/45 sm:text-xs">
          <Link href="/ecoware" className="transition hover:text-black">
            Home
          </Link>

          <span>/</span>

          <span className="font-semibold text-black/70">Request Samples</span>
        </div>

        <div className="mt-6 grid gap-10 lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)] lg:gap-16">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.28em] text-[#4d7c2f] sm:text-[11px]">
              Try before ordering
            </p>

            <h1 className="mt-3 text-[38px] font-black leading-[0.95] tracking-[-0.045em] sm:text-[48px] lg:text-[56px]">
              Request Ecoware product samples.
            </h1>

            <p className="mt-5 max-w-xl text-[15px] leading-7 text-black/60 sm:text-base sm:leading-8">
              Evaluate product quality, dimensions and performance before
              placing a larger commercial order. Choose a product, tell us
              about your business, and our team will review your request.
            </p>

            <ul className="mt-7 grid gap-3 text-sm text-black/65">
              <li className="flex gap-3">
                <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-[#5b8f37]" />
                Built for restaurants, caterers, schools, event companies,
                food trucks and other organizations.
              </li>

              <li className="flex gap-3">
                <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-[#5b8f37]" />
                Every request is reviewed by our team before samples are sent.
              </li>

              <li className="flex gap-3">
                <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-[#5b8f37]" />
                Ready to order in volume?{" "}
                <Link
                  href="/ecoware/wholesale/quote"
                  className="font-bold text-black underline underline-offset-4"
                >
                  Request wholesale pricing
                </Link>
              </li>
            </ul>
          </div>

          <EcowareSampleRequestPicker
            products={products}
            initialProductId={initialProduct?.id || ""}
          />
        </div>
      </div>
    </main>
  );
}
