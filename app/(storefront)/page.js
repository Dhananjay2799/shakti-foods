import HeroV3 from "@/components/HeroV3";
import RiceSizeShowcaseV3 from "@/components/RiceSizeShowcaseV3";
import EcoWareShowcaseV3 from "@/components/EcoWareShowcaseV3";
import ProductGrid from "@/components/ProductGrid";
import Testimonials from "@/components/Testimonials";
import CTASection from "@/components/CTASection";

export default function Home() {
  return (
    <main>
      <HeroV3 />
      <RiceSizeShowcaseV3 />
      <EcoWareShowcaseV3 />
      <ProductGrid />
      <Testimonials />
      <CTASection />
    </main>
  );
}
