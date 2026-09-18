import Link from "next/link";
import { notFound } from "next/navigation";
import { createSupabaseAdmin } from "@/lib/supabase-admin";
import { getAdminStorefront } from "@/lib/admin-storefronts";

export const dynamic = "force-dynamic";

function buildInventoryHref({
  basePath,
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
    ? `${basePath}/inventory?${queryString}`
    : `${basePath}/inventory`;
}

export default async function AdminInventoryPage({
  params,
  searchParams
}) {
  const resolvedParams = await Promise.resolve(params);

  const storefront = getAdminStorefront(
    resolvedParams.storefront
  );

  if (!storefront) {
    notFound();
  }

  const resolvedSearchParams = await Promise.resolve(searchParams);
  const search = (resolvedSearchParams?.search || "").trim().toLowerCase();
  const status = resolvedSearchParams?.status || "all";

  const supabase = createSupabaseAdmin();

  const { data, error } = await supabase
    .from("inventory")
    .select(`
      product_id,
      product_name,
      stock_quantity,
      reserved_quantity,
      low_stock_threshold,
      is_active,
      updated_at
    `)
    .eq("storefront", storefront.id)
    .order("product_name");

  if (error) {
    console.error(`Unable to load ${storefront.name} inventory:`, error);
  }

  const allInventory = data || [];

  const filteredInventory = allInventory.filter((item) => {
    const stockQuantity = Number(item.stock_quantity || 0);
    const reservedQuantity = Number(item.reserved_quantity || 0);
    const threshold = Number(item.low_stock_threshold || 0);
    const available = stockQuantity - reservedQuantity;

    const matchesSearch =
      !search ||
      item.product_name?.toLowerCase().includes(search) ||
      item.product_id?.toLowerCase().includes(search);

    let matchesStatus = true;
    if (status === "low") {
      matchesStatus = available <= threshold;
    } else if (status === "out") {
      matchesStatus = available <= 0;
    } else if (status === "active") {
      matchesStatus = Boolean(item.is_active);
    } else if (status === "inactive") {
      matchesStatus = !item.is_active;
    }

    return matchesSearch && matchesStatus;
  });

  const basePath = `/admin/${storefront.slug}`;

  const statusOptions = [
    { label: "All Items", value: "all" },
    { label: "Low Stock", value: "low" },
    { label: "Out of Stock", value: "out" },
    { label: "Active", value: "active" },
    { label: "Inactive", value: "inactive" }
  ];

  return (
    <div className="grid gap-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="text-sm font-bold uppercase tracking-[0.18em] text-black/50">
            {storefront.name} Inventory
          </div>
          <h1 className="mt-2 font-display text-4xl font-bold text-black md:text-5xl">
            Stock Management
          </h1>
          <p className="mt-2 text-black/60">
            Monitor and adjust stock levels, reserved units, and low-stock thresholds for {storefront.name}.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <Link
            href={basePath}
            className="rounded-full bg-white px-5 py-3 text-sm font-bold text-black shadow transition hover:bg-black/5"
          >
            ← Back to Dashboard
          </Link>
          <Link
            href={`${basePath}/inventory/history`}
            className="rounded-full bg-[#eadfce] px-5 py-3 text-sm font-bold text-black transition hover:bg-[#dfd1bc]"
          >
            View Stock History
          </Link>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-4 rounded-3xl border border-black/10 bg-white p-6 shadow-soft">
        <form className="flex w-full flex-wrap items-center gap-4 md:w-auto">
          <input
            type="text"
            name="search"
            defaultValue={search}
            placeholder="Search products or SKU..."
            className="w-full rounded-2xl border border-black/15 bg-white px-4 py-2.5 text-sm outline-none focus:border-black md:w-72"
          />
          {status !== "all" ? (
            <input type="hidden" name="status" value={status} />
          ) : null}
          <button
            type="submit"
            className="rounded-2xl bg-black px-5 py-2.5 text-sm font-bold text-white transition hover:bg-black/80"
          >
            Filter
          </button>
        </form>

        <div className="flex flex-wrap items-center gap-2">
          {statusOptions.map((option) => (
            <Link
              key={option.value}
              href={buildInventoryHref({
                basePath,
                search,
                status: option.value
              })}
              className={`rounded-full px-4 py-2 text-xs font-bold transition ${
                status === option.value
                  ? "bg-black text-white"
                  : "bg-black/5 text-black hover:bg-black/10"
              }`}
            >
              {option.label}
            </Link>
          ))}
        </div>
      </div>

      <div className="overflow-hidden rounded-3xl border border-black/10 bg-white shadow-soft">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-black">
            <thead className="border-b border-black/10 bg-[#fbf9f5] text-[11px] font-bold uppercase tracking-wider text-black/60">
              <tr>
                <th scope="col" className="px-6 py-4">Product Name</th>
                <th scope="col" className="px-6 py-4">In Stock</th>
                <th scope="col" className="px-6 py-4">Reserved</th>
                <th scope="col" className="px-6 py-4">Available</th>
                <th scope="col" className="px-6 py-4">Threshold</th>
                <th scope="col" className="px-6 py-4">Status</th>
                <th scope="col" className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-black/5">
              {filteredInventory.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-black/50 font-medium">
                    No inventory records found for {storefront.name}.
                  </td>
                </tr>
              ) : (
                filteredInventory.map((item) => {
                  const stockQuantity = Number(item.stock_quantity || 0);
                  const reservedQuantity = Number(item.reserved_quantity || 0);
                  const threshold = Number(item.low_stock_threshold || 0);
                  const available = Math.max(stockQuantity - reservedQuantity, 0);

                  return (
                    <tr key={item.product_id} className="transition hover:bg-black/[0.02]">
                      <td className="px-6 py-4 font-bold text-black">
                        <div>{item.product_name || item.product_id}</div>
                        <div className="text-xs font-normal text-black/40">{item.product_id}</div>
                      </td>
                      <td className="px-6 py-4 font-semibold text-black">
                        {stockQuantity}
                      </td>
                      <td className="px-6 py-4 text-black/60">
                        {reservedQuantity}
                      </td>
                      <td className="px-6 py-4 font-bold text-black">
                        {available}
                      </td>
                      <td className="px-6 py-4 text-black/60">
                        {threshold}
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-bold ${
                          available <= 0
                            ? "bg-red-50 text-red-700"
                            : available <= threshold
                            ? "bg-amber-50 text-amber-700"
                            : "bg-emerald-50 text-emerald-700"
                        }`}>
                          {available <= 0
                            ? "Out of Stock"
                            : available <= threshold
                            ? "Low Stock"
                            : "In Stock"}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <Link
                          href={`${basePath}/inventory/${item.product_id}`}
                          className="font-bold text-black underline underline-offset-4 hover:text-black/70"
                        >
                          Adjust
                        </Link>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}