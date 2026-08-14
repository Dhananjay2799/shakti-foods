import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function requireAuthenticatedAdmin() {
  const authClient = await createClient();

  const {
    data: { user },
    error,
  } = await authClient.auth.getUser();

  if (error || !user) {
    redirect("/admin/login");
  }

  return user;
}