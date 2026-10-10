
"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

function isAdminUser(user) {
  if (!user) return false;

  const appRole = String(
    user.app_metadata?.role || ""
  ).trim().toLowerCase();

  const appRoles = Array.isArray(user.app_metadata?.roles)
    ? user.app_metadata.roles.map(role =>
        String(role).trim().toLowerCase()
      )
    : [];

  const adminEmails = new Set(
    String(process.env.ADMIN_EMAILS || "")
      .split(",")
      .map(email => email.trim().toLowerCase())
      .filter(Boolean)
  );

  const email = String(user.email || "").trim().toLowerCase();

  return (
    appRole === "admin" ||
    appRoles.includes("admin") ||
    user.app_metadata?.is_admin === true ||
    adminEmails.has(email)
  );
}

export async function loginAdmin(formData) {
  const email = String(formData.get("email") || "").trim();
  const password = String(formData.get("password") || "");

  if (!email || !password) {
    redirect(
      `/admin/login?error=${encodeURIComponent(
        "Email and password are required."
      )}`
    );
  }

  const supabase = await createClient();

  const { data, error } =
    await supabase.auth.signInWithPassword({
      email,
      password
    });

  if (error || !data?.user) {
    redirect(
      `/admin/login?error=${encodeURIComponent(
        error?.message || "Unable to sign in."
      )}`
    );
  }

  if (!isAdminUser(data.user)) {
    await supabase.auth.signOut();

    redirect(
      `/admin/login?error=${encodeURIComponent(
        "Administrator access required."
      )}`
    );
  }

  redirect("/admin/select-store");
}

export async function logoutAdmin() {
  const supabase = await createClient();

  await supabase.auth.signOut();

  redirect("/admin/login");
}
