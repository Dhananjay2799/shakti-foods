"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect } from "react";
import { useCart } from "@/components/CartProvider";
import { formatPrice } from "@/lib/data";
import { productToGaItem, trackEvent } from "@/lib/analytics";
import WholesaleInquiryForm from "@/components/WholesaleInquiryForm";

export default function ProductDetailClient({ product }) {
  const { addItem } = useCart();

  useEffect(() => {
    trackEvent("view_item", {
      currency: "USD",
      value: product.unitPrice || 0,
      items: [productToGaItem(product)]
    });
  }, [product]);

  return (
    <main className="bg-brand-radial pt-24 text-black md:pt-28">
      <section className="section-pad py-14 md:py-20">
        <div className="container-brand">
          <Link href="/products" className="inline-flex rounded-full bg-white px-4 py-2 text-sm font-bold text-black shadow-soft">← Back to Products</Link>

          <div className="mt-8 grid gap-8 lg:grid-cols-[.95fr_1.05fr] lg:items-start">
            <div className="rounded-[2rem] bg-white p-5 shadow-lift md:p-8">
              <div className="relative h-[390px] overflow-hidden rounded-[1.6rem] bg-[#faf6ee] md:h-[560px]">
                <Image src={product.image} alt={product.name} fill priority className="object-contain p-5 md:p-8" sizes="(max-width: 1024px) 92vw, 46vw" />
              </div>
            </div>

            <div>
              <div className="inline-flex rounded-full bg-white px-3 py-1 text-xs font-bold uppercase tracking-[.16em] text-black ring-1 ring-black/15">{product.badge}</div>
              <h1 className="mt-4 font-display text-4xl font-bold leading-tight text-black md:text-6xl">{product.name}</h1>
              <p className="mt-5 text-lg leading-8 text-black">{product.shortDescription}</p>

              <div className="mt-6 rounded-[2rem] bg-white p-5 shadow-soft md:p-6">
                <div className="grid gap-3 text-black sm:grid-cols-2">
                  <div><div className="text-sm font-bold uppercase tracking-[.16em]">Pack Size</div><div className="mt-1">{product.packSize}</div></div>
                  <div><div className="text-sm font-bold uppercase tracking-[.16em]">Price</div><div className="mt-1 font-bold">{formatPrice(product.unitPrice)}</div></div>
                </div>
                <div className="mt-6">
                  {product.canCheckout ? (
                    <button onClick={() => addItem(product)} className="w-full rounded-full bg-black px-6 py-4 font-bold text-white transition hover:bg-[#333333] sm:w-auto">Add to Cart</button>
                  ) : (
                    <a href="#wholesale" className="inline-flex w-full justify-center rounded-full bg-black px-6 py-4 font-bold text-white transition hover:bg-[#333333] sm:w-auto">Request Wholesale Price</a>
                  )}
                </div>
              </div>

              <div className="mt-8 rounded-[2rem] bg-white p-5 shadow-soft md:p-6">
                <h2 className="font-display text-3xl font-bold text-black">Key Features</h2>
                <ul className="mt-5 grid gap-4">
                  {product.features.map((feature) => (
                    <li key={feature} className="rounded-2xl bg-[#f8f4ed] p-4 leading-7 text-black">{feature}</li>
                  ))}
                </ul>
              </div>

              <div className="mt-8 rounded-[2rem] bg-white p-5 shadow-soft md:p-6">
                <h2 className="font-display text-3xl font-bold text-black">Best For</h2>
                <p className="mt-3 leading-8 text-black">{product.bestFor}</p>
              </div>
            </div>
          </div>

          {product.wholesale ? (
            <div id="wholesale" className="mt-10 max-w-3xl scroll-mt-28">
              <WholesaleInquiryForm productName={product.name} />
            </div>
          ) : null}
        </div>
      </section>
    </main>
  );
}
