import {
  Ban,
  CircleCheck,
  CircleX,
  Clock,
  Inbox,
  Package,
  PackageCheck,
  PackageOpen,
  RotateCcw,
  Truck
} from "lucide-react";

/*
 * Payment and fulfilment badges shared by the dashboard and the order
 * pages, so a status always has the same colour and wording.
 */

const GREEN = "bg-emerald-50 text-emerald-700 ring-emerald-600/20";
const AMBER = "bg-amber-50 text-amber-800 ring-amber-600/20";
const SKY = "bg-sky-50 text-sky-700 ring-sky-600/20";
const INDIGO = "bg-indigo-50 text-indigo-700 ring-indigo-600/20";
const RED = "bg-red-50 text-red-700 ring-red-600/20";
const NEUTRAL = "bg-black/[0.04] text-black/60 ring-black/10";

const PAYMENT = {
  paid: { tone: GREEN, icon: CircleCheck },
  pending: { tone: AMBER, icon: Clock },
  failed: { tone: RED, icon: CircleX },
  refunded: { tone: SKY, icon: RotateCcw },
  partially_refunded: { tone: SKY, icon: RotateCcw },
  cancelled: { tone: NEUTRAL, icon: Ban },
  canceled: { tone: NEUTRAL, icon: Ban }
};

const FULFILLMENT = {
  new: { tone: AMBER, icon: Inbox },
  pending: { tone: AMBER, icon: Clock },
  processing: { tone: SKY, icon: PackageOpen },
  packed: { tone: SKY, icon: Package },
  shipped: { tone: INDIGO, icon: Truck },
  delivered: { tone: GREEN, icon: PackageCheck },
  fulfilled: { tone: GREEN, icon: PackageCheck },
  cancelled: { tone: RED, icon: Ban },
  canceled: { tone: RED, icon: Ban }
};

export function statusLabel(status, fallback = "Unknown") {
  const text = String(status || "").trim().replace(/_/g, " ");

  return text
    ? text.charAt(0).toUpperCase() + text.slice(1)
    : fallback;
}

function Badge({ config, status, fallback, size }) {
  const Icon = size === "md" ? config?.icon : null;

  return (
    <span
      className={[
        "inline-flex w-fit items-center gap-1.5 font-semibold ring-1 ring-inset",
        size === "md" ? "rounded-lg px-2.5 py-1 text-sm" : "rounded-md px-2 py-0.5 text-xs",
        config?.tone || NEUTRAL
      ].join(" ")}
    >
      {Icon ? <Icon size={15} aria-hidden="true" /> : null}
      {statusLabel(status, fallback)}
    </span>
  );
}

export function PaymentBadge({ status, size = "sm" }) {
  return (
    <Badge
      config={PAYMENT[String(status || "").toLowerCase()]}
      status={status}
      fallback="Unknown"
      size={size}
    />
  );
}

export function FulfillmentBadge({ status, size = "sm" }) {
  return (
    <Badge
      config={FULFILLMENT[String(status || "").toLowerCase()]}
      status={status}
      fallback="New"
      size={size}
    />
  );
}
