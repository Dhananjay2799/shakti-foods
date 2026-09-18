import Link from "next/link";
import { notFound } from "next/navigation";
import { createSupabaseAdmin } from "@/lib/supabase-admin";
import { getAdminStorefront } from "@/lib/admin-storefronts";

export const dynamic = "force-dynamic";

function formatMoney(cents, currency = "USD") {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: String(currency || "USD").toUpperCase()
  }).format(Number(cents || 0) / 100);
}

function formatDate(value) {
  if (!value) {
    return "—";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "—";
  }

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit"
  }).format(date);
}

function providerLabel(provider) {
  switch (String(provider || "").toLowerCase()) {
    case "stripe":
      return "Stripe";
    case "paypal":
      return "PayPal";
    default:
      return "Unknown";
  }
}

function frequencyLabel(subscription) {
  const unit = String(subscription?.interval_unit || "").toLowerCase();
  const count = Number(subscription?.interval_count || 1);

  if (unit === "week") {
    return count === 1 ? "Every week" : `Every ${count} weeks`;
  }

  if (unit === "month") {
    return count === 1 ? "Every month" : `Every ${count} months`;
  }

  return `${count} ${unit}`;
}

function statusClasses(status) {
  switch (String(status || "").toLowerCase()) {
    case "active":
      return "bg-green-100 text-green-800";
    case "pending":
      return "bg-amber-100 text-amber-800";
    case "past_due":
      return "bg-red-100 text-red-800";
    case "paused":
      return "bg-blue-100 text-blue-800";
    case "canceled":
    case "ended":
      return "bg-black/10 text-black/60";
    default:
      return "bg-black/10 text-black/60";
  }
}

export default async function AdminSubscriptionDetailPage({
  params,
  searchParams
}) {
  const resolvedParams = await Promise.resolve(params);

  const storefront = getAdminStorefront(resolvedParams.storefront);

  if (!storefront) {
    notFound();
  }

  // Subscriptions are exclusively for Shakti Foods
  if (storefront.id !== "shakti_foods") {
    notFound();
  }

  const subscriptionId = String(resolvedParams?.id || "").trim();

  if (!subscriptionId) {
    notFound();
  }

  const basePath = `/admin/${storefront.slug}`;

  const resolvedSearchParams = await Promise.resolve(searchParams || {});

  const supabase = createSupabaseAdmin();

  const { data: subscription, error } = await supabase
    .from("subscriptions")
    .select(
      `
      *,
      subscription_items (*)
    `
    )
    .eq("id", subscriptionId)
    .eq("storefront", storefront.id)
    .maybeSingle();

  if (error || !subscription) {
    notFound();
  }

  const provider = String(subscription.payment_provider || "")
    .trim()
    .toLowerCase();

  const status = String(subscription.status || "")
    .trim()
    .toLowerCase();

  const successMessage = String(resolvedSearchParams?.success || "").trim();
  const errorMessage = String(resolvedSearchParams?.error || "").trim();

  const canSuspend = provider === "paypal" && status === "active";
  const canReactivate = provider === "paypal" && status === "paused";
  const canCancel =
    (provider === "paypal" || provider === "stripe") &&
    !["canceled", "ended"].includes(status);

  return (
    <main className="min-h-screen bg-[#f8f6f1] px-4 py-10 md:px-8">
      <div className="mx-auto max-w-4xl">
        <Link
          href={`${basePath}/subscriptions`}
          className="text-sm font-bold text-black/50 transition hover:text-black"
        >
          ← Back to Subscriptions
        </Link>

        <div className="mt-6 rounded-[2rem] bg-white p-6 shadow-sm md:p-8">
          <div className="flex flex-col gap-5 md:flex-row md:items-start md:justify-between">
            <div>
              <div className="text-xs font-bold uppercase tracking-[.18em] text-black/40">
                {storefront.name} Subscription
              </div>

              <h1 className="mt-2 font-display text-4xl font-bold">
                {subscription.customer_name || "Customer"}
              </h1>

              <p className="mt-2 text-black/50">
                {subscription.customer_email}
              </p>
            </div>

            <span
              className={`inline-flex w-fit rounded-full px-4 py-2 text-xs font-bold uppercase tracking-[.08em] ${statusClasses(
                subscription.status
              )}`}
            >
              {subscription.status}
            </span>
          </div>

          {successMessage ? (
            <div className="mt-6 rounded-2xl border border-green-200 bg-green-50 p-4 text-sm font-bold text-green-800">
              {successMessage}
            </div>
          ) : null}

          {errorMessage ? (
            <div className="mt-6 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-bold text-red-700">
              {errorMessage}
            </div>
          ) : null}

          <div className="mt-8 grid gap-4 md:grid-cols-2">
            <InfoCard
              label="Provider"
              value={providerLabel(subscription.payment_provider)}
            />

            <InfoCard label="Status" value={subscription.status || "—"} />

            <InfoCard
              label="Recurring total"
              value={formatMoney(
                subscription.total_cents,
                subscription.currency
              )}
            />

            <InfoCard
              label="Frequency"
              value={frequencyLabel(subscription)}
            />

            <InfoCard
              label="Next billing"
              value={formatDate(subscription.next_billing_at)}
            />

            <InfoCard
              label="Created"
              value={formatDate(subscription.created_at)}
            />
          </div>

          <div className="mt-8 rounded-2xl bg-[#faf8f4] p-5">
            <div className="text-sm font-bold">Subscription Items</div>

            <div className="mt-4 grid gap-3">
              {(subscription.subscription_items || []).map((item) => (
                <div key={item.id} className="rounded-xl bg-white p-4">
                  <div className="font-bold">{item.product_name}</div>

                  <div className="mt-2 grid gap-1 text-sm text-black/50 sm:grid-cols-2">
                    <div>Quantity: {item.quantity}</div>

                    <div>
                      Unit price:{" "}
                      {formatMoney(
                        item.subscription_unit_price_cents,
                        subscription.currency
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-8 rounded-2xl border border-black/10 p-5">
            <div className="text-xs font-bold uppercase tracking-[.16em] text-black/40">
              Provider Details
            </div>

            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <InfoCard label="Internal Subscription ID" value={subscription.id} />

              <InfoCard
                label="Provider Subscription ID"
                value={subscription.provider_subscription_id || "—"}
              />

              {provider === "stripe" ? (
                <InfoCard
                  label="Stripe Subscription ID"
                  value={subscription.stripe_subscription_id || "—"}
                />
              ) : null}

              {provider === "paypal" ? (
                <>
                  <InfoCard
                    label="PayPal Subscription ID"
                    value={subscription.paypal_subscription_id || "—"}
                  />

                  <InfoCard
                    label="PayPal Plan ID"
                    value={subscription.paypal_plan_id || "—"}
                  />
                </>
              ) : null}
            </div>
          </div>

          <div className="mt-8 rounded-[1.5rem] border border-black/10 bg-[#faf8f4] p-5">
            <div className="text-xs font-bold uppercase tracking-[.16em] text-black/40">
              Subscription Management
            </div>

            <h2 className="mt-2 text-xl font-bold">
              Manage recurring billing
            </h2>

            <p className="mt-2 max-w-2xl text-sm leading-6 text-black/55">
              Actions are sent directly to the payment provider. The PayPal and
              Stripe webhooks keep the {storefront.name} subscription status
              synchronized afterward.
            </p>

            <div className="mt-6 flex flex-wrap gap-3">
              {canSuspend ? (
                <form
                  action={`/api/admin/${storefront.slug}/subscriptions/${subscription.id}/suspend`}
                  method="POST"
                >
                  <button
                    type="submit"
                    className="rounded-full border border-black bg-white px-5 py-3 text-sm font-bold text-black transition hover:bg-black hover:text-white"
                  >
                    Suspend Subscription
                  </button>
                </form>
              ) : null}

              {canReactivate ? (
                <form
                  action={`/api/admin/${storefront.slug}/subscriptions/${subscription.id}/reactivate`}
                  method="POST"
                >
                  <button
                    type="submit"
                    className="rounded-full bg-green-700 px-5 py-3 text-sm font-bold text-white transition hover:bg-green-800"
                  >
                    Reactivate Subscription
                  </button>
                </form>
              ) : null}

              {canCancel ? (
                <form
                  action={`/api/admin/${storefront.slug}/subscriptions/${subscription.id}/cancel`}
                  method="POST"
                >
                  <button
                    type="submit"
                    className="rounded-full bg-red-700 px-5 py-3 text-sm font-bold text-white transition hover:bg-red-800"
                  >
                    Cancel Subscription
                  </button>
                </form>
              ) : null}

              {!canSuspend && !canReactivate && !canCancel ? (
                <div className="text-sm font-semibold text-black/45">
                  No subscription actions are currently available.
                </div>
              ) : null}
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}

function InfoCard({ label, value }) {
  return (
    <div className="min-w-0 rounded-2xl bg-[#faf8f4] p-4">
      <div className="text-xs font-bold uppercase tracking-[.12em] text-black/40">
        {label}
      </div>

      <div className="mt-2 break-words font-bold">{value}</div>
    </div>
  );
}