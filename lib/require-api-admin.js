
import { createClient } from "@/lib/supabase/server";

export async function requireApiAdmin() {
  const authClient = await createClient();

  const {
    data: { user },
    error
  } = await authClient.auth.getUser();

  if (error || !user) {
    return {
      authorized: false,
      status: 401,
      message: "Authentication required."
    };
  }

  const appRole = String(
    user.app_metadata?.role || ""
  ).toLowerCase();

  const appRoles = Array.isArray(user.app_metadata?.roles)
    ? user.app_metadata.roles.map((role) =>
        String(role).toLowerCase()
      )
    : [];

  const adminEmails = new Set(
    String(process.env.ADMIN_EMAILS || "")
      .split(",")
      .map((email) => email.trim().toLowerCase())
      .filter(Boolean)
  );

  const email = String(user.email || "").toLowerCase();

  const isAdmin =
    appRole === "admin" ||
    appRoles.includes("admin") ||
    user.app_metadata?.is_admin === true ||
    adminEmails.has(email);

  if (!isAdmin) {
    return {
      authorized: false,
      status: 403,
      message: "Administrator access required."
    };
  }

  return {
    authorized: true,
    user
  };
}
