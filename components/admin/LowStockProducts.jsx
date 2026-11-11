import Link from "next/link";
import { ArrowRight, Boxes, Check } from "lucide-react";

/** "Inventory health" card on the dashboard. */
export default function LowStockProducts({
  products = [],
  inventoryHref = ""
}) {
  const shown = products.slice(0, 5);

  return (
    <section className="flex flex-col rounded-2xl border border-black/10 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <h2 className="text-lg font-bold text-black">
          Inventory health
        </h2>

        <Boxes size={18} className="text-black/40" aria-hidden="true" />
      </div>

      {products.length === 0 ? (
        <div className="mt-4 flex-1">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-50 text-emerald-700">
              <Check size={18} />
            </span>

            <p className="font-bold text-black">
              No low-stock alerts
            </p>
          </div>

          <p className="mt-3 text-sm leading-6 text-black/55">
            Products at or below their low-stock level will appear here.
          </p>
        </div>
      ) : (
        <ul className="mt-4 grid flex-1 content-start gap-2">
          {shown.map((product) => {
            const available =
              Number(product.stock_quantity || 0) -
              Number(product.reserved_quantity || 0);

            return (
              <li
                key={product.product_id}
                className="flex items-center justify-between gap-4 rounded-xl bg-amber-50 px-3.5 py-2.5"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-bold text-black">
                    {product.product_name}
                  </p>

                  <p className="text-xs text-black/55">
                    Alert at {product.low_stock_threshold}
                  </p>
                </div>

                <p className="shrink-0 text-right text-sm font-bold text-amber-800">
                  {available} left
                </p>
              </li>
            );
          })}

          {products.length > shown.length ? (
            <li className="px-1 text-xs text-black/50">
              +{products.length - shown.length} more
            </li>
          ) : null}
        </ul>
      )}

      {inventoryHref ? (
        <Link
          href={inventoryHref}
          className="mt-5 inline-flex items-center justify-center gap-2 rounded-xl border border-black/10 px-4 py-2.5 text-sm font-bold text-black transition hover:bg-black/[0.03]"
        >
          Manage inventory
          <ArrowRight size={16} />
        </Link>
      ) : null}
    </section>
  );
}
