import HeroV3 from "@/components/HeroV3";
import RiceSizeShowcaseV3 from "@/components/RiceSizeShowcaseV3";
import FeaturedProducts from "@/components/FeaturedProducts";
import Testimonials from "@/components/Testimonials";
import CTASection from "@/components/CTASection";
import RecipeInspiration from "@/components/RecipeInspiration";
import { getStorefrontProducts } from "@/lib/storefront-products";

export const dynamic = "force-dynamic";

export default async function Home() {
  const products = await getStorefrontProducts();

  return (
    <main>
      <HeroV3 />

      <FeaturedProducts products={products} />

      <RiceSizeShowcaseV3 products={products} />

      <Testimonials />

      <CTASection />

      <RecipeInspiration />
    </main>
  );
}