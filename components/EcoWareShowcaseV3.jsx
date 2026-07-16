"use client";

import Image from "next/image";
import { motion } from "framer-motion";
import { products, formatPrice } from "@/lib/data";
import SectionHeading from "./SectionHeading";
import VideoBackground from "./VideoBackground";
import { useCart } from "@/components/CartProvider";
import Link from "next/link";

export default function EcoWareShowcaseV3() {
  const ecoProducts = products.filter((p) => p.category === "EcoWare");
  const { addItem } = useCart();

  return (
    <section className="section-pad relative overflow-hidden bg-[#eef5ea] py-16 text-black md:py-28">
      <div className="absolute inset-0 opacity-45">
        <VideoBackground src="/videos/eco-farm.mp4" mobileSrc="/videos/eco-farm-mobile.mp4" poster="/nature/eco-bg.svg" overlayClassName="bg-white/45" />
      </div>
      <div className="container-brand relative">
        <SectionHeading eyebrow="Simpli Ecoware" title="Compostable sugarcane tableware for restaurants and catering." text="EcoWare products are handled through wholesale inquiry so bulk buyers receive accurate pricing, availability, and shipping support." />
        <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4 md:mt-12">
          {ecoProducts.map((product, index) => (
            <motion.article key={product.id} initial={{ opacity: 0, y: 32 }} whileInView={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.06, duration: 0.5 }} viewport={{ once: true }} whileHover={{ y: -8, scale: 1.01 }} className="rounded-[1.75rem] bg-white/92 p-4 text-black shadow-soft backdrop-blur-xl ring-1 ring-black/5 md:rounded-[2rem] md:p-5">
              <Link href={`/products/${product.slug}`} className="block">
                <div className="relative h-56 overflow-hidden rounded-[1.4rem] bg-[#f8f6f0] md:h-64 md:rounded-[1.6rem]">
                  <Image src={product.image} alt={product.name} fill className="object-contain p-4 md:p-6" sizes="(max-width: 640px) 92vw, (max-width: 1024px) 45vw, 25vw" />
                </div>
              </Link>
              <div className="mt-4 inline-flex rounded-full bg-white px-3 py-1 text-xs font-bold uppercase tracking-[.14em] text-black ring-1 ring-black/15 md:mt-5">{product.badge}</div>
              <Link href={`/products/${product.slug}`}><h3 className="mt-3 font-display text-2xl font-bold leading-tight text-black">{product.name}</h3></Link>
              <p className="mt-2 text-sm leading-6 text-black">{product.subtitle}</p>
              <div className="mt-4 font-bold text-black">{formatPrice(product.unitPrice)}</div>
              <div className="mt-5 grid gap-3">
                <button
                  onClick={() => addItem(product)}
                  className="w-full rounded-full bg-black px-5 py-3 text-center text-sm font-bold text-white transition hover:bg-[#333333]">Add to Cart
                </button>

                 <Link
                   href={`/products/${product.slug}#wholesale`}
                   className="w-full rounded-full bg-brand.sand px-5 py-3 text-center text-sm font-bold text-black transition hover:bg-[#ded1bf]"
                 >
                   Request Wholesale Price
                 </Link>
              </div>
            </motion.article>
          ))}
        </div>
      </div>
    </section>
  );
}
