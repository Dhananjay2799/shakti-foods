import Link from "next/link";
import { notFound } from "next/navigation";
import { getAdminStorefront } from "@/lib/admin-storefronts";
import { createSupabaseAdmin } from "@/lib/supabase-admin";

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

export default async function WholesalePage({
  params,
  searchParams
}) {
  const resolvedParams = await Promise.resolve(params);

  const storefront = getAdminStorefront(
    resolvedParams.storefront
  );

  if (!storefront) {
    notFound();
  }

  if (storefront.id !== "ecoware") {
    notFound();
  }

  const basePath = `/admin/${storefront.slug}`;

  const queryParams = await Promise.resolve(
    searchParams || {}
  );

  const requestedStatus = String(
    queryParams?.status || "all"
  ).trim();

  const validStatuses = [
    "all",
    "new",
    "contacted",
    "quoted",
    "won",
    "lost"
  ];

  const activeStatus = validStatuses.includes(
    requestedStatus
  )
    ? requestedStatus
    : "all";

  const supabase = createSupabaseAdmin();

  let query = supabase
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
      status,
      created_at,
      updated_at
    `)
    .order("created_at", {
      ascending: false
    });

  if (activeStatus !== "all") {
    query = query.eq("status", activeStatus);
  }

  const { data: inquiries, error } = await query;

  if (error) {
    console.error(
      "Unable to load wholesale inquiries:",
      error
    );
  }

  const { data: allInquiries, error: countsError } =
    await supabase
      .from("wholesale_inquiries")
      .select("status");

  if (countsError) {
    console.error(
      "Unable to load wholesale inquiry counts:",
      countsError
    );
  }

  const counts = {
    all: allInquiries?.length || 0,
    new: 0,
    contacted: 0,
    quoted: 0,
    won: 0,
    lost: 0
  };

  for (const inquiry of allInquiries || []) {
    if (
      Object.prototype.hasOwnProperty.call(
        counts,
        inquiry.status
      )
    ) {
      counts[inquiry.status] += 1;
    }
  }

  const filters = [
    ["all", "All"],
    ["new", "New"],
    ["contacted", "Contacted"],
    ["quoted", "Quoted"],
    ["won", "Won"],
    ["lost", "Lost"]
  ];

  const rows = inquiries || [];

  return (
    <main>
      <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="text-xs font-bold uppercase tracking-[.2em] text-black/40">
            B2B Sales
          </div>

          <h1 className="mt-2 font-display text-4xl font-bold text-black md:text-5xl">
            Wholesale Inquiries
          </h1>

          <p className="mt-2 max-w-2xl text-sm leading-6 text-black/55">
            Review potential wholesale customers, qualify opportunities, send quotes and track conversions.
          </p>
        </div>

        <div className="rounded-full bg-black px-5 py-3 text-sm font-bold text-white">
          {counts.new} New Leads
        </div>
      </div>

      <div className="mt-8 overflow-x-auto">
        <div className="flex min-w-max gap-2">
          {filters.map(([value, label]) => {
            const active = activeStatus === value;

            const href =
              value === "all"
                ? `${basePath}/wholesale`
                : `${basePath}/wholesale?status=${value}`;

            return (
              <Link
                key={value}
                href={href}
                className={[
                  "inline-flex items-center gap-2 rounded-full px-4 py-2.5 text-sm font-bold transition",
                  active
                    ? "bg-black text-white"
                    : "bg-white text-black shadow-soft hover:bg-[#f1eadf]"
                ].join(" ")}
              >
                {label}

                <span
                  className={[
                    "rounded-full px-2 py-0.5 text-xs",
                    active
                      ? "bg-white/20 text-white"
                      : "bg-black/5 text-black"
                  ].join(" ")}
                >
                  {counts[value]}
                </span>
              </Link>
            );
          })}
        </div>
      </div>

      {error ? (
        <div className="mt-8 rounded-[1.5rem] border border-red-200 bg-red-50 p-5 text-sm text-red-800">
          Unable to load wholesale inquiries.
        </div>
      ) : rows.length === 0 ? (
        <div className="mt-8 rounded-[2rem] bg-white p-10 text-center shadow-soft">
          <div className="font-display text-3xl font-bold text-black">
            No wholesale inquiries
          </div>

          <p className="mt-3 text-black/55">
            No leads exist in this status yet.
          </p>
        </div>
      ) : (
        <div className="mt-8 grid gap-4">
          {rows.map((inquiry) => (
            <article
              key={inquiry.id}
              className="rounded-[2rem] bg-white p-5 shadow-soft md:p-6"
            >
              <div className="grid gap-5 lg:grid-cols-[1fr_1fr_1fr_auto] lg:items-center">
                <div>
                  <div className="font-display text-2xl font-bold text-black">
                    {inquiry.customer_name}
                  </div>

                  <div className="mt-1 text-sm text-black/50">
                    {inquiry.email}
                  </div>

                  <div className="mt-2 text-sm font-medium text-black">
                    {inquiry.business_name || "No business name"}
                  </div>

                  <div className="mt-1 text-xs text-black/50">
                    {formatBusinessType(inquiry.business_type)}
                  </div>
                </div>

                <div>
                  <div className="text-xs font-bold uppercase tracking-[.12em] text-black/40">
                    Product
                  </div>

                  <div className="mt-2 font-bold text-black">
                    {inquiry.product_name}
                  </div>

                  {inquiry.product_id ? (
                    <div className="mt-1 font-mono text-xs text-black/40">
                      {inquiry.product_id}
                    </div>
                  ) : null}
                </div>

                <div>
                  <div className="text-xs font-bold uppercase tracking-[.12em] text-black/40">
                    Opportunity
                  </div>

                  <div className="mt-2 font-bold text-black">
                    {inquiry.estimated_quantity
                      ? `${Number(
                          inquiry.estimated_quantity
                        ).toLocaleString()} ${
                          inquiry.quantity_unit || "units"
                        }`
                      : "Quantity not provided"}
                  </div>

                  <div className="mt-1 text-sm text-black/50">
                    {inquiry.purchase_frequency ||
                      "Frequency not provided"}
                  </div>

                  {inquiry.delivery_city ||
                  inquiry.delivery_state ? (
                    <div className="mt-1 text-sm text-black/50">
                      {[
                        inquiry.delivery_city,
                        inquiry.delivery_state,
                        inquiry.delivery_postal_code
                      ]
                        .filter(Boolean)
                        .join(", ")}
                    </div>
                  ) : null}
                </div>

                <div className="flex flex-col items-start gap-3 lg:items-end">
                  <span
                    className={[
                      "rounded-full px-3 py-1.5 text-xs font-bold",
                      statusStyles[inquiry.status] ||
                        "bg-black/5 text-black"
                    ].join(" ")}
                  >
                    {statusLabels[inquiry.status] ||
                      inquiry.status}
                  </span>

                  <div className="text-xs text-black/40">
                    {formatDate(inquiry.created_at)}
                  </div>

                  <Link
                    href={`${basePath}/wholesale/${inquiry.id}`}
                    className="rounded-full bg-black px-5 py-2.5 text-sm font-bold text-white"
                  >
                    Review
                  </Link>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
    </main>
  );
}