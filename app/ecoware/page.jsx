import Link from "next/link";

import {
  getStorefrontProducts,
  PUBLIC_STOREFRONTS
} from "@/lib/storefront-products";

/* =========================================================
   HELPERS
========================================================= */

function formatPrice(price) {
  const value = Number(price);

  if (!Number.isFinite(value) || value <= 0) {
    return null;
  }

  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD"
  }).format(value);
}

/* =========================================================
   FEATURE ICONS
========================================================= */

function LeafIcon() {
  return (
    <svg
      viewBox="0 0 48 48"
      aria-hidden="true"
      className="h-9 w-9"
      fill="none"
    >
      <path
        d="M39 7C24 8 12 14 8 28c7 2 15 1 21-4 7-6 9-12 10-17Z"
        fill="currentColor"
      />
      <path
        d="M7 39c6-10 13-17 25-24"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
      />
    </svg>
  );
}

function FoodServiceIcon() {
  return (
    <svg
      viewBox="0 0 48 48"
      aria-hidden="true"
      className="h-9 w-9"
      fill="none"
      stroke="currentColor"
      strokeWidth="3"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M10 6v13M15 6v13M20 6v13M10 14h10M15 19v23" />
      <path d="M34 6v36" />
      <path d="M34 6c-6 5-7 14 0 18" />
    </svg>
  );
}

function BoxIcon() {
  return (
    <svg
      viewBox="0 0 48 48"
      aria-hidden="true"
      className="h-9 w-9"
      fill="none"
      stroke="currentColor"
      strokeWidth="3"
      strokeLinejoin="round"
    >
      <path d="m24 5 16 8-16 8-16-8 16-8Z" />
      <path d="m8 13 16 8 16-8v21l-16 9-16-9V13Z" />
      <path d="M24 21v22" />
    </svg>
  );
}

function SproutIcon() {
  return (
    <svg
      viewBox="0 0 48 48"
      aria-hidden="true"
      className="h-9 w-9"
      fill="none"
      stroke="currentColor"
      strokeWidth="3"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M24 42V22" />
      <path d="M24 27C13 27 8 21 7 11c10 0 16 5 17 16Z" />
      <path d="M25 23c1-10 7-15 17-15-1 10-6 16-17 15Z" />
    </svg>
  );
}

const FEATURES = [
  {
    number: "01",
    title: "Compostable Options",
    text: "Good for people and the planet",
    Icon: LeafIcon
  },
  {
    number: "02",
    title: "Food Service Ready",
    text: "Built for everyday use",
    Icon: FoodServiceIcon
  },
  {
    number: "03",
    title: "Bulk Ordering",
    text: "For restaurants and businesses",
    Icon: BoxIcon
  },
  {
    number: "04",
    title: "Samples Available",
    text: "Try before you buy",
    Icon: SproutIcon
  }
];

/* =========================================================
   PAGE
========================================================= */

export default async function EcowareHomePage() {
  const products = await getStorefrontProducts(
    PUBLIC_STOREFRONTS.ECOWARE
  );

  const featuredProducts = products.slice(0, 4);

  return (
    <main className="overflow-hidden bg-[#f8f5ed]">

      {/* =========================================================
          HERO
          The background starts at y=0, so it continues behind
          the floating navbar.
      ========================================================= */}
      <section
        className="
          relative
          min-h-[760px]
          overflow-hidden
          bg-cover
          bg-center
          bg-no-repeat
          sm:min-h-[760px]
          lg:min-h-[760px]
        "
        style={{
          backgroundImage: "url('/images/ecoware-hero.jpg')"
        }}
      >
        {/* Dark overlay for readability */}
        <div className="absolute inset-0 bg-black/30" />

        {/* Slight gradient behind text */}
        <div
          className="
            absolute inset-0
            bg-gradient-to-r
            from-black/55
            via-black/15
            to-transparent
          "
        />

        {/* HERO CONTENT */}
        <div
          className="
            relative z-10
            mx-auto flex
            min-h-[760px]
            max-w-7xl
            items-center
            px-6
            pb-16
            pt-36
            sm:px-8
            sm:pt-40
            lg:px-10
            lg:pt-44
          "
        >
          <div className="max-w-[760px]">
            <p
              className="
                text-xs
                font-black
                uppercase
                tracking-[0.28em]
                text-white
                sm:text-sm
              "
            >
              SIMPLI ECOWARE
            </p>

            <h1
              className="
                mt-7
                max-w-[760px]
                text-[52px]
                font-black
                leading-[0.88]
                tracking-[-0.055em]
                text-white
                sm:text-[68px]
                lg:text-[82px]
              "
            >
              Better
              <br />
              tableware.
              <br />
              Smaller
              <br />
              footprint.
            </h1>

            <p
              className="
                mt-8
                max-w-[650px]
                text-[17px]
                font-medium
                leading-7
                text-white/95
                sm:text-lg
                lg:text-xl
                lg:leading-8
              "
            >
              Sustainable plates, bowls, trays and food-service packaging built
              for everyday meals, events, restaurants and wholesale operations.
            </p>

            <div className="mt-9 flex flex-wrap gap-3">
              <Link
                href="/ecoware/products"
                className="
                  inline-flex min-h-[54px]
                  items-center justify-center
                  rounded-full
                  bg-black
                  px-8
                  text-sm font-black
                  text-white
                  transition
                  hover:scale-[1.02]
                  hover:bg-black/85
                "
              >
                Shop Products
              </Link>

              <Link
                href="/ecoware#wholesale"
                className="
                  inline-flex min-h-[54px]
                  items-center justify-center
                  rounded-full
                  border border-white
                  bg-white/10
                  px-8
                  text-sm font-black
                  text-white
                  backdrop-blur-sm
                  transition
                  hover:bg-white hover:text-black
                "
              >
                Wholesale
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* =====================================================
          FEATURES
      ===================================================== */}

      <section className="border-y border-black/10 bg-[#faf8f2]">
        <div
          className="
            mx-auto
            grid
            max-w-[1440px]
            grid-cols-2
            lg:grid-cols-4
          "
        >
          {FEATURES.map(({ number, title, text, Icon }) => (
            <div
              key={number}
              className="
                flex
                min-h-[126px]
                items-center
                gap-4
                border-black/10
                px-5
                py-5
                odd:border-r
                max-lg:border-b
                sm:px-7
                lg:border-r
                lg:px-8
                lg:py-0
                lg:last:border-r-0
              "
            >
              <div className="shrink-0 text-[#4f7d32]">
                <Icon />
              </div>

              <div>
                <p className="text-[10px] font-medium text-black/45">
                  {number}
                </p>

                <p className="mt-1 text-[13px] font-black leading-tight text-black sm:text-[14px]">
                  {title}
                </p>

                <p className="mt-1 text-[11px] leading-tight text-black/55 sm:text-[12px]">
                  {text}
                </p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* =====================================================
          FEATURED PRODUCTS
      ===================================================== */}
      <section
        className="
          relative
          overflow-hidden
          bg-cover
          bg-center
          bg-no-repeat
        "
        style={{
          backgroundImage: "url('/images/ecoware-products-bg.jpg')"
        }}
      >
        {/* Dark overlay — keeps second background visible */}
        <div className="absolute inset-0 bg-black/35" />

        {/* Subtle top/bottom depth */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/10 via-transparent to-black/30" />

        <div
          className="
            relative
            mx-auto
            max-w-[1440px]
            px-5
            py-14
            sm:px-8
            sm:py-16
            lg:px-12
            lg:py-20
          "
        >
          {/* ===============================================
              SECTION HEADER
          =============================================== */}
          <div
            className="
              flex
              flex-col
              gap-6
              sm:flex-row
              sm:items-end
              sm:justify-between
            "
          >
            <div>
              <p
                className="
                  text-[11px]
                  font-black
                  uppercase
                  tracking-[0.3em]
                  text-white/80
                  sm:text-[12px]
                "
              >
                Shop Ecoware
              </p>

              <h2
                className="
                  mt-3
                  text-[38px]
                  font-black
                  leading-[0.95]
                  tracking-[-0.045em]
                  text-white
                  sm:text-[44px]
                  lg:text-[52px]
                "
              >
                Featured products
              </h2>

              <p
                className="
                  mt-4
                  text-[15px]
                  font-medium
                  text-white/85
                  sm:text-[16px]
                "
              >
                Sustainable solutions for every table.
              </p>
            </div>

            <Link
              href="/ecoware/products"
              className="
                flex
                h-[46px]
                w-fit
                items-center
                justify-center
                rounded-full
                bg-white
                px-6
                text-[12px]
                font-black
                text-black
                shadow-lg
                transition
                duration-200
                hover:scale-[1.02]
                hover:bg-white/90
                sm:px-7
                sm:text-[13px]
              "
            >
              View all products
              <span className="ml-2 text-lg leading-none">→</span>
            </Link>
          </div>

          {/* ===============================================
              PRODUCTS
          =============================================== */}

          {featuredProducts.length === 0 ? (
            <div
              className="
                mt-10
                rounded-[22px]
                border
                border-white/20
                bg-white/95
                p-8
                sm:p-10
              "
            >
              <p className="font-bold text-black">
                No active Ecoware products found.
              </p>
            </div>
          ) : (
            <div
              className="
                mt-10
                grid
                grid-cols-1
                gap-5
                min-[520px]:grid-cols-2
                lg:grid-cols-4
              "
            >
              {featuredProducts.map((product) => {
                const price = formatPrice(
                  product.unitPrice ?? product.price
                );

                return (
                  <Link
                    key={
                      product.id ||
                      product.productId ||
                      product.slug
                    }
                    href={`/ecoware/products/${product.slug}`}
                    className="
                      group
                      flex
                      min-w-0
                      flex-col
                      overflow-hidden
                      rounded-[22px]
                      bg-white
                      p-3
                      shadow-[0_16px_45px_rgba(0,0,0,0.22)]
                      transition
                      duration-300
                      hover:-translate-y-1.5
                      hover:shadow-[0_22px_55px_rgba(0,0,0,0.28)]
                    "
                  >
                    {/* PRODUCT IMAGE */}
                    <div
                      className="
                        relative
                        flex
                        h-[390px]
                        w-full
                        items-center
                        justify-center
                        overflow-hidden
                        rounded-[17px]
                        bg-[#f4f0e5]
                        sm:h-[420px]
                        lg:h-[390px]
                      "
                    >
                      <img
                        src={product.image}
                        alt={product.title}
                        className="
                          block
                          h-full
                          w-full
                          object-contain
                          transition-transform
                          duration-500
                          ease-out
                          group-hover:scale-[1.02]
                        "
                      />

                      {/* Stock badge */}
                      <div className="absolute right-3 top-3">
                        {product.inStock ? (
                          <span
                            className="
                              rounded-full
                              bg-white/95
                              px-3
                              py-1.5
                              text-[10px]
                              font-black
                              text-[#47732d]
                              shadow-sm
                              backdrop-blur
                            "
                          >
                            In stock
                          </span>
                        ) : (
                          <span
                            className="
                              rounded-full
                              bg-black/80
                              px-3
                              py-1.5
                              text-[10px]
                              font-black
                              text-white
                            "
                          >
                            Out of stock
                          </span>
                        )}
                      </div>
                    </div>

                    {/* PRODUCT CONTENT */}
                    <div className="flex flex-1 flex-col px-2 pb-2 pt-5">
                      <p
                        className="
                          text-[9px]
                          font-black
                          uppercase
                          tracking-[0.22em]
                          text-black/40
                        "
                      >
                        Simpli Ecoware
                      </p>

                      <h3
                        className="
                          mt-2
                          text-[16px]
                          font-black
                          leading-[1.25]
                          tracking-[-0.02em]
                          text-black
                          sm:text-[17px]
                        "
                      >
                        {product.title}
                      </h3>

                      <div
                        className="
                          mt-auto
                          flex
                          items-end
                          justify-between
                          gap-3
                          pt-5
                        "
                      >
                        <div>
                          <p
                            className="
                              text-[9px]
                              font-bold
                              uppercase
                              tracking-[0.12em]
                              text-black/35
                            "
                          >
                            Price
                          </p>

                          {price ? (
                            <p
                              className="
                                mt-1
                                text-[18px]
                                font-black
                                tracking-[-0.02em]
                                text-black
                              "
                            >
                              {price}
                            </p>
                          ) : (
                            <p className="mt-1 text-[12px] font-bold text-black/50">
                              Contact for pricing
                            </p>
                          )}
                        </div>

                        <div
                          className="
                            flex
                            h-10
                            w-10
                            shrink-0
                            items-center
                            justify-center
                            rounded-full
                            bg-black
                            text-[18px]
                            font-bold
                            text-white
                            transition
                            duration-300
                            group-hover:translate-x-1
                          "
                        >
                          →
                        </div>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      </section>

      {/* =====================================================
          WHOLESALE
      ===================================================== */}

      <section
        id="wholesale"
        className="bg-[#111111] text-white"
      >
        <div
          className="
            mx-auto
            grid
            max-w-[1280px]
            gap-12
            px-5
            py-16
            sm:px-8
            sm:py-20
            lg:grid-cols-2
          "
        >
          <div>
            <p
              className="
                text-[11px]
                font-black
                uppercase
                tracking-[0.25em]
                text-white/45
              "
            >
              B2B / Wholesale
            </p>

            <h2
              className="
                mt-5
                max-w-xl
                text-3xl
                font-black
                leading-tight
                tracking-tight
                sm:text-4xl
                md:text-5xl
              "
            >
              Built for businesses
              <br />
              that buy in volume.
            </h2>
          </div>

          <div className="flex flex-col justify-center">

            <p
              className="
                max-w-xl
                text-[15px]
                leading-7
                text-white/65
                sm:text-[17px]
                sm:leading-8
              "
            >
              Restaurants, catering businesses, hospitality teams
              and distributors can request volume pricing and custom
              quotes.
            </p>

            <Link
              href="/ecoware/wholesale/quote"
              className="
                mt-8
                flex
                h-[48px]
                w-fit
                items-center
                rounded-full
                bg-white
                px-7
                text-[13px]
                font-black
                text-black
                transition
                hover:bg-white/85
              "
            >
              Request Wholesale Pricing
            </Link>

          </div>
        </div>
      </section>

      {/* =====================================================
          SAMPLES
      ===================================================== */}

      <section
        id="samples"
        className="bg-[#f8f5ed] px-5 py-14 sm:px-8 sm:py-20"
      >
        <div className="mx-auto max-w-[1280px]">

          <div
            className="
              rounded-[24px]
              bg-[#e8e1d0]
              p-6
              sm:rounded-[30px]
              sm:p-10
              md:p-14
            "
          >
            <div className="max-w-2xl">

              <div className="text-[#527b32]">
                <SproutIcon />
              </div>

              <p
                className="
                  mt-5
                  text-[11px]
                  font-black
                  uppercase
                  tracking-[0.22em]
                  text-black/40
                "
              >
                Try before ordering
              </p>

              <h2
                className="
                  mt-4
                  text-3xl
                  font-black
                  tracking-tight
                  sm:text-4xl
                "
              >
                Request Ecoware
                <br />
                product samples.
              </h2>

              <p
                className="
                  mt-5
                  max-w-xl
                  text-[14px]
                  leading-6
                  text-black/60
                  sm:text-[16px]
                  sm:leading-7
                "
              >
                Evaluate product quality, dimensions and performance
                before placing a larger commercial order.
              </p>

              <Link
                href="/ecoware/sample-requests"
                className="
                  mt-8
                  flex
                  h-[48px]
                  w-fit
                  items-center
                  rounded-full
                  bg-black
                  px-7
                  text-[13px]
                  font-black
                  text-white
                  transition
                  hover:bg-black/80
                "
              >
                Request Samples
              </Link>

            </div>
          </div>
        </div>
      </section>

    </main>
  );
}