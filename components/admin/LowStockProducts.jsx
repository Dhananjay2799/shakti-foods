export default function LowStockProducts({ products }) {
  return (
    <section className="rounded-[2rem] bg-white p-5 shadow md:p-7">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-display text-3xl font-bold text-black">
            Low Stock
          </h2>

          <p className="mt-1 text-sm text-black/60">
            Products at or below their threshold
          </p>
        </div>

        <span className="rounded-full bg-red-100 px-4 py-2 text-sm font-bold text-red-800">
          {products.length}
        </span>
      </div>

      {products.length === 0 ? (
        <div className="mt-6 rounded-2xl bg-green-50 p-5 text-green-800">
          All active products currently have healthy stock.
        </div>
      ) : (
        <div className="mt-6 grid gap-3">
          {products.map((product) => {
            const available =
              Number(product.stock_quantity || 0) -
              Number(product.reserved_quantity || 0);

            return (
              <div
                key={product.product_id}
                className="flex items-center justify-between gap-4 rounded-2xl bg-red-50 p-4"
              >
                <div>
                  <p className="font-bold text-black">
                    {product.product_name}
                  </p>

                  <p className="mt-1 text-sm text-black/60">
                    Threshold: {product.low_stock_threshold}
                  </p>
                </div>

                <div className="text-right">
                  <p className="text-2xl font-bold text-red-700">
                    {available}
                  </p>

                  <p className="text-xs font-bold uppercase tracking-wide text-red-700">
                    Available
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}