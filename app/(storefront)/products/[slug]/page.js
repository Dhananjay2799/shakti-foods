import { notFound } from "next/navigation";
import ProductDetailClient from "@/components/ProductDetailClient";
import { getProductBySlug, products } from "@/lib/data";
import { site } from "@/lib/site";

export function generateStaticParams() {
  return products.map((product) => ({ slug: product.slug }));
}

export function generateMetadata({ params }) {
  const product = getProductBySlug(params.slug);
  if (!product) return {};
  return {
    title: product.seo?.title || product.name,
    description: product.seo?.description || product.subtitle,
    keywords: product.seo?.keywords || [],
    alternates: { canonical: `/products/${product.slug}` },
    openGraph: {
      title: product.seo?.title || product.name,
      description: product.seo?.description || product.subtitle,
      url: `${site.baseUrl}/products/${product.slug}`,
      images: [product.image],
      type: "website"
    }
  };
}

export default function ProductPage({ params }) {
  const product = getProductBySlug(params.slug);
  if (!product) notFound();

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    image: `${site.baseUrl}${product.image}`,
    description: product.shortDescription,
    brand: product.category === "Rice" ? "Shakti Foods" : "Simpli Ecoware",
    category: product.category,
    offers: product.canCheckout
      ? {
          "@type": "Offer",
          priceCurrency: "USD",
          price: product.unitPrice,
          availability: "https://schema.org/InStock",
          url: `${site.baseUrl}/products/${product.slug}`
        }
      : {
          "@type": "Offer",
          priceCurrency: "USD",
          availability: "https://schema.org/InStock",
          url: `${site.baseUrl}/products/${product.slug}`
        }
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <ProductDetailClient product={product} />
    </>
  );
}
