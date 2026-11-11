"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { AlertCircle, Check, X } from "lucide-react";

const VISIBLE_MS = 4000;

function imageSrc(item) {
  const first = item?.image || item?.images?.[0];

  return typeof first === "string" ? first : first?.url || "";
}

/*
 * "Item added to cart" pop-up. Bottom of the screen on phones, top right
 * under the header on larger screens. Closes by itself after a few
 * seconds (paused while the pointer or keyboard focus is on it).
 */
export default function CartToast({ toast, onClose }) {
  const [shown, setShown] = useState(false);
  const [paused, setPaused] = useState(false);
  const closeRef = useRef(onClose);

  closeRef.current = onClose;

  useEffect(() => {
    if (!toast) {
      setShown(false);
      return undefined;
    }

    setShown(false);
    const frame = requestAnimationFrame(() => setShown(true));

    return () => cancelAnimationFrame(frame);
  }, [toast]);

  useEffect(() => {
    if (!toast || paused) {
      return undefined;
    }

    const timer = setTimeout(() => closeRef.current?.(), VISIBLE_MS);

    return () => clearTimeout(timer);
  }, [toast, paused]);

  useEffect(() => {
    if (!toast) return undefined;

    const onKey = (event) => {
      if (event.key === "Escape") closeRef.current?.();
    };

    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [toast]);

  const isError = toast?.type === "error";
  const src = toast ? imageSrc(toast.item) : "";

  return (
    <div
      aria-live="polite"
      className="pointer-events-none fixed inset-x-3 bottom-3 z-[80] flex justify-center sm:inset-x-auto sm:bottom-auto sm:right-5 sm:top-24"
    >
      {toast ? (
        <div
          key={toast.id}
          role="status"
          data-cart-toast={isError ? "error" : "added"}
          onMouseEnter={() => setPaused(true)}
          onMouseLeave={() => setPaused(false)}
          onFocus={() => setPaused(true)}
          onBlur={() => setPaused(false)}
          className={[
            "pointer-events-auto w-full max-w-sm rounded-2xl border border-black/10 bg-white p-3.5 text-black shadow-[0_18px_50px_-12px_rgba(0,0,0,0.35)] transition duration-300 ease-out motion-reduce:transition-none",
            shown ? "translate-y-0 opacity-100" : "translate-y-3 opacity-0 sm:-translate-y-3"
          ].join(" ")}
        >
          <div className="flex items-start gap-3">
            {src && !isError ? (
              <span className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-[#f6f2ea] p-1">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={src} alt="" className="h-full w-full object-contain" />
              </span>
            ) : null}

            <div className="min-w-0 flex-1 pt-0.5">
              <p className="flex items-center gap-1.5 text-sm font-bold">
                <span
                  className={[
                    "flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-white",
                    isError ? "bg-amber-500" : "bg-emerald-600"
                  ].join(" ")}
                  aria-hidden="true"
                >
                  {isError ? <AlertCircle size={13} /> : <Check size={13} strokeWidth={3} />}
                </span>
                {isError ? "Couldn't add more" : "Item added to cart"}
              </p>

              {isError ? (
                <p className="mt-1 text-sm text-black/65">{toast.message}</p>
              ) : (
                <>
                  <p className="mt-1 truncate text-sm text-black/70">
                    {toast.item?.name || "Your item"}
                  </p>
                  <p className="mt-0.5 text-xs text-black/50">
                    {toast.quantityAdded > 1 ? `${toast.quantityAdded} added · ` : ""}
                    {toast.cartQuantity} in your cart
                    {toast.limitReached ? " · stock limit reached" : ""}
                  </p>
                </>
              )}
            </div>

            <button
              type="button"
              onClick={() => onClose?.()}
              className="-m-1 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-black/45 transition hover:bg-black/5 hover:text-black"
              aria-label="Close"
            >
              <X size={16} />
            </button>
          </div>

          <div className="mt-3 grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => onClose?.()}
              className="rounded-xl border border-black/10 px-3 py-2.5 text-sm font-semibold text-black transition hover:bg-black/[0.03]"
            >
              Keep shopping
            </button>

            <Link
              href={toast.cartHref || "/cart"}
              onClick={() => onClose?.()}
              className="rounded-xl bg-black px-3 py-2.5 text-center text-sm font-bold text-white transition hover:bg-black/85"
            >
              View cart
            </Link>
          </div>
        </div>
      ) : null}
    </div>
  );
}
