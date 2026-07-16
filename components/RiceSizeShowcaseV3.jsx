"use client";

import Image from "next/image";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { useState } from "react";
import { products, riceBags, formatPrice } from "@/lib/data";
import SectionHeading from "./SectionHeading";
import { useCart } from "@/components/CartProvider";

export default function RiceSizeShowcaseV3() {
  const [selected, setSelected] = useState(riceBags[1]);
  const { addItem } = useCart();
  const selectedProduct = products.find((product) => product.id === selected.id);

  return (
    <section className="section-pad bg-[#f8f4ed] py-16 text-black md:py-28">
      <div className="container-brand grid items-center gap-10 lg:grid-cols-[.98fr_1.02fr] lg:gap-12">
        <div>
          <SectionHeading eyebrow="Rice Collection" title="Choose real 10 lb, 20 lb, and 50 lb bag images." text="10 lb and 20 lb are ready for direct checkout. The 50 lb pack is better handled through wholesale pricing." />
          <div className="mt-7 grid gap-3 sm:grid-cols-3 md:mt-8">
            {riceBags.map((bag) => (
              <button key={bag.id} onClick={() => setSelected(bag)} className={`rounded-3xl border-2 p-4 text-left transition md:p-5 ${selected.id === bag.id ? "border-black bg-black text-white shadow-lift" : "border-black/15 bg-white text-black shadow-soft hover:-translate-y-1 hover:border-black"}`}>
                <div className="font-display text-2xl font-bold">{bag.size}</div>
                <div className={selected.id === bag.id ? "mt-1 text-sm text-white" : "mt-1 text-sm text-black"}>{bag.label}</div>
              </button>
            ))}
          </div>
          <div className="mt-7 rounded-[2rem] bg-white p-5 text-black shadow-soft md:mt-8 md:p-6">
            <div className="font-display text-3xl font-bold text-black">{selected.size}</div>
            <div className="mt-2 leading-7 text-black">{selected.details}</div>
            <div className="mt-4 font-bold text-black">{formatPrice(selectedProduct?.unitPrice)}</div>
            <div className="mt-5 flex flex-wrap gap-2">
              {selected.uses.map((item) => <span key={item} className="rounded-full bg-white px-4 py-2 text-sm font-semibold text-black ring-1 ring-black/15">{item}</span>)}
            </div>
            <div className="mt-6 grid gap-3 sm:flex">
              {selectedProduct?.canCheckout ? (
                <button onClick={() => addItem(selectedProduct)} className="rounded-full bg-black px-6 py-3 font-bold text-white transition hover:bg-[#333333]">Add to Cart</button>
              ) : (
                <Link href={`/products/${selectedProduct.slug}#wholesale`} className="rounded-full bg-black px-6 py-3 text-center font-bold text-white transition hover:bg-[#333333]">Request Wholesale Price</Link>
              )}
              <Link href={`/products/${selectedProduct.slug}`} className="rounded-full bg-brand.sand px-6 py-3 text-center font-bold text-black transition hover:bg-[#ded1bf]">View Details</Link>
            </div>
          </div>
        </div>
        <div className="relative min-h-[430px] overflow-hidden rounded-[2rem] bg-gradient-to-br from-[#fbf1e2] to-[#f0f7eb] shadow-lift md:min-h-[560px] md:rounded-[2.5rem]">
          <AnimatePresence mode="wait">
            <motion.div key={selected.id} initial={{ opacity: 0, scale: 0.9, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.96, y: -10 }} transition={{ duration: 0.45 }} whileHover={{ y: -12, scale: 1.03 }} className="relative z-10 mx-auto h-[430px] w-full max-w-[380px] md:h-[560px] md:max-w-[460px]">
              <Image src={selected.image} alt={`Shakti Foods ${selected.size} rice bag`} fill className="object-contain p-5 drop-shadow-[0_35px_45px_rgba(0,0,0,.18)] md:p-8" sizes="(max-width: 768px) 90vw, 42vw" />
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </section>
  );
}
