import Link from "next/link";
import { notFound } from "next/navigation";
import {
  Building2,
  ChevronLeft,
  ChevronRight,
  CircleDollarSign,
  UserRound,
  UsersRound
} from "lucide-react";
import CustomerFilters from "@/components/admin/CustomerFilters";
import { createSupabaseAdmin } from "@/lib/supabase-admin";
import { getAdminStorefront } from "@/lib/admin-storefronts";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 20;

function formatCurrency(amount) {
  const numericAmount = Number(amount || 0);
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD"
  }).format(numericAmount / 100);
}

function formatDate(value) {
  if (!value) {
    return "No orders";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Unknown";
  }

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric"
  }).format(date);
}

function getInitials(name, email) {
  const source = String(name || email || "Customer").trim();

  const words = source
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2);

  return words
    .map((word) => word.charAt(0).toUpperCase())
    .join("");
}

function formatCustomerType(type) {
  switch (type) {
    case "wholesale":
      return "Wholesale";

    case "business":
      return "Business";

    default:
      return "Retail";
  }
}

function getCustomerTypeStyles(type) {
  switch (type) {
    case "wholesale":
      return "bg-violet-50 text-violet-700 ring-violet-600/20";

    case "business":
      return "bg-sky-50 text-sky-700 ring-sky-600/20";

    default:
      return "bg-black/[0.04] text-black/65 ring-black/10";
  }
}

function getStatusStyles(status) {
  switch (status) {
    case "blocked":
      return { badge: "bg-red-50 text-red-700 ring-red-600/20", dot: "bg-red-500" };

    case "inactive":
      return { badge: "bg-black/[0.04] text-black/55 ring-black/10", dot: "bg-black/35" };

    default:
      return { badge: "bg-emerald-50 text-emerald-700 ring-emerald-600/20", dot: "bg-emerald-500" };
  }
}

// A soft colour per customer, so the list is easier to scan.
const AVATAR_TONES = [
  "bg-rose-50 text-rose-700 ring-rose-200",
  "bg-sky-50 text-sky-700 ring-sky-200",
  "bg-violet-50 text-violet-700 ring-violet-200",
  "bg-amber-50 text-amber-800 ring-amber-200",
  "bg-emerald-50 text-emerald-700 ring-emerald-200"
];

function avatarTone(seed) {
  const text = String(seed || "");
  let hash = 0;

  for (let index = 0; index < text.length; index += 1) {
    hash = (hash * 31 + text.charCodeAt(index)) >>> 0;
  }

  return AVATAR_TONES[hash % AVATAR_TONES.length];
}

function formatStatus(status) {
  const normalizedStatus = String(
    status || "active"
  ).toLowerCase();

  return (
    normalizedStatus.charAt(0).toUpperCase() +
    normalizedStatus.slice(1)
  );
}

function buildPageUrl({
  basePath,
  query,
  customerType,
  status,
  sort,
  page
}) {
  const parameters = new URLSearchParams();

  if (query) {
    parameters.set("q", query);
  }

  if (customerType && customerType !== "all") {
    parameters.set("type", customerType);
  }

  if (status && status !== "all") {
    parameters.set("status", status);
  }

  if (sort && sort !== "value") {
    parameters.set("sort", sort);
  }

  if (page > 1) {
    parameters.set("page", String(page));
  }

  const queryString = parameters.toString();

  return queryString
    ? `${basePath}/customers?${queryString}`
    : `${basePath}/customers`;
}

function CustomerMetricCard({
  title,
  value,
  description,
  icon: Icon,
  accent = false
}) {
  return (
    <article
      className="min-w-0 rounded-2xl border border-black/10 bg-white p-4 shadow-sm sm:p-5"
      title={description}
    >
      <div className="flex items-start justify-between gap-3">
        <p className="text-sm font-semibold text-black/60">
          {title}
        </p>

        <span
          className={[
            "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg",
            accent ? "bg-[#f1eadf] text-black" : "bg-black/[0.04] text-black/55"
          ].join(" ")}
          aria-hidden="true"
        >
          <Icon size={16} />
        </span>
      </div>

      <p className="mt-3 truncate text-2xl font-bold tracking-tight text-black sm:text-3xl">
        {value}
      </p>
    </article>
  );
}

function Metric({ label, children, className = "" }) {
  return (
    <div className={`min-w-0 ${className}`}>
      <p className="text-xs text-black/50 lg:hidden">{label}</p>
      <p className="mt-0.5 truncate text-sm font-bold text-black lg:mt-0">{children}</p>
    </div>
  );
}

export default async function AdminCustomersPage({
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

  const basePath = `/admin/${storefront.slug}`;

  const queryParams = await Promise.resolve(
    searchParams || {}
  );

  const query = String(queryParams.q || "").trim();
  const customerType = String(queryParams.type || "all");
  const status = String(queryParams.status || "all");
  const sort = String(queryParams.sort || "value");

  const requestedPage = Number.parseInt(
    queryParams.page || "1",
    10
  );

  const currentPage =
    Number.isFinite(requestedPage) && requestedPage > 0
      ? requestedPage
      : 1;

  const supabase = createSupabaseAdmin();

  /*
   * 1. Fetch orders scoped exclusively to the current storefront
   */
  const {
    data: storefrontOrders,
    error: storefrontOrdersError
  } = await supabase
    .from("orders")
    .select(`
      id,
      customer_id,
      customer_email,
      customer_name,
      payment_status,
      fulfillment_status,
      total_amount,
      created_at
    `)
    .eq("storefront", storefront.id)
    .order("created_at", { ascending: false });

  if (storefrontOrdersError) {
    console.error(
      "Unable to load storefront customer orders:",
      storefrontOrdersError
    );
  }

  const storefrontOrderList = storefrontOrders || [];

  /*
   * 2. Collect unique customer IDs associated with storefront orders
   */
  const customerIds = [
    ...new Set(
      storefrontOrderList
        .map((order) => order.customer_id)
        .filter(Boolean)
    )
  ];

  /*
   * 3. Fetch shared customer details for active storefront customers
   */
  let customers = [];
  if (customerIds.length > 0) {
    const { data, error } = await supabase
      .from("customers")
      .select("*")
      .in("id", customerIds)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Unable to load customers:", error);
    }

    customers = data || [];
  }

  /*
   * 4. Derive storefront-specific aggregate metrics
   */
  const orderStatsByCustomer = new Map();

  for (const order of storefrontOrderList) {
    if (!order.customer_id) {
      continue;
    }

    const current = orderStatsByCustomer.get(
      order.customer_id
    ) || {
      orderCount: 0,
      paidOrderCount: 0,
      totalSpent: 0,
      lastOrderAt: null
    };

    current.orderCount += 1;

    if (order.payment_status === "paid") {
      current.paidOrderCount += 1;
      current.totalSpent += Number(
        order.total_amount || 0
      );
    }

    if (
      !current.lastOrderAt ||
      new Date(order.created_at) >
        new Date(current.lastOrderAt)
    ) {
      current.lastOrderAt = order.created_at;
    }

    orderStatsByCustomer.set(
      order.customer_id,
      current
    );
  }

  /*
   * 5. Combine customers with calculated storefront metrics
   */
  let customerList = customers.map((customer) => {
    const stats = orderStatsByCustomer.get(
      customer.id
    ) || {
      orderCount: 0,
      paidOrderCount: 0,
      totalSpent: 0,
      lastOrderAt: null
    };

    return {
      ...customer,
      storefront_order_count: stats.orderCount,
      storefront_paid_order_count: stats.paidOrderCount,
      storefront_total_spent: stats.totalSpent,
      storefront_last_order_at: stats.lastOrderAt
    };
  });

  /*
   * KPI Summary Card Calculations
   */
  const totalCustomers = customerList.length;

  const lifetimeRevenue = customerList.reduce(
    (total, customer) =>
      total + Number(customer.storefront_total_spent || 0),
    0
  );

  const averageCustomerValue =
    totalCustomers > 0
      ? lifetimeRevenue / totalCustomers
      : 0;

  const wholesaleCustomers = customerList.filter(
    (customer) =>
      customer.is_wholesale === true ||
      customer.customer_type === "wholesale"
  ).length;

  /*
   * 6. In-memory filtering and sorting based on storefront metrics
   */
  if (query) {
    const safeQuery = query.toLowerCase();
    customerList = customerList.filter(
      (c) =>
        (c.full_name &&
          c.full_name.toLowerCase().includes(safeQuery)) ||
        (c.email &&
          c.email.toLowerCase().includes(safeQuery)) ||
        (c.phone &&
          c.phone.toLowerCase().includes(safeQuery)) ||
        (c.company_name &&
          c.company_name.toLowerCase().includes(safeQuery))
    );
  }

  if (customerType !== "all") {
    customerList = customerList.filter(
      (c) => c.customer_type === customerType
    );
  }

  if (status !== "all") {
    customerList = customerList.filter(
      (c) => c.status === status
    );
  }

  switch (sort) {
    case "recent":
      customerList.sort(
        (a, b) =>
          new Date(b.storefront_last_order_at || 0) -
          new Date(a.storefront_last_order_at || 0)
      );
      break;

    case "orders":
      customerList.sort(
        (a, b) =>
          b.storefront_order_count -
          a.storefront_order_count
      );
      break;

    case "name":
      customerList.sort((a, b) =>
        (a.full_name || "").localeCompare(
          b.full_name || ""
        )
      );
      break;

    case "oldest":
      customerList.sort(
        (a, b) =>
          new Date(a.created_at) -
          new Date(b.created_at)
      );
      break;

    default:
      // "value"
      customerList.sort(
        (a, b) =>
          b.storefront_total_spent -
          a.storefront_total_spent
      );
      break;
  }

  /*
   * 7. Pagination calculations
   */
  const totalResults = customerList.length;
  const totalPages = Math.max(
    1,
    Math.ceil(totalResults / PAGE_SIZE)
  );

  const rangeStart = (currentPage - 1) * PAGE_SIZE;
  const rangeEnd = rangeStart + PAGE_SIZE;
  const customerRecords = customerList.slice(
    rangeStart,
    rangeEnd
  );

  const hasPreviousPage = currentPage > 1;
  const hasNextPage = currentPage < totalPages;

  const resultStart =
    totalResults === 0 ? 0 : rangeStart + 1;
  const resultEnd = Math.min(
    rangeStart + customerRecords.length,
    totalResults
  );

  const ROW_GRID =
    "lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)_4.5rem_6.5rem_7.5rem_4rem]";

  return (
    <div className="grid gap-6">
      <header>
        <h1 className="font-display text-4xl font-bold text-black">
          Customers
        </h1>

        <p className="mt-1.5 text-sm text-black/55">
          Customer profiles and purchase activity on {storefront.name}.
        </p>
      </header>

      <section
        aria-label="Customer statistics"
        className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4"
      >
        <CustomerMetricCard
          title="Total customers"
          value={totalCustomers.toLocaleString("en-US")}
          description={`Customers who have placed orders on ${storefront.name}.`}
          icon={UsersRound}
          accent
        />

        <CustomerMetricCard
          title="Lifetime revenue"
          value={formatCurrency(lifetimeRevenue)}
          description={`Total from paid orders on ${storefront.name}.`}
          icon={CircleDollarSign}
        />

        <CustomerMetricCard
          title="Avg. customer value"
          value={formatCurrency(averageCustomerValue)}
          description="Average revenue per customer."
          icon={UserRound}
        />

        <CustomerMetricCard
          title="Wholesale accounts"
          value={wholesaleCustomers.toLocaleString("en-US")}
          description="Wholesale accounts on this storefront."
          icon={Building2}
        />
      </section>

      <section className="overflow-hidden rounded-2xl border border-black/10 bg-white shadow-sm">
        <div className="px-5 pb-4 pt-5">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-lg font-bold text-black">
              Customer directory
            </h2>

            <span className="rounded-lg bg-black/[0.04] px-2.5 py-1 text-xs font-semibold text-black/60">
              {customerRecords.length.toLocaleString("en-US")} shown
              {totalResults > customerRecords.length
                ? ` of ${totalResults.toLocaleString("en-US")}`
                : ""}
            </span>
          </div>

          <div className="mt-4">
            <CustomerFilters
              query={query}
              customerType={customerType}
              status={status}
              sort={sort}
            />
          </div>
        </div>

        {storefrontOrdersError ? (
          <div className="border-t border-black/[0.07] p-5">
            <div className="rounded-xl bg-red-50 p-4 text-red-800">
              <p className="font-bold">Unable to load customers</p>
              <p className="mt-1 text-sm">
                Check the server logs for the Supabase error details.
              </p>
            </div>
          </div>
        ) : customerRecords.length === 0 ? (
          <div className="border-t border-black/[0.07] px-6 py-14 text-center">
            <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-[#f1eadf] text-black">
              <UsersRound size={24} />
            </span>

            <h3 className="mt-4 text-lg font-bold text-black">
              No customers found
            </h3>

            <p className="mx-auto mt-1.5 max-w-md text-sm text-black/55">
              {query || customerType !== "all" || status !== "all"
                ? "No customers match this search or filter."
                : `Customers appear here after their first order on ${storefront.name}.`}
            </p>
          </div>
        ) : (
          <>
            <div
              className={`hidden gap-4 border-y border-black/[0.07] bg-[#faf7f2] px-5 py-2.5 text-xs font-semibold text-black/50 lg:grid ${ROW_GRID}`}
            >
              <span>Customer</span>
              <span>Type &amp; status</span>
              <span className="text-right">Orders</span>
              <span className="text-right">Revenue</span>
              <span>Last purchase</span>
              <span className="sr-only">Actions</span>
            </div>

            <ul className="divide-y divide-black/[0.07] border-t border-black/[0.07] lg:border-t-0">
              {customerRecords.map((customer) => {
                const statusStyles = getStatusStyles(customer.status);
                const profileHref = `${basePath}/customers/${customer.id}`;

                return (
                  <li
                    key={customer.id}
                    className={`grid gap-3 px-5 py-4 transition hover:bg-[#faf7f2] lg:items-center lg:gap-4 ${ROW_GRID}`}
                  >
                    <div className="flex min-w-0 items-start gap-3 lg:items-center">
                      <span
                        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-bold ring-1 ${avatarTone(customer.id)}`}
                        aria-hidden="true"
                      >
                        {getInitials(customer.full_name, customer.email)}
                      </span>

                      <div className="min-w-0 flex-1">
                        <Link
                          href={profileHref}
                          className="block truncate font-bold text-black hover:underline hover:underline-offset-4"
                        >
                          {customer.full_name || "Unnamed customer"}
                        </Link>

                        <p className="truncate text-sm text-black/55">
                          {customer.email || customer.phone || "No email"}
                        </p>

                        {customer.company_name ? (
                          <p className="truncate text-xs font-semibold text-black/45">
                            {customer.company_name}
                          </p>
                        ) : null}
                      </div>

                      <Link
                        href={profileHref}
                        className="inline-flex shrink-0 items-center gap-0.5 text-sm font-bold text-black transition hover:gap-1.5 lg:hidden"
                        aria-label={`View ${customer.full_name || customer.email || "customer"}`}
                      >
                        View
                        <ChevronRight size={16} aria-hidden="true" />
                      </Link>
                    </div>

                    <div className="flex flex-wrap gap-1.5">
                      <span
                        className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-semibold ring-1 ring-inset ${getCustomerTypeStyles(customer.customer_type)}`}
                      >
                        {formatCustomerType(customer.customer_type)}
                      </span>

                      <span
                        className={`inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 text-xs font-semibold ring-1 ring-inset ${statusStyles.badge}`}
                      >
                        <span className={`h-1.5 w-1.5 rounded-full ${statusStyles.dot}`} aria-hidden="true" />
                        {formatStatus(customer.status)}
                      </span>
                    </div>

                    <div className="grid grid-cols-3 gap-3 lg:contents">
                      <Metric label="Orders" className="lg:text-right">
                        {Number(customer.storefront_order_count || 0).toLocaleString("en-US")}
                      </Metric>

                      <Metric label="Revenue" className="lg:text-right">
                        {formatCurrency(customer.storefront_total_spent)}
                      </Metric>

                      <Metric label="Last purchase">
                        {formatDate(customer.storefront_last_order_at)}
                      </Metric>
                    </div>

                    <Link
                      href={profileHref}
                      className="hidden items-center justify-end gap-0.5 text-sm font-bold text-black transition hover:gap-1.5 lg:inline-flex"
                      aria-label={`View ${customer.full_name || customer.email || "customer"}`}
                    >
                      View
                      <ChevronRight size={16} aria-hidden="true" />
                    </Link>
                  </li>
                );
              })}
            </ul>
          </>
        )}

        {totalPages > 1 ? (
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-black/[0.07] px-5 py-3.5">
            <p className="text-sm text-black/55">
              {resultStart}–{resultEnd} of {totalResults} · Page {currentPage} of {totalPages}
            </p>

            <div className="flex items-center gap-2">
              {hasPreviousPage ? (
                <Link
                  href={buildPageUrl({ basePath, query, customerType, status, sort, page: currentPage - 1 })}
                  className="inline-flex items-center gap-1 rounded-xl border border-black/10 px-3 py-2 text-sm font-semibold text-black transition hover:bg-black/[0.03]"
                >
                  <ChevronLeft size={15} aria-hidden="true" />
                  Previous
                </Link>
              ) : null}

              {hasNextPage ? (
                <Link
                  href={buildPageUrl({ basePath, query, customerType, status, sort, page: currentPage + 1 })}
                  className="inline-flex items-center gap-1 rounded-xl bg-black px-3 py-2 text-sm font-bold text-white transition hover:bg-black/85"
                >
                  Next
                  <ChevronRight size={15} aria-hidden="true" />
                </Link>
              ) : null}
            </div>
          </div>
        ) : null}
      </section>
    </div>
  );
}
