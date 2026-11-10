import { redirectToRememberedStore } from "@/lib/admin-store";

export const dynamic = "force-dynamic";

/*
 * Old shared admin URL. The admin is separated by store, so this opens
 * the inventory history page inside the store last opened in the admin.
 */
export default async function LegacyInventoryHistoryRedirect({ searchParams }) {
  redirectToRememberedStore("/inventory/history", await Promise.resolve(searchParams || {}));
}
