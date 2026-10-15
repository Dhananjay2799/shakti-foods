import { site } from "@/lib/site";

/*
 * Shakti Foods and Simpli Ecoware are two separate websites served by this
 * one codebase. Anything a customer sees outside the page they are on —
 * order emails, Stripe redirects, cart recovery links — must use the
 * storefront the order belongs to, never a single shared URL or brand.
 *
 *   Shakti Foods    NEXT_PUBLIC_BASE_URL     (default https://shakti-foods.com)
 *   Simpli Ecoware  NEXT_PUBLIC_ECOWARE_URL  (default https://simpliecoware.vercel.app)
 *
 * Ecoware pages live under /ecoware in this app. On the Ecoware domain the
 * middleware serves /ecoware/* as-is, and on localhost it is the only way to
 * reach them, so Ecoware links always include that prefix.
 */

export const SHAKTI_STOREFRONT = "shakti_foods";
export const ECOWARE_STOREFRONT = "ecoware";

const DEFAULT_SITE_URLS = {
  [SHAKTI_STOREFRONT]: "https://shakti-foods.com",
  [ECOWARE_STOREFRONT]: "https://simpliecoware.vercel.app"
};

const DEFAULT_ORDER_EMAIL_ADDRESS = "orders@shakti-foods.com";

function cleanUrl(value) {
  return String(value || "")
    .trim()
    .replace(/\/+$/, "");
}

function cleanText(value) {
  return String(value || "").trim();
}

function isLocalUrl(value) {
  return /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i.test(
    cleanUrl(value)
  );
}

function extractEmailAddress(fromValue) {
  const value = cleanText(fromValue);
  const bracketed = value.match(/<([^<>\s]+@[^<>\s]+)>/);

  if (bracketed) {
    return bracketed[1];
  }

  return /^[^\s<>@]+@[^\s<>@]+$/.test(value) ? value : null;
}

export function normalizeStorefront(storefront) {
  return cleanText(storefront) === ECOWARE_STOREFRONT
    ? ECOWARE_STOREFRONT
    : SHAKTI_STOREFRONT;
}

export function isEcowareStorefront(storefront) {
  return normalizeStorefront(storefront) === ECOWARE_STOREFRONT;
}

/** Public homepage URL of the storefront, without a trailing slash. */
export function getStorefrontSiteUrl(storefront) {
  const shaktiConfigured = cleanUrl(
    process.env.NEXT_PUBLIC_BASE_URL ||
      process.env.NEXT_PUBLIC_SITE_URL
  );

  if (isEcowareStorefront(storefront)) {
    const ecowareConfigured = cleanUrl(
      process.env.NEXT_PUBLIC_ECOWARE_URL
    );

    if (ecowareConfigured) {
      return ecowareConfigured;
    }

    // Local development serves both storefronts from one localhost origin.
    if (isLocalUrl(shaktiConfigured)) {
      return shaktiConfigured;
    }

    return DEFAULT_SITE_URLS[ECOWARE_STOREFRONT];
  }

  return (
    shaktiConfigured ||
    DEFAULT_SITE_URLS[SHAKTI_STOREFRONT]
  );
}

/** App path for a storefront page, e.g. "/checkout/success" -> "/ecoware/checkout/success". */
export function getStorefrontPath(storefront, path = "/") {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;

  if (!isEcowareStorefront(storefront)) {
    return normalizedPath;
  }

  return normalizedPath === "/"
    ? "/ecoware"
    : `/ecoware${normalizedPath}`;
}

/** Absolute URL of a storefront page on that storefront's own website. */
export function getStorefrontPageUrl(storefront, path = "/") {
  return `${getStorefrontSiteUrl(storefront)}${getStorefrontPath(
    storefront,
    path
  )}`;
}

/*
 * Order emails for both brands are sent from a domain verified in Resend.
 * simpliecoware.vercel.app cannot be verified (no DNS access to vercel.app),
 * so by default Ecoware mail keeps the verified address but shows the
 * "Simpli Ecoware" name. Set ECOWARE_ORDER_EMAIL_FROM once Ecoware has its
 * own verified domain.
 */
export function getStorefrontEmailFrom(storefront) {
  if (isEcowareStorefront(storefront)) {
    const explicit = cleanText(process.env.ECOWARE_ORDER_EMAIL_FROM);

    if (explicit) {
      return explicit;
    }

    const address =
      extractEmailAddress(process.env.ORDER_EMAIL_FROM) ||
      DEFAULT_ORDER_EMAIL_ADDRESS;

    return `Simpli Ecoware <${address}>`;
  }

  return (
    cleanText(process.env.SHAKTI_ORDER_EMAIL_FROM) ||
    cleanText(process.env.ORDER_EMAIL_FROM) ||
    `Shakti Foods <${DEFAULT_ORDER_EMAIL_ADDRESS}>`
  );
}

export function getStorefrontBrand(storefront) {
  const id = normalizeStorefront(storefront);
  const siteUrl = getStorefrontSiteUrl(id);

  const supportEmail =
    id === ECOWARE_STOREFRONT
      ? cleanText(process.env.ECOWARE_SUPPORT_EMAIL) || null
      : cleanText(process.env.SHAKTI_SUPPORT_EMAIL) || site.email;

  const supportPhone =
    id === ECOWARE_STOREFRONT
      ? cleanText(process.env.ECOWARE_SUPPORT_PHONE) || null
      : site.phone;

  return {
    storefront: id,
    businessName:
      id === ECOWARE_STOREFRONT ? "Simpli Ecoware" : "Shakti Foods",
    siteUrl,
    siteLabel: siteUrl.replace(/^https?:\/\//i, ""),
    supportEmail,
    supportPhone,
    emailFrom: getStorefrontEmailFrom(id),
    replyTo: supportEmail || undefined
  };
}
