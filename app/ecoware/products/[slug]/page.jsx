import Link from "next/link";
import { notFound } from "next/navigation";

import {
  getStorefrontProductBySlug,
  getStorefrontProducts,
  PUBLIC_STOREFRONTS
} from "@/lib/storefront-products";
import { createSupabaseAdmin } from "@/lib/supabase-admin";

import EcowareAddToCart from "@/components/ecoware/EcowareAddToCart";
import EcowareVolumePricing from "@/components/ecoware/EcowareVolumePricing";

/*
 * Product sections shared with Shakti Foods product pages. They are rendered
 * unchanged; Ecoware only supplies its own links and fonts around them.
 */
import ProductSpecificationsPanel from "@/components/ProductSpecificationsPanel";
import ProductCertificationsPanel from "@/components/ProductCertificationsPanel";
import ProductReviews from "@/components/ProductReviews";
import RelatedProducts from "@/components/RelatedProducts";
import SampleRequestForm from "@/components/SampleRequestForm";

// Stock, reviews and price tiers change often; always render fresh data.
export const dynamic = "force-dynamic";

// The shared sections use the display font; on Ecoware match its sans headings.
const ECOWARE_SECTION_FONT_STYLE = {
  "--font-display": "var(--font-inter), system-ui, sans-serif"
};

// Lets the shared sample form's multi-column rows shrink to narrower columns.
const SHRINKABLE_FORM_FIELDS =
  "[&_input]:w-full [&_input]:min-w-0 [&_label]:min-w-0 [&_select]:min-w-0";

/* =========================================================
   HELPERS
========================================================= */

function formatPrice(amount) {
  const value = Number(amount);

  if (!Number.isFinite(value)) {
    return "$0.00";
  }

  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD"
  }).format(value);
}

function getImageUrl(image) {
  if (!image) return "";

  if (typeof image === "string") {
    return image;
  }

  return (
    image.url ||
    image.image_url ||
    image.src ||
    image.public_url ||
    ""
  );
}

/*
 * Free samples are offered for the tableware range only; the sample request
 * API enforces the same rule.
 */
function isSampleEligible(product) {
  return (
    product?.categoryId === "tableware" ||
    product?.category === "tableware"
  );
}

function pickRelatedProducts(product, products) {
  const others = (products || []).filter(
    (item) => item && item.id !== product.id
  );

  const sameCategory = others.filter(
    (item) => item.categoryId && item.categoryId === product.categoryId
  );

  const rest = others.filter((item) => !sameCategory.includes(item));

  return [...sameCategory, ...rest].slice(0, 4);
}

/*
 * Same Supabase queries as the Shakti Foods product page. Any failure only
 * hides the affected section; the product page itself still renders.
 */
async function loadProductDetails(product) {
  const empty = {
    specifications: null,
    certifications: [],
    priceTiers: [],
    reviews: [],
    relatedProducts: []
  };

  const relatedPromise = getStorefrontProducts(PUBLIC_STOREFRONTS.ECOWARE)
    .then((products) => pickRelatedProducts(product, products))
    .catch((error) => {
      console.error("Unable to load related Ecoware products:", error);
      return [];
    });

  let supabase;

  try {
    supabase = createSupabaseAdmin();
  } catch (error) {
    console.error("Unable to load Ecoware product details:", error);

    return {
      ...empty,
      relatedProducts: await relatedPromise
    };
  }

  const [
    specificationsResult,
    certificationsResult,
    priceTiersResult,
    reviewsResult,
    relatedProducts
  ] = await Promise.all([
    supabase
      .from("product_specifications")
      .select("*")
      .eq("product_id", product.id)
      .maybeSingle(),

    supabase
      .from("product_certifications")
      .select(`
        id,
        certificate_number,
        issued_at,
        expires_at,
        document_url,
        verification_status,
        certification:certifications (
          id,
          code,
          name,
          issuing_organization,
          description,
          logo_url,
          verification_url
        )
      `)
      .eq("product_id", product.id)
      .order("created_at", { ascending: true }),

    supabase
      .from("product_price_tiers")
      .select(`
        id,
        min_quantity,
        max_quantity,
        unit_price_cents,
        tier_name,
        sort_order
      `)
      .eq("product_id", product.id)
      .eq("is_active", true)
      .order("min_quantity", { ascending: true }),

    supabase
      .from("product_reviews")
      .select(`
        id,
        customer_name,
        rating,
        review_title,
        review_text,
        verified_purchase,
        created_at
      `)
      .eq("product_id", product.id)
      .eq("status", "approved")
      .order("created_at", { ascending: false }),

    relatedPromise
  ]);

  const results = {
    specifications: specificationsResult,
    certifications: certificationsResult,
    "price tiers": priceTiersResult,
    reviews: reviewsResult
  };

  for (const [label, result] of Object.entries(results)) {
    if (result?.error) {
      console.error(`Unable to load Ecoware product ${label}:`, result.error);
    }
  }

  return {
    specifications: specificationsResult?.data || null,
    certifications: certificationsResult?.data || [],
    priceTiers: priceTiersResult?.data || [],
    reviews: reviewsResult?.data || [],
    relatedProducts: relatedProducts || []
  };
}

/* =========================================================
   ICONS
========================================================= */

function LeafIcon({ className = "h-7 w-7" }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d="M20.5 3.5C13 3.5 6.4 6.7 4.2 12.4c-1.2 3.1-.4 5.8.1 7.1" />
      <path d="M4.4 18.7C8 13.4 12.4 9.6 18.8 6.2" />
      <path d="M20.5 3.5c.3 7.1-2.6 12-7.5 13.2-3.1.8-5.8-.2-7.3-1.2" />
    </svg>
  );
}

function SugarcaneIcon({ className = "h-7 w-7" }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d="M8 21V7" />
      <path d="M12 21V3" />
      <path d="M16 21V8" />
      <path d="M8 10c-2-1-3-2.5-3-4.5 2.5 0 4.1 1 5 3" />
      <path d="M12 7c2-2 3.7-2.7 5.5-2.4-.2 2.3-1.4 3.9-3.5 4.8" />
      <path d="M16 12c1.8-1.5 3.3-2 4.6-1.6-.2 2-1.2 3.3-3.1 4" />
    </svg>
  );
}

function MicrowaveIcon({ className = "h-7 w-7" }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <rect x="6" y="8" width="9" height="8" rx="1" />
      <path d="M18 9h.01" />
      <path d="M18 12h.01" />
      <path d="M18 15h.01" />
    </svg>
  );
}

function ShieldIcon({ className = "h-7 w-7" }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d="M12 3 19 6v5c0 4.8-2.8 8.2-7 10-4.2-1.8-7-5.2-7-10V6l7-3Z" />
      <path d="m9 12 2 2 4-5" />
    </svg>
  );
}

function BuildingIcon({ className = "h-7 w-7" }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d="M5 21V4h11v17" />
      <path d="M16 9h3v12" />
      <path d="M8 8h2" />
      <path d="M8 12h2" />
      <path d="M8 16h2" />
      <path d="M13 8h.01" />
      <path d="M13 12h.01" />
      <path d="M13 16h.01" />
      <path d="M3 21h18" />
    </svg>
  );
}

/* =========================================================
   METADATA
========================================================= */

export async function generateMetadata({ params }) {
  const resolvedParams = await Promise.resolve(params);
  const slug = String(resolvedParams.slug || "").trim();

  const product = await getStorefrontProductBySlug(
    slug,
    PUBLIC_STOREFRONTS.ECOWARE
  );

  if (!product) {
    return {
      title: "Product Not Found"
    };
  }

  return {
    title: product.title,
    description:
      product.short_description ||
      product.description ||
      `Shop ${product.title} from Simpli Ecoware.`
  };
}

/* =========================================================
   PAGE
========================================================= */

export default async function EcowareProductPage({ params }) {
  const resolvedParams = await Promise.resolve(params);
  const slug = String(resolvedParams.slug || "").trim();

  if (!slug) {
    notFound();
  }

  const product = await getStorefrontProductBySlug(
    slug,
    PUBLIC_STOREFRONTS.ECOWARE
  );

  if (!product) {
    notFound();
  }

  const availableQuantity = Math.max(
    Number(product.inventory?.stock_quantity || 0) -
      Number(product.inventory?.reserved_quantity || 0),
    0
  );

  const inStock = availableQuantity > 0;
  const price = Number(product.unitPrice || 0);

  const {
    specifications,
    certifications,
    priceTiers,
    reviews,
    relatedProducts
  } = await loadProductDetails(product);

  const sampleEligible = isSampleEligible(product);

  /*
    Current Ecoware products are pack products.
    This is display-only and does not affect checkout.
  */
  const packQuantity = 50;

  const perPiecePrice =
    packQuantity > 0 ? price / packQuantity : 0;

  const category =
    product.category_name ||
    product.category ||
    "Eco-Friendly Tableware";

  const galleryImages = [];

  if (product.image) {
    galleryImages.push(product.image);
  }

  if (Array.isArray(product.images)) {
    product.images.forEach((image) => {
      const url = getImageUrl(image);

      if (url && !galleryImages.includes(url)) {
        galleryImages.push(url);
      }
    });
  }

  const primaryImage = galleryImages[0] || "";

  return (
    <main className="min-h-screen bg-[#faf8f2] text-black">
      {/* =====================================================
          HEADER CLEARANCE + BREADCRUMB

          This prevents the absolute Ecoware navbar from
          covering the product page.
      ===================================================== */}

      <div className="mx-auto max-w-[1440px] px-4 pt-[126px] sm:px-8 sm:pt-[138px] lg:px-12 lg:pt-[146px]">
        <div className="flex items-center gap-2 overflow-hidden text-[11px] font-medium text-black/45 sm:text-xs">
          <Link
            href="/ecoware"
            className="shrink-0 transition hover:text-black"
          >
            Home
          </Link>

          <span>/</span>

          <Link
            href="/ecoware/products"
            className="shrink-0 transition hover:text-black"
          >
            Products
          </Link>

          <span>/</span>

          <span className="truncate font-semibold text-black/70">
            {product.title}
          </span>
        </div>
      </div>

      {/* =====================================================
          PRODUCT HERO
      ===================================================== */}

      <section className="mx-auto max-w-[1440px] px-4 pb-12 pt-5 sm:px-8 sm:pt-7 lg:px-12 lg:pb-20">
        <div className="grid items-start gap-9 lg:grid-cols-[1.02fr_.98fr] lg:gap-14 xl:gap-20">
          {/* =================================================
              IMAGE / GALLERY
          ================================================= */}

          <div className="min-w-0">
            <div className="relative flex aspect-square w-full items-center justify-center overflow-hidden rounded-[26px] border border-black/10 bg-[#f0ede3] sm:rounded-[30px]">
              {primaryImage ? (
                <img
                  src={primaryImage}
                  alt={product.title}
                  className="h-full w-full object-contain"
                />
              ) : (
                <div className="flex h-full items-center justify-center text-sm font-semibold text-black/35">
                  Product image unavailable
                </div>
              )}

              <span
                className={`absolute right-4 top-4 inline-flex items-center gap-1.5 rounded-full bg-white/95 px-4 py-2 text-[11px] font-black shadow-sm backdrop-blur ${
                  inStock ? "text-[#397221]" : "text-black/55"
                }`}
              >
                <span
                  className={`h-1.5 w-1.5 rounded-full ${
                    inStock ? "bg-[#5b8f37]" : "bg-black/30"
                  }`}
                />

                {inStock ? "In stock" : "Out of stock"}
              </span>
            </div>

            {/* Gallery */}
            {galleryImages.length > 1 && (
              <div className="mt-4 flex items-center gap-3 overflow-x-auto pb-2">
                {galleryImages.map((image, index) => (
                  <div
                    key={`${image}-${index}`}
                    className={`flex h-[78px] w-[78px] shrink-0 items-center justify-center overflow-hidden rounded-xl border bg-white p-1 sm:h-[90px] sm:w-[90px] ${
                      index === 0
                        ? "border-black"
                        : "border-black/10"
                    }`}
                  >
                    <img
                      src={image}
                      alt={`${product.title} ${index + 1}`}
                      className="h-full w-full object-contain"
                    />
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* =================================================
              PRODUCT INFORMATION
          ================================================= */}

          <div className="min-w-0 lg:pt-2">
            <p className="text-[10px] font-black uppercase tracking-[0.28em] text-black/45 sm:text-[11px]">
              Simpli Ecoware
            </p>

            <h1 className="mt-3 max-w-[650px] break-words text-[34px] font-black leading-[0.98] tracking-[-0.045em] sm:text-[44px] lg:text-[48px] xl:text-[54px]">
              {product.title}
            </h1>

            <p className="mt-4 text-sm font-medium text-black/45">
              {category}
            </p>

            {/* ===============================================
                PRODUCT BENEFITS
            =============================================== */}

            <div className="mt-7 grid grid-cols-2 gap-x-5 gap-y-5 sm:grid-cols-4 lg:grid-cols-2 xl:grid-cols-4">
              <div className="flex items-center gap-2.5">
                <span className="shrink-0 text-[#4d7c2f]">
                  <LeafIcon className="h-7 w-7" />
                </span>

                <span className="text-[11px] font-bold leading-tight">
                  100%
                  <br />
                  Compostable
                </span>
              </div>

              <div className="flex items-center gap-2.5">
                <span className="shrink-0 text-[#4d7c2f]">
                  <SugarcaneIcon className="h-7 w-7" />
                </span>

                <span className="text-[11px] font-bold leading-tight">
                  Sugarcane
                  <br />
                  Bagasse
                </span>
              </div>

              <div className="flex items-center gap-2.5">
                <span className="shrink-0 text-[#4d7c2f]">
                  <MicrowaveIcon className="h-7 w-7" />
                </span>

                <span className="text-[11px] font-bold leading-tight">
                  Microwave
                  <br />
                  Safe
                </span>
              </div>

              <div className="flex items-center gap-2.5">
                <span className="shrink-0 text-[#4d7c2f]">
                  <ShieldIcon className="h-7 w-7" />
                </span>

                <span className="text-[11px] font-bold leading-tight">
                  Food
                  <br />
                  Safe
                </span>
              </div>
            </div>

            {/* ===============================================
                PRICE
            =============================================== */}

            <div className="mt-8 border-t border-black/10 pt-7">
              <div className="flex flex-wrap items-end gap-x-2">
                <p className="text-[36px] font-black tracking-[-0.045em] sm:text-[42px]">
                  {formatPrice(price)}
                </p>

                <p className="mb-1 text-base font-semibold text-black/70 sm:text-lg">
                  / {packQuantity} pcs
                </p>
              </div>

              <p className="mt-1 text-sm font-medium text-black/45">
                {formatPrice(perPiecePrice)} per piece
              </p>
            </div>

            {/* ===============================================
                STOCK
            =============================================== */}

            <div className="mt-6 flex flex-wrap items-center gap-3">
              <span
                className={`inline-flex rounded-full px-5 py-2 text-xs font-black ${
                  inStock
                    ? "bg-[#5a9a32] text-white"
                    : "bg-black/10 text-black/60"
                }`}
              >
                {inStock ? "In Stock" : "Out of Stock"}
              </span>

              <span className="text-xs font-medium text-black/45">
                {inStock
                  ? `${availableQuantity} units currently available`
                  : "Currently unavailable"}
              </span>
            </div>

            {/* ===============================================
                PURCHASE CARD
            =============================================== */}

            <div className="mt-7 rounded-[22px] border border-black/10 bg-white p-4 shadow-[0_12px_45px_rgba(0,0,0,0.05)] sm:p-5">
              <EcowareAddToCart
                product={{
                  id:
                    product.id ||
                    product.product_id,

                  slug: product.slug,

                  name:
                    product.name ||
                    product.title,

                  title:
                    product.title ||
                    product.name,

                  image: product.image,

                  unitPrice: price,

                  storefront: "ecoware"
                }}
                availableStock={availableQuantity}
                disabled={!inStock}
              />
            </div>

            <EcowareVolumePricing
              priceTiers={priceTiers}
              regularUnitPrice={price}
            />

            {/* ===============================================
                SAMPLE + WHOLESALE
            =============================================== */}

            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <Link
                href="#samples"
                className="group rounded-[20px] border border-[#dbe3ce] bg-[#f1f6e8] p-5 transition hover:-translate-y-0.5 hover:shadow-md"
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <span className="text-[#4d7c2f]">
                      <LeafIcon className="h-7 w-7" />
                    </span>

                    <p className="mt-3 text-sm font-black">
                      Request a Sample
                    </p>

                    <p className="mt-1 text-xs leading-5 text-black/50">
                      Evaluate this product before ordering in volume.
                    </p>
                  </div>

                  <span className="mt-2 text-xl transition-transform group-hover:translate-x-1">
                    →
                  </span>
                </div>
              </Link>

              <Link
                href="/ecoware#wholesale"
                className="group rounded-[20px] border border-[#eadcc1] bg-[#fbf2df] p-5 transition hover:-translate-y-0.5 hover:shadow-md"
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <span className="text-[#9b6819]">
                      <BuildingIcon className="h-7 w-7" />
                    </span>

                    <p className="mt-3 text-sm font-black">
                      Wholesale Pricing
                    </p>

                    <p className="mt-1 text-xs leading-5 text-black/50">
                      Request commercial or bulk pricing.
                    </p>
                  </div>

                  <span className="mt-2 text-xl transition-transform group-hover:translate-x-1">
                    →
                  </span>
                </div>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* =====================================================
          PRODUCT DETAILS
      ===================================================== */}

      {(product.description || product.short_description) && (
        <section className="border-t border-black/10 bg-[#faf8f2]">
          <div className="mx-auto max-w-[1440px] px-4 py-12 sm:px-8 sm:py-16 lg:px-12 lg:py-20">
            <div className="grid gap-7 lg:grid-cols-[300px_minmax(0,1fr)] lg:gap-20">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.26em] text-black/40">
                  Product Details
                </p>

                <h2 className="mt-3 text-[28px] font-black tracking-[-0.035em] sm:text-[32px]">
                  About this product
                </h2>

                <div className="mt-4 h-[3px] w-10 rounded-full bg-[#4d7c2f]" />
              </div>

              <div className="max-w-[800px]">
                <div className="whitespace-pre-line text-[15px] leading-7 text-black/60 sm:text-base sm:leading-8">
                  {product.description ||
                    product.short_description}
                </div>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* =====================================================
          SPECIFICATIONS, CERTIFICATIONS, SAMPLES, REVIEWS,
          RELATED PRODUCTS (sections shared with Shakti Foods)
      ===================================================== */}

      <section
        className="border-t border-black/10 bg-[#f4f1e8]"
        style={ECOWARE_SECTION_FONT_STYLE}
      >
        <div className="mx-auto grid max-w-[1440px] gap-6 px-4 py-12 sm:px-8 sm:py-16 lg:px-12 lg:py-20">
          {specifications ? (
            <ProductSpecificationsPanel
              specifications={specifications}
            />
          ) : null}

          <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,400px)]">
            <div
              id="samples"
              className={`min-w-0 scroll-mt-8 ${SHRINKABLE_FORM_FIELDS}`}
            >
              {sampleEligible ? (
                <SampleRequestForm
                  productId={product.id}
                  productName={product.title}
                />
              ) : (
                <div className="rounded-[2rem] bg-white p-6 shadow-soft">
                  <p className="text-xs font-bold uppercase tracking-[.18em] text-black/50">
                    Samples
                  </p>

                  <h2 className="mt-2 text-2xl font-black tracking-[-0.03em]">
                    Samples aren&apos;t offered for this product
                  </h2>

                  <p className="mt-3 text-sm leading-6 text-black/60">
                    Free samples are available for our tableware range.
                  </p>

                  <Link
                    href="/ecoware/sample-requests"
                    className="mt-5 inline-flex min-h-[48px] items-center justify-center rounded-full bg-black px-6 text-sm font-black text-white transition hover:bg-black/80"
                  >
                    See sample-eligible products
                  </Link>
                </div>
              )}
            </div>

            <ProductCertificationsPanel
              certifications={certifications}
            />
          </div>

          <ProductReviews
            productId={product.id}
            productName={product.title}
            reviews={reviews}
          />

          <RelatedProducts
            products={relatedProducts}
            basePath="/ecoware"
          />
        </div>
      </section>

      {/* =====================================================
          BOTTOM ECO CTA
      ===================================================== */}

      <section
        className="
          relative
          overflow-hidden
          bg-[#173a18]
          bg-[linear-gradient(90deg,rgba(15,48,17,0.97),rgba(28,77,27,0.82)),url('/images/ecoware-body-bg.png')]
          bg-cover
          bg-center
        "
      >
        <div className="mx-auto max-w-[1440px] px-4 py-12 text-white sm:px-8 sm:py-16 lg:px-12 lg:py-20">
          <p className="text-[11px] font-black uppercase tracking-[0.3em] text-white/75">
            Built for everyday meals
          </p>

          <h2 className="mt-3 max-w-2xl text-[36px] font-black leading-none tracking-[-0.04em] sm:text-[48px]">
            Better for the planet.
          </h2>

          <p className="mt-4 max-w-xl text-sm leading-7 text-white/75 sm:text-base">
            Plant-based food-service products designed for everyday meals,
            restaurants, catering and commercial use.
          </p>

          <div className="mt-7 flex flex-col gap-3 sm:flex-row">
            <Link
              href="/ecoware/products"
              className="inline-flex min-h-[52px] items-center justify-center rounded-full bg-white px-7 text-sm font-black text-black transition hover:bg-white/90"
            >
              Shop All Products
              <span className="ml-2">→</span>
            </Link>

            <Link
              href="/ecoware#wholesale"
              className="inline-flex min-h-[52px] items-center justify-center rounded-full border border-white/70 px-7 text-sm font-black text-white transition hover:bg-white hover:text-black"
            >
              Request Wholesale Pricing
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}