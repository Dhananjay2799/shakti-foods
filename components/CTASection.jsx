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
    <section className="relative overflow-hidden bg-white text-[#17120f]">
      {/* =====================================================
          DESKTOP — CTA + BUYER TYPES TOGETHER
      ====================================================== */}
      <div className="relative hidden min-h-[390px] lg:block">
        {/* RIGHT IMAGE — keep photo out of the content area */}
        <div className="absolute inset-y-0 right-0 w-[40%] overflow-hidden">
          <Image
            src="/images/wholesale-rice-bag.jpg"
            alt="Shakti Foods premium long-grain Basmati rice"
            fill
            sizes="40vw"
            className="object-cover object-center"
          />
          {/* Subtle edge blend only, not over the whole product bag */}
          <div className="absolute inset-y-0 left-0 w-[22%] bg-gradient-to-r from-white to-transparent" />
        </div>

        <div className="relative z-10 mx-auto flex min-h-[390px] max-w-[1440px] items-center px-8 py-10 xl:px-12">
          <div className="w-[60%] pr-4 xl:pr-7">
            <div className="flex items-center gap-3">
              <span className="h-px w-12 bg-[#d8a548]" />
              <span className="text-[10px] font-black uppercase tracking-[0.18em] text-[#E42027]">
                Wholesale Partnerships
              </span>
              <span className="h-px w-12 bg-[#d8a548]" />
            </div>

            <h2 className="mt-3 font-display text-[clamp(36px,3.3vw,55px)] font-bold leading-[0.98] tracking-[-0.035em] text-[#17120f]">
              Wholesale for a
              <span className="block text-[#E42027]">Bigger Tomorrow</span>
            </h2>

            <p className="mt-5 max-w-[620px] text-[13px] leading-[1.55] text-[#4e4a46] xl:text-[14px]">
              Partner with Shakti Foods for consistent quality,
              reliable supply, and exceptional value. Trusted by
              restaurants, caterers, and grocers across North America.
            </p>

            {/* ONE ROW: PRICING BUTTON + THREE BUYER TYPES */}
            <div className="mt-6 flex items-center gap-3 xl:gap-5">
              <Link
                href="/contact"
                className="group inline-flex shrink-0 items-center justify-center gap-2 rounded-md bg-[#E42027] px-3 py-3 text-[11px] font-bold text-white shadow-[0_8px_24px_rgba(228,32,39,0.15)] transition duration-300 hover:-translate-y-0.5 hover:bg-[#c91b23] xl:gap-4 xl:px-5 xl:text-[12px]"
              >
                Request Wholesale Pricing
                <ArrowRight
                  size={16}
                  className="shrink-0 transition-transform duration-300 group-hover:translate-x-1"
                />
              </Link>

              <div className="grid min-w-0 flex-1 grid-cols-3 divide-x divide-[#e7d7bd]">
                {buyers.map(({ title, subtitle, icon: Icon }) => (
                  <div key={title} className="min-w-0 px-1 text-center xl:px-2">
                    <div className="mx-auto flex h-[36px] w-[36px] items-center justify-center rounded-full border border-[#e5c88e] bg-white text-[#E42027] xl:h-[40px] xl:w-[40px]">
                      <Icon size={19} strokeWidth={1.7} />
                    </div>
                    <div className="mt-1.5 text-[10px] font-bold text-[#18120f] xl:text-[11px]">
                      {title}
                    </div>
                    <div className="mt-0.5 hidden text-[9px] leading-[1.25] text-[#5f5851] 2xl:block">
                      {subtitle}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
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