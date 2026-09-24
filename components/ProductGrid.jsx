import ProductCard from "@/components/ProductCard";

export default function ProductGrid({
  products = [],
}) {
  if (products.length === 0) {
    return (
      <div className="rounded-[24px] border border-[#eadfce] bg-white p-10 text-center">
        <h2 className="font-display text-3xl font-bold text-[#17120f]">
          No products available
        </h2>

        <p className="mt-3 text-sm leading-6 text-[#6f665e]">
          There are no active rice products available right now.
        </p>
      </div>
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {products.map((product, index) => (
        <ProductCard
          key={product.id}
          product={product}
          index={index}
        />
      ))}
    </div>
  );
}