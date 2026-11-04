import Stripe from "stripe";

// Keep the legacy Stripe account dedicated to Ecoware and to already-created
// historical Checkout Sessions. New Shakti orders use its own live account.
export function stripeKeyForStorefront(storefront) {
  if (storefront === "shakti_foods") {
    const key = process.env.SHAKTI_STRIPE_SECRET_KEY;
    if (!key) throw new Error("Shakti Foods Stripe checkout is not configured.");
    return key;
  }
  if (storefront === "ecoware") {
    const key = process.env.STRIPE_SECRET_KEY;
    if (!key) throw new Error("Ecoware Stripe checkout is not configured.");
    return key;
  }
  throw new Error("Unsupported Stripe storefront.");
}

export function stripeWebhookAccounts() {
  const accounts = [
    {
      storefront: "shakti_foods",
      key: process.env.SHAKTI_STRIPE_SECRET_KEY,
      webhookSecret: process.env.SHAKTI_STRIPE_WEBHOOK_SECRET
    },
    {
      storefront: "legacy",
      key: process.env.STRIPE_SECRET_KEY,
      webhookSecret: process.env.STRIPE_WEBHOOK_SECRET
    }
  ];
  return accounts.filter(({ key, webhookSecret }) => key && webhookSecret);
}

// A session created before the account split may still be open on the old
// Stripe account. Only retry on Stripe's explicit "not found" response.
export async function stripeForCheckoutSession(sessionId, storefront) {
  const keys = storefront === "shakti_foods"
    ? [process.env.SHAKTI_STRIPE_SECRET_KEY, process.env.STRIPE_SECRET_KEY]
    : storefront === "ecoware"
      ? [process.env.STRIPE_SECRET_KEY]
      : [];

  if (!keys.length || !keys[0]) {
    throw new Error("Stripe checkout is not configured for this storefront.");
  }

  for (const key of new Set(keys.filter(Boolean))) {
    const stripe = new Stripe(key);
    try {
      const session = await stripe.checkout.sessions.retrieve(sessionId);
      const sessionStorefront = String(session.metadata?.storefront || "").trim();
      if (sessionStorefront && sessionStorefront !== storefront) {
        throw new Error("Checkout session belongs to a different storefront.");
      }
      return stripe;
    } catch (error) {
      if (error?.code === "resource_missing" || error?.statusCode === 404) {
        continue;
      }
      throw error;
    }
  }

  throw new Error("Checkout session was not found in the configured Stripe accounts.");
}
