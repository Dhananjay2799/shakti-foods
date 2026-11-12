import { ECOWARE_HOSTNAMES } from "@/lib/storefront-hosts";

/*
 * Google Analytics 4. Each store has its own property, so its visits and
 * sales are reported separately. Measurement IDs are public (they appear
 * in every page's HTML), so they live here rather than in env settings.
 *
 * Tracking runs only on the stores' public addresses, so local testing and
 * Vercel preview deployments never show up in the reports.
 */
export const GA_MEASUREMENT_IDS = {
  shakti_foods: "G-Y2L9GVDSJY",
  ecoware: ""
};

const SHAKTI_ANALYTICS_HOSTNAMES = new Set([
  "shaktifoodsus.com",
  "www.shaktifoodsus.com"
]);

const ECOWARE_ANALYTICS_HOSTNAMES = new Set(ECOWARE_HOSTNAMES);

const MEASUREMENT_ID_PATTERN = /^G-[A-Z0-9]{6,}$/;

/** The GA4 measurement ID for a page's hostname, or null for no tracking. */
export function getMeasurementIdForHostname(hostname) {
  const host = String(hostname || "").toLowerCase();

  const id = SHAKTI_ANALYTICS_HOSTNAMES.has(host)
    ? GA_MEASUREMENT_IDS.shakti_foods
    : ECOWARE_ANALYTICS_HOSTNAMES.has(host)
      ? GA_MEASUREMENT_IDS.ecoware
      : "";

  return MEASUREMENT_ID_PATTERN.test(id) ? id : null;
}

/** Admin pages are never tracked. */
export function isUntrackedPath(pathname) {
  const path = String(pathname || "");

  return path === "/admin" || path.startsWith("/admin/");
}

export function trackEvent(eventName, params = {}) {
  if (typeof window === "undefined") return;
  if (typeof window.gtag !== "function") return;
  window.gtag("event", eventName, params);
}

/**
 * Sends a purchase once per order in this browser tab, so reloading the
 * order confirmation page doesn't count the sale twice. (GA also ignores
 * repeat purchases with the same transaction_id.)
 */
export function trackPurchaseOnce(transactionId, params = {}, attempt = 0) {
  const id = String(transactionId || "").trim();

  if (!id || typeof window === "undefined") return;

  const key = `ga-purchase-${id}`;

  try {
    if (window.sessionStorage.getItem(key)) return;
  } catch {
    // Storage blocked: GA's own transaction_id check still prevents doubles.
  }

  // The tag starts just after the page loads; give it a few seconds.
  if (typeof window.gtag !== "function") {
    if (attempt < 10) {
      window.setTimeout(
        () => trackPurchaseOnce(id, params, attempt + 1),
        500
      );
    }
    return;
  }

  trackEvent("purchase", { ...params, transaction_id: id });

  try {
    window.sessionStorage.setItem(key, "1");
  } catch {
    // Ignore: see above.
  }
}

export function productToGaItem(product, quantity = 1) {
  return {
    item_id: product.id,
    item_name: product.name,
    item_category: product.category,
    price: product.unitPrice || 0,
    quantity
  };
}
