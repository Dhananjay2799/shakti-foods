"use client";

import Image from "next/image";
import Link from "next/link";
import {
  Menu,
  ShoppingBag,
  X
} from "lucide-react";
import { useState } from "react";
import {
  AnimatePresence,
  motion
} from "framer-motion";
import { useCart } from "@/components/CartProvider";

const shaktiLinks = [
  { href: "/", label: "Home" },
  { href: "/products", label: "Our Rice" },
  { href: "/about", label: "About Us" },
  {
    href: "/sustainability",
    label: "Sustainability"
  },
  {
    href: "/contact?type=wholesale",
    label: "Wholesale"
  },
  { href: "/contact", label: "Contact" }
];

const ecowareLinks = [
  { href: "/ecoware", label: "Home" },
  {
    href: "/ecoware/products",
    label: "Products"
  },
  {
    href: "/ecoware#wholesale",
    label: "Wholesale"
  },
  {
    href: "/ecoware#samples",
    label: "Samples"
  }
];

export default function Navbar() {
  const [open, setOpen] = useState(false);

  const {
    items = [],
    itemCount = 0
  } = useCart();

  const cartStorefront =
    items?.[0]?.storefront ||
    "shakti_foods";

  const isEcoware =
    cartStorefront === "ecoware";

  /* =====================================================
     ECOWARE NAVBAR
  ===================================================== */

  if (isEcoware) {
    return (
      <motion.header
        initial={{
          y: -80,
          opacity: 0
        }}
        animate={{
          y: 0,
          opacity: 1
        }}
        transition={{
          duration: 0.7
        }}
        className="
          fixed
          left-0
          right-0
          top-0
          z-50
          mobile-safe-padding
          px-3
          pt-3
          md:px-8
          md:pt-4
        "
      >
        <nav
          className="
            mx-auto
            flex
            max-w-7xl
            items-center
            justify-between
            rounded-full
            border
            border-white/70
            bg-white/90
            px-3
            py-2
            shadow-soft
            backdrop-blur-xl
            md:px-4
            md:py-3
          "
        >
          <Link
            href="/ecoware"
            className="flex min-w-0 items-center gap-3"
            aria-label="Simpli Ecoware home"
          >
            <div className="relative h-10 w-10 shrink-0 md:h-12 md:w-12">
              <Image
                src="/images/logo-ecoware-icon.png"
                alt="Simpli Ecoware"
                fill
                priority
                sizes="48px"
                className="object-contain"
              />
            </div>

            <div className="hidden min-w-0 sm:block">
              <div className="whitespace-nowrap text-[17px] font-black leading-none tracking-[-0.03em] text-black md:text-xl">
                SIMPLI ECOWARE
              </div>

              <div className="mt-1 whitespace-nowrap text-[10px] font-medium italic leading-none text-[#4f7f34] md:text-xs">
                Good for Earth, Good for You
              </div>
            </div>
          </Link>

          <div className="hidden items-center gap-2 lg:flex">
            {ecowareLinks.map(
              (link) => (
                <Link
                  key={`${link.href}-${link.label}`}
                  href={link.href}
                  className="rounded-full px-4 py-2 text-sm font-semibold text-black transition hover:bg-brand.sand"
                >
                  {link.label}
                </Link>
              )
            )}

            <Link
              href="/"
              className="ml-1 rounded-full border border-black px-5 py-2 text-sm font-bold text-black transition hover:bg-black hover:text-white"
            >
              Shakti Foods
            </Link>
          </div>

          <div className="flex items-center gap-2">
            <Link
              href="/cart"
              className="relative grid h-10 w-10 place-items-center rounded-full bg-brand.sand text-black ring-1 ring-black/10"
              aria-label="Cart"
            >
              <ShoppingBag size={18} />

              {itemCount > 0 && (
                <span className="absolute -right-1 -top-1 grid h-5 min-w-5 place-items-center rounded-full bg-black px-1 text-xs font-bold text-white">
                  {itemCount}
                </span>
              )}
            </Link>

            <button
              type="button"
              onClick={() =>
                setOpen(
                  (current) =>
                    !current
                )
              }
              className="grid h-10 w-10 place-items-center rounded-full bg-brand.sand text-black ring-1 ring-black/10 lg:hidden"
              aria-label={
                open
                  ? "Close menu"
                  : "Open menu"
              }
            >
              <Menu size={18} />
            </button>
          </div>
        </nav>
      </motion.header>
    );
  }

  /* =====================================================
     SHAKTI FOODS FLOATING NAVBAR
  ===================================================== */

  return (
    <motion.header
      initial={{
        y: -20,
        opacity: 0
      }}
      animate={{
        y: 0,
        opacity: 1
      }}
      transition={{
        duration: 0.45
      }}
      className="
        pointer-events-none
        fixed
        inset-x-0
        top-0
        z-[100]
        px-3
        pt-2.5

        sm:px-4
        sm:pt-3

        lg:px-8
        lg:pt-4
      "
    >
      {/* FLOATING ISLAND */}
      <nav
        className="
          pointer-events-auto
          mx-auto
          flex
          h-[64px]
          w-full
          max-w-[1320px]
          items-center
          justify-between
          rounded-[24px]
          border
          border-white/80
          bg-white/[0.96]
          px-4
          shadow-[0_10px_30px_rgba(38,24,18,0.14)]
          backdrop-blur-xl

          sm:h-[66px]
          sm:px-5

          lg:h-[60px]
          lg:rounded-[22px]
          lg:px-6
        "
      >
        {/* =================================================
            SHAKTI LOGO + BRAND
            DESKTOP + TABLET + MOBILE
        ================================================== */}

        <Link
          href="/"
          aria-label="Shakti Foods home"
          className="
            flex
            min-w-0
            shrink-0
            items-center
            gap-[7px]

            sm:gap-[9px]
            lg:gap-[10px]
          "
        >
          {/* LOGO */}
          <div
            className="
              relative
              h-[36px]
              w-[36px]
              shrink-0

              sm:h-[40px]
              sm:w-[40px]

              lg:h-[42px]
              lg:w-[42px]
            "
          >
            <Image
              src="/images/logo-shakti.png"
              alt="Shakti Foods"
              fill
              priority
              sizes="42px"
              className="object-contain"
            />
          </div>

          {/* BRAND NAME + TAGLINE */}
          <div
            className="
              flex
              min-w-0
              flex-col
              justify-center
            "
          >
            <span
              className="
                whitespace-nowrap
                font-display
                text-[14px]
                font-bold
                leading-[0.95]
                tracking-[-0.025em]
                text-[#17110f]

                sm:text-[16px]
                lg:text-[17px]
              "
            >
              Shakti Foods
            </span>

            <span
              className="
                mt-[4px]
                whitespace-nowrap
                text-[6px]
                font-black
                uppercase
                leading-none
                tracking-[0.22em]
                text-[#17110f]

                sm:mt-[5px]
                sm:text-[7px]
                sm:tracking-[0.25em]

                lg:text-[8px]
                lg:tracking-[0.27em]
              "
            >
              Power of Purity
            </span>
          </div>
        </Link>

        {/* =================================================
            DESKTOP NAV
        ================================================== */}

        <div className="hidden items-center gap-1 lg:flex">
          {shaktiLinks.map(
            (link) => (
              <Link
                key={`${link.href}-${link.label}`}
                href={link.href}
                className="
                  rounded-full
                  px-3.5
                  py-2
                  text-[13px]
                  font-semibold
                  text-[#29211e]
                  transition
                  hover:bg-[#faf3ec]
                  hover:text-[#b80d1b]
                "
              >
                {link.label}
              </Link>
            )
          )}
        </div>

        {/* =================================================
            ACTIONS
        ================================================== */}

        <div className="flex shrink-0 items-center gap-0.5 lg:gap-1">
          <Link
            href="/cart"
            aria-label={`Cart with ${itemCount} items`}
            className="
              relative
              grid
              h-9
              w-9
              place-items-center
              rounded-full
              text-[#211b19]
              transition
              hover:bg-[#faf3ec]
              hover:text-[#b80d1b]
            "
          >
            <ShoppingBag
              size={20}
              strokeWidth={1.8}
            />

            {itemCount > 0 && (
              <span
                className="
                  absolute
                  -right-0.5
                  -top-0.5
                  grid
                  h-[17px]
                  min-w-[17px]
                  place-items-center
                  rounded-full
                  bg-[#b80d1b]
                  px-1
                  text-[9px]
                  font-black
                  text-white
                "
              >
                {itemCount > 99
                  ? "99+"
                  : itemCount}
              </span>
            )}
          </Link>

          <button
            type="button"
            onClick={() =>
              setOpen(
                (current) =>
                  !current
              )
            }
            aria-label={
              open
                ? "Close menu"
                : "Open menu"
            }
            aria-expanded={open}
            className="
              grid
              h-9
              w-9
              place-items-center
              rounded-full
              text-[#211b19]
              transition
              hover:bg-[#faf3ec]
              hover:text-[#b80d1b]
              lg:hidden
            "
          >
            {open ? (
              <X
                size={21}
                strokeWidth={1.8}
              />
            ) : (
              <Menu
                size={22}
                strokeWidth={1.8}
              />
            )}
          </button>
        </div>
      </nav>

      {/* ===================================================
          MOBILE MENU
      ==================================================== */}

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{
              opacity: 0,
              y: -8,
              scale: 0.98
            }}
            animate={{
              opacity: 1,
              y: 0,
              scale: 1
            }}
            exit={{
              opacity: 0,
              y: -8,
              scale: 0.98
            }}
            transition={{
              duration: 0.16
            }}
            className="
              pointer-events-auto
              mx-auto
              mt-2
              w-full
              max-w-[455px]
              overflow-hidden
              rounded-[20px]
              border
              border-white/80
              bg-white/[0.97]
              p-2
              shadow-[0_14px_38px_rgba(38,24,18,0.16)]
              backdrop-blur-xl
              lg:hidden
            "
          >
            <div className="grid gap-0.5">
              {shaktiLinks.map(
                (link) => (
                  <Link
                    key={`${link.href}-${link.label}-mobile`}
                    href={link.href}
                    onClick={() =>
                      setOpen(false)
                    }
                    className="
                      rounded-xl
                      px-4
                      py-2.5
                      text-sm
                      font-semibold
                      text-[#29211e]
                      transition
                      hover:bg-[#faf3ec]
                      hover:text-[#b80d1b]
                    "
                  >
                    {link.label}
                  </Link>
                )
              )}

              <Link
                href="/cart"
                onClick={() =>
                  setOpen(false)
                }
                className="
                  rounded-xl
                  px-4
                  py-2.5
                  text-sm
                  font-bold
                  text-[#b80d1b]
                  hover:bg-[#faf3ec]
                "
              >
                Cart{" "}
                {itemCount > 0
                  ? `(${itemCount})`
                  : ""}
              </Link>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.header>
  );
}