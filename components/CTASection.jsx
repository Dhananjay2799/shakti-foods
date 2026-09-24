import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  ChefHat,
  ShoppingCart,
  Utensils,
} from "lucide-react";

const buyers = [
  {
    title: "Restaurants",
    subtitle: "Elevate every menu",
    icon: Utensils,
  },
  {
    title: "Caterers",
    subtitle: "Perfect for every event",
    icon: ChefHat,
  },
  {
    title: "Grocers",
    subtitle: "A brand customers trust",
    icon: ShoppingCart,
  },
];

export default function CTASection() {
  return (
    <section className="relative overflow-hidden bg-[#fff8ed] text-[#17120f]">
      {/* =====================================================
          DESKTOP
      ====================================================== */}
      <div className="relative hidden min-h-[365px] lg:block">
        {/* RIGHT IMAGE */}
        <div className="absolute inset-y-0 right-0 w-[48%]">
          <Image
            src="/images/wholesale-rice-bag.jpg"
            alt="Shakti Foods premium long-grain Basmati rice"
            fill
            sizes="48vw"
            className="object-cover object-center"
          />

          {/* Blend image into cream background */}
          <div
            className="
              absolute inset-0
              bg-gradient-to-r
              from-[#fff8ed]
              via-[#fff8ed]/35
              to-transparent
            "
          />
        </div>

        <div
          className="
            relative z-10
            mx-auto
            grid
            min-h-[365px]
            max-w-[1440px]
            grid-cols-[1.05fr_1fr_0.72fr]
            items-center
            gap-7
            px-8
            py-10
            xl:px-12
          "
        >
          {/* LEFT COPY */}
          <div className="max-w-[520px]">
            <div className="flex items-center gap-3">
              <span className="h-px w-12 bg-[#d8a548]" />

              <span
                className="
                  text-[10px]
                  font-black
                  uppercase
                  tracking-[0.18em]
                  text-[#c90019]
                "
              >
                Wholesale Partnerships
              </span>

              <span className="h-px w-12 bg-[#d8a548]" />
            </div>

            <h2
              className="
                mt-3
                font-display
                text-[48px]
                font-bold
                leading-[0.95]
                tracking-[-0.035em]
                text-[#17120f]
                xl:text-[55px]
              "
            >
              Wholesale for a
              <span className="block text-[#c90019]">
                Bigger Tomorrow
              </span>
            </h2>

            <p
              className="
                mt-5
                max-w-[510px]
                text-[13px]
                leading-[1.55]
                text-[#4e4a46]
                xl:text-[14px]
              "
            >
              Partner with Shakti Foods for consistent quality,
              reliable supply, and exceptional value. Trusted by
              restaurants, caterers, and grocers across North America.
            </p>

            <Link
              href="/contact"
              className="
                group
                mt-5
                inline-flex
                items-center
                justify-center
                gap-7
                rounded-md
                bg-[#d1081b]
                px-6
                py-3.5
                text-[13px]
                font-bold
                text-white
                shadow-[0_8px_24px_rgba(209,8,27,0.15)]
                transition
                duration-300
                hover:-translate-y-0.5
                hover:bg-[#b80718]
              "
            >
              Request Wholesale Pricing

              <ArrowRight
                size={17}
                className="
                  transition-transform
                  duration-300
                  group-hover:translate-x-1
                "
              />
            </Link>
          </div>

          {/* CENTER BUYER TYPES */}
          <div
            className="
              grid
              grid-cols-3
              divide-x
              divide-[#e7d7bd]
            "
          >
            {buyers.map(({ title, subtitle, icon: Icon }) => (
              <div
                key={title}
                className="px-3 text-center"
              >
                <div
                  className="
                    mx-auto
                    flex
                    h-[58px]
                    w-[58px]
                    items-center
                    justify-center
                    rounded-full
                    border
                    border-[#e5c88e]
                    bg-[#fffaf2]/90
                    text-[#d1081b]
                  "
                >
                  <Icon
                    size={26}
                    strokeWidth={1.7}
                  />
                </div>

                <div
                  className="
                    mt-3
                    font-display
                    text-[16px]
                    font-bold
                    text-[#18120f]
                  "
                >
                  {title}
                </div>

                <div
                  className="
                    mt-1
                    text-[11px]
                    leading-4
                    text-[#5f5851]
                  "
                >
                  {subtitle}
                </div>
              </div>
            ))}
          </div>

          {/* EMPTY SPACE RESERVED FOR IMAGE */}
          <div />
        </div>
      </div>

      {/* =====================================================
          MOBILE / TABLET
      ====================================================== */}
      <div className="lg:hidden">
        <div className="relative overflow-hidden">
          {/* Background */}
          <div className="absolute inset-0">
            <Image
              src="/images/wholesale-rice-bag.jpg"
              alt=""
              fill
              sizes="100vw"
              className="
                object-cover
                object-[63%_center]
                opacity-[0.34]
              "
              aria-hidden="true"
            />

            <div
              className="
                absolute inset-0
                bg-gradient-to-b
                from-[#fff8ed]/95
                via-[#fff8ed]/75
                to-[#fff8ed]/30
              "
            />
          </div>

          <div className="relative z-10 px-5 pb-0 pt-9">
            {/* Label */}
            <div className="flex items-center justify-center gap-2.5">
              <span className="h-px w-10 bg-[#d7a246]" />

              <span
                className="
                  text-center
                  text-[9px]
                  font-black
                  uppercase
                  tracking-[0.16em]
                  text-[#c90019]
                "
              >
                Wholesale Partnerships
              </span>

              <span className="h-px w-10 bg-[#d7a246]" />
            </div>

            {/* Heading */}
            <h2
              className="
                mx-auto
                mt-3
                max-w-[430px]
                text-center
                font-display
                text-[37px]
                font-bold
                leading-[0.96]
                tracking-[-0.035em]
                text-[#17120f]
                sm:text-[44px]
              "
            >
              Wholesale for a
              <span className="block text-[#c90019]">
                Bigger Tomorrow
              </span>
            </h2>

            <p
              className="
                mx-auto
                mt-4
                max-w-[440px]
                text-center
                text-[12px]
                leading-[1.55]
                text-[#4f4a45]
              "
            >
              Partner with Shakti Foods for consistent quality,
              reliable supply, and exceptional value. Trusted by
              restaurants, caterers, and grocers across North America.
            </p>

            {/* Buyer Types */}
            <div
              className="
                mx-auto
                mt-6
                grid
                max-w-[500px]
                grid-cols-3
                divide-x
                divide-[#dec9a9]
              "
            >
              {buyers.map(({ title, subtitle, icon: Icon }) => (
                <div
                  key={title}
                  className="min-w-0 px-2 text-center"
                >
                  <div
                    className="
                      mx-auto
                      flex
                      h-[47px]
                      w-[47px]
                      items-center
                      justify-center
                      rounded-full
                      border
                      border-[#e5c58a]
                      bg-[#fffaf2]/90
                      text-[#d1081b]
                    "
                  >
                    <Icon
                      size={21}
                      strokeWidth={1.7}
                    />
                  </div>

                  <div
                    className="
                      mt-2
                      font-display
                      text-[12px]
                      font-bold
                      text-[#18120f]
                    "
                  >
                    {title}
                  </div>

                  <div
                    className="
                      mx-auto
                      mt-1
                      max-w-[90px]
                      text-[8px]
                      leading-[1.3]
                      text-[#59534d]
                      sm:text-[9px]
                    "
                  >
                    {subtitle}
                  </div>
                </div>
              ))}
            </div>

            {/* Product Image */}
            <div
              className="
                relative
                mx-auto
                mt-5
                h-[250px]
                max-w-[520px]
                overflow-hidden
                rounded-t-[26px]
                sm:h-[300px]
              "
            >
              <Image
                src="/images/wholesale-rice-bag.jpg"
                alt="Shakti Foods premium Basmati rice"
                fill
                sizes="(max-width: 1024px) 100vw, 520px"
                className="object-cover object-center"
              />

              <div
                className="
                  absolute inset-x-0 top-0 h-14
                  bg-gradient-to-b
                  from-[#fff8ed]
                  to-transparent
                "
              />
            </div>

            {/* CTA */}
            <div
              className="
                relative
                z-20
                mx-auto
                -mt-7
                max-w-[440px]
                px-3
                pb-7
              "
            >
              <Link
                href="/contact"
                className="
                  group
                  flex
                  w-full
                  items-center
                  justify-center
                  gap-5
                  rounded-md
                  bg-[#d1081b]
                  px-5
                  py-4
                  text-[13px]
                  font-bold
                  text-white
                  shadow-[0_10px_30px_rgba(209,8,27,0.2)]
                  transition
                  active:scale-[0.98]
                "
              >
                Request Wholesale Pricing
                <ArrowRight size={18} />
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}