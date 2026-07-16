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

export default function RecentOrders({ orders }) {
  return (
    <section className="rounded-[2rem] bg-white p-5 shadow md:p-7">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="font-display text-3xl font-bold text-black">
            Recent Orders
          </h2>

          <p className="mt-1 text-sm text-black/60">
            Most recent completed checkouts
          </p>
        </div>

        <span className="rounded-full bg-black px-4 py-2 text-sm font-bold text-white">
          {orders.length}
        </span>
      </div>

      {orders.length === 0 ? (
        <p className="mt-6 text-black/60">
          No orders are available yet.
        </p>
      ) : (
        <div className="mt-6 overflow-x-auto">
          <table className="w-full min-w-[720px] text-left">
            <thead>
              <tr className="border-b border-black/10 text-sm text-black/50">
                <th className="pb-3 pr-5">Customer</th>
                <th className="pb-3 pr-5">Email</th>
                <th className="pb-3 pr-5">Payment</th>
                <th className="pb-3 pr-5">Fulfillment</th>
                <th className="pb-3 pr-5">Total</th>
                <th className="pb-3">Date</th>
              </tr>
            </thead>

            <tbody>
              {orders.map((order) => (
                <tr
                  key={order.id}
                  className="border-b border-black/5 text-sm"
                >
                  <td className="py-4 pr-5 font-bold text-black">
                    {order.customer_name || "Guest"}
                  </td>

                  <td className="py-4 pr-5 text-black/70">
                    {order.customer_email || "Not provided"}
                  </td>

                  <td className="py-4 pr-5">
                    <span className="rounded-full bg-green-100 px-3 py-1 font-bold text-green-800">
                      {order.payment_status || "unknown"}
                    </span>
                  </td>

                  <td className="py-4 pr-5">
                    <span className="rounded-full bg-[#eee7db] px-3 py-1 font-bold text-black">
                      {order.fulfillment_status || "new"}
                    </span>
                  </td>

                  <td className="py-4 pr-5 font-bold text-black">
                    {formatMoney(order.total_amount)}
                  </td>

                  <td className="py-4 text-black/60">
                    {formatDate(order.created_at)}
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