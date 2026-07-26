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

function getInventoryStatus(item) {
  const available = getAvailable(item);
  const threshold = Number(
    item.low_stock_threshold || 0
  );

  if (!item.is_active) {
    return "inactive";
  }

  if (available <= 0) {
    return "out_of_stock";
  }

  if (available <= threshold) {
    return "low_stock";
  }

  return "healthy";
}

function InventoryKpi({
  label,
  value,
  description
}) {
  return (
    <div className="rounded-[2rem] bg-white p-5 shadow md:p-6">
      <div className="text-sm font-bold uppercase tracking-[.14em] text-black/45">
        {label}
      </div>

      <div className="mt-3 font-display text-4xl font-bold text-black">
        {typeof value === "number" ? value.toLocaleString() : value}
      </div>

      <div className="mt-2 text-sm text-black/55">
        {description}
      </div>
    </div>
  );
}

function InventoryStatusBadge({ status }) {
  const styles = {
    healthy:
      "bg-green-100 text-green-800",
    low_stock:
      "bg-amber-100 text-amber-800",
    out_of_stock:
      "bg-red-100 text-red-800",
    inactive:
      "bg-gray-200 text-gray-700"
  };

  const labels = {
    healthy: "Healthy",
    low_stock: "Low Stock",
    out_of_stock: "Out of Stock",
    inactive: "Inactive"
  };

  return (
    <span
      className={`rounded-full px-4 py-2 text-sm font-bold ${
        styles[status] ||
        "bg-gray-100 text-gray-700"
      }`}
    >
      {labels[status] || status}
    </span>
  );
}

function buildInventoryHref({
  search = "",
  status = "all"
}) {
  const params = new URLSearchParams();

  if (search) {
    params.set("search", search);
  }

  if (status && status !== "all") {
    params.set("status", status);
  }

  const queryString = params.toString();

  return queryString
    ? `/admin/inventory?${queryString}`
    : "/admin/inventory";
}

export default async function AdminInventoryPage({
  searchParams
}) {
  const resolvedSearchParams =
    await Promise.resolve(searchParams);

  const search = String(
    resolvedSearchParams?.search || ""
  ).trim();

  const selectedStatus = String(
    resolvedSearchParams?.status || "all"
  ).trim();

  const ALLOWED_STATUSES = Object.freeze([
    "all",
    "healthy",
    "low_stock",
    "out_of_stock",
    "active",
    "inactive"
  ]);

  const status = ALLOWED_STATUSES.includes(
    selectedStatus
  )
    ? selectedStatus
    : "all";

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

  const rawInventory = data || [];

  /*
   * Preprocess inventory items once to attach status & availability,
   * avoiding repeated calculations during filtering, counts, and rendering.
   */
  const inventory = rawInventory.map((item) => ({
    ...item,
    available: getAvailable(item),
    inventoryStatus: getInventoryStatus(item)
  }));

  /*
   * KPIs calculated from full inventory dataset
   */
  const totalProducts = inventory.length;

  const totalStock = inventory.reduce(
    (total, item) =>
      total + Number(item.stock_quantity || 0),
    0
  );

  const totalReserved = inventory.reduce(
    (total, item) =>
      total + Number(item.reserved_quantity || 0),
    0
  );

  const totalAvailable = inventory.reduce(
    (total, item) => total + item.available,
    0
  );

  const healthyCount = inventory.filter(
    (item) => item.inventoryStatus === "healthy"
  ).length;

  const lowStockCount = inventory.filter(
    (item) => item.inventoryStatus === "low_stock"
  ).length;

  const outOfStockCount = inventory.filter(
    (item) => item.inventoryStatus === "out_of_stock"
  ).length;

  const activeCount = inventory.filter(
    (item) => item.is_active
  ).length;

  const inactiveCount = inventory.filter(
    (item) => !item.is_active
  ).length;

  const normalizedSearch = search.toLowerCase();

  const filteredInventory = inventory.filter((item) => {
    const matchesSearch =
      !normalizedSearch ||
      String(item.product_name || "")
        .toLowerCase()
        .includes(normalizedSearch) ||
      String(item.product_id || "")
        .toLowerCase()
        .includes(normalizedSearch);

    let matchesStatus = true;

    if (status === "active") {
      matchesStatus = item.is_active;
    } else if (status === "inactive") {
      matchesStatus = !item.is_active;
    } else if (status !== "all") {
      matchesStatus = item.inventoryStatus === status;
    }

    return matchesSearch && matchesStatus;
  });

  const filterOptions = [
    {
      value: "all",
      label: "All",
      count: totalProducts
    },
    {
      value: "healthy",
      label: "Healthy",
      count: healthyCount
    },
    {
      value: "low_stock",
      label: "Low Stock",
      count: lowStockCount
    },
    {
      value: "out_of_stock",
      label: "Out of Stock",
      count: outOfStockCount
    },
    {
      value: "active",
      label: "Active",
      count: activeCount
    },
    {
      value: "inactive",
      label: "Inactive",
      count: inactiveCount
    }
  ];

  return (
    <main className="min-h-screen bg-[#f8f6f1]">
      <div className="mx-auto max-w-7xl px-5 py-10 md:px-8 md:py-12">
        <div className="flex flex-wrap items-end justify-between gap-5">
          <div>
            <div className="text-sm font-bold uppercase tracking-[.18em] text-black/50">
              Warehouse Operations
            </div>

            <h1 className="mt-2 font-display text-5xl font-bold text-black md:text-6xl">
              Inventory
            </h1>

            <p className="mt-3 text-black/60">
              Manage stock, reservations,
              thresholds and product
              availability.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <Link
              href="/admin/inventory/history"
              className="rounded-full bg-black px-5 py-3 font-bold text-white transition hover:bg-black/80"
            >
              Transaction History
            </Link>

            <Link
              href="/admin"
              className="rounded-full bg-[#eadfce] px-5 py-3 font-bold text-black transition hover:bg-[#dfd1bc]"
            >
              Back to Dashboard
            </Link>
          </div>
        </div>

        {error ? (
          <div className="mt-8 rounded-3xl border border-red-200 bg-red-50 p-5 font-semibold text-red-800">
            Inventory could not be loaded. Please refresh the page. If the problem continues, check the server logs.
          </div>
        ) : null}

        {/* KPI Cards */}
        <section className="mt-10 grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
          <InventoryKpi
            label="Products"
            value={totalProducts}
            description="Inventory records"
          />

          <InventoryKpi
            label="Stock Units"
            value={totalStock}
            description="Physical units"
          />

          <InventoryKpi
            label="Reserved"
            value={totalReserved}
            description="Checkout reservations"
          />

          <InventoryKpi
            label="Available"
            value={totalAvailable}
            description="Sellable units"
          />

          <InventoryKpi
            label="Needs Attention"
            value={lowStockCount + outOfStockCount}
            description={`${lowStockCount.toLocaleString()} low · ${outOfStockCount.toLocaleString()} out`}
          />
        </section>

        {/* Search */}
        <section className="mt-8 rounded-[2rem] bg-white p-5 shadow md:p-6">
          <form
            method="get"
            aria-label="Search inventory"
            className="grid gap-4 lg:grid-cols-[1fr_auto_auto]"
          >
            <label className="grid gap-2">
              <span className="text-sm font-bold text-black">
                Search inventory
              </span>

              <input
                type="search"
                name="search"
                defaultValue={search}
                placeholder="Search by product name or product ID"
                className="rounded-2xl border border-black/15 bg-white px-4 py-3 text-black outline-none focus:border-black"
              />
            </label>

            <input
              type="hidden"
              name="status"
              value={status}
            />

            <button
              type="submit"
              className="self-end rounded-full bg-black px-6 py-3 font-bold text-white transition hover:bg-black/80"
            >
              Search
            </button>

            <Link
              href="/admin/inventory"
              className="self-end rounded-full bg-[#eee7db] px-6 py-3 text-center font-bold text-black transition hover:bg-[#e3d8c7]"
            >
              Reset
            </Link>
          </form>

          {/* Status Filters */}
          <div className="mt-6 flex flex-wrap gap-2">
            {filterOptions.map((option) => {
              const isSelected = status === option.value;

              return (
                <Link
                  key={option.value}
                  href={buildInventoryHref({
                    search,
                    status: option.value
                  })}
                  className={`rounded-full px-4 py-2 text-sm font-bold transition ${
                    isSelected
                      ? "bg-black text-white"
                      : "bg-[#f2ede4] text-black hover:bg-[#e5dac8]"
                  }`}
                >
                  {option.label}{" "}
                  <span
                    className={
                      isSelected
                        ? "text-white/70"
                        : "text-black/45"
                    }
                  >
                    {option.count.toLocaleString()}
                  </span>
                </Link>
              );
            })}
          </div>
        </section>

        <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
          <p className="font-semibold text-black/65">
            Showing {filteredInventory.length.toLocaleString()} of{" "}
            {inventory.length.toLocaleString()} products
          </p>

          {search ? (
            <p className="text-sm text-black/50">
              Search: “{search}”
            </p>
          ) : null}
        </div>

        {/* Inventory Products */}
        <div className="mt-6 grid gap-6">
          {filteredInventory.length === 0 ? (
            <section className="rounded-[2rem] bg-white p-10 text-center shadow">
              <h2 className="font-display text-3xl font-bold text-black">
                No inventory records found
              </h2>

              <p className="mt-3 text-black/60">
                Try changing the search term
                or inventory filter.
              </p>

              <Link
                href="/admin/inventory"
                className="mt-6 inline-flex rounded-full bg-black px-6 py-3 font-bold text-white"
              >
                Clear Filters
              </Link>
            </section>
          ) : (
            filteredInventory.map((item) => {
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
                          Stock: {Number(item.stock_quantity || 0).toLocaleString()}
                        </span>

                        <span className="rounded-full bg-amber-100 px-4 py-2 text-sm font-bold text-amber-800">
                          Reserved: {Number(item.reserved_quantity || 0).toLocaleString()}
                        </span>

                        <span
                          className={`rounded-full px-4 py-2 text-sm font-bold ${
                            item.available <= 0
                              ? "bg-red-100 text-red-800"
                              : "bg-green-100 text-green-800"
                          }`}
                        >
                          Available: {item.available.toLocaleString()}
                        </span>

                        <InventoryStatusBadge status={item.inventoryStatus} />
                      </div>

                      <p className="mt-4 text-sm text-black/50">
                        Low-stock threshold: {Number(item.low_stock_threshold || 0).toLocaleString()}
                      </p>
                    </div>

                    {item.inventoryStatus === "low_stock" ? (
                      <div className="rounded-2xl bg-amber-50 px-5 py-4 font-bold text-amber-800">
                        Low-stock warning
                      </div>
                    ) : null}

                    {item.inventoryStatus === "out_of_stock" ? (
                      <div className="rounded-2xl bg-red-50 px-5 py-4 font-bold text-red-800">
                        Out of stock
                      </div>
                    ) : null}
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
            })
          )}
        </div>
      </div>
    </main>
  );
}