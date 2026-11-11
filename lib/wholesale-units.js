/*
 * Units a wholesale buyer can choose, per store. Shared by the inquiry form
 * (browser) and the admin email (server), so keep it free of server imports.
 */

export const QUANTITY_UNIT_LABELS = {
  bags: "Bags",
  cases: "Cases",
  packs: "Packs",
  units: "Units",
  pallets: "Pallets",
  lb: "Pounds (lb)"
};

export const WHOLESALE_UNITS = {
  shakti_foods: ["bags", "pallets", "lb"],
  ecoware: ["cases", "packs", "units", "pallets"]
};

export function getWholesaleUnits(storefront) {
  return WHOLESALE_UNITS[storefront] || WHOLESALE_UNITS.shakti_foods;
}
