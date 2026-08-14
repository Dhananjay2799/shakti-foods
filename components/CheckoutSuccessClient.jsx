"use client";

import Link from "next/link";
import {
  useEffect,
  useRef,
  useState
} from "react";
import {
  useSearchParams
} from "next/navigation";

import {
  useCart
} from "@/components/CartProvider";

export default function CheckoutSuccessClient() {
  const searchParams =
    useSearchParams();

  const {
    clearCart
  } = useCart();

  const processed =
    useRef(false);

  const [
    status,
    setStatus
  ] = useState(
    "Finalizing your order..."
  );

  const [
    isComplete,
    setIsComplete
  ] = useState(false);

  const [
    orderId,
    setOrderId
  ] = useState("");

  const [
    paymentProvider,
    setPaymentProvider
  ] = useState("");

  useEffect(() => {
    if (processed.current) {
      return;
    }

    processed.current = true;

    const stripeSessionId =
      String(
        searchParams.get(
          "session_id"
        ) || ""
      ).trim();

    const paypalOrderId =
      String(
        searchParams.get(
          "orderId"
        ) || ""
      ).trim();

    const payment =
      String(
        searchParams.get(
          "payment"
        ) || ""
      )
        .trim()
        .toLowerCase();

    function removeCart() {
      clearCart();

      try {
        window.localStorage
          .removeItem(
            "shakti-cart"
          );
      } catch (error) {
        console.error(
          "Unable to clear saved cart:",
          error
        );
      }
    }

    function completeCheckout({
      completedOrderId,
      provider,
      message
    }) {
      setOrderId(
        completedOrderId || ""
      );

      setPaymentProvider(
        provider || ""
      );

      removeCart();

      window.setTimeout(
        removeCart,
        500
      );

      setStatus(message);

      setIsComplete(true);
    }

    async function finalizeStripeOrder() {
      try {
        const response =
          await fetch(
            "/api/checkout/fulfill",
            {
              method: "POST",
              headers: {
                "Content-Type":
                  "application/json"
              },

              body:
                JSON.stringify({
                  sessionId:
                    stripeSessionId
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
              result.error ||
              "Unable to finalize your Stripe order."
          );
        }

        /*
         * Stripe checkout is finished.
         * Prevent abandonment logic from
         * releasing completed inventory.
         */
        try {
          sessionStorage
            .removeItem(
              "activeStripeCheckout"
            );
        } catch (error) {
          console.error(
            "Unable to remove active Stripe checkout:",
            error
          );
        }

        completeCheckout({
          completedOrderId:
            result.orderId ||
            "",

          provider:
            "stripe",

          message:
            "Your payment was completed successfully and your order has been confirmed."
        });
      } catch (error) {
        console.error(
          "Stripe order finalization error:",
          error
        );

        setStatus(
          "Your Stripe payment succeeded, but your order is still being finalized. Please do not submit another payment."
        );
      }
    }

    function finalizePayPalOrder() {
      /*
       * PayPal has already been captured
       * and fulfilled before redirecting
       * to this page.
       *
       * Do NOT call the capture endpoint
       * again from the success page.
       */

      try {
        sessionStorage
          .removeItem(
            "activePayPalCheckout"
          );
      } catch (error) {
        console.error(
          "Unable to remove active PayPal checkout:",
          error
        );
      }

      completeCheckout({
        completedOrderId:
          paypalOrderId,

        provider:
          "paypal",

        message:
          "Your PayPal payment was completed successfully and your order has been confirmed."
      });
    }

    /*
     * PayPal success flow.
     */
    if (
      payment === "paypal" &&
      paypalOrderId
    ) {
      finalizePayPalOrder();
      return;
    }

    /*
     * Stripe success flow.
     */
    if (stripeSessionId) {
      finalizeStripeOrder();
      return;
    }

    /*
     * Unknown success URL.
     */
    setStatus(
      "Your payment may have completed, but the checkout information is missing. Please do not submit another payment."
    );
  }, [
    searchParams,
    clearCart
  ]);

  function formatDisplayOrderNumber(
    value
  ) {
    if (!value) {
      return "";
    }

    return String(value)
      .replaceAll("-", "")
      .slice(0, 8)
      .toUpperCase();
  }

  const displayOrderNumber =
    formatDisplayOrderNumber(
      orderId
    );

  return (
    <main className="min-h-[100svh] bg-brand-radial pt-24 text-black md:pt-28">
      <section className="section-pad py-14 md:py-24">
        <div className="container-brand">
          <div className="max-w-3xl rounded-[2rem] bg-white p-6 shadow-lift md:p-10">
            <div className="text-sm font-bold uppercase tracking-[.22em] text-black">
              {isComplete
                ? "Order Complete"
                : "Processing Order"}
            </div>

            <h1 className="mt-3 font-display text-4xl font-bold text-black md:text-6xl">
              {isComplete
                ? "Thank you for your order."
                : "Please wait a moment."}
            </h1>

            <p className="mt-5 text-lg leading-8 text-black">
              {status}
            </p>

            {isComplete &&
            displayOrderNumber ? (
              <div className="mt-8 rounded-[1.5rem] bg-brand-sand p-5">
                <div className="text-xs font-bold uppercase tracking-[.18em] text-black/60">
                  Order Number
                </div>

                <div className="mt-2 font-display text-3xl font-bold text-black">
                  #
                  {displayOrderNumber}
                </div>

                {paymentProvider ? (
                  <div className="mt-2 text-sm font-medium capitalize text-black/70">
                    Payment method:{" "}
                    {paymentProvider}
                  </div>
                ) : null}
              </div>
            ) : null}

            {isComplete ? (
              <div className="mt-8 grid gap-3 sm:flex">
                <Link
                  href="/products"
                  className="rounded-full bg-black px-7 py-4 text-center font-bold text-white"
                >
                  Continue Shopping
                </Link>

                <Link
                  href="/"
                  className="rounded-full bg-brand-sand px-7 py-4 text-center font-bold text-black"
                >
                  Go Home
                </Link>
              </div>
            ) : null}
          </div>
        </div>
      </section>
    </main>
  );
}