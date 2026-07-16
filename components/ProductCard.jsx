"use client";

import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";
import { useCart } from "@/components/CartProvider";
import { formatPrice } from "@/lib/data";
import { useInventory } from "@/hooks/useInventory";

export default function ProductCard({
  product,
  index = 0
}) {
  const { addItem } = useCart();
  const { getStock, loading } = useInventory();

  const inventoryItem = getStock(product.id);

  const availableStock = inventoryItem
    ? inventoryItem.stock_quantity -
      inventoryItem.reserved_quantity
    : null;

  const isOutOfStock =
    Boolean(inventoryItem) &&
    (
      !inventoryItem.is_active ||
      availableStock <= 0
    );

  const isLowStock =
    Boolean(inventoryItem) &&
    availableStock > 0 &&
    availableStock <=
      inventoryItem.low_stock_threshold;

  function handleAddToCart() {
    const added = addItem(product, {
      availableStock
    });

    if (!added && isOutOfStock) {
      alert("This product is currently out of stock.");
    }
  }

  return (
    <motion.article
      initial={{ opacity: 0, y: 28 }}
      whileInView={{ opacity: 1, y: 0 }}
      transition={{
        delay: index * 0.06,
        duration: 0.45
      }}
      viewport={{ once: true }}
      whileHover={{ y: -6, scale: 1.01 }}
      className="rounded-[1.75rem] bg-white p-4 text-black shadow-soft ring-1 ring-black/5 transition md:rounded-[2rem] md:p-5"
    >
      <Link
        href={`/products/${product.slug}`}
        className="block"
      >
        <div className="relative h-56 overflow-hidden rounded-[1.4rem] bg-[#faf6ee] sm:h-64 md:h-72 md:rounded-[1.7rem]">
          <Image
            src={product.image}
            alt={product.name}
            fill
            className="object-contain p-4 md:p-6"
            sizes="(max-width: 640px) 92vw, (max-width: 1024px) 45vw, 30vw"
          />
        </div>
      </Link>

      <div className="mt-4 inline-flex rounded-full bg-white px-3 py-1 text-xs font-bold uppercase tracking-[.16em] text-black ring-1 ring-black/15 md:mt-5">
        {product.badge}
      </div>

      <Link href={`/products/${product.slug}`}>
        <h3 className="mt-3 font-display text-2xl font-bold leading-tight text-black md:text-3xl">
          {product.name}
        </h3>
      </Link>

      <p className="mt-2 text-sm leading-6 text-black">
        {product.subtitle}
      </p>

      <div className="mt-4 text-lg font-bold text-black">
        {formatPrice(product.unitPrice)}
      </div>

      {loading ? (
        <p className="mt-3 text-sm font-semibold text-black/60">
          Checking stock...
        </p>
      ) : null}

      {isLowStock ? (
        <p className="mt-3 text-sm font-bold text-red-700">
          Only {availableStock} left in stock
        </p>
      ) : null}

      {isOutOfStock ? (
        <p className="mt-3 text-sm font-bold text-red-700">
          Out of stock
        </p>
      ) : null}

      <div className="mt-5 grid gap-3">
        <button
          type="button"
          onClick={handleAddToCart}
          disabled={
            loading ||
            isOutOfStock ||
            product.unitPrice === null ||
            product.unitPrice === undefined ||
            product.unitPrice <= 0
          }
          className="w-full rounded-full bg-black px-5 py-3 text-center text-sm font-bold text-white transition hover:bg-[#333333] disabled:cursor-not-allowed disabled:bg-black/30"
        >
          {loading
            ? "Checking Stock..."
            : isOutOfStock
              ? "Out of Stock"
              : "Add to Cart"}
        </button>

        <Link
          href={`/products/${product.slug}`}
          className="w-full rounded-full bg-brand.sand px-5 py-3 text-center text-sm font-bold text-black transition hover:bg-[#ded1bf]"
        >
          View Details
        </Link>
      </div>
    </motion.article>
  );
}