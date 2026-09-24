import Link from "next/link";
import { notFound } from "next/navigation";
import { createSupabaseAdmin } from "@/lib/supabase-admin";
import { getAdminStorefront } from "@/lib/admin-storefronts";

export const dynamic = "force-dynamic";

export default async function AdminOrdersPage({
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
  const statusFilter = resolvedSearchParams?.status || "all";
  const searchFilter = (resolvedSearchParams?.search || "").trim();

  const supabase = createSupabaseAdmin();

  let query = supabase
    .from("orders")
    .select(`
      id,
      stripe_session_id,
      customer_name,
      customer_email,
      customer_phone,
      payment_status,
      fulfillment_status,
      subtotal,
      shipping_amount,
      tax_amount,
      total_amount,
      created_at,
      storefront
    `)
    .eq(
      "storefront",
      storefront.id
    )
    .order("created_at", {
      ascending: false
    });

  if (statusFilter && statusFilter !== "all") {
    query = query.eq("fulfillment_status", statusFilter);
  }

  const { data: ordersData, error } = await query;

  if (error) {
    console.error(`Unable to load ${storefront.name} orders:`, error);
  }

  const allOrders = ordersData || [];

  const orders = searchFilter
    ? allOrders.filter((order) => {
        const query = searchFilter.toLowerCase();
        return (
          order.id?.toLowerCase().includes(query) ||
          order.customer_name?.toLowerCase().includes(query) ||
          order.customer_email?.toLowerCase().includes(query)
        );
      })
    : allOrders;

  const basePath = `/admin/${storefront.slug}`;

  return (
    <div className="grid gap-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="text-sm font-bold uppercase tracking-[0.18em] text-black/50">
            {storefront.name} Order Management
          </div>
          <h1 className="mt-2 font-display text-4xl font-bold text-black md:text-5xl">
            Orders
          </h1>
          <p className="mt-2 text-black/60">
            Monitor, fulfill, and track customer purchases for {storefront.name}.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href={basePath}
            className="rounded-full bg-white px-5 py-3 text-sm font-bold text-black shadow transition hover:bg-black/5"
          >
            ← Back to Dashboard
          </Link>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-4 rounded-3xl border border-black/10 bg-white p-6 shadow-soft">
        <form className="flex w-full flex-wrap items-center gap-4 md:w-auto">
          <input
            type="text"
            name="search"
            defaultValue={searchFilter}
            placeholder="Search by Order ID, Name, Email..."
            className="w-full rounded-2xl border border-black/15 bg-white px-4 py-2.5 text-sm outline-none focus:border-black md:w-80"
          />
          {statusFilter !== "all" && (
            <input type="hidden" name="status" value={statusFilter} />
          )}
          <button
            type="submit"
            className="rounded-2xl bg-black px-5 py-2.5 text-sm font-bold text-white transition hover:bg-black/80"
          >
            Search
          </button>
          {searchFilter && (
            <Link
              href={`${basePath}/orders`}
              className="text-sm font-bold text-black underline underline-offset-4 hover:text-black/70"
            >
              Reset
            </Link>
          )}
        </form>

        <div className="flex flex-wrap items-center gap-2">
          {["all", "unfulfilled", "fulfilled", "cancelled"].map((status) => (
            <Link
              key={status}
              href={`${basePath}/orders?status=${status}${
                searchFilter ? `&search=${encodeURIComponent(searchFilter)}` : ""
              }`}
              className={`rounded-full px-4 py-2 text-xs font-bold capitalize transition ${
                statusFilter === status
                  ? "bg-black text-white"
                  : "bg-black/5 text-black hover:bg-black/10"
              }`}
            >
              {status}
            </Link>
          ))}
        </div>
      </div>

      <div className="overflow-hidden rounded-3xl border border-black/10 bg-white shadow-soft">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-black">
            <thead className="border-b border-black/10 bg-[#fbf9f5] text-[11px] font-bold uppercase tracking-wider text-black/60">
              <tr>
                <th scope="col" className="px-6 py-4">Order ID</th>
                <th scope="col" className="px-6 py-4">Customer</th>
                <th scope="col" className="px-6 py-4">Date</th>
                <th scope="col" className="px-6 py-4">Payment</th>
                <th scope="col" className="px-6 py-4">Fulfillment</th>
                <th scope="col" className="px-6 py-4">Total</th>
                <th scope="col" className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-black/5">
              {orders.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center font-medium text-black/50">
                    No orders found for {storefront.name}.
                  </td>
                </tr>
              ) : (
                orders.map((order) => {
                  const createdDate = order.created_at
                    ? new Date(order.created_at).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric"
                      })
                    : "—";

                  return (
                    <tr key={order.id} className="transition hover:bg-black/[0.02]">
                      <td className="px-6 py-4 font-bold text-black">
                        #{order.id.slice(0, 8)}
                      </td>
                      <td className="px-6 py-4">
                        <div className="font-bold text-black">{order.customer_name || "Guest"}</div>
                        <div className="text-xs text-black/50">{order.customer_email}</div>
                      </td>
                      <td className="px-6 py-4 text-black/70">
                        {createdDate}
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-bold uppercase tracking-wider ${
                          order.payment_status === "paid"
                            ? "bg-emerald-50 text-emerald-700"
                            : "bg-amber-50 text-amber-700"
                        }`}>
                          {order.payment_status || "pending"}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-bold uppercase tracking-wider ${
                          order.fulfillment_status === "fulfilled"
                            ? "bg-blue-50 text-blue-700"
                            : "bg-gray-100 text-gray-700"
                        }`}>
                          {order.fulfillment_status || "unfulfilled"}
                        </span>
                      </td>
                      <td className="px-6 py-4 font-bold text-black">
                        ${(Number(order.total_amount || 0) / 100).toFixed(2)}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <Link
                          href={`${basePath}/orders/${order.id}`}
                          className="font-bold text-black underline underline-offset-4 hover:text-black/70"
                        >
                          View Details
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