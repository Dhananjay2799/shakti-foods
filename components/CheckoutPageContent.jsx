"use client";

import Image from "next/image";
import Link from "next/link";
import {
  useEffect,
  useMemo,
  useState
} from "react";
import { ChevronDown } from "lucide-react";

import {
  PayPalButtons,
  PayPalScriptProvider
} from "@paypal/react-paypal-js";
import { isPayPalCheckoutVisible } from "@/lib/paypal-availability";

import { useCart } from "@/components/CartProvider";

import { formatPrice } from "@/lib/data";

import {
  getCheckoutEstimate,
  shippingRateLines
} from "@/lib/commerce";

import {
  DELIVERY_PICKUP,
  DELIVERY_SHIPPING,
  PICKUP_LOCATION
} from "@/lib/delivery";

import {
  productToGaItem,
  trackEvent
} from "@/lib/analytics";

export default function CheckoutPageContent({
  // The store whose checkout page this is (the cart may be empty).
  pageStorefront = "shakti_foods"
} = {}) {
  const {
    items
  } = useCart();

  const storefront =
    items[0]?.storefront ||
    "shakti_foods";

  const isEcoware =
    storefront === "ecoware";

  // PayPal is hidden on the live site until live PayPal is switched on
  // (see lib/paypal-availability.js). Card checkout is unaffected.
  // PayPal Live launches for Shakti Foods only; preserve Ecoware checkout.
  const showPayPal =
    !isEcoware && isPayPalCheckoutVisible();

  const productsHref =
    isEcoware
      ? "/ecoware/products"
      : "/products";

  // Pay an invoice or agreed price without products in the cart.
  const customAmountHref =
    isEcoware ||
    pageStorefront === "ecoware"
      ? "/ecoware/checkout/custom-amount"
      : "/checkout/custom-amount";

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

    let cancelled = false;

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
                  storefront,

                  items:
                    checkoutItems
                })
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

        if (!cancelled) {
          setPricing(result);
        }
      } catch (err) {
        if (cancelled) {
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
        if (!cancelled) {
          setPricingLoading(false);
        }
      }
    }

    loadPricing();

    return () => {
      cancelled = true;
    };
  }, [items, checkoutItems, storefront]);

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
  // Shipping or free local pickup, chosen below before paying.
  const [
    deliveryMethod,
    setDeliveryMethod
  ] = useState(DELIVERY_SHIPPING);

  const isPickup =
    deliveryMethod ===
    DELIVERY_PICKUP;

  const shippingOptionPrice =
    getCheckoutEstimate(
      subtotal
    ).shipping;

  const estimate =
    getCheckoutEstimate(
      subtotal,
      { pickup: isPickup }
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

            body:
              JSON.stringify({
                storefront,

                items:
                  checkoutItems,

                deliveryMethod,

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
    console.log(
      "[PayPal] handleCreatePayPalOrder entered",
      {
        storefront,
        checkoutItems,
        customerDetails
      }
    );

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
      console.log(
        "[PayPal] calling /api/paypal/create-order",
        {
          storefront,
          items: checkoutItems
        }
      );

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
                storefront,

                items:
                  checkoutItems,

                deliveryMethod,

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

      console.log(
        "[PayPal] /api/paypal/create-order HTTP status:",
        response.status
      );

      const data =
        await response.json();

      console.log(
        "[PayPal] create-order response:",
        data
      );

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

      // Ecoware orders confirm on the Ecoware-branded success page.
      window.location.assign(
        `${
          isEcoware ? "/ecoware" : ""
        }/checkout/success?orderId=${encodeURIComponent(
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


  async function handleCancelPayPalOrder() {
    setPayPalLoading(true);
    setError("");

    try {
      const rawCheckout =
        sessionStorage.getItem(
          "activePayPalCheckout"
        );

      const checkout = rawCheckout
        ? JSON.parse(rawCheckout)
        : null;

      const reservationId = String(
        checkout?.reservationId || ""
      ).trim();

      const paypalOrderId = String(
        checkout?.paypalOrderId || ""
      ).trim();

      if (reservationId) {
        const response = await fetch(
          "/api/paypal/cancel-order",
          {
            method: "POST",
            headers: {
              "Content-Type":
                "application/json"
            },
            body: JSON.stringify({
              reservationId,
              paypalOrderId
            })
          }
        );

        const result =
          await response.json();

        if (!response.ok) {
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
        err instanceof Error
          ? err.message
          : "PayPal checkout was cancelled, but inventory could not be released."
      );
    } finally {
      setPayPalLoading(false);
    }
  }

  // Phone: the order summary starts folded into one line.
  const [summaryOpen, setSummaryOpen] =
    useState(false);

  const [ratesOpen, setRatesOpen] =
    useState(false);

  const theme = isEcoware
    ? {
        button:
          "bg-[#27802f] hover:bg-[#1f6a26]",
        selected:
          "border-[#27802f] bg-[#f1f8f1]",
        radio: "accent-[#27802f]",
        stickyTop: "lg:top-40"
      }
    : {
        button:
          "bg-[#d71920] hover:bg-[#b8141a]",
        selected:
          "border-[#d71920] bg-[#fff5f5]",
        radio: "accent-[#d71920]",
        stickyTop: "lg:top-28"
      };

  const policyPrefix =
    isEcoware ? "/ecoware" : "";

  const busy =
    loading || paypalLoading;

  const payDisabled =
    busy ||
    !pricingReady ||
    items.length === 0;

  const totalText = pricingReady
    ? formatPrice(estimate.total)
    : "—";

  const shippingText = !pricingReady
    ? "—"
    : estimate.shipping === 0
      ? "Free"
      : formatPrice(estimate.shipping);

  const deliveryOptions = [
    {
      value: DELIVERY_SHIPPING,
      title: "Ship to my address",
      price: !pricingReady
        ? "—"
        : shippingOptionPrice === 0
          ? "Free"
          : formatPrice(shippingOptionPrice),
      detail: "Ships within 3 business days"
    },
    {
      value: DELIVERY_PICKUP,
      title: "Local pickup",
      price: "Free",
      detail: PICKUP_LOCATION
    }
  ];

  return (
    <main
      className={`text-black ${
        isEcoware
          ? "bg-brand-radial pt-36 sm:pt-40 lg:pt-44"
          : "bg-white pt-24 md:pt-28"
      }`}
    >
      <section className="section-pad py-8 md:py-10">
        <div className="container-brand">
          <h1 className="font-display text-[2rem] font-bold leading-tight text-black sm:text-4xl md:text-5xl">
            Secure Checkout
          </h1>

          {items.length === 0 ? (
            <div className="mt-6 rounded-[1.5rem] border border-black/10 bg-white p-5 md:p-8">
              <p className="text-lg text-black">
                Your cart is empty.
              </p>

              <div className="mt-6 flex flex-wrap gap-3">
                <Link
                  href={productsHref}
                  className="inline-flex rounded-full bg-black px-6 py-3 font-bold text-white"
                >
                  Shop Products
                </Link>

                <Link
                  href={customAmountHref}
                  className="inline-flex rounded-full border border-black/15 px-6 py-3 font-bold text-black transition hover:border-black"
                >
                  Pay a Custom Amount
                </Link>
              </div>

              <p className="mt-4 text-sm leading-6 text-black/60">
                Paying an invoice or a price we agreed on? Use Pay a Custom Amount. No cart needed.
              </p>
            </div>
          ) : (
            /*
             * Desktop: details and delivery on the left; one sticky card on
             * the right with the summary and the payment buttons.
             * Phone: the two wrappers become "display: contents", so their
             * parts stack as summary (folded) → details → delivery → pay.
             */
            <div className="mt-5 flex flex-col gap-6 md:mt-8 lg:grid lg:grid-cols-[minmax(0,1fr)_420px] lg:items-start lg:gap-8">
              <div className="contents lg:flex lg:min-w-0 lg:flex-col lg:gap-8">
                <section
                  aria-labelledby="checkout-customer"
                  className="order-2 min-w-0 lg:order-none lg:rounded-[1.5rem] lg:border lg:border-black/10 lg:bg-white lg:p-6"
                >
                  <h2
                    id="checkout-customer"
                    className="font-display text-2xl font-bold text-black md:text-3xl"
                  >
                    Customer Details
                  </h2>

                  <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-x-5">
                    <CheckoutField
                      id="checkout-name"
                      label="Full name"
                      type="text"
                      autoComplete="name"
                      value={customerDetails.name}
                      onChange={(value) =>
                        updateCustomerField("name", value)
                      }
                      required
                    />

                    <CheckoutField
                      id="checkout-email"
                      label="Email address"
                      type="email"
                      autoComplete="email"
                      value={customerDetails.email}
                      onChange={(value) =>
                        updateCustomerField("email", value)
                      }
                      required
                    />

                    <CheckoutField
                      id="checkout-phone"
                      label="Phone (optional)"
                      placeholder="Phone number"
                      type="tel"
                      autoComplete="tel"
                      value={customerDetails.phone}
                      onChange={(value) =>
                        updateCustomerField("phone", value)
                      }
                    />

                    {!isPickup ? (
                      <CheckoutField
                        id="checkout-address"
                        label="Shipping address"
                        type="text"
                        autoComplete="street-address"
                        value={customerDetails.shippingAddress}
                        onChange={(value) =>
                          updateCustomerField(
                            "shippingAddress",
                            value
                          )
                        }
                      />
                    ) : null}
                  </div>

                  <label className="mt-4 flex cursor-pointer items-center gap-3 text-sm text-black/80 md:text-base">
                    <input
                      type="checkbox"
                      checked={
                        customerDetails.marketingEmailConsent
                      }
                      onChange={(event) =>
                        updateCustomerField(
                          "marketingEmailConsent",
                          event.target.checked
                        )
                      }
                      className={`h-5 w-5 shrink-0 rounded ${theme.radio}`}
                    />
                    Email me offers and updates
                  </label>
                </section>

                <fieldset className="order-3 min-w-0 lg:order-none">
                  <legend className="font-display text-2xl font-bold text-black md:text-3xl">
                    Delivery
                  </legend>

                  <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
                    {deliveryOptions.map((option) => {
                      const selected =
                        deliveryMethod === option.value;

                      return (
                        <label
                          key={option.value}
                          className={`flex min-w-0 cursor-pointer items-start gap-3 rounded-2xl border-2 px-4 py-3.5 transition ${
                            selected
                              ? theme.selected
                              : "border-black/10 bg-white hover:border-black/25"
                          }`}
                        >
                          <input
                            type="radio"
                            name="delivery-method"
                            value={option.value}
                            checked={selected}
                            disabled={busy}
                            onChange={() =>
                              setDeliveryMethod(option.value)
                            }
                            className={`mt-1 h-4 w-4 shrink-0 ${theme.radio}`}
                          />

                          <span className="min-w-0 flex-1">
                            <span className="flex items-baseline justify-between gap-3">
                              <span className="font-bold text-black">
                                {option.title}
                              </span>
                              <span className="shrink-0 font-bold text-black">
                                {option.price}
                              </span>
                            </span>
                            <span className="mt-0.5 block text-sm text-black/60">
                              {option.detail}
                            </span>
                          </span>
                        </label>
                      );
                    })}
                  </div>

                  <button
                    type="button"
                    onClick={() =>
                      setRatesOpen((open) => !open)
                    }
                    aria-expanded={ratesOpen}
                    aria-controls="checkout-shipping-rates"
                    className="mt-3 inline-flex items-center gap-1.5 text-sm font-semibold text-black underline underline-offset-4"
                  >
                    <ChevronDown
                      size={16}
                      aria-hidden="true"
                      className={`transition ${
                        ratesOpen ? "rotate-180" : ""
                      }`}
                    />
                    Shipping rates
                  </button>

                  {ratesOpen ? (
                    <ul
                      id="checkout-shipping-rates"
                      className="mt-2 grid gap-1 pl-6 text-sm text-black/70"
                    >
                      {shippingRateLines().map((line) => (
                        <li key={line}>{line}</li>
                      ))}
                      <li>Local pickup ({PICKUP_LOCATION}): free</li>
                    </ul>
                  ) : null}
                </fieldset>
              </div>

              <div
                className={`contents lg:sticky lg:block lg:rounded-[1.5rem] lg:border lg:border-black/10 lg:bg-white lg:p-6 ${theme.stickyTop}`}
              >
                <section
                  aria-label="Order summary"
                  className="order-1 min-w-0 lg:order-none"
                >
                  <button
                    type="button"
                    onClick={() =>
                      setSummaryOpen((open) => !open)
                    }
                    aria-expanded={summaryOpen}
                    aria-controls="checkout-summary-details"
                    className="flex w-full items-center justify-between gap-3 rounded-xl border border-black/10 bg-[#faf7f1] px-4 py-3 text-left lg:hidden"
                  >
                    <span className="font-bold text-black">
                      Order Summary
                    </span>
                    <span className="flex items-center gap-2 font-bold text-black">
                      {totalText}
                      <ChevronDown
                        size={18}
                        aria-hidden="true"
                        className={`transition ${
                          summaryOpen ? "rotate-180" : ""
                        }`}
                      />
                    </span>
                  </button>

                  <h2 className="hidden font-display text-3xl font-bold text-black lg:block">
                    Order Summary
                  </h2>

                  <div
                    id="checkout-summary-details"
                    className={`${
                      summaryOpen ? "block" : "hidden"
                    } mt-2 rounded-xl border border-black/10 p-4 lg:mt-5 lg:block lg:rounded-none lg:border-0 lg:p-0`}
                  >
                    <div className="grid gap-4">
                      {items.map((item) => {
                        const pricedItem =
                          pricedItemsById.get(item.id);

                        const lineTotal = pricedItem
                          ? pricedItem.lineTotalCents / 100
                          : null;

                        const regularPrice = pricedItem
                          ? pricedItem.regularUnitPriceCents / 100
                          : null;

                        const hasDiscount =
                          pricedItem?.hasQuantityDiscount === true;

                        return (
                          <div
                            key={item.id}
                            className="grid grid-cols-[64px_minmax(0,1fr)_auto] items-center gap-3"
                          >
                            <div className="relative h-16 overflow-hidden rounded-xl bg-[#faf6ee]">
                              <Image
                                src={item.image}
                                alt={item.name}
                                fill
                                className="object-contain p-1.5"
                                sizes="64px"
                              />
                            </div>

                            <div className="min-w-0">
                              <div className="font-bold leading-snug text-black">
                                {item.name}
                              </div>

                              <div className="mt-0.5 text-sm text-black/70">
                                Qty {item.quantity}
                              </div>

                              {hasDiscount ? (
                                <div className="mt-0.5 text-xs font-bold text-green-700">
                                  {pricedItem.tier?.name}
                                  {" · "}
                                  Regular{" "}
                                  <span className="line-through">
                                    {formatPrice(regularPrice)}
                                  </span>
                                </div>
                              ) : null}
                            </div>

                            <div className="font-bold text-black">
                              {pricedItem
                                ? formatPrice(lineTotal)
                                : "—"}
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    <dl className="mt-5 grid gap-2.5 border-t border-black/10 pt-4 text-black">
                      <div className="flex justify-between gap-4">
                        <dt>Subtotal</dt>
                        <dd>
                          {pricingReady
                            ? formatPrice(subtotal)
                            : "Calculating..."}
                        </dd>
                      </div>

                      {savings > 0 ? (
                        <div className="flex justify-between gap-4 font-bold text-green-700">
                          <dt>Quantity Savings</dt>
                          <dd>-{formatPrice(savings)}</dd>
                        </div>
                      ) : null}

                      <div className="flex justify-between gap-4">
                        <dt>
                          {isPickup
                            ? "Local pickup"
                            : "Shipping"}
                        </dt>
                        <dd>{shippingText}</dd>
                      </div>

                      <div className="mt-1 flex items-baseline justify-between gap-4 border-t border-black/10 pt-3">
                        <dt className="text-xl font-bold md:text-2xl">
                          Total
                        </dt>
                        <dd className="text-xl font-bold md:text-2xl">
                          {totalText}
                        </dd>
                      </div>
                    </dl>
                  </div>
                </section>

                <section
                  aria-label="Payment"
                  className="order-4 min-w-0 lg:order-none lg:mt-5"
                >
                  {error ? (
                    <div
                      role="alert"
                      className="mb-3 rounded-xl bg-red-50 px-4 py-3 text-sm text-black"
                    >
                      {error}
                    </div>
                  ) : null}

                  {pricingLoading ? (
                    <div className="mb-3 rounded-xl bg-[#faf7f1] px-4 py-3 text-sm text-black">
                      Updating checkout pricing...
                    </div>
                  ) : null}

                  <button
                    type="button"
                    onClick={handleStripeCheckout}
                    disabled={payDisabled}
                    className={`w-full rounded-xl px-6 py-3.5 text-lg font-bold text-white transition disabled:cursor-not-allowed disabled:opacity-60 ${theme.button}`}
                  >
                    {loading
                      ? "Starting checkout..."
                      : pricingReady
                        ? `Pay ${totalText} by card`
                        : "Calculating price..."}
                  </button>

                  <div className="mt-3">
                    {showPayPal ? (
                      <PayPalScriptProvider
                        options={{
                          clientId:
                            process.env
                              .NEXT_PUBLIC_PAYPAL_CLIENT_ID ||
                            "",
                          currency: "USD",
                          intent: "capture",
                          components: "buttons",
                          disableFunding: "paylater,card"
                        }}
                      >
                        <PayPalButtons
                          style={{
                            layout: "horizontal",
                            shape: "rect",
                            color: "gold",
                            label: "paypal",
                            height: 48,
                            tagline: false
                          }}
                          disabled={payDisabled}
                          forceReRender={[
                            subtotal,
                            deliveryMethod,
                            estimate.shipping,
                            estimate.tax,
                            estimate.total
                          ]}
                          createOrder={() =>
                            handleCreatePayPalOrder()
                          }
                          onApprove={handleApprovePayPalOrder}
                          onCancel={handleCancelPayPalOrder}
                          onError={(paypalError) => {
                            console.error(
                              "[PayPal] BUTTON ERROR:",
                              paypalError
                            );

                            setError(
                              paypalError instanceof Error
                                ? `PayPal error: ${paypalError.message}`
                                : `PayPal error: ${String(paypalError)}`
                            );
                          }}
                        />
                      </PayPalScriptProvider>
                    ) : (
                      <button
                        type="button"
                        disabled
                        aria-label="PayPal payments coming soon"
                        className="w-full cursor-not-allowed rounded-xl bg-[#FFC439] px-6 py-2.5 text-center text-[#003087] opacity-85"
                      >
                        <span className="block text-xl font-extrabold italic">
                          PayPal
                        </span>
                        <span className="block text-xs font-semibold not-italic">
                          Coming soon. Please pay by card.
                        </span>
                      </button>
                    )}
                  </div>

                  <div className="mt-4 text-center">
                    <Link
                      href={customAmountHref}
                      className="font-medium text-black underline underline-offset-4"
                    >
                      Pay a custom amount
                    </Link>
                  </div>

                  <nav
                    aria-label="Store policies"
                    className="mt-5 flex flex-wrap items-center justify-center gap-x-2 gap-y-1 border-t border-black/10 pt-4 text-xs text-black/80 sm:gap-x-3 sm:text-sm"
                  >
                    <Link
                      href={`${policyPrefix}/terms`}
                      className="underline underline-offset-2 hover:text-black"
                    >
                      Terms of Service
                    </Link>
                    <span aria-hidden="true">|</span>
                    <Link
                      href={`${policyPrefix}/privacy`}
                      className="underline underline-offset-2 hover:text-black"
                    >
                      Privacy Policy
                    </Link>
                    <span aria-hidden="true">|</span>
                    <Link
                      href={`${policyPrefix}/returns`}
                      className="underline underline-offset-2 hover:text-black"
                    >
                      Return Policy
                    </Link>
                  </nav>
                </section>
              </div>
            </div>
          )}
        </div>
      </section>
    </main>
  );
}

/** Label above an input, as on the checkout mockup. */
function CheckoutField({
  id,
  label,
  placeholder,
  onChange,
  ...inputProps
}) {
  return (
    <div className="min-w-0">
      <label
        htmlFor={id}
        className="mb-1.5 block text-sm font-bold text-black md:text-base"
      >
        {label}
      </label>
      <input
        id={id}
        placeholder={placeholder || label}
        onChange={(event) => onChange(event.target.value)}
        className="w-full rounded-xl border border-black/15 bg-white px-4 py-3 text-black outline-none transition placeholder:text-black/40 focus:border-black"
        {...inputProps}
      />
    </div>
  );
}
