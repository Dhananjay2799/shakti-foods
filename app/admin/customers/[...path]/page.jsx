import { redirectToRememberedStore } from "@/lib/admin-store";

export const dynamic = "force-dynamic";

/*
 * Old shared admin URL. The admin is separated by store, so this opens
 * the customer page inside the store last opened in the admin.
 */
export default async function LegacyCustomerPageRedirect({ params, searchParams }) {
  const resolvedParams = await Promise.resolve(params || {});
  const path = (resolvedParams.path || [])
    .map((part) => encodeURIComponent(decodeURIComponent(String(part))))
    .join("/");

  redirectToRememberedStore(
    `/customers/${path}`,
    await Promise.resolve(searchParams || {})
  );
}
