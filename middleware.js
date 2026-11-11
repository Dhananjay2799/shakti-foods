import { NextResponse } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";
import { getShaktiLegacyRedirectUrl } from "@/lib/storefront-hosts";

const ECOWARE_HOSTS = new Set([
  "simpliecoware.vercel.app",
  "www.simpliecoware.com",
  "simpliecoware.com",
]);

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