"use client";

import Link from "next/link";
import {
  AnimatePresence,
  motion
} from "framer-motion";
import {
  useEffect,
  useMemo,
  useState
} from "react";
import SectionHeading from "@/components/SectionHeading";
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

function getSizeLabel(product) {
  return (
    product.weightLabel ||
    product.badge ||
    product.packSize ||
    product.name
  );
}

export default function RiceSizeShowcaseV3({
  products = []
}) {
  const { addItem } = useCart();

  const riceProducts = useMemo(
    () =>
      products.filter(
        (product) =>
          product.categoryId === "rice"
      ),
    [products]
  );

  const [selectedId, setSelectedId] =
    useState(
      riceProducts[0]?.id || ""
    );

  useEffect(() => {
    const selectedStillExists =
      riceProducts.some(
        (product) =>
          product.id === selectedId
      );

    if (!selectedStillExists) {
      setSelectedId(
        riceProducts[0]?.id || ""
      );
    }
  }, [
    riceProducts,
    selectedId
  ]);

  const selectedProduct =
    riceProducts.find(
      (product) =>
        product.id === selectedId
    ) ||
    riceProducts[0] ||
    null;

  if (!selectedProduct) {
    return null;
  }

  const availableStock =
    getAvailableStock(
      selectedProduct
    );

  const isOutOfStock =
    selectedProduct.inventory
      ? !selectedProduct.inventory
          .is_active ||
        availableStock <= 0
      : false;

  const canAddToCart =
    selectedProduct.canCheckout &&
    !isOutOfStock &&
    selectedProduct.unitPrice !==
      null &&
    selectedProduct.unitPrice > 0;

  function handleAddToCart() {
    if (!canAddToCart) {
      return;
    }

    addItem(selectedProduct, {
      availableStock
    });
  }

  return (
    <section className="section-pad bg-[#f8f4ed] py-16 text-black md:py-28">
      <div className="container-brand grid items-center gap-10 lg:grid-cols-[.98fr_1.02fr] lg:gap-12">
        <div>
          <SectionHeading
            eyebrow="Rice Collection"
            title="Choose your preferred premium Basmati rice pack."
            text="Browse currently active rice products, view live availability, shop online, or request wholesale pricing."
          />

          <div className="mt-7 grid gap-3 sm:grid-cols-3 md:mt-8">
            {riceProducts.map(
              (product) => {
                const selected =
                  selectedProduct.id ===
                  product.id;

                return (
                  <button
                    key={product.id}
                    type="button"
                    onClick={() =>
                      setSelectedId(
                        product.id
                      )
                    }
                    className={[
                      "rounded-3xl border-2 p-4 text-left transition md:p-5",
                      selected
                        ? "border-black bg-black text-white shadow-lift"
                        : "border-black/15 bg-white text-black shadow-soft hover:-translate-y-1 hover:border-black"
                    ].join(" ")}
                  >
                    <div className="font-display text-2xl font-bold">
                      {getSizeLabel(
                        product
                      )}
                    </div>

                    <div
                      className={[
                        "mt-1 text-sm",
                        selected
                          ? "text-white/80"
                          : "text-black/65"
                      ].join(" ")}
                    >
                      {product.isFeatured
                        ? "Featured Product"
                        : product.packSize ||
                          "Premium Rice"}
                    </div>
                  </button>
                );
              }
            )}
          </div>

          <div className="mt-7 rounded-[2rem] bg-white p-5 text-black shadow-soft md:mt-8 md:p-6">
            <div className="font-display text-3xl font-bold text-black">
              {getSizeLabel(
                selectedProduct
              )}
            </div>

            <div className="mt-2 leading-7 text-black/75">
              {
                selectedProduct
                  .subtitle
              }
            </div>

            <div className="mt-4 font-bold text-black">
              {formatPrice(
                selectedProduct.unitPrice
              )}
            </div>

            {availableStock !== null ? (
              <div className="mt-3 text-sm font-semibold">
                {isOutOfStock ? (
                  <span className="text-red-700">
                    Out of stock
                  </span>
                ) : (
                  <span className="text-green-700">
                    {availableStock}{" "}
                    available
                  </span>
                )}
              </div>
            ) : null}

            {selectedProduct.features
              ?.length > 0 ? (
              <div className="mt-5 flex flex-wrap gap-2">
                {selectedProduct.features
                  .slice(0, 3)
                  .map(
                    (
                      feature,
                      index
                    ) => {
                      const text =
                        typeof feature ===
                        "string"
                          ? feature
                          : feature.title;

                      return (
                        <span
                          key={`${text}-${index}`}
                          className="rounded-full bg-white px-4 py-2 text-sm font-semibold text-black ring-1 ring-black/15"
                        >
                          {text}
                        </span>
                      );
                    }
                  )}
              </div>
            ) : null}

            <div className="mt-6 grid gap-3 sm:flex">
              <button
                type="button"
                onClick={
                  handleAddToCart
                }
                disabled={
                  !canAddToCart
                }
                className="rounded-full bg-black px-6 py-3 font-bold text-white transition hover:bg-[#333333] disabled:cursor-not-allowed disabled:bg-black/30"
              >
                {isOutOfStock
                  ? "Out of Stock"
                  : selectedProduct.canCheckout
                    ? "Add to Cart"
                    : "Unavailable"}
              </button>

              <Link
                href={`/contact?product=${encodeURIComponent(
                  selectedProduct.name
                )}&productId=${encodeURIComponent(
                  selectedProduct.id
                )}&type=wholesale`}
                className="rounded-full bg-[#eee3d2] px-6 py-3 text-center font-bold text-black transition hover:bg-[#ded1bf]"
              >
                Request Wholesale Price
              </Link>

              <Link
                href={`/products/${selectedProduct.slug}`}
                className="rounded-full bg-white px-6 py-3 text-center font-bold text-black ring-1 ring-black/15 transition hover:bg-[#f1eadf]"
              >
                View Details
              </Link>
            </div>
          </div>
        </div>

        <div className="relative min-h-[430px] overflow-hidden rounded-[2rem] bg-gradient-to-br from-[#fbf1e2] to-[#f0f7eb] shadow-lift md:min-h-[560px] md:rounded-[2.5rem]">
          <AnimatePresence mode="wait">
            <motion.div
              key={
                selectedProduct.id
              }
              initial={{
                opacity: 0,
                scale: 0.9,
                y: 20
              }}
              animate={{
                opacity: 1,
                scale: 1,
                y: 0
              }}
              exit={{
                opacity: 0,
                scale: 0.96,
                y: -10
              }}
              transition={{
                duration: 0.45
              }}
              whileHover={{
                y: -12,
                scale: 1.03
              }}
              className="relative z-10 mx-auto h-[430px] w-full max-w-[380px] md:h-[560px] md:max-w-[460px]"
            >
              <img
                src={
                  selectedProduct.image ||
                  "/images/product-placeholder.png"
                }
                alt={
                  selectedProduct.name
                }
                className="h-full w-full object-contain p-5 drop-shadow-[0_35px_45px_rgba(0,0,0,.18)] md:p-8"
              />
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </section>
  );
}