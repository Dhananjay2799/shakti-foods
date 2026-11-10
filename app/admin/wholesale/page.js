import { redirectToRecordStore } from "@/lib/admin-store";

export const dynamic = "force-dynamic";

/*
 * Old shared admin URL. The admin is separated by store, so this opens
 * the wholesale page inside the only store that has it.
 */
export default async function LegacyWholesaleRedirect({ searchParams }) {
  await redirectToRecordStore({
    path: "/wholesale",
    fixedStorefrontId: "ecoware",
    searchParams: await Promise.resolve(searchParams || {})
  });
}
