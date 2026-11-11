/*
 * Tabs on the admin Edit product page. Shared by the page, the form and
 * updateProduct (which sends you back to the tab you saved from).
 */
export const PRODUCT_EDIT_TABS = [
  { id: "details", label: "Details" },
  { id: "pricing", label: "Pricing" },
  { id: "subscribe", label: "Subscribe & Save" },
  { id: "inventory", label: "Inventory" },
  { id: "storefront", label: "Storefront" }
];

export function normalizeProductEditTab(value) {
  const id = String(value || "").trim().toLowerCase();

  return PRODUCT_EDIT_TABS.some((tab) => tab.id === id) ? id : "details";
}
