import Image from "next/image";
import Link from "next/link";
import { site, whatsappLink } from "@/lib/site";

export default function Footer() {
  return (
    <footer className="section-pad bg-[#f7f3ea] py-14 text-black">
      <div className="container-brand grid gap-10 md:grid-cols-[1.2fr_.8fr_.9fr]">
        <div>
          <div className="flex items-center gap-3">
            <div className="relative h-14 w-14 overflow-hidden rounded-full bg-white">
              <Image src="/images/logo-shakti.png" alt="Shakti Foods logo" fill className="object-contain p-1" />
            </div>
            <div>
              <div className="font-display text-2xl font-bold text-black">{site.name}</div>
              <div className="text-xs uppercase tracking-[.2em] text-black">{site.tagline}</div>
            </div>
          </div>
          <p className="mt-5 max-w-lg leading-8 text-black">
            Premium Basmati rice and eco-friendly disposable tableware for retail customers,
            restaurants, caterers, and wholesale buyers.
          </p>
        </div>

        <div>
          <h3 className="font-bold text-black">Quick Links</h3>
          <div className="mt-4 grid gap-3 text-black">
            <Link href="/">Home</Link>
            <Link href="/products">Products</Link>
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
            <a href={whatsappLink()} target="_blank" rel="noreferrer">WhatsApp: {site.phone}</a>
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
