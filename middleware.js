import { NextResponse } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";
import { getShaktiLegacyRedirectUrl } from "@/lib/storefront-hosts";
import {
  ECOWARE_STOREFRONT,
  getStorefrontPageUrl
} from "@/lib/storefront-config";

const ECOWARE_HOSTS = new Set([
  "simpliecoware.vercel.app",
  "www.simpliecoware.com",
  "simpliecoware.com",
]);

// Shakti Foods' public addresses (not previews or localhost, where
// /ecoware is how the Ecoware pages are opened during development).
const SHAKTI_PUBLIC_HOSTS = new Set(["shaktifoodsus.com", "www.shaktifoodsus.com"]);

// Simpli Ecoware pages that Google has tried on the Shakti Foods address.
const ECOWARE_ONLY_PATHS = new Set(["/sustainability", "/sample-requests"]);

/**
 * On shaktifoodsus.com, the Ecoware page a request is really for
 * ("/ecoware/about" -> "/about"), or null. Those pages live on the
 * Simpli Ecoware site, so they are not served twice under two brands.
 */
function ecowarePathRequestedOnShakti(hostname, pathname) {
  if (!SHAKTI_PUBLIC_HOSTS.has(hostname)) {
    return null;
  }

  if (pathname === "/ecoware") {
    return "/";
  }

  if (pathname.startsWith("/ecoware/")) {
    return pathname.slice("/ecoware".length);
  }

  return ECOWARE_ONLY_PATHS.has(pathname) ? pathname : null;
}

export async function middleware(request) {
  const { pathname, search } = request.nextUrl;

  // shakti-foods.com and www.shakti-foods.com → the same page on
  // shaktifoodsus.com. Google's Change of Address tool checks for 301s;
  // form posts get a 308 so the browser keeps the method and the body.
  const legacyRedirectUrl = getShaktiLegacyRedirectUrl({
    hostHeader: request.headers.get("host"),
    pathname,
    search
  });

  if (legacyRedirectUrl) {
    const keepsMethod =
      request.method !== "GET" && request.method !== "HEAD";

    return NextResponse.redirect(
      legacyRedirectUrl,
      keepsMethod ? 308 : 301
    );
  }

  const requestHostname = (request.headers.get("host") || "")
    .split(":")[0]
    .toLowerCase();

  const ecowarePath = ecowarePathRequestedOnShakti(requestHostname, pathname);

  if (ecowarePath) {
    const ecowareUrl = new URL(
      getStorefrontPageUrl(ECOWARE_STOREFRONT, ecowarePath)
    );

    // Never redirect to ourselves (e.g. if the Ecoware URL is misconfigured).
    if (!SHAKTI_PUBLIC_HOSTS.has(ecowareUrl.hostname)) {
      ecowareUrl.search = search;

      const keepsMethod =
        request.method !== "GET" && request.method !== "HEAD";

      return NextResponse.redirect(ecowareUrl, keepsMethod ? 308 : 301);
    }
  }

  // Keep existing Supabase admin authentication behavior.
  if (pathname === "/admin" || pathname.startsWith("/admin/")) {
    return updateSession(request);
  }

  // Exact exception for the customer quote response page so it serves directly
  // from app/(storefront)/wholesale/quote/page.js without being rewritten to /ecoware/wholesale/quote.
  if (pathname === "/wholesale/quote") {
    return NextResponse.next();
  }

  const hostname = (request.headers.get("host") || "")
    .split(":")[0]
    .toLowerCase();

  const isEcowareHost = ECOWARE_HOSTS.has(hostname);

  if (!isEcowareHost) {
    return NextResponse.next();
  }

  // Shared routes must remain exactly where they are.
  const sharedPrefixes = [
    "/api",
    "/cart",
    "/checkout",
    "/admin",
    "/auth",
    "/_next",
    "/images",
  ];

  const isSharedRoute = sharedPrefixes.some(
    (prefix) =>
      pathname === prefix || pathname.startsWith(`${prefix}/`)
  );

  if (isSharedRoute) {
    return NextResponse.next();
  }

  // Avoid rewriting something that is already under /ecoware.
  if (pathname === "/ecoware" || pathname.startsWith("/ecoware/")) {
    return NextResponse.next();
  }

  const url = request.nextUrl.clone();

  if (pathname === "/") {
    url.pathname = "/ecoware";
  } else {
    url.pathname = `/ecoware${pathname}`;
  }

  return NextResponse.rewrite(url);
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml).*)",
  ],
};