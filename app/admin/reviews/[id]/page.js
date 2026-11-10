import { redirectToRecordStore } from "@/lib/admin-store";

export const dynamic = "force-dynamic";

/*
 * Old shared admin URL. The admin is separated by store, so this opens
 * this record inside the store it belongs to.
 */
export default async function LegacyReviewRedirect({ params, searchParams }) {
  const resolvedParams = await Promise.resolve(params || {});
  const recordId = decodeURIComponent(String(resolvedParams.id || ""));

  await redirectToRecordStore({
    table: "product_reviews",
    column: "id",
    value: recordId,
    path: `/reviews/${encodeURIComponent(recordId)}`,
    searchParams: await Promise.resolve(searchParams || {})
  });
}
