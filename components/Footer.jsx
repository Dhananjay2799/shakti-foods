"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  ArrowUpRight,
  ChevronDown,
  Clock3,
  Mail,
  MapPin,
  MessageCircle,
  Phone,
} from "lucide-react";

import { useCart } from "@/components/CartProvider";
import { site, whatsappLink } from "@/lib/site";

export default function Footer() {
  const { items = [] } = useCart();
  const [mobileOpen, setMobileOpen] = useState("explore");

  const cartStorefront = items?.[0]?.storefront || "shakti_foods";
  const isEcoware = cartStorefront === "ecoware";

  /*
   * ==========================================================
   * SIMPLI ECOWARE FOOTER
   * ==========================================================
   */

  if (isEcoware) {
    return (
      <footer className="section-pad border-t border-black/10 bg-[#f7f3ea] py-14 text-black">
        <div className="container-brand grid gap-10 md:grid-cols-[1.2fr_.8fr_.9fr]">
          {/* BRAND */}
          <div>
            <Link
              href="/ecoware"
              className="inline-flex items-center gap-4"
              aria-label="Simpli Ecoware home"
            >
              <div className="relative h-16 w-16 shrink-0">
                <Image
                  src="/images/logo-ecoware-icon.png"
                  alt="Simpli Ecoware"
                  fill
                  sizes="64px"
                  className="object-contain"
                />
              </div>

              <div>
                <div className="text-xl font-black leading-none tracking-[-0.03em] text-black">
                  SIMPLI ECOWARE
                </div>

                <div className="mt-2 text-sm font-medium italic text-[#4f7f34]">
                  Good for Earth, Good for You
                </div>
              </div>
            </Link>

            <p className="mt-5 max-w-lg leading-8 text-black/65">
              Sustainable plates, bowls, trays and food-service packaging
              designed for everyday meals, restaurants, caterers, events and
              wholesale operations.
            </p>
          </div>

          {/* QUICK LINKS */}
          <div>
            <h3 className="font-bold text-black">Quick Links</h3>

            <div className="mt-4 grid gap-3 text-black/70">
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
                href="/ecoware#samples"
                className="transition hover:text-black"
              >
                Samples
              </Link>

              <Link
                href="/"
                className="transition hover:text-black"
              >
                Visit Shakti Foods
              </Link>
            </div>
          </div>

          {/* CONTACT */}
          <div>
            <h3 className="font-bold text-black">Contact</h3>

            <div className="mt-4 grid gap-3 text-black/70">
              <a
                href={`tel:${site.phoneRaw}`}
                className="transition hover:text-black"
              >
                {site.phone}
              </a>

              <a
                href={`mailto:${site.email}`}
                className="transition hover:text-black"
              >
                {site.email}
              </a>

              <a
                href={whatsappLink()}
                target="_blank"
                rel="noreferrer"
                className="transition hover:text-black"
              >
                WhatsApp: {site.phone}
              </a>

              <div>{site.address}</div>

              <div>{site.hours}</div>
            </div>
          </div>
        </div>

        <div className="container-brand mt-10 flex flex-col gap-3 border-t border-black/10 pt-5 text-sm text-black/55 sm:flex-row sm:items-center sm:justify-between">
          <span>
            © {new Date().getFullYear()} Simpli Ecoware. All rights reserved.
          </span>

          <Link
            href="/"
            className="font-semibold text-black transition hover:opacity-60"
          >
            Visit Shakti Foods →
          </Link>
        </div>
      </footer>
    );
  }

  /*
   * ==========================================================
   * SHAKTI FOODS FOOTER
   * ==========================================================
   */

  return (
    <footer
      className="
        relative
        isolate
        overflow-hidden
        bg-[#a90012]
        text-[#fff8ec]
      "
    >
      {/* =====================================================
          DEEP RED BACKGROUND
      ====================================================== */}

      <div
        className="
          pointer-events-none
          absolute
          inset-0
          -z-30
          bg-[linear-gradient(135deg,#8f000d_0%,#c60018_42%,#9b000f_72%,#780008_100%)]
        "
      />

      {/* TOP GLOW */}
      <div
        className="
          pointer-events-none
          absolute
          -top-40
          left-[18%]
          -z-20
          h-[430px]
          w-[600px]
          rounded-full
          bg-[#ef1b29]/20
          blur-[120px]
        "
      />

      {/* BOTTOM DARKNESS */}
      <div
        className="
          pointer-events-none
          absolute
          inset-x-0
          bottom-0
          -z-20
          h-[45%]
          bg-gradient-to-t
          from-[#680006]/55
          to-transparent
        "
      />

      {/* =========================================================
          SHAKTI MOBILE FOOTER
      ========================================================= */}

      <div className="relative z-10 px-5 pb-8 pt-9 md:hidden">
        {/* LOGO */}
        <div className="flex justify-center">
          <Link
            href="/"
            aria-label="Shakti Foods home"
            className="
              flex
              w-[235px]
              items-center
              justify-center
              rounded-[20px]
              border
              border-[#e7b650]/80
              bg-[#fff8ec]
              px-5
              py-3
              shadow-[0_12px_30px_rgba(60,0,4,0.20)]
            "
          >
            <div className="relative h-[90px] w-[170px]">
              <Image
                src="/images/logo-shakti.png"
                alt="Shakti Foods — Power of Purity"
                fill
                sizes="170px"
                className="object-contain"
              />
            </div>
          </Link>
        </div>

        {/* DESCRIPTION */}
        <p
          className="
            mx-auto
            mt-6
            max-w-[335px]
            text-center
            text-[12px]
            leading-[1.7]
            text-[#fff8ec]/95
          "
        >
          Premium Basmati rice selected for exceptional aroma, long grains,
          and memorable meals.
        </p>

        {/* DECORATIVE DIVIDER */}
        <div className="mt-7 flex items-center justify-center gap-3">
          <span
            className="
              h-px
              w-12
              bg-gradient-to-r
              from-transparent
              to-[#e7b650]
            "
          />

          <span className="h-1.5 w-1.5 rotate-45 bg-[#f4bd4c]" />

          <span
            className="
              h-px
              w-12
              bg-gradient-to-l
              from-transparent
              to-[#e7b650]
            "
          />
        </div>

        {/* =====================================================
            MOBILE ACCORDIONS
        ====================================================== */}

        <div
          className="
            mx-auto
            mt-7
            max-w-[380px]
            border-y
            border-[#e7b650]/45
          "
        >
          {/* EXPLORE */}
          <div className="border-b border-[#e7b650]/45">
            <button
              type="button"
              onClick={() =>
                setMobileOpen((current) =>
                  current === "explore" ? null : "explore"
                )
              }
              aria-expanded={mobileOpen === "explore"}
              className="
                flex
                w-full
                items-center
                justify-between
                py-4
                text-left
              "
            >
              <span
                className="
                  text-[10px]
                  font-black
                  uppercase
                  tracking-[0.24em]
                  text-[#f4bd4c]
                "
              >
                Explore
              </span>

              <ChevronDown
                size={18}
                strokeWidth={2}
                className={`
                  text-[#f4bd4c]
                  transition-transform
                  duration-300
                  ${
                    mobileOpen === "explore"
                      ? "rotate-180"
                      : ""
                  }
                `}
              />
            </button>

            <div
              className={`
                grid
                overflow-hidden
                transition-all
                duration-300
                ease-in-out
                ${
                  mobileOpen === "explore"
                    ? "grid-rows-[1fr] opacity-100"
                    : "grid-rows-[0fr] opacity-0"
                }
              `}
            >
              <div className="min-h-0">
                <nav
                  className="
                    grid
                    pb-4
                    text-[13px]
                    font-medium
                    text-white
                  "
                >
                  <MobileAccordionLink href="/products">
                    Our Rice
                  </MobileAccordionLink>

                  <MobileAccordionLink href="/about">
                    About Us
                  </MobileAccordionLink>

                  <MobileAccordionLink href="/sustainability">
                    Sustainability
                  </MobileAccordionLink>

                  <MobileAccordionLink href="/contact">
                    Wholesale
                  </MobileAccordionLink>

                  <MobileAccordionLink href="/ecoware">
                    Simpli Ecoware
                  </MobileAccordionLink>
                </nav>
              </div>
            </div>
          </div>

          {/* CONTACT */}
          <div>
            <button
              type="button"
              onClick={() =>
                setMobileOpen((current) =>
                  current === "contact" ? null : "contact"
                )
              }
              aria-expanded={mobileOpen === "contact"}
              className="
                flex
                w-full
                items-center
                justify-between
                py-4
                text-left
              "
            >
              <span
                className="
                  text-[10px]
                  font-black
                  uppercase
                  tracking-[0.24em]
                  text-[#f4bd4c]
                "
              >
                Contact
              </span>

              <ChevronDown
                size={18}
                strokeWidth={2}
                className={`
                  text-[#f4bd4c]
                  transition-transform
                  duration-300
                  ${
                    mobileOpen === "contact"
                      ? "rotate-180"
                      : ""
                  }
                `}
              />
            </button>

            <div
              className={`
                grid
                overflow-hidden
                transition-all
                duration-300
                ease-in-out
                ${
                  mobileOpen === "contact"
                    ? "grid-rows-[1fr] opacity-100"
                    : "grid-rows-[0fr] opacity-0"
                }
              `}
            >
              <div className="min-h-0">
                <div className="grid gap-2 pb-5">
                  {/* PHONE */}
                  <a
                    href={`tel:${site.phoneRaw}`}
                    className="
                      flex
                      items-center
                      gap-3
                      rounded-[12px]
                      px-1
                      py-2
                      text-white
                      transition
                      active:bg-white/[0.06]
                    "
                  >
                    <MobileAccordionIcon icon={Phone} />

                    <div>
                      <div
                        className="
                          text-[9px]
                          font-bold
                          uppercase
                          tracking-[0.12em]
                          text-[#f4bd4c]
                        "
                      >
                        Call Us
                      </div>

                      <div className="mt-0.5 text-[12px]">
                        {site.phone}
                      </div>
                    </div>
                  </a>

                  {/* EMAIL */}
                  <a
                    href={`mailto:${site.email}`}
                    className="
                      flex
                      items-center
                      gap-3
                      rounded-[12px]
                      px-1
                      py-2
                      text-white
                      transition
                      active:bg-white/[0.06]
                    "
                  >
                    <MobileAccordionIcon icon={Mail} />

                    <div className="min-w-0">
                      <div
                        className="
                          text-[9px]
                          font-bold
                          uppercase
                          tracking-[0.12em]
                          text-[#f4bd4c]
                        "
                      >
                        Email Us
                      </div>

                      <div className="mt-0.5 break-all text-[12px]">
                        {site.email}
                      </div>
                    </div>
                  </a>

                  {/* LOCATION */}
                  <div
                    className="
                      flex
                      items-center
                      gap-3
                      px-1
                      py-2
                      text-white
                    "
                  >
                    <MobileAccordionIcon icon={MapPin} />

                    <div>
                      <div
                        className="
                          text-[9px]
                          font-bold
                          uppercase
                          tracking-[0.12em]
                          text-[#f4bd4c]
                        "
                      >
                        Location
                      </div>

                      <div className="mt-0.5 text-[12px]">
                        {site.address}
                      </div>
                    </div>
                  </div>

                  {/* HOURS */}
                  <div
                    className="
                      flex
                      items-center
                      gap-3
                      px-1
                      py-2
                      text-white
                    "
                  >
                    <MobileAccordionIcon icon={Clock3} />

                    <div>
                      <div
                        className="
                          text-[9px]
                          font-bold
                          uppercase
                          tracking-[0.12em]
                          text-[#f4bd4c]
                        "
                      >
                        Hours
                      </div>

                      <div className="mt-0.5 text-[12px]">
                        {site.hours}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* =====================================================
            WHATSAPP
        ====================================================== */}

        <div className="mt-7 text-center">
          <p className="text-[10px] font-medium text-[#fff8ec]/80">
            Have a question?
          </p>

          <a
            href={whatsappLink()}
            target="_blank"
            rel="noreferrer"
            aria-label="Chat with Shakti Foods on WhatsApp"
            className="
              mx-auto
              mt-3
              flex
              h-[64px]
              w-[64px]
              items-center
              justify-center
              rounded-full
              border-2
              border-[#f4bd4c]
              bg-[#25D366]
              text-white
              shadow-[0_10px_28px_rgba(0,0,0,0.24)]
              transition
              duration-200
              hover:scale-105
              active:scale-95
            "
          >
            <WhatsAppIcon className="h-[34px] w-[34px]" />
          </a>

          <div
            className="
              mt-2.5
              text-[9px]
              font-black
              uppercase
              tracking-[0.22em]
              text-[#fff8ec]
            "
          >
            Chat on WhatsApp
          </div>
        </div>

        {/* BOTTOM DIVIDER */}
        <div
          className="
            mx-auto
            mt-7
            max-w-[380px]
            border-t
            border-[#e7b650]/50
          "
        />

        {/* =====================================================
            POWER OF PURITY
        ====================================================== */}

        <div className="mt-5 text-center">
          <div className="flex items-center justify-center gap-3">
            <span className="h-px w-7 bg-[#e7b650]/80" />

            <span className="h-1.5 w-1.5 rounded-full bg-[#e7b650]" />

            <span
              className="
                font-display
                text-[18px]
                font-bold
                text-[#f4bd4c]
              "
            >
              Power of Purity
            </span>

            <span className="h-1.5 w-1.5 rounded-full bg-[#e7b650]" />

            <span className="h-px w-7 bg-[#e7b650]/80" />
          </div>

          <p className="mt-4 text-[9px] text-[#fff8ec]/70">
            © {new Date().getFullYear()} {site.name}. All rights reserved.
          </p>
        </div>
      </div>

      {/* =====================================================
          SHAKTI DESKTOP FOOTER
      ====================================================== */}

      <div
        className="
          container-brand
          relative
          z-10
          hidden
          px-5
          pb-7
          pt-11
          sm:px-6
          md:block
          md:pb-8
          md:pt-14
        "
      >
        <div
          className="
            grid
            gap-10
            md:grid-cols-2
            lg:grid-cols-[1.22fr_.62fr_1fr_1.05fr]
            lg:items-start
            lg:gap-10
          "
        >
          {/* BRAND */}
          <div>
            <Link
              href="/"
              aria-label="Shakti Foods home"
              className="
                inline-flex
                rounded-[18px]
                border
                border-[#f0c45d]/50
                bg-[#fff8ec]
                px-5
                py-3
                shadow-[0_12px_35px_rgba(75,0,4,0.20)]
                transition
                duration-300
                hover:-translate-y-0.5
              "
            >
              <div
                className="
                  relative
                  h-[92px]
                  w-[180px]
                  md:h-[100px]
                  md:w-[195px]
                "
              >
                <Image
                  src="/images/logo-shakti.png"
                  alt="Shakti Foods — Power of Purity"
                  fill
                  sizes="195px"
                  className="object-contain"
                />
              </div>
            </Link>

            <p
              className="
                mt-5
                max-w-[440px]
                text-[13px]
                leading-[1.8]
                text-[#fff4e5]/90
                md:text-[14px]
              "
            >
              Premium Basmati rice selected for exceptional aroma,
              long grains, and memorable meals — from everyday family
              tables to restaurants and wholesale kitchens.
            </p>
          </div>

          {/* EXPLORE */}
          <div>
            <FooterHeading>
              Explore
            </FooterHeading>

            <nav
              className="
                mt-5
                grid
                gap-3
                text-[13px]
                font-semibold
                text-[#fff8ec]
                md:text-[14px]
              "
            >
              <FooterLink href="/">
                Home
              </FooterLink>

              <FooterLink href="/products">
                Our Rice
              </FooterLink>

              <FooterLink href="/about">
                About Us
              </FooterLink>

              <FooterLink href="/sustainability">
                Sustainability
              </FooterLink>

              <FooterLink href="/contact">
                Wholesale
              </FooterLink>

              <FooterLink href="/ecoware">
                Simpli Ecoware
              </FooterLink>
            </nav>
          </div>

          {/* CONTACT */}
          <div>
            <FooterHeading>
              Contact
            </FooterHeading>

            <div
              className="
                mt-5
                grid
                gap-4
                text-[12px]
                leading-5
                text-[#fff8ec]/90
                md:text-[13px]
              "
            >
              <ContactRow
                icon={Phone}
                href={`tel:${site.phoneRaw}`}
              >
                {site.phone}
              </ContactRow>

              <ContactRow
                icon={Mail}
                href={`mailto:${site.email}`}
              >
                {site.email}
              </ContactRow>

              <ContactRow icon={MapPin}>
                {site.address}
              </ContactRow>

              <ContactRow icon={Clock3}>
                {site.hours}
              </ContactRow>
            </div>
          </div>

          {/* WHATSAPP CARD */}
          <div
            className="
              rounded-[22px]
              border
              border-[#e5ad42]/70
              bg-[#7d000b]/35
              p-5
              shadow-[0_18px_45px_rgba(61,0,4,0.22)]
              backdrop-blur-[4px]
              md:p-6
            "
          >
            <div
              className="
                text-[9px]
                font-black
                uppercase
                tracking-[0.22em]
                text-[#f5bd4c]
              "
            >
              Need Help?
            </div>

            <div
              className="
                mt-2
                h-[2px]
                w-10
                bg-[#e5ad42]
              "
            />

            <h3
              className="
                mt-4
                font-display
                text-[27px]
                font-bold
                leading-[0.98]
                tracking-[-0.025em]
                text-[#fff8ec]
                md:text-[30px]
              "
            >
              Talk with

              <span className="block text-[#f4b63f]">
                Shakti Foods
              </span>
            </h3>

            <p
              className="
                mt-4
                text-[12px]
                leading-[1.65]
                text-[#fff8ec]/90
                md:text-[13px]
              "
            >
              Questions about our rice, retail orders, or wholesale
              pricing? Chat with us directly.
            </p>

            <a
              href={whatsappLink()}
              target="_blank"
              rel="noreferrer"
              aria-label="Chat with Shakti Foods on WhatsApp"
              className="
                group
                mt-5
                flex
                w-full
                items-center
                justify-center
                gap-2.5
                rounded-full
                bg-[#25D366]
                px-5
                py-3.5
                text-[12px]
                font-bold
                text-white
                shadow-[0_10px_28px_rgba(0,0,0,0.25)]
                transition
                duration-300
                hover:-translate-y-0.5
                hover:bg-[#20c45d]
                hover:shadow-[0_14px_34px_rgba(0,0,0,0.30)]
              "
            >
              <MessageCircle
                size={19}
                strokeWidth={2}
              />

              Chat on WhatsApp

              <ArrowUpRight
                size={15}
                strokeWidth={2}
                className="
                  transition-transform
                  duration-300
                  group-hover:translate-x-0.5
                  group-hover:-translate-y-0.5
                "
              />
            </a>
          </div>
        </div>

        {/* BOTTOM BAR */}
        <div
          className="
            mt-11
            flex
            flex-col
            gap-4
            border-t
            border-[#e7b650]/55
            pt-6
            text-[11px]
            text-[#fff3df]/80
            sm:flex-row
            sm:items-center
            sm:justify-between
          "
        >
          <span>
            © {new Date().getFullYear()} {site.name}. All rights reserved.
          </span>

          <div
            className="
              flex
              items-center
              gap-3
              font-display
              text-[15px]
              font-semibold
              text-[#f1bb4d]
            "
          >
            <span
              className="
                hidden
                h-px
                w-10
                bg-[#e7b650]/70
                sm:block
              "
            />

            <span>
              Power of Purity
            </span>

            <span
              className="
                hidden
                h-px
                w-10
                bg-[#e7b650]/70
                sm:block
              "
            />
          </div>
        </div>
      </div>
    </footer>
  );
}

/*
 * ============================================================
 * SHAKTI FOOTER HELPERS
 * ============================================================
 */

function FooterHeading({ children }) {
  return (
    <div>
      <h3
        className="
          text-[10px]
          font-black
          uppercase
          tracking-[0.23em]
          text-[#f4bd4c]
        "
      >
        {children}
      </h3>

      <div
        className="
          mt-2
          h-[2px]
          w-9
          bg-[#e7b650]
        "
      />
    </div>
  );
}

function FooterLink({ href, children }) {
  return (
    <Link
      href={href}
      className="
        w-fit
        transition
        duration-200
        hover:translate-x-1
        hover:text-[#f4bd4c]
      "
    >
      {children}
    </Link>
  );
}

function ContactRow({
  icon: Icon,
  href,
  children,
}) {
  const content = (
    <>
      <span
        className="
          flex
          h-[31px]
          w-[31px]
          shrink-0
          items-center
          justify-center
          rounded-full
          border
          border-[#e6ad3d]/80
          text-[#f4bd4c]
        "
      >
        <Icon
          size={15}
          strokeWidth={2}
        />
      </span>

      <span className="min-w-0 break-words">
        {children}
      </span>
    </>
  );

  if (href) {
    return (
      <a
        href={href}
        className="
          flex
          items-center
          gap-3
          transition
          duration-200
          hover:text-[#f4bd4c]
        "
      >
        {content}
      </a>
    );
  }

  return (
    <div className="flex items-center gap-3">
      {content}
    </div>
  );
}

/*
 * ============================================================
 * MOBILE ACCORDION HELPERS
 * ============================================================
 */

function MobileAccordionLink({
  href,
  children,
}) {
  return (
    <Link
      href={href}
      className="
        flex
        items-center
        justify-between
        border-t
        border-white/[0.07]
        py-3
        text-[#fff8ec]
        transition
        duration-200
        active:text-[#f4bd4c]
      "
    >
      <span>{children}</span>

      <span
        className="
          text-[15px]
          leading-none
          text-[#f4bd4c]
        "
      >
        ›
      </span>
    </Link>
  );
}

function MobileAccordionIcon({
  icon: Icon,
}) {
  return (
    <span
      className="
        flex
        h-[34px]
        w-[34px]
        shrink-0
        items-center
        justify-center
        rounded-full
        border
        border-[#e7b650]/80
        text-[#f4bd4c]
      "
    >
      <Icon
        size={15}
        strokeWidth={2}
      />
    </span>
  );
}

function WhatsAppIcon({ className = "" }) {
  return (
    <svg
      viewBox="0 0 32 32"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
      fill="currentColor"
    >
      <path d="M16.04 3C8.86 3 3.02 8.82 3.02 15.98c0 2.29.6 4.52 1.74 6.49L3 29l6.7-1.76a13.03 13.03 0 0 0 6.33 1.61h.01c7.17 0 13.01-5.82 13.01-12.98C29.05 8.82 23.21 3 16.04 3Zm0 23.66h-.01a10.8 10.8 0 0 1-5.5-1.5l-.39-.23-3.97 1.04 1.06-3.87-.25-.4a10.75 10.75 0 0 1-1.66-5.72c0-5.95 4.85-10.79 10.82-10.79 5.96 0 10.81 4.84 10.81 10.79 0 5.95-4.85 10.68-10.91 10.68Zm5.93-8.08c-.32-.16-1.92-.94-2.22-1.05-.3-.11-.51-.16-.73.16-.22.32-.84 1.05-1.03 1.27-.19.22-.38.24-.7.08-.32-.16-1.36-.5-2.59-1.59a9.74 9.74 0 0 1-1.79-2.22c-.19-.32-.02-.5.14-.66.15-.14.32-.38.49-.57.16-.19.22-.32.32-.54.11-.22.05-.4-.03-.57-.08-.16-.73-1.75-1-2.4-.26-.63-.53-.55-.73-.56h-.62c-.22 0-.57.08-.87.4-.3.32-1.14 1.11-1.14 2.7s1.17 3.13 1.33 3.35c.16.22 2.29 3.49 5.55 4.9.78.33 1.38.53 1.85.68.78.25 1.49.21 2.05.13.63-.09 1.92-.78 2.19-1.54.27-.75.27-1.4.19-1.54-.08-.13-.3-.21-.62-.37Z" />
    </svg>
  );
}