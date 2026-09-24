"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { useMemo, useState } from "react";
import {
  Leaf,
  Sparkles,
  UsersRound,
  Wheat,
  ShoppingCart
} from "lucide-react";

import { useCart } from "@/components/CartProvider";
import { formatPrice } from "@/lib/data";
import { useInventory } from "@/hooks/useInventory";

/* =========================================================
   DESKTOP & MOBILE BENEFITS
========================================================= */

const desktopBenefits = [
  {
    icon: Leaf,
    title: "Naturally Aged",
    text: "Time brings out the extraordinary."
  },
  {
    icon: Wheat,
    title: "Extra Long Grain",
    text: "Elegant grains. Exceptional dining."
  },
  {
    icon: Sparkles,
    title: "Premium Quality",
    text: "A higher standard in every grain."
  },
  {
    icon: UsersRound,
    title: "Trusted by Families",
    text: "Around the world."
  }
];

/* =========================================================
   HELPERS
========================================================= */

function getAvailableStock(inventoryItem) {
  if (!inventoryItem) {
    return null;
  }

  return Math.max(
    Number(inventoryItem.stock_quantity || 0) -
      Number(inventoryItem.reserved_quantity || 0),
    0
  );
}

function getProductDescription(product) {
  return (
    product.subtitle ||
    product.shortDescription ||
    product.short_description ||
    "Aromatic. Fluffy. Always a family favorite."
  );
}

/* =========================================================
   DESKTOP PRODUCT CARD
========================================================= */

function RiceProductCard({
  product,
  index,
  onAddToCart
}) {
  const { getStock, loading } =
    useInventory();

  const liveInventory =
    getStock(product.id);

  const inventoryItem =
    liveInventory ||
    product.inventory ||
    null;

  const availableStock =
    getAvailableStock(inventoryItem);

  const inventoryActive =
    inventoryItem
      ? inventoryItem.is_active !== false
      : true;

  const isOutOfStock =
    Boolean(inventoryItem) &&
    (!inventoryActive ||
      availableStock <= 0);

  const canAddToCart =
    !loading &&
    !isOutOfStock &&
    product.canCheckout &&
    product.unitPrice !== null &&
    product.unitPrice > 0;

  return (
    <motion.article
      initial={{
        opacity: 0,
        y: 18
      }}
      whileInView={{
        opacity: 1,
        y: 0
      }}
      viewport={{ once: true }}
      transition={{
        duration: 0.4,
        delay: index * 0.06
      }}
      className="
        flex
        h-full
        flex-col
        overflow-hidden
        rounded-[10px]
        border
        border-black/[0.08]
        bg-white
        p-[10px]
        shadow-[0_2px_10px_rgba(0,0,0,0.04)]
      "
    >
      {/* PRODUCT IMAGE */}
      <Link
        href={`/products/${product.slug}`}
        className="
          flex
          h-[190px]
          items-center
          justify-center
          overflow-hidden
          rounded-[7px]
          bg-[#fffdfa]
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
            p-1
            transition-transform
            duration-300
            hover:scale-[1.025]
          "
        />
      </Link>

      {/* PRODUCT INFORMATION */}
      <div
        className="
          flex
          flex-1
          flex-col
          px-1
          pb-1
          pt-3
        "
      >
        <Link
          href={`/products/${product.slug}`}
        >
          <h3
            className="
              font-sans
              text-[12px]
              font-bold
              leading-[1.15]
              tracking-[-0.01em]
              text-[#171717]
            "
          >
            {product.name}
          </h3>
        </Link>

        {/* No separate weight here.
            Product name already contains 10 lb / 20 lb / 50 lb. */}

        <p
          className="
            mt-2
            line-clamp-2
            min-h-[30px]
            text-[10px]
            leading-[1.35]
            text-black/65
          "
        >
          {getProductDescription(product)}
        </p>

        <div className="mt-auto pt-3">
          <div
            className="
              font-sans
              text-[18px]
              font-extrabold
              leading-none
              tracking-[-0.02em]
              text-[#c90019]
            "
          >
            {formatPrice(
              product.unitPrice
            )}
          </div>

          <button
            type="button"
            disabled={!canAddToCart}
            onClick={() =>
              onAddToCart(
                product,
                availableStock,
                canAddToCart
              )
            }
            className="
              mt-3
              inline-flex
              h-[32px]
              w-full
              items-center
              justify-center
              gap-2
              rounded-[4px]
              bg-[#c90019]
              px-4
              text-[10px]
              font-bold
              text-white
              transition
              hover:bg-[#aa0015]
              disabled:cursor-not-allowed
              disabled:bg-black/25
            "
          >
            <ShoppingCart
              size={12}
              strokeWidth={2}
            />

            {loading
              ? "Checking..."
              : isOutOfStock
                ? "Out of Stock"
                : product.canCheckout
                  ? "Add to Cart"
                  : "Unavailable"}
          </button>
        </div>
      </div>
    </motion.article>
  );
}

/* =========================================================
   MOBILE PRODUCT CARD
========================================================= */

function MobileProductCard({
  product,
  onAddToCart
}) {
  const { getStock, loading } =
    useInventory();

  const liveInventory =
    getStock(product.id);

  const inventoryItem =
    liveInventory ||
    product.inventory ||
    null;

  const availableStock =
    getAvailableStock(inventoryItem);

  const inventoryActive =
    inventoryItem
      ? inventoryItem.is_active !== false
      : true;

  const isOutOfStock =
    Boolean(inventoryItem) &&
    (!inventoryActive ||
      availableStock <= 0);

  const canAddToCart =
    !loading &&
    !isOutOfStock &&
    product.canCheckout &&
    product.unitPrice !== null &&
    product.unitPrice > 0;

  return (
    <motion.article
      initial={{
        opacity: 0,
        x: 14
      }}
      animate={{
        opacity: 1,
        x: 0
      }}
      transition={{
        duration: 0.25
      }}
      className="
        mx-auto
        w-full
        max-w-[315px]
        overflow-hidden
        rounded-[12px]
        border
        border-black/[0.08]
        bg-white
        px-3
        pb-4
        pt-2
        text-center
        shadow-[0_3px_14px_rgba(0,0,0,0.05)]
      "
    >
      {/* PRODUCT IMAGE */}
      <Link
        href={`/products/${product.slug}`}
        className="
          mx-auto
          flex
          h-[190px]
          w-full
          items-center
          justify-center
          overflow-hidden
        "
      >
        <img
          src={
            product.image ||
            "/images/product-placeholder.png"
          }
          alt={product.name}
          className="
            h-full
            w-full
            object-contain
            p-1
          "
        />
      </Link>

      {/* SAME PRODUCT DATA AS DESKTOP */}
      <div className="px-1 pt-2">
        <Link
          href={`/products/${product.slug}`}
        >
          <h3
            className="
              mx-auto
              max-w-[280px]
              font-sans
              text-[13px]
              font-bold
              leading-[1.15]
              tracking-[-0.01em]
              text-[#171717]
            "
          >
            {product.name}
          </h3>
        </Link>

        {/* No separate weight.
            Product name already contains the weight. */}

        <p
          className="
            mx-auto
            mt-2
            line-clamp-2
            max-w-[270px]
            text-[10px]
            leading-[1.35]
            text-black/65
          "
        >
          {getProductDescription(product)}
        </p>

        <div
          className="
            mt-3
            font-sans
            text-[20px]
            font-extrabold
            leading-none
            tracking-[-0.02em]
            text-[#c90019]
          "
        >
          {formatPrice(
            product.unitPrice
          )}
        </div>
      </div>

      {/* ADD TO CART */}
      <button
        type="button"
        disabled={!canAddToCart}
        onClick={() =>
          onAddToCart(
            product,
            availableStock,
            canAddToCart
          )
        }
        className="
          mt-3
          inline-flex
          h-[38px]
          w-full
          items-center
          justify-center
          gap-2
          rounded-[4px]
          bg-[#c90019]
          px-4
          text-[12px]
          font-bold
          text-white
          transition
          active:scale-[0.99]
          disabled:cursor-not-allowed
          disabled:bg-black/25
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
            : product.canCheckout
              ? "Add to Cart"
              : "Unavailable"}
      </button>
    </motion.article>
  );
}

/* =========================================================
   MAIN COMPONENT
========================================================= */

export default function RiceSizeShowcaseV3({
  products = []
}) {
  const { addItem } = useCart();

  const riceProducts = useMemo(
    () =>
      products
        .filter(
          (product) =>
            product.categoryId === "rice"
        )
        .sort((first, second) => {
          const firstOrder = Number(
            first.displayOrder ??
              first.display_order ??
              999
          );

          const secondOrder = Number(
            second.displayOrder ??
              second.display_order ??
              999
          );

          return (
            firstOrder -
            secondOrder
          );
        }),
    [products]
  );

  const [
    activeIndex,
    setActiveIndex
  ] = useState(0);

  if (riceProducts.length === 0) {
    return null;
  }

  const safeActiveIndex =
    Math.min(
      activeIndex,
      riceProducts.length - 1
    );

  const activeProduct =
    riceProducts[safeActiveIndex];

  function handleAddToCart(
    product,
    availableStock,
    canAddToCart
  ) {
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

    if (
      added?.reason ===
      "storefront_mismatch"
    ) {
      alert(
        "Your cart contains Simpli Ecoware products. Clear the cart before adding Shakti Foods products."
      );

      return;
    }

    if (
      added?.reason ===
      "out_of_stock"
    ) {
      alert(
        "This product is currently out of stock."
      );
    }
  }

  return (
    <section
      className="
        overflow-hidden
        bg-[#fffdfa]
        text-[#171717]
      "
    >
      {/* =================================================
          MOBILE
      ================================================= */}

      <div className="lg:hidden">
        {/* MOBILE HEADING */}
        <div
          className="
            px-5
            pb-3
            pt-5
            text-center
          "
        >
          <div
            className="
              text-[10px]
              font-black
              uppercase
              tracking-[0.25em]
              text-[#c90019]
            "
          >
            Our Signature
          </div>

          <h2
            className="
              mx-auto
              mt-1.5
              max-w-[330px]
              font-display
              text-[28px]
              font-bold
              leading-[1.02]
              tracking-[-0.02em]
              text-[#151515]
            "
          >
            Premium Basmati Rice
            Collection
          </h2>
        </div>

        {/* MOBILE PRODUCT */}
        <div className="px-8">
          <MobileProductCard
            key={activeProduct.id}
            product={activeProduct}
            onAddToCart={
              handleAddToCart
            }
          />
        </div>

        {/* CAROUSEL DOTS */}
        {riceProducts.length > 1 ? (
          <div
            className="
              flex
              items-center
              justify-center
              gap-2
              pb-3
              pt-3
            "
          >
            {riceProducts.map(
              (product, index) => (
                <button
                  key={product.id}
                  type="button"
                  aria-label={`Show ${product.name}`}
                  onClick={() =>
                    setActiveIndex(
                      index
                    )
                  }
                  className={[
                    "h-[7px] w-[7px] rounded-full transition-all",
                    index ===
                    safeActiveIndex
                      ? "scale-110 bg-[#c90019]"
                      : "bg-black/15"
                  ].join(" ")}
                />
              )
            )}
          </div>
        ) : (
          <div className="h-4" />
        )}

        {/* MOBILE BOTTOM BENEFITS */}
        <div
          className="
            mt-0
            border-t
            border-black/[0.08]
            bg-white
            px-3
            py-4
          "
        >
          <div
            className="
              mx-auto
              grid
              max-w-[410px]
              grid-cols-4
              items-center
            "
          >
            {desktopBenefits.map(
              ({
                icon: Icon,
                title
              }, index) => (
                <div
                  key={title}
                  className={`
                    relative
                    flex
                    min-w-0
                    flex-col
                    items-center
                    justify-center
                    px-1
                    text-center

                    ${
                      index !==
                      desktopBenefits.length - 1
                        ? "after:absolute after:right-0 after:top-1/2 after:h-[34px] after:w-px after:-translate-y-1/2 after:bg-black/[0.12]"
                        : ""
                    }
                  `}
                >
                  <Icon
                    size={25}
                    strokeWidth={1.8}
                    className="
                      text-[#c90019]
                    "
                  />

                  <div
                    className="
                      mt-2
                      max-w-[82px]
                      text-[8px]
                      font-bold
                      leading-[1.1]
                      tracking-[-0.02em]
                      text-[#171717]
                    "
                  >
                    {title}
                  </div>
                </div>
              )
            )}
          </div>
        </div>
      </div>

      {/* =================================================
          DESKTOP
      ================================================= */}

      <div
        className="
          hidden
          px-6
          py-14
          lg:block
          xl:px-10
          xl:py-16
        "
      >
        <div
          className="
            mx-auto
            max-w-[1440px]
          "
        >
          {/* DESKTOP HEADING */}
          <div className="text-center">
            <div
              className="
                text-[10px]
                font-black
                uppercase
                tracking-[0.28em]
                text-[#c90019]
              "
            >
              Our Signature
            </div>

            <h2
              className="
                mt-1
                font-display
                text-[38px]
                font-bold
                leading-none
                tracking-[-0.025em]
                text-[#161616]
                xl:text-[42px]
              "
            >
              Premium Basmati Rice
              Collection
            </h2>

            <p
              className="
                mt-2
                text-[13px]
                text-black/55
              "
            >
              Exceptional quality.
              Unforgettable meals. For the
              people who matter most.
            </p>
          </div>

          {/* PRODUCTS + BENEFITS */}
          <div
            className="
              mx-auto
              mt-7
              grid
              max-w-[1260px]
              grid-cols-[minmax(0,1fr)_275px]
              gap-8
            "
          >
            {/* PRODUCT CARDS */}
            <div
              className="
                grid
                grid-cols-3
                items-stretch
                gap-3
              "
            >
              {riceProducts
                .slice(0, 3)
                .map(
                  (
                    product,
                    index
                  ) => (
                    <RiceProductCard
                      key={product.id}
                      product={product}
                      index={index}
                      onAddToCart={
                        handleAddToCart
                      }
                    />
                  )
                )}
            </div>

            {/* DESKTOP BENEFITS */}
            <aside
              className="
                flex
                flex-col
                justify-center
                gap-5
                py-2
              "
            >
              {desktopBenefits.map(
                ({
                  icon: Icon,
                  title,
                  text
                }) => (
                  <div
                    key={title}
                    className="
                      flex
                      items-center
                      gap-4
                    "
                  >
                    <div
                      className="
                        flex
                        h-[66px]
                        w-[66px]
                        shrink-0
                        items-center
                        justify-center
                        rounded-full
                        border
                        border-[#e8c99d]
                        bg-[#fffaf3]
                      "
                    >
                      <Icon
                        size={30}
                        strokeWidth={1.6}
                        className="
                          text-[#c47b20]
                        "
                      />
                    </div>

                    <div>
                      <div
                        className="
                          text-[12px]
                          font-extrabold
                          leading-tight
                          text-[#171717]
                        "
                      >
                        {title}
                      </div>

                      <p
                        className="
                          mt-1
                          max-w-[155px]
                          text-[10px]
                          leading-[1.35]
                          text-black/55
                        "
                      >
                        {text}
                      </p>
                    </div>
                  </div>
                )
              )}
            </aside>
          </div>

          {/* VIEW ALL */}
          <div
            className="
              mt-7
              text-center
            "
          >
            <Link
              href="/products"
              className="
                inline-flex
                items-center
                justify-center
                border-b
                border-[#c90019]
                pb-1
                text-[13px]
                font-bold
                text-[#c90019]
                transition
                hover:text-[#990014]
              "
            >
              View All Rice Products
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}