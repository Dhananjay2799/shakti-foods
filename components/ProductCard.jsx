"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ShoppingCart } from "lucide-react";

import { useCart } from "@/components/CartProvider";
import { formatPrice } from "@/lib/data";
import { useInventory } from "@/hooks/useInventory";

export default function ProductCard({
  product,
  index = 0,
}) {
  const { addItem } = useCart();
  const { getStock, loading } = useInventory();

  const liveInventory = getStock(product.id);

  const inventoryItem =
    liveInventory || product.inventory || null;

  const availableStock = inventoryItem
    ? Number(inventoryItem.stock_quantity || 0) -
      Number(inventoryItem.reserved_quantity || 0)
    : null;

  const inventoryActive = inventoryItem
    ? inventoryItem.is_active !== false
    : true;

  const isOutOfStock =
    Boolean(inventoryItem) &&
    (!inventoryActive || availableStock <= 0);

  const isLowStock =
    Boolean(inventoryItem) &&
    availableStock > 0 &&
    availableStock <=
      Number(
        inventoryItem.low_stock_threshold || 0
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
    product.compareAtPrice > product.unitPrice;

  const discountPercentage = hasDiscount
    ? Math.round(
        ((product.compareAtPrice -
          product.unitPrice) /
          product.compareAtPrice) *
          100
      )
    : 0;

  const isBestSeller = Boolean(
    product.bestSeller ||
      product.best_seller ||
      product.isBestSeller
  );

  const isNewArrival = Boolean(
    product.newArrival ||
      product.new_arrival ||
      product.isNewArrival
  );

  const isFeatured = Boolean(
    product.featured ||
      product.isFeatured ||
      product.is_featured
  );

  const normalizedPack = String(
    product.packSize ||
      product.pack_size ||
      product.badge ||
      ""
  ).toLowerCase();

  const isWholesalePack =
    normalizedPack.includes("50") ||
    normalizedPack.includes("wholesale");

  const wholesaleHref =
    `/contact?product=${encodeURIComponent(
      product.name
    )}&productId=${encodeURIComponent(
      product.id
    )}&type=wholesale`;

  function handleAddToCart() {
    if (!canAddToCart) return;

    const added = addItem(
      {
        ...product,
        storefront: "shakti_foods",
      },
      {
        availableStock,
        storefront: "shakti_foods",
      }
    );

    if (added?.reason === "storefront_mismatch") {
      alert(
        "Your cart contains Simpli Ecoware products. Clear the cart before adding Shakti Foods products."
      );
      return;
    }

    if (!added && isOutOfStock) {
      alert(
        "This product is currently out of stock."
      );
    }
  }

  return (
    <motion.article
      initial={{
        opacity: 0,
        y: 18,
      }}
      whileInView={{
        opacity: 1,
        y: 0,
      }}
      transition={{
        delay: index * 0.05,
        duration: 0.4,
      }}
      viewport={{ once: true }}
      whileHover={{
        y: -4,
      }}
      className="
        group
        flex
        h-full
        flex-col
        rounded-[20px]
        border
        border-[#eadfd2]
        bg-white
        p-3
        shadow-[0_10px_28px_rgba(71,46,22,0.06)]
        transition-shadow
        duration-300
        hover:shadow-[0_16px_40px_rgba(71,46,22,0.11)]

        sm:p-4
      "
    >
      {/* PRODUCT IMAGE */}
      <Link
        href={`/products/${product.slug}`}
        className="block"
      >
        <div
          className="
            relative
            aspect-[1/0.94]
            overflow-hidden
            rounded-[16px]
            bg-[#fbf7f0]
          "
        >
          <img
            src={
              product.image ||
              "/images/product-placeholder.png"
            }
            alt={product.name}
            loading="lazy"
            className="
              h-full
              w-full
              object-contain
              p-4
              transition-transform
              duration-500
              group-hover:scale-[1.025]

              sm:p-5
            "
          />

          {/* TOP MERCHANDISING BADGE */}
          {isBestSeller ? (
            <span
              className="
                absolute
                left-3
                top-3
                rounded-full
                bg-[#c90019]
                px-3
                py-[6px]
                text-[8px]
                font-black
                uppercase
                tracking-[0.12em]
                text-white
                shadow-sm
              "
            >
              Best Seller
            </span>
          ) : isWholesalePack ? (
            <span
              className="
                absolute
                left-3
                top-3
                rounded-full
                bg-[#b56a00]
                px-3
                py-[6px]
                text-[8px]
                font-black
                uppercase
                tracking-[0.12em]
                text-white
                shadow-sm
              "
            >
              Wholesale Pack
            </span>
          ) : isNewArrival ? (
            <span
              className="
                absolute
                left-3
                top-3
                rounded-full
                bg-[#c90019]
                px-3
                py-[6px]
                text-[8px]
                font-black
                uppercase
                tracking-[0.12em]
                text-white
              "
            >
              New Arrival
            </span>
          ) : null}

          {hasDiscount && !isBestSeller ? (
            <span
              className="
                absolute
                right-3
                top-3
                rounded-full
                bg-[#17120f]
                px-3
                py-[6px]
                text-[8px]
                font-black
                uppercase
                tracking-[0.08em]
                text-white
              "
            >
              {discountPercentage}% Off
            </span>
          ) : null}
        </div>
      </Link>

      {/* TAGS */}
      <div className="mt-3 flex flex-wrap gap-2">
        <span
          className="
            inline-flex
            rounded-full
            border
            border-[#ddd3c6]
            bg-white
            px-3
            py-[5px]
            text-[9px]
            font-black
            uppercase
            tracking-[0.08em]
            text-[#17120f]
          "
        >
          {product.packSize ||
            product.pack_size ||
            product.badge ||
            "Basmati"}
        </span>

        <span
          className="
            inline-flex
            rounded-full
            bg-[#f3eadc]
            px-3
            py-[5px]
            text-[9px]
            font-bold
            text-[#17120f]
          "
        >
          Rice
        </span>
      </div>

      {/* NAME */}
      <Link
        href={`/products/${product.slug}`}
        className="block"
      >
        <h3
          className="
            mt-3
            font-display
            text-[24px]
            font-bold
            leading-[0.98]
            tracking-[-0.025em]
            text-[#17120f]
            transition-colors
            group-hover:text-[#c90019]

            lg:text-[25px]
          "
        >
          {product.name}
        </h3>
      </Link>

      {/* DESCRIPTION */}
      <p
        className="
          mt-3
          line-clamp-3
          min-h-[54px]
          text-[12px]
          leading-[1.5]
          text-[#655d56]
        "
      >
        {product.subtitle}
      </p>

      {/* PRICE */}
      <div className="mt-3 flex items-end gap-2">
        <span
          className="
            text-[22px]
            font-black
            leading-none
            text-[#d1081b]
          "
        >
          {formatPrice(product.unitPrice)}
        </span>

        {hasDiscount ? (
          <span
            className="
              pb-[1px]
              text-[11px]
              text-[#8d857d]
              line-through
            "
          >
            {formatPrice(
              product.compareAtPrice
            )}
          </span>
        ) : null}
      </div>

      {/* STOCK */}
      <div className="mt-2 min-h-[20px]">
        {loading ? (
          <span className="text-[10px] font-semibold text-[#837a71]">
            Checking stock...
          </span>
        ) : isOutOfStock ? (
          <span className="text-[10px] font-bold text-[#c90019]">
            Out of stock
          </span>
        ) : isLowStock ? (
          <span className="text-[10px] font-bold text-[#b56a00]">
            Only {availableStock} left
          </span>
        ) : (
          <span
            className="
              inline-flex
              rounded-full
              bg-[#dcf8e6]
              px-2
              py-1
              text-[9px]
              font-bold
              text-[#087a3e]
            "
          >
            Ready to Ship
          </span>
        )}
      </div>

      {/* ACTIONS */}
      <div className="mt-auto grid gap-2 pt-3">
        <button
          type="button"
          onClick={handleAddToCart}
          disabled={!canAddToCart}
          className="
            flex
            min-h-[43px]
            w-full
            items-center
            justify-center
            gap-2
            rounded-[7px]
            bg-[#d1081b]
            px-4
            text-[12px]
            font-extrabold
            text-white
            shadow-[0_7px_18px_rgba(209,8,27,0.18)]
            transition
            hover:bg-[#b90719]
            active:scale-[0.99]

            disabled:cursor-not-allowed
            disabled:bg-[#d8b5b9]
            disabled:shadow-none
          "
        >
          <ShoppingCart
            size={15}
            strokeWidth={2}
          />

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
          className="
            flex
            min-h-[40px]
            w-full
            items-center
            justify-center
            rounded-[7px]
            bg-[#f4e8d6]
            px-4
            text-center
            text-[11px]
            font-extrabold
            text-[#2a211a]
            transition
            hover:bg-[#ead8bd]
          "
        >
          Request Wholesale Price
        </Link>

        <Link
          href={`/products/${product.slug}`}
          className="
            flex
            min-h-[34px]
            items-center
            justify-center
            text-[11px]
            font-extrabold
            text-[#17120f]
            transition
            hover:text-[#c90019]
          "
        >
          View Details
          <span
            aria-hidden="true"
            className="ml-1 text-[#c66c24]"
          >
            →
          </span>
        </Link>
      </div>
    </motion.article>
  );
}