import { redirectToRememberedStore } from "@/lib/admin-store";

export const dynamic = "force-dynamic";

/*
 * Old shared admin URL. The admin is separated by store, so this opens
 * the orders page inside the store last opened in the admin.
 */
export default async function LegacyOrdersRedirect({ searchParams }) {
  redirectToRememberedStore("/orders", await Promise.resolve(searchParams || {}));
}
