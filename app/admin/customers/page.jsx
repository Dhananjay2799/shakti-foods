import Link from "next/link";
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

export const dynamic = "force-dynamic";

const PAGE_SIZE = 20;

function formatCurrency(amount) {
  const numericAmount = Number(amount || 0);

  /*
   * Stripe normally stores monetary amounts in cents.
   *
   * Example:
   * 2198 = $21.98
   *
   * If your total_amount and lifetime_value columns store
   * complete dollar values instead, remove "/ 100".
   */
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
    ? `/admin/customers?${queryString}`
    : "/admin/customers";
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

export default async function CustomersPage({
  searchParams
}) {
  const resolvedSearchParams =
    await Promise.resolve(searchParams || {});

  const query = String(
    resolvedSearchParams.q || ""
  ).trim();

  const customerType = String(
    resolvedSearchParams.type || "all"
  );

  const status = String(
    resolvedSearchParams.status || "all"
  );

  const sort = String(
    resolvedSearchParams.sort || "value"
  );

  const requestedPage = Number.parseInt(
    resolvedSearchParams.page || "1",
    10
  );

  const currentPage =
    Number.isFinite(requestedPage) &&
    requestedPage > 0
      ? requestedPage
      : 1;

  const supabase = createSupabaseAdmin();

  /*
   * Load summary metrics independently from the paginated
   * customer table. This keeps the KPI cards accurate even
   * when search or filters are active.
   */
  const { data: allCustomerMetrics, error: metricsError } =
    await supabase
      .from("customers")
      .select(
        `
          id,
          lifetime_value,
          total_orders,
          customer_type,
          is_wholesale,
          status
        `
      );

  if (metricsError) {
    console.error(
      "Unable to load customer metrics:",
      metricsError
    );
  }

  const metrics = allCustomerMetrics || [];

  const totalCustomers = metrics.length;

  const lifetimeRevenue = metrics.reduce(
    (total, customer) =>
      total +
      Number(customer.lifetime_value || 0),
    0
  );

  const averageCustomerValue =
    totalCustomers > 0
      ? lifetimeRevenue / totalCustomers
      : 0;

  const wholesaleCustomers = metrics.filter(
    (customer) =>
      customer.is_wholesale === true ||
      customer.customer_type === "wholesale"
  ).length;

  /*
   * Build the customer list query.
   */
  let customerQuery = supabase
    .from("customers")
    .select(
      `
        id,
        email,
        full_name,
        phone,
        company_name,
        customer_type,
        status,
        is_wholesale,
        first_order_at,
        last_order_at,
        total_orders,
        lifetime_value,
        average_order_value,
        largest_order,
        tags,
        created_at
      `,
      {
        count: "exact"
      }
    );

  if (query) {
    /*
     * Remove characters that can interfere with Supabase's
     * comma-separated OR filter syntax.
     */
    const safeQuery = query
      .replaceAll(",", " ")
      .replaceAll("(", " ")
      .replaceAll(")", " ")
      .trim();

    if (safeQuery) {
      customerQuery = customerQuery.or(
        [
          `full_name.ilike.%${safeQuery}%`,
          `email.ilike.%${safeQuery}%`,
          `phone.ilike.%${safeQuery}%`,
          `company_name.ilike.%${safeQuery}%`
        ].join(",")
      );
    }
  }

  if (customerType !== "all") {
    customerQuery = customerQuery.eq(
      "customer_type",
      customerType
    );
  }

  if (status !== "all") {
    customerQuery = customerQuery.eq(
      "status",
      status
    );
  }

  switch (sort) {
    case "recent":
      customerQuery = customerQuery.order(
        "last_order_at",
        {
          ascending: false,
          nullsFirst: false
        }
      );
      break;

    case "orders":
      customerQuery = customerQuery.order(
        "total_orders",
        {
          ascending: false
        }
      );
      break;

    case "name":
      customerQuery = customerQuery.order(
        "full_name",
        {
          ascending: true,
          nullsFirst: false
        }
      );
      break;

    case "oldest":
      customerQuery = customerQuery.order(
        "created_at",
        {
          ascending: true
        }
      );
      break;

    default:
      customerQuery = customerQuery.order(
        "lifetime_value",
        {
          ascending: false
        }
      );
      break;
  }

  const rangeStart =
    (currentPage - 1) * PAGE_SIZE;

  const rangeEnd =
    rangeStart + PAGE_SIZE - 1;

  const {
    data: customers,
    error: customersError,
    count
  } = await customerQuery.range(
    rangeStart,
    rangeEnd
  );

  if (customersError) {
    console.error(
      "Unable to load customers:",
      customersError
    );
  }

  const customerRecords = customers || [];
  const totalResults = count || 0;

  const totalPages = Math.max(
    1,
    Math.ceil(totalResults / PAGE_SIZE)
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
            <p className="text-sm font-bold uppercase tracking-[0.18em] text-black/45">
              Customer Management
            </p>

            <h1 className="mt-2 font-display text-4xl font-bold text-black md:text-6xl">
              Customers
            </h1>

            <p className="mt-3 max-w-2xl text-base leading-7 text-black/55">
              Manage customer records, purchase
              history, order value, and wholesale
              relationships.
            </p>
          </div>

          <Link
            href="/admin/orders"
            className="inline-flex items-center gap-2 rounded-full bg-black px-5 py-3 text-sm font-bold text-white transition hover:bg-black/80"
          >
            <ShoppingBag size={17} />
            View Orders
          </Link>
        </header>

        <section className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <CustomerMetricCard
            title="Total Customers"
            value={totalCustomers.toLocaleString(
              "en-US"
            )}
            description="All customers created from completed and existing orders."
            icon={UsersRound}
          />

          <CustomerMetricCard
            title="Lifetime Revenue"
            value={formatCurrency(
              lifetimeRevenue
            )}
            description="Combined order value generated by all customers."
            icon={CircleDollarSign}
          />

          <CustomerMetricCard
            title="Average Customer Value"
            value={formatCurrency(
              averageCustomerValue
            )}
            description="Average lifetime value across the customer base."
            icon={UserRound}
          />

          <CustomerMetricCard
            title="Wholesale"
            value={wholesaleCustomers.toLocaleString(
              "en-US"
            )}
            description="Customers currently marked as wholesale accounts."
            icon={Building2}
          />
        </section>

        <section className="mt-8 rounded-[2rem] border border-black/5 bg-white p-5 shadow-sm md:p-6">
          <form
            action="/admin/customers"
            method="get"
            className="grid gap-4 lg:grid-cols-[minmax(240px,1fr)_180px_160px_180px_auto]"
          >
            <label className="relative block">
              <span className="sr-only">
                Search customers
              </span>

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
              <span className="sr-only">
                Customer type
              </span>

              <select
                name="type"
                defaultValue={customerType}
                className="h-12 w-full rounded-2xl border border-black/10 bg-[#faf8f4] px-4 text-sm font-semibold text-black outline-none focus:border-black"
              >
                <option value="all">
                  All customer types
                </option>

                <option value="retail">
                  Retail
                </option>

                <option value="wholesale">
                  Wholesale
                </option>

                <option value="business">
                  Business
                </option>
              </select>
            </label>

            <label>
              <span className="sr-only">
                Customer status
              </span>

              <select
                name="status"
                defaultValue={status}
                className="h-12 w-full rounded-2xl border border-black/10 bg-[#faf8f4] px-4 text-sm font-semibold text-black outline-none focus:border-black"
              >
                <option value="all">
                  All statuses
                </option>

                <option value="active">
                  Active
                </option>

                <option value="inactive">
                  Inactive
                </option>

                <option value="blocked">
                  Blocked
                </option>
              </select>
            </label>

            <label>
              <span className="sr-only">
                Sort customers
              </span>

              <select
                name="sort"
                defaultValue={sort}
                className="h-12 w-full rounded-2xl border border-black/10 bg-[#faf8f4] px-4 text-sm font-semibold text-black outline-none focus:border-black"
              >
                <option value="value">
                  Highest value
                </option>

                <option value="recent">
                  Most recent order
                </option>

                <option value="orders">
                  Most orders
                </option>

                <option value="name">
                  Customer name
                </option>

                <option value="oldest">
                  Oldest customer
                </option>
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
                href="/admin/customers"
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
              {totalResults.toLocaleString("en-US")}{" "}
              results
            </span>
          </div>

          {customersError ? (
            <div className="p-6 md:p-10">
              <div className="rounded-2xl bg-red-50 p-5 text-red-800">
                <p className="font-bold">
                  Unable to load customers
                </p>

                <p className="mt-2 text-sm leading-6">
                  Check the server terminal for the
                  Supabase error details.
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
                No customer records match the selected
                search and filters.
              </p>

              <Link
                href="/admin/customers"
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
                      <th className="px-6 py-4">
                        Customer
                      </th>

                      <th className="px-4 py-4">
                        Type
                      </th>

                      <th className="px-4 py-4 text-right">
                        Orders
                      </th>

                      <th className="px-4 py-4 text-right">
                        Lifetime Value
                      </th>

                      <th className="px-4 py-4 text-right">
                        Average Order
                      </th>

                      <th className="px-4 py-4">
                        Last Purchase
                      </th>

                      <th className="px-4 py-4">
                        Status
                      </th>

                      <th className="px-6 py-4 text-right">
                        Action
                      </th>
                    </tr>
                  </thead>

                  <tbody>
                    {customerRecords.map(
                      (customer) => (
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
                                    {
                                      customer.company_name
                                    }
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
                              customer.total_orders || 0
                            ).toLocaleString("en-US")}
                          </td>

                          <td className="px-4 py-5 text-right font-bold text-black">
                            {formatCurrency(
                              customer.lifetime_value
                            )}
                          </td>

                          <td className="px-4 py-5 text-right text-black/65">
                            {formatCurrency(
                              customer.average_order_value
                            )}
                          </td>

                          <td className="px-4 py-5">
                            <p className="font-semibold text-black">
                              {formatDate(
                                customer.last_order_at
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
                              {formatStatus(
                                customer.status
                              )}
                            </span>
                          </td>

                          <td className="px-6 py-5 text-right">
                            <Link
                              href={`/admin/customers/${customer.id}`}
                              className="inline-flex items-center gap-1 rounded-full bg-black px-4 py-2 text-sm font-bold text-white transition hover:bg-black/80"
                            >
                              View
                              <ChevronRight
                                size={15}
                              />
                            </Link>
                          </td>
                        </tr>
                      )
                    )}
                  </tbody>
                </table>
              </div>

              {/* Mobile and tablet cards */}
              <div className="grid gap-4 p-4 lg:hidden">
                {customerRecords.map(
                  (customer) => (
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
                          {formatStatus(
                            customer.status
                          )}
                        </span>
                      </div>

                      <div className="mt-5 grid grid-cols-2 gap-3">
                        <div className="rounded-xl bg-white p-3">
                          <p className="text-xs text-black/45">
                            Orders
                          </p>

                          <p className="mt-1 font-bold text-black">
                            {Number(
                              customer.total_orders || 0
                            ).toLocaleString("en-US")}
                          </p>
                        </div>

                        <div className="rounded-xl bg-white p-3">
                          <p className="text-xs text-black/45">
                            Lifetime value
                          </p>

                          <p className="mt-1 font-bold text-black">
                            {formatCurrency(
                              customer.lifetime_value
                            )}
                          </p>
                        </div>

                        <div className="rounded-xl bg-white p-3">
                          <p className="text-xs text-black/45">
                            Average order
                          </p>

                          <p className="mt-1 font-bold text-black">
                            {formatCurrency(
                              customer.average_order_value
                            )}
                          </p>
                        </div>

                        <div className="rounded-xl bg-white p-3">
                          <p className="text-xs text-black/45">
                            Last purchase
                          </p>

                          <p className="mt-1 text-sm font-bold text-black">
                            {formatDate(
                              customer.last_order_at
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
                          href={`/admin/customers/${customer.id}`}
                          className="inline-flex items-center gap-1 rounded-full bg-black px-4 py-2 text-sm font-bold text-white"
                        >
                          View Profile
                          <ChevronRight size={15} />
                        </Link>
                      </div>
                    </article>
                  )
                )}
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