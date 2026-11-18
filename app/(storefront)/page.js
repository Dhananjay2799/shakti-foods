import HeroV3 from "@/components/HeroV3";
import RiceSizeShowcaseV3 from "@/components/RiceSizeShowcaseV3";
import FeaturedProducts from "@/components/FeaturedProducts";
import Testimonials from "@/components/Testimonials";
import CTASection from "@/components/CTASection";
import RecipeInspiration from "@/components/RecipeInspiration";
import { getStorefrontProducts } from "@/lib/storefront-products";
import { site } from "@/lib/site";

export const dynamic = "force-dynamic";

// Tells search engines the homepage's one address (metadataBase in
// app/layout.js, i.e. https://shaktifoodsus.com).
export const metadata = {
  alternates: {
    canonical: "/"
  }
};

/*
 * For Google: who we are, and which image to use as this page's
 * thumbnail in search results (primaryImageOfPage). Without it Google
 * picked the tall phone banner and squeezed it into a square box.
 */
function homeJsonLd() {
  const url = site.baseUrl.replace(/\/$/, "");
  const image = (path, width, height) => ({
    "@type": "ImageObject",
    url: `${url}${path}`,
    width,
    height
  });

  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Organization",
        "@id": `${url}/#organization`,
        name: site.name,
        url,
        logo: image("/images/logo-shakti.png", 1320, 1192),
        image: image("/images/share/shakti-og.jpg", 1200, 630),
        telephone: site.phone,
        email: site.email,
        address: {
          "@type": "PostalAddress",
          addressLocality: "Fort Lauderdale",
          addressRegion: "FL",
          addressCountry: "US"
        }
      },
      {
        "@type": "WebSite",
        "@id": `${url}/#website`,
        url,
        name: site.name,
        publisher: { "@id": `${url}/#organization` }
      },
      {
        "@type": "WebPage",
        "@id": `${url}/#webpage`,
        url,
        name: "Shakti Foods | Premium Basmati Rice & Simpli Ecoware",
        isPartOf: { "@id": `${url}/#website` },
        about: { "@id": `${url}/#organization` },
        primaryImageOfPage: image("/images/share/shakti-square.jpg", 1200, 1200),
        image: [
          image("/images/share/shakti-square.jpg", 1200, 1200),
          image("/images/share/shakti-og.jpg", 1200, 630)
        ]
      }
    ]
  };
}

export default async function Home() {
  const products = await getStorefrontProducts();

  return (
    <main>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(homeJsonLd()) }}
      />

      <HeroV3 />

      <FeaturedProducts products={products} />

      <RiceSizeShowcaseV3 products={products} />

      <Testimonials />

      <CTASection />

      <RecipeInspiration />
    </main>
  );
}