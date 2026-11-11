export const ADMIN_STOREFRONTS = {
  shakti_foods: {
    id: "shakti_foods",
    slug: "shakti-foods",
    name: "Shakti Foods",
    shortName: "Shakti",
    description:
      "Manage Shakti Foods products, rice inventory, orders, subscriptions, customers, and reviews.",
    publicUrl: "https://shaktifoodsus.com"
  },

  ecoware: {
    id: "ecoware",
    slug: "ecoware",
    name: "Simpli Ecoware",
    shortName: "Ecoware",
    description:
      "Manage Ecoware products, inventory, orders, samples, wholesale inquiries, quotes, and reviews.",
    publicUrl: "https://simpliecoware.vercel.app"
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

/*
 * The store last opened in the admin. Set by the middleware whenever an
 * /admin/<store>/… page is opened, so an old shared link such as
 * /admin/products can open the same store's page.
 */
export const ADMIN_STORE_COOKIE = "admin_store";

export function getAdminStorefrontById(storefrontId) {
  return ADMIN_STOREFRONTS[storefrontId] || null;
}

export function isAdminStorefrontSlug(slug) {
  return Boolean(getAdminStorefront(slug));
}
