import Link from "next/link";
import { createSupabaseAdmin } from "@/lib/supabase-admin";

export const dynamic = "force-dynamic";

const PAYMENT_STATUSES = [
  "paid",
  "unpaid",
  "pending",
  "refunded",
  "failed"
];

const FULFILLMENT_STATUSES = [
  "new",
  "processing",
  "packed",
  "shipped",
  "delivered",
  "canceled"
];

function formatMoney(cents) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD"
  }).format(Number(cents || 0) / 100);
}

function formatDate(value) {
  if (!value) {
    return "Unknown";
  }

  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "America/New_York"
  }).format(new Date(value));
}

function normalizeValue(value) {
  return typeof value === "string"
    ? value.trim()
    : "";
}

function isValidUuid(value) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value
  );
}

function getStartDate(period) {
  const now = new Date();

  switch (period) {
    case "today": {
      const start = new Date(now);
      start.setHours(0, 0, 0, 0);
      return start;
    }

    case "yesterday": {
      const start = new Date(now);
      start.setDate(start.getDate() - 1);
      start.setHours(0, 0, 0, 0);
      return start;
    }

    case "7days": {
      const start = new Date(now);
      start.setDate(start.getDate() - 7);
      return start;
    }

    case "30days": {
      const start = new Date(now);
      start.setDate(start.getDate() - 30);
      return start;
    }

    default:
      return null;
  }
}

function getEndDate(period) {
  if (period !== "yesterday") {
    return null;
  }

  const end = new Date();
  end.setHours(0, 0, 0, 0);

  return end;
}

function paymentBadgeClass(status) {
  switch (status) {
    case "paid":
      return "bg-green-100 text-green-800";

    case "refunded":
      return "bg-purple-100 text-purple-800";

    case "failed":
      return "bg-red-100 text-red-800";

    case "pending":
      return "bg-amber-100 text-amber-800";

    default:
      return "bg-gray-100 text-gray-700";
  }
}

function fulfillmentBadgeClass(status) {
  switch (status) {
    case "delivered":
      return "bg-green-100 text-green-800";

    case "shipped":
      return "bg-blue-100 text-blue-800";

    case "packed":
      return "bg-indigo-100 text-indigo-800";

    case "processing":
      return "bg-amber-100 text-amber-800";

    case "canceled":
      return "bg-red-100 text-red-800";

    default:
      return "bg-[#eee7db] text-black";
  }
}

export default async function AdminOrdersPage({
  searchParams
}) {
  const resolvedSearchParams =
    await Promise.resolve(searchParams);

  const search = normalizeValue(
    resolvedSearchParams?.search
  );

  const paymentStatus = normalizeValue(
    resolvedSearchParams?.payment
  );

  const fulfillmentStatus = normalizeValue(
    resolvedSearchParams?.fulfillment
  );

  const period = normalizeValue(
    resolvedSearchParams?.period
  );

  const supabase = createSupabaseAdmin();

  let query = supabase
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
        subtotal,
        shipping_amount,
        tax_amount,
        total_amount,
        created_at
      `
    )
    .order("created_at", {
      ascending: false
    });

  if (
    paymentStatus &&
    paymentStatus !== "all" &&
    PAYMENT_STATUSES.includes(paymentStatus)
  ) {
    query = query.eq(
      "payment_status",
      paymentStatus
    );
  } else if (!paymentStatus) {
    query = query.eq(
      "payment_status",
      "paid"
    );
  }

  if (
    fulfillmentStatus &&
    FULFILLMENT_STATUSES.includes(
      fulfillmentStatus
    )
  ) {
    query = query.eq(
      "fulfillment_status",
      fulfillmentStatus
    );
  }

  const startDate = getStartDate(period);
  const endDate = getEndDate(period);

  if (startDate) {
    query = query.gte(
      "created_at",
      startDate.toISOString()
    );
  }

  if (endDate) {
    query = query.lt(
      "created_at",
      endDate.toISOString()
    );
  }

  if (search) {
    const safeSearch = search.replace(
      /[%_,()]/g,
      ""
    );

    const filters = [
      `customer_name.ilike.%${safeSearch}%`,
      `customer_email.ilike.%${safeSearch}%`,
      `customer_phone.ilike.%${safeSearch}%`,
      `stripe_session_id.ilike.%${safeSearch}%`
    ];

    if (isValidUuid(search)) {
      filters.push(`id.eq.${search}`);
    }

    query = query.or(filters.join(","));
  }

  const {
    data: orders,
    error
  } = await query;

  if (error) {
    console.error(
      "Unable to load orders:",
      error
    );
  }

  const orderList = orders || [];

  const paidOrders = orderList.filter(
    (order) =>
      order.payment_status === "paid"
  );

  const openOrders = orderList.filter(
    (order) =>
      order.payment_status === "paid" &&
      !["delivered", "canceled"].includes(
        order.fulfillment_status
      )
  );

  const shippedOrders = orderList.filter(
    (order) =>
      order.fulfillment_status ===
      "shipped"
  );

  const filteredRevenue =
    paidOrders.reduce(
      (total, order) =>
        total +
        Number(order.total_amount || 0),
      0
    );

  const hasFilters = Boolean(
    search ||
      paymentStatus ||
      fulfillmentStatus ||
      period
  );

  return (
    <main className="min-h-screen bg-[#f8f6f1]">
      <div className="mx-auto max-w-7xl px-5 py-10 md:px-8 md:py-12">
        <div className="flex flex-wrap items-end justify-between gap-5">
          <div>
            <div className="text-sm font-bold uppercase tracking-[0.18em] text-black/50">
              Order Management
            </div>

            <h1 className="mt-2 font-display text-5xl font-bold text-black">
              Orders
            </h1>

            <p className="mt-2 text-black/60">
              Search, filter and manage customer
              orders.
            </p>
          </div>

          <span className="rounded-full bg-black px-5 py-3 font-bold text-white">
            {orderList.length}{" "}
            {orderList.length === 1
              ? "order"
              : "orders"}
          </span>
        </div>

        <section className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <article className="rounded-[1.75rem] bg-white p-6 shadow">
            <div className="text-sm font-bold uppercase tracking-[0.14em] text-black/45">
              Filtered Revenue
            </div>

            <div className="mt-3 font-display text-4xl font-bold text-black">
              {formatMoney(filteredRevenue)}
            </div>

            <p className="mt-2 text-sm text-black/55">
              Paid orders currently shown
            </p>
          </article>

          <article className="rounded-[1.75rem] bg-white p-6 shadow">
            <div className="text-sm font-bold uppercase tracking-[0.14em] text-black/45">
              Paid Orders
            </div>

            <div className="mt-3 font-display text-4xl font-bold text-black">
              {paidOrders.length}
            </div>

            <p className="mt-2 text-sm text-black/55">
              Successful payments
            </p>
          </article>

          <article className="rounded-[1.75rem] bg-white p-6 shadow">
            <div className="text-sm font-bold uppercase tracking-[0.14em] text-black/45">
              Open Orders
            </div>

            <div className="mt-3 font-display text-4xl font-bold text-black">
              {openOrders.length}
            </div>

            <p className="mt-2 text-sm text-black/55">
              Require operational attention
            </p>
          </article>

          <article className="rounded-[1.75rem] bg-white p-6 shadow">
            <div className="text-sm font-bold uppercase tracking-[0.14em] text-black/45">
              Shipped
            </div>

            <div className="mt-3 font-display text-4xl font-bold text-black">
              {shippedOrders.length}
            </div>

            <p className="mt-2 text-sm text-black/55">
              Orders currently in transit
            </p>
          </article>
        </section>

        <section className="mt-8 rounded-[2rem] bg-white p-5 shadow md:p-7">
          <form
            method="GET"
            className="grid gap-4 xl:grid-cols-[2fr_1fr_1fr_1fr_auto]"
          >
            <label className="grid gap-2">
              <span className="text-sm font-bold text-black">
                Search
              </span>

              <input
                type="search"
                name="search"
                defaultValue={search}
                placeholder="Customer, email, phone, order ID..."
                className="rounded-2xl border border-black/15 bg-white px-4 py-3 text-black outline-none transition placeholder:text-black/35 focus:border-black"
              />
            </label>

            <label className="grid gap-2">
              <span className="text-sm font-bold text-black">
                Payment
              </span>

              <select
                name="payment"
                defaultValue={fulfillmentStatus}
                className="rounded-2xl border border-black/15 bg-white px-4 py-3 font-semibold text-black outline-none focus:border-black"
              >
                <option value="paid">
                  Paid orders
                </option>

                <option value="pending">
                  Pending checkouts
                </option>

                <option value="unpaid">
                  Unpaid orders
                </option>

                <option value="failed">
                  Failed payments
                </option>

                <option value="refunded">
                  Refunded orders
                </option>

                <option value="all">
                  All payments
                </option>
              </select>
            </label>

            <label className="grid gap-2">
              <span className="text-sm font-bold text-black">
                Fulfillment
              </span>

              <select
                name="fulfillment"
                defaultValue={
                  fulfillmentStatus
                }
                className="rounded-2xl border border-black/15 bg-white px-4 py-3 font-semibold text-black outline-none focus:border-black"
              >
                <option value="">
                  All statuses
                </option>

                {FULFILLMENT_STATUSES.map(
                  (status) => (
                    <option
                      key={status}
                      value={status}
                    >
                      {status
                        .charAt(0)
                        .toUpperCase() +
                        status.slice(1)}
                    </option>
                  )
                )}
              </select>
            </label>

            <label className="grid gap-2">
              <span className="text-sm font-bold text-black">
                Date
              </span>

              <select
                name="period"
                defaultValue={period}
                className="rounded-2xl border border-black/15 bg-white px-4 py-3 font-semibold text-black outline-none focus:border-black"
              >
                <option value="">
                  All dates
                </option>

                <option value="today">
                  Today
                </option>

                <option value="yesterday">
                  Yesterday
                </option>

                <option value="7days">
                  Last 7 days
                </option>

                <option value="30days">
                  Last 30 days
                </option>
              </select>
            </label>

            <div className="flex items-end gap-3">
              <button
                type="submit"
                className="rounded-full bg-black px-6 py-3 font-bold text-white transition hover:bg-black/80"
              >
                Apply
              </button>

              {hasFilters && (
                <Link
                  href="/admin/orders"
                  className="rounded-full border border-black/15 bg-white px-5 py-3 font-bold text-black transition hover:border-black"
                >
                  Reset
                </Link>
              )}
            </div>
          </form>
        </section>

        <section className="mt-8 overflow-hidden rounded-[2rem] bg-white shadow">
          {error ? (
            <div className="p-8">
              <h2 className="font-display text-2xl font-bold text-red-700">
                Unable to load orders
              </h2>

              <p className="mt-2 text-black/60">
                Check the server logs for more
                information.
              </p>
            </div>
          ) : orderList.length === 0 ? (
            <div className="p-8">
              <h2 className="font-display text-2xl font-bold text-black">
                No matching orders
              </h2>

              <p className="mt-2 text-black/60">
                Try changing or clearing the current
                filters.
              </p>

              {hasFilters && (
                <Link
                  href="/admin/orders"
                  className="mt-5 inline-flex rounded-full bg-black px-5 py-3 font-bold text-white"
                >
                  Clear Filters
                </Link>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1050px] text-left">
                <thead>
                  <tr className="border-b border-black/10 bg-[#faf7f1] text-sm text-black/55">
                    <th className="px-6 py-4">
                      Order
                    </th>

                    <th className="px-6 py-4">
                      Customer
                    </th>

                    <th className="px-6 py-4">
                      Payment
                    </th>

                    <th className="px-6 py-4">
                      Fulfillment
                    </th>

                    <th className="px-6 py-4">
                      Total
                    </th>

                    <th className="px-6 py-4">
                      Date
                    </th>

                    <th className="px-6 py-4">
                      Details
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {orderList.map((order) => (
                    <tr
                      key={order.id}
                      className="border-b border-black/5 transition hover:bg-[#fcfaf6]"
                    >
                      <td className="px-6 py-5">
                        <div className="font-bold text-black">
                          #
                          {order.id
                            .slice(0, 8)
                            .toUpperCase()}
                        </div>

                        <div className="mt-1 max-w-[180px] truncate text-xs text-black/40">
                          {order.stripe_session_id ||
                            "No Stripe session"}
                        </div>
                      </td>

                      <td className="px-6 py-5">
                        <div className="font-bold text-black">
                          {order.customer_name ||
                            "Guest"}
                        </div>

                        <div className="mt-1 text-sm text-black/60">
                          {order.customer_email ||
                            "Email not provided"}
                        </div>
                      </td>

                      <td className="px-6 py-5">
                        <span
                          className={`rounded-full px-3 py-1 text-sm font-bold ${paymentBadgeClass(
                            order.payment_status
                          )}`}
                        >
                          {order.payment_status ||
                            "unknown"}
                        </span>
                      </td>

                      <td className="px-6 py-5">
                        <span
                          className={`rounded-full px-3 py-1 text-sm font-bold ${fulfillmentBadgeClass(
                            order.fulfillment_status
                          )}`}
                        >
                          {order.fulfillment_status ||
                            "new"}
                        </span>
                      </td>

                      <td className="px-6 py-5 font-bold text-black">
                        {formatMoney(
                          order.total_amount
                        )}
                      </td>

                      <td className="px-6 py-5 text-black/60">
                        {formatDate(
                          order.created_at
                        )}
                      </td>

                      <td className="px-6 py-5">
                        <Link
                          href={`/admin/orders/${order.id}`}
                          className="inline-flex rounded-full bg-black px-4 py-2 text-sm font-bold text-white transition hover:bg-black/75"
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