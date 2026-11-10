import { redirectToRememberedStore } from "@/lib/admin-store";

export const dynamic = "force-dynamic";

/*
 * Old shared admin URL. The admin is separated by store, so this opens
 * the customers page inside the store last opened in the admin.
 */
export default async function LegacyCustomersRedirect({ searchParams }) {
  redirectToRememberedStore("/customers", await Promise.resolve(searchParams || {}));
}
