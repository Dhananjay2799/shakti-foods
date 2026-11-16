import { createClient } from "@supabase/supabase-js";

/*
 * fresh: true -> every request bypasses Next.js' data cache. Use it in
 * background jobs that must see the current data (a GET to the same
 * URL may otherwise be answered from a copy cached at build time).
 */
export function createSupabaseAdmin({ fresh = false } = {}) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl) {
    throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL.");
  }

  if (!serviceRoleKey) {
    throw new Error("Missing SUPABASE_SERVICE_ROLE_KEY.");
  }

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false
    },
    ...(fresh
      ? {
          global: {
            fetch: (input, init) => fetch(input, { ...init, cache: "no-store" })
          }
        }
      : {})
  });
}