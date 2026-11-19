"use client";

import Script from "next/script";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import {
  contactMethodForHref,
  getMeasurementIdForHostname,
  isUntrackedPath,
  trackEvent
} from "@/lib/analytics";

/*
 * Loads Google Analytics with the property for the store being visited
 * (picked from the address: shaktifoodsus.com or the Simpli Ecoware site).
 * Nothing loads on localhost, Vercel previews or admin pages.
 */
export default function Analytics() {
  const pathname = usePathname();
  const [measurementId, setMeasurementId] = useState(null);

  useEffect(() => {
    setMeasurementId(getMeasurementIdForHostname(window.location.hostname));
  }, []);

  // Call / WhatsApp / Email taps anywhere (contact page, footer, menus).
  useEffect(() => {
    function onClick(event) {
      const link = event.target?.closest?.("a[href]");
      const method = link ? contactMethodForHref(link.getAttribute("href")) : null;

      if (method && !isUntrackedPath(window.location.pathname)) {
        trackEvent("contact", {
          method,
          link_location: window.location.pathname
        });
      }
    }

    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
  }, []);

  const untracked = isUntrackedPath(pathname);

  // If the tag is already running (store page → admin), pause it on admin pages.
  if (measurementId && typeof window !== "undefined") {
    window[`ga-disable-${measurementId}`] = untracked;
  }

  if (!measurementId || untracked) return null;

  return (
    <>
      <Script
        src={`https://www.googletagmanager.com/gtag/js?id=${measurementId}`}
        strategy="afterInteractive"
      />
      <Script id="ga4-init" strategy="afterInteractive">
        {`
          window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          window.gtag = gtag;
          gtag('js', new Date());
          gtag('config', '${measurementId}', { send_page_view: true });
        `}
      </Script>
    </>
  );
}
