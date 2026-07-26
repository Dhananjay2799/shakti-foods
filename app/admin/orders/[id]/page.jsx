import Link from "next/link";
import { notFound } from "next/navigation";
import { createSupabaseAdmin } from "@/lib/supabase-admin";
import FulfillmentForm from "./FulfillmentForm";

export const dynamic = "force-dynamic";

function formatMoney(cents) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD"
  }).format(Number(cents || 0) / 100);
}

function formatDate(value) {
  if (!value) {
    return "Not available";
  }

  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "America/New_York"
  }).format(new Date(value));
}

function formatAddress(address) {
  if (!address) {
    return "No shipping address available";
  }

  if (typeof address === "string") {
    return address;
  }

  const parts = [
    address.line1,
    address.line2,
    address.city,
    address.state,
    address.postal_code,
    address.country
  ].filter(Boolean);

  return parts.length
    ? parts.join(", ")
    : "No shipping address available";
}

export default async function AdminOrderDetailsPage({ params }) {
  const orderId = params.id;
  const supabase = createSupabaseAdmin();

  const [orderResult, itemsResult] = await Promise.all([
    supabase
      .from("orders")
      .select(
        `
          id,
          stripe_session_id,
          stripe_payment_intent_id,
          customer_name,
          customer_email,
          customer_phone,
          shipping_address,
          shipping_method,
          currency,
          subtotal,
          shipping_amount,
          tax_amount,
          total_amount,
          payment_status,
          fulfillment_status,
          shipping_carrier,
          tracking_number,
          tracking_url,
          internal_notes,
          packed_at,
          shipped_at,
          delivered_at,
          canceled_at,
          created_at,
          updated_at
        `
      )
      .eq("id", orderId)
      .single(),

    supabase
      .from("order_items")
      .select(
        `
          id,
          product_id,
          product_name,
          quantity,
          unit_price,
          line_total
        `
      )
      .eq("order_id", orderId)
      .order("product_name")
  ]);

  if (orderResult.error || !orderResult.data) {
    console.error("Unable to load order:", orderResult.error);
    notFound();
  }

  if (itemsResult.error) {
    console.error("Unable to load order items:", itemsResult.error);
  }

  const order = orderResult.data;
  const orderItems = itemsResult.data || [];

  return (
    <main className="min-h-screen bg-[#f8f6f1]">
      <div className="mx-auto max-w-7xl px-5 py-10 md:px-8 md:py-12">
        <Link
          href="/admin/orders"
          className="inline-flex rounded-full bg-white px-5 py-3 font-bold text-black shadow transition hover:bg-[#f1eadf]"
        >
          ← Back to Orders
        </Link>

        <div className="mt-7 flex flex-wrap items-end justify-between gap-5">
          <div>
            <div className="text-sm font-bold uppercase tracking-[.18em] text-black/55">
              Order Details
            </div>

            <h1 className="mt-2 font-display text-4xl font-bold text-black md:text-6xl">
              Order #{order.id.slice(0, 8).toUpperCase()}
            </h1>

            <p className="mt-2 text-black/60">
              Created {formatDate(order.created_at)}
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <span className="rounded-full bg-green-100 px-4 py-2 font-bold text-green-800">
              Payment: {order.payment_status || "unknown"}
            </span>

            <span className="rounded-full bg-[#eee7db] px-4 py-2 font-bold text-black">
              Fulfillment: {order.fulfillment_status || "new"}
            </span>
          </div>
        </div>

        <div className="mt-10 grid gap-6 xl:grid-cols-[1.35fr_.75fr]">
          {/* Main Left Column */}
          <div className="grid gap-6">
            {/* Order Items */}
            <section className="rounded-[2rem] bg-white p-5 shadow md:p-7">
              <h2 className="font-display text-3xl font-bold text-black">
                Order Items
              </h2>

              {orderItems.length === 0 ? (
                <p className="mt-6 text-black/60">
                  No order items were found.
                </p>
              ) : (
                <div className="mt-6 overflow-x-auto">
                  <table className="w-full min-w-[650px] text-left">
                    <thead>
                      <tr className="border-b border-black/10 text-sm text-black/50">
                        <th className="pb-3 pr-4">Product</th>
                        <th className="pb-3 pr-4">Product ID</th>
                        <th className="pb-3 pr-4">Quantity</th>
                        <th className="pb-3 pr-4">Unit Price</th>
                        <th className="pb-3">Total</th>
                      </tr>
                    </thead>

                    <tbody>
                      {orderItems.map((item) => (
                        <tr key={item.id} className="border-b border-black/5">
                          <td className="py-4 pr-4 font-bold text-black">
                            {item.product_name}
                          </td>

                          <td className="py-4 pr-4 text-black/60">
                            {item.product_id}
                          </td>

                          <td className="py-4 pr-4 text-black">
                            {Number(item.quantity || 0).toLocaleString()}
                          </td>

                          <td className="py-4 pr-4 text-black">
                            {formatMoney(item.unit_price)}
                          </td>

                          <td className="py-4 font-bold text-black">
                            {formatMoney(item.line_total)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>

            {/* Customer & Delivery */}
            <section className="rounded-[2rem] bg-white p-5 shadow md:p-7">
              <h2 className="font-display text-3xl font-bold text-black">
                Customer & Delivery
              </h2>

              <div className="mt-6 grid gap-5 md:grid-cols-2">
                <div className="rounded-2xl bg-[#faf7f1] p-5">
                  <div className="text-sm font-bold uppercase tracking-[.14em] text-black/50">
                    Customer
                  </div>

                  <p className="mt-3 text-lg font-bold text-black">
                    {order.customer_name || "Guest"}
                  </p>

                  <p className="mt-2 text-black/70">
                    {order.customer_email || "No email provided"}
                  </p>

                  <p className="mt-1 text-black/70">
                    {order.customer_phone || "No phone provided"}
                  </p>
                </div>

                <div className="rounded-2xl bg-[#faf7f1] p-5">
                  <div className="text-sm font-bold uppercase tracking-[.14em] text-black/50">
                    Shipping Address
                  </div>

                  <p className="mt-3 leading-7 text-black">
                    {formatAddress(order.shipping_address)}
                  </p>

                  <p className="mt-3 text-sm text-black/60">
                    Shipping method: {order.shipping_method || "Not recorded"}
                  </p>
                </div>
              </div>
            </section>

            {/* Shipping Information */}
            <section className="rounded-[2rem] bg-white p-5 shadow md:p-7">
              <h2 className="font-display text-3xl font-bold text-black">
                Shipping Information
              </h2>

              <div className="mt-6 grid gap-5 md:grid-cols-2">
                <div className="rounded-2xl bg-[#faf7f1] p-5">
                  <div className="text-xs uppercase tracking-[0.15em] text-black/50 font-bold">
                    Carrier
                  </div>

                  <div className="mt-2 text-lg font-bold text-black capitalize">
                    {order.shipping_carrier || "Not assigned"}
                  </div>
                </div>

                <div className="rounded-2xl bg-[#faf7f1] p-5">
                  <div className="text-xs uppercase tracking-[0.15em] text-black/50 font-bold">
                    Tracking Number
                  </div>

                  <div className="mt-2 text-lg font-bold text-black">
                    {order.tracking_number || "Not available"}
                  </div>
                </div>
              </div>

              {order.tracking_url ? (
                <div className="mt-6">
                  <a
                    href={order.tracking_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex rounded-full bg-black px-6 py-3 font-bold text-white transition hover:bg-black/80"
                  >
                    Track Package ↗
                  </a>
                </div>
              ) : null}
            </section>

            {/* Internal Notes */}
            <section className="rounded-[2rem] bg-white p-5 shadow md:p-7">
              <h2 className="font-display text-3xl font-bold text-black">
                Internal Notes
              </h2>

              <div className="mt-4 min-h-[60px] rounded-2xl bg-[#faf7f1] p-5 whitespace-pre-wrap text-black/80">
                {order.internal_notes || "No internal notes recorded."}
              </div>
            </section>

            {/* Timeline */}
            <section className="rounded-[2rem] bg-white p-5 shadow md:p-7">
              <h2 className="font-display text-3xl font-bold text-black">
                Fulfillment Timeline
              </h2>

              <div className="mt-6 space-y-4">
                {[
                  ["Packed", order.packed_at],
                  ["Shipped", order.shipped_at],
                  ["Delivered", order.delivered_at],
                  ["Canceled", order.canceled_at]
                ].map(([label, time]) => (
                  <div
                    key={label}
                    className="flex justify-between items-center border-b border-black/5 pb-3 text-sm"
                  >
                    <span className="font-bold text-black">{label}</span>
                    <span className="text-black/60">
                      {time ? formatDate(time) : "—"}
                    </span>
                  </div>
                ))}
              </div>
            </section>
          </div>

          {/* Right Sidebar */}
          <aside className="grid h-fit gap-6">
            {/* Fulfillment Management Form */}
            <section className="rounded-[2rem] bg-white p-5 shadow md:p-7">
              <h2 className="font-display text-3xl font-bold text-black">
                Fulfillment
              </h2>

              <p className="mt-2 text-sm leading-6 text-black/60">
                Update status, carrier, tracking number, and notes.
              </p>

              <FulfillmentForm order={order} />
            </section>

            {/* Order Summary */}
            <section className="rounded-[2rem] bg-white p-5 shadow md:p-7">
              <h2 className="font-display text-3xl font-bold text-black">
                Order Summary
              </h2>

              <div className="mt-6 grid gap-4 text-black">
                <div className="flex justify-between gap-4">
                  <span>Subtotal</span>
                  <span className="font-bold">{formatMoney(order.subtotal)}</span>
                </div>

                <div className="flex justify-between gap-4">
                  <span>Shipping</span>
                  <span className="font-bold">
                    {formatMoney(order.shipping_amount)}
                  </span>
                </div>

                <div className="flex justify-between gap-4">
                  <span>Tax</span>
                  <span className="font-bold">{formatMoney(order.tax_amount)}</span>
                </div>

                <div className="flex justify-between gap-4 border-t border-black/10 pt-4 text-lg">
                  <span className="font-bold">Total</span>
                  <span className="font-bold">
                    {formatMoney(order.total_amount)}
                  </span>
                </div>
              </div>
            </section>

            {/* Stripe Information */}
            <section className="rounded-[2rem] bg-white p-5 shadow md:p-7">
              <h2 className="font-display text-2xl font-bold text-black">
                Stripe Information
              </h2>

              <div className="mt-5 grid gap-4 text-sm">
                <div>
                  <div className="font-bold text-black">Checkout Session</div>
                  <div className="mt-1 break-all text-black/60">
                    {order.stripe_session_id || "Not recorded"}
                  </div>
                </div>

                <div>
                  <div className="font-bold text-black">Payment Intent</div>
                  <div className="mt-1 break-all text-black/60">
                    {order.stripe_payment_intent_id || "Not recorded"}
                  </div>
                </div>
              </div>
            </section>
          </aside>
        </div>
      </div>
    </main>
  );
}