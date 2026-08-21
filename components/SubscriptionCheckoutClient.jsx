"use client";

import { useState } from "react";
import { formatPrice } from "@/lib/data";

export default function SubscriptionCheckoutClient({
  prepared
}) {
  const [name, setName] =
    useState("");

  const [email, setEmail] =
    useState("");

  const [phone, setPhone] =
    useState("");

  const [loadingProvider, setLoadingProvider] =
    useState(null);

  const [error, setError] =
    useState("");

  const customerValid =
    name.trim().length > 0 &&
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
      email.trim()
    );

  async function startCheckout(provider) {
    if (!customerValid) {
      setError(
        "Please enter your full name and a valid email address."
      );

      return;
    }

    setError("");
    setLoadingProvider(provider);

    try {
      const endpoint =
        provider === "stripe"
          ? "/api/subscriptions/stripe/create"
          : "/api/subscriptions/paypal/create";

      const response =
        await fetch(endpoint, {
          method: "POST",

          headers: {
            "Content-Type":
              "application/json"
          },

          body: JSON.stringify({
            productId:
              prepared.product.productId,

            quantity:
              prepared.quantity,

            frequencyId:
              prepared.frequency.id,

            customer: {
              name:
                name.trim(),

              email:
                email
                  .trim()
                  .toLowerCase(),

              phone:
                phone.trim() ||
                null
            }
          })
        });

      const result =
        await response.json();

      if (!response.ok) {
        throw new Error(
          result?.message ||
            "Unable to start subscription checkout."
        );
      }

      /*
       * Stripe returns a redirect URL.
       *
       * Our PayPal subscription route will
       * return an approvalUrl using the
       * same client.
       */
      const redirectUrl =
        provider === "stripe"
          ? result?.url
          : result?.approvalUrl;

      if (!redirectUrl) {
        throw new Error(
          "The payment provider did not return a checkout URL."
        );
      }

      window.location.assign(
        redirectUrl
      );
    } catch (checkoutError) {
      console.error(
        "Subscription checkout error:",
        checkoutError
      );

      setError(
        checkoutError instanceof Error
          ? checkoutError.message
          : "Unable to start subscription checkout."
      );

      setLoadingProvider(null);
    }
  }

  const isLoading =
    Boolean(loadingProvider);

  return (
    <main className="min-h-screen bg-[#f8f6f1] px-4 pb-16 pt-28 md:pt-32">
      <div className="mx-auto grid max-w-5xl gap-6 lg:grid-cols-[1fr_380px]">

        {/* Customer */}
        <section className="rounded-[2rem] bg-white p-5 shadow-soft md:p-8">
          <div className="text-xs font-bold uppercase tracking-[.18em] text-black/40">
            Subscribe & Save
          </div>

          <h1 className="mt-2 font-display text-4xl font-bold text-black">
            Subscription Checkout
          </h1>

          <p className="mt-3 leading-7 text-black/55">
            Enter your contact information
            and choose how you would like
            to pay for your recurring
            subscription.
          </p>

          <div className="mt-8 grid gap-4">
            <label className="grid gap-2">
              <span className="text-sm font-bold">
                Full name
              </span>

              <input
                value={name}
                onChange={(event) =>
                  setName(
                    event.target.value
                  )
                }
                autoComplete="name"
                placeholder="Full name"
                className="h-14 rounded-2xl border border-black/10 bg-[#faf8f4] px-4 outline-none transition focus:border-black"
              />
            </label>

            <label className="grid gap-2">
              <span className="text-sm font-bold">
                Email address
              </span>

              <input
                type="email"
                value={email}
                onChange={(event) =>
                  setEmail(
                    event.target.value
                  )
                }
                autoComplete="email"
                placeholder="you@example.com"
                className="h-14 rounded-2xl border border-black/10 bg-[#faf8f4] px-4 outline-none transition focus:border-black"
              />
            </label>

            <label className="grid gap-2">
              <span className="text-sm font-bold">
                Phone number
                <span className="ml-1 font-normal text-black/40">
                  optional
                </span>
              </span>

              <input
                type="tel"
                value={phone}
                onChange={(event) =>
                  setPhone(
                    event.target.value
                  )
                }
                autoComplete="tel"
                placeholder="Phone number"
                className="h-14 rounded-2xl border border-black/10 bg-[#faf8f4] px-4 outline-none transition focus:border-black"
              />
            </label>
          </div>

          {error ? (
            <div
              role="alert"
              className="mt-5 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-bold text-red-700"
            >
              {error}
            </div>
          ) : null}

          <div className="mt-8 rounded-[1.5rem] bg-[#f1eadf] p-5">
            <div className="text-sm font-bold">
              Choose Payment Method
            </div>

            <button
              type="button"
              disabled={isLoading}
              onClick={() =>
                startCheckout(
                  "stripe"
                )
              }
              className="mt-4 w-full rounded-full bg-black px-6 py-4 font-bold text-white transition hover:bg-black/80 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loadingProvider ===
              "stripe"
                ? "Opening secure checkout..."
                : `Pay with Card · ${formatPrice(
                    prepared.totalCents /
                      100
                  )}`}
            </button>

            <div className="my-4 flex items-center gap-3">
              <div className="h-px flex-1 bg-black/10" />

              <span className="text-xs font-bold uppercase tracking-[.15em] text-black/40">
                Or pay with
              </span>

              <div className="h-px flex-1 bg-black/10" />
            </div>

            <button
              type="button"
              disabled={isLoading}
              onClick={() =>
                startCheckout(
                  "paypal"
                )
              }
              className="w-full rounded-full bg-[#ffc439] px-6 py-4 text-lg font-bold text-[#003087] transition hover:brightness-95 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loadingProvider ===
              "paypal"
                ? "Opening PayPal..."
                : "PayPal"}
            </button>

            <p className="mt-4 text-center text-xs leading-5 text-black/45">
              This is a recurring purchase.
              Your selected payment method
              will be charged according to
              the delivery schedule shown
              in your order summary.
            </p>
          </div>
        </section>

        {/* Summary */}
        <aside className="h-fit rounded-[2rem] bg-white p-5 shadow-soft md:p-6 lg:sticky lg:top-28">
          <div className="text-xs font-bold uppercase tracking-[.16em] text-black/40">
            Subscription Summary
          </div>

          <h2 className="mt-2 font-display text-3xl font-bold text-black">
            {prepared.product.name}
          </h2>

          <div className="mt-6 rounded-2xl bg-[#faf8f4] p-4">
            <div className="text-sm text-black/55">
              Delivery
            </div>

            <div className="mt-1 font-bold">
              {prepared.frequency.label}
            </div>
          </div>

          <div className="mt-4 rounded-2xl bg-[#faf8f4] p-4">
            <div className="text-sm text-black/55">
              Quantity
            </div>

            <div className="mt-1 font-bold">
              {prepared.quantity}
            </div>
          </div>

          <div className="mt-6 grid gap-3 border-t border-black/10 pt-5 text-sm">
            <div className="flex justify-between gap-4">
              <span>
                Regular price
              </span>

              <span>
                {formatPrice(
                  prepared.regularUnitPriceCents /
                    100
                )}
              </span>
            </div>

            <div className="flex justify-between gap-4">
              <span>
                Subscription price
              </span>

              <span className="font-bold text-green-700">
                {formatPrice(
                  prepared.subscriptionUnitPriceCents /
                    100
                )}
              </span>
            </div>

            <div className="flex justify-between gap-4">
              <span>
                Quantity
              </span>

              <span>
                × {prepared.quantity}
              </span>
            </div>

            {prepared.discountCents >
            0 ? (
              <div className="flex justify-between gap-4 text-green-700">
                <span>
                  Savings
                </span>

                <span className="font-bold">
                  -
                  {formatPrice(
                    prepared.discountCents /
                      100
                  )}
                </span>
              </div>
            ) : null}

            <div className="mt-2 flex justify-between gap-4 border-t border-black/10 pt-4 text-xl font-bold">
              <span>
                Recurring total
              </span>

              <span>
                {formatPrice(
                  prepared.totalCents /
                    100
                )}
              </span>
            </div>
          </div>

          <p className="mt-5 text-xs leading-5 text-black/45">
            Pricing is validated securely
            on the Shakti Foods server before
            payment checkout is created.
          </p>
        </aside>
      </div>
    </main>
  );
}