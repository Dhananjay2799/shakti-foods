"use client";

import Image from "next/image";
import Link from "next/link";
import { Menu, ShoppingBag } from "lucide-react";
import { useState } from "react";
import { motion } from "framer-motion";
import { useCart } from "@/components/CartProvider";

const links = [
  { href: "/", label: "Home" },
  { href: "/products", label: "Products" },
  { href: "/sustainability", label: "Sustainability" },
  { href: "/about", label: "About" },
  { href: "/contact", label: "Contact" }
];

export default function Navbar() {
  const [open, setOpen] = useState(false);
  const { itemCount } = useCart();

  return (
    <motion.header
      initial={{ y: -80, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.7 }}
      className="fixed left-0 right-0 top-0 z-50 mobile-safe-padding px-3 pt-3 md:px-8 md:pt-4"
    >
      <nav className="mx-auto flex max-w-7xl items-center justify-between rounded-full border border-white/70 bg-white/88 px-3 py-2 shadow-soft backdrop-blur-xl md:px-4 md:py-3">
        <Link href="/" className="flex min-w-0 items-center gap-2 md:gap-3">
          <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-full bg-white ring-1 ring-black/10 md:h-12 md:w-12">
            <Image src="/images/logo-shakti.png" alt="Shakti Foods logo" fill className="object-contain p-1" priority />
          </div>
          <div className="min-w-0">
            <div className="truncate font-display text-lg font-bold leading-tight text-black md:text-xl">Shakti Foods</div>
            <div className="truncate text-[10px] font-semibold uppercase tracking-[.15em] text-black md:text-xs md:tracking-[.18em]">
              Power of Purity
            </div>
          </div>
        </Link>

        <div className="hidden items-center gap-2 lg:flex">
          {links.map((link) => (
            <Link key={link.href} href={link.href} className="rounded-full px-4 py-2 text-sm font-semibold text-black transition hover:bg-brand.sand">
              {link.label}
            </Link>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <Link href="/cart" className="relative grid h-10 w-10 place-items-center rounded-full bg-brand.sand text-black ring-1 ring-black/10 transition hover:scale-105 hover:bg-white md:h-11 md:w-11" aria-label="Cart">
            <ShoppingBag size={18} />
            {itemCount > 0 ? (
              <span className="absolute -right-1 -top-1 grid h-5 min-w-5 place-items-center rounded-full bg-black px-1 text-xs font-bold text-white">
                {itemCount}
              </span>
            ) : null}
          </Link>

          <button onClick={() => setOpen(!open)} className="grid h-10 w-10 place-items-center rounded-full bg-brand.sand text-black ring-1 ring-black/10 lg:hidden" aria-label="Open menu">
            <Menu size={18} />
          </button>
        </div>
      </nav>

      {open && (
        <div className="mx-auto mt-3 max-w-7xl rounded-3xl bg-white/95 p-4 shadow-soft backdrop-blur-xl lg:hidden">
          <div className="grid gap-2">
            {links.map((link) => (
              <Link key={link.href} href={link.href} onClick={() => setOpen(false)} className="rounded-2xl px-4 py-3 font-semibold text-black hover:bg-brand.sand">
                {link.label}
              </Link>
            ))}
            <Link href="/cart" onClick={() => setOpen(false)} className="rounded-2xl px-4 py-3 font-semibold text-black hover:bg-brand.sand">
              Cart {itemCount > 0 ? `(${itemCount})` : ""}
            </Link>
          </div>
        </div>
      )}
    </motion.header>
  );
}
