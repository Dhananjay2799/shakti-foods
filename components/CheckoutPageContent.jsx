"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { Lock } from "lucide-react";

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
    items,
    subtotal
  } = useCart();

  const [loading, setLoading] =
    useState(false);

  const [error, setError] =
    useState("");

  const estimate =
    getCheckoutEstimate(subtotal);

  async function handleStripeCheckout() {
    if (
      loading ||
      items.length === 0
    ) {
      return;
    }

    setLoading(true);
    setError("");

    trackEvent("begin_checkout", {
      currency: "USD",
      value: estimate.total,
      shipping: estimate.shipping,
      tax: estimate.tax,
      items: items.map((item) =>
        productToGaItem(
          item,
          item.quantity
        )
      )
    });

    try {
      const response = await fetch(
        "/api/checkout",
        {
          method: "POST",
          headers: {
            "Content-Type":
              "application/json"
          },
          body: JSON.stringify({
            items
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

  return (
    <main className="bg-brand-radial pt-24 text-black md:pt-28">

      <section className="section-pad py-14 md:py-20">
        <div className="container-brand">
          <SectionHeading
            eyebrow="Checkout"
            title="Retail checkout for small rice packs"
            text="Small pack orders can check out online. Bulk and wholesale items use the inquiry system so shipping and pricing can be quoted accurately."
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
                    className="rounded-2xl border border-black/10 px-4 py-4 text-black outline-none focus:border-black"
                    placeholder="Full name"
                  />

                  <input
                    type="email"
                    autoComplete="email"
                    className="rounded-2xl border border-black/10 px-4 py-4 text-black outline-none focus:border-black"
                    placeholder="Email address"
                  />

                  <input
                    type="tel"
                    autoComplete="tel"
                    className="rounded-2xl border border-black/10 px-4 py-4 text-black outline-none focus:border-black"
                    placeholder="Phone number"
                  />

                  <input
                    type="text"
                    autoComplete="street-address"
                    className="rounded-2xl border border-black/10 px-4 py-4 text-black outline-none focus:border-black"
                    placeholder="Shipping address"
                  />
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
                    Stripe Checkout will collect
                    payment. Tax can be calculated
                    automatically when Stripe Tax is
                    enabled.
                  </p>

                  {error ? (
                    <div
                      role="alert"
                      className="mt-4 rounded-2xl bg-red-50 px-4 py-3 text-sm text-black"
                    >
                      {error}
                    </div>
                  ) : null}

                  <button
                    type="button"
                    onClick={
                      handleStripeCheckout
                    }
                    disabled={
                      loading ||
                      items.length === 0
                    }
                    className="mt-5 w-full rounded-full bg-black px-6 py-4 font-bold text-white transition hover:bg-[#333333] disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {loading
                      ? "Starting Checkout..."
                      : `Pay ${formatPrice(
                          estimate.total
                        )}`}
                  </button>
                </div>
              </div>

              <aside className="h-fit rounded-[2rem] bg-white p-5 shadow-soft md:p-6">
                <div className="font-display text-3xl font-bold text-black">
                  Order Summary
                </div>

                <div className="mt-6 grid gap-4">
                  {items.map((item) => (
                    <div
                      key={item.id}
                      className="grid grid-cols-[64px_1fr_auto] items-center gap-3 md:grid-cols-[70px_1fr_auto]"
                    >
                      <div className="relative h-16 overflow-hidden rounded-2xl bg-[#faf6ee]">
                        <Image
                          src={item.image}
                          alt={item.name}
                          fill
                          className="object-contain p-2"
                          sizes="70px"
                        />
                      </div>

                      <div>
                        <div className="text-sm font-bold text-black">
                          {item.name}
                        </div>

                        <div className="text-xs text-black">
                          Qty {item.quantity}
                        </div>
                      </div>

                      <div className="text-sm font-bold text-black">
                        {formatPrice(
                          item.unitPrice *
                            item.quantity
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                <div className="mt-6 grid gap-3 border-t border-black/10 pt-5 text-black">
                  <div className="flex justify-between">
                    <span>
                      Subtotal
                    </span>

                    <span>
                      {formatPrice(
                        subtotal
                      )}
                    </span>
                  </div>

                  <div className="flex justify-between">
                    <span>
                      Estimated Shipping
                    </span>

                    <span>
                      {estimate.shipping === 0
                        ? "Free"
                        : formatPrice(
                            estimate.shipping
                          )}
                    </span>
                  </div>

                  <div className="flex justify-between">
                    <span>
                      Estimated Tax
                    </span>

                    <span>
                      {formatPrice(
                        estimate.tax
                      )}
                    </span>
                  </div>

                  <div className="flex justify-between border-t border-black/10 pt-3 text-lg font-bold">
                    <span>
                      Estimated Total
                    </span>

                    <span>
                      {formatPrice(
                        estimate.total
                      )}
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