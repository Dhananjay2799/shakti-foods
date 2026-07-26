"use client";

import Image from "next/image";
import Link from "next/link";
import { formatPrice } from "@/lib/data";

export default function RelatedProducts({ products = [] }) {
  if (!products.length) {
    return null;
  }

  return (
    <section className="rounded-[2rem] bg-white p-5 shadow-soft md:p-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="text-xs font-bold uppercase tracking-[0.18em] text-black/60">
            Explore More
          </div>

          <h2 className="mt-2 font-display text-3xl font-bold text-black md:text-4xl">
            You May Also Like
          </h2>
        </div>

        <Link
          href="/products"
          className="rounded-full border border-black/15 px-5 py-2.5 text-sm font-bold text-black transition hover:bg-black hover:text-white"
        >
          View All Products
        </Link>
      </div>

      <div className="mt-7 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {products.map((product) => {
          const availableStock = Math.max(
            Number(product.inventory?.stock_quantity || 0) -
              Number(product.inventory?.reserved_quantity || 0),
            0
          );

          return (
            <article
              key={product.id}
              className="group overflow-hidden rounded-[1.5rem] border border-black/10 bg-[#f8f4ed]"
            >
              <Link
                href={`/products/${product.slug}`}
                className="block"
              >
                <div className="relative aspect-square overflow-hidden bg-white">
                  <Image
                    src={
                      product.image ||
                      "/images/product-placeholder.png"
                    }
                    alt={product.name}
                    fill
                    sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
                    className="object-contain p-5 transition duration-500 group-hover:scale-105"
                  />

                  {product.badge ? (
                    <span className="absolute left-3 top-3 rounded-full bg-black px-3 py-1 text-xs font-bold text-white">
                      {product.badge}
                    </span>
                  ) : null}
                </div>

                <div className="p-4">
                  <div className="text-xs font-bold uppercase tracking-[0.16em] text-black/55">
                    {product.category}
                  </div>

                  <h3 className="mt-2 line-clamp-2 min-h-[3rem] font-display text-lg font-bold leading-6 text-black">
                    {product.name}
                  </h3>

                  <div className="mt-4 flex items-center justify-between gap-3">
                    <span className="font-bold text-black">
                      {formatPrice(product.unitPrice)}
                    </span>

                    <span
                      className={`text-xs font-bold ${
                        availableStock > 0
                          ? "text-green-700"
                          : "text-red-700"
                      }`}
                    >
                      {availableStock > 0
                        ? "In Stock"
                        : "Out of Stock"}
                    </span>
                  </div>
                </div>
              </Link>
            </article>
          );
        })}
      </div>
    </section>
  );
}