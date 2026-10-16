/*
 * PayPal must never run against the PayPal sandbox on the live websites
 * (Shakti Foods and Simpli Ecoware share these checks).
 *
 * New PayPal checkouts on the production deployment require:
 *   PAYPAL_ENVIRONMENT=live              live API + credentials (server)
 *   PAYPAL_LIVE_ENABLED=true             allow new PayPal orders (server)
 *   NEXT_PUBLIC_PAYPAL_LIVE_ENABLED=true show the PayPal button (browser)
 *
 * Preview deployments and local development keep PayPal available so it
 * can be tested against the sandbox. Capturing, cancelling and webhooks for
 * PayPal orders that already exist are never blocked.
 */

function isProductionDeployment() {
  const vercelEnv = process.env.VERCEL_ENV;

  if (vercelEnv) {
    return vercelEnv === "production";
  }

  return process.env.NODE_ENV === "production";
}

/** Server-side gate for creating new PayPal orders or subscriptions. */
export function getPayPalCheckoutAvailability() {
  if (!isProductionDeployment()) {
    return { enabled: true };
  }

  if (process.env.PAYPAL_ENVIRONMENT !== "live") {
    return {
      enabled: false,
      reason: "PayPal is configured for the sandbox, not live payments."
    };
  }

  if (process.env.PAYPAL_LIVE_ENABLED !== "true") {
    return {
      enabled: false,
      reason: "PAYPAL_LIVE_ENABLED is not true."
    };
  }

  return { enabled: true };
}

/**
 * Browser-side: whether to show PayPal buttons. Only NEXT_PUBLIC_*
 * variables are available here (inlined at build time).
 */
export function isPayPalCheckoutVisible() {
  const vercelEnv = process.env.NEXT_PUBLIC_VERCEL_ENV;

  const isProductionSite = vercelEnv
    ? vercelEnv === "production"
    : process.env.NODE_ENV === "production";

  if (!isProductionSite) {
    return true;
  }

  return process.env.NEXT_PUBLIC_PAYPAL_LIVE_ENABLED === "true";
}
