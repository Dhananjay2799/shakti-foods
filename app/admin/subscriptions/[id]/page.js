import { redirectToRecordStore } from "@/lib/admin-store";

export const dynamic = "force-dynamic";

/*
 * Old shared admin URL. The admin is separated by store, so this opens
 * this record inside the store it belongs to.
 */
export default async function LegacySubscriptionRedirect({ params, searchParams }) {
  const resolvedParams = await Promise.resolve(params || {});
  const recordId = decodeURIComponent(String(resolvedParams.id || ""));

  await redirectToRecordStore({
    table: "subscriptions",
    column: "id",
    value: recordId,
    path: `/subscriptions/${encodeURIComponent(recordId)}`,
    searchParams: await Promise.resolve(searchParams || {})
  });
}
