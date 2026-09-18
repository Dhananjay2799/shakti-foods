"use client";

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

  const {
    getStock,
    loading
  } = useInventory();

  const liveInventory =
    getStock(product.id);

  const inventoryItem =
    liveInventory ||
    product.inventory ||
    null;

  const availableStock =
    inventoryItem
      ? Number(
          inventoryItem.stock_quantity ||
            0
        ) -
        Number(
          inventoryItem.reserved_quantity ||
            0
        )
      : null;

  const inventoryActive =
    inventoryItem
      ? inventoryItem.is_active !== false
      : true;

  const isOutOfStock =
    Boolean(inventoryItem) &&
    (
      !inventoryActive ||
      availableStock <= 0
    );

  const isLowStock =
    Boolean(inventoryItem) &&
    availableStock > 0 &&
    availableStock <=
      Number(
        inventoryItem.low_stock_threshold ||
          0
      );

  const canAddToCart =
    !loading &&
    !isOutOfStock &&
    product.canCheckout &&
    product.unitPrice !== null &&
    product.unitPrice > 0;

  const hasDiscount =
    product.compareAtPrice &&
    product.unitPrice &&
    product.compareAtPrice >
      product.unitPrice;

  const discountPercentage =
    hasDiscount
      ? Math.round(
          (
            (product.compareAtPrice -
              product.unitPrice) /
            product.compareAtPrice
          ) * 100
        )
      : 0;

  // Unified merchandising flags supporting various naming conventions
  const isBestSeller = Boolean(
    product.bestSeller || product.best_seller || product.isBestSeller
  );
  const isNewArrival = Boolean(
    product.newArrival || product.new_arrival || product.isNewArrival
  );
  const isFeatured = Boolean(
    product.featured || product.isFeatured || product.is_featured
  );

  const wholesaleHref =
    `/contact?product=${encodeURIComponent(
      product.name
    )}&productId=${encodeURIComponent(
      product.id
    )}&type=wholesale`;

  function handleAddToCart() {
    if (!canAddToCart) {
      return;
    }

    const added = addItem(
      {
        ...product,
        storefront: "shakti_foods"
      },
      {
        availableStock,
        storefront: "shakti_foods"
      }
    );

    if (added?.reason === "storefront_mismatch") {
      alert(
        "Your cart contains Simpli Ecoware products. Clear the cart before adding Shakti Foods products."
      );
      return;
    }

    if (
      added?.reason === "out_of_stock" ||
      (!added?.success && isOutOfStock)
    ) {
      alert("This product is currently out of stock.");
    }
  }

  return (
    <motion.article
      initial={{
        opacity: 0,
        y: 28
      }}
      whileInView={{
        opacity: 1,
        y: 0
      }}
      transition={{
        delay: index * 0.06,
        duration: 0.45
      }}
      viewport={{ once: true }}
      whileHover={{
        y: -5
      }}
      className="group flex h-full flex-col rounded-[1.75rem] bg-white p-4 text-black shadow-soft ring-1 ring-black/5 transition-all duration-300 ease-out hover:shadow-2xl md:rounded-[2rem] md:p-5"
    >
      <Link
        href={`/products/${product.slug}`}
        className="block"
      >
        <div className="relative h-56 overflow-hidden rounded-[1.4rem] bg-[#faf6ee] sm:h-64 md:h-72 md:rounded-[1.7rem]">
          {/* Top-Left Merchandising Badges (Best Seller / New) */}
          <div className="absolute left-3 top-3 z-20 flex max-w-[72%] flex-wrap gap-1.5">
            {isBestSeller ? (
              <span className="inline-flex h-7 items-center rounded-full bg-[#b42318] px-3 text-[10px] font-black uppercase tracking-[0.08em] text-white shadow-sm">
                Best Seller
              </span>
            ) : null}

            {isNewArrival ? (
              <span className="inline-flex h-7 items-center rounded-full bg-[#16803c] px-3 text-[10px] font-black uppercase tracking-[0.08em] text-white shadow-sm">
                New
              </span>
            ) : null}
          </div>

          {/* Top-Right Discount Percentage Badge */}
          {hasDiscount ? (
            <span className="absolute right-3 top-3 z-20 inline-flex h-7 items-center rounded-full bg-black px-3 text-[10px] font-black uppercase tracking-[0.08em] text-white shadow-sm">
              {discountPercentage}% Off
            </span>
          ) : null}

          <img
            src={
              product.image ||
              "/images/product-placeholder.png"
            }
            alt={product.name}
            loading="lazy"
            className="h-full w-full object-contain p-4 transition-transform duration-300 ease-out group-hover:scale-105 md:p-6"
          />
        </div>
      </Link>

      {/* Sub-image Chips & Featured Signal */}
      <div className="mt-4 flex flex-wrap items-center gap-2 md:mt-5">
        {isFeatured ? (
          <span className="inline-flex h-7 items-center rounded-full border border-[#c9a84c] bg-[#fff8df] px-3 text-[10px] font-black uppercase tracking-[0.08em] text-[#725a12]">
            Featured
          </span>
        ) : null}

        <span className="inline-flex h-7 items-center rounded-full bg-white px-3 text-[10px] font-black uppercase tracking-[0.12em] text-black ring-1 ring-black/15">
          {product.badge || product.packSize || "Product"}
        </span>

        {product.category ? (
          <span className="inline-flex h-7 items-center rounded-full bg-[#f1eadf] px-3 text-[11px] font-bold text-black">
            {product.category}
          </span>
        ) : null}
      </div>

      <Link href={`/products/${product.slug}`}>
        <h3 className="mt-3 font-display text-2xl font-bold leading-tight text-black md:text-3xl">
          {product.name}
        </h3>
      </Link>

      <p className="mt-2 line-clamp-3 text-sm leading-6 text-black/70">
        {product.subtitle}
      </p>

      {/* Price Display */}
      <div className="mt-4 flex flex-wrap items-center gap-2">
        <span className="text-2xl font-bold text-black">
          {formatPrice(product.unitPrice)}
        </span>

        {hasDiscount ? (
          <span className="text-sm font-medium text-black/40 line-through">
            {formatPrice(product.compareAtPrice)}
          </span>
        ) : null}
      </div>

      {/* Unified Single Stock Message */}
      <div className="mt-3 min-h-7">
        {loading ? (
          <span className="inline-flex rounded-full bg-black/5 px-3 py-1 text-xs font-semibold text-black/55">
            Checking stock...
          </span>
        ) : isOutOfStock ? (
          <span className="inline-flex rounded-full bg-red-100 px-3 py-1 text-xs font-bold text-red-700">
            Out of Stock
          </span>
        ) : isLowStock ? (
          <span className="inline-flex rounded-full bg-amber-100 px-3 py-1 text-xs font-bold text-amber-800">
            Only {availableStock} Left
          </span>
        ) : (
          <span className="inline-flex rounded-full bg-green-100 px-3 py-1 text-xs font-bold text-green-700">
            Ready to Ship
          </span>
        )}
      </div>

      <div className="mt-auto grid gap-3 pt-5">
        <button
          type="button"
          onClick={handleAddToCart}
          disabled={!canAddToCart}
          className="w-full rounded-full bg-black px-5 py-3 text-center text-sm font-bold text-white transition hover:bg-[#333333] disabled:cursor-not-allowed disabled:bg-black/30"
        >
          {loading
            ? "Checking Stock..."
            : isOutOfStock
              ? "Out of Stock"
              : !product.canCheckout
                ? "Unavailable"
                : "Add to Cart"}
        </button>

        <Link
          href={wholesaleHref}
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