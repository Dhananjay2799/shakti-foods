import Link from "next/link";

import {
  createSupabaseAdmin
} from "@/lib/supabase-admin";

export const dynamic =
  "force-dynamic";


function formatMoney(
  cents,
  currency = "USD"
) {
  return new Intl.NumberFormat(
    "en-US",
    {
      style: "currency",
      currency:
        String(
          currency || "USD"
        ).toUpperCase()
    }
  ).format(
    Number(cents || 0) /
      100
  );
}


function formatDate(
  value
) {
  if (!value) {
    return "—";
  }

  const date =
    new Date(value);

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return "—";
  }

  return new Intl.DateTimeFormat(
    "en-US",
    {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit"
    }
  ).format(date);
}


function providerLabel(
  provider
) {
  switch (
    String(
      provider || ""
    ).toLowerCase()
  ) {
    case "stripe":
      return "Stripe";

    case "paypal":
      return "PayPal";

    default:
      return "Unknown";
  }
}


function frequencyLabel(
  subscription
) {
  const unit =
    String(
      subscription
        ?.interval_unit ||
      ""
    ).toLowerCase();

  const count =
    Number(
      subscription
        ?.interval_count ||
      1
    );

  if (
    unit === "week"
  ) {
    return count === 1
      ? "Every week"
      : `Every ${count} weeks`;
  }

  if (
    unit === "month"
  ) {
    return count === 1
      ? "Every month"
      : `Every ${count} months`;
  }

  return `${count} ${unit}`;
}


function statusClasses(
  status
) {
  switch (
    String(
      status || ""
    ).toLowerCase()
  ) {
    case "active":
      return "bg-green-100 text-green-800";

    case "pending":
      return "bg-amber-100 text-amber-800";

    case "past_due":
      return "bg-red-100 text-red-800";

    case "paused":
      return "bg-blue-100 text-blue-800";

    case "canceled":
      return "bg-black/10 text-black/60";

    case "ended":
      return "bg-black/10 text-black/60";

    default:
      return "bg-black/10 text-black/60";
  }
}


export default async function AdminSubscriptionsPage() {
  const supabase =
    createSupabaseAdmin();

  const {
    data: subscriptions,
    error
  } = await supabase
    .from("subscriptions")
    .select(`
      id,
      customer_name,
      customer_email,
      payment_provider,
      status,
      currency,
      subtotal_cents,
      discount_cents,
      total_cents,
      interval_unit,
      interval_count,
      next_billing_at,
      stripe_subscription_id,
      paypal_subscription_id,
      created_at,

      subscription_items (
        product_id,
        product_name,
        quantity,
        subscription_unit_price_cents,
        line_total_cents
      )
    `)
    .order(
      "created_at",
      {
        ascending: false
      }
    );

  if (error) {
    console.error(
      "Unable to load subscriptions:",
      error
    );

    throw new Error(
      error.message ||
        "Unable to load subscriptions."
    );
  }

  const rows =
    subscriptions || [];

  const activeCount =
    rows.filter(
      (row) =>
        row.status ===
        "active"
    ).length;

  const pendingCount =
    rows.filter(
      (row) =>
        row.status ===
        "pending"
    ).length;

  const pastDueCount =
    rows.filter(
      (row) =>
        row.status ===
        "past_due"
    ).length;

  const pausedCount =
    rows.filter(
      (row) =>
        row.status ===
        "paused"
    ).length;

  const canceledCount =
    rows.filter(
      (row) =>
        row.status ===
          "canceled" ||
        row.status ===
          "ended"
    ).length;

  return (
    <main className="min-h-screen bg-[#f8f6f1] px-4 py-10 md:px-8">
      <div className="mx-auto max-w-7xl">

        <div className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
          <div>
            <div className="text-xs font-bold uppercase tracking-[.18em] text-black/40">
              Admin
            </div>

            <h1 className="mt-2 font-display text-5xl font-bold text-black">
              Subscriptions
            </h1>

            <p className="mt-3 max-w-2xl leading-7 text-black/55">
              Manage recurring Stripe and
              PayPal Subscribe & Save
              customers.
            </p>
          </div>

          <div className="rounded-full bg-black px-5 py-3 text-sm font-bold text-white">
            {rows.length} Total
          </div>
        </div>


        {/* Summary */}
        <section className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <SummaryCard
            label="Active"
            value={activeCount}
          />

          <SummaryCard
            label="Pending"
            value={pendingCount}
          />

          <SummaryCard
            label="Past Due"
            value={pastDueCount}
          />

          <SummaryCard
            label="Paused"
            value={pausedCount}
          />

          <SummaryCard
            label="Canceled"
            value={canceledCount}
          />
        </section>


        {/* Desktop table */}
        <section className="mt-8 hidden overflow-hidden rounded-[2rem] border border-black/5 bg-white shadow-sm lg:block">
          <table className="w-full border-collapse">
            <thead>
              <tr className="border-b border-black/10 bg-[#faf8f4] text-left text-xs uppercase tracking-[.15em] text-black/45">
                <th className="px-5 py-4">
                  Customer
                </th>

                <th className="px-5 py-4">
                  Product
                </th>

                <th className="px-5 py-4">
                  Provider
                </th>

                <th className="px-5 py-4">
                  Status
                </th>

                <th className="px-5 py-4">
                  Recurring
                </th>

                <th className="px-5 py-4">
                  Next Billing
                </th>

                <th className="px-5 py-4 text-right">
                  Action
                </th>
              </tr>
            </thead>

            <tbody>
              {rows.map(
                (subscription) => {
                  const item =
                    subscription
                      .subscription_items
                      ?.[0] ||
                    null;

                  return (
                    <tr
                      key={
                        subscription.id
                      }
                      className="border-b border-black/5 last:border-b-0"
                    >
                      <td className="px-5 py-5">
                        <div className="font-bold">
                          {subscription.customer_name ||
                            "Customer"}
                        </div>

                        <div className="mt-1 text-sm text-black/45">
                          {subscription.customer_email}
                        </div>
                      </td>

                      <td className="px-5 py-5">
                        <div className="font-semibold">
                          {item?.product_name ||
                            "Subscription"}
                        </div>

                        <div className="mt-1 text-sm text-black/45">
                          Qty{" "}
                          {item?.quantity ||
                            1}
                        </div>
                      </td>

                      <td className="px-5 py-5 font-semibold">
                        {providerLabel(
                          subscription.payment_provider
                        )}
                      </td>

                      <td className="px-5 py-5">
                        <span
                          className={`inline-flex rounded-full px-3 py-1.5 text-xs font-bold uppercase tracking-[.08em] ${statusClasses(
                            subscription.status
                          )}`}
                        >
                          {subscription.status}
                        </span>
                      </td>

                      <td className="px-5 py-5">
                        <div className="font-bold">
                          {formatMoney(
                            subscription.total_cents,
                            subscription.currency
                          )}
                        </div>

                        <div className="mt-1 text-sm text-black/45">
                          {frequencyLabel(
                            subscription
                          )}
                        </div>
                      </td>

                      <td className="px-5 py-5">
                        {formatDate(
                          subscription.next_billing_at
                        )}
                      </td>

                      <td className="px-5 py-5 text-right">
                        <Link
                          href={`/admin/subscriptions/${subscription.id}`}
                          className="inline-flex rounded-full bg-black px-4 py-2.5 text-sm font-bold text-white"
                        >
                          Manage
                        </Link>
                      </td>
                    </tr>
                  );
                }
              )}

              {rows.length ===
              0 ? (
                <tr>
                  <td
                    colSpan={7}
                    className="px-6 py-16 text-center text-black/45"
                  >
                    No subscriptions yet.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </section>


        {/* Mobile cards */}
        <section className="mt-8 grid gap-4 lg:hidden">
          {rows.map(
            (subscription) => {
              const item =
                subscription
                  .subscription_items
                  ?.[0] ||
                null;

              return (
                <article
                  key={
                    subscription.id
                  }
                  className="rounded-[1.75rem] bg-white p-5 shadow-sm"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <div className="font-bold">
                        {subscription.customer_name ||
                          "Customer"}
                      </div>

                      <div className="mt-1 text-sm text-black/45">
                        {subscription.customer_email}
                      </div>
                    </div>

                    <span
                      className={`rounded-full px-3 py-1.5 text-xs font-bold uppercase ${statusClasses(
                        subscription.status
                      )}`}
                    >
                      {subscription.status}
                    </span>
                  </div>

                  <div className="mt-5 rounded-2xl bg-[#faf8f4] p-4">
                    <div className="font-bold">
                      {item?.product_name ||
                        "Subscription"}
                    </div>

                    <div className="mt-2 text-sm text-black/55">
                      Quantity:{" "}
                      {item?.quantity ||
                        1}
                    </div>
                  </div>

                  <div className="mt-5 grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <div className="text-black/40">
                        Provider
                      </div>

                      <div className="mt-1 font-bold">
                        {providerLabel(
                          subscription.payment_provider
                        )}
                      </div>
                    </div>

                    <div>
                      <div className="text-black/40">
                        Recurring
                      </div>

                      <div className="mt-1 font-bold">
                        {formatMoney(
                          subscription.total_cents,
                          subscription.currency
                        )}
                      </div>
                    </div>

                    <div>
                      <div className="text-black/40">
                        Frequency
                      </div>

                      <div className="mt-1 font-bold">
                        {frequencyLabel(
                          subscription
                        )}
                      </div>
                    </div>

                    <div>
                      <div className="text-black/40">
                        Next billing
                      </div>

                      <div className="mt-1 font-bold">
                        {formatDate(
                          subscription.next_billing_at
                        )}
                      </div>
                    </div>
                  </div>

                  <Link
                    href={`/admin/subscriptions/${subscription.id}`}
                    className="mt-5 flex w-full justify-center rounded-full bg-black px-5 py-3.5 font-bold text-white"
                  >
                    Manage Subscription
                  </Link>
                </article>
              );
            }
          )}
        </section>
      </div>
    </main>
  );
}


function SummaryCard({
  label,
  value
}) {
  return (
    <div className="rounded-2xl bg-white p-5 shadow-sm">
      <div className="text-xs font-bold uppercase tracking-[.15em] text-black/40">
        {label}
      </div>

      <div className="mt-2 text-3xl font-bold">
        {value}
      </div>
    </div>
  );
}