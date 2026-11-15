"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { ArrowLeft, Lock } from "lucide-react";
import { PayPalButtons, PayPalScriptProvider } from "@paypal/react-paypal-js";

import SectionHeading from "@/components/SectionHeading";
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
  "w-full rounded-2xl border border-black/10 px-4 py-4 text-black outline-none focus:border-black";
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function money(cents) {
  return formatPrice(cents / 100);
}

/*
 * "Pay a custom amount": pay an invoice total or an agreed price without
 * adding products to the cart. Linked from the checkout page.
 *
 * The page can be pre-filled from its link, e.g.
 *   /checkout/custom-amount?amount=250&note=Invoice%201042&shipping=0&tax=0
 */
export default function CustomPaymentPageContent({ storefront = "shakti_foods" }) {
  const isEcoware = storefront === "ecoware";
  const prefix = isEcoware ? "/ecoware" : "";
  const brandName = isEcoware ? "Simpli Ecoware" : "Shakti Foods";
  // Same rule as the cart checkout (see CheckoutPageContent).
  const showPayPal = !isEcoware && isPayPalCheckoutVisible();
  // Shakti Foods charges no sales tax; only Ecoware offers "Add sales tax".
  const taxOption = customPaymentAllowsTax(storefront);

  const searchParams = useSearchParams();

  const [amountInput, setAmountInput] = useState("");
  const [note, setNote] = useState("");
  const [includeShipping, setIncludeShipping] = useState(true);
  const [includeTax, setIncludeTax] = useState(true);
  const [customer, setCustomer] = useState({ name: "", email: "", phone: "" });
  const [showErrors, setShowErrors] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [cardLoading, setCardLoading] = useState(false);
  const [paypalLoading, setPayPalLoading] = useState(false);
  const paypalOrderRef = useRef("");

  // Pre-fill from the link, once.
  useEffect(() => {
    const amount = searchParams.get("amount");
    const presetNote = searchParams.get("note");

    if (amount && parseAmountToCents(amount) !== null) {
      setAmountInput((parseAmountToCents(amount) / 100).toFixed(2));
    }

    if (presetNote) setNote(cleanCustomPaymentNote(presetNote));
    if (searchParams.get("shipping") === "0") setIncludeShipping(false);
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

  // The Ecoware layout already provides the page's <main>.
  const Wrapper = isEcoware ? "div" : "main";

  return (
    <Wrapper
      className={`text-black ${
        isEcoware ? "bg-brand-radial pt-36 sm:pt-40 lg:pt-44" : "bg-white pt-24 md:pt-28"
      }`}
    >
      <section className="section-pad py-14 md:py-20">
        <div className="container-brand">
          <Link
            href={`${prefix}/checkout`}
            className="mb-6 inline-flex items-center gap-2 text-sm font-bold text-black/70 transition hover:text-black"
          >
            <ArrowLeft size={16} aria-hidden="true" />
            Back to checkout
          </Link>

          <SectionHeading
            eyebrow={brandName}
            title="Pay a Custom Amount"
            text={`Paying an invoice or a price we agreed on? Enter the amount below and pay securely by ${
              showPayPal ? "card or PayPal" : "card"
            }. No cart needed.`}
          />

          <div className="mt-8 grid grid-cols-1 gap-6 md:mt-10 md:gap-8 lg:grid-cols-[minmax(0,1fr)_420px]">
            <div className="min-w-0 rounded-[2rem] bg-white p-5 shadow-soft md:p-6">
              <div className="font-display text-3xl font-bold text-black">Payment Details</div>

              <div className="mt-6 grid grid-cols-1 gap-5">
                <div>
                  <label htmlFor="custom-amount" className="text-sm font-bold text-black">
                    Amount (USD)
                  </label>
                  <div
                    className={`mt-2 flex items-center rounded-2xl border bg-white focus-within:border-black ${
                      amountInvalid ? "border-red-500" : "border-black/10"
                    }`}
                  >
                    <span aria-hidden="true" className="pl-4 text-2xl font-bold text-black/50">
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
                      aria-describedby="custom-amount-help"
                      className="w-full min-w-0 flex-1 rounded-2xl bg-transparent px-2 py-4 text-2xl font-bold text-black outline-none"
                    />
                  </div>
                  <p
                    id="custom-amount-help"
                    className={`mt-2 text-sm ${amountInvalid ? "font-semibold text-red-600" : "text-black/55"}`}
                  >
                    {amountInvalid ? amountError : "The amount before shipping and tax."}
                  </p>
                </div>

                <div>
                  <label htmlFor="custom-note" className="text-sm font-bold text-black">
                    What is this payment for? <span className="font-normal text-black/50">(optional)</span>
                  </label>
                  <input
                    id="custom-note"
                    type="text"
                    value={note}
                    maxLength={CUSTOM_PAYMENT_NOTE_MAX_LENGTH}
                    onChange={(event) => setNote(event.target.value)}
                    placeholder="e.g. Invoice #1042 or 5 cases of plates"
                    className={`mt-2 ${INPUT}`}
                  />
                </div>

                <fieldset className="grid min-w-0 grid-cols-1 gap-3">
                  <legend className="text-sm font-bold text-black">
                    {taxOption ? "Shipping and tax" : "Shipping"}
                  </legend>

                  <label className="mt-2 flex cursor-pointer items-start gap-3 rounded-2xl bg-[#faf7f1] p-4">
                    <input
                      type="checkbox"
                      checked={includeShipping}
                      onChange={(event) => setIncludeShipping(event.target.checked)}
                      className="mt-1 h-4 w-4 shrink-0"
                    />
                    <span className="text-sm leading-6 text-black/70">
                      <span className="block font-bold text-black">Add shipping</span>
                      {shippingRateLines().join(". ")}. You&apos;ll enter your address on
                      the next step.
                    </span>
                  </label>

                  {taxOption ? (
                    <label className="flex cursor-pointer items-start gap-3 rounded-2xl bg-[#faf7f1] p-4">
                      <input
                        type="checkbox"
                        checked={includeTax}
                        onChange={(event) => setIncludeTax(event.target.checked)}
                        className="mt-1 h-4 w-4 shrink-0"
                      />
                      <span className="text-sm leading-6 text-black/70">
                        <span className="block font-bold text-black">Add sales tax</span>
                        {CUSTOM_PAYMENT_TAX_PERCENT}% sales tax on the amount and shipping.
                      </span>
                    </label>
                  ) : null}
                </fieldset>

                <div className="grid grid-cols-1 gap-4 border-t border-black/10 pt-5">
                  <div className="text-sm font-bold text-black">Your details</div>

                  <div>
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
                      <p className="mt-2 text-sm font-semibold text-red-600">{nameError}</p>
                    ) : null}
                  </div>

                  <div>
                    <input
                      type="email"
                      autoComplete="email"
                      value={customer.email}
                      onChange={(event) => updateCustomer("email", event.target.value)}
                      placeholder="Email (optional, for your receipt)"
                      aria-label="Email (optional)"
                      aria-invalid={emailInvalid}
                      className={`${INPUT} ${emailInvalid ? "border-red-500" : ""}`}
                    />
                    {emailInvalid ? (
                      <p className="mt-2 text-sm font-semibold text-red-600">{emailError}</p>
                    ) : null}
                  </div>

                  <input
                    type="tel"
                    autoComplete="tel"
                    value={customer.phone}
                    onChange={(event) => updateCustomer("phone", event.target.value)}
                    placeholder="Phone number (optional)"
                    aria-label="Phone number (optional)"
                    className={INPUT}
                  />
                </div>
              </div>

              <div className="mt-8 rounded-[1.5rem] bg-brand-sand p-5">
                <div className="flex items-center gap-2 font-bold text-black">
                  <Lock size={18} aria-hidden="true" />
                  Secure Payment
                </div>

                <p className="mt-2 text-sm leading-6 text-black">
                  Card payments go through Stripe. We never see or store your card details.
                </p>

                {notice ? (
                  <div role="status" className="mt-4 rounded-2xl bg-white/70 px-4 py-3 text-sm text-black">
                    {notice}
                  </div>
                ) : null}

                {error ? (
                  <div role="alert" className="mt-4 rounded-2xl bg-red-50 px-4 py-3 text-sm text-black">
                    {error}
                  </div>
                ) : null}

                <button
                  type="button"
                  onClick={payByCard}
                  disabled={busy}
                  className="mt-5 w-full rounded-full bg-black px-6 py-4 font-bold text-white transition hover:bg-[#333333] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {cardLoading
                    ? "Opening secure payment..."
                    : amountError
                      ? "Pay with Card"
                      : `Pay ${totalLabel} with Card`}
                </button>

                {showPayPal ? (
                  <>
                    <div className="my-5 flex items-center gap-3">
                      <div className="h-px flex-1 bg-black/10" />
                      <span className="text-xs font-bold uppercase tracking-[0.16em] text-black/50">
                        Or pay with
                      </span>
                      <div className="h-px flex-1 bg-black/10" />
                    </div>

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
                        style={{ layout: "horizontal", shape: "pill", label: "paypal", height: 48, tagline: false }}
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
                            err instanceof Error ? `PayPal error: ${err.message}` : "PayPal error. Please try again or pay by card."
                          );
                        }}
                      />
                    </PayPalScriptProvider>
                  </>
                ) : null}

                <p className="mt-5 text-center text-xs leading-5 text-black/55">
                  By paying, you agree to our{" "}
                  <Link href={`${prefix}/terms`} className="font-semibold text-black underline underline-offset-2">
                    Terms of Service
                  </Link>{" "}
                  and{" "}
                  <Link href={`${prefix}/privacy`} className="font-semibold text-black underline underline-offset-2">
                    Privacy Policy
                  </Link>
                  .
                </p>

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
              </div>
            </div>

            <aside className="h-fit min-w-0 rounded-[2rem] bg-white p-5 shadow-soft md:p-6 lg:sticky lg:top-32">
              <div className="font-display text-3xl font-bold text-black">Payment Summary</div>

              {cleanCustomPaymentNote(note) ? (
                <p className="mt-4 break-words rounded-2xl bg-[#faf7f1] px-4 py-3 text-sm text-black/70">
                  {cleanCustomPaymentNote(note)}
                </p>
              ) : null}

              <dl className="mt-6 grid gap-3 text-black">
                <div className="flex justify-between gap-4">
                  <dt>Amount</dt>
                  <dd>{amountError ? "—" : money(totals.amountCents)}</dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt>Shipping</dt>
                  <dd className={includeShipping ? "" : "text-black/45"}>
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
                    <dd className={includeTax ? "" : "text-black/45"}>
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
                <div className="flex justify-between gap-4 border-t border-black/10 pt-3 text-lg font-bold">
                  <dt>Total</dt>
                  <dd>{totalLabel}</dd>
                </div>
              </dl>
            </aside>
          </div>
        </div>
      </section>
    </Wrapper>
  );
}
