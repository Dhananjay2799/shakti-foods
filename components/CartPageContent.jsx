"use client";

import Image from "next/image";
import Link from "next/link";
import { Minus, Plus, Trash2 } from "lucide-react";
import { useCart } from "@/components/CartProvider";
import { formatPrice } from "@/lib/data";
import { getCheckoutEstimate, commerce } from "@/lib/commerce";
import SectionHeading from "@/components/SectionHeading";

export default function CartPageContent() {
  const { items, subtotal, increase, decrease, removeItem, clearCart } = useCart();
  const estimate = getCheckoutEstimate(subtotal);

  return (
    <main className="bg-brand-radial pt-24 text-black md:pt-28">
      <section className="section-pad py-14 md:py-20">
        <div className="container-brand">
          <SectionHeading  eyebrow="Cart"  title="Your shopping cart"  text="Review your items, adjust quantities, and proceed securely to checkout."/>

          {items.length === 0 ? (
            <div className="mt-8 rounded-[2rem] bg-white p-5 shadow-soft md:mt-10 md:p-8">
              <p className="text-lg text-black">Your cart is empty.</p>
              <Link href="/products" className="mt-6 inline-flex rounded-full bg-black px-6 py-3 font-bold text-white">Shop Products</Link>
            </div>
          ) : (
            <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_380px] md:mt-10 md:gap-8">
              <div className="grid gap-4">
                {items.map((item) => (
                  <div key={item.id} className="rounded-[1.75rem] bg-white p-4 shadow-soft md:rounded-[2rem] md:p-5">
                    <div className="grid gap-4 sm:grid-cols-[120px_1fr] lg:grid-cols-[140px_1fr_auto] lg:items-center">
                      <div className="relative h-32 overflow-hidden rounded-[1.3rem] bg-[#faf6ee] sm:h-36">
                        <Image src={item.image} alt={item.name} fill className="object-contain p-4" sizes="140px" />
                      </div>
                      <div>
                        <div className="text-xs font-bold uppercase tracking-[.15em] text-black">{item.category}</div>
                        <div className="mt-1 font-display text-2xl font-bold text-black">{item.name}</div>
                        <div className="mt-2 text-black">{formatPrice(item.unitPrice)} each</div>
                      </div>
                      <div className="flex flex-wrap items-center gap-3">
                        <div className="flex items-center rounded-full bg-brand.sand p-1">
                          <button onClick={() => decrease(item.id)} className="grid h-9 w-9 place-items-center rounded-full bg-white text-black" aria-label="Decrease quantity"><Minus size={16} /></button>
                          <span className="min-w-10 text-center font-bold text-black">{item.quantity}</span>
                          <button onClick={() => increase(item.id, item.availableStock)} className="grid h-9 w-9 place-items-center rounded-full bg-white text-black" aria-label="Increase quantity"><Plus size={16} /></button>
                        </div>
                        <button onClick={() => removeItem(item.id)} className="inline-flex items-center gap-2 rounded-full bg-red-50 px-4 py-2 text-sm font-bold text-black transition hover:bg-red-100"><Trash2 size={16} /> Remove</button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <aside className="h-fit rounded-[2rem] bg-white p-5 shadow-soft md:p-6">
                <div className="font-display text-3xl font-bold text-black">Order Summary</div>
                <div className="mt-6 grid gap-4 text-black">
                  <div className="flex justify-between"><span>Items</span><span>{items.reduce((sum, item) => sum + item.quantity, 0)}</span></div>
                  <div className="flex justify-between"><span>Subtotal</span><span>{formatPrice(subtotal)}</span></div>
                  <div className="flex justify-between"><span>Est. Shipping</span><span>{estimate.shipping === 0 ? "Free" : formatPrice(estimate.shipping)}</span></div>
                  <div className="flex justify-between"><span>Est. Tax</span><span>{formatPrice(estimate.tax)}</span></div>
                  <div className="border-t border-black/10 pt-4 text-sm">Free shipping threshold: {formatPrice(commerce.freeShippingThreshold)}.</div>
                </div>
                <Link href="/checkout" className="mt-6 block rounded-full bg-black px-6 py-4 text-center font-bold text-white transition hover:bg-[#333333]">Proceed to Checkout</Link>
                <button onClick={clearCart} className="mt-3 w-full rounded-full bg-brand.sand px-6 py-3 font-bold text-black transition hover:bg-[#ded1bf]">Clear Cart</button>
              </aside>
            </div>
          )}
        </div>
      </section>
    </main>
  );
}
