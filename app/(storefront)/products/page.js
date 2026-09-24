import {
  Leaf,
  ShieldCheck,
  Sparkles,
  Wheat,
} from "lucide-react";

import ProductCatalogSearch from "@/components/ProductCatalogSearch";
import ProductWholesaleSection from "@/components/ProductWholesaleSection";
import {
  getStorefrontProducts,
  PUBLIC_STOREFRONTS,
} from "@/lib/storefront-products";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Premium Basmati Rice | Shakti Foods",
  description:
    "Shop Shakti Foods premium Basmati rice in family, everyday, and wholesale pack sizes.",
};

const benefits = [
  {
    title: "Naturally Aged",
    icon: Leaf,
  },
  {
    title: "Extra Long Grain",
    icon: Wheat,
  },
  {
    title: "Premium Quality",
    icon: Sparkles,
  },
  {
    title: "Trusted by Families",
    icon: ShieldCheck,
  },
];

const productHighlights = [
  {
    title: "Naturally Aged",
    text: "Time brings out the extraordinary.",
    icon: Leaf,
  },
  {
    title: "Extra Long Grain",
    text: "Elegant grains. Exceptional dining.",
    icon: Wheat,
  },
  {
    title: "Premium Quality",
    text: "A higher standard in every grain.",
    icon: Sparkles,
  },
  {
    title: "Trusted by Families",
    text: "Around the world.",
    icon: ShieldCheck,
  },
];

export default async function ProductsPage() {
  const products = await getStorefrontProducts(
    PUBLIC_STOREFRONTS.SHAKTI
  );

  return (
    <main className="overflow-hidden bg-[#fffaf2] text-[#17120f]">
      {/* =====================================================
          PRODUCTS HERO
      ====================================================== */}

      <section
        className="
          relative
          overflow-hidden
          bg-[#fffaf2]
          pb-0
          pt-[112px]

          sm:pt-[118px]
          lg:pt-[116px]
        "
      >
        {/* =================================================
            DESKTOP HERO BACKGROUND
        ================================================== */}

        <div className="absolute inset-0 hidden md:block">
          <img
            src="/images/shakti-hero.jpg"
            alt="Shakti Foods Premium Basmati Rice"
            className="
              h-full
              w-full
              object-cover
              object-[67%_0%]
            "
          />

          {/* Left cream reading area */}
          <div
            className="
              absolute
              inset-0
              bg-[linear-gradient(90deg,#fffaf2_0%,#fffaf2_27%,rgba(255,250,242,0.98)_34%,rgba(255,250,242,0.90)_40%,rgba(255,250,242,0.62)_47%,rgba(255,250,242,0.18)_55%,transparent_64%)]
            "
          />
        </div>

        {/* =================================================
            MOBILE BACKGROUND
        ================================================== */}

        <div className="absolute inset-0 md:hidden">
          <img
            src="/images/shakti-products-hero-mobile.jpg"
            alt="Shakti Foods Premium Basmati Rice"
            className="
              h-full
              w-full
              object-cover
              object-[72%_center]
            "
          />

          {/* Mobile text readability layer */}
          <div
            className="
              absolute
              inset-x-0
              top-0
              h-[385px]
              bg-[linear-gradient(180deg,rgba(255,250,242,0.97)_0%,rgba(255,250,242,0.91)_30%,rgba(255,250,242,0.67)_61%,rgba(255,250,242,0.20)_84%,rgba(255,250,242,0)_100%)]

              md:hidden
            "
          />
        </div>

        {/* =================================================
            HERO CONTENT
        ================================================== */}

        <div className="container-brand relative z-10">
          <div
            className="
              relative
              min-h-[620px]

              sm:min-h-[650px]

              md:min-h-[500px]
              md:pb-16
              md:pt-9

              lg:min-h-[520px]
              lg:pt-11

              xl:min-h-[540px]
            "
          >
            <div
              className="
                absolute
                left-0
                right-0
                top-[-20px]
                z-10

                sm:top-[42px]

                md:relative
                md:left-auto
                md:right-auto
                md:top-auto
              "
            >
              {/* EYEBROW */}
              <p
                className="
                  text-center
                  text-[9px]
                  font-black
                  uppercase
                  tracking-[0.18em]
                  text-[#9b5c13]

                  sm:text-[10px]

                  md:mb-2
                "
              >
                Our Products
              </p>

              {/* TITLE */}
              <h1
                className="
                  mx-auto
                  mt-[22px]
                  max-w-[330px]
                  text-center
                  font-display
                  text-[31px]
                  font-bold
                  leading-[0.91]
                  tracking-[-0.045em]
                  text-[#17120f]

                  min-[390px]:max-w-[350px]
                  min-[390px]:text-[33px]

                  sm:max-w-[410px]
                  sm:text-[42px]

                  md:mx-0
                  md:mt-6
                  md:max-w-[620px]
                  md:text-left
                  md:text-[64px]

                  lg:text-[72px]
                "
              >
                Premium Basmati
                <span className="block">
                  Rice Collection
                </span>
              </h1>

              {/* DESCRIPTION */}
              <p
                className="
                  mx-auto
                  mt-[14px]
                  max-w-[315px]
                  text-center
                  text-[11.5px]
                  font-medium
                  leading-[1.5]
                  text-[#302923]

                  min-[390px]:max-w-[335px]
                  min-[390px]:text-[12px]

                  sm:max-w-[390px]
                  sm:text-[14px]

                  md:mx-0
                  md:mt-5
                  md:max-w-[560px]
                  md:text-left
                  md:text-[15px]

                  lg:max-w-[590px]
                  lg:text-[16px]
                "
              >
                Naturally aged, exceptionally fragrant and sourced with care.
                Choose from our premium Basmati rice packs for everyday meals,
                special occasions, and wholesale needs.
              </p>

              {/* DESKTOP/TABLET BENEFITS */}
              <div
                className="
                  mt-7
                  hidden
                  max-w-[500px]
                  grid-cols-4
                  gap-2

                  md:grid
                  md:mt-8
                  md:gap-3
                "
              >
                {benefits.map((benefit) => {
                  const Icon = benefit.icon;

                  return (
                    <div
                      key={benefit.title}
                      className="
                        flex
                        min-w-0
                        flex-col
                        items-center
                        text-center
                      "
                    >
                      <div
                        className="
                          flex
                          h-[44px]
                          w-[44px]
                          items-center
                          justify-center
                          rounded-full
                          border
                          border-[#e3bd78]
                          bg-[#fffaf2]/95
                          text-[#d1081b]
                          shadow-[0_7px_18px_rgba(69,42,17,0.06)]

                          sm:h-[48px]
                          sm:w-[48px]
                        "
                      >
                        <Icon size={21} strokeWidth={1.9} />
                      </div>

                      <span
                        className="
                          mt-2
                          max-w-[90px]
                          text-[8px]
                          font-extrabold
                          leading-[1.15]
                          text-[#17120f]

                          sm:text-[9px]
                        "
                      >
                        {benefit.title}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* =====================================================
          MOBILE BENEFITS STRIP
      ====================================================== */}

      <section className="relative z-20 bg-white md:hidden">
        <div className="grid grid-cols-4 px-2 py-4">
          {benefits.map((benefit) => {
            const Icon = benefit.icon;

            return (
              <div
                key={benefit.title}
                className="
                  flex
                  min-w-0
                  flex-col
                  items-center
                  text-center
                "
              >
                <div
                  className="
                    flex
                    h-[42px]
                    w-[42px]
                    items-center
                    justify-center
                    rounded-full
                    bg-white
                    text-[#d1081b]
                    shadow-[0_5px_18px_rgba(70,45,20,0.10)]
                  "
                >
                  <Icon size={22} strokeWidth={1.9} />
                </div>

                <span
                  className="
                    mt-2
                    max-w-[72px]
                    text-[8px]
                    font-extrabold
                    leading-[1.12]
                    text-[#17120f]
                  "
                >
                  {benefit.title}
                </span>
              </div>
            );
          })}
        </div>
      </section>

      {/* =====================================================
          PRODUCT CATALOG
      ====================================================== */}

      <div className="relative z-20 mt-0 md:-mt-[30px]">
        <ProductCatalogSearch products={products} />
      </div>

      {/* =====================================================
          SHAKTI QUALITY STRIP
      ====================================================== */}

      <section
        className="
          relative
          border-y
          border-[#eee1cf]
          bg-[#fff8ee]
        "
      >
        <div className="container-brand">
          <div
            className="
              grid
              grid-cols-2
              gap-y-6
              py-7

              md:grid-cols-4
              md:gap-0
              md:py-6
            "
          >
            {productHighlights.map((benefit, index) => {
              const Icon = benefit.icon;

              return (
                <div
                  key={benefit.title}
                  className={`
                    relative
                    flex
                    items-center
                    gap-3
                    px-3

                    sm:px-5
                    md:px-6
                    lg:px-8

                    ${
                      index > 0
                        ? "md:border-l md:border-[#dfcdb5]"
                        : ""
                    }
                  `}
                >
                  <div
                    className="
                      flex
                      h-[48px]
                      w-[48px]
                      shrink-0
                      items-center
                      justify-center
                      rounded-full
                      bg-white
                      text-[#d1081b]
                      shadow-[0_6px_18px_rgba(83,48,18,0.06)]

                      lg:h-[54px]
                      lg:w-[54px]
                    "
                  >
                    <Icon
                      size={27}
                      strokeWidth={1.9}
                    />
                  </div>

                  <div className="min-w-0">
                    <h2
                      className="
                        text-[11px]
                        font-extrabold
                        leading-[1.15]
                        text-[#17120f]

                        lg:text-[12px]
                      "
                    >
                      {benefit.title}
                    </h2>

                    <p
                      className="
                        mt-1
                        max-w-[150px]
                        text-[9px]
                        leading-[1.35]
                        text-[#746a61]

                        sm:text-[10px]
                      "
                    >
                      {benefit.text}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <ProductWholesaleSection />
    </main>
  );
}