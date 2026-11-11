import Link from "next/link";
import { ArrowRight } from "lucide-react";

function formatMoney(cents = 0) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD"
  }).format(Number(cents) / 100);
}

function formatDate(value) {
  if (!value) return "";

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZone: "America/New_York"
  }).format(new Date(value));
}

function label(status, fallback) {
  const text = String(status || "").trim().replace(/_/g, " ");

  return text
    ? text.charAt(0).toUpperCase() + text.slice(1)
    : fallback;
}

const PAYMENT_STYLES = {
  paid: "bg-emerald-50 text-emerald-700 ring-emerald-600/20",
  pending: "bg-amber-50 text-amber-800 ring-amber-600/20",
  failed: "bg-red-50 text-red-700 ring-red-600/20",
  refunded: "bg-sky-50 text-sky-700 ring-sky-600/20",
  partially_refunded: "bg-sky-50 text-sky-700 ring-sky-600/20"
};

const FULFILLMENT_STYLES = {
  new: "bg-amber-50 text-amber-800 ring-amber-600/20",
  pending: "bg-amber-50 text-amber-800 ring-amber-600/20",
  processing: "bg-sky-50 text-sky-700 ring-sky-600/20",
  packed: "bg-sky-50 text-sky-700 ring-sky-600/20",
  shipped: "bg-indigo-50 text-indigo-700 ring-indigo-600/20",
  delivered: "bg-emerald-50 text-emerald-700 ring-emerald-600/20",
  fulfilled: "bg-emerald-50 text-emerald-700 ring-emerald-600/20"
};

const NEUTRAL = "bg-black/[0.04] text-black/60 ring-black/10";

function Badge({ className, children }) {
  return (
    <span
      className={`inline-flex w-fit items-center rounded-md px-2 py-0.5 text-xs font-semibold ring-1 ring-inset ${className}`}
    >
      {children}
    </span>
  );
}

export default function RecentOrders({
  // Store admin base, e.g. /admin/ecoware (old shared URLs redirect).
  basePath = "/admin",
  orders = []
}) {
  return (
    <section className="overflow-hidden rounded-2xl border border-black/10 bg-white shadow-sm">
      <div className="flex items-start justify-between gap-4 px-5 pb-4 pt-5">
        <div>
          <h2 className="text-lg font-bold text-black">
            Recent orders
          </h2>

          <p className="mt-0.5 text-sm text-black/55">
            The latest orders from customers
          </p>
        </div>

        <Link
          href={`${basePath}/orders`}
          className="inline-flex shrink-0 items-center gap-1.5 text-sm font-bold text-black transition hover:gap-2"
        >
          View all
          <ArrowRight size={16} />
        </Link>
      </div>

      {orders.length === 0 ? (
        <div className="mx-5 mb-5 rounded-xl border border-dashed border-black/15 p-8 text-center text-sm text-black/55">
          No orders have been placed yet.
        </div>
      ) : (
        <>
          <ul className="divide-y divide-black/[0.07] border-t border-black/[0.07]">
            {orders.map((order) => {
              const payment = String(order.payment_status || "").toLowerCase();
              const fulfillment = String(order.fulfillment_status || "").toLowerCase();

              return (
                <li key={order.id}>
                  <Link
                    href={`${basePath}/orders/${order.id}`}
                    className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 gap-y-2 px-5 py-3.5 transition hover:bg-[#faf7f2] sm:grid-cols-[minmax(0,1fr)_7.5rem_7.5rem_6.5rem]"
                  >
                    <div className="min-w-0">
                      <p className="font-mono text-sm font-bold text-black">
                        #{String(order.id || "").slice(0, 8).toUpperCase()}
                      </p>

                      <p className="mt-0.5 truncate text-sm text-black/55">
                        {order.customer_name || order.customer_email || "Guest"}
                        {order.created_at ? (
                          <span className="text-black/35"> · {formatDate(order.created_at)}</span>
                        ) : null}
                      </p>
                    </div>

                    <p className="text-right text-sm font-bold text-black sm:order-last">
                      {formatMoney(order.total_amount)}
                    </p>

                    <div className="col-span-2 flex flex-wrap gap-2 sm:contents">
                      <Badge className={PAYMENT_STYLES[payment] || NEUTRAL}>
                        {label(order.payment_status, "Unknown")}
                      </Badge>

                      <Badge className={FULFILLMENT_STYLES[fulfillment] || NEUTRAL}>
                        {label(order.fulfillment_status, "New")}
                      </Badge>
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>

          <div className="flex items-center justify-between border-t border-black/[0.07] px-5 py-3 text-sm text-black/50">
            <span>
              Showing {orders.length} latest order{orders.length === 1 ? "" : "s"}
            </span>
            <span>USD</span>
          </div>
        </>
      )}
    </section>
  );
}
