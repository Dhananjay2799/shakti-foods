import { redirectToRecordStore } from "@/lib/admin-store";

export const dynamic = "force-dynamic";

/*
 * Old shared admin URL. The admin is separated by store, so this opens
 * this record inside the store it belongs to.
 */
export default async function LegacySampleRequestRedirect({ params, searchParams }) {
  const resolvedParams = await Promise.resolve(params || {});
  const recordId = decodeURIComponent(String(resolvedParams.id || ""));

  await redirectToRecordStore({
    table: "sample_requests",
    column: "id",
    value: recordId,
    fixedStorefrontId: "ecoware",
    path: `/sample-requests/${encodeURIComponent(recordId)}`,
    searchParams: await Promise.resolve(searchParams || {})
  });
}
