import { notFound } from "next/navigation";
import {
  Ban,
  Check,
  ChevronDown,
  Clock,
  CreditCard,
  ExternalLink,
  History,
  MapPin,
  Package,
  PackageCheck,
  ShoppingBag,
  Truck,
  User
} from "lucide-react";
import { createSupabaseAdmin } from "@/lib/supabase-admin";
import FulfillmentForm from "@/app/admin/orders/[id]/FulfillmentForm";
import ShippingForm from "@/app/admin/orders/[id]/ShippingForm";
import WholesalePaymentForm from "@/app/admin/orders/[id]/WholesalePaymentForm";
import {
  FulfillmentBadge,
  PaymentBadge,
  statusLabel
} from "@/components/admin/OrderStatusBadge";
import { getAdminStorefront } from "@/lib/admin-storefronts";

export const dynamic = "force-dynamic";

const TIME_ZONE = "America/New_York";

function formatMoney(cents) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD"
  }).format(Number(cents || 0) / 100);
}

function formatDateTime(value) {
  if (!value) return "";

  const date = new Date(value);

  const day = new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: TIME_ZONE
  }).format(date);

  const time = new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
    timeZone: TIME_ZONE
  }).format(date);

  return `${day} · ${time}`;
}

function formatShortDateTime(value) {
  if (!value) return "";

  const date = new Date(value);

  const day = new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    timeZone: TIME_ZONE
  }).format(date);

  const time = new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
    timeZone: TIME_ZONE
  }).format(date);

  return `${day} · ${time}`;
}

const COUNTRY_NAMES = {
  US: "United States",
  CA: "Canada"
};

function addressLines(address) {
  if (!address) return [];

  if (typeof address === "string") {
    return address.split(/\n|,\s*(?=\S)/).filter(Boolean);
  }

  const cityLine = [
    address.city,
    [address.state, address.postal_code].filter(Boolean).join(" ")
  ]
    .filter(Boolean)
    .join(", ");

  return [
    address.line1,
    address.line2,
    cityLine,
    COUNTRY_NAMES[address.country] || address.country
  ].filter(Boolean);
}

// Stripe orders keep the shipping-rate ID (shr_…) here; only show names.
function deliveryName(order) {
  const method = String(order.shipping_method || "").trim();

  return (
    order.shipping_service ||
    (method && !/^shr_/i.test(method) ? method : "")
  );
}

const CARRIER_NAMES = {
  ups: "UPS",
  fedex: "FedEx",
  usps: "USPS",
  dhl: "DHL",
  local_pickup: "Local pickup",
  other: "Other carrier"
};

const PROVIDER_NAMES = {
  stripe: "Stripe",
  paypal: "PayPal",
  wholesale: "Wholesale"
};

function parcelSummary(order) {
  const weight = Number(order.parcel_weight);
  const dims = [order.parcel_length, order.parcel_width, order.parcel_height].map(Number);

  if (!(weight > 0)) return "";

  const size = dims.every((value) => value > 0)
    ? ` · ${dims.map((value) => Number(value.toFixed(2))).join(" × ")} in`
    : "";

  return `${weight.toFixed(2)} lb${size}`;
}

const STEPS = [
  { key: "placed", label: "Placed", icon: ShoppingBag },
  { key: "packed", label: "Packed", icon: Package },
  { key: "shipped", label: "Shipped", icon: Truck },
  { key: "delivered", label: "Delivered", icon: PackageCheck }
];

const STEP_INDEX = {
  new: 0,
  pending: 0,
  processing: 0,
  packed: 1,
  shipped: 2,
  delivered: 3,
  fulfilled: 3
};

function Card({ title, icon: Icon, aside, children, className = "" }) {
  return (
    <section className={`min-w-0 rounded-2xl border border-black/10 bg-white shadow-sm ${className}`}>
      <div className="flex items-center justify-between gap-3 px-5 pt-5">
        <h2 className="flex items-center gap-2 text-base font-bold text-black">
          {Icon ? <Icon size={18} className="text-black/45" aria-hidden="true" /> : null}
          {title}
        </h2>

        {aside}
      </div>

      {children}
    </section>
  );
}

function Detail({ label, children }) {
  return (
    <div className="flex items-start justify-between gap-4 py-2 text-sm">
      <dt className="shrink-0 text-black/55">{label}</dt>
      <dd className="min-w-0 break-all text-right font-medium text-black">{children}</dd>
    </div>
  );
}

export default async function AdminOrderDetailsPage({ params }) {
  const resolvedParams = await Promise.resolve(params);

  const storefront = getAdminStorefront(
    resolvedParams.storefront
  );

  if (!storefront) {
    notFound();
  }

  const orderId = resolvedParams.id;
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
          shipping_service,
          shipping_cost,
          label_url,
          shippo_shipment_id,
          shippo_rate_id,
          shippo_transaction_id,
          parcel_weight,
          parcel_length,
          parcel_width,
          parcel_height,
          currency,
          subtotal,
          shipping_amount,
          tax_amount,
          total_amount,
          payment_provider,
          payment_method,
          payment_reference,
          paid_at,
          discount_amount,
          paypal_order_id,
          paypal_capture_id,
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
          updated_at,
          storefront,
          order_type
        `
      )
      .eq("id", orderId)
      .eq("storefront", storefront.id)
      .maybeSingle(),

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
    if (orderResult.error) {
      console.error("Unable to load order:", orderResult.error);
    }
    notFound();
  }

  if (itemsResult.error) {
    console.error("Unable to load order items:", itemsResult.error);
  }

  const order = orderResult.data;
  const orderItems = itemsResult.data || [];
  const orderNumber = order.id.slice(0, 8).toUpperCase();
  const currency = String(order.currency || "USD").toUpperCase();

  const paymentStatus = String(order.payment_status || "").toLowerCase();
  const fulfillmentStatus = String(order.fulfillment_status || "new").toLowerCase();
  const isPaid = paymentStatus === "paid";
  const isCanceled = fulfillmentStatus === "canceled" || fulfillmentStatus === "cancelled";
  const stepIndex = STEP_INDEX[fulfillmentStatus] ?? 0;

  const address = addressLines(order.shipping_address);
  const delivery = deliveryName(order);
  const carrierName = CARRIER_NAMES[order.shipping_carrier] || order.shipping_carrier || "";
  const hasLabel = Boolean(order.shippo_transaction_id || order.label_url || order.tracking_number);
  const parcel = parcelSummary(order);
  const provider = PROVIDER_NAMES[order.payment_provider] || statusLabel(order.payment_provider, "");

  const stripeIsTest = String(order.stripe_session_id || "").startsWith("cs_test_");
  const stripePaymentUrl = order.stripe_payment_intent_id
    ? `https://dashboard.stripe.com/${stripeIsTest ? "test/" : ""}payments/${encodeURIComponent(order.stripe_payment_intent_id)}`
    : "";

  const events = [
    { at: order.created_at, label: "Order created" },
    order.paid_at ? { at: order.paid_at, label: "Payment recorded" } : null,
    order.packed_at ? { at: order.packed_at, label: "Order packed" } : null,
    order.shipped_at
      ? {
          at: order.shipped_at,
          label: carrierName ? `Order shipped with ${carrierName}` : "Order shipped"
        }
      : null,
    order.delivered_at ? { at: order.delivered_at, label: "Order delivered" } : null,
    order.canceled_at ? { at: order.canceled_at, label: "Order canceled", tone: "text-red-700" } : null
  ]
    .filter((event) => event && event.at)
    .sort((a, b) => new Date(b.at) - new Date(a.at));

  const itemCount = orderItems.length;

  return (
    <div className="grid gap-6">
      {/* Header */}
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0">
          <p className="flex items-center gap-1.5 text-sm font-semibold text-black/55">
            <ShoppingBag size={16} aria-hidden="true" />
            Order details
          </p>

          <h1 className="mt-1.5 font-display text-4xl font-bold text-black">
            Order #{orderNumber}
          </h1>

          <p className="mt-1.5 text-sm text-black/55">
            Created {formatDateTime(order.created_at)}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <PaymentBadge status={order.payment_status} size="md" />
          <FulfillmentBadge status={order.fulfillment_status || "new"} size="md" />
        </div>
      </header>

      {/* Order items */}
      <Card
        title="Order items"
        icon={Package}
        aside={
          <span className="text-sm text-black/50">
            {itemCount} item{itemCount === 1 ? "" : "s"}
          </span>
        }
      >
        {itemCount === 0 ? (
          <p className="px-5 pb-5 pt-4 text-sm text-black/55">
            No order items were found.
          </p>
        ) : (
          <div className="mt-4">
            <div className="hidden grid-cols-[minmax(0,1fr)_4rem_6.5rem_6.5rem] gap-4 border-y border-black/[0.07] bg-[#faf7f2] px-5 py-2.5 text-xs font-semibold text-black/50 sm:grid">
              <span>Product</span>
              <span className="text-center">Qty</span>
              <span className="text-right">Price</span>
              <span className="text-right">Total</span>
            </div>

            <ul className="divide-y divide-black/[0.07] border-t border-black/[0.07] sm:border-t-0">
              {orderItems.map((item) => (
                <li
                  key={item.id}
                  className="grid grid-cols-[minmax(0,1fr)_auto] gap-x-4 gap-y-1 px-5 py-4 sm:grid-cols-[minmax(0,1fr)_4rem_6.5rem_6.5rem] sm:items-center"
                >
                  <div className="min-w-0">
                    <p className="font-bold text-black">{item.product_name}</p>
                    <p className="mt-0.5 text-xs text-black/50">
                      Product ID: {item.product_id}
                      <span className="sm:hidden">
                        {" · "}
                        {Number(item.quantity || 0).toLocaleString()} × {formatMoney(item.unit_price)}
                      </span>
                    </p>
                  </div>

                  <span className="hidden text-center text-sm font-semibold text-black sm:block">
                    {Number(item.quantity || 0).toLocaleString()}
                  </span>

                  <span className="hidden text-right text-sm text-black/70 sm:block">
                    {formatMoney(item.unit_price)}
                  </span>

                  <span className="text-right text-sm font-bold text-black">
                    {formatMoney(item.line_total)}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}

        <dl className="border-t border-black/[0.07] px-5 py-4 text-sm">
          <div className="flex justify-between gap-4 py-1">
            <dt className="text-black/55">Subtotal</dt>
            <dd className="font-semibold text-black">{formatMoney(order.subtotal)}</dd>
          </div>

          {Number(order.discount_amount || 0) > 0 ? (
            <div className="flex justify-between gap-4 py-1">
              <dt className="text-black/55">Discount</dt>
              <dd className="font-semibold text-emerald-700">−{formatMoney(order.discount_amount)}</dd>
            </div>
          ) : null}

          <div className="flex justify-between gap-4 py-1">
            <dt className="text-black/55">Shipping</dt>
            <dd className="font-semibold text-black">{formatMoney(order.shipping_amount)}</dd>
          </div>

          <div className="flex justify-between gap-4 py-1">
            <dt className="text-black/55">Tax</dt>
            <dd className="font-semibold text-black">{formatMoney(order.tax_amount)}</dd>
          </div>

          <div className="mt-3 flex items-baseline justify-between gap-4 border-t border-black/10 pt-4">
            <dt className="text-base font-bold text-black">
              {isPaid ? "Total paid" : "Total"}{" "}
              <span className="text-sm font-semibold text-black/45">{currency}</span>
            </dt>
            <dd className="text-2xl font-bold text-black">{formatMoney(order.total_amount)}</dd>
          </div>
        </dl>
      </Card>

      {/* Customer & delivery */}
      <Card title="Customer & delivery" icon={User}>
        <div className="grid gap-6 px-5 pb-5 pt-4 sm:grid-cols-2">
          <div className="min-w-0">
            <p className="flex items-center gap-1.5 text-xs font-semibold text-black/50">
              <User size={14} aria-hidden="true" />
              Customer
            </p>

            <p className="mt-2 font-bold text-black">
              {order.customer_name || "Guest"}
            </p>

            {order.customer_email ? (
              <a
                href={`mailto:${order.customer_email}`}
                className="mt-1 block truncate text-sm text-black/70 underline-offset-4 hover:text-black hover:underline"
              >
                {order.customer_email}
              </a>
            ) : (
              <p className="mt-1 text-sm text-black/45">No email provided</p>
            )}

            {order.customer_phone ? (
              <a
                href={`tel:${String(order.customer_phone).replace(/[^\d+]/g, "")}`}
                className="mt-0.5 block text-sm text-black/70 underline-offset-4 hover:text-black hover:underline"
              >
                {order.customer_phone}
              </a>
            ) : (
              <p className="mt-0.5 text-sm text-black/45">No phone provided</p>
            )}
          </div>

          <div className="min-w-0">
            <p className="flex items-center gap-1.5 text-xs font-semibold text-black/50">
              <MapPin size={14} aria-hidden="true" />
              Shipping address
            </p>

            {address.length ? (
              <address className="mt-2 text-sm not-italic leading-6 text-black">
                {address.map((line, index) => (
                  <span key={`${line}-${index}`} className="block">{line}</span>
                ))}
              </address>
            ) : (
              <p className="mt-2 text-sm text-black/45">No shipping address</p>
            )}

            {delivery ? (
              <p className="mt-2 text-xs text-black/50">Delivery: {delivery}</p>
            ) : null}
          </div>
        </div>

        <div className="mx-5 flex flex-wrap items-start justify-between gap-3 border-t border-black/[0.07] py-4">
          <div className="flex min-w-0 items-start gap-2.5">
            <Truck size={18} className="mt-0.5 shrink-0 text-black/45" aria-hidden="true" />

            <div className="min-w-0">
              <p className="text-sm font-bold text-black">
                {carrierName || "Carrier not assigned"}
              </p>
              <p className="break-all text-sm text-black/55">
                {order.tracking_number || "Tracking number not added"}
              </p>
            </div>
          </div>

          {order.tracking_url || order.label_url ? (
            <div className="flex flex-wrap gap-2">
              {order.tracking_url ? (
                <a
                  href={order.tracking_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 rounded-lg border border-black/10 px-3 py-1.5 text-sm font-semibold text-black transition hover:bg-black/[0.03]"
                >
                  Track package
                  <ExternalLink size={14} aria-hidden="true" />
                </a>
              ) : null}

              {order.label_url ? (
                <a
                  href={order.label_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 rounded-lg border border-black/10 px-3 py-1.5 text-sm font-semibold text-black transition hover:bg-black/[0.03]"
                >
                  Shipping label
                  <ExternalLink size={14} aria-hidden="true" />
                </a>
              ) : null}
            </div>
          ) : null}
        </div>
      </Card>

      {/* Order activity */}
      <Card title="Order activity" icon={History}>
        <div className="px-5 pb-5 pt-5">
          {isCanceled ? (
            <div className="flex items-center gap-2 rounded-xl bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
              <Ban size={16} aria-hidden="true" />
              This order was canceled.
            </div>
          ) : (
            <ol className="grid grid-cols-4" aria-label="Fulfillment progress">
              {STEPS.map((step, index) => {
                const done = index <= stepIndex;
                const current = index === stepIndex;
                const Icon = index < stepIndex ? Check : step.icon;

                return (
                  <li key={step.key} className="relative flex flex-col items-center text-center">
                    {index > 0 ? (
                      <span
                        aria-hidden="true"
                        className={`absolute right-1/2 top-4 h-0.5 w-full -translate-y-1/2 ${index <= stepIndex ? "bg-black" : "bg-black/10"}`}
                      />
                    ) : null}

                    <span
                      className={[
                        "relative z-10 flex h-8 w-8 items-center justify-center rounded-full",
                        done ? "bg-black text-white" : "border border-black/15 bg-white text-black/35",
                        current ? "ring-4 ring-black/10" : ""
                      ].join(" ")}
                    >
                      <Icon size={15} aria-hidden="true" />
                    </span>

                    <span
                      className={`mt-2 text-xs ${current ? "font-bold text-black" : done ? "font-medium text-black/70" : "text-black/40"}`}
                      aria-current={current ? "step" : undefined}
                    >
                      {step.label}
                    </span>
                  </li>
                );
              })}
            </ol>
          )}

          {!isPaid && !isCanceled ? (
            <p className="mt-4 flex items-center gap-2 rounded-xl bg-amber-50 px-4 py-2.5 text-sm text-amber-800">
              <Clock size={15} aria-hidden="true" />
              {paymentStatus === "cancelled" || paymentStatus === "canceled"
                ? "The customer left checkout without paying."
                : "Waiting for payment. Don't ship this order yet."}
            </p>
          ) : null}

          <ul className="mt-5 grid gap-2.5">
            {events.map((event) => (
              <li key={`${event.label}-${event.at}`} className="flex items-start justify-between gap-4 text-sm">
                <span className={`flex items-center gap-2 font-medium ${event.tone || "text-black"}`}>
                  <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-black/35" aria-hidden="true" />
                  {event.label}
                </span>
                <time dateTime={event.at} className="shrink-0 text-black/50">
                  {formatShortDateTime(event.at)}
                </time>
              </li>
            ))}
          </ul>
        </div>
      </Card>

      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)]">
        {/* Fulfillment */}
        <Card title="Fulfillment" icon={Truck}>
          <div className="px-5 pb-5 pt-4">
            <FulfillmentForm
              key={`${order.updated_at}-${order.fulfillment_status}-${order.shipping_carrier}`}
              order={order}
            />
          </div>

          <details className="group border-t border-black/[0.07]">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-5 py-4 [&::-webkit-details-marker]:hidden">
              <span className="min-w-0">
                <span className="block text-sm font-bold text-black">Shipping label</span>
                <span className="block truncate text-xs text-black/50">
                  {hasLabel
                    ? `Label created${carrierName ? ` · ${carrierName}` : ""}`
                    : parcel || "Get rates and buy a label"}
                </span>
              </span>

              <ChevronDown size={18} className="shrink-0 text-black/45 transition group-open:rotate-180" aria-hidden="true" />
            </summary>

            <div className="px-5 pb-5">
              <ShippingForm order={order} embedded />
            </div>
          </details>
        </Card>

        {/* Payment */}
        <Card
          title="Payment"
          icon={CreditCard}
          aside={<PaymentBadge status={order.payment_status} />}
        >
          <div className="flex items-end justify-between gap-3 px-5 pb-5 pt-3">
            <p className="text-3xl font-bold text-black">
              {formatMoney(order.total_amount)}{" "}
              <span className="text-sm font-semibold text-black/45">{currency}</span>
            </p>

            {provider ? (
              <span className="pb-1 text-sm font-semibold text-black/55">{provider}</span>
            ) : null}
          </div>

          {order.payment_provider === "wholesale" ? (
            <div className="border-t border-black/[0.07] px-5 pb-5">
              <WholesalePaymentForm order={order} />
            </div>
          ) : null}

          <details className="group border-t border-black/[0.07]">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-5 py-4 text-sm font-bold text-black [&::-webkit-details-marker]:hidden">
              Payment details
              <ChevronDown size={18} className="shrink-0 text-black/45 transition group-open:rotate-180" aria-hidden="true" />
            </summary>

            <dl className="divide-y divide-black/[0.06] px-5 pb-4">
              <Detail label="Status">{statusLabel(order.payment_status)}</Detail>
              {provider ? <Detail label="Paid with">{provider}{order.payment_method && order.payment_method !== order.payment_provider ? ` · ${statusLabel(order.payment_method)}` : ""}</Detail> : null}
              {order.paid_at ? <Detail label="Paid on">{formatDateTime(order.paid_at)}</Detail> : null}
              {order.payment_reference ? <Detail label="Reference">{order.payment_reference}</Detail> : null}
              {order.stripe_session_id ? <Detail label="Checkout session">{order.stripe_session_id}</Detail> : null}
              {order.stripe_payment_intent_id ? <Detail label="Payment intent">{order.stripe_payment_intent_id}</Detail> : null}
              {order.paypal_order_id ? <Detail label="PayPal order">{order.paypal_order_id}</Detail> : null}
              {order.paypal_capture_id ? <Detail label="PayPal capture">{order.paypal_capture_id}</Detail> : null}
            </dl>

            {stripePaymentUrl ? (
              <div className="px-5 pb-5">
                <a
                  href={stripePaymentUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-sm font-semibold text-black underline-offset-4 hover:underline"
                >
                  Open in Stripe
                  <ExternalLink size={14} aria-hidden="true" />
                </a>
              </div>
            ) : null}
          </details>
        </Card>
      </div>
    </div>
  );
}
