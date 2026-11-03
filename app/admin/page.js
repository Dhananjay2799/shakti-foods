import { redirect } from "next/navigation";
import { requireAuthenticatedAdmin } from "@/lib/admin-auth";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  // Require a signed-in administrator before choosing the default storefront.
  // Keep /admin/select-store available for switching to Simpli Ecoware.
  await requireAuthenticatedAdmin();
  redirect("/admin/shakti-foods");
}
