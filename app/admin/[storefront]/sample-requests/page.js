import Link from "next/link";
import { notFound } from "next/navigation";
import { getAdminStorefront } from "@/lib/admin-storefronts";
import { createSupabaseAdmin } from "@/lib/supabase-admin";

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
  if (!value) {
    return "Not provided";
  }

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

  return labels[value] || value;
}

export default async function SampleRequestsPage({ params, searchParams }) {
  const resolvedParams = await Promise.resolve(params);
  const storefront = getAdminStorefront(resolvedParams.storefront);

  if (!storefront) {
    notFound();
  }

  // Ecoware-only feature guard
  if (storefront.id !== "ecoware") {
    notFound();
  }

  const basePath = `/admin/${storefront.slug}`;
  const queryParams = await Promise.resolve(searchParams || {});

  const requestedStatus = String(queryParams?.status || "all").trim();

  const validStatuses = [
    "all",
    "new",
    "approved",
    "shipped",
    "completed",
    "rejected"
  ];

  const activeStatus = validStatuses.includes(requestedStatus)
    ? requestedStatus
    : "all";

  const supabase = createSupabaseAdmin();

  let query = supabase
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
      status,
      shipping_carrier,
      tracking_number,
      created_at,
      updated_at
    `)
    .eq("storefront", storefront.id)
    .order("created_at", { ascending: false });

  if (activeStatus !== "all") {
    query = query.eq("status", activeStatus);
  }

  const { data: requests, error } = await query;

  if (error) {
    console.error("Unable to load sample requests:", error);
  }

  /*
   * Load counts separately so the tabs
   * still show the full workflow totals
   * even while filtering the table.
   */
  const { data: allRequests, error: countsError } = await supabase
    .from("sample_requests")
    .select("status")
    .eq("storefront", storefront.id);

  if (countsError) {
    console.error("Unable to load sample request counts:", countsError);
  }

  const counts = {
    all: allRequests?.length || 0,
    new: 0,
    approved: 0,
    shipped: 0,
    completed: 0,
    rejected: 0
  };

  for (const request of allRequests || []) {
    if (Object.prototype.hasOwnProperty.call(counts, request.status)) {
      counts[request.status] += 1;
    }
  }

  const filters = [
    { value: "all", label: "All" },
    { value: "new", label: "New" },
    { value: "approved", label: "Approved" },
    { value: "shipped", label: "Shipped" },
    { value: "completed", label: "Completed" },
    { value: "rejected", label: "Rejected" }
  ];

  const rows = requests || [];

  return (
    <main>
      <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="text-xs font-bold uppercase tracking-[.2em] text-black/40">
            B2B Sample Program
          </div>

          <h1 className="mt-2 font-display text-4xl font-bold text-black md:text-5xl">
            Sample Requests
          </h1>

          <p className="mt-2 max-w-2xl text-sm leading-6 text-black/55">
            Review free sample requests, qualify potential B2B customers, approve
            shipments and manage fulfillment.
          </p>
        </div>

        <div className="rounded-full bg-black px-5 py-3 text-sm font-bold text-white">
          {counts.new} Pending
        </div>
      </div>

      {/* Status filters */}
      <div className="mt-8 overflow-x-auto">
        <div className="flex min-w-max gap-2">
          {filters.map((filter) => {
            const active = activeStatus === filter.value;

            const href =
              filter.value === "all"
                ? `${basePath}/sample-requests`
                : `${basePath}/sample-requests?status=${filter.value}`;

            return (
              <Link
                key={filter.value}
                href={href}
                className={[
                  "inline-flex items-center gap-2 rounded-full px-4 py-2.5 text-sm font-bold transition",
                  active
                    ? "bg-black text-white"
                    : "bg-white text-black shadow-soft hover:bg-[#f1eadf]"
                ].join(" ")}
              >
                <span>{filter.label}</span>

                <span
                  className={[
                    "rounded-full px-2 py-0.5 text-xs",
                    active ? "bg-white/20 text-white" : "bg-black/5 text-black"
                  ].join(" ")}
                >
                  {counts[filter.value]}
                </span>
              </Link>
            );
          })}
        </div>
      </div>

      {error ? (
        <div className="mt-8 rounded-[1.5rem] border border-red-200 bg-red-50 p-5 text-sm text-red-800">
          Unable to load sample requests. Check the server logs for details.
        </div>
      ) : rows.length === 0 ? (
        <div className="mt-8 rounded-[2rem] bg-white p-8 text-center shadow-soft md:p-12">
          <div className="font-display text-3xl font-bold text-black">
            No sample requests
          </div>

          <p className="mt-3 text-black/55">
            There are no requests in this status yet.
          </p>
        </div>
      ) : (
        <>
          {/* Desktop table */}
          <div className="mt-8 hidden overflow-hidden rounded-[2rem] bg-white shadow-soft lg:block">
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="border-b border-black/10 bg-[#f8f6f1] text-left">
                    <th className="px-5 py-4 text-xs font-bold uppercase tracking-[.12em] text-black/50">
                      Customer
                    </th>
                    <th className="px-5 py-4 text-xs font-bold uppercase tracking-[.12em] text-black/50">
                      Product
                    </th>
                    <th className="px-5 py-4 text-xs font-bold uppercase tracking-[.12em] text-black/50">
                      Business
                    </th>
                    <th className="px-5 py-4 text-xs font-bold uppercase tracking-[.12em] text-black/50">
                      Volume
                    </th>
                    <th className="px-5 py-4 text-xs font-bold uppercase tracking-[.12em] text-black/50">
                      Status
                    </th>
                    <th className="px-5 py-4 text-xs font-bold uppercase tracking-[.12em] text-black/50">
                      Requested
                    </th>
                    <th className="px-5 py-4 text-right text-xs font-bold uppercase tracking-[.12em] text-black/50">
                      Action
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {rows.map((request) => (
                    <tr
                      key={request.id}
                      className="border-b border-black/5 last:border-b-0"
                    >
                      <td className="px-5 py-5 align-top">
                        <div className="font-bold text-black">
                          {request.customer_name}
                        </div>
                        <div className="mt-1 text-xs text-black/50">
                          {request.email}
                        </div>
                        {request.phone ? (
                          <div className="mt-1 text-xs text-black/50">
                            {request.phone}
                          </div>
                        ) : null}
                      </td>

                      <td className="px-5 py-5 align-top">
                        <div className="max-w-[220px] font-medium text-black">
                          {request.product_name}
                        </div>
                        <div className="mt-1 text-xs font-mono text-black/40">
                          {request.product_id}
                        </div>
                      </td>

                      <td className="px-5 py-5 align-top">
                        <div className="font-medium text-black">
                          {request.business_name || "—"}
                        </div>
                        <div className="mt-1 text-xs text-black/50">
                          {formatBusinessType(request.business_type)}
                        </div>
                      </td>

                      <td className="px-5 py-5 align-top">
                        <div className="font-bold text-black">
                          {request.estimated_monthly_quantity
                            ? `${Number(
                                request.estimated_monthly_quantity
                              ).toLocaleString()} / mo`
                            : "—"}
                        </div>
                      </td>

                      <td className="px-5 py-5 align-top">
                        <span
                          className={[
                            "inline-flex rounded-full px-3 py-1.5 text-xs font-bold",
                            statusStyles[request.status] ||
                              "bg-black/5 text-black"
                          ].join(" ")}
                        >
                          {statusLabels[request.status] || request.status}
                        </span>
                      </td>

                      <td className="px-5 py-5 align-top text-sm text-black/60">
                        {formatDate(request.created_at)}
                      </td>

                      <td className="px-5 py-5 text-right align-top">
                        <Link
                          href={`${basePath}/sample-requests/${request.id}`}
                          className="inline-flex rounded-full bg-black px-4 py-2 text-sm font-bold text-white transition hover:bg-black/80"
                        >
                          Review
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Mobile cards */}
          <div className="mt-8 grid gap-4 lg:hidden">
            {rows.map((request) => (
              <article
                key={request.id}
                className="rounded-[1.75rem] bg-white p-5 shadow-soft"
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="font-display text-2xl font-bold text-black">
                      {request.customer_name}
                    </div>

                    <div className="mt-1 text-sm text-black/50">
                      {request.email}
                    </div>
                  </div>

                  <span
                    className={[
                      "shrink-0 rounded-full px-3 py-1.5 text-xs font-bold",
                      statusStyles[request.status] || "bg-black/5 text-black"
                    ].join(" ")}
                  >
                    {statusLabels[request.status] || request.status}
                  </span>
                </div>

                <div className="mt-5 grid gap-4 rounded-2xl bg-[#f8f6f1] p-4">
                  <div>
                    <div className="text-xs font-bold uppercase tracking-[.12em] text-black/40">
                      Product
                    </div>

                    <div className="mt-1 font-bold text-black">
                      {request.product_name}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <div className="text-xs font-bold uppercase tracking-[.12em] text-black/40">
                        Business
                      </div>

                      <div className="mt-1 text-sm font-medium text-black">
                        {request.business_name || "—"}
                      </div>

                      <div className="mt-1 text-xs text-black/50">
                        {formatBusinessType(request.business_type)}
                      </div>
                    </div>

                    <div>
                      <div className="text-xs font-bold uppercase tracking-[.12em] text-black/40">
                        Monthly Volume
                      </div>

                      <div className="mt-1 text-sm font-bold text-black">
                        {request.estimated_monthly_quantity
                          ? Number(
                              request.estimated_monthly_quantity
                            ).toLocaleString()
                          : "—"}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="mt-4 text-xs text-black/45">
                  Requested {formatDate(request.created_at)}
                </div>

                <Link
                  href={`${basePath}/sample-requests/${request.id}`}
                  className="mt-5 block rounded-full bg-black px-5 py-3 text-center text-sm font-bold text-white"
                >
                  Review Request
                </Link>
              </article>
            ))}
          </div>
        </>
      )}
    </main>
  );
}