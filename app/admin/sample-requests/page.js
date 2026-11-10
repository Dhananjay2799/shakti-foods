import { redirectToRecordStore } from "@/lib/admin-store";

export const dynamic = "force-dynamic";

/*
 * Old shared admin URL. The admin is separated by store, so this opens
 * the sample-requests page inside the only store that has it.
 */
export default async function LegacySampleRequestsRedirect({ searchParams }) {
  await redirectToRecordStore({
    path: "/sample-requests",
    fixedStorefrontId: "ecoware",
    searchParams: await Promise.resolve(searchParams || {})
  });
}
