"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useCart } from "@/components/CartProvider";
import { formatPrice } from "@/lib/data";
import { productToGaItem, trackEvent } from "@/lib/analytics";
import WholesaleInquiryForm from "@/components/WholesaleInquiryForm";
import ProductSpecificationsPanel from "@/components/ProductSpecificationsPanel";
import ProductCertificationsPanel from "@/components/ProductCertificationsPanel";
import ProductImageGallery from "@/components/ProductImageGallery";
import RelatedProducts from "@/components/RelatedProducts";
import SampleRequestForm from "@/components/SampleRequestForm";
import ProductReviews from "@/components/ProductReviews";

export default function ProductDetailClient({ 
  product, 
  specifications, 
  certifications = [],
  priceTiers = [],
  relatedProducts = [],
  reviews = [],
  subscriptionSettings = null,
  subscriptionFrequencies = []
}) {
  const { addItem } = useCart();

  const [quantity, setQuantity] = useState(1);
  const [purchaseOption, setPurchaseOption] =
    useState("one_time");
  const [subscriptionFrequency, setSubscriptionFrequency] =
    useState(
      subscriptionFrequencies[0]?.id || ""
    );

  const subscriptionEnabled =
    Boolean(
      subscriptionSettings?.is_enabled
    ) && subscriptionFrequencies.length > 0;

  const subscriptionDiscountPercent =
    Math.max(
      0,
      Math.min(
        100,
        Number(
          subscriptionSettings?.discount_percent ||
            0
        )
      )
    );

  const subscriptionMinimumQuantity =
    Math.max(
      1,
      Number(
        subscriptionSettings?.minimum_quantity ||
          1
      )
    );

  const isSubscription =
    subscriptionEnabled &&
    purchaseOption === "subscription";

  const sortedPriceTiers = useMemo(
    () =>
      [...priceTiers].sort(
        (a, b) =>
          Number(a.min_quantity) -
          Number(b.min_quantity)
      ),
    [priceTiers]
  );

  const activeTier = useMemo(() => {
    return (
      sortedPriceTiers.find((tier) => {
        const minQuantity =
          Number(tier.min_quantity);

        const maxQuantity =
          tier.max_quantity === null
            ? null
            : Number(tier.max_quantity);

        return (
          quantity >= minQuantity &&
          (maxQuantity === null ||
            quantity <= maxQuantity)
        );
      }) || null
    );
  }, [quantity, sortedPriceTiers]);

  const regularUnitPrice =
    Number(product.unitPrice || 0);

  const currentUnitPrice =
    activeTier
      ? Number(activeTier.unit_price_cents) / 100
      : regularUnitPrice;

  const subscriptionPriceFromRegular =
    regularUnitPrice *
    (1 - subscriptionDiscountPercent / 100);

  const subscriptionUnitPrice =
    Math.min(
      subscriptionPriceFromRegular,
      currentUnitPrice
    );

  const subscriptionDiscountWins =
    subscriptionPriceFromRegular <
    currentUnitPrice;

  const volumeDiscountWins =
    activeTier &&
    currentUnitPrice <=
      subscriptionPriceFromRegular;

  const displayedUnitPrice =
    isSubscription
      ? subscriptionUnitPrice
      : currentUnitPrice;

  const regularTotal =
    regularUnitPrice * quantity;

  const currentTotal =
    currentUnitPrice * quantity;

  const subscriptionTotal =
    subscriptionUnitPrice * quantity;

  const displayedTotal =
    isSubscription
      ? subscriptionTotal
      : currentTotal;

  const subscriptionSavings =
    Math.max(
      regularTotal - subscriptionTotal,
      0
    );

  const savings =
    Math.max(
      regularTotal - currentTotal,
      0
    );

  const savingsPercent =
    regularUnitPrice > 0 &&
    currentUnitPrice < regularUnitPrice
      ? Math.round(
          ((regularUnitPrice -
            currentUnitPrice) /
            regularUnitPrice) *
            100
        )
      : 0;

  const availableStock = Math.max(
    Number(
      product.inventory?.stock_quantity || 0
    ) -
      Number(
        product.inventory?.reserved_quantity || 0
      ),
    0
  );

  const minimumAllowedQuantity =
    isSubscription
      ? subscriptionMinimumQuantity
      : 1;

  function decreaseQuantity() {
    setQuantity((current) =>
      Math.max(
        minimumAllowedQuantity,
        current - 1
      )
    );
  }

  function increaseQuantity() {
    setQuantity((current) =>
      availableStock > 0
        ? Math.min(
            availableStock,
            current + 1
          )
        : current + 1
    );
  }

  function handleQuantityChange(event) {
    const nextQuantity =
      Number(event.target.value);

    if (
      !Number.isInteger(nextQuantity) ||
      nextQuantity < minimumAllowedQuantity
    ) {
      setQuantity(minimumAllowedQuantity);
      return;
    }

    if (availableStock > 0) {
      setQuantity(
        Math.min(
          nextQuantity,
          availableStock
        )
      );
      return;
    }

    setQuantity(nextQuantity);
  }

  function handleAddToCart() {
    for (
      let index = 0;
      index < quantity;
      index += 1
    ) {
      addItem(product);
    }

    trackEvent("add_to_cart", {
      currency: "USD",
      value: currentTotal,
      items: [
        productToGaItem(
          {
            ...product,
            unitPrice: currentUnitPrice
          },
          quantity
        )
      ]
    });
  }

  useEffect(() => {
    if (
      isSubscription &&
      quantity < subscriptionMinimumQuantity
    ) {
      setQuantity(
        subscriptionMinimumQuantity
      );
    }
  }, [
    isSubscription,
    quantity,
    subscriptionMinimumQuantity
  ]);

  useEffect(() => {
    trackEvent("view_item", {
      currency: "USD",
      value: product.unitPrice || 0,
      items: [productToGaItem(product)]
    });
  }, [product]);

  return (
    <main className="bg-brand-radial pt-24 text-black md:pt-28">
      
      {/* Product Hero Section */}
      <section className="section-pad py-14 md:py-20">
        <div className="container-brand">
          <Link href="/products" className="inline-flex rounded-full bg-white px-4 py-2 text-sm font-bold text-black shadow-soft">
            ← Back to Products
          </Link>

          <div className="mt-8 grid gap-8 lg:grid-cols-[.95fr_1.05fr] lg:items-start">
            
            {/* Image Gallery Container */}
            <div className="rounded-[2rem] bg-white p-5 shadow-lift md:p-8">
              <ProductImageGallery 
                images={product.images?.length ? product.images : [
                  {
                    id: "primary",
                    url: product.image,
                    altText: product.name,
                    isPrimary: true
                  }
                ]} 
                productName={product.name} 
              />
            </div>

            <div>
              <div className="inline-flex rounded-full bg-white px-3 py-1 text-xs font-bold uppercase tracking-[.16em] text-black ring-1 ring-black/15">
                {product.badge}
              </div>
              <h1 className="mt-4 font-display text-4xl font-bold leading-tight text-black md:text-6xl">
                {product.name}
              </h1>
              <p className="mt-5 text-lg leading-8 text-black">
                {product.shortDescription}
              </p>

              <div className="mt-6 rounded-[2rem] bg-white p-5 shadow-soft md:p-6">
                <div className="grid gap-4 text-black sm:grid-cols-2">
                  <div>
                    <div className="text-sm font-bold uppercase tracking-[.16em]">
                      Pack Size
                    </div>

                    <div className="mt-1">
                      {product.packSize}
                    </div>
                  </div>

                  <div>
                    <div className="text-sm font-bold uppercase tracking-[.16em]">
                      Price
                    </div>

                    <div className="mt-1 flex flex-wrap items-center gap-2">
                      <span className="text-xl font-bold">
                        {formatPrice(currentUnitPrice)}
                      </span>

                      {activeTier ? (
                        <>
                          <span className="text-sm text-black/50 line-through">
                            {formatPrice(
                              regularUnitPrice
                            )}
                          </span>

                          {savingsPercent > 0 ? (
                            <span className="rounded-full bg-green-100 px-2 py-1 text-xs font-bold text-green-800">
                              Save {savingsPercent}%
                            </span>
                          ) : null}
                        </>
                      ) : null}
                    </div>

                    <div className="mt-1 text-xs text-black/60">
                      per unit
                    </div>
                  </div>
                </div>

                {sortedPriceTiers.length > 0 ? (
                  <div className="mt-6 rounded-[1.5rem] border border-black/10 bg-[#faf7f1] p-4">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <div className="text-sm font-bold uppercase tracking-[.16em]">
                          Buy More, Save More
                        </div>

                        <p className="mt-1 text-sm text-black/60">
                          Volume pricing is applied
                          automatically.
                        </p>
                      </div>

                      {activeTier ? (
                        <span className="rounded-full bg-black px-3 py-1.5 text-xs font-bold text-white">
                          {activeTier.tier_name ||
                            "Volume Price Active"}
                        </span>
                      ) : null}
                    </div>

                    <div className="mt-4 overflow-hidden rounded-2xl border border-black/10 bg-white">
                      <div className="grid grid-cols-[1fr_1fr_auto] gap-3 border-b border-black/10 bg-black px-4 py-3 text-xs font-bold uppercase tracking-[.12em] text-white">
                        <span>Quantity</span>
                        <span>Price / Unit</span>
                        <span>Savings</span>
                      </div>

                      <div className="grid grid-cols-[1fr_1fr_auto] gap-3 border-b border-black/10 px-4 py-3 text-sm">
                        <span>
                          {sortedPriceTiers[0]
                            ?.min_quantity > 1
                            ? `1–${
                                sortedPriceTiers[0]
                                  .min_quantity - 1
                              }`
                            : "Regular"}
                        </span>

                        <span className="font-bold">
                          {formatPrice(
                            regularUnitPrice
                          )}
                        </span>

                        <span>—</span>
                      </div>

                      {sortedPriceTiers.map(
                        (tier) => {
                          const tierPrice =
                            Number(
                              tier.unit_price_cents
                            ) / 100;

                          const tierSavings =
                            regularUnitPrice > 0
                              ? Math.max(
                                  Math.round(
                                    ((regularUnitPrice -
                                      tierPrice) /
                                      regularUnitPrice) *
                                      100
                                  ),
                                  0
                                )
                              : 0;

                          const isActive =
                            activeTier?.id ===
                            tier.id;

                          const quantityLabel =
                            tier.max_quantity ===
                            null
                              ? `${tier.min_quantity}+`
                              : `${tier.min_quantity}–${tier.max_quantity}`;

                          return (
                            <div
                              key={tier.id}
                              className={`grid grid-cols-[1fr_1fr_auto] gap-3 border-b border-black/10 px-4 py-3 text-sm last:border-b-0 ${
                                isActive
                                  ? "bg-green-50"
                                  : ""
                              }`}
                            >
                              <span
                                className={
                                  isActive
                                    ? "font-bold"
                                    : ""
                                }
                              >
                                {quantityLabel}
                              </span>

                              <span className="font-bold">
                                {formatPrice(
                                  tierPrice
                                )}
                              </span>

                              <span
                                className={
                                  tierSavings > 0
                                    ? "font-bold text-green-700"
                                    : ""
                                }
                              >
                                {tierSavings > 0
                                  ? `${tierSavings}%`
                                  : "—"}
                              </span>
                            </div>
                          );
                        }
                      )}
                    </div>
                  </div>
                ) : null}

                {product.canCheckout ? (
                  <>
                    {subscriptionEnabled ? (
                      <div className="mt-6 grid gap-3">
                        <label className="flex items-start gap-3 rounded-2xl border border-black/10 bg-white p-4">
                          <input
                            type="radio"
                            name="purchaseOption"
                            value="one_time"
                            checked={
                              purchaseOption === "one_time"
                            }
                            onChange={(event) =>
                              setPurchaseOption(
                                event.target.value
                              )
                            }
                            className="mt-1 h-4 w-4"
                          />

                          <div className="flex-1">
                            <div className="font-bold">
                              One-time purchase
                            </div>

                            <div className="mt-1 text-sm text-black/60">
                              {formatPrice(currentUnitPrice)} per unit
                            </div>
                          </div>
                        </label>

                        <label className="flex items-start gap-3 rounded-2xl border border-green-200 bg-green-50 p-4">
                          <input
                            type="radio"
                            name="purchaseOption"
                            value="subscription"
                            checked={
                              purchaseOption === "subscription"
                            }
                            onChange={(event) =>
                              setPurchaseOption(
                                event.target.value
                              )
                            }
                            className="mt-1 h-4 w-4"
                          />

                          <div className="flex-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="font-bold">
                                Subscribe & Save
                              </span>
                              <span className="rounded-full bg-green-700 px-2.5 py-1 text-xs font-bold text-white">
                                {subscriptionDiscountWins
                                  ? `Save ${subscriptionDiscountPercent}%`
                                  : "Best price applied"}
                              </span>
                            </div>

                            <div className="mt-1 flex flex-wrap items-center gap-2">
                              <span className="font-bold text-green-800">
                                {formatPrice(subscriptionUnitPrice)}
                              </span>
                              <span className="text-sm text-black/45 line-through">
                                {formatPrice(currentUnitPrice)}
                              </span>
                              <span className="text-sm text-black/60">
                                per unit
                              </span>
                            </div>

                            {volumeDiscountWins ? (
                              <div className="mt-2 text-xs font-semibold text-green-800">
                                Your quantity discount is better than the Subscribe & Save discount, so the lower volume price is used.
                              </div>
                            ) : null}
                          </div>
                        </label>

                        {isSubscription ? (
                          <div className="mt-1 rounded-2xl border border-green-200 bg-green-50 p-4">
                            <label className="block">
                              <span className="text-sm font-bold text-black">
                                Delivery Frequency
                              </span>

                              <select
                                value={subscriptionFrequency}
                                onChange={(event) =>
                                  setSubscriptionFrequency(
                                    event.target.value
                                  )
                                }
                                className="mt-2 w-full rounded-xl border border-black/15 bg-white px-4 py-3 font-semibold text-black outline-none focus:border-black"
                              >
                                {subscriptionFrequencies.map(
                                  (frequency) => (
                                    <option
                                      key={frequency.id}
                                      value={frequency.id}
                                    >
                                      {frequency.label}
                                    </option>
                                  )
                                )}
                              </select>
                            </label>

                            <p className="mt-3 text-xs leading-5 text-black/55">
                              Recurring deliveries will continue at the selected frequency until canceled.
                            </p>
                          </div>
                        ) : null}
                      </div>
                    ) : null}

                    <div className="mt-6">
                      <div className="text-sm font-bold uppercase tracking-[.16em]">
                        Quantity
                      </div>

                      <div className="mt-3 flex flex-wrap items-center gap-3">
                        <div className="inline-flex items-center overflow-hidden rounded-full border border-black/15 bg-white">
                          <button
                            type="button"
                            onClick={
                              decreaseQuantity
                            }
                            disabled={
                              quantity <=
                                minimumAllowedQuantity
                            }
                            className="flex h-12 w-12 items-center justify-center text-xl font-bold transition hover:bg-black/5 disabled:cursor-not-allowed disabled:opacity-30"
                            aria-label="Decrease quantity"
                          >
                            −
                          </button>

                          <input
                            type="number"
                            min={minimumAllowedQuantity}
                            max={
                              availableStock > 0
                                ? availableStock
                                : undefined
                            }
                            value={quantity}
                            onChange={
                              handleQuantityChange
                            }
                            className="h-12 w-16 border-x border-black/10 text-center font-bold outline-none"
                            aria-label="Quantity"
                          />

                          <button
                            type="button"
                            onClick={
                              increaseQuantity
                            }
                            disabled={
                              availableStock > 0 &&
                              quantity >=
                                availableStock
                            }
                            className="flex h-12 w-12 items-center justify-center text-xl font-bold transition hover:bg-black/5 disabled:cursor-not-allowed disabled:opacity-30"
                            aria-label="Increase quantity"
                          >
                            +
                          </button>
                        </div>

                        {availableStock > 0 ? (
                          <span className="text-sm text-black/60">
                            {availableStock} available
                          </span>
                        ) : null}
                      </div>
                    </div>

                    <div className="mt-5 rounded-2xl bg-[#f8f4ed] p-4">
                      <div className="flex items-center justify-between gap-4">
                        <span className="text-sm text-black/70">
                          {quantity} ×{" "}
                          {formatPrice(
                            displayedUnitPrice
                          )}
                        </span>

                        <span className="text-xl font-bold">
                          {formatPrice(
                            displayedTotal
                          )}
                        </span>
                      </div>

                      {savings > 0 ? (
                        <div className="mt-2 flex items-center justify-between gap-4 text-sm font-bold text-green-700">
                          <span>
                            Volume savings
                          </span>

                          <span>
                            {formatPrice(
                              savings
                            )}
                          </span>
                        </div>
                      ) : null}

                      {isSubscription &&
                      subscriptionSavings > 0 ? (
                        <div className="mt-2 flex items-center justify-between gap-4 text-sm font-bold text-green-700">
                          <span>
                            Total savings
                          </span>

                          <span>
                            -
                            {formatPrice(
                              subscriptionSavings
                            )}
                          </span>
                        </div>
                      ) : null}
                    </div>

                    {isSubscription ? (
                      <button
                        type="button"
                        onClick={() => {
                          if (!subscriptionFrequency) {
                            return;
                          }

                          const params =
                            new URLSearchParams({
                              productId: product.id,
                              frequencyId:
                                subscriptionFrequency,
                              quantity: String(quantity)
                            });

                          window.location.href =
                            `/subscriptions/checkout?${params.toString()}`;
                        }}
                        disabled={
                          availableStock === 0 ||
                          !subscriptionFrequency
                        }
                        className="mt-5 w-full rounded-full bg-green-700 px-6 py-4 font-bold text-white transition hover:bg-green-800 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
                      >
                        {availableStock === 0
                          ? "Out of Stock"
                          : "Subscribe Now"}
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={
                          handleAddToCart
                        }
                        disabled={
                          availableStock === 0
                        }
                        className="mt-5 w-full rounded-full bg-black px-6 py-4 font-bold text-white transition hover:bg-[#333333] disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
                      >
                        {availableStock === 0
                          ? "Out of Stock"
                          : `Add ${quantity} to Cart`}
                      </button>
                    )}

                    {(
                        product.category === "tableware" ||
                        product.categoryId === "tableware"
                      ) ? (
                        <a
                          href="#sample-request"
                          className="mt-3 inline-flex w-full justify-center rounded-full border border-black px-6 py-4 font-bold text-black transition hover:bg-black hover:text-white sm:w-auto"
                        >
                          Request Free Sample
                        </a>
                      ) : null}
                  </>
                ) : (
                  <div className="mt-6">
                    <a
                      href="#wholesale"
                      className="inline-flex w-full justify-center rounded-full bg-black px-6 py-4 font-bold text-white transition hover:bg-[#333333] sm:w-auto"
                    >
                      Request Wholesale Price
                    </a>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Recommended complete content order (Step 6) */}
      <div className="container-brand section-pad grid gap-6 pb-14 md:pb-20">
        
        {/* Specifications */}
        {specifications ? (
          <ProductSpecificationsPanel specifications={specifications} />
        ) : null}

        {/* Existing Key Features */}
        <section className="rounded-[2rem] bg-white p-5 shadow-soft md:p-6">
          <h2 className="font-display text-3xl font-bold text-black">Key Features</h2>
          <ul className="mt-5 grid gap-4">
            {product.features?.map((feature, idx) => (
              <li key={idx} className="rounded-2xl bg-[#f8f4ed] p-4 leading-7 text-black">
                {typeof feature === 'string' ? feature : (
                  <><strong className="font-bold">{feature.title}</strong>: {feature.description}</>
                )}
              </li>
            ))}
          </ul>
        </section>

        {/* Existing Best For */}
        <section className="rounded-[2rem] bg-white p-5 shadow-soft md:p-6">
          <h2 className="font-display text-3xl font-bold text-black">
            Best For
          </h2>

          <p className="mt-3 leading-8 text-black">
            {product.bestFor}
          </p>
        </section>

        {/* Free Sample Request — Simpli Ecoware only */}
        {(
          product.category === "tableware" ||
          product.categoryId === "tableware"
        ) ? (
          <SampleRequestForm
            productId={product.id}
            productName={product.name}
          />
        ) : null}

        {/* Related Products */}
        <RelatedProducts products={relatedProducts} />

        {/* Customer Reviews */}
        <ProductReviews
          productId={product.id}
          productName={product.name}
          reviews={reviews}
        />

        {/* Wholesale + Certifications */}
        <div id="wholesale" className="grid items-stretch gap-6 scroll-mt-28 lg:grid-cols-2">
          {product.wholesale ? (
            <WholesaleInquiryForm
              productId={product.id}
              productName={product.name}
            />
          ) : (
            <div></div>
          )}
          
          <ProductCertificationsPanel certifications={certifications} />
        </div>

      </div>
    </main>
  );
}