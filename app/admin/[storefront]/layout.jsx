import { notFound } from "next/navigation";
import AdminShell from "@/components/admin/AdminShell";
import { createClient } from "@/lib/supabase/server";
import {
  getAdminStorefront
} from "@/lib/admin-storefronts";

export const dynamic = "force-dynamic";

function getInitials(name, email) {
  const source = String(name || "").trim();

  if (source) {
    const parts = source.split(/\s+/).filter(Boolean);

    return (
      parts.length > 1
        ? `${parts[0][0]}${parts[parts.length - 1][0]}`
        : parts[0].slice(0, 2)
    ).toUpperCase();
  }

  return String(email || "A").slice(0, 1).toUpperCase();
}

export default async function StorefrontAdminLayout({
  children,
  params
}) {
  const resolvedParams =
    await Promise.resolve(params);

  const storefront =
    getAdminStorefront(
      resolvedParams.storefront
    );

  if (!storefront) {
    notFound();
  }

  const supabase = await createClient();

  const {
    data: { user }
  } = await supabase.auth.getUser();

  const name = String(
    user?.user_metadata?.full_name ||
      user?.user_metadata?.name ||
      ""
  ).trim();

  const email = user?.email || "";

  return (
    <AdminShell
      storefrontId={storefront.id}
      user={{
        name,
        email,
        initials: getInitials(name, email)
      }}
    >
      {children}
    </AdminShell>
  );
}
