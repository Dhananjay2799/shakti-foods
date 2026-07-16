import Link from "next/link";
import { createSupabaseAdmin } from "@/lib/supabase-admin";
import {
  adjustInventory,
  updateInventorySettings
} from "@/app/admin/inventory/actions";

export const dynamic = "force-dynamic";

function getAvailable(item) {
  return (
    Number(item.stock_quantity || 0) -
    Number(item.reserved_quantity || 0)
  );
}

export default async function AdminInventoryPage() {
  const supabase = createSupabaseAdmin();

  const { data, error } = await supabase
    .from("inventory")
    .select(
      `
        product_id,
        product_name,
        stock_quantity,
        reserved_quantity,
        low_stock_threshold,
        is_active,
        updated_at
      `
    )
    .order("product_name");

  if (error) {
    console.error(
      "Unable to load inventory:",
      error
    );
  }

  const inventory = data || [];

  return (
    <main className="min-h-screen bg-[#f8f6f1]">
      <div className="mx-auto max-w-7xl px-5 py-10 md:px-8 md:py-12">
        <div className="flex flex-wrap items-end justify-between gap-5">
          <div>
            <h1 className="font-display text-5xl font-bold text-black">
              Inventory
            </h1>

            <p className="mt-2 text-black/60">
              Manage stock, reservations and product availability.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <Link
                href="/admin/inventory/history"
                className="rounded-full bg-black px-5 py-3 font-bold text-white"
            >
            Transaction History
            </Link>

            <Link
              href="/admin"
              className="rounded-full bg-[#eadfce] px-5 py-3 font-bold text-black"
            >
            Back to Dashboard
            </Link>
          </div>
        </div>

        <div className="mt-10 grid gap-6">
          {inventory.map((item) => {
            const available = getAvailable(item);

            const isLowStock =
              item.is_active &&
              available <=
                Number(
                  item.low_stock_threshold || 0
                );

            return (
              <section
                key={item.product_id}
                className="rounded-[2rem] bg-white p-5 shadow md:p-7"
              >
                <div className="flex flex-wrap items-start justify-between gap-5">
                  <div>
                    <div className="text-sm font-bold uppercase tracking-[.16em] text-black/50">
                      {item.product_id}
                    </div>

                    <h2 className="mt-2 font-display text-3xl font-bold text-black">
                      {item.product_name}
                    </h2>

                    <div className="mt-4 flex flex-wrap gap-2">
                      <span className="rounded-full bg-[#eee7db] px-4 py-2 text-sm font-bold text-black">
                        Stock: {item.stock_quantity}
                      </span>

                      <span className="rounded-full bg-amber-100 px-4 py-2 text-sm font-bold text-amber-800">
                        Reserved:{" "}
                        {item.reserved_quantity}
                      </span>

                      <span
                        className={`rounded-full px-4 py-2 text-sm font-bold ${
                          isLowStock
                            ? "bg-red-100 text-red-800"
                            : "bg-green-100 text-green-800"
                        }`}
                      >
                        Available: {available}
                      </span>

                      <span
                        className={`rounded-full px-4 py-2 text-sm font-bold ${
                          item.is_active
                            ? "bg-green-100 text-green-800"
                            : "bg-gray-200 text-gray-700"
                        }`}
                      >
                        {item.is_active
                          ? "Active"
                          : "Inactive"}
                      </span>
                    </div>
                  </div>

                  {isLowStock ? (
                    <div className="rounded-2xl bg-red-50 px-5 py-4 font-bold text-red-800">
                      Low-stock warning
                    </div>
                  ) : null}
                </div>

                <div className="mt-7 grid gap-5 lg:grid-cols-2">
                  <form
                    action={adjustInventory}
                    className="rounded-2xl bg-[#faf7f1] p-5"
                  >
                    <h3 className="text-xl font-bold text-black">
                      Adjust Stock
                    </h3>

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
                        className="rounded-2xl border border-black/15 bg-white px-4 py-3 outline-none focus:border-black"
                      >
                        <option value="stock_received">
                          Stock received
                        </option>

                        <option value="damaged">
                          Damaged stock
                        </option>

                        <option value="correction">
                          Inventory correction
                        </option>

                        <option value="returned">
                          Customer return
                        </option>

                        <option value="other">
                          Other
                        </option>
                      </select>
                    </label>

                    <button
                      type="submit"
                      className="mt-5 w-full rounded-full bg-black px-6 py-3 font-bold text-white"
                    >
                      Apply Adjustment
                    </button>
                  </form>

                  <form
                    action={updateInventorySettings}
                    className="rounded-2xl bg-[#faf7f1] p-5"
                  >
                    <h3 className="text-xl font-bold text-black">
                      Product Settings
                    </h3>

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
                        name="lowStockThreshold"
                        min="0"
                        step="1"
                        defaultValue={
                          item.low_stock_threshold
                        }
                        required
                        className="rounded-2xl border border-black/15 bg-white px-4 py-3 outline-none focus:border-black"
                      />
                    </label>

                    <label className="mt-5 flex items-center gap-3 rounded-2xl bg-white px-4 py-4">
                      <input
                        type="checkbox"
                        name="isActive"
                        defaultChecked={
                          item.is_active
                        }
                        className="h-5 w-5"
                      />

                      <span className="font-bold text-black">
                        Product is active
                      </span>
                    </label>

                    <button
                      type="submit"
                      className="mt-5 w-full rounded-full bg-black px-6 py-3 font-bold text-white"
                    >
                      Save Settings
                    </button>
                  </form>
                </div>
              </section>
            );
          })}
        </div>
      </div>
    </main>
  );
}