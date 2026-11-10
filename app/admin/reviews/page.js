import { redirectToRememberedStore } from "@/lib/admin-store";

export const dynamic = "force-dynamic";

/*
 * Old shared admin URL. The admin is separated by store, so this opens
 * the reviews page inside the store last opened in the admin.
 */
export default async function LegacyReviewsRedirect({ searchParams }) {
  redirectToRememberedStore("/reviews", await Promise.resolve(searchParams || {}));
}
