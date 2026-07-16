"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useCart } from "@/components/CartProvider";

export default function CheckoutSuccessClient() {
  const searchParams = useSearchParams();
  const { clearCart } = useCart();

  const processed = useRef(false);

  const [status, setStatus] = useState("Finalizing your order...");
  const [isComplete, setIsComplete] = useState(false);

  useEffect(() => {
    if (processed.current) return;

    processed.current = true;

    const sessionId = searchParams.get("session_id");

    function removeCart() {
      clearCart();

      try {
        window.localStorage.removeItem("shakti-cart");
      } catch (error) {
        console.error("Unable to clear saved cart:", error);
      }
    }

    async function finalizeOrder() {
      if (!sessionId) {
        setStatus(
          "Your payment was completed, but the Checkout Session ID is missing."
        );

        return;
      }

      try {
        const response = await fetch("/api/checkout/fulfill", {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            sessionId
          })
        });

        const result = await response.json();

        if (!response.ok || !result.success) {
          throw new Error(
            result.message || "Unable to finalize your order."
          );
        }

        /*
         * Clear the cart after the paid order has been verified
         * and fulfilled successfully.
         */
        removeCart();

        /*
         * Clear it again after CartProvider hydration to prevent
         * an older localStorage cart from being restored.
         */
        window.setTimeout(removeCart, 500);

        setStatus(
          "Your checkout was completed successfully. We will contact you if we need any delivery or pickup details."
        );

        setIsComplete(true);
      } catch (error) {
        console.error("Order finalization error:", error);

        setStatus(
          "Your payment succeeded, but your order is still being finalized. Please do not submit another payment."
        );
      }
    }

    finalizeOrder();
  }, [searchParams, clearCart]);

  return (
    <main className="min-h-[100svh] bg-brand-radial pt-24 text-black md:pt-28">
      <section className="section-pad py-14 md:py-24">
        <div className="container-brand">
          <div className="max-w-3xl rounded-[2rem] bg-white p-6 shadow-lift md:p-10">
            <div className="text-sm font-bold uppercase tracking-[.22em] text-black">
              {isComplete ? "Order Complete" : "Processing Order"}
            </div>

            <h1 className="mt-3 font-display text-4xl font-bold text-black md:text-6xl">
              {isComplete
                ? "Thank you for your order."
                : "Please wait a moment."}
            </h1>

            <p className="mt-5 text-lg leading-8 text-black">
              {status}
            </p>

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
                  className="rounded-full bg-brand.sand px-7 py-4 text-center font-bold text-black"
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