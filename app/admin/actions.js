"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

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

  const { error } =
    await supabase.auth.signInWithPassword({
      email,
      password
    });

  if (error) {
    redirect(
      `/admin/login?error=${encodeURIComponent(
        error.message || "Unable to sign in."
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