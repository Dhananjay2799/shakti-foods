"use client";

import Image from "next/image";
import Link from "next/link";
import { Menu, X } from "lucide-react";
import { useState } from "react";

const links = [
  {
    href: "/ecoware",
    label: "Home"
  },
  {
    href: "/ecoware/products",
    label: "Products"
  },
  {
    href: "/ecoware#wholesale",
    label: "Wholesale"
  },
  {
    href: "/ecoware#about",
    label: "About"
  },
  {
    href: "/ecoware/sustainability",
    label: "Sustainability"
  }
];

export default function EcowareMobileMenu() {
  const [open, setOpen] = useState(false);

  function closeMenu() {
    setOpen(false);
  }

  return (
    <div className="relative lg:hidden">
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        className="
          grid h-11 w-11 place-items-center
          rounded-full
          border border-black/10
          bg-white
          text-black
          transition
          hover:bg-[#f7f3ea]
        "
        aria-label={open ? "Close menu" : "Open menu"}
        aria-expanded={open}
      >
        {open ? <X size={21} /> : <Menu size={21} />}
      </button>

      {open && (
        <>
          {/* Click-away backdrop */}
          <button
            type="button"
            aria-label="Close menu"
            onClick={closeMenu}
            className="fixed inset-0 z-40 bg-black/10 backdrop-blur-[1px]"
          />

          {/* Menu */}
          <div
            className="
              absolute right-0 top-[calc(100%+12px)]
              z-50
              w-[min(310px,calc(100vw-32px))]
              overflow-hidden
              rounded-[24px]
              border border-black/10
              bg-white
              p-3
              shadow-[0_20px_60px_rgba(0,0,0,0.16)]
            "
          >
            <div className="px-3 pb-3 pt-2">
              <p className="text-[11px] font-black uppercase tracking-[0.18em] text-black/35">
                Simpli Ecoware
              </p>

              <p className="mt-1 text-sm font-medium italic text-[#4f7f34]">
                Good for Earth, Good for You
              </p>
            </div>

            <div className="border-t border-black/10 pt-2">
              {links.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={closeMenu}
                  className="
                    flex items-center justify-between
                    rounded-2xl
                    px-4 py-3.5
                    text-[15px] font-bold
                    text-black
                    transition
                    hover:bg-[#f7f3ea]
                  "
                >
                  <span>{link.label}</span>
                  <span aria-hidden="true">→</span>
                </Link>
              ))}
            </div>

            <div className="mt-2 border-t border-black/10 pt-3">
              <a
                href="https://www.shakti-foods.com"
                onClick={closeMenu}
                className="
                  flex
                  w-full
                  items-center
                  justify-center
                  gap-3
                  rounded-full
                  border
                  border-black
                  px-5
                  py-2.5
                  text-sm
                  font-black
                  text-black
                  transition
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
              </a>
            </div>
          </div>
        </>
      )}
    </div>
  );
}