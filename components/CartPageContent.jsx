"use client";

import Image from "next/image";
import Link from "next/link";
import {
  Minus,
  Plus,
  Trash2
} from "lucide-react";
import {
  useEffect,
  useMemo,
  useState
} from "react";

import {
  useCart
} from "@/components/CartProvider";

import {
  formatPrice
} from "@/lib/data";

import {
  getCheckoutEstimate,
  commerce
} from "@/lib/commerce";

import SectionHeading from "@/components/SectionHeading";

export default function CartPageContent() {
  const {
    items,
    increase,
    decrease,
    removeItem,
    clearCart
  } = useCart();

  const [pricing, setPricing] =
    useState(null);

  const [pricingLoading, setPricingLoading] =
    useState(false);

  const [pricingError, setPricingError] =
    useState("");

  /*
   * Build a stable representation of the cart.
   * Pricing only needs product IDs + quantities.
   */
  const pricingRequestItems =
    useMemo(
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

    const controller =
      new AbortController();

    async function loadPricing() {
      try {
        setPricingLoading(true);
        setPricingError("");

        const response =
          await fetch(
            "/api/cart/pricing",
            {
              method: "POST",

              headers: {
                "Content-Type":
                  "application/json"
              },

              body: JSON.stringify({
                items:
                  pricingRequestItems
              }),

              signal:
                controller.signal
            }
          );

        const result =
          await response.json();

        if (
          !response.ok ||
          !result.success
        ) {
          throw new Error(
            result.message ||
              "Unable to calculate cart pricing."
          );
        }

        setPricing(result);
      } catch (error) {
        if (
          error?.name ===
          "AbortError"
        ) {
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
        if (
          !controller.signal.aborted
        ) {
          setPricingLoading(false);
        }
      }
    }

    loadPricing();

    return () => {
      controller.abort();
    };
  }, [items, pricingRequestItems]);

  /*
   * Convert the API response into a Map
   * so each cart item can find its
   * authoritative server price.
   */
  const pricedItemsById =
    useMemo(() => {
      return new Map(
        (pricing?.items || []).map(
          (item) => [
            item.productId,
            item
          ]
        )
      );
    }, [pricing]);

  /*
   * Server subtotal is stored in cents.
   * formatPrice() expects dollar values
   * in the existing application.
   */
  const subtotal =
    pricing
      ? pricing.subtotalCents / 100
      : 0;

  const savings =
    pricing
      ? pricing.savingsCents / 100
      : 0;

  const estimate =
    getCheckoutEstimate(subtotal);

  const totalItemCount =
    items.reduce(
      (sum, item) =>
        sum + item.quantity,
      0
    );

  const pricingReady =
    Boolean(pricing) &&
    !pricingLoading &&
    !pricingError;

  return (
    <main className="bg-brand-radial pt-24 text-black md:pt-28">
      <section className="section-pad py-14 md:py-20">
        <div className="container-brand">
          <SectionHeading
            eyebrow="Cart"
            title="Your shopping cart"
            text="Review your items, adjust quantities, and proceed securely to checkout."
          />

          {items.length === 0 ? (
            <div className="mt-8 rounded-[2rem] bg-white p-5 shadow-soft md:mt-10 md:p-8">
              <p className="text-lg text-black">
                Your cart is empty.
              </p>

              <Link
                href="/products"
                className="mt-6 inline-flex rounded-full bg-black px-6 py-3 font-bold text-white"
              >
                Shop Products
              </Link>
            </div>
          ) : (
            <div className="mt-8 grid gap-6 md:mt-10 md:gap-8 lg:grid-cols-[1fr_380px]">
              <div className="grid gap-4">
                {items.map((item) => {
                  const pricedItem =
                    pricedItemsById.get(
                      item.id
                    );

                  const regularPrice =
                    pricedItem
                      ? pricedItem
                          .regularUnitPriceCents /
                        100
                      : null;

                  const currentPrice =
                    pricedItem
                      ? pricedItem
                          .unitPriceCents /
                        100
                      : null;

                  const lineTotal =
                    pricedItem
                      ? pricedItem
                          .lineTotalCents /
                        100
                      : null;

                  const lineSavings =
                    pricedItem
                      ? pricedItem
                          .savingsCents /
                        100
                      : 0;

                  const hasDiscount =
                    pricedItem
                      ?.hasQuantityDiscount ===
                    true;

                  return (
                    <div
                      key={item.id}
                      className="rounded-[1.75rem] bg-white p-4 shadow-soft md:rounded-[2rem] md:p-5"
                    >
                      <div className="grid gap-4 sm:grid-cols-[120px_1fr] lg:grid-cols-[140px_1fr_auto] lg:items-center">
                        <div className="relative h-32 overflow-hidden rounded-[1.3rem] bg-[#faf6ee] sm:h-36">
                          <Image
                            src={item.image}
                            alt={item.name}
                            fill
                            className="object-contain p-4"
                            sizes="140px"
                          />
                        </div>

                        <div>
                          <div className="text-xs font-bold uppercase tracking-[.15em] text-black">
                            {item.category}
                          </div>

                          <div className="mt-1 font-display text-2xl font-bold text-black">
                            {item.name}
                          </div>

                          {pricedItem ? (
                            <>
                              <div className="mt-2 flex flex-wrap items-center gap-2">
                                <span className="font-bold text-black">
                                  {formatPrice(
                                    currentPrice
                                  )}{" "}
                                  each
                                </span>

                                {hasDiscount ? (
                                  <span className="rounded-full bg-green-100 px-3 py-1 text-xs font-bold text-green-800">
                                    Quantity Price
                                  </span>
                                ) : null}
                              </div>

                              {hasDiscount ? (
                                <div className="mt-2 text-sm text-black/60">
                                  Regular{" "}
                                  <span className="line-through">
                                    {formatPrice(
                                      regularPrice
                                    )}
                                  </span>

                                  {pricedItem
                                    .tier
                                    ?.name ? (
                                    <>
                                      {" "}
                                      ·{" "}
                                      {
                                        pricedItem
                                          .tier
                                          .name
                                      }
                                    </>
                                  ) : null}
                                </div>
                              ) : null}

                              <div className="mt-3 text-sm text-black/70">
                                Line total:{" "}
                                <span className="font-bold text-black">
                                  {formatPrice(
                                    lineTotal
                                  )}
                                </span>
                              </div>

                              {lineSavings >
                              0 ? (
                                <div className="mt-1 text-sm font-bold text-green-700">
                                  You save{" "}
                                  {formatPrice(
                                    lineSavings
                                  )}
                                </div>
                              ) : null}
                            </>
                          ) : pricingLoading ? (
                            <div className="mt-2 text-sm text-black/60">
                              Calculating price...
                            </div>
                          ) : (
                            <div className="mt-2 text-sm text-black/60">
                              Price unavailable
                            </div>
                          )}
                        </div>

                        <div className="flex flex-wrap items-center gap-3">
                          <div className="flex items-center rounded-full bg-brand.sand p-1">
                            <button
                              type="button"
                              onClick={() =>
                                decrease(
                                  item.id
                                )
                              }
                              className="grid h-9 w-9 place-items-center rounded-full bg-white text-black"
                              aria-label="Decrease quantity"
                            >
                              <Minus
                                size={16}
                              />
                            </button>

                            <span className="min-w-10 text-center font-bold text-black">
                              {
                                item.quantity
                              }
                            </span>

                            <button
                              type="button"
                              onClick={() =>
                                increase(
                                  item.id,
                                  item.availableStock
                                )
                              }
                              className="grid h-9 w-9 place-items-center rounded-full bg-white text-black"
                              aria-label="Increase quantity"
                            >
                              <Plus
                                size={16}
                              />
                            </button>
                          </div>

                          <button
                            type="button"
                            onClick={() =>
                              removeItem(
                                item.id
                              )
                            }
                            className="inline-flex items-center gap-2 rounded-full bg-red-50 px-4 py-2 text-sm font-bold text-black transition hover:bg-red-100"
                          >
                            <Trash2
                              size={16}
                            />

                            Remove
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              <aside className="h-fit rounded-[2rem] bg-white p-5 shadow-soft md:p-6">
                <div className="font-display text-3xl font-bold text-black">
                  Order Summary
                </div>

                <div className="mt-6 grid gap-4 text-black">
                  <div className="flex justify-between">
                    <span>
                      Items
                    </span>

                    <span>
                      {totalItemCount}
                    </span>
                  </div>

                  <div className="flex justify-between">
                    <span>
                      Subtotal
                    </span>

                    <span>
                      {pricingReady
                        ? formatPrice(
                            subtotal
                          )
                        : "Calculating..."}
                    </span>
                  </div>

                  {savings > 0 ? (
                    <div className="flex justify-between font-bold text-green-700">
                      <span>
                        Quantity Savings
                      </span>

                      <span>
                        -
                        {formatPrice(
                          savings
                        )}
                      </span>
                    </div>
                  ) : null}

                  <div className="flex justify-between">
                    <span>
                      Est. Shipping
                    </span>

                    <span>
                      {pricingReady
                        ? estimate.shipping ===
                          0
                          ? "Free"
                          : formatPrice(
                              estimate.shipping
                            )
                        : "—"}
                    </span>
                  </div>

                  <div className="flex justify-between">
                    <span>
                      Est. Tax
                    </span>

                    <span>
                      {pricingReady
                        ? formatPrice(
                            estimate.tax
                          )
                        : "—"}
                    </span>
                  </div>

                  <div className="border-t border-black/10 pt-4 text-sm">
                    Free shipping
                    threshold:{" "}
                    {formatPrice(
                      commerce.freeShippingThreshold
                    )}
                    .
                  </div>
                </div>

                {pricingError ? (
                  <div className="mt-5 rounded-2xl bg-red-50 p-4 text-sm font-medium text-red-800">
                    {pricingError}
                  </div>
                ) : null}

                {pricingLoading ? (
                  <div className="mt-5 rounded-2xl bg-[#faf6ee] p-4 text-sm text-black/70">
                    Updating your
                    pricing...
                  </div>
                ) : null}

                {pricingReady ? (
                  <Link
                    href="/checkout"
                    className="mt-6 block rounded-full bg-black px-6 py-4 text-center font-bold text-white transition hover:bg-[#333333]"
                  >
                    Proceed to Checkout
                  </Link>
                ) : (
                  <button
                    type="button"
                    disabled
                    className="mt-6 block w-full cursor-not-allowed rounded-full bg-black/40 px-6 py-4 text-center font-bold text-white"
                  >
                    {pricingLoading
                      ? "Updating Price..."
                      : "Checkout Unavailable"}
                  </button>
                )}

                <button
                  type="button"
                  onClick={clearCart}
                  className="mt-3 w-full rounded-full bg-brand.sand px-6 py-3 font-bold text-black transition hover:bg-[#ded1bf]"
                >
                  Clear Cart
                </button>
              </aside>
            </div>
          )}
        </div>
      </section>
    </main>
  );
}