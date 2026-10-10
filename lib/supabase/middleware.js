
import { createServerClient } from "@supabase/ssr";
import { NextResponse } from "next/server";

function isAdminUser(user) {
  if (!user) return false;

  const appRole = String(
    user.app_metadata?.role || ""
  ).toLowerCase();

  const appRoles = Array.isArray(user.app_metadata?.roles)
    ? user.app_metadata.roles.map(role =>
        String(role).toLowerCase()
      )
    : [];

  const email = String(user.email || "").toLowerCase();

  const adminEmails = new Set(
    String(process.env.ADMIN_EMAILS || "")
      .split(",")
      .map(value => value.trim().toLowerCase())
      .filter(Boolean)
  );

  return (
    appRole === "admin" ||
    appRoles.includes("admin") ||
    user.app_metadata?.is_admin === true ||
    adminEmails.has(email)
  );
}

export async function updateSession(request) {
  let response = NextResponse.next({ request });

  const pathname = request.nextUrl.pathname;

  const isAdminRoute =
    pathname === "/admin" ||
    pathname.startsWith("/admin/");

  const isAdminLogin = pathname === "/admin/login";

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey =
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    console.error("Missing Supabase authentication configuration.");

    if (isAdminRoute && !isAdminLogin) {
      return new NextResponse(
        "Admin authentication unavailable.",
        { status: 503 }
      );
    }

    return response;
  }

  const supabase = createServerClient(
    supabaseUrl,
    supabaseAnonKey,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => {
            request.cookies.set(name, value);
          });

          response = NextResponse.next({ request });

          cookiesToSet.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, options);
          });
        }
      }
    }
  );

  const {
    data: { user },
    error
  } = await supabase.auth.getUser();

  if (isAdminRoute && !isAdminLogin) {
    if (error || !user) {
      const url = request.nextUrl.clone();

      url.pathname = "/admin/login";
      url.searchParams.set("next", pathname);

      return NextResponse.redirect(url);
    }

    if (!isAdminUser(user)) {
      console.warn("Non-admin attempted admin dashboard access", {
        userId: user.id
      });

      return new NextResponse(
        "403 Forbidden: Administrator access required.",
        { status: 403 }
      );
    }
  }

  if (isAdminLogin && user && isAdminUser(user)) {
    const url = request.nextUrl.clone();
    url.pathname = "/admin";
    url.search = "";

    return NextResponse.redirect(url);
  }

  return response;
}
