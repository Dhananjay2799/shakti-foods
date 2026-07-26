import ProductCard from "@/components/ProductCard";

export default function ProductGrid({
  products = []
}) {
  return (
    <section className="section-pad pb-20">
      <div className="container-brand">
        {products.length === 0 ? (
          <div className="rounded-[2rem] border border-black/5 bg-white p-10 text-center shadow-soft">
            <h2 className="font-display text-3xl font-bold text-black">
              No products available
            </h2>

            <p className="mt-3 text-sm leading-6 text-black/55">
              There are no active products in this
              category right now.
            </p>
          </div>
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
            {products.map(
              (product, index) => (
                <ProductCard
                  key={product.id}
                  product={product}
                  index={index}
                />
              )
            )}
          </div>
        )}
      </div>
    </section>
  );
}