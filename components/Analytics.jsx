"use client";

import Script from "next/script";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import {
  getMeasurementIdForHostname,
  isUntrackedPath
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
