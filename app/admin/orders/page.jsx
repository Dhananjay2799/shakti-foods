import { createSupabaseAdmin } from "@/lib/supabase-admin";
import Link from "next/link";

export const dynamic = "force-dynamic";

function formatMoney(cents) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD"
  }).format(Number(cents || 0) / 100);
}

function formatDate(value) {
  if (!value) return "Unknown";

  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "America/New_York"
  }).format(new Date(value));
}

export default async function AdminOrdersPage() {
  const supabase = createSupabaseAdmin();

  const { data: orders, error } = await supabase
    .from("orders")
    .select(
      `
        id,
        stripe_session_id,
        customer_name,
        customer_email,
        customer_phone,
        payment_status,
        fulfillment_status,
        total_amount,
        created_at
      `
    )
    .order("created_at", {
      ascending: false
    });

  if (error) {
    console.error("Unable to load orders:", error);
  }

  const orderList = orders || [];

  return (
    <main className="min-h-screen bg-[#f8f6f1]">
      <div className="mx-auto max-w-7xl px-5 py-10 md:px-8 md:py-12">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="font-display text-5xl font-bold text-black">
              Orders
            </h1>

            <p className="mt-2 text-black/60">
              Review customer orders and payment status.
            </p>
          </div>

          <span className="rounded-full bg-black px-5 py-3 font-bold text-white">
            {orderList.length} orders
          </span>
        </div>

        <section className="mt-10 overflow-hidden rounded-[2rem] bg-white shadow">
          {orderList.length === 0 ? (
            <div className="p-8 text-black/60">
              No orders are available.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[950px] text-left">
                <thead>
                  <tr className="border-b border-black/10 bg-[#faf7f1] text-sm text-black/55">
                    <th className="px-6 py-4">Customer</th>
                    <th className="px-6 py-4">Email</th>
                    <th className="px-6 py-4">Payment</th>
                    <th className="px-6 py-4">Fulfillment</th>
                    <th className="px-6 py-4">Total</th>
                    <th className="px-6 py-4">Date</th>
                    {/* Added Details header here */}
                    <th className="px-6 py-4">Details</th>
                  </tr>
                </thead>

                <tbody>
                  {orderList.map((order) => (
                    <tr
                      key={order.id}
                      className="border-b border-black/5"
                    >
                      <td className="px-6 py-5 font-bold text-black">
                        {order.customer_name || "Guest"}
                      </td>

                      <td className="px-6 py-5 text-black/70">
                        {order.customer_email || "Not provided"}
                      </td>

                      <td className="px-6 py-5">
                        <span className="rounded-full bg-green-100 px-3 py-1 text-sm font-bold text-green-800">
                          {order.payment_status || "unknown"}
                        </span>
                      </td>

                      <td className="px-6 py-5">
                        <span className="rounded-full bg-[#eee7db] px-3 py-1 text-sm font-bold text-black">
                          {order.fulfillment_status || "new"}
                        </span>
                      </td>

                      <td className="px-6 py-5 font-bold text-black">
                        {formatMoney(order.total_amount)}
                      </td>

                      <td className="px-6 py-5 text-black/60">
                        {formatDate(order.created_at)}
                      </td>
                      
                      {/* Added Details link cell here */}
                      <td className="px-6 py-5">
                        <Link
                          href={`/admin/orders/${order.id}`}
                          className="inline-flex rounded-full bg-black px-4 py-2 text-sm font-bold text-white transition hover:bg-[#333333]"
                        >
                          View Details
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}