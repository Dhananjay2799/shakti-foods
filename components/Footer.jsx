"use client";

import Image from "next/image";
import Link from "next/link";

import { useCart } from "@/components/CartProvider";
import { site, whatsappLink } from "@/lib/site";

export default function Footer() {
  const { items = [] } = useCart();

  const cartStorefront = items?.[0]?.storefront || "shakti_foods";
  const isEcoware = cartStorefront === "ecoware";

  /*
   * SIMPLI ECOWARE FOOTER
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
   * SHAKTI FOODS FOOTER
   *
   * Original Shakti design remains intact.
   */
  return (
    <footer className="section-pad bg-[#f7f3ea] py-14 text-black">
      <div className="container-brand grid gap-10 md:grid-cols-[1.2fr_.8fr_.9fr]">
        <div>
          <div className="flex items-center gap-3">
            <div className="relative h-14 w-14 overflow-hidden rounded-full bg-white">
              <Image
                src="/images/logo-shakti.png"
                alt="Shakti Foods logo"
                fill
                className="object-contain p-1"
              />
            </div>

            <div>
              <div className="font-display text-2xl font-bold text-black">
                {site.name}
              </div>

              <div className="text-xs uppercase tracking-[.2em] text-black">
                {site.tagline}
              </div>
            </div>
          </div>

          <p className="mt-5 max-w-lg leading-8 text-black">
            Premium Basmati rice and eco-friendly disposable tableware for
            retail customers, restaurants, caterers, and wholesale buyers.
          </p>
        </div>

        <div>
          <h3 className="font-bold text-black">Quick Links</h3>

          <div className="mt-4 grid gap-3 text-black">
            <Link href="/">Home</Link>

            <Link href="/products">Shakti Products</Link>

            <Link href="/ecoware">Simpli Ecoware</Link>

            <Link href="/sustainability">Sustainability</Link>

            <Link href="/about">About</Link>

            <Link href="/contact">Contact</Link>
          </div>
        </div>

        <div>
          <h3 className="font-bold text-black">Contact</h3>

          <div className="mt-4 grid gap-3 text-black">
            <a href={`tel:${site.phoneRaw}`}>{site.phone}</a>

            <a href={`mailto:${site.email}`}>{site.email}</a>

            <a
              href={whatsappLink()}
              target="_blank"
              rel="noreferrer"
            >
              WhatsApp: {site.phone}
            </a>

            <div>{site.address}</div>

            <div>{site.hours}</div>
          </div>
        </div>
      </div>

      <div className="container-brand mt-10 border-t border-black/10 pt-5 text-sm text-black">
        © {new Date().getFullYear()} {site.name}. All rights reserved.
      </div>
    </footer>
  );
}