export const ADMIN_STOREFRONTS = {
  shakti_foods: {
    id: "shakti_foods",
    slug: "shakti-foods",
    name: "Shakti Foods",
    shortName: "Shakti",
    description:
      "Manage Shakti Foods products, rice inventory, orders, subscriptions, customers, and reviews.",
    publicUrl: "https://www.shakti-foods.com"
  },

  ecoware: {
    id: "ecoware",
    slug: "ecoware",
    name: "Simpli Ecoware",
    shortName: "Ecoware",
    description:
      "Manage Ecoware products, inventory, orders, samples, wholesale inquiries, quotes, and reviews.",
    publicUrl: "https://www.simpliecoware.com"
  }
};

export function getAdminStorefront(slug) {
  return Object.values(
    ADMIN_STOREFRONTS
  ).find(
    (storefront) =>
      storefront.slug === slug
  ) || null;
}