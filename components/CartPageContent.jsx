"use client";

import Image from "next/image";
import Link from "next/link";
import {
  ArrowLeft,
  ArrowRight,
  Minus,
  Plus,
  ShoppingBag,
  Trash2,
  Truck,
  ShieldCheck,
  Leaf
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { useCart } from "@/components/CartProvider";
import { formatPrice } from "@/lib/data";
import { getCheckoutEstimate, commerce } from "@/lib/commerce";

export default function CartPageContent() {
  const {
    items,
    increase,
    decrease,
    removeItem,
    clearCart
  } = useCart();

  const cartStorefront =
    items[0]?.storefront || "shakti_foods";

  const isEcoware =
    cartStorefront === "ecoware";

  const cartBrandName =
    isEcoware
      ? "Simpli Ecoware"
      : "Shakti Foods";

  const continueShoppingHref =
    isEcoware
      ? "/ecoware/products"
      : "/products";

  const [pricing, setPricing] = useState(null);
  const [pricingLoading, setPricingLoading] = useState(false);
  const [pricingError, setPricingError] = useState("");

  const pricingRequestItems = useMemo(
    () =>
      items.map((item) => ({
        id: item.id,
        quantity: item.quantity
      })),
    [items]
  );

  useEffect(() => {
    if (items.length === 0) {
      setPricing(null);
      setPricingError("");
      setPricingLoading(false);
      return;
    }

    const controller = new AbortController();

    async function loadPricing() {
      try {
        setPricingLoading(true);
        setPricingError("");

        const response = await fetch("/api/cart/pricing", {
          method: "POST",

          headers: {
            "Content-Type": "application/json"
          },

          body: JSON.stringify({
            storefront: cartStorefront,
            items: pricingRequestItems
          }),

          signal: controller.signal
        });

        const result = await response.json();

        if (!response.ok || !result.success) {
          throw new Error(
            result.message ||
              "Unable to calculate cart pricing."
          );
        }

        setPricing(result);
      } catch (error) {
        if (error?.name === "AbortError") {
          return;
        }

        console.error(
          "Unable to load cart pricing:",
          error
        );

        setPricing(null);

        setPricingError(
          error instanceof Error
            ? error.message
            : "Unable to calculate cart pricing."
        );
      } finally {
        if (!controller.signal.aborted) {
          setPricingLoading(false);
        }
      }
    }

    loadPricing();

    return () => {
      controller.abort();
    };
  }, [
    items,
    cartStorefront,
    pricingRequestItems
  ]);

  const pricedItemsById = useMemo(() => {
    return new Map(
      (pricing?.items || []).map((item) => [
        item.productId,
        item
      ])
    );
  }, [pricing]);

  const subtotal = pricing
    ? pricing.subtotalCents / 100
    : 0;

  const savings = pricing
    ? pricing.savingsCents / 100
    : 0;

  const estimate =
    getCheckoutEstimate(subtotal);

  const totalItemCount = items.reduce(
    (sum, item) => sum + item.quantity,
    0
  );

  const pricingReady =
    Boolean(pricing) &&
    !pricingLoading &&
    !pricingError;

  const estimatedTotal =
    pricingReady
      ? subtotal +
        Number(estimate.shipping || 0) +
        Number(estimate.tax || 0)
      : 0;

  /* =====================================================
     EMPTY CART
  ===================================================== */

  if (items.length === 0) {
    return (
      <main className="min-h-[70vh] bg-[#fbfaf6] text-black">
        <section className="mx-auto max-w-7xl px-5 py-14 sm:px-8 md:py-20 lg:px-12">
          <div className="mx-auto max-w-xl rounded-[2rem] border border-black/10 bg-white px-6 py-14 text-center sm:px-10">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-[#f1eee5]">
              <ShoppingBag
                className="h-7 w-7"
                strokeWidth={1.7}
              />
            </div>

            <p className="mt-7 text-xs font-black uppercase tracking-[0.24em] text-black/40">
              {cartBrandName}
            </p>

            <h1 className="mt-3 text-4xl font-black tracking-[-0.04em] sm:text-5xl">
              Your cart is empty.
            </h1>

            <p className="mx-auto mt-4 max-w-md text-[15px] leading-7 text-black/55">
              Add some of your favorite{" "}
              {isEcoware
                ? "sustainable tableware"
                : "Shakti Foods products"}{" "}
              and they will appear here.
            </p>

            <Link
              href={continueShoppingHref}
              className="mt-8 inline-flex items-center justify-center gap-2 rounded-full bg-black px-7 py-4 text-sm font-black text-white transition hover:bg-black/80"
            >
              Shop Products
              <ArrowRight size={17} />
            </Link>
          </div>
        </section>
      </main>
    );
  }

  /* =====================================================
     CART
  ===================================================== */

  return (
    <main className="min-h-screen bg-[#f8f6ef] text-black">
      {/* PAGE HEADER */}

      <section className="border-b border-black/10">
        <div className="mx-auto max-w-7xl px-5 py-9 sm:px-8 md:py-12 lg:px-12">
          <Link
            href={continueShoppingHref}
            className="inline-flex items-center gap-2 text-sm font-bold text-black/55 transition hover:text-black"
          >
            <ArrowLeft size={16} />
            Continue Shopping
          </Link>

          <div className="mt-7 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h1 className="mt-2 text-[2.6rem] font-black leading-none tracking-[-0.045em] sm:text-5xl md:text-6xl">
                Your Cart
              </h1>
            </div>

            <p className="text-sm font-semibold text-black/45">
              {totalItemCount}{" "}
              {totalItemCount === 1
                ? "item"
                : "items"}
            </p>
          </div>
        </div>
      </section>

      {/* MAIN CONTENT */}

      <section className="mx-auto max-w-7xl px-5 py-8 sm:px-8 md:py-12 lg:px-12">
        <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_390px] xl:gap-12">

          {/* ============================================
              CART ITEMS
          ============================================ */}

          <div className="min-w-0">
            <div className="space-y-4">
              {items.map((item) => {
                const productHref =
                  item.storefront === "ecoware"
                    ? `/ecoware/products/${
                        item.slug || item.id
                      }`
                    : `/products/${
                        item.slug || item.id
                      }`;

                const pricedItem =
                  pricedItemsById.get(item.id);

                const regularPrice =
                  pricedItem
                    ? pricedItem
                        .regularUnitPriceCents / 100
                    : null;

                const currentPrice =
                  pricedItem
                    ? pricedItem.unitPriceCents /
                      100
                    : null;

                const lineTotal =
                  pricedItem
                    ? pricedItem.lineTotalCents /
                      100
                    : null;

                const lineSavings =
                  pricedItem
                    ? pricedItem.savingsCents /
                      100
                    : 0;

                const hasDiscount =
                  pricedItem
                    ?.hasQuantityDiscount === true;

                return (
                  <article
                    key={item.id}
                    className="overflow-hidden rounded-[1.7rem] border border-black/10 bg-white"
                  >
                    <div className="grid sm:grid-cols-[180px_minmax(0,1fr)]">

                      {/* IMAGE */}

                      <Link
                        href={productHref}
                        className="relative block aspect-[4/3] overflow-hidden bg-[#f1eee5] sm:aspect-auto sm:min-h-[230px]"
                      >
                        {item.image ? (
                          <Image
                            src={item.image}
                            alt={item.name}
                            fill
                            className={
                              isEcoware
                                ? "object-contain p-3"
                                : "object-contain p-5"
                            }
                            sizes="(max-width: 640px) 100vw, 180px"
                          />
                        ) : (
                          <div className="flex h-full items-center justify-center text-xs font-semibold text-black/35">
                            Product image
                          </div>
                        )}
                      </Link>

                      {/* DETAILS */}

                      <div className="flex min-w-0 flex-col p-5 sm:p-6">
                        <div className="flex items-start justify-between gap-4">
                          <div className="min-w-0">
                            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-black/35">
                              {item.category ||
                                cartBrandName}
                            </p>

                            <Link
                              href={productHref}
                              className="mt-2 block text-xl font-black leading-tight tracking-[-0.025em] hover:underline sm:text-2xl"
                            >
                              {item.name}
                            </Link>
                          </div>

                          <button
                            type="button"
                            onClick={() =>
                              removeItem(item.id)
                            }
                            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-black/10 text-black/45 transition hover:border-red-200 hover:bg-red-50 hover:text-red-600"
                            aria-label={`Remove ${item.name}`}
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>

                        {/* PRICE */}

                        <div className="mt-4">
                          {pricedItem ? (
                            <>
                              <div className="flex flex-wrap items-center gap-2">
                                <span className="text-base font-black">
                                  {formatPrice(
                                    currentPrice
                                  )}{" "}
                                  each
                                </span>

                                {hasDiscount ? (
                                  <span className="rounded-full bg-[#edf4e8] px-3 py-1 text-[10px] font-black uppercase tracking-wide text-[#4d7c2f]">
                                    Quantity Price
                                  </span>
                                ) : null}
                              </div>

                              {hasDiscount ? (
                                <p className="mt-1 text-xs text-black/45">
                                  Regular{" "}
                                  <span className="line-through">
                                    {formatPrice(
                                      regularPrice
                                    )}
                                  </span>

                                  {pricedItem.tier
                                    ?.name
                                    ? ` · ${pricedItem.tier.name}`
                                    : ""}
                                </p>
                              ) : null}
                            </>
                          ) : pricingLoading ? (
                            <p className="text-sm text-black/45">
                              Calculating price...
                            </p>
                          ) : (
                            <p className="text-sm text-black/45">
                              Price unavailable
                            </p>
                          )}
                        </div>

                        {/* CONTROLS */}

                        <div className="mt-auto flex flex-wrap items-end justify-between gap-4 pt-6">
                          <div>
                            <p className="mb-2 text-[10px] font-black uppercase tracking-[0.18em] text-black/35">
                              Quantity
                            </p>

                            <div className="inline-flex items-center rounded-full border border-black/10 bg-[#f8f6ef] p-1">
                              <button
                                type="button"
                                onClick={() =>
                                  decrease(item.id)
                                }
                                className="flex h-9 w-9 items-center justify-center rounded-full bg-white transition hover:bg-black hover:text-white"
                                aria-label="Decrease quantity"
                              >
                                <Minus size={15} />
                              </button>

                              <span className="min-w-[42px] text-center text-sm font-black">
                                {item.quantity}
                              </span>

                              <button
                                type="button"
                                onClick={() =>
                                  increase(
                                    item.id,
                                    item.availableStock
                                  )
                                }
                                className="flex h-9 w-9 items-center justify-center rounded-full bg-white transition hover:bg-black hover:text-white"
                                aria-label="Increase quantity"
                              >
                                <Plus size={15} />
                              </button>
                            </div>
                          </div>

                          {pricedItem ? (
                            <div className="text-right">
                              <p className="text-[10px] font-black uppercase tracking-[0.18em] text-black/35">
                                Total
                              </p>

                              <p className="mt-1 text-xl font-black">
                                {formatPrice(
                                  lineTotal
                                )}
                              </p>

                              {lineSavings > 0 ? (
                                <p className="mt-1 text-xs font-bold text-[#4d7c2f]">
                                  Save{" "}
                                  {formatPrice(
                                    lineSavings
                                  )}
                                </p>
                              ) : null}
                            </div>
                          ) : null}
                        </div>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>

            <button
              type="button"
              onClick={clearCart}
              className="mt-5 inline-flex items-center gap-2 text-sm font-bold text-black/45 transition hover:text-red-600"
            >
              <Trash2 size={15} />
              Clear entire cart
            </button>
          </div>

          {/* ============================================
              ORDER SUMMARY
          ============================================ */}

          <aside className="h-fit lg:sticky lg:top-28">
            <div className="rounded-[1.8rem] border border-black/10 bg-white p-6 sm:p-7">
              <p className="text-[10px] font-black uppercase tracking-[0.22em] text-black/35">
                Checkout
              </p>

              <h2 className="mt-2 text-3xl font-black tracking-[-0.035em]">
                Order Summary
              </h2>

              <div className="mt-7 space-y-4 text-sm">
                <div className="flex items-center justify-between gap-4">
                  <span className="text-black/55">
                    Items ({totalItemCount})
                  </span>

                  <span className="font-bold">
                    {pricingReady
                      ? formatPrice(subtotal)
                      : "Calculating..."}
                  </span>
                </div>

                {savings > 0 ? (
                  <div className="flex items-center justify-between gap-4">
                    <span className="font-semibold text-[#4d7c2f]">
                      Quantity Savings
                    </span>

                    <span className="font-black text-[#4d7c2f]">
                      -
                      {formatPrice(savings)}
                    </span>
                  </div>
                ) : null}

                <div className="flex items-center justify-between gap-4">
                  <span className="text-black/55">
                    Estimated Shipping
                  </span>

                  <span className="font-bold">
                    {pricingReady
                      ? estimate.shipping === 0
                        ? "FREE"
                        : formatPrice(
                            estimate.shipping
                          )
                      : "—"}
                  </span>
                </div>

                <div className="flex items-center justify-between gap-4">
                  <span className="text-black/55">
                    Estimated Tax
                  </span>

                  <span className="font-bold">
                    {pricingReady
                      ? formatPrice(
                          estimate.tax
                        )
                      : "—"}
                  </span>
                </div>
              </div>

              <div className="my-6 border-t border-black/10" />

              <div className="flex items-end justify-between gap-5">
                <div>
                  <p className="text-sm font-semibold text-black/50">
                    Estimated Total
                  </p>

                  <p className="mt-1 text-[11px] text-black/35">
                    USD
                  </p>
                </div>

                <p className="text-3xl font-black tracking-[-0.04em]">
                  {pricingReady
                    ? formatPrice(
                        estimatedTotal
                      )
                    : "—"}
                </p>
              </div>

              {pricingError ? (
                <div className="mt-5 rounded-2xl bg-red-50 p-4 text-sm font-medium text-red-700">
                  {pricingError}
                </div>
              ) : null}

              {pricingLoading ? (
                <div className="mt-5 rounded-2xl bg-[#f8f6ef] p-4 text-sm text-black/55">
                  Updating your pricing...
                </div>
              ) : null}

              {pricingReady ? (
                <Link
                  href="/checkout"
                  className="mt-7 flex w-full items-center justify-center gap-2 rounded-full bg-black px-6 py-4 text-sm font-black text-white transition hover:bg-black/80"
                >
                  Proceed to Checkout
                  <ArrowRight size={17} />
                </Link>
              ) : (
                <button
                  type="button"
                  disabled
                  className="mt-7 flex w-full cursor-not-allowed items-center justify-center rounded-full bg-black/30 px-6 py-4 text-sm font-black text-white"
                >
                  {pricingLoading
                    ? "Updating Price..."
                    : "Checkout Unavailable"}
                </button>
              )}

              <Link
                href={continueShoppingHref}
                className="mt-3 flex w-full items-center justify-center gap-2 rounded-full border border-black/10 px-6 py-3.5 text-sm font-black transition hover:bg-[#f8f6ef]"
              >
                Continue Shopping
              </Link>

              <p className="mt-5 text-center text-[11px] leading-5 text-black/40">
                Free shipping on orders over{" "}
                <span className="font-bold text-black/60">
                  {formatPrice(
                    commerce.freeShippingThreshold
                  )}
                </span>
              </p>
            </div>

            {/* TRUST FEATURES */}

            <div className="mt-4 grid grid-cols-3 overflow-hidden rounded-[1.5rem] border border-black/10 bg-white">
              <div className="flex flex-col items-center justify-center px-2 py-4 text-center">
                {isEcoware ? (
                  <Leaf
                    size={20}
                    className="text-[#4d7c2f]"
                  />
                ) : (
                  <ShoppingBag
                    size={20}
                    className="text-[#4d7c2f]"
                  />
                )}

                <span className="mt-2 text-[10px] font-black leading-tight">
                  {isEcoware
                    ? "Eco-Friendly"
                    : "Premium Quality"}
                </span>
              </div>

              <div className="flex flex-col items-center justify-center border-x border-black/10 px-2 py-4 text-center">
                <ShieldCheck
                  size={20}
                  className="text-[#4d7c2f]"
                />

                <span className="mt-2 text-[10px] font-black leading-tight">
                  Secure Checkout
                </span>
              </div>

              <div className="flex flex-col items-center justify-center px-2 py-4 text-center">
                <Truck
                  size={20}
                  className="text-[#4d7c2f]"
                />

                <span className="mt-2 text-[10px] font-black leading-tight">
                  Fast Shipping
                </span>
              </div>
            </div>
          </aside>
        </div>
      </section>
    </main>
  );
}