import Link from "next/link";

import {
  getStorefrontProducts,
  getStorefrontCategories,
  PUBLIC_STOREFRONTS
} from "@/lib/storefront-products";

/* =====================================================
   PRICE
===================================================== */

function formatPrice(value) {
  const amount = Number(value);

  if (!Number.isFinite(amount)) {
    return null;
  }

  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD"
  }).format(amount);
}

/* =====================================================
   METADATA
===================================================== */

export const metadata = {
  title: "Products",
  description:
    "Shop sustainable Simpli Ecoware plates, bowls, trays and food-service packaging."
};

/* =====================================================
   PAGE
===================================================== */

export default async function EcowareProductsPage({ searchParams }) {
  const queryParams = await Promise.resolve(searchParams || {});

  const selectedCategory = String(
    queryParams.category || ""
  ).trim();

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
    <main className="bg-[#f8f6ef]">

      {/* =================================================
          PAGE HEADER
      ================================================= */}

      <section className="border-b border-black/10 bg-[#f8f6ef]">
        <div
          className="
            mx-auto
            max-w-[1440px]
            px-5
            pb-10
            pt-[132px]
            sm:px-8
            sm:pb-12
            sm:pt-[140px]
            lg:px-12
            lg:pb-14
            lg:pt-[150px]
          "
        >
          <p
            className="
              text-[11px]
              font-black
              uppercase
              tracking-[0.28em]
              text-black/45
            "
          >
            Simpli Ecoware
          </p>

          <h1
            className="
              mt-3
              text-[42px]
              font-black
              leading-[0.95]
              tracking-[-0.045em]
              text-black
              sm:text-[54px]
              lg:text-[64px]
            "
          >
            Products
          </h1>

          <p
            className="
              mt-5
              max-w-[650px]
              text-[15px]
              leading-[1.6]
              text-black/60
              sm:text-[16px]
            "
          >
            Sustainable plates, bowls, trays and food-service
            solutions for home, hospitality and commercial use.
          </p>

          {/* =============================================
              CATEGORY FILTERS
          ============================================= */}

          <div className="mt-8 flex flex-wrap gap-2.5">
            <Link
              href="/ecoware/products"
              className={`
                flex
                h-[42px]
                items-center
                justify-center
                rounded-full
                px-5
                text-[13px]
                font-black
                transition
                duration-200
                ${
                  !selectedCategory
                    ? "bg-black text-white"
                    : "border border-black/15 bg-white text-black hover:border-black"
                }
              `}
            >
              All
            </Link>

            {categories.map((category) => {
              const active =
                selectedCategory === category.slug;

              return (
                <Link
                  key={
                    category.id ||
                    category.category_id ||
                    category.slug
                  }
                  href={`/ecoware/products?category=${encodeURIComponent(
                    category.slug
                  )}`}
                  className={`
                    flex
                    h-[42px]
                    items-center
                    justify-center
                    rounded-full
                    px-5
                    text-[13px]
                    font-black
                    transition
                    duration-200
                    ${
                      active
                        ? "bg-black text-white"
                        : "border border-black/15 bg-white text-black hover:border-black"
                    }
                  `}
                >
                  {category.name}
                </Link>
              );
            })}
          </div>
        </div>
      </section>

      {/* =================================================
          PRODUCT GRID
      ================================================= */}

      <section>
        <div
          className="
            mx-auto
            max-w-[1440px]
            px-5
            py-10
            sm:px-8
            sm:py-12
            lg:px-12
            lg:py-16
          "
        >
          {/* Product count */}

          <div className="mb-6 flex items-center justify-between">
            <p className="text-[13px] font-bold text-black/50">
              {visibleProducts.length}{" "}
              {visibleProducts.length === 1
                ? "product"
                : "products"}
            </p>

            {selectedCategory && (
              <Link
                href="/ecoware/products"
                className="text-[12px] font-black underline underline-offset-4"
              >
                Clear filter
              </Link>
            )}
          </div>

          {visibleProducts.length > 0 ? (
            <div
              className="
                grid
                grid-cols-1
                gap-5
                min-[560px]:grid-cols-2
                lg:grid-cols-3
                xl:gap-6
              "
            >
              {visibleProducts.map((product) => {
                const price = formatPrice(
                  product.unitPrice ?? product.price
                );

                return (
                  <Link
                    key={
                      product.id ||
                      product.productId ||
                      product.product_id ||
                      product.slug
                    }
                    href={`/ecoware/products/${product.slug}`}
                    className="
                      group
                      flex
                      min-w-0
                      flex-col
                      overflow-hidden
                      rounded-[24px]
                      border
                      border-black/10
                      bg-white
                      p-3
                      shadow-[0_6px_25px_rgba(0,0,0,0.04)]
                      transition
                      duration-300
                      hover:-translate-y-1
                      hover:border-black/20
                      hover:shadow-[0_18px_45px_rgba(0,0,0,0.10)]
                    "
                  >

                    {/* =====================================
                        PRODUCT IMAGE
                    ===================================== */}

                    <div
                      className="
                        relative
                        flex
                        aspect-square
                        w-full
                        items-center
                        justify-center
                        overflow-hidden
                        rounded-[18px]
                        bg-[#f4f0e5]
                      "
                    >
                      {product.image ? (
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
                      ) : (
                        <div
                          className="
                            flex
                            h-full
                            w-full
                            items-center
                            justify-center
                            px-6
                            text-center
                            text-[12px]
                            font-bold
                            text-black/35
                          "
                        >
                          Product image coming soon
                        </div>
                      )}

                      {/* STOCK BADGE */}

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

                    {/* =====================================
                        PRODUCT INFORMATION
                    ===================================== */}

                    <div
                      className="
                        flex
                        flex-1
                        flex-col
                        px-2
                        pb-2
                        pt-5
                      "
                    >
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

                      <h2
                        className="
                          mt-2
                          text-[17px]
                          font-black
                          leading-[1.25]
                          tracking-[-0.02em]
                          text-black
                          sm:text-[18px]
                        "
                      >
                        {product.title}
                      </h2>

                      <p
                        className="
                          mt-2
                          text-[12px]
                          font-medium
                          text-black/45
                        "
                      >
                        {product.category_name ||
                          product.category ||
                          "Eco-Friendly Tableware"}
                      </p>

                      {/* PRICE + ARROW */}

                      <div
                        className="
                          mt-auto
                          flex
                          items-end
                          justify-between
                          gap-4
                          pt-6
                        "
                      >
                        <div>
                          <p
                            className="
                              text-[9px]
                              font-bold
                              uppercase
                              tracking-[0.14em]
                              text-black/35
                            "
                          >
                            Price
                          </p>

                          {price ? (
                            <p
                              className="
                                mt-1
                                text-[19px]
                                font-black
                                tracking-[-0.02em]
                                text-black
                              "
                            >
                              {price}
                            </p>
                          ) : (
                            <p
                              className="
                                mt-1
                                text-[12px]
                                font-bold
                                text-black/50
                              "
                            >
                              Contact for pricing
                            </p>
                          )}
                        </div>

                        <div
                          className="
                            flex
                            h-[42px]
                            w-[42px]
                            shrink-0
                            items-center
                            justify-center
                            rounded-full
                            bg-black
                            text-[18px]
                            font-black
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
          ) : (
            /* =============================================
                EMPTY STATE
            ============================================= */

            <div
              className="
                rounded-[24px]
                border
                border-black/10
                bg-white
                px-6
                py-16
                text-center
              "
            >
              <p className="text-[20px] font-black">
                No products found
              </p>

              <p className="mt-2 text-sm text-black/50">
                There are currently no products available in
                this category.
              </p>

              <Link
                href="/ecoware/products"
                className="
                  mt-6
                  inline-flex
                  h-[46px]
                  items-center
                  justify-center
                  rounded-full
                  bg-black
                  px-6
                  text-[13px]
                  font-black
                  text-white
                "
              >
                View all products
              </Link>
            </div>
          )}
        </div>
      </section>
    </main>
  );
}