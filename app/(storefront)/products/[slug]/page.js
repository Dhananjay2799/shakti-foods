import { notFound } from "next/navigation";
import ProductDetailClient from "@/components/ProductDetailClient";
import { createSupabaseAdmin } from "@/lib/supabase-admin";
import {
  getStorefrontProductBySlug,
  getStorefrontProducts } from "@/lib/storefront-products";
import { site } from "@/lib/site";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }) {
  const resolvedParams = await Promise.resolve(params);

  const product = await getStorefrontProductBySlug(resolvedParams.slug);

  if (!product) {
    return {};
  }

  // Fallback to primary product image if no gallery array is present
  const productImages =
    product.images?.length > 0
      ? product.images.map((image) => (typeof image === "string" ? image : image.url))
      : product.image
      ? [product.image]
      : [];

  return {
    title: product.seo?.title || product.name,
    description: product.seo?.description || product.subtitle,
    keywords: product.seo?.keywords || [],
    alternates: {
      canonical: `/products/${product.slug}`
    },
    openGraph: {
      title: product.seo?.title || product.name,
      description: product.seo?.description || product.subtitle,
      url: `${site.baseUrl}/products/${product.slug}`,
      images: productImages,
      type: "website"
    }
  };
}

export default async function ProductPage({ params }) {
  const resolvedParams = await Promise.resolve(params);

  const storefrontProducts = await getStorefrontProducts();

  const product =
    storefrontProducts.find(
      (item) => item.slug === resolvedParams.slug
    ) || null;

  if (!product) {
    notFound();
  }

  const relatedProducts = storefrontProducts
    .filter((item) => {
      if (item.id === product.id) {
        return false;
      }

      if (
        product.categoryId &&
        item.categoryId === product.categoryId
      ) {
        return true;
      }

      return item.category === product.category;
    })
    .slice(0, 4);

  const supabase = createSupabaseAdmin();

  const [
    specificationsResult,
    certificationsResult,
    priceTiersResult,
    reviewsResult,
    subscriptionSettingsResult,
    subscriptionFrequenciesResult
  ] = await Promise.all([
    supabase
      .from("product_specifications")
      .select("*")
      .eq("product_id", product.id)
      .maybeSingle(),

    supabase
      .from("product_certifications")
      .select(`
        id,
        certificate_number,
        issued_at,
        expires_at,
        document_url,
        verification_status,
        certification:certifications (
          id,
          code,
          name,
          issuing_organization,
          description,
          logo_url,
          verification_url
        )
      `)
      .eq("product_id", product.id)
      .order("created_at", {
        ascending: true
      }),

    supabase
      .from("product_price_tiers")
      .select(`
        id,
        min_quantity,
        max_quantity,
        unit_price_cents,
        tier_name,
        sort_order
      `)
      .eq("product_id", product.id)
      .eq("is_active", true)
      .order("min_quantity", {
        ascending: true
      }),

      supabase
        .from("product_reviews")
        .select(`
          id,
          customer_name,
          rating,
          review_title,
          review_text,
          verified_purchase,
          created_at
        `)
        .eq("product_id", product.id)
        .eq("status", "approved")
        .order("created_at", {
          ascending: false
        }),

    supabase
      .from("product_subscription_settings")
      .select(`
        product_id,
        is_enabled,
        discount_percent,
        minimum_quantity
      `)
      .eq("product_id", product.id)
      .maybeSingle(),

    supabase
      .from("product_subscription_frequencies")
      .select(`
        id,
        product_id,
        interval_unit,
        interval_count,
        label,
        sort_order,
        is_active
      `)
      .eq("product_id", product.id)
      .eq("is_active", true)
      .order("sort_order", {
        ascending: true
      })
  ]);

  if (specificationsResult.error) {
    console.error("Unable to load product specifications:", specificationsResult.error);
  }

  if (certificationsResult.error) {
    console.error("Unable to load certifications:", certificationsResult.error);
  }

  if (priceTiersResult.error) {
    console.error("Unable to load product price tiers:", priceTiersResult.error);
  }

  if (reviewsResult.error) {
  console.error("Unable to load product reviews:", reviewsResult.error);
  }

  if (subscriptionSettingsResult.error) {
    console.error(
      "Unable to load subscription settings:",
      subscriptionSettingsResult.error
    );
  }

  if (subscriptionFrequenciesResult.error) {
    console.error(
      "Unable to load subscription frequencies:",
      subscriptionFrequenciesResult.error
    );
  }

  // 1. Clamp available stock at zero
  const availableStock = Math.max(
    Number(product.inventory?.stock_quantity || 0) -
      Number(product.inventory?.reserved_quantity || 0),
    0
  );

  // 2. Include all gallery images in metadata and JSON-LD
  const productImages =
    product.images?.length > 0
      ? product.images.map((image) => (typeof image === "string" ? image : image.url))
      : product.image
      ? [product.image]
      : [];

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    image: productImages,
    description: product.shortDescription || product.subtitle,
    brand: {
      "@type": "Brand",
      name: product.categoryId === "rice" ? "Shakti Foods" : "Simpli Ecoware"
    },
    category: product.category,
    sku: product.sku || undefined,
    offers: product.unitPrice
      ? {
          "@type": "Offer",
          priceCurrency: product.currency || "USD",
          price: product.unitPrice,
          availability:
            availableStock > 0
              ? "https://schema.org/InStock"
              : "https://schema.org/OutOfStock",
          url: `${site.baseUrl}/products/${product.slug}`
        }
      : undefined
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(jsonLd)
        }}
      />

      <ProductDetailClient
        product={product}
        specifications={
          specificationsResult.data || null
        }
        certifications={
          certificationsResult.data || []
        }
        priceTiers={
          priceTiersResult.data || []
        }
        relatedProducts={
          relatedProducts
        }
        reviews={
          reviewsResult.data || []
        }
        subscriptionSettings={
          subscriptionSettingsResult.data || null
        }
        subscriptionFrequencies={
          subscriptionFrequenciesResult.data || []
        }
      />
    </>
  );
}