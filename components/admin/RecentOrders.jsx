import Link from "next/link";

function formatMoney(cents = 0) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD"
  }).format(Number(cents) / 100);
}

function formatDate(value) {
  if (!value) return "Unknown";

  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "America/New_York"
  }).format(new Date(value));
}

function paymentBadge(status = "") {
  switch (status.toLowerCase()) {
    case "paid":
      return "bg-green-100 text-green-800";

    case "pending":
      return "bg-yellow-100 text-yellow-800";

    case "failed":
      return "bg-red-100 text-red-800";

    case "refunded":
      return "bg-blue-100 text-blue-800";

    default:
      return "bg-gray-100 text-gray-700";
  }
}

function fulfillmentBadge(status = "") {
  switch (status.toLowerCase()) {
    case "fulfilled":
      return "bg-green-100 text-green-800";

    case "processing":
      return "bg-blue-100 text-blue-800";

    case "shipped":
      return "bg-purple-100 text-purple-800";

    case "cancelled":
      return "bg-red-100 text-red-800";

    default:
      return "bg-[#eee7db] text-black";
  }
}

export default function RecentOrders({
  orders = []
}) {
  return (
    <section className="rounded-[2rem] bg-white p-5 shadow md:p-7">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="font-display text-3xl font-bold text-black">
            Recent Orders
          </h2>

          <p className="mt-1 text-sm text-black/60">
            Most recent customer orders
          </p>
        </div>

        <span className="rounded-full bg-black px-4 py-2 text-sm font-bold text-white">
          {orders.length}
        </span>
      </div>

      {orders.length === 0 ? (
        <div className="mt-8 rounded-xl border border-dashed border-gray-300 p-8 text-center">
          <p className="text-black/60">
            No orders have been placed yet.
          </p>
        </div>
      ) : (
        <div className="mt-6 overflow-x-auto">
          <table className="w-full min-w-[760px] text-left">
            <thead>
              <tr className="border-b border-black/10 text-sm text-black/50">
                <th className="pb-3 pr-5">Customer</th>
                <th className="pb-3 pr-5">Email</th>
                <th className="pb-3 pr-5">Payment</th>
                <th className="pb-3 pr-5">Fulfillment</th>
                <th className="pb-3 pr-5">Total</th>
                <th className="pb-3 pr-5">Date</th>
                <th className="pb-3 text-right">Action</th>
              </tr>
            </thead>

            <tbody>
              {orders.map((order) => (
                <tr
                  key={order.id}
                  className="border-b border-black/5 transition hover:bg-[#faf7f2]"
                >
                  <td className="py-4 pr-5 font-semibold">
                    {order.customer_name || "Guest"}
                  </td>

                  <td className="py-4 pr-5 text-black/70">
                    {order.customer_email || "Not provided"}
                  </td>

                  <td className="py-4 pr-5">
                    <span
                      className={`rounded-full px-3 py-1 text-xs font-bold ${paymentBadge(
                        order.payment_status
                      )}`}
                    >
                      {order.payment_status || "Unknown"}
                    </span>
                  </td>

                  <td className="py-4 pr-5">
                    <span
                      className={`rounded-full px-3 py-1 text-xs font-bold ${fulfillmentBadge(
                        order.fulfillment_status
                      )}`}
                    >
                      {order.fulfillment_status || "New"}
                    </span>
                  </td>

                  <td className="py-4 pr-5 font-bold">
                    {formatMoney(order.total_amount)}
                  </td>

                  <td className="py-4 pr-5 text-black/60">
                    {formatDate(order.created_at)}
                  </td>

                  <td className="py-4 text-right">
                    <Link
                      href={`/admin/orders/${order.id}`}
                      className="font-semibold text-black underline-offset-4 hover:underline"
                    >
                      View
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}