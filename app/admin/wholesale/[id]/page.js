import Link from "next/link";
import { notFound } from "next/navigation";
import { createSupabaseAdmin } from "@/lib/supabase-admin";
import {
  updateWholesaleInquiry
} from "@/app/admin/wholesale/actions";

export const dynamic = "force-dynamic";

const statusStyles = {
  new: "bg-blue-50 text-blue-800",
  contacted: "bg-amber-50 text-amber-800",
  quoted: "bg-purple-50 text-purple-800",
  won: "bg-green-50 text-green-800",
  lost: "bg-red-50 text-red-800"
};

const statusLabels = {
  new: "New",
  contacted: "Contacted",
  quoted: "Quoted",
  won: "Won",
  lost: "Lost"
};

function formatDate(value) {
  if (!value) return "—";

  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(new Date(value));
}

function formatBusinessType(value) {
  const labels = {
    restaurant: "Restaurant",
    caterer: "Caterer",
    event: "Event / Wedding",
    school: "School / Institution",
    "food-truck": "Food Truck",
    distributor: "Distributor / Wholesaler",
    retailer: "Retailer",
    other: "Other"
  };

  return labels[value] || value || "Not provided";
}

function formatFrequency(value) {
  const labels = {
    "one-time": "One-time order",
    weekly: "Weekly",
    biweekly: "Every 2 weeks",
    monthly: "Monthly",
    quarterly: "Quarterly",
    ongoing: "Ongoing / Variable"
  };

  return labels[value] || value || "Not provided";
}

export default async function WholesaleInquiryDetailPage({
  params
}) {
  const resolvedParams =
    await Promise.resolve(params);

  const inquiryId =
    String(
      resolvedParams?.id || ""
    ).trim();

  if (!inquiryId) {
    notFound();
  }

  const supabase =
    createSupabaseAdmin();

  const {
    data: inquiry,
    error
  } = await supabase
    .from("wholesale_inquiries")
    .select(`
      id,
      product_id,
      product_name,
      customer_name,
      business_name,
      business_type,
      email,
      phone,
      estimated_quantity,
      quantity_unit,
      purchase_frequency,
      delivery_city,
      delivery_state,
      delivery_postal_code,
      message,
      status,
      internal_notes,
      contacted_at,
      quoted_at,
      won_at,
      lost_at,
      created_at,
      updated_at
    `)
    .eq("id", inquiryId)
    .maybeSingle();

  if (error) {
    console.error(
      "Unable to load wholesale inquiry:",
      error
    );

    throw new Error(
      error.message ||
        "Unable to load wholesale inquiry."
    );
  }

  if (!inquiry) {
    notFound();
  }

  return (
    <main>
      <div className="flex flex-col gap-5 md:flex-row md:items-start md:justify-between">
        <div>
          <Link
            href="/admin/wholesale"
            className="inline-flex rounded-full bg-white px-4 py-2 text-sm font-bold text-black shadow-soft transition hover:bg-[#f1eadf]"
          >
            ← Back to Wholesale Inquiries
          </Link>

          <div className="mt-6 text-xs font-bold uppercase tracking-[.2em] text-black/40">
            B2B Sales Opportunity
          </div>

          <h1 className="mt-2 font-display text-4xl font-bold text-black md:text-5xl">
            {inquiry.customer_name}
          </h1>

          <p className="mt-2 text-sm text-black/50">
            Received {formatDate(inquiry.created_at)}
          </p>
        </div>

        <span
          className={[
            "inline-flex w-fit rounded-full px-4 py-2 text-sm font-bold",
            statusStyles[inquiry.status] ||
              "bg-black/5 text-black"
          ].join(" ")}
        >
          {statusLabels[inquiry.status] ||
            inquiry.status}
        </span>
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_380px]">
        <div className="grid gap-6">

          <section className="rounded-[2rem] bg-white p-5 shadow-soft md:p-6">
            <div className="text-xs font-bold uppercase tracking-[.16em] text-black/40">
              Product Opportunity
            </div>

            <h2 className="mt-2 font-display text-3xl font-bold text-black">
              {inquiry.product_name}
            </h2>

            {inquiry.product_id ? (
              <div className="mt-3 font-mono text-sm text-black/45">
                {inquiry.product_id}
              </div>
            ) : null}

            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              <div className="rounded-2xl bg-[#f8f6f1] p-4">
                <div className="text-xs font-bold uppercase tracking-[.14em] text-black/40">
                  Estimated Quantity
                </div>

                <div className="mt-2 font-bold text-black">
                  {inquiry.estimated_quantity
                    ? `${Number(
                        inquiry.estimated_quantity
                      ).toLocaleString()} ${
                        inquiry.quantity_unit || "units"
                      }`
                    : "Not provided"}
                </div>
              </div>

              <div className="rounded-2xl bg-[#f8f6f1] p-4">
                <div className="text-xs font-bold uppercase tracking-[.14em] text-black/40">
                  Purchase Frequency
                </div>

                <div className="mt-2 font-bold text-black">
                  {formatFrequency(
                    inquiry.purchase_frequency
                  )}
                </div>
              </div>
            </div>
          </section>

          <section className="rounded-[2rem] bg-white p-5 shadow-soft md:p-6">
            <h2 className="font-display text-3xl font-bold text-black">
              Customer & Business
            </h2>

            <div className="mt-6 grid gap-5 sm:grid-cols-2">
              <div className="rounded-2xl bg-[#f8f6f1] p-4">
                <div className="text-xs font-bold uppercase tracking-[.14em] text-black/40">
                  Contact
                </div>

                <div className="mt-3 font-bold text-black">
                  {inquiry.customer_name}
                </div>

                <a
                  href={`mailto:${inquiry.email}`}
                  className="mt-2 block text-sm text-black/65 hover:underline"
                >
                  {inquiry.email}
                </a>

                {inquiry.phone ? (
                  <a
                    href={`tel:${inquiry.phone}`}
                    className="mt-1 block text-sm text-black/65 hover:underline"
                  >
                    {inquiry.phone}
                  </a>
                ) : null}
              </div>

              <div className="rounded-2xl bg-[#f8f6f1] p-4">
                <div className="text-xs font-bold uppercase tracking-[.14em] text-black/40">
                  Business
                </div>

                <div className="mt-3 font-bold text-black">
                  {inquiry.business_name ||
                    "Not provided"}
                </div>

                <div className="mt-2 text-sm text-black/65">
                  {formatBusinessType(
                    inquiry.business_type
                  )}
                </div>
              </div>
            </div>
          </section>

          <section className="rounded-[2rem] bg-white p-5 shadow-soft md:p-6">
            <h2 className="font-display text-3xl font-bold text-black">
              Delivery Location
            </h2>

            <div className="mt-5 rounded-2xl bg-[#f8f6f1] p-4 leading-7 text-black">
              {[
                inquiry.delivery_city,
                inquiry.delivery_state,
                inquiry.delivery_postal_code
              ]
                .filter(Boolean)
                .join(", ") ||
                "Not provided"}
            </div>
          </section>

          <section className="rounded-[2rem] bg-white p-5 shadow-soft md:p-6">
            <h2 className="font-display text-3xl font-bold text-black">
              Customer Message
            </h2>

            <div className="mt-5 rounded-2xl bg-[#f8f6f1] p-4 leading-7 text-black">
              {inquiry.message ||
                "No message was submitted."}
            </div>
          </section>

          <section className="rounded-[2rem] bg-white p-5 shadow-soft md:p-6">
            <h2 className="font-display text-3xl font-bold text-black">
              Opportunity Timeline
            </h2>

            <div className="mt-6 grid gap-4">
              <TimelineItem
                label="Inquiry Received"
                value={inquiry.created_at}
              />

              <TimelineItem
                label="Contacted"
                value={inquiry.contacted_at}
              />

              <TimelineItem
                label="Quoted"
                value={inquiry.quoted_at}
              />

              <TimelineItem
                label="Won"
                value={inquiry.won_at}
              />

              <TimelineItem
                label="Lost"
                value={inquiry.lost_at}
              />
            </div>
          </section>
        </div>

        <aside className="h-fit rounded-[2rem] bg-white p-5 shadow-soft md:p-6 lg:sticky lg:top-28">
          <div className="text-xs font-bold uppercase tracking-[.16em] text-black/40">
            Sales Workflow
          </div>

          <h2 className="mt-2 font-display text-3xl font-bold text-black">
            Manage Opportunity
          </h2>

          <p className="mt-2 text-sm leading-6 text-black/55">
            Track the sales process from new
            lead through quote and conversion.
          </p>

          <div className="mt-6 rounded-2xl bg-[#f8f6f1] p-4">
            <div className="text-xs font-bold uppercase tracking-[.14em] text-black/40">
              Current Status
            </div>

            <div className="mt-2 font-bold text-black">
              {statusLabels[inquiry.status] ||
                inquiry.status}
            </div>
          </div>

          <form
            action={updateWholesaleInquiry}
            className="mt-6 grid gap-4"
            >
            <input
              type="hidden"
              name="inquiryId"
              value={inquiry.id}
            />

            <label className="grid gap-2">
              <span className="text-sm font-bold text-black">
                Status
              </span>

              <select
                name="status"
                defaultValue={inquiry.status}
                className="h-12 rounded-2xl border border-black/10 bg-white px-4 text-black outline-none focus:border-black"
              >
                <option value="new">
                  New
                </option>

                <option value="contacted">
                  Contacted
                </option>

                <option value="quoted">
                  Quoted
                </option>

                <option value="won">
                  Won
                </option>

                <option value="lost">
                  Lost
                </option>
              </select>
            </label>

            <label className="grid gap-2">
              <span className="text-sm font-bold text-black">
                Internal Notes
              </span>

              <textarea
                name="internalNotes"
                defaultValue={
                  inquiry.internal_notes || ""
                }
                rows={7}
                className="rounded-2xl border border-black/10 bg-white px-4 py-3 text-black outline-none focus:border-black"
                placeholder="Pricing discussion, requested case quantities, follow-up date, quote details..."
              />
            </label>

            <button
                type="submit"
                className="mt-2 w-full rounded-full bg-black px-6 py-4 font-bold text-white transition hover:bg-black/80"
                >
                Save Changes
            </button>
          </form>

          <div className="mt-6 border-t border-black/10 pt-5">
            <a
              href={`mailto:${inquiry.email}`}
              className="block rounded-full border border-black px-5 py-3 text-center text-sm font-bold text-black transition hover:bg-black hover:text-white"
            >
              Email Customer
            </a>

            {inquiry.phone ? (
              <a
                href={`tel:${inquiry.phone}`}
                className="mt-3 block rounded-full border border-black px-5 py-3 text-center text-sm font-bold text-black transition hover:bg-black hover:text-white"
              >
                Call Customer
              </a>
            ) : null}
          </div>
        </aside>
      </div>
    </main>
  );
}

function TimelineItem({
  label,
  value
}) {
  const completed =
    Boolean(value);

  return (
    <div className="flex items-start gap-3">
      <div
        className={[
          "mt-1 h-3 w-3 shrink-0 rounded-full",
          completed
            ? "bg-green-600"
            : "bg-black/10"
        ].join(" ")}
      />

      <div>
        <div
          className={
            completed
              ? "font-bold text-black"
              : "font-medium text-black/40"
          }
        >
          {label}
        </div>

        <div className="mt-1 text-xs text-black/45">
          {completed
            ? formatDate(value)
            : "Not yet"}
        </div>
      </div>
    </div>
  );
}