import Link from "next/link";
import {
  adjustInventory,
  updateInventorySettings
} from "@/app/admin/inventory/actions";

/*
 * Stock adjustment and inventory settings for one product, shown on the
 * store's own Inventory page (/admin/<store>/inventory?adjust=<productId>).
 */
export default function InventoryAdjustPanel({ item, closeHref }) {
  const stock = Number(item.stock_quantity || 0);
  const reserved = Number(item.reserved_quantity || 0);
  const available = Math.max(stock - reserved, 0);

  return (
    <section
      id="adjust"
      className="scroll-mt-40 rounded-[2rem] border border-black/10 bg-white p-5 shadow md:p-7"
    >
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="text-sm font-bold uppercase tracking-[.16em] text-black/50">
            {item.product_id}
          </div>
          <h2 className="mt-2 font-display text-3xl font-bold text-black">
            {item.product_name}
          </h2>
          <div className="mt-4 flex flex-wrap gap-2 text-sm font-bold">
            <span className="rounded-full bg-[#eee7db] px-4 py-2">Stock: {stock.toLocaleString()}</span>
            <span className="rounded-full bg-amber-100 px-4 py-2 text-amber-800">Reserved: {reserved.toLocaleString()}</span>
            <span className={`rounded-full px-4 py-2 ${available <= 0 ? "bg-red-100 text-red-800" : "bg-green-100 text-green-800"}`}>
              Available: {available.toLocaleString()}
            </span>
          </div>
        </div>

        <Link
          href={closeHref}
          className="rounded-full bg-black/5 px-4 py-2 text-sm font-bold text-black transition hover:bg-black/10"
        >
          Close
        </Link>
      </div>

    <div className="mt-7 grid gap-5 lg:grid-cols-2">
      {/* Stock Adjustment */}
      <form
        action={adjustInventory}
        aria-label={`Adjust inventory for ${item.product_name}`}
        className="rounded-2xl bg-[#faf7f1] p-5"
      >
        <h3 className="text-xl font-bold text-black">
          Adjust Stock
        </h3>

        <p className="mt-1 text-sm text-black/55">
          Positive numbers add stock. Negative numbers remove stock.
        </p>

        <input
          type="hidden"
          name="productId"
          value={item.product_id}
        />

        <label className="mt-5 grid gap-2">
          <span className="text-sm font-bold">
            Quantity adjustment
          </span>

          <input
            type="number"
            inputMode="numeric"
            name="adjustment"
            required
            step="1"
            placeholder="Example: 10 or -3"
            className="rounded-2xl border border-black/15 bg-white px-4 py-3 outline-none focus:border-black"
          />
        </label>

        <label className="mt-4 grid gap-2">
          <span className="text-sm font-bold">
            Reason
          </span>

          <select
            name="reason"
            required
            className="rounded-2xl border border-black/15 bg-white px-4 py-3 outline-none focus:border-black"
          >
            <option value="purchase_order_received">
              Purchase order received
            </option>

            <option value="customer_return">
              Customer return
            </option>

            <option value="warehouse_damage">
              Warehouse damage
            </option>

            <option value="cycle_count_adjustment">
              Cycle count adjustment
            </option>

            <option value="shrinkage">
              Shrinkage
            </option>

            <option value="supplier_replacement">
              Supplier replacement
            </option>

            <option value="transfer_in">
              Transfer in
            </option>

            <option value="transfer_out">
              Transfer out
            </option>

            <option value="other">
              Other
            </option>
          </select>
        </label>

        <button
          type="submit"
          className="mt-5 w-full rounded-full bg-black px-6 py-3 font-bold text-white transition hover:bg-black/80"
        >
          Apply Adjustment
        </button>
      </form>

      {/* Product Settings */}
      <form
        action={updateInventorySettings}
        aria-label={`Inventory settings for ${item.product_name}`}
        className="rounded-2xl bg-[#faf7f1] p-5"
      >
        <h3 className="text-xl font-bold text-black">
          Product Settings
        </h3>

        <p className="mt-1 text-sm text-black/55">
          Configure thresholds and storefront availability.
        </p>

        <input
          type="hidden"
          name="productId"
          value={item.product_id}
        />

        <label className="mt-5 grid gap-2">
          <span className="text-sm font-bold">
            Low-stock threshold
          </span>

          <input
            type="number"
            inputMode="numeric"
            name="lowStockThreshold"
            min="0"
            step="1"
            defaultValue={item.low_stock_threshold}
            required
            className="rounded-2xl border border-black/15 bg-white px-4 py-3 outline-none focus:border-black"
          />
        </label>

        <label className="mt-5 flex items-center gap-3 rounded-2xl bg-white px-4 py-4">
          <input
            type="checkbox"
            name="isActive"
            defaultChecked={item.is_active}
            className="h-5 w-5"
          />

          <span className="font-bold text-black">
            Product is active
          </span>
        </label>

        <button
          type="submit"
          className="mt-5 w-full rounded-full bg-black px-6 py-3 font-bold text-white transition hover:bg-black/80"
        >
          Save Settings
        </button>
      </form>
    </div>
    </section>
  );
}
