import Link from "next/link";
import { notFound } from "next/navigation";
import { createSupabaseAdmin } from "@/lib/supabase-admin";
import { updateSampleRequest } from "@/app/admin/sample-requests/actions";

export const dynamic = "force-dynamic";

const statusStyles = {
  new: "bg-blue-50 text-blue-800",
  approved: "bg-green-50 text-green-800",
  rejected: "bg-red-50 text-red-800",
  shipped: "bg-purple-50 text-purple-800",
  completed: "bg-black text-white"
};

const statusLabels = {
  new: "New",
  approved: "Approved",
  rejected: "Rejected",
  shipped: "Shipped",
  completed: "Completed"
};

function formatDate(value) {
  if (!value) {
    return "—";
  }

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

function formatAddress(address) {
  if (!address || typeof address !== "object") {
    return [];
  }

  const cityStateZip = [
    address.city,
    address.state,
    address.postal_code
  ]
    .filter(Boolean)
    .join(", ");

  return [
    address.line1,
    address.line2,
    cityStateZip,
    address.country
  ].filter(Boolean);
}

export default async function SampleRequestDetailPage({
  params,
  searchParams
}) {
  const resolvedParams =
    await Promise.resolve(params);

  const resolvedSearchParams =
    await Promise.resolve(searchParams);

  const errorMessage =
    resolvedSearchParams?.error ===
    "shipping-required"
      ? "Please select carrier and add tracking number first."
      : null;

  const requestId = String(
    resolvedParams?.id || ""
  ).trim();

  if (!requestId) {
    notFound();
  }

  const supabase = createSupabaseAdmin();

  const {
    data: sampleRequest,
    error
  } = await supabase
    .from("sample_requests")
    .select(`
      id,
      product_id,
      product_name,
      customer_name,
      business_name,
      business_type,
      email,
      phone,
      estimated_monthly_quantity,
      shipping_address,
      notes,
      status,
      shipping_carrier,
      tracking_number,
      tracking_url,
      internal_notes,
      approved_at,
      rejected_at,
      shipped_at,
      completed_at,
      created_at,
      updated_at
    `)
    .eq("id", requestId)
    .maybeSingle();

  if (error) {
    console.error(
      "Unable to load sample request:",
      error
    );

    throw new Error(
      error.message ||
        "Unable to load sample request."
    );
  }

  if (!sampleRequest) {
    notFound();
  }

  const addressLines =
    formatAddress(
      sampleRequest.shipping_address
    );

  return (
    <main>
      <div className="flex flex-col gap-5 md:flex-row md:items-start md:justify-between">
        <div>
          <Link
            href="/admin/sample-requests"
            className="inline-flex rounded-full bg-white px-4 py-2 text-sm font-bold text-black shadow-soft transition hover:bg-[#f1eadf]"
          >
            ← Back to Sample Requests
          </Link>

          <div className="mt-6 text-xs font-bold uppercase tracking-[.2em] text-black/40">
            B2B Sample Request
          </div>

          <h1 className="mt-2 font-display text-4xl font-bold text-black md:text-5xl">
            {sampleRequest.customer_name}
          </h1>

          <p className="mt-2 text-sm text-black/50">
            Requested{" "}
            {formatDate(
              sampleRequest.created_at
            )}
          </p>
        </div>

        <span
          className={[
            "inline-flex w-fit rounded-full px-4 py-2 text-sm font-bold",
            statusStyles[
              sampleRequest.status
            ] ||
              "bg-black/5 text-black"
          ].join(" ")}
        >
          {statusLabels[
            sampleRequest.status
          ] || sampleRequest.status}
        </span>
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_380px]">
        <div className="grid gap-6">
          {/* Product */}
          <section className="rounded-[2rem] bg-white p-5 shadow-soft md:p-6">
            <div className="text-xs font-bold uppercase tracking-[.16em] text-black/40">
              Requested Product
            </div>

            <h2 className="mt-2 font-display text-3xl font-bold text-black">
              {sampleRequest.product_name}
            </h2>

            <div className="mt-3 font-mono text-sm text-black/45">
              {sampleRequest.product_id}
            </div>
          </section>

          {/* Customer / Business */}
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
                  {sampleRequest.customer_name}
                </div>

                <a
                  href={`mailto:${sampleRequest.email}`}
                  className="mt-2 block text-sm text-black/65 underline-offset-2 hover:underline"
                >
                  {sampleRequest.email}
                </a>

                {sampleRequest.phone ? (
                  <a
                    href={`tel:${sampleRequest.phone}`}
                    className="mt-1 block text-sm text-black/65 underline-offset-2 hover:underline"
                  >
                    {sampleRequest.phone}
                  </a>
                ) : null}
              </div>

              <div className="rounded-2xl bg-[#f8f6f1] p-4">
                <div className="text-xs font-bold uppercase tracking-[.14em] text-black/40">
                  Business
                </div>

                <div className="mt-3 font-bold text-black">
                  {sampleRequest.business_name ||
                    "Not provided"}
                </div>

                <div className="mt-2 text-sm text-black/65">
                  {formatBusinessType(
                    sampleRequest.business_type
                  )}
                </div>

                <div className="mt-3 text-sm text-black/65">
                  Estimated monthly volume:
                </div>

                <div className="mt-1 font-bold text-black">
                  {sampleRequest.estimated_monthly_quantity
                    ? `${Number(
                        sampleRequest.estimated_monthly_quantity
                      ).toLocaleString()} units`
                    : "Not provided"}
                </div>
              </div>
            </div>
          </section>

          {/* Shipping address */}
          <section className="rounded-[2rem] bg-white p-5 shadow-soft md:p-6">
            <h2 className="font-display text-3xl font-bold text-black">
              Sample Shipping Address
            </h2>

            <div className="mt-5 rounded-2xl bg-[#f8f6f1] p-4">
              {addressLines.length > 0 ? (
                addressLines.map(
                  (line, index) => (
                    <div
                      key={`${line}-${index}`}
                      className="leading-7 text-black"
                    >
                      {line}
                    </div>
                  )
                )
              ) : (
                <div className="text-black/50">
                  Shipping address unavailable.
                </div>
              )}
            </div>
          </section>

          {/* Customer notes */}
          <section className="rounded-[2rem] bg-white p-5 shadow-soft md:p-6">
            <h2 className="font-display text-3xl font-bold text-black">
              Customer Notes
            </h2>

            <div className="mt-5 rounded-2xl bg-[#f8f6f1] p-4 leading-7 text-black">
              {sampleRequest.notes ||
                "No notes were submitted."}
            </div>
          </section>

          {/* Timeline */}
          <section className="rounded-[2rem] bg-white p-5 shadow-soft md:p-6">
            <h2 className="font-display text-3xl font-bold text-black">
              Request Timeline
            </h2>

            <div className="mt-6 grid gap-4">
              <TimelineItem
                label="Submitted"
                value={
                  sampleRequest.created_at
                }
              />

              <TimelineItem
                label="Approved"
                value={
                  sampleRequest.approved_at
                }
              />

              <TimelineItem
                label="Rejected"
                value={
                  sampleRequest.rejected_at
                }
              />

              <TimelineItem
                label="Shipped"
                value={
                  sampleRequest.shipped_at
                }
              />

              <TimelineItem
                label="Completed"
                value={
                  sampleRequest.completed_at
                }
              />
            </div>
          </section>
        </div>

        {/* Admin workflow */}
        <aside className="h-fit rounded-[2rem] bg-white p-5 shadow-soft md:p-6 lg:sticky lg:top-28">
          <div className="text-xs font-bold uppercase tracking-[.16em] text-black/40">
            Admin Workflow
          </div>

          <h2 className="mt-2 font-display text-3xl font-bold text-black">
            Manage Request
          </h2>

          <p className="mt-2 text-sm leading-6 text-black/55">
            Update approval status,
            shipping information and internal
            notes.
          </p>

          <div className="mt-6 rounded-2xl bg-[#f8f6f1] p-4">
            <div className="text-xs font-bold uppercase tracking-[.14em] text-black/40">
              Current Status
            </div>

            <div className="mt-2 font-bold text-black">
              {statusLabels[
                sampleRequest.status
              ] ||
                sampleRequest.status}
            </div>
          </div>

          <form
            action={updateSampleRequest}
            className="mt-6 grid gap-4"
            >
            <input
                type="hidden"
                name="requestId"
                value={sampleRequest.id}
            />

            {errorMessage ? (
              <div
                role="alert"
                className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-700"
              >
                {errorMessage}
              </div>
            ) : null}

            <label className="grid gap-2">
              <span className="text-sm font-bold text-black">
                Status
              </span>

              <select
                name="status"
                defaultValue={
                  sampleRequest.status
                }
                className="h-12 rounded-2xl border border-black/10 bg-white px-4 text-black outline-none focus:border-black"
              >
                <option value="new">
                  New
                </option>

                <option value="approved">
                  Approved
                </option>

                <option value="rejected">
                  Rejected
                </option>

                <option value="shipped">
                  Shipped
                </option>

                <option value="completed">
                  Completed
                </option>
              </select>
            </label>

            <label className="grid gap-2">
              <span className="text-sm font-bold text-black">
                Shipping Carrier
              </span>

              <select
                name="shippingCarrier"
                defaultValue={
                  sampleRequest.shipping_carrier ||
                  ""
                }
                className="h-12 rounded-2xl border border-black/10 bg-white px-4 text-black outline-none focus:border-black"
              >
                <option value="">
                  None / Unassigned
                </option>

                <option value="usps">
                  USPS
                </option>

                <option value="ups">
                  UPS
                </option>

                <option value="fedex">
                  FedEx
                </option>

                <option value="other">
                  Other
                </option>
              </select>
            </label>

            <label className="grid gap-2">
              <span className="text-sm font-bold text-black">
                Tracking Number
              </span>

              <input
                name="trackingNumber"
                defaultValue={
                  sampleRequest.tracking_number ||
                  ""
                }
                className="h-12 rounded-2xl border border-black/10 bg-white px-4 text-black outline-none focus:border-black"
                placeholder="Enter tracking number"
              />
            </label>

            <label className="grid gap-2">
              <span className="text-sm font-bold text-black">
                Tracking URL
              </span>

              <input
                type="url"
                name="trackingUrl"
                defaultValue={
                  sampleRequest.tracking_url ||
                  ""
                }
                className="h-12 rounded-2xl border border-black/10 bg-white px-4 text-black outline-none focus:border-black"
                placeholder="https://..."
              />
            </label>

            <label className="grid gap-2">
              <span className="text-sm font-bold text-black">
                Internal Notes
              </span>

              <textarea
                name="internalNotes"
                defaultValue={
                  sampleRequest.internal_notes ||
                  ""
                }
                rows={5}
                className="rounded-2xl border border-black/10 bg-white px-4 py-3 text-black outline-none focus:border-black"
                placeholder="Qualification notes, shipping details, follow-up information..."
              />
            </label>

            <button
                type="submit"
                className="mt-2 w-full rounded-full bg-black px-6 py-4 font-bold text-white transition hover:bg-black/80"
            >
                Save Changes
            </button>
          </form>

          {(sampleRequest.shipping_carrier ||
            sampleRequest.tracking_number) ? (
            <div className="mt-6 border-t border-black/10 pt-5">
              <div className="text-xs font-bold uppercase tracking-[.14em] text-black/40">
                Current Shipping
              </div>

              <div className="mt-3 text-sm font-bold uppercase text-black">
                {sampleRequest.shipping_carrier ||
                  "Carrier not assigned"}
              </div>

              <div className="mt-1 break-all text-sm text-black/60">
                {sampleRequest.tracking_number ||
                  "No tracking number"}
              </div>

              {sampleRequest.tracking_url ? (
                <a
                  href={
                    sampleRequest.tracking_url
                  }
                  target="_blank"
                  rel="noreferrer"
                  className="mt-3 inline-flex rounded-full bg-black px-4 py-2 text-sm font-bold text-white"
                >
                  Track Sample
                </a>
              ) : null}
            </div>
          ) : null}
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