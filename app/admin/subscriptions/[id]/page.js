import Link from "next/link";
import { notFound } from "next/navigation";

import {
  createSupabaseAdmin
} from "@/lib/supabase-admin";

export const dynamic =
  "force-dynamic";


export default async function AdminSubscriptionDetailPage({
  params
}) {
  const resolvedParams =
    await Promise.resolve(
      params
    );

  const subscriptionId =
    String(
      resolvedParams?.id ||
      ""
    ).trim();

  if (!subscriptionId) {
    notFound();
  }

  const supabase =
    createSupabaseAdmin();

  const {
    data: subscription,
    error
  } = await supabase
    .from("subscriptions")
    .select(`
      *,
      subscription_items (*)
    `)
    .eq(
      "id",
      subscriptionId
    )
    .maybeSingle();

  if (
    error ||
    !subscription
  ) {
    notFound();
  }

  return (
    <main className="min-h-screen bg-[#f8f6f1] px-4 py-10 md:px-8">
      <div className="mx-auto max-w-4xl">

        <Link
          href="/admin/subscriptions"
          className="text-sm font-bold text-black/50"
        >
          ← Back to Subscriptions
        </Link>

        <div className="mt-6 rounded-[2rem] bg-white p-6 shadow-sm md:p-8">
          <div className="text-xs font-bold uppercase tracking-[.18em] text-black/40">
            Subscription
          </div>

          <h1 className="mt-2 font-display text-4xl font-bold">
            {subscription.customer_name ||
              "Customer"}
          </h1>

          <p className="mt-2 text-black/50">
            {subscription.customer_email}
          </p>

          <div className="mt-8 grid gap-4 md:grid-cols-2">

            <InfoCard
              label="Provider"
              value={
                subscription.payment_provider ||
                "—"
              }
            />

            <InfoCard
              label="Status"
              value={
                subscription.status ||
                "—"
              }
            />

            <InfoCard
              label="Recurring total"
              value={`$${(
                Number(
                  subscription.total_cents ||
                  0
                ) / 100
              ).toFixed(2)}`}
            />

            <InfoCard
              label="Next billing"
              value={
                subscription.next_billing_at
                  ? new Date(
                      subscription.next_billing_at
                    ).toLocaleString(
                      "en-US"
                    )
                  : "—"
              }
            />

          </div>

          <div className="mt-8 rounded-2xl bg-[#faf8f4] p-5">
            <div className="text-sm font-bold">
              Subscription Items
            </div>

            <div className="mt-4 grid gap-3">
              {(
                subscription.subscription_items ||
                []
              ).map(
                (item) => (
                  <div
                    key={item.id}
                    className="rounded-xl bg-white p-4"
                  >
                    <div className="font-bold">
                      {item.product_name}
                    </div>

                    <div className="mt-1 text-sm text-black/50">
                      Quantity:{" "}
                      {item.quantity}
                    </div>
                  </div>
                )
              )}
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}


function InfoCard({
  label,
  value
}) {
  return (
    <div className="rounded-2xl bg-[#faf8f4] p-4">
      <div className="text-xs font-bold uppercase tracking-[.12em] text-black/40">
        {label}
      </div>

      <div className="mt-2 font-bold">
        {value}
      </div>
    </div>
  );
}