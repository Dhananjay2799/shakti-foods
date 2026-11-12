import { headers } from "next/headers";
import { products } from "@/lib/data";
import { site } from "@/lib/site";
import { getEcowareHostname } from "@/lib/storefront-hosts";
import {
  ECOWARE_STOREFRONT,
  getStorefrontPath
} from "@/lib/storefront-config";
import {
  getStorefrontProducts,
  PUBLIC_STOREFRONTS
} from "@/lib/storefront-products";

/*
 * One deployment serves two websites, so /sitemap.xml depends on the host:
 *   Simpli Ecoware hosts -> Ecoware pages only.
 *   Every other host     -> Shakti Foods pages only.
 */

// Pages worth finding in Google. Cart and checkout are left out on purpose.
const SHAKTI_PAGES = [
  "",
  "/products",
  "/about",
  "/contact",
  "/shipping",
  "/returns",
  "/faq",
  "/privacy",
  "/terms"
];

/*
 * Only Shakti Foods' own live products. (The old list also had the
 * Simpli Ecoware products, which are not on this site: Google got a
 * "not found" page for each and reported them as noindex / 404.)
 */
async function shaktiSitemap() {
  const lastModified = new Date();
  let productSlugs = [];

  try {
    const shaktiProducts = await getStorefrontProducts(PUBLIC_STOREFRONTS.SHAKTI);
    productSlugs = shaktiProducts.map((product) => product.slug).filter(Boolean);
  } catch (error) {
    console.error("Unable to load Shakti Foods products for sitemap:", error);
  }

  if (productSlugs.length === 0) {
    // Catalog unavailable: fall back to the built-in Shakti Foods products.
    productSlugs = products
      .filter((product) => product.category === "Rice")
      .map((product) => product.slug);
  }

  return [
    ...SHAKTI_PAGES.map((route) => ({
      url: `${site.baseUrl}${route}`,
      lastModified
    })),
    ...[...new Set(productSlugs)].map((slug) => ({
      url: `${site.baseUrl}/products/${encodeURIComponent(slug)}`,
      lastModified
    }))
  ];
}

const ECOWARE_PAGES = [
  "/",
  "/products",
  "/about",
  "/sustainability",
  "/sample-requests",
  "/wholesale/quote",
  "/shipping",
  "/returns",
  "/faq",
  "/privacy",
  "/terms"
];

async function ecowareSitemap(hostname) {
  const baseUrl = `https://${hostname}`;
  const lastModified = new Date();

  const pageUrl = (path) =>
    `${baseUrl}${getStorefrontPath(ECOWARE_STOREFRONT, path)}`;

  let productSlugs = [];

  try {
    const ecowareProducts = await getStorefrontProducts(
      PUBLIC_STOREFRONTS.ECOWARE
    );

    productSlugs = ecowareProducts
      .map((product) => product.slug)
      .filter(Boolean);
  } catch (error) {
    // Still publish the static pages if the catalog cannot be loaded.
    console.error("Unable to load Ecoware products for sitemap:", error);
  }

  return [
    ...ECOWARE_PAGES.map((path) => ({
      url: pageUrl(path),
      lastModified
    })),
    ...productSlugs.map((slug) => ({
      url: pageUrl(`/products/${encodeURIComponent(slug)}`),
      lastModified
    }))
  ];
}

export default async function sitemap() {
  const ecowareHostname = getEcowareHostname(headers().get("host"));

  if (ecowareHostname) {
    return ecowareSitemap(ecowareHostname);
  }

  return shaktiSitemap();
}
