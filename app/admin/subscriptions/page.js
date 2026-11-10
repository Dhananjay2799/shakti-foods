import { redirectToRecordStore } from "@/lib/admin-store";

export const dynamic = "force-dynamic";

/*
 * Old shared admin URL. The admin is separated by store, so this opens
 * the subscriptions page inside the only store that has it.
 */
export default async function LegacySubscriptionsRedirect({ searchParams }) {
  await redirectToRecordStore({
    path: "/subscriptions",
    fixedStorefrontId: "shakti_foods",
    searchParams: await Promise.resolve(searchParams || {})
  });
}
