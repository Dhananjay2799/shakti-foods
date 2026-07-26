"use client";

import { useCallback, useEffect, useRef } from "react";

export default function CheckoutReturnWatcher() {
  const requestInProgress = useRef(false);

  const releaseAbandonedCheckout = useCallback(async () => {
    if (requestInProgress.current) {
      return;
    }

    const savedCheckout = sessionStorage.getItem(
      "activeStripeCheckout"
    );

    if (!savedCheckout) {
      return;
    }

    let checkoutData;

    try {
      checkoutData = JSON.parse(savedCheckout);
    } catch {
      sessionStorage.removeItem(
        "activeStripeCheckout"
      );
      return;
    }

    if (
      !checkoutData?.sessionId ||
      !checkoutData?.reservationId
    ) {
      sessionStorage.removeItem(
        "activeStripeCheckout"
      );
      return;
    }

    requestInProgress.current = true;

    try {
      const response = await fetch(
        "/api/checkout/abandon",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            sessionId: checkoutData.sessionId,
            reservationId: checkoutData.reservationId
          }),
          cache: "no-store"
        }
      );

      const result = await response.json();

      if (!response.ok) {
        console.error(
          "Unable to release abandoned checkout:",
          result
        );
        return;
      }

      console.log(
        "Abandoned checkout result:",
        result
      );

      sessionStorage.removeItem(
        "activeStripeCheckout"
      );
    } catch (error) {
      console.error(
        "Unable to release abandoned checkout:",
        error
      );
    } finally {
      requestInProgress.current = false;
    }
  }, []);

  useEffect(() => {
    function handlePageShow() {
      window.setTimeout(
        releaseAbandonedCheckout,
        250
      );
    }

    function handleFocus() {
      window.setTimeout(
        releaseAbandonedCheckout,
        250
      );
    }

    function handleVisibilityChange() {
      if (document.visibilityState === "visible") {
        window.setTimeout(
          releaseAbandonedCheckout,
          250
        );
      }
    }

    // Also check when the component first mounts.
    window.setTimeout(
      releaseAbandonedCheckout,
      250
    );

    window.addEventListener(
      "pageshow",
      handlePageShow
    );

    window.addEventListener(
      "focus",
      handleFocus
    );

    document.addEventListener(
      "visibilitychange",
      handleVisibilityChange
    );

    return () => {
      window.removeEventListener(
        "pageshow",
        handlePageShow
      );

      window.removeEventListener(
        "focus",
        handleFocus
      );

      document.removeEventListener(
        "visibilitychange",
        handleVisibilityChange
      );
    };
  }, [releaseAbandonedCheckout]);

  return null;
}