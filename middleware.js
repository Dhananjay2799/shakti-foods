import { NextResponse } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

const ECOWARE_HOSTS = new Set([
  "simpliecoware.vercel.app",
  "www.simpliecoware.com",
  "simpliecoware.com",
]);

export async function middleware(request) {
  const { pathname } = request.nextUrl;

  // Keep existing Supabase admin authentication behavior.
  if (pathname === "/admin" || pathname.startsWith("/admin/")) {
    return updateSession(request);
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