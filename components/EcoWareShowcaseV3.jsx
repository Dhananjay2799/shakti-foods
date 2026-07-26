"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import SectionHeading from "@/components/SectionHeading";
import VideoBackground from "@/components/VideoBackground";
import { useCart } from "@/components/CartProvider";
import { formatPrice } from "@/lib/data";

function getAvailableStock(product) {
  if (!product?.inventory) {
    return null;
  }

  return Math.max(
    Number(
      product.inventory.stock_quantity || 0
    ) -
      Number(
        product.inventory.reserved_quantity || 0
      ),
    0
  );
}

export default function EcoWareShowcaseV3({
  products = []
}) {
  const { addItem } = useCart();

  const ecoProducts =
    products.filter(
      (product) =>
        product.categoryId ===
        "tableware"
    );

  if (ecoProducts.length === 0) {
    return null;
  }

  function handleAddToCart(
    product
  ) {
    const availableStock =
      getAvailableStock(product);

    const isOutOfStock =
      product.inventory
        ? !product.inventory
            .is_active ||
          availableStock <= 0
        : false;

    if (
      !product.canCheckout ||
      isOutOfStock
    ) {
      return;
    }

    addItem(product, {
      availableStock
    });
  }

  return (
    <section className="section-pad relative overflow-hidden bg-[#eef5ea] py-16 text-black md:py-28">
      <div className="absolute inset-0 opacity-45">
        <VideoBackground
          src="/videos/eco-farm.mp4"
          mobileSrc="/videos/eco-farm-mobile.mp4"
          poster="/nature/eco-bg.svg"
          overlayClassName="bg-white/45"
        />
      </div>

      <div className="container-brand relative">
        <SectionHeading
          eyebrow="Simpli Ecoware"
          title="Compostable sugarcane tableware for restaurants and catering."
          text="Browse currently active Eco-Friendly Tableware products, shop available packs, or request wholesale support."
        />

        <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4 md:mt-12">
          {ecoProducts.map(
            (product, index) => {
              const availableStock =
                getAvailableStock(
                  product
                );

              const isOutOfStock =
                product.inventory
                  ? !product.inventory
                      .is_active ||
                    availableStock <=
                      0
                  : false;

              const canAddToCart =
                product.canCheckout &&
                !isOutOfStock &&
                product.unitPrice !==
                  null &&
                product.unitPrice > 0;

              return (
                <motion.article
                  key={product.id}
                  initial={{
                    opacity: 0,
                    y: 32
                  }}
                  whileInView={{
                    opacity: 1,
                    y: 0
                  }}
                  transition={{
                    delay:
                      index * 0.06,
                    duration: 0.5
                  }}
                  viewport={{
                    once: true
                  }}
                  whileHover={{
                    y: -8,
                    scale: 1.01
                  }}
                  className="flex h-full flex-col rounded-[1.75rem] bg-white/92 p-4 text-black shadow-soft backdrop-blur-xl ring-1 ring-black/5 md:rounded-[2rem] md:p-5"
                >
                  <Link
                    href={`/products/${product.slug}`}
                    className="block"
                  >
                    <div className="relative h-56 overflow-hidden rounded-[1.4rem] bg-[#f8f6f0] md:h-64 md:rounded-[1.6rem]">
                      <img
                        src={
                          product.image ||
                          "/images/product-placeholder.png"
                        }
                        alt={
                          product.name
                        }
                        loading="lazy"
                        className="h-full w-full object-contain p-4 md:p-6"
                      />
                    </div>
                  </Link>

                  <div className="mt-4 inline-flex w-fit rounded-full bg-white px-3 py-1 text-xs font-bold uppercase tracking-[.14em] text-black ring-1 ring-black/15 md:mt-5">
                    {product.badge ||
                      product.packSize ||
                      "Product"}
                  </div>

                  <Link
                    href={`/products/${product.slug}`}
                  >
                    <h3 className="mt-3 font-display text-2xl font-bold leading-tight text-black">
                      {product.name}
                    </h3>
                  </Link>

                  <p className="mt-2 line-clamp-3 text-sm leading-6 text-black/70">
                    {product.subtitle}
                  </p>

                  <div className="mt-4 font-bold text-black">
                    {formatPrice(
                      product.unitPrice
                    )}
                  </div>

                  {availableStock !==
                  null ? (
                    <p
                      className={[
                        "mt-3 text-sm font-bold",
                        isOutOfStock
                          ? "text-red-700"
                          : "text-green-700"
                      ].join(" ")}
                    >
                      {isOutOfStock
                        ? "Out of stock"
                        : `${availableStock} available`}
                    </p>
                  ) : null}

                  <div className="mt-auto grid gap-3 pt-5">
                    <button
                      type="button"
                      disabled={
                        !canAddToCart
                      }
                      onClick={() =>
                        handleAddToCart(
                          product
                        )
                      }
                      className="w-full rounded-full bg-black px-5 py-3 text-center text-sm font-bold text-white transition hover:bg-[#333333] disabled:cursor-not-allowed disabled:bg-black/30"
                    >
                      {isOutOfStock
                        ? "Out of Stock"
                        : product.canCheckout
                          ? "Add to Cart"
                          : "Unavailable"}
                    </button>

                    <Link
                      href={`/contact?product=${encodeURIComponent(
                        product.name
                      )}&productId=${encodeURIComponent(
                        product.id
                      )}&type=wholesale`}
                      className="w-full rounded-full bg-[#eee3d2] px-5 py-3 text-center text-sm font-bold text-black transition hover:bg-[#ded1bf]"
                    >
                      Request Wholesale Price
                    </Link>

                    <Link
                      href={`/products/${product.slug}`}
                      className="w-full text-center text-sm font-bold text-black underline-offset-4 hover:underline"
                    >
                      View Details
                    </Link>
                  </div>
                </motion.article>
              );
            }
          )}
        </div>
      </div>
    </section>
  );
}