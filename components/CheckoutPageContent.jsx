"use client";

import Image from "next/image";
import Link from "next/link";
import {
  useEffect,
  useMemo,
  useState
} from "react";
import { Lock } from "lucide-react";

import {
  PayPalButtons,
  PayPalScriptProvider
} from "@paypal/react-paypal-js";

import { useCart } from "@/components/CartProvider";
import SectionHeading from "@/components/SectionHeading";

import { formatPrice } from "@/lib/data";

import {
  commerce,
  getCheckoutEstimate
} from "@/lib/commerce";

import {
  productToGaItem,
  trackEvent
} from "@/lib/analytics";

export default function CheckoutPageContent() {
  const {
    items
  } = useCart();

  const [
    customerDetails,
    setCustomerDetails
  ] = useState({
    name: "",
    email: "",
    phone: "",
    shippingAddress: "",
    marketingEmailConsent: false
  });

  function updateCustomerField(
    field,
    value
  ) {
    setCustomerDetails(
      (current) => ({
        ...current,
        [field]: value
      })
    );
  }

  const normalizedEmail =
    customerDetails.email
      .trim()
      .toLowerCase();

  const customerDetailsValid =
    customerDetails.name.trim() !== "" &&
    normalizedEmail !== "" &&
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
      normalizedEmail
    );

  const [loading, setLoading] =
    useState(false);

  const [
    paypalLoading,
    setPayPalLoading
  ] = useState(false);

  const [
    pricingLoading,
    setPricingLoading
  ] = useState(false);

  const [pricing, setPricing] =
    useState(null);

  const [error, setError] =
    useState("");

  /*
   * Only product IDs and quantities are sent
   * for trusted server-side pricing/payment.
   */
  const checkoutItems =
    useMemo(
      () =>
        items.map((item) => ({
          id: item.id,
          quantity: item.quantity
        })),
      [items]
    );

  /*
   * Load the same authoritative pricing
   * used by the Cart page.
   */
  useEffect(() => {
    if (items.length === 0) {
      setPricing(null);
      setPricingLoading(false);

      return;
    }

    const controller =
      new AbortController();

    async function loadPricing() {
      try {
        setPricingLoading(true);

        const response =
          await fetch(
            "/api/cart/pricing",
            {
              method: "POST",

              headers: {
                "Content-Type":
                  "application/json"
              },

              body:
                JSON.stringify({
                  items:
                    checkoutItems
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
              "Unable to calculate checkout pricing."
          );
        }

        setPricing(result);
      } catch (err) {
        if (
          err?.name ===
          "AbortError"
        ) {
          return;
        }

        console.error(
          "Unable to load checkout pricing:",
          err
        );

        setPricing(null);

        setError(
          err instanceof Error
            ? err.message
            : "Unable to calculate checkout pricing."
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
  }, [items, checkoutItems]);

  const pricedItemsById =
    useMemo(
      () =>
        new Map(
          (
            pricing?.items ||
            []
          ).map(
            (item) => [
              item.productId,
              item
            ]
          )
        ),
      [pricing]
    );

  const subtotal =
    pricing
      ? pricing.subtotalCents /
        100
      : 0;

  const savings =
    pricing
      ? pricing.savingsCents /
        100
      : 0;

  /*
   * The customer-facing estimate now uses
   * the authoritative tier-adjusted subtotal.
   */
  const estimate =
    getCheckoutEstimate(
      subtotal
    );

  const pricingReady =
    Boolean(pricing) &&
    !pricingLoading;

  async function handleStripeCheckout() {
    if (
      loading ||
      paypalLoading ||
      !pricingReady ||
      items.length === 0
    ) {
      return;
    }

    setLoading(true);
    setError("");

    trackEvent(
      "begin_checkout",
      {
        currency: "USD",
        value:
          estimate.total,
        shipping:
          estimate.shipping,
        tax:
          estimate.tax,

        items:
          items.map(
            (item) => {
              const pricedItem =
                pricedItemsById.get(
                  item.id
                );

              return productToGaItem(
                {
                  ...item,

                  unitPrice:
                    pricedItem
                      ? pricedItem
                          .unitPriceCents /
                        100
                      : item.unitPrice
                },
                item.quantity
              );
            }
          )
      }
    );

    try {
      const response =
        await fetch(
          "/api/checkout",
          {
            method: "POST",

            headers: {
              "Content-Type":
                "application/json"
            },

            /*
             * Never send prices as authoritative
             * checkout data.
             *
             * prepareCheckout() reloads them
             * from Supabase.
             */
            body:
            JSON.stringify({
              items:
                checkoutItems,

              customer: {
                name:
                  customerDetails.name
                    .trim(),

                email:
                  normalizedEmail,

                phone:
                  customerDetails.phone
                    .trim() || null,

                marketingEmailConsent:
                  customerDetails
                    .marketingEmailConsent
              }
            })
          }
        );

      const data =
        await response.json();

      if (!response.ok) {
        throw new Error(
          data.message ||
            "Unable to start checkout."
        );
      }

      if (
        !data.url ||
        !data.sessionId ||
        !data.reservationId
      ) {
        throw new Error(
          "Checkout session information is incomplete."
        );
      }

      sessionStorage.setItem(
        "activeStripeCheckout",
        JSON.stringify({
          sessionId:
            data.sessionId,

          reservationId:
            data.reservationId
        })
      );

      window.location.assign(
        data.url
      );
    } catch (err) {
      console.error(
        "Unable to start checkout:",
        err
      );

      setError(
        err instanceof Error
          ? err.message
          : "Unable to start checkout."
      );

      setLoading(false);
    }
  }

  async function handleCreatePayPalOrder() {
    if (
      paypalLoading ||
      loading ||
      !pricingReady ||
      items.length === 0
    ) {
      throw new Error(
        "Checkout pricing is not ready."
      );
    }

    if (!customerDetailsValid) {
      const validationError =
        new Error(
          "Please enter your full name and a valid email address."
        );

      setError(
        validationError.message
      );

      throw validationError;
    }

    setPayPalLoading(true);
    setError("");

    trackEvent(
      "begin_checkout",
      {
        currency: "USD",

        value:
          estimate.total,

        shipping:
          estimate.shipping,

        tax:
          estimate.tax,

        payment_type:
          "paypal",

        items:
          items.map(
            (item) => {
              const pricedItem =
                pricedItemsById.get(
                  item.id
                );

              return productToGaItem(
                {
                  ...item,

                  unitPrice:
                    pricedItem
                      ? pricedItem
                          .unitPriceCents /
                        100
                      : item.unitPrice
                },
                item.quantity
              );
            }
          )
      }
    );

    try {
      const response =
        await fetch(
          "/api/paypal/create-order",
          {
            method: "POST",

            headers: {
              "Content-Type":
                "application/json"
            },

            body:
              JSON.stringify({
                items:
                  checkoutItems,

                customer: {
                  name:
                    customerDetails.name
                      .trim(),

                  email:
                    normalizedEmail,

                  phone:
                    customerDetails.phone
                      .trim() || null,

                  marketingEmailConsent:
                    customerDetails
                      .marketingEmailConsent
                }
              })
          }
        );

      const data =
        await response.json();

      if (!response.ok) {
        throw new Error(
          data.error ||
            data.message ||
            "Unable to create PayPal order."
        );
      }

      if (!data.orderId) {
        throw new Error(
          "PayPal order information is incomplete."
        );
      }

      sessionStorage.setItem(
        "activePayPalCheckout",
        JSON.stringify({
          paypalOrderId:
            data.orderId,

          internalOrderId:
            data.internalOrderId,

          reservationId:
            data.reservationId
        })
      );

      return data.orderId;
    } catch (err) {
      console.error(
        "Unable to create PayPal order:",
        err
      );

      const message =
        err instanceof Error
          ? err.message
          : "Unable to create PayPal order.";

      setError(message);

      throw err;
    } finally {
      setPayPalLoading(false);
    }
  }

  async function handleApprovePayPalOrder(
    data
  ) {
    const paypalOrderId =
      String(
        data?.orderID ||
          ""
      ).trim();

    if (!paypalOrderId) {
      throw new Error(
        "PayPal did not return an order ID."
      );
    }

    setPayPalLoading(true);
    setError("");

    try {
      const response =
        await fetch(
          "/api/paypal/capture-order",
          {
            method: "POST",

            headers: {
              "Content-Type":
                "application/json"
            },

            body:
              JSON.stringify({
                paypalOrderId
              })
          }
        );

      const result =
        await response.json();

      if (!response.ok) {
        throw new Error(
          result.error ||
            result.message ||
            "Unable to capture PayPal payment."
        );
      }

      if (!result.orderId) {
        throw new Error(
          "The completed PayPal order ID is missing."
        );
      }

      sessionStorage.removeItem(
        "activePayPalCheckout"
      );

      trackEvent(
        "purchase",
        {
          transaction_id:
            result.orderId,

          currency: "USD",

          value:
            estimate.total,

          shipping:
            estimate.shipping,

          tax:
            estimate.tax,

          payment_type:
            "paypal",

          items:
            items.map(
              (item) => {
                const pricedItem =
                  pricedItemsById.get(
                    item.id
                  );

                return productToGaItem(
                  {
                    ...item,

                    unitPrice:
                      pricedItem
                        ? pricedItem
                            .unitPriceCents /
                          100
                        : item.unitPrice
                  },
                  item.quantity
                );
              }
            )
        }
      );

      window.location.assign(
        `/checkout/success?orderId=${encodeURIComponent(
          result.orderId
        )}&payment=paypal`
      );
    } catch (err) {
      console.error(
        "Unable to capture PayPal order:",
        err
      );

      const message =
        err instanceof Error
          ? err.message
          : "Unable to complete PayPal payment.";

      setError(message);

      throw err;
    } finally {
      setPayPalLoading(false);
    }
  }

  return (
    <main className="bg-brand-radial pt-24 text-black md:pt-28">
      <section className="section-pad py-14 md:py-20">
        <div className="container-brand">
          <SectionHeading
            eyebrow="Checkout"
            title="Secure Checkout"
            text="Review your order and choose your preferred payment method."
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
            <div className="mt-8 grid gap-6 md:mt-10 md:gap-8 lg:grid-cols-[1fr_420px]">
              <div className="rounded-[2rem] bg-white p-5 shadow-soft md:p-6">
                <div className="font-display text-3xl font-bold text-black">
                  Customer Details
                </div>

                <div className="mt-6 grid gap-4 md:gap-5">
                  <input
                    type="text"
                    autoComplete="name"
                    value={customerDetails.name}
                    onChange={(event) =>
                      updateCustomerField(
                        "name",
                        event.target.value
                      )
                    }
                    className="rounded-2xl border border-black/10 px-4 py-4 text-black outline-none focus:border-black"
                    placeholder="Full name"
                    required
                  />

                  <input
                    type="email"
                    autoComplete="email"
                    value={customerDetails.email}
                    onChange={(event) =>
                      updateCustomerField(
                        "email",
                        event.target.value
                      )
                    }
                    className="rounded-2xl border border-black/10 px-4 py-4 text-black outline-none focus:border-black"
                    placeholder="Email address"
                    required
                  />

                  <input
                    type="tel"
                    autoComplete="tel"
                    value={customerDetails.phone}
                    onChange={(event) =>
                      updateCustomerField(
                        "phone",
                        event.target.value
                      )
                    }
                    className="rounded-2xl border border-black/10 px-4 py-4 text-black outline-none focus:border-black"
                    placeholder="Phone number (optional)"
                  />

                  <input
                    type="text"
                    autoComplete="street-address"
                    value={
                      customerDetails.shippingAddress
                    }
                    onChange={(event) =>
                      updateCustomerField(
                        "shippingAddress",
                        event.target.value
                      )
                    }
                    className="rounded-2xl border border-black/10 px-4 py-4 text-black outline-none focus:border-black"
                    placeholder="Shipping address"
                  />

                  <label className="flex cursor-pointer items-start gap-3 rounded-2xl bg-[#faf7f1] p-4">
                    <input
                      type="checkbox"
                      checked={
                        customerDetails
                          .marketingEmailConsent
                      }
                      onChange={(event) =>
                        updateCustomerField(
                          "marketingEmailConsent",
                          event.target.checked
                        )
                      }
                      className="mt-1 h-4 w-4"
                    />

                    <span className="text-sm leading-6 text-black/70">
                      Email me product updates,
                      special offers and news from
                      Shakti Foods.
                    </span>
                  </label>
                </div>

                <div className="mt-8 rounded-[1.5rem] bg-brand-sand p-5">
                  <div className="flex items-center gap-2 font-bold text-black">
                    <Lock size={18} />
                    Payment Module
                  </div>

                  <p className="mt-2 text-sm leading-6 text-black">
                    Orders over{" "}
                    {formatPrice(
                      commerce.freeShippingThreshold
                    )}{" "}
                    receive free standard shipping.
                    Payment totals are calculated securely
                    on the server.
                  </p>

                  {error ? (
                    <div
                      role="alert"
                      className="mt-4 rounded-2xl bg-red-50 px-4 py-3 text-sm text-black"
                    >
                      {error}
                    </div>
                  ) : null}

                  {pricingLoading ? (
                    <div className="mt-4 rounded-2xl bg-white/60 px-4 py-3 text-sm text-black">
                      Updating checkout pricing...
                    </div>
                  ) : null}

                  <button
                    type="button"
                    onClick={
                      handleStripeCheckout
                    }
                    disabled={
                      loading ||
                      paypalLoading ||
                      !pricingReady ||
                      items.length ===
                        0
                    }
                    className="mt-5 w-full rounded-full bg-black px-6 py-4 font-bold text-white transition hover:bg-[#333333] disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {loading
                      ? "Starting Checkout..."
                      : pricingReady
                        ? `Pay with Card ${formatPrice(
                            estimate.total
                          )}`
                        : "Calculating Price..."}
                  </button>

                  <div className="my-5 flex items-center gap-3">
                    <div className="h-px flex-1 bg-black/10" />

                    <span className="text-xs font-bold uppercase tracking-[0.16em] text-black/50">
                      Or pay with
                    </span>

                    <div className="h-px flex-1 bg-black/10" />
                  </div>

                  <PayPalScriptProvider
                    options={{
                      clientId:
                        process.env
                          .NEXT_PUBLIC_PAYPAL_CLIENT_ID ||
                        "",

                      currency:
                        "USD",

                      intent:
                        "capture",

                      components:
                        "buttons",

                      disableFunding:
                        "paylater,card"
                    }}
                  >
                    <PayPalButtons
                      style={{
                        layout:
                          "horizontal",

                        shape:
                          "pill",

                        label:
                          "paypal",

                        height:
                          48,

                        tagline:
                          false
                      }}

                      disabled={
                        loading ||
                        paypalLoading ||
                        !pricingReady ||
                        items.length ===
                          0
                      }

                      forceReRender={[
                        subtotal,
                        estimate.shipping,
                        estimate.tax,
                        estimate.total
                      ]}

                      createOrder={
                        handleCreatePayPalOrder
                      }

                      onApprove={
                        handleApprovePayPalOrder
                      }

                      onCancel={async () => {
                        setPayPalLoading(
                          true
                        );

                        setError("");

                        try {
                          const rawCheckout =
                            sessionStorage.getItem(
                              "activePayPalCheckout"
                            );

                          const checkout =
                            rawCheckout
                              ? JSON.parse(
                                  rawCheckout
                                )
                              : null;

                          const reservationId =
                            String(
                              checkout
                                ?.reservationId ||
                                ""
                            ).trim();

                          const paypalOrderId =
                            String(
                              checkout
                                ?.paypalOrderId ||
                                ""
                            ).trim();

                          if (
                            reservationId
                          ) {
                            const response =
                              await fetch(
                                "/api/paypal/cancel-order",
                                {
                                  method:
                                    "POST",

                                  headers: {
                                    "Content-Type":
                                      "application/json"
                                  },

                                  body:
                                    JSON.stringify(
                                      {
                                        reservationId,
                                        paypalOrderId
                                      }
                                    )
                                }
                              );

                            const result =
                              await response.json();

                            if (
                              !response.ok
                            ) {
                              throw new Error(
                                result.error ||
                                  "Unable to release inventory reservation."
                              );
                            }
                          }

                          sessionStorage.removeItem(
                            "activePayPalCheckout"
                          );

                          setError(
                            "PayPal checkout was cancelled. Your inventory reservation has been released."
                          );
                        } catch (err) {
                          console.error(
                            "Unable to cancel PayPal checkout:",
                            err
                          );

                          setError(
                            err instanceof
                              Error
                              ? err.message
                              : "PayPal checkout was cancelled, but inventory could not be released."
                          );
                        } finally {
                          setPayPalLoading(
                            false
                          );
                        }
                      }}

                      onError={(
                        paypalError
                      ) => {
                        console.error(
                          "PayPal checkout error:",
                          paypalError
                        );

                        setPayPalLoading(
                          false
                        );

                        setError(
                          "PayPal checkout could not be completed. Please try again."
                        );
                      }}
                    />
                  </PayPalScriptProvider>
                </div>
              </div>

              <aside className="h-fit rounded-[2rem] bg-white p-5 shadow-soft md:p-6">
                <div className="font-display text-3xl font-bold text-black">
                  Order Summary
                </div>

                <div className="mt-6 grid gap-4">
                  {items.map(
                    (item) => {
                      const pricedItem =
                        pricedItemsById.get(
                          item.id
                        );

                      const unitPrice =
                        pricedItem
                          ? pricedItem
                              .unitPriceCents /
                            100
                          : null;

                      const regularPrice =
                        pricedItem
                          ? pricedItem
                              .regularUnitPriceCents /
                            100
                          : null;

                      const lineTotal =
                        pricedItem
                          ? pricedItem
                              .lineTotalCents /
                            100
                          : null;

                      const hasDiscount =
                        pricedItem
                          ?.hasQuantityDiscount ===
                        true;

                      return (
                        <div
                          key={item.id}
                          className="grid grid-cols-[64px_1fr_auto] items-center gap-3 md:grid-cols-[70px_1fr_auto]"
                        >
                          <div className="relative h-16 overflow-hidden rounded-2xl bg-[#faf6ee]">
                            <Image
                              src={
                                item.image
                              }
                              alt={
                                item.name
                              }
                              fill
                              className="object-contain p-2"
                              sizes="70px"
                            />
                          </div>

                          <div>
                            <div className="text-sm font-bold text-black">
                              {
                                item.name
                              }
                            </div>

                            <div className="text-xs text-black">
                              Qty{" "}
                              {
                                item.quantity
                              }
                            </div>

                            {pricedItem ? (
                              <div className="mt-1 text-xs text-black/60">
                                {formatPrice(
                                  unitPrice
                                )}{" "}
                                each
                              </div>
                            ) : null}

                            {hasDiscount ? (
                              <div className="mt-1 text-xs font-bold text-green-700">
                                {
                                  pricedItem
                                    .tier
                                    ?.name
                                }

                                {" · "}

                                Regular{" "}

                                <span className="line-through">
                                  {formatPrice(
                                    regularPrice
                                  )}
                                </span>
                              </div>
                            ) : null}
                          </div>

                          <div className="text-sm font-bold text-black">
                            {pricedItem
                              ? formatPrice(
                                  lineTotal
                                )
                              : "—"}
                          </div>
                        </div>
                      );
                    }
                  )}
                </div>

                <div className="mt-6 grid gap-3 border-t border-black/10 pt-5 text-black">
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
                      Estimated Shipping
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
                      Estimated Tax
                    </span>

                    <span>
                      {pricingReady
                        ? formatPrice(
                            estimate.tax
                          )
                        : "—"}
                    </span>
                  </div>

                  <div className="flex justify-between border-t border-black/10 pt-3 text-lg font-bold">
                    <span>
                      Estimated Total
                    </span>

                    <span>
                      {pricingReady
                        ? formatPrice(
                            estimate.total
                          )
                        : "—"}
                    </span>
                  </div>
                </div>
              </aside>
            </div>
          )}
        </div>
      </section>
    </main>
  );
}