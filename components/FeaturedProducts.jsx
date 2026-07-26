import Link from "next/link";
import ProductCard from "@/components/ProductCard";
import SectionHeading from "@/components/SectionHeading";

export default function FeaturedProducts({
  products = []
}) {
  const featuredProducts = products
    .filter(
      (product) =>
        product.featured === true ||
        product.isFeatured === true ||
        product.is_featured === true
    )
    .sort((first, second) => {
      const firstOrder = Number(
        first.displayOrder ??
          first.display_order ??
          999
      );

      const secondOrder = Number(
        second.displayOrder ??
          second.display_order ??
          999
      );

      if (firstOrder !== secondOrder) {
        return firstOrder - secondOrder;
      }

      return String(
        first.name || ""
      ).localeCompare(
        String(second.name || "")
      );
    })
    .slice(0, 4);

  if (featuredProducts.length === 0) {
    return null;
  }

  return (
    <section className="section-pad bg-[#f8f4ed] py-16 text-black md:py-24">
      <div className="container-brand">
        <div className="flex flex-wrap items-end justify-between gap-6">
          <SectionHeading
            eyebrow="Featured Products"
            title="Hand-picked products for your home and business."
            text="Explore featured Shakti Foods rice and Simpli Ecoware products selected from the admin portal."
          />

          <Link
            href="/products"
            className="inline-flex rounded-full border border-black px-6 py-3 text-sm font-bold text-black transition hover:bg-black hover:text-white"
          >
            View All Products
          </Link>
        </div>

        <div className="mt-10 grid gap-6 sm:grid-cols-2 xl:grid-cols-4">
          {featuredProducts.map(
            (product, index) => (
              <ProductCard
                key={product.id}
                product={product}
                index={index}
              />
            )
          )}
        </div>
      </div>
    </section>
  );
}