import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  BadgeDollarSign,
  Building2,
  CalendarDays,
  ChevronRight,
  CircleDollarSign,
  Clock3,
  Mail,
  MapPin,
  PackageCheck,
  Phone,
  ReceiptText,
  Settings,
  ShieldCheck,
  ShoppingBag,
  UserRound
} from "lucide-react";
import { createSupabaseAdmin } from "@/lib/supabase-admin";
import { getAdminStorefront } from "@/lib/admin-storefronts";

export const dynamic = "force-dynamic";

function formatCurrency(amount) {
  const numericAmount = Number(amount || 0);
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD"
  }).format(numericAmount / 100);
}

function formatDate(value, includeTime = false) {
  if (!value) return "Not available";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Not available";

  if (includeTime) {
    return new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit"
    }).format(date);
  }

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric"
  }).format(date);
}

function getInitials(name, email) {
  const source = String(name || email || "Customer").trim();
  return source
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word.charAt(0).toUpperCase())
    .join("");
}

function formatCustomerType(type) {
  switch (type) {
    case "wholesale": return "Wholesale";
    case "business": return "Business";
    default: return "Retail";
  }
}

function getCustomerTypeStyles(type) {
  switch (type) {
    case "wholesale": return "bg-purple-100 text-purple-800";
    case "business": return "bg-blue-100 text-blue-800";
    default: return "bg-[#efe7d8] text-[#604d2f]";
  }
}

function formatStatus(status) {
  return String(status || "active")
    .replaceAll("_", " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function getCustomerStatusStyles(status) {
  switch (status) {
    case "blocked": return "bg-red-100 text-red-800";
    case "inactive": return "bg-gray-200 text-gray-700";
    default: return "bg-green-100 text-green-800";
  }
}

// Order status calculations
function getOrderStatus(order) {
  return order.fulfillment_status || order.payment_status || order.status || "processing";
}

function getOrderStatusStyles(status) {
  const normalizedStatus = String(status || "").toLowerCase();
  if (
    normalizedStatus.includes("paid") ||
    normalizedStatus.includes("complete") ||
    normalizedStatus.includes("delivered") ||
    normalizedStatus.includes("fulfilled")
  ) {
    return "bg-green-100 text-green-800";
  }
  if (
    normalizedStatus.includes("cancel") ||
    normalizedStatus.includes("refund") ||
    normalizedStatus.includes("fail")
  ) {
    return "bg-red-100 text-red-800";
  }
  if (normalizedStatus.includes("ship") || normalizedStatus.includes("transit")) {
    return "bg-blue-100 text-blue-800";
  }
  return "bg-amber-100 text-amber-800";
}

function getOrderReference(order) {
  if (order.order_number) return String(order.order_number);
  return String(order.id || "").slice(0, 8).toUpperCase();
}

function calculateDaysSince(value) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  const difference = Date.now() - date.getTime();
  return Math.max(0, Math.floor(difference / (1000 * 60 * 60 * 24)));
}

function readAddressValue(address, keys) {
  if (!address || typeof address !== "object") return "";
  for (const key of keys) {
    const value = address[key];
    if (value !== null && value !== undefined && String(value).trim()) {
      return String(value).trim();
    }
  }
  return "";
}

function formatAddress(address) {
  if (!address) return null;
  if (typeof address === "string") return address.trim() || null;
  if (typeof address !== "object") return null;

  const line1 = readAddressValue(address, ["line1", "address_line_1", "address1"]);
  const line2 = readAddressValue(address, ["line2", "address_line_2", "address2"]);
  const city = readAddressValue(address, ["city"]);
  const state = readAddressValue(address, ["state", "state_code", "province"]);
  const postalCode = readAddressValue(address, ["postal_code", "zip", "zip_code"]);
  const country = readAddressValue(address, ["country", "country_code"]);

  const lines = [
    line1,
    line2,
    [city, state, postalCode].filter(Boolean).join(", ").replace(", ,", ","),
    country
  ].filter(Boolean);

  return lines.length > 0 ? lines.join("\n") : null;
}

function getOrderAddress(order) {
  return formatAddress(order.shipping_address || order.customer_address || order.address || null);
}

function CustomerMetricCard({ title, value, description, icon: Icon }) {
  return (
    <article className="rounded-[1.75rem] border border-black/5 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.12em] text-black/45">{title}</p>
          <p className="mt-3 text-3xl font-bold text-black">{value}</p>
          <p className="mt-2 text-sm leading-6 text-black/50">{description}</p>
        </div>
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#f1eadf] text-black">
          <Icon size={21} />
        </span>
      </div>
    </article>
  );
}

function InformationRow({ icon: Icon, label, value, href }) {
  return (
    <div className="flex items-start gap-3 rounded-2xl bg-[#faf8f4] p-4">
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white text-black shadow-sm">
        <Icon size={18} />
      </span>
      <div className="min-w-0">
        <p className="text-xs font-bold uppercase tracking-[0.1em] text-black/40">{label}</p>
        {href && value ? (
          <a href={href} className="mt-1 block break-words font-semibold text-black underline decoration-black/20 underline-offset-4">
            {value}
          </a>
        ) : (
          <p className="mt-1 break-words font-semibold text-black">{value || "Not provided"}</p>
        )}
      </div>
    </div>
  );
}

export default async function CustomerProfilePage({ params }) {
  const resolvedParams = await Promise.resolve(params || {});
  const storefront = await getAdminStorefront(resolvedParams.storefront);

  if (!storefront) {
    notFound();
  }

  const customerId = String(resolvedParams.customerId || "").trim();

  if (!customerId) {
    notFound();
  }

  const supabase = createSupabaseAdmin();

  const [customerResult, ordersResult] = await Promise.all([
    supabase
      .from("customers")
      .select("*")
      .eq("id", customerId)
      .maybeSingle(),
    supabase
      .from("orders")
      .select("*")
      .eq("customer_id", customerId)
      .order("created_at", { ascending: false })
  ]);

  if (customerResult.error || !customerResult.data) {
    console.error("Unable to load customer:", customerResult.error);
    notFound();
  }

  if (ordersResult.error) {
    console.error("Unable to load customer orders:", ordersResult.error);
  }

  const customer = customerResult.data;
  const orders = ordersResult.data || [];

  const calculatedLifetimeValue = orders.reduce((total, order) => total + Number(order.total_amount || 0), 0);
  const totalOrders = Number(customer.total_orders || 0) || orders.length;
  const lifetimeValue = Number(customer.lifetime_value || 0) || calculatedLifetimeValue;
  const averageOrderValue = Number(customer.average_order_value || 0) || (orders.length > 0 ? calculatedLifetimeValue / orders.length : 0);
  const largestOrder = Number(customer.largest_order || 0) || orders.reduce((largest, order) => Math.max(largest, Number(order.total_amount || 0)), 0);

  const daysSinceLastOrder = calculateDaysSince(customer.last_order_at);
  const latestOrder = orders[0] || null;
  const shippingAddress = latestOrder ? getOrderAddress(latestOrder) : null;
  const isRepeatCustomer = totalOrders > 1;

  return (
    <main className="min-h-screen bg-[#f8f6f1]">
      <div className="mx-auto max-w-7xl px-5 py-8 md:px-8 md:py-12">
        
        <div className="flex flex-wrap items-center justify-between gap-4">
          <Link href={`/admin/${storefront.slug}/customers`} className="inline-flex items-center gap-2 rounded-full bg-white px-5 py-3 text-sm font-bold text-black shadow-sm transition hover:bg-[#f1eadf]">
            <ArrowLeft size={17} />
            Back to Customers
          </Link>
          <div className="flex flex-wrap gap-3">
            <Link href={`/admin/${storefront.slug}/customers/${customerId}/settings`} className="inline-flex items-center gap-2 rounded-full bg-[#f1eadf] px-5 py-3 text-sm font-bold text-black transition hover:bg-[#e6dac7]">
              <Settings size={17} /> Customer Settings
            </Link>
            <Link href={`/admin/${storefront.slug}/orders`} className="inline-flex items-center gap-2 rounded-full bg-black px-5 py-3 text-sm font-bold text-white transition hover:bg-black/80">
              <ShoppingBag size={17} />
              All Orders
            </Link>
          </div>
        </div>

        <header className="mt-8 rounded-[2rem] border border-black/5 bg-white p-6 shadow-sm md:p-8">
          <div className="flex flex-col gap-6 md:flex-row md:items-start md:justify-between">
            <div className="flex min-w-0 items-start gap-4">
              <span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-black text-xl font-bold text-white md:h-20 md:w-20 md:text-2xl">
                {getInitials(customer.full_name, customer.email)}
              </span>
              <div className="min-w-0">
                <p className="text-sm font-bold uppercase tracking-[0.18em] text-black/40">Customer Profile</p>
                <h1 className="mt-2 break-words font-display text-3xl font-bold text-black md:text-5xl">
                  {customer.full_name || "Unnamed Customer"}
                </h1>
                <p className="mt-2 break-words text-black/55">{customer.email}</p>
                {customer.company_name ? (
                  <p className="mt-1 font-semibold text-black/65">
                    {customer.company_name}
                  </p>
                ) : null}
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <span className={`rounded-full px-4 py-2 text-sm font-bold ${getCustomerTypeStyles(customer.customer_type)}`}>
                {formatCustomerType(customer.customer_type)}
              </span>
              
              {customer.is_wholesale ? (
                <span className="inline-flex items-center gap-2 rounded-full bg-purple-100 px-4 py-2 text-sm font-bold text-purple-800">
                  <ShieldCheck size={15} /> Wholesale Enabled
                </span>
              ) : null}

              <span className={`rounded-full px-4 py-2 text-sm font-bold ${getCustomerStatusStyles(customer.status)}`}>
                {formatStatus(customer.status)}
              </span>
              {isRepeatCustomer ? (
                <span className="rounded-full bg-blue-100 px-4 py-2 text-sm font-bold text-blue-800">Returning Customer</span>
              ) : (
                <span className="rounded-full bg-gray-100 px-4 py-2 text-sm font-bold text-gray-700">New Customer</span>
              )}
            </div>
          </div>
        </header>

        <section className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <CustomerMetricCard title="Lifetime Value" value={formatCurrency(lifetimeValue)} description="Total purchase value generated by this customer." icon={CircleDollarSign} />
          <CustomerMetricCard title="Total Orders" value={totalOrders.toLocaleString("en-US")} description="Number of orders associated with this account." icon={ReceiptText} />
          <CustomerMetricCard title="Average Order" value={formatCurrency(averageOrderValue)} description="Average value across this customer's orders." icon={BadgeDollarSign} />
          <CustomerMetricCard title="Largest Order" value={formatCurrency(largestOrder)} description="Highest single order value recorded." icon={ShoppingBag} />
        </section>

        <div className="mt-6 grid gap-6 xl:grid-cols-[0.8fr_1.2fr]">
          <aside className="grid content-start gap-6">
            <section className="rounded-[2rem] border border-black/5 bg-white p-5 shadow-sm md:p-6">
              <div className="flex items-center gap-3">
                <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#f1eadf] text-black">
                  <UserRound size={21} />
                </span>
                <div>
                  <h2 className="font-display text-2xl font-bold text-black">Contact Information</h2>
                  <p className="mt-1 text-sm text-black/50">Customer identity and contact details.</p>
                </div>
              </div>
              <div className="mt-5 grid gap-3">
                <InformationRow icon={Mail} label="Email" value={customer.email} href={customer.email ? `mailto:${customer.email}` : undefined} />
                <InformationRow icon={Phone} label="Phone" value={customer.phone} href={customer.phone ? `tel:${customer.phone}` : undefined} />
                <InformationRow icon={Building2} label="Company" value={customer.company_name} />
                <InformationRow icon={MapPin} label="Latest Shipping Address" value={shippingAddress} />
              </div>
            </section>

            <section className="rounded-[2rem] border border-black/5 bg-white p-5 shadow-sm md:p-6">
              <div className="flex items-center gap-3">
                <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#f1eadf] text-black">
                  <CalendarDays size={21} />
                </span>
                <div>
                  <h2 className="font-display text-2xl font-bold text-black">Customer Timeline</h2>
                  <p className="mt-1 text-sm text-black/50">Key relationship dates and activity.</p>
                </div>
              </div>
              <div className="mt-5 grid gap-3">
                <InformationRow icon={CalendarDays} label="Customer Since" value={formatDate(customer.first_order_at || customer.created_at)} />
                <InformationRow icon={Clock3} label="Last Purchase" value={formatDate(customer.last_order_at)} />
                <InformationRow icon={Clock3} label="Days Since Last Purchase" value={daysSinceLastOrder === null ? "No completed purchases" : `${daysSinceLastOrder} ${daysSinceLastOrder === 1 ? "day" : "days"}`} />
              </div>
            </section>

            <section className="rounded-[2rem] border border-black/5 bg-white p-5 shadow-sm md:p-6">
              <div className="flex items-center gap-3">
                <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#f1eadf] text-black">
                  <Settings size={21} />
                </span>
                <div>
                  <h2 className="font-display text-2xl font-bold text-black">Customer Settings</h2>
                  <p className="mt-1 text-sm text-black/50">Manage classification, wholesale access, tags, and internal notes.</p>
                </div>
              </div>
              
              <div className="mt-5 grid gap-3">
                <div className="rounded-2xl bg-[#faf8f4] p-4">
                  <p className="text-xs font-bold uppercase tracking-[0.1em] text-black/40">Customer Type</p>
                  <p className="mt-1 font-bold text-black">{formatCustomerType(customer.customer_type)}</p>
                </div>
                <div className="rounded-2xl bg-[#faf8f4] p-4">
                  <p className="text-xs font-bold uppercase tracking-[0.1em] text-black/40">Account Status</p>
                  <p className="mt-1 font-bold text-black">{formatStatus(customer.status)}</p>
                </div>
                <div className="rounded-2xl bg-[#faf8f4] p-4">
                  <p className="text-xs font-bold uppercase tracking-[0.1em] text-black/40">Wholesale</p>
                  <p className="mt-1 font-bold text-black">{customer.is_wholesale ? "Enabled" : "Not enabled"}</p>
                </div>
              </div>

              <Link href={`/admin/${storefront.slug}/customers/${customerId}/settings`} className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-full bg-black px-5 py-3 text-sm font-bold text-white transition hover:bg-black/80">
                <Settings size={17} /> Open Customer Settings
              </Link>
            </section>
          </aside>

          <section className="overflow-hidden rounded-[2rem] border border-black/5 bg-white shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-4 border-b border-black/5 px-5 py-5 md:px-6">
              <div>
                <h2 className="font-display text-2xl font-bold text-black">Order History</h2>
                <p className="mt-1 text-sm text-black/50">All orders connected to this customer.</p>
              </div>
              <span className="rounded-full bg-black px-4 py-2 text-sm font-bold text-white">
                {orders.length.toLocaleString("en-US")} {orders.length === 1 ? "order" : "orders"}
              </span>
            </div>

            {ordersResult.error ? (
              <div className="p-6">
                <div className="rounded-2xl bg-red-50 p-5 text-red-800">
                  <p className="font-bold">Unable to load order history</p>
                  <p className="mt-2 text-sm">Check the server terminal for the Supabase error.</p>
                </div>
              </div>
            ) : orders.length === 0 ? (
              <div className="px-6 py-16 text-center">
                <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-[#f1eadf] text-black">
                  <ShoppingBag size={28} />
                </span>
                <h3 className="mt-5 text-xl font-bold text-black">No orders found</h3>
                <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-black/50">This customer does not currently have any linked orders.</p>
              </div>
            ) : (
              <>
                <div className="hidden overflow-x-auto md:block">
                  <table className="w-full min-w-[760px] border-collapse text-left">
                    <thead>
                      <tr className="bg-[#faf8f4] text-xs font-bold uppercase tracking-[0.1em] text-black/45">
                        <th className="px-6 py-4">Order</th>
                        <th className="px-4 py-4">Date</th>
                        <th className="px-4 py-4">Status</th>
                        <th className="px-4 py-4 text-right">Amount</th>
                        <th className="px-6 py-4 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {orders.map((order) => {
                        const orderStatus = getOrderStatus(order);
                        return (
                          <tr key={order.id} className="border-t border-black/5 transition hover:bg-[#fcfaf6]">
                            <td className="px-6 py-5">
                              <p className="font-bold text-black">#{getOrderReference(order)}</p>
                              {order.stripe_session_id ? (
                                <p className="mt-1 max-w-[190px] truncate text-xs text-black/40">{order.stripe_session_id}</p>
                              ) : null}
                            </td>
                            <td className="px-4 py-5">
                              <p className="font-semibold text-black">{formatDate(order.created_at)}</p>
                              <p className="mt-1 text-xs text-black/40">{formatDate(order.created_at, true)}</p>
                            </td>
                            <td className="px-4 py-5">
                              <span className={`inline-flex rounded-full px-3 py-1 text-xs font-bold ${getOrderStatusStyles(orderStatus)}`}>
                                {formatStatus(orderStatus)}
                              </span>
                            </td>
                            <td className="px-4 py-5 text-right font-bold text-black">{formatCurrency(order.total_amount)}</td>
                            <td className="px-6 py-5 text-right">
                              <Link href={`/admin/${storefront.slug}/orders/${order.id}`} className="inline-flex items-center gap-1 rounded-full bg-black px-4 py-2 text-sm font-bold text-white transition hover:bg-black/80">
                                View <ChevronRight size={15} />
                              </Link>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                <div className="grid gap-4 p-4 md:hidden">
                  {orders.map((order) => {
                    const orderStatus = getOrderStatus(order);
                    return (
                      <article key={order.id} className="rounded-2xl border border-black/8 bg-[#fcfaf6] p-5">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="font-bold text-black">Order #{getOrderReference(order)}</p>
                            <p className="mt-1 text-sm text-black/45">{formatDate(order.created_at, true)}</p>
                          </div>
                          <span className={`shrink-0 rounded-full px-3 py-1 text-xs font-bold ${getOrderStatusStyles(orderStatus)}`}>
                            {formatStatus(orderStatus)}
                          </span>
                        </div>
                        <div className="mt-5 flex items-end justify-between gap-4">
                          <div>
                            <p className="text-xs font-bold uppercase tracking-[0.1em] text-black/40">Order Total</p>
                            <p className="mt-1 text-xl font-bold text-black">{formatCurrency(order.total_amount)}</p>
                          </div>
                          <Link href={`/admin/${storefront.slug}/orders/${order.id}`} className="inline-flex items-center gap-1 rounded-full bg-black px-4 py-2 text-sm font-bold text-white">
                            View Order <ChevronRight size={15} />
                          </Link>
                        </div>
                      </article>
                    );
                  })}
                </div>
              </>
            )}

            {orders.length > 0 ? (
              <div className="border-t border-black/5 px-5 py-5 md:px-6">
                <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl bg-[#faf8f4] p-4">
                  <div className="flex items-center gap-3">
                    <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-white text-black shadow-sm">
                      <PackageCheck size={19} />
                    </span>
                    <div>
                      <p className="text-sm font-bold text-black">Customer Revenue</p>
                      <p className="text-xs text-black/45">Total across linked orders</p>
                    </div>
                  </div>
                  <p className="text-xl font-bold text-black">{formatCurrency(lifetimeValue)}</p>
                </div>
              </div>
            ) : null}
          </section>
        </div>
      </div>
    </main>
  );
}