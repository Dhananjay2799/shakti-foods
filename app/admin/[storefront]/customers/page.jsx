import Link from "next/link";
import { notFound } from "next/navigation";
import {
  Building2,
  ChevronRight,
  CircleDollarSign,
  Search,
  ShoppingBag,
  UserRound,
  UsersRound
} from "lucide-react";
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
      return "bg-purple-100 text-purple-800";

    case "business":
      return "bg-blue-100 text-blue-800";

    default:
      return "bg-[#efe7d8] text-[#604d2f]";
  }
}

function getStatusStyles(status) {
  switch (status) {
    case "blocked":
      return "bg-red-100 text-red-800";

    case "inactive":
      return "bg-gray-200 text-gray-700";

    default:
      return "bg-green-100 text-green-800";
  }
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
  icon: Icon
}) {
  return (
    <article className="rounded-[1.75rem] border border-black/5 bg-white p-5 shadow-sm md:p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-bold uppercase tracking-[0.12em] text-black/45">
            {title}
          </p>

          <p className="mt-3 text-3xl font-bold text-black md:text-4xl">
            {value}
          </p>

          <p className="mt-2 text-sm leading-6 text-black/50">
            {description}
          </p>
        </div>

        <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#f1eadf] text-black">
          <Icon size={22} />
        </span>
      </div>
    </article>
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

  return (
    <main className="min-h-screen bg-[#f8f6f1]">
      <div className="mx-auto max-w-7xl px-5 py-8 md:px-8 md:py-12">
        <header className="flex flex-wrap items-end justify-between gap-5">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-black/40">
              {storefront.name}
            </p>

            <h1 className="mt-2 text-3xl font-bold text-black md:text-5xl">
              Customers
            </h1>

            <p className="mt-2 text-sm text-black/55">
              Customers with activity on {storefront.name}.
            </p>
          </div>

          <Link
            href={`${basePath}/orders`}
            className="inline-flex items-center gap-2 rounded-full bg-black px-5 py-3 text-sm font-bold text-white transition hover:bg-black/80"
          >
            <ShoppingBag size={17} />
            View Orders
          </Link>
        </header>

        <section className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <CustomerMetricCard
            title="Total Customers"
            value={totalCustomers.toLocaleString("en-US")}
            description={`Customers who have placed orders on ${storefront.name}.`}
            icon={UsersRound}
          />

          <CustomerMetricCard
            title="Lifetime Revenue"
            value={formatCurrency(lifetimeRevenue)}
            description={`Total revenue from paid orders on ${storefront.name}.`}
            icon={CircleDollarSign}
          />

          <CustomerMetricCard
            title="Average Customer Value"
            value={formatCurrency(averageCustomerValue)}
            description="Average revenue per customer for this storefront."
            icon={UserRound}
          />

          <CustomerMetricCard
            title="Wholesale"
            value={wholesaleCustomers.toLocaleString("en-US")}
            description="Wholesale accounts active on this storefront."
            icon={Building2}
          />
        </section>

        <section className="mt-8 rounded-[2rem] border border-black/5 bg-white p-5 shadow-sm md:p-6">
          <form
            action={`${basePath}/customers`}
            method="get"
            className="grid gap-4 lg:grid-cols-[minmax(240px,1fr)_180px_160px_180px_auto]"
          >
            <label className="relative block">
              <span className="sr-only">Search customers</span>

              <Search
                size={19}
                className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-black/40"
              />

              <input
                type="search"
                name="q"
                defaultValue={query}
                placeholder="Search name, email, phone, or company"
                className="h-12 w-full rounded-2xl border border-black/10 bg-[#faf8f4] pl-12 pr-4 text-sm text-black outline-none transition placeholder:text-black/35 focus:border-black"
              />
            </label>

            <label>
              <span className="sr-only">Customer type</span>

              <select
                name="type"
                defaultValue={customerType}
                className="h-12 w-full rounded-2xl border border-black/10 bg-[#faf8f4] px-4 text-sm font-semibold text-black outline-none focus:border-black"
              >
                <option value="all">All customer types</option>
                <option value="retail">Retail</option>
                <option value="wholesale">Wholesale</option>
                <option value="business">Business</option>
              </select>
            </label>

            <label>
              <span className="sr-only">Customer status</span>

              <select
                name="status"
                defaultValue={status}
                className="h-12 w-full rounded-2xl border border-black/10 bg-[#faf8f4] px-4 text-sm font-semibold text-black outline-none focus:border-black"
              >
                <option value="all">All statuses</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
                <option value="blocked">Blocked</option>
              </select>
            </label>

            <label>
              <span className="sr-only">Sort customers</span>

              <select
                name="sort"
                defaultValue={sort}
                className="h-12 w-full rounded-2xl border border-black/10 bg-[#faf8f4] px-4 text-sm font-semibold text-black outline-none focus:border-black"
              >
                <option value="value">Highest value</option>
                <option value="recent">Most recent order</option>
                <option value="orders">Most orders</option>
                <option value="name">Customer name</option>
                <option value="oldest">Oldest customer</option>
              </select>
            </label>

            <button
              type="submit"
              className="h-12 rounded-2xl bg-black px-6 text-sm font-bold text-white transition hover:bg-black/80"
            >
              Apply
            </button>
          </form>

          {(query ||
            customerType !== "all" ||
            status !== "all" ||
            sort !== "value") && (
            <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-black/5 pt-4">
              <p className="text-sm text-black/50">
                Showing filtered customer results.
              </p>

              <Link
                href={`${basePath}/customers`}
                className="text-sm font-bold text-black underline decoration-black/25 underline-offset-4"
              >
                Clear filters
              </Link>
            </div>
          )}
        </section>

        <section className="mt-6 overflow-hidden rounded-[2rem] border border-black/5 bg-white shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-black/5 px-5 py-5 md:px-6">
            <div>
              <h2 className="font-display text-2xl font-bold text-black">
                Customer Directory
              </h2>

              <p className="mt-1 text-sm text-black/50">
                {totalResults === 0
                  ? "No customer records found."
                  : `Showing ${resultStart}–${resultEnd} of ${totalResults} customers`}
              </p>
            </div>

            <span className="rounded-full bg-[#f1eadf] px-4 py-2 text-sm font-bold text-black">
              {totalResults.toLocaleString("en-US")} results
            </span>
          </div>

          {storefrontOrdersError ? (
            <div className="p-6 md:p-10">
              <div className="rounded-2xl bg-red-50 p-5 text-red-800">
                <p className="font-bold">
                  Unable to load customers
                </p>

                <p className="mt-2 text-sm leading-6">
                  Check the server terminal for the Supabase error details.
                </p>
              </div>
            </div>
          ) : customerRecords.length === 0 ? (
            <div className="px-6 py-16 text-center">
              <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-[#f1eadf] text-black">
                <UsersRound size={28} />
              </span>

              <h3 className="mt-5 text-xl font-bold text-black">
                No customers found
              </h3>

              <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-black/50">
                No customer records match the selected search and filters on {storefront.name}.
              </p>

              <Link
                href={`${basePath}/customers`}
                className="mt-5 inline-flex rounded-full bg-black px-5 py-3 text-sm font-bold text-white"
              >
                View all customers
              </Link>
            </div>
          ) : (
            <>
              {/* Desktop table */}
              <div className="hidden overflow-x-auto lg:block">
                <table className="w-full min-w-[1100px] border-collapse text-left">
                  <thead>
                    <tr className="bg-[#faf8f4] text-xs font-bold uppercase tracking-[0.1em] text-black/45">
                      <th className="px-6 py-4">Customer</th>
                      <th className="px-4 py-4">Type</th>
                      <th className="px-4 py-4 text-right">Orders</th>
                      <th className="px-4 py-4 text-right">Storefront Revenue</th>
                      <th className="px-4 py-4">Last Purchase</th>
                      <th className="px-4 py-4">Status</th>
                      <th className="px-6 py-4 text-right">Action</th>
                    </tr>
                  </thead>

                  <tbody>
                    {customerRecords.map((customer) => (
                      <tr
                        key={customer.id}
                        className="border-t border-black/5 transition hover:bg-[#fcfaf6]"
                      >
                        <td className="px-6 py-5">
                          <div className="flex items-center gap-3">
                            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-black text-sm font-bold text-white">
                              {getInitials(
                                customer.full_name,
                                customer.email
                              )}
                            </span>

                            <div className="min-w-0">
                              <p className="truncate font-bold text-black">
                                {customer.full_name ||
                                  "Unnamed customer"}
                              </p>

                              <p className="mt-1 truncate text-sm text-black/50">
                                {customer.email}
                              </p>

                              {customer.phone ? (
                                <p className="mt-1 text-xs text-black/40">
                                  {customer.phone}
                                </p>
                              ) : null}

                              {customer.company_name ? (
                                <p className="mt-1 text-xs font-semibold text-black/50">
                                  {customer.company_name}
                                </p>
                              ) : null}
                            </div>
                          </div>
                        </td>

                        <td className="px-4 py-5">
                          <span
                            className={`inline-flex rounded-full px-3 py-1 text-xs font-bold ${getCustomerTypeStyles(
                              customer.customer_type
                            )}`}
                          >
                            {formatCustomerType(
                              customer.customer_type
                            )}
                          </span>
                        </td>

                        <td className="px-4 py-5 text-right font-bold text-black">
                          {Number(
                            customer.storefront_order_count || 0
                          ).toLocaleString("en-US")}
                        </td>

                        <td className="px-4 py-5 text-right font-bold text-black">
                          {formatCurrency(
                            customer.storefront_total_spent
                          )}
                        </td>

                        <td className="px-4 py-5">
                          <p className="font-semibold text-black">
                            {formatDate(
                              customer.storefront_last_order_at
                            )}
                          </p>

                          <p className="mt-1 text-xs text-black/40">
                            Customer since{" "}
                            {formatDate(
                              customer.first_order_at ||
                                customer.created_at
                            )}
                          </p>
                        </td>

                        <td className="px-4 py-5">
                          <span
                            className={`inline-flex rounded-full px-3 py-1 text-xs font-bold ${getStatusStyles(
                              customer.status
                            )}`}
                          >
                            {formatStatus(customer.status)}
                          </span>
                        </td>

                        <td className="px-6 py-5 text-right">
                          <Link
                            href={`${basePath}/customers/${customer.id}`}
                            className="inline-flex items-center gap-1 rounded-full bg-black px-4 py-2 text-sm font-bold text-white transition hover:bg-black/80"
                          >
                            View
                            <ChevronRight size={15} />
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile and tablet cards */}
              <div className="grid gap-4 p-4 lg:hidden">
                {customerRecords.map((customer) => (
                  <article
                    key={customer.id}
                    className="rounded-2xl border border-black/8 bg-[#fcfaf6] p-5"
                  >
                    <div className="flex items-start gap-3">
                      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-black text-sm font-bold text-white">
                        {getInitials(
                          customer.full_name,
                          customer.email
                        )}
                      </span>

                      <div className="min-w-0 flex-1">
                        <p className="truncate font-bold text-black">
                          {customer.full_name ||
                            "Unnamed customer"}
                        </p>

                        <p className="mt-1 truncate text-sm text-black/50">
                          {customer.email}
                        </p>

                        {customer.phone ? (
                          <p className="mt-1 text-xs text-black/40">
                            {customer.phone}
                          </p>
                        ) : null}
                      </div>

                      <span
                        className={`shrink-0 rounded-full px-3 py-1 text-xs font-bold ${getStatusStyles(
                          customer.status
                        )}`}
                      >
                        {formatStatus(customer.status)}
                      </span>
                    </div>

                    <div className="mt-5 grid grid-cols-2 gap-3">
                      <div className="rounded-xl bg-white p-3">
                        <p className="text-xs text-black/45">
                          Orders
                        </p>

                        <p className="mt-1 font-bold text-black">
                          {Number(
                            customer.storefront_order_count || 0
                          ).toLocaleString("en-US")}
                        </p>
                      </div>

                      <div className="rounded-xl bg-white p-3">
                        <p className="text-xs text-black/45">
                          Storefront spent
                        </p>

                        <p className="mt-1 font-bold text-black">
                          {formatCurrency(
                            customer.storefront_total_spent
                          )}
                        </p>
                      </div>

                      <div className="col-span-2 rounded-xl bg-white p-3">
                        <p className="text-xs text-black/45">
                          Last purchase
                        </p>

                        <p className="mt-1 text-sm font-bold text-black">
                          {formatDate(
                            customer.storefront_last_order_at
                          )}
                        </p>
                      </div>
                    </div>

                    <div className="mt-4 flex items-center justify-between gap-3">
                      <span
                        className={`rounded-full px-3 py-1 text-xs font-bold ${getCustomerTypeStyles(
                          customer.customer_type
                        )}`}
                      >
                        {formatCustomerType(
                          customer.customer_type
                        )}
                      </span>

                      <Link
                        href={`${basePath}/customers/${customer.id}`}
                        className="inline-flex items-center gap-1 rounded-full bg-black px-4 py-2 text-sm font-bold text-white"
                      >
                        View Profile
                        <ChevronRight size={15} />
                      </Link>
                    </div>
                  </article>
                ))}
              </div>
            </>
          )}

          {totalResults > 0 && (
            <div className="flex flex-wrap items-center justify-between gap-4 border-t border-black/5 px-5 py-5 md:px-6">
              <p className="text-sm text-black/50">
                Page {currentPage} of {totalPages}
              </p>

              <div className="flex items-center gap-2">
                {hasPreviousPage ? (
                  <Link
                    href={buildPageUrl({
                      basePath,
                      query,
                      customerType,
                      status,
                      sort,
                      page: currentPage - 1
                    })}
                    className="rounded-full border border-black/10 bg-white px-5 py-2.5 text-sm font-bold text-black transition hover:bg-[#f1eadf]"
                  >
                    Previous
                  </Link>
                ) : (
                  <span className="cursor-not-allowed rounded-full border border-black/5 bg-black/5 px-5 py-2.5 text-sm font-bold text-black/30">
                    Previous
                  </span>
                )}

                {hasNextPage ? (
                  <Link
                    href={buildPageUrl({
                      basePath,
                      query,
                      customerType,
                      status,
                      sort,
                      page: currentPage + 1
                    })}
                    className="rounded-full bg-black px-5 py-2.5 text-sm font-bold text-white transition hover:bg-black/80"
                  >
                    Next
                  </Link>
                ) : (
                  <span className="cursor-not-allowed rounded-full bg-black/10 px-5 py-2.5 text-sm font-bold text-black/30">
                    Next
                  </span>
                )}
              </div>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}