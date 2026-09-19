"use client";

import Image from "next/image";
import Link from "next/link";
import { Menu, ShoppingBag } from "lucide-react";
import { useState } from "react";
import { motion } from "framer-motion";
import { useCart } from "@/components/CartProvider";

const shaktiLinks = [
  { href: "/", label: "Home" },
  { href: "/products", label: "Products" },
  { href: "/ecoware", label: "Simpli Ecoware" },
  { href: "/sustainability", label: "Sustainability" },
  { href: "/about", label: "About" },
  { href: "/contact", label: "Contact" }
];

const ecowareLinks = [
  { href: "/ecoware", label: "Home" },
  { href: "/ecoware/products", label: "Products" },
  { href: "/ecoware#wholesale", label: "Wholesale" },
  { href: "/ecoware#samples", label: "Samples" }
];

export default function Navbar() {
  const [open, setOpen] = useState(false);

  const { items = [], itemCount = 0 } = useCart();

  /*
   * Cart storefront determines the branding on shared pages such as /cart.
   *
   * Mixed storefront carts are already prevented by CartProvider, so checking
   * the first item is safe.
   */
  const cartStorefront = items?.[0]?.storefront || "shakti_foods";
  const isEcoware = cartStorefront === "ecoware";

  const links = isEcoware ? ecowareLinks : shaktiLinks;

  return (
    <motion.header
      initial={{ y: -80, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.7 }}
      className="fixed left-0 right-0 top-0 z-50 mobile-safe-padding px-3 pt-3 md:px-8 md:pt-4"
    >
      <nav className="mx-auto flex max-w-7xl items-center justify-between rounded-full border border-white/70 bg-white/88 px-3 py-2 shadow-soft backdrop-blur-xl md:px-4 md:py-3">
        {/* BRAND */}
        {isEcoware ? (
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
          ) : (
          <Link
            href="/"
            className="flex min-w-0 items-center gap-2 md:gap-3"
            aria-label="Shakti Foods home"
          >
            <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-full bg-white ring-1 ring-black/10 md:h-12 md:w-12">
              <Image
                src="/images/logo-shakti.png"
                alt="Shakti Foods logo"
                fill
                className="object-contain p-1"
                priority
              />
            </div>

            <div className="min-w-0">
              <div className="truncate font-display text-lg font-bold leading-tight text-black md:text-xl">
                Shakti Foods
              </div>

              <div className="truncate text-[10px] font-semibold uppercase tracking-[.15em] text-black md:text-xs md:tracking-[.18em]">
                Power of Purity
              </div>
            </div>
          </Link>
        )}

        {/* DESKTOP NAVIGATION */}
        <div className="hidden items-center gap-2 lg:flex">
          {links.map((link) => (
            <Link
              key={`${link.href}-${link.label}`}
              href={link.href}
              className="rounded-full px-4 py-2 text-sm font-semibold text-black transition hover:bg-brand.sand"
            >
              {link.label}
            </Link>
          ))}

          {isEcoware && (
            <Link
              href="/"
              className="ml-1 rounded-full border border-black px-5 py-2 text-sm font-bold text-black transition hover:bg-black hover:text-white"
            >
              Shakti Foods
            </Link>
          )}
        </div>

        {/* CART + MOBILE MENU */}
        <div className="flex items-center gap-2">
          <Link
            href="/cart"
            className="relative grid h-10 w-10 place-items-center rounded-full bg-brand.sand text-black ring-1 ring-black/10 transition hover:scale-105 hover:bg-white md:h-11 md:w-11"
            aria-label="Cart"
          >
            <ShoppingBag size={18} />

            {itemCount > 0 ? (
              <span className="absolute -right-1 -top-1 grid h-5 min-w-5 place-items-center rounded-full bg-black px-1 text-xs font-bold text-white">
                {itemCount}
              </span>
            ) : null}
          </Link>

          <button
            type="button"
            onClick={() => setOpen((current) => !current)}
            className="grid h-10 w-10 place-items-center rounded-full bg-brand.sand text-black ring-1 ring-black/10 lg:hidden"
            aria-label={open ? "Close menu" : "Open menu"}
            aria-expanded={open}
          >
            <Menu size={18} />
          </button>
        </div>
      </nav>

      {/* MOBILE MENU */}
      {open && (
        <div className="mx-auto mt-3 max-w-7xl rounded-3xl bg-white/95 p-4 shadow-soft backdrop-blur-xl lg:hidden">
          <div className="grid gap-2">
            {links.map((link) => (
              <Link
                key={`${link.href}-${link.label}-mobile`}
                href={link.href}
                onClick={() => setOpen(false)}
                className="rounded-2xl px-4 py-3 font-semibold text-black hover:bg-brand.sand"
              >
                {link.label}
              </Link>
            ))}

            {isEcoware && (
              <Link
                href="/"
                onClick={() => setOpen(false)}
                className="rounded-2xl border border-black/10 px-4 py-3 font-semibold text-black hover:bg-brand.sand"
              >
                Shakti Foods
              </Link>
            )}

            <Link
              href="/cart"
              onClick={() => setOpen(false)}
              className="rounded-2xl px-4 py-3 font-semibold text-black hover:bg-brand.sand"
            >
              Cart {itemCount > 0 ? `(${itemCount})` : ""}
            </Link>
          </div>
        </div>
      )}
    </motion.header>
  );
}