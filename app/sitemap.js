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
 *   Every other host     -> the Shakti Foods sitemap, unchanged.
 */

function shaktiSitemap() {
  const routes = ["", "/products", "/about", "/contact", "/cart", "/checkout"].map((route) => ({
    url: `${site.baseUrl}${route}`,
    lastModified: new Date()
  }));

  const productRoutes = products.map((product) => ({
    url: `${site.baseUrl}/products/${product.slug}`,
    lastModified: new Date()
  }));

  return [...routes, ...productRoutes];
}

const ECOWARE_PAGES = [
  "/",
  "/products",
  "/about",
  "/sustainability",
  "/sample-requests",
  "/wholesale/quote"
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
