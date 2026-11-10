import { redirectToRecordStore, redirectToRememberedStore } from "@/lib/admin-store";

export const dynamic = "force-dynamic";

/*
 * Old shared admin URL. The admin is separated by store, so this opens
 * the product page inside the product's own store.
 */
export default async function LegacyProductPageRedirect({ params, searchParams }) {
  const resolvedParams = await Promise.resolve(params || {});
  const resolvedSearchParams = await Promise.resolve(searchParams || {});
  const [first = "", ...rest] = (resolvedParams.path || []).map((part) =>
    decodeURIComponent(String(part))
  );

  if (first === "new") {
    redirectToRememberedStore("/products/new", resolvedSearchParams);
  }

  const suffix = rest.length
    ? `/${rest.map(encodeURIComponent).join("/")}`
    : "";

  await redirectToRecordStore({
    table: "products",
    column: "product_id",
    value: first,
    path: `/products/${encodeURIComponent(first)}${suffix}`,
    searchParams: resolvedSearchParams
  });
}
