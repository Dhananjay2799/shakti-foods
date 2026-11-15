"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { ChevronDown } from "lucide-react";
import { PayPalButtons, PayPalScriptProvider } from "@paypal/react-paypal-js";

import AdjustAmountPanel, { useCheckoutAdjustment } from "@/components/AdjustAmountPanel";
import { formatPrice } from "@/lib/data";
import { commerce, shippingRateLines } from "@/lib/commerce";
import { isPayPalCheckoutVisible } from "@/lib/paypal-availability";
import { trackEvent, trackPurchaseOnce } from "@/lib/analytics";
import {
  CUSTOM_PAYMENT_NOTE_MAX_LENGTH,
  CUSTOM_PAYMENT_PRODUCT_ID,
  CUSTOM_PAYMENT_TAX_PERCENT,
  calculateCustomPayment,
  customPaymentAllowsTax,
  cleanCustomPaymentNote,
  customAmountError,
  parseAmountToCents
} from "@/lib/custom-payment";

const INPUT =
  "w-full rounded-xl border border-black/15 bg-white px-4 py-3 text-black outline-none transition placeholder:text-black/40 focus:border-black";
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function money(cents) {
  return formatPrice(cents / 100);
}

/*
 * "Pay a custom amount": pay an invoice total or an agreed price without
 * adding products to the cart. Linked from the checkout page.
 *
 * The page can be pre-filled from its link, e.g.
 *   /checkout/custom-amount?amount=250&note=Invoice%201042&shipping=1&tax=0
 */
export default function CustomPaymentPageContent({ storefront = "shakti_foods" }) {
  const isEcoware = storefront === "ecoware";
  const prefix = isEcoware ? "/ecoware" : "";
  // Same rule as the cart checkout (see CheckoutPageContent).
  const showPayPal = !isEcoware && isPayPalCheckoutVisible();
  // Shakti Foods charges no sales tax; only Ecoware offers "Add sales tax".
  const taxOption = customPaymentAllowsTax(storefront);

  const searchParams = useSearchParams();

  const [amountInput, setAmountInput] = useState("");
  const [note, setNote] = useState("");
  // Off until the customer ticks it (or the link says shipping=1).
  const [includeShipping, setIncludeShipping] = useState(false);
  const [includeTax, setIncludeTax] = useState(true);
  const [customer, setCustomer] = useState({ name: "", email: "", phone: "" });
  const [showErrors, setShowErrors] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [cardLoading, setCardLoading] = useState(false);
  const [paypalLoading, setPayPalLoading] = useState(false);
  const paypalOrderRef = useRef("");
  // Phone: the summary starts folded into one line.
  const [summaryOpen, setSummaryOpen] = useState(false);
  const [ratesOpen, setRatesOpen] = useState(false);

  // Pre-fill from the link, once.
  useEffect(() => {
    const amount = searchParams.get("amount");
    const presetNote = searchParams.get("note");

    if (amount && parseAmountToCents(amount) !== null) {
      setAmountInput((parseAmountToCents(amount) / 100).toFixed(2));
    }

    if (presetNote) setNote(cleanCustomPaymentNote(presetNote));
    if (searchParams.get("shipping") === "1") setIncludeShipping(true);
    if (searchParams.get("tax") === "0") setIncludeTax(false);

    if (searchParams.get("cancelled") === "1") {
      setNotice("Card payment was cancelled. You haven't been charged.");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const amountCents = parseAmountToCents(amountInput);
  const amountError = customAmountError(amountCents);
  const totals = calculateCustomPayment({
    amountCents: amountError ? 0 : amountCents,
    includeShipping,
    includeTax: taxOption && includeTax,
    storefront
  });

  // Admin-only "Adjust amount" (a fee, a discount or a new total).
  const adjust = useCheckoutAdjustment(amountError ? 0 : totals.totalCents);
  const totalCents = amountError ? 0 : adjust.totalCents;

  const nameError = customer.name.trim() ? "" : "Enter your full name.";
  // Optional: Stripe/PayPal ask for an email when it's blank.
  const emailError =
    customer.email.trim() === "" || EMAIL_PATTERN.test(customer.email.trim())
      ? ""
      : "Enter a valid email address, or leave it blank.";
  const formValid = !amountError && !nameError && !emailError;
  const busy = cardLoading || paypalLoading;

  function updateCustomer(field, value) {
    setCustomer((current) => ({ ...current, [field]: value }));
  }

  function requestBody() {
    return {
      storefront,
      amount: amountInput,
      note: cleanCustomPaymentNote(note),
      includeShipping,
      includeTax: taxOption && includeTax,
      customer: {
        name: customer.name.trim(),
        email: customer.email.trim().toLowerCase(),
        phone: customer.phone.trim()
      },
      adjustment: adjust.request
    };
  }

  /** The server refused the admin adjustment (e.g. the code expired). */
  function adjustmentRejected(result) {
    if (!result?.adjustmentRejected) return false;

    adjust.clear();
    setError(result.message || "The amount adjustment was removed. Please check the total.");
    return true;
  }

  function trackBeginCheckout(paymentType) {
    trackEvent("begin_checkout", {
      currency: commerce.currency,
      value: totalCents / 100,
      shipping: totals.shippingCents / 100,
      tax: totals.taxCents / 100,
      payment_type: paymentType,
      items: [
        {
          item_id: CUSTOM_PAYMENT_PRODUCT_ID,
          item_name: "Custom payment",
          price: totals.amountCents / 100,
          quantity: 1
        }
      ]
    });
  }

  /** Shows the form's problems; true when it can be paid. */
  function checkForm() {
    setShowErrors(true);
    setNotice("");

    if (!formValid) {
      setError("Please fix the highlighted fields.");
      return false;
    }

    setError("");
    return true;
  }

  async function payByCard() {
    if (busy || !checkForm()) return;

    setCardLoading(true);
    trackBeginCheckout("stripe");

    try {
      const response = await fetch("/api/custom-payment/stripe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestBody())
      });
      const result = await response.json().catch(() => ({}));

      if (adjustmentRejected(result)) {
        setCardLoading(false);
        return;
      }

      if (!response.ok || !result.url) {
        throw new Error(result.message || "Unable to start the card payment.");
      }

      window.location.assign(result.url);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to start the card payment.");
      setCardLoading(false);
    }
  }

  async function createPayPalOrder() {
    setPayPalLoading(true);
    setError("");
    trackBeginCheckout("paypal");

    try {
      const response = await fetch("/api/custom-payment/paypal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestBody())
      });
      const result = await response.json().catch(() => ({}));

      if (adjustmentRejected(result)) {
        setPayPalLoading(false);
        throw new Error(result.message);
      }

      if (!response.ok || !result.orderId) {
        throw new Error(result.message || "Unable to start the PayPal payment.");
      }

      paypalOrderRef.current = result.orderId;
      return result.orderId;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to start the PayPal payment.");
      setPayPalLoading(false);
      throw err;
    }
  }

  async function approvePayPalOrder(data) {
    setPayPalLoading(true);
    setError("");

    try {
      const response = await fetch("/api/paypal/capture-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ paypalOrderId: data?.orderID || paypalOrderRef.current })
      });
      const result = await response.json().catch(() => ({}));

      if (!response.ok || !result.orderId) {
        throw new Error(result.error || result.message || "Unable to complete the PayPal payment.");
      }

      if (result.analytics) {
        trackPurchaseOnce(result.orderId, { ...result.analytics, payment_type: "paypal" });
      }

      window.location.assign(
        `${prefix}/checkout/success?orderId=${encodeURIComponent(result.orderId)}&payment=paypal&type=custom`
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to complete the PayPal payment.");
      setPayPalLoading(false);
    }
  }

  async function cancelPayPalOrder() {
    const paypalOrderId = paypalOrderRef.current;
    paypalOrderRef.current = "";
    setPayPalLoading(false);
    setNotice("PayPal payment was cancelled. You haven't been charged.");

    if (!paypalOrderId) return;

    try {
      await fetch("/api/custom-payment/paypal/cancel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ paypalOrderId })
      });
    } catch {
      // Nothing was charged; the unpaid record simply stays pending.
    }
  }

  // The PayPal buttons keep the callbacks they were first given; route
  // them through a ref so they always see the current form.
  const latest = useRef(null);
  latest.current = { checkForm, createPayPalOrder, approvePayPalOrder, cancelPayPalOrder };

  const amountInvalid = showErrors && Boolean(amountError);
  const nameInvalid = showErrors && Boolean(nameError);
  const emailInvalid = showErrors && Boolean(emailError);
  const totalLabel = amountError ? "—" : money(totalCents);
  const cleanNote = cleanCustomPaymentNote(note);

  // Same look as the checkout page.
  const theme = isEcoware
    ? {
        button: "bg-[#27802f] hover:bg-[#1f6a26]",
        check: "accent-[#27802f]",
        stickyTop: "lg:top-40"
      }
    : {
        button: "bg-[#d71920] hover:bg-[#b8141a]",
        check: "accent-[#d71920]",
        stickyTop: "lg:top-28"
      };

  // The Ecoware layout already provides the page's <main>.
  const Wrapper = isEcoware ? "div" : "main";

  return (
    <Wrapper
      className={`text-black ${
        isEcoware ? "bg-brand-radial pt-36 sm:pt-40 lg:pt-44" : "bg-white pt-24 md:pt-28"
      }`}
    >
      <section className="section-pad py-8 md:py-10">
        <div className="container-brand">
          <h1 className="font-display text-[2rem] font-bold leading-tight text-black sm:text-4xl md:text-5xl">
            Pay a Custom Amount
          </h1>
          <p className="mt-2 text-base text-black/75 md:text-lg">
            Pay an invoice or an agreed amount by {showPayPal ? "card or PayPal" : "card"}.
          </p>

          {notice ? (
            <div
              role="status"
              className="mt-4 rounded-xl bg-[#faf7f1] px-4 py-3 text-sm text-black"
            >
              {notice}
            </div>
          ) : null}

          {/*
           * Desktop: payment details on the left; one sticky card on the
           * right with the summary and the payment buttons.
           * Phone: the right card becomes "display: contents", so its parts
           * stack as summary (folded) → details → pay.
           */}
          <div className="mt-5 flex flex-col gap-4 md:mt-8 lg:grid lg:grid-cols-[minmax(0,1fr)_420px] lg:items-start lg:gap-6">
            <section
              aria-labelledby="custom-details-heading"
              className="order-2 min-w-0 rounded-[1.5rem] border border-black/10 bg-white p-4 md:p-6 lg:order-none"
            >
              <h2
                id="custom-details-heading"
                className="font-display text-2xl font-bold text-black md:text-3xl"
              >
                Payment Details
              </h2>

              <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-x-5">
                <div className="min-w-0">
                  <label
                    htmlFor="custom-amount"
                    className="mb-1.5 block text-sm font-bold text-black md:text-base"
                  >
                    Amount (USD)
                  </label>
                  <div
                    className={`flex items-center rounded-xl border bg-white transition focus-within:border-black ${
                      amountInvalid ? "border-red-500" : "border-black/15"
                    }`}
                  >
                    <span aria-hidden="true" className="pl-4 text-lg font-bold leading-6 text-black/60">
                      $
                    </span>
                    <input
                      id="custom-amount"
                      type="text"
                      inputMode="decimal"
                      autoComplete="off"
                      value={amountInput}
                      onChange={(event) => setAmountInput(event.target.value)}
                      onBlur={() => {
                        if (amountCents !== null) setAmountInput((amountCents / 100).toFixed(2));
                      }}
                      placeholder="0.00"
                      aria-invalid={amountInvalid}
                      aria-describedby={amountInvalid ? "custom-amount-error" : undefined}
                      className="w-full min-w-0 flex-1 rounded-xl bg-transparent py-3 pl-1.5 pr-4 text-lg font-bold leading-6 text-black outline-none placeholder:text-black/30"
                    />
                  </div>
                  {amountInvalid ? (
                    <p id="custom-amount-error" className="mt-1.5 text-sm font-semibold text-red-600">
                      {amountError}
                    </p>
                  ) : null}
                </div>

                <div className="min-w-0">
                  <label
                    htmlFor="custom-note"
                    className="mb-1.5 block text-sm font-bold text-black md:text-base"
                  >
                    Payment note <span className="font-normal text-black/60">(optional)</span>
                  </label>
                  <input
                    id="custom-note"
                    type="text"
                    value={note}
                    maxLength={CUSTOM_PAYMENT_NOTE_MAX_LENGTH}
                    onChange={(event) => setNote(event.target.value)}
                    placeholder="e.g. Invoice #1042"
                    className={INPUT}
                  />
                </div>
              </div>

              <div className="mt-5 border-t border-black/10 pt-4">
                <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
                  <label className="flex cursor-pointer items-center gap-3 font-bold text-black md:text-lg">
                    <input
                      type="checkbox"
                      checked={includeShipping}
                      onChange={(event) => setIncludeShipping(event.target.checked)}
                      className={`h-5 w-5 shrink-0 rounded ${theme.check}`}
                    />
                    Add shipping
                  </label>

                  <button
                    type="button"
                    onClick={() => setRatesOpen((open) => !open)}
                    aria-expanded={ratesOpen}
                    aria-controls="custom-shipping-rates"
                    className="inline-flex items-center gap-1.5 text-sm font-semibold text-black underline underline-offset-4 md:text-base"
                  >
                    <ChevronDown
                      size={16}
                      aria-hidden="true"
                      className={`transition ${ratesOpen ? "rotate-180" : ""}`}
                    />
                    Shipping rates
                  </button>
                </div>

                {ratesOpen ? (
                  <ul id="custom-shipping-rates" className="mt-2 grid gap-1 pl-8 text-sm text-black/70">
                    {shippingRateLines().map((line) => (
                      <li key={line}>{line}</li>
                    ))}
                  </ul>
                ) : null}

                {includeShipping ? (
                  <p className="mt-2 pl-8 text-sm text-black/60">
                    You&apos;ll enter the shipping address on the payment page.
                  </p>
                ) : null}

                {taxOption ? (
                  <label className="mt-3 flex cursor-pointer items-center gap-3 font-bold text-black md:text-lg">
                    <input
                      type="checkbox"
                      checked={includeTax}
                      onChange={(event) => setIncludeTax(event.target.checked)}
                      className={`h-5 w-5 shrink-0 rounded ${theme.check}`}
                    />
                    Add sales tax ({CUSTOM_PAYMENT_TAX_PERCENT}%)
                  </label>
                ) : null}
              </div>

              <div className="mt-5 border-t border-black/10 pt-4">
                <h3 className="font-display text-xl font-bold text-black md:text-2xl">Your details</h3>

                <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-x-5">
                  <div className="min-w-0">
                    <input
                      type="text"
                      autoComplete="name"
                      value={customer.name}
                      onChange={(event) => updateCustomer("name", event.target.value)}
                      placeholder="Full name"
                      aria-label="Full name"
                      aria-invalid={nameInvalid}
                      className={`${INPUT} ${nameInvalid ? "border-red-500" : ""}`}
                    />
                    {nameInvalid ? (
                      <p className="mt-1.5 text-sm font-semibold text-red-600">{nameError}</p>
                    ) : null}
                  </div>

                  <div className="min-w-0">
                    <input
                      type="email"
                      autoComplete="email"
                      value={customer.email}
                      onChange={(event) => updateCustomer("email", event.target.value)}
                      placeholder="Email (optional)"
                      aria-label="Email (optional)"
                      aria-invalid={emailInvalid}
                      className={`${INPUT} ${emailInvalid ? "border-red-500" : ""}`}
                    />
                    {emailInvalid ? (
                      <p className="mt-1.5 text-sm font-semibold text-red-600">{emailError}</p>
                    ) : null}
                  </div>

                  <input
                    type="tel"
                    autoComplete="tel"
                    value={customer.phone}
                    onChange={(event) => updateCustomer("phone", event.target.value)}
                    placeholder="Phone (optional)"
                    aria-label="Phone (optional)"
                    className={`${INPUT} sm:col-span-2`}
                  />
                </div>
              </div>
            </section>

            <div
              className={`contents lg:sticky lg:block lg:rounded-[1.5rem] lg:border lg:border-black/10 lg:bg-white lg:p-6 ${theme.stickyTop}`}
            >
              <section aria-label="Payment summary" className="order-1 min-w-0 lg:order-none">
                <button
                  type="button"
                  onClick={() => setSummaryOpen((open) => !open)}
                  aria-expanded={summaryOpen}
                  aria-controls="custom-summary-details"
                  className="flex w-full items-center justify-between gap-3 rounded-xl border border-black/10 bg-[#faf7f1] px-4 py-3 text-left lg:hidden"
                >
                  <span className="font-bold text-black">Payment Summary</span>
                  <span className="flex items-center gap-2 font-bold text-black">
                    {totalLabel}
                    <ChevronDown
                      size={18}
                      aria-hidden="true"
                      className={`transition ${summaryOpen ? "rotate-180" : ""}`}
                    />
                  </span>
                </button>

                <h2 className="hidden font-display text-3xl font-bold text-black lg:block">
                  Payment Summary
                </h2>

                <div
                  id="custom-summary-details"
                  className={`${
                    summaryOpen ? "block" : "hidden"
                  } mt-2 rounded-xl border border-black/10 bg-white p-4 lg:mt-5 lg:block lg:rounded-none lg:border-0 lg:p-0`}
                >
                  {cleanNote ? (
                    <p className="mb-4 break-words rounded-xl bg-[#faf7f1] px-4 py-2.5 text-sm text-black/70">
                      {cleanNote}
                    </p>
                  ) : null}

                  <dl className="grid gap-2.5 text-black md:text-lg">
                    <div className="flex justify-between gap-4">
                      <dt>Amount</dt>
                      <dd>{amountError ? "—" : money(totals.amountCents)}</dd>
                    </div>
                    <div className="flex justify-between gap-4">
                      <dt>Shipping</dt>
                      <dd className={includeShipping ? "" : "text-black/55"}>
                        {!includeShipping
                          ? "Not added"
                          : amountError
                            ? "—"
                            : totals.shippingCents === 0
                              ? "Free"
                              : money(totals.shippingCents)}
                      </dd>
                    </div>
                    {taxOption ? (
                      <div className="flex justify-between gap-4">
                        <dt>Sales tax ({CUSTOM_PAYMENT_TAX_PERCENT}%)</dt>
                        <dd className={includeTax ? "" : "text-black/55"}>
                          {!includeTax ? "Not added" : amountError ? "—" : money(totals.taxCents)}
                        </dd>
                      </div>
                    ) : null}
                    {!amountError && adjust.feeCents > 0 ? (
                      <div className="flex justify-between gap-4">
                        <dt>{adjust.label}</dt>
                        <dd>{money(adjust.feeCents)}</dd>
                      </div>
                    ) : null}
                    {!amountError && adjust.discountCents > 0 ? (
                      <div className="flex justify-between gap-4 font-bold text-green-700">
                        <dt>{adjust.label}</dt>
                        <dd>-{money(adjust.discountCents)}</dd>
                      </div>
                    ) : null}
                    {!amountError && adjust.error ? (
                      <div className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-900">
                        Adjustment not applied: {adjust.error}
                      </div>
                    ) : null}
                    <div className="mt-1 flex items-baseline justify-between gap-4 border-t border-black/10 pt-3">
                      <dt className="text-xl font-bold md:text-2xl">Total</dt>
                      <dd className="text-xl font-bold md:text-2xl">{totalLabel}</dd>
                    </div>
                  </dl>
                </div>
              </section>

              <section aria-label="Payment" className="order-3 min-w-0 lg:order-none lg:mt-5">
                {error ? (
                  <div role="alert" className="mb-3 rounded-xl bg-red-50 px-4 py-3 text-sm text-black">
                    {error}
                  </div>
                ) : null}

                <button
                  type="button"
                  onClick={payByCard}
                  disabled={busy}
                  className={`w-full rounded-xl px-6 py-3.5 text-lg font-bold text-white transition disabled:cursor-not-allowed disabled:opacity-60 ${theme.button}`}
                >
                  {cardLoading
                    ? "Opening secure payment..."
                    : amountError
                      ? "Pay with Card"
                      : `Pay ${totalLabel} with Card`}
                </button>

                <div className="mt-3">
                  {showPayPal ? (
                    <PayPalScriptProvider
                      options={{
                        clientId: process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID || "",
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
                        disabled={busy}
                        forceReRender={[
                          totalCents,
                          includeShipping,
                          includeTax,
                          adjust.feeCents,
                          adjust.discountCents,
                          adjust.label,
                          adjust.token
                        ]}
                        onClick={(data, actions) =>
                          latest.current.checkForm() ? actions.resolve() : actions.reject()
                        }
                        createOrder={() => latest.current.createPayPalOrder()}
                        onApprove={(data) => latest.current.approvePayPalOrder(data)}
                        onCancel={() => latest.current.cancelPayPalOrder()}
                        onError={(err) => {
                          setPayPalLoading(false);
                          setError(
                            err instanceof Error
                              ? `PayPal error: ${err.message}`
                              : "PayPal error. Please try again or pay by card."
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
                      <span className="block text-xl font-extrabold italic">PayPal</span>
                      <span className="block text-xs font-semibold not-italic">
                        Coming soon. Please pay by card.
                      </span>
                    </button>
                  )}
                </div>

                <nav
                  aria-label="Store policies"
                  className="mt-5 flex flex-wrap items-center justify-center gap-x-3 gap-y-1 border-t border-black/10 pt-4 text-sm text-black/80"
                >
                  <Link href={`${prefix}/terms`} className="underline underline-offset-2 hover:text-black">
                    Terms of Service
                  </Link>
                  <span aria-hidden="true">|</span>
                  <Link href={`${prefix}/privacy`} className="underline underline-offset-2 hover:text-black">
                    Privacy Policy
                  </Link>
                </nav>

                <AdjustAmountPanel
                  token={adjust.token}
                  locked={adjust.locked}
                  onToken={adjust.saveToken}
                  onLock={() => {
                    setError("");
                    adjust.lock();
                  }}
                  applied={adjust.applied}
                  onApply={(next) => {
                    setError("");
                    adjust.setApplied(next);
                  }}
                  baseTotalCents={amountError ? 0 : totals.totalCents}
                  totalCents={totalCents}
                  disabled={busy || Boolean(amountError)}
                />
              </section>
            </div>
          </div>
        </div>
      </section>
    </Wrapper>
  );
}
