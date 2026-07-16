import { products } from "@/lib/data";
import { site } from "@/lib/site";

export default function sitemap() {
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
