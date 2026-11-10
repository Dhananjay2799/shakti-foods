import { redirectToRememberedStore } from "@/lib/admin-store";

export const dynamic = "force-dynamic";

/*
 * Old shared admin URL. The admin is separated by store, so this opens
 * the inventory page inside the store last opened in the admin.
 */
export default async function LegacyInventoryRedirect({ searchParams }) {
  redirectToRememberedStore("/inventory", await Promise.resolve(searchParams || {}));
}
