"use client";

import { useEffect, useState } from "react";

import { formatPrice } from "@/lib/data";
import {
  ADJUSTMENT_MODES,
  adjustmentFromInput,
  cleanAdjustmentLabel,
  defaultAdjustmentLabel
} from "@/lib/checkout-adjustment";

/*
 * "Adjust amount" (admin only), used on the checkout page and on
 * "Pay a custom amount". See lib/checkout-adjustment.js.
 */

const TOKEN_KEY = "checkoutAdjustToken";
// Matches the server's token lifetime (lib/checkout-adjustment-server.js).
const TOKEN_HOURS = 4;

/**
 * The admin token and the applied adjustment for a page whose total
 * before adjusting is baseTotalCents. Recomputed on every render, so a
 * change to the order (delivery, amount) keeps the adjustment right.
 */
export function useCheckoutAdjustment(baseTotalCents) {
  const [token, setToken] = useState("");
  const [applied, setApplied] = useState(null);

  // A code entered earlier in this browser tab stays valid for a while.
  useEffect(() => {
    try {
      const saved = JSON.parse(sessionStorage.getItem(TOKEN_KEY) || "null");

      if (saved?.token && Number(saved.exp) > Date.now()) {
        setToken(saved.token);
      }
    } catch {
      // No saved admin code on this device.
    }
  }, []);

  const result = applied ? adjustmentFromInput({ ...applied, baseTotalCents }) : null;
  const valid = Boolean(result) && !result.error;
  const feeCents = valid ? result.feeCents : 0;
  const discountCents = valid ? result.discountCents : 0;
  const label = applied ? cleanAdjustmentLabel(applied.label, feeCents > 0 ? "fee" : "discount") : "";

  function saveToken(nextToken, exp) {
    setToken(nextToken);

    try {
      sessionStorage.setItem(TOKEN_KEY, JSON.stringify({ token: nextToken, exp }));
    } catch {
      // Private mode: the code works until the page closes.
    }
  }

  /** Forgets the code and the adjustment (Lock, or the server said no). */
  function clear() {
    setToken("");
    setApplied(null);

    try {
      sessionStorage.removeItem(TOKEN_KEY);
    } catch {
      // Nothing saved.
    }
  }

  return {
    token,
    applied,
    setApplied,
    saveToken,
    clear,
    feeCents,
    discountCents,
    label,
    // Set when an adjustment was applied but no longer fits the order.
    error: applied && !valid ? result?.error || "" : "",
    totalCents: baseTotalCents + feeCents - discountCents,
    // Sent with the payment request; the server re-checks everything.
    request:
      feeCents > 0 || discountCents > 0
        ? { token, feeCents, discountCents, label }
        : null
  };
}

/*
 * "Adjust amount": under the policy links. Asks for the admin code
 * (checked by the server), then lets the owner add a fee, give a
 * discount or set the total for this order.
 */
export default function AdjustAmountPanel({
  token,
  onToken,
  onLock,
  applied,
  onApply,
  baseTotalCents,
  disabled
}) {
  const [open, setOpen] = useState(false);
  const [code, setCode] = useState("");
  const [checking, setChecking] = useState(false);
  const [codeError, setCodeError] = useState("");
  // Shown after Lock, so it's clear the amount went back.
  const [notice, setNotice] = useState("");
  const [mode, setMode] = useState(applied?.mode || ADJUSTMENT_MODES.FEE);
  const [unit, setUnit] = useState(applied?.unit || "percent");
  const [value, setValue] = useState(applied?.value || "");
  const [label, setLabel] = useState(applied?.label || "");

  async function verifyCode(event) {
    event.preventDefault();

    if (!code.trim() || checking) return;

    setChecking(true);
    setCodeError("");

    try {
      const response = await fetch("/api/checkout/adjust-access", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code })
      });
      const result = await response.json().catch(() => ({}));

      if (!response.ok || !result.token) {
        throw new Error(result.message || "That code isn't correct.");
      }

      setCode("");
      setNotice("");
      onToken(result.token, Date.now() + TOKEN_HOURS * 60 * 60 * 1000);
    } catch (err) {
      setCodeError(err instanceof Error ? err.message : "That code isn't correct.");
    } finally {
      setChecking(false);
    }
  }

  const preview =
    String(value).trim() === ""
      ? null
      : adjustmentFromInput({ mode, unit, value, baseTotalCents });

  const previewTotal = preview && !preview.error
    ? (baseTotalCents + preview.feeCents - preview.discountCents) / 100
    : null;

  const labelKind =
    mode === ADJUSTMENT_MODES.DISCOUNT ||
    (mode === ADJUSTMENT_MODES.TOTAL && preview?.discountCents > 0)
      ? "discount"
      : "fee";

  const modeButton = (value_, text) => (
    <button
      key={value_}
      type="button"
      onClick={() => setMode(value_)}
      aria-pressed={mode === value_}
      className={`flex-1 rounded-lg px-2 py-2 text-sm font-semibold transition ${
        mode === value_ ? "bg-black text-white" : "text-black/70 hover:text-black"
      }`}
    >
      {text}
    </button>
  );

  return (
    <div className="mt-3 text-center">
      <button
        type="button"
        onClick={() => {
          setOpen((current) => !current);
          setNotice("");
        }}
        aria-expanded={open}
        aria-controls="checkout-adjust-panel"
        className="text-xs font-medium text-black/50 underline underline-offset-2 hover:text-black sm:text-sm"
      >
        {applied ? "Adjust amount (applied)" : "Adjust amount"}
      </button>

      {open ? (
        <div
          id="checkout-adjust-panel"
          className="mt-3 rounded-xl border border-black/10 bg-[#faf7f1] p-4 text-left"
        >
          {!token ? (
            <form onSubmit={verifyCode}>
              {notice ? (
                <p
                  role="status"
                  className="mb-3 rounded-lg bg-green-50 px-3 py-2 text-sm font-semibold text-green-800"
                >
                  {notice}
                </p>
              ) : null}
              <label htmlFor="checkout-adjust-code" className="block text-sm font-bold text-black">
                Admin code
              </label>
              <div className="mt-2 flex gap-2">
                <input
                  id="checkout-adjust-code"
                  type="password"
                  autoComplete="off"
                  value={code}
                  onChange={(event) => setCode(event.target.value)}
                  className="min-w-0 flex-1 rounded-lg border border-black/15 bg-white px-3 py-2 text-black outline-none focus:border-black"
                />
                <button
                  type="submit"
                  disabled={checking || !code.trim()}
                  className="shrink-0 rounded-lg bg-black px-4 py-2 text-sm font-bold text-white disabled:opacity-50"
                >
                  {checking ? "Checking..." : "Verify"}
                </button>
              </div>
              {codeError ? (
                <p role="alert" className="mt-2 text-sm font-semibold text-red-600">
                  {codeError}
                </p>
              ) : null}
            </form>
          ) : (
            <div>
              <div className="flex rounded-lg border border-black/10 bg-white p-1">
                {modeButton(ADJUSTMENT_MODES.FEE, "Add fee")}
                {modeButton(ADJUSTMENT_MODES.DISCOUNT, "Discount")}
                {modeButton(ADJUSTMENT_MODES.TOTAL, "Set total")}
              </div>

              <div className="mt-3 flex gap-2">
                {mode !== ADJUSTMENT_MODES.TOTAL ? (
                  <select
                    aria-label="Amount type"
                    value={unit}
                    onChange={(event) => setUnit(event.target.value)}
                    className="rounded-lg border border-black/15 bg-white px-2 py-2 text-sm text-black"
                  >
                    <option value="percent">%</option>
                    <option value="amount">$</option>
                  </select>
                ) : null}
                <input
                  aria-label={
                    mode === ADJUSTMENT_MODES.TOTAL
                      ? "New total in dollars"
                      : unit === "percent"
                        ? "Percent"
                        : "Amount in dollars"
                  }
                  inputMode="decimal"
                  value={value}
                  onChange={(event) => setValue(event.target.value)}
                  placeholder={
                    mode === ADJUSTMENT_MODES.TOTAL
                      ? "New total, e.g. 25.00"
                      : unit === "percent"
                        ? "e.g. 3"
                        : "e.g. 1.50"
                  }
                  className="min-w-0 flex-1 rounded-lg border border-black/15 bg-white px-3 py-2 text-black outline-none focus:border-black"
                />
              </div>

              <input
                aria-label="Name shown to the customer"
                value={label}
                maxLength={40}
                onChange={(event) => setLabel(event.target.value)}
                placeholder={`Shown as "${defaultAdjustmentLabel(labelKind)}"`}
                className="mt-2 w-full rounded-lg border border-black/15 bg-white px-3 py-2 text-sm text-black outline-none focus:border-black"
              />

              <p className="mt-2 text-sm text-black/70" aria-live="polite">
                {preview?.error
                  ? preview.error
                  : previewTotal !== null
                    ? `New total: ${formatPrice(previewTotal)}`
                    : `Current total: ${formatPrice(baseTotalCents / 100)}`}
              </p>

              <div className="mt-3 flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  disabled={disabled || !preview || Boolean(preview.error)}
                  onClick={() =>
                    onApply({
                      mode,
                      unit,
                      value,
                      label: cleanAdjustmentLabel(label, labelKind)
                    })
                  }
                  className="rounded-lg bg-black px-4 py-2 text-sm font-bold text-white disabled:opacity-50"
                >
                  Apply
                </button>
                {applied ? (
                  <button
                    type="button"
                    onClick={() => {
                      onApply(null);
                      setValue("");
                      setLabel("");
                    }}
                    className="rounded-lg border border-black/15 bg-white px-4 py-2 text-sm font-semibold text-black"
                  >
                    Remove
                  </button>
                ) : null}
                <button
                  type="button"
                  onClick={() => {
                    // Stay open: closing would move the page, and the
                    // owner wouldn't see the total go back.
                    onLock();
                    setValue("");
                    setLabel("");
                    setCodeError("");
                    setNotice(
                      `Locked. ${applied ? "Adjustment removed. " : ""}Total: ${formatPrice(
                        baseTotalCents / 100
                      )}`
                    );
                  }}
                  className="ml-auto text-sm font-semibold text-black/60 underline underline-offset-2"
                >
                  Lock
                </button>
              </div>
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
}
