import Image from "next/image";
import Link from "next/link";

import EcowareCartButton from "@/components/ecoware/EcowareCartButton";
import EcowareMobileMenu from "@/components/ecoware/EcowareMobileMenu";
import { CartProvider } from "@/components/CartProvider";

export const metadata = {
  title: {
    default: "Simpli Ecoware",
    template: "%s | Simpli Ecoware"
  },

  description:
    "Sustainable tableware and food-service packaging made from sugarcane bagasse.",

  icons: {
    icon: [
      {
        url: "/images/logo-ecoware-icon.png",
        type: "image/png"
      }
    ],
    shortcut: "/images/logo-ecoware-icon.png",
    apple: "/images/logo-ecoware-icon.png"
  }
};

/* =========================================================
   SIMPLI ECOWARE BRAND
========================================================= */

function EcowareBrand({ footer = false }) {
  return (
    <Link
      href="/ecoware"
      className="flex min-w-0 items-center gap-2.5 sm:gap-3"
    >
      {/* Logo */}
      <div
        className={`relative shrink-0 ${
          footer
            ? "h-[74px] w-[74px] sm:h-[82px] sm:w-[82px]"
            : "h-12 w-12 sm:h-14 sm:w-14"
        }`}
      >
        <Image
          src="/images/logo-ecoware-icon.png"
          alt="Simpli Ecoware"
          fill
          priority={!footer}
          sizes={footer ? "82px" : "56px"}
          className="object-contain"
        />
      </div>

      {/* Brand text */}
      <div className="min-w-0">
        <div
          className={`whitespace-nowrap font-black leading-none tracking-[-0.045em] text-black ${
            footer
              ? "text-[20px] sm:text-[24px]"
              : "text-[16px] min-[390px]:text-[18px] sm:text-[22px]"
          }`}
        >
          <span>SIMPLI </span>
          <span>EC</span>

          {/* Green O */}
          <span className="relative mx-[1px] inline-flex aspect-square h-[0.92em] translate-y-[0.04em] items-center justify-center rounded-full bg-[#4d9c2d] text-white">
            <span className="absolute h-[55%] w-[32%] -rotate-[28deg] rounded-[100%_0_100%_0] bg-white" />
          </span>

          <span>WARE</span>
        </div>

        <div
          className={`mt-1 whitespace-nowrap font-semibold italic leading-none text-[#27802f] ${
            footer
              ? "text-[12px] sm:text-[14px]"
              : "text-[9px] min-[390px]:text-[10px] sm:text-[12px]"
          }`}
        >
          Good for Earth, Good for You
        </div>

        {footer && (
          <div className="mt-2 whitespace-nowrap text-[9px] font-semibold uppercase tracking-[0.25em] text-black/75 sm:text-[10px]">
            Made from Sugarcane Bagasse
          </div>
        )}
      </div>
    </Link>
  );
}

/* =========================================================
   LAYOUT
========================================================= */

export default function EcowareLayout({ children }) {
  const year = new Date().getFullYear();

  return (
    <CartProvider>
      <div className="min-h-screen bg-[#f8f6ef] text-black">
        {/* =================================================
            HEADER

            IMPORTANT:
            Header remains absolute because /ecoware uses it
            over the sugarcane hero image.

            Individual pages provide their own header clearance.
        ================================================= */}

        <header className="absolute left-0 right-0 top-0 z-50">
          <div className="mx-auto max-w-[1536px] px-4 pt-5 sm:px-8 sm:pt-6 lg:px-12 lg:pt-7">
            <div className="flex min-h-[76px] items-center justify-between rounded-full border border-white/70 bg-white/95 px-4 py-3 shadow-[0_18px_55px_rgba(0,0,0,0.10)] backdrop-blur-xl sm:px-5 lg:min-h-[82px] lg:px-7">
              {/* Brand */}
              <EcowareBrand />

              {/* Desktop Navigation */}
              <nav className="hidden items-center gap-1 lg:flex">
                <Link
                  href="/ecoware"
                  className="rounded-full px-5 py-3 text-sm font-bold transition hover:bg-black/5"
                >
                  Home
                </Link>

                <Link
                  href="/ecoware/products"
                  className="rounded-full px-5 py-3 text-sm font-bold transition hover:bg-black/5"
                >
                  Products
                </Link>

                <Link
                  href="/ecoware/sustainability"
                  className="rounded-full px-5 py-3 text-sm font-bold transition hover:bg-black/5"
                >
                  Sustainability
                </Link>

                <Link
                  href="/ecoware#wholesale"
                  className="rounded-full px-5 py-3 text-sm font-bold transition hover:bg-black/5"
                >
                  Wholesale
                </Link>

                <Link
                  href="/ecoware#about"
                  className="rounded-full px-5 py-3 text-sm font-bold transition hover:bg-black/5"
                >
                  About
                </Link>

                <a
                  href="https://www.shakti-foods.com"
                  className="
                    ml-2
                    flex
                    items-center
                    gap-2
                    rounded-full
                    border
                    border-black
                    px-4
                    py-2
                    text-sm
                    font-bold
                    transition
                    hover:bg-black
                    hover:text-white
                  "
                >
                  <span className="relative h-7 w-7 shrink-0 overflow-hidden rounded-full bg-white">
                    <Image
                      src="/images/logo-shakti.png"
                      alt=""
                      fill
                      sizes="28px"
                      className="object-contain p-[2px]"
                    />
                  </span>

                  <span>Shakti Foods</span>
                </a>
              </nav>

              {/* Actions */}
              <div className="flex shrink-0 items-center gap-2">
                <EcowareCartButton />

                <div className="lg:hidden">
                  <EcowareMobileMenu />
                </div>
              </div>
            </div>
          </div>
        </header>

        {/* =================================================
            PAGE
        ================================================= */}

        <main>{children}</main>

        {/* =================================================
            FOOTER
        ================================================= */}

        <footer className="border-t border-black/10 bg-[#f8f6ef]">
          <div className="mx-auto max-w-[1536px] px-6 py-14 sm:px-8 lg:px-12 lg:py-16">
            <div className="grid gap-12 md:grid-cols-2 lg:grid-cols-[1.35fr_.65fr_.85fr] lg:gap-16">
              {/* BRAND */}
              <div>
                <EcowareBrand footer />

                <p className="mt-7 max-w-[540px] text-[16px] leading-8 text-black/60 sm:text-[17px]">
                  Sustainable plates, bowls, trays and food-service packaging
                  designed for homes, restaurants, caterers, events and
                  wholesale buyers.
                </p>
              </div>

              {/* QUICK LINKS */}
              <div>
                <h3 className="text-lg font-black">Quick Links</h3>

                <div className="mt-6 flex flex-col items-start gap-4 text-[16px] text-black/65">
                  <Link
                    href="/ecoware"
                    className="transition hover:text-black"
                  >
                    Home
                  </Link>

                  <Link
                    href="/ecoware/products"
                    className="transition hover:text-black"
                  >
                    Products
                  </Link>

                  <Link
                    href="/ecoware#wholesale"
                    className="transition hover:text-black"
                  >
                    Wholesale
                  </Link>

                  <Link
                    href="/ecoware/sustainability"
                    className="transition hover:text-black"
                  >
                    Sustainability
                  </Link>

                  <Link
                    href="/ecoware#about"
                    className="transition hover:text-black"
                  >
                    About
                  </Link>
                </div>
              </div>

              {/* SHAKTI FOODS */}
              <div>
                <h3 className="text-lg font-black">Shakti Foods</h3>

                <p className="mt-6 max-w-sm text-[16px] leading-7 text-black/60">
                  Looking for premium Basmati rice and Shakti Foods products?
                </p>

                <a
                  href="https://www.shakti-foods.com"
                  className="
                    mt-6
                    inline-flex
                    min-h-[52px]
                    items-center
                    justify-center
                    gap-3
                    rounded-full
                    border
                    border-black
                    px-5
                    text-sm
                    font-black
                    transition
                    duration-300
                    hover:bg-black
                    hover:text-white
                  "
                >
                  <span className="relative h-8 w-8 shrink-0 overflow-hidden rounded-full bg-white">
                    <Image
                      src="/images/logo-shakti.png"
                      alt=""
                      fill
                      sizes="32px"
                      className="object-contain p-[2px]"
                    />
                  </span>

                  <span>Visit Shakti Foods</span>

                  <span aria-hidden="true">→</span>
                </a>
              </div>
            </div>
          </div>

          {/* Bottom footer */}
          <div className="border-t border-black/10">
            <div className="mx-auto flex max-w-[1536px] flex-col gap-3 px-6 py-6 text-sm text-black/55 sm:px-8 md:flex-row md:items-center md:justify-between lg:px-12">
              <p>© {year} Simpli Ecoware. All rights reserved.</p>

              <p className="font-semibold italic text-[#27802f]">
                Good for Earth, Good for You
              </p>
            </div>
          </div>
        </footer>
      </div>
    </CartProvider>
  );
}