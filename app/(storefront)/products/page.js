import SectionHeading from "@/components/SectionHeading";
import RiceSizeShowcaseV3 from "@/components/RiceSizeShowcaseV3";
import EcoWareShowcaseV3 from "@/components/EcoWareShowcaseV3";
import ProductGrid from "@/components/ProductGrid";

export const metadata = {
  title: "Products",
  description: "Shop Shakti Foods premium Basmati rice or request wholesale pricing for Simpli Ecoware compostable plates, bowls, trays, and food boxes."
};

export default function ProductsPage() {
  return (
    <main className="bg-brand-radial pt-24 text-black md:pt-28">
      <section className="section-pad py-14 md:py-20">
        <div className="container-brand">
          <SectionHeading eyebrow="Products" title="Premium rice and Simpli Ecoware collections." text="Buy small rice packs online or request wholesale pricing for bulk rice and compostable foodservice products." />
        </div>
      </section>
      <RiceSizeShowcaseV3 />
      <EcoWareShowcaseV3 />
      <ProductGrid />
    </main>
  );
}
