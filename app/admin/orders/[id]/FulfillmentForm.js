"use client";

import { useState } from "react";
import { useFormStatus } from "react-dom";
import { Check, LoaderCircle } from "lucide-react";
import { updateOrderDetails } from "@/app/admin/orders/actions";

const STATUS_OPTIONS = [
  ["new", "New"],
  ["processing", "Processing"],
  ["packed", "Packed"],
  ["shipped", "Shipped"],
  ["delivered", "Delivered"],
  ["canceled", "Canceled"]
];

const CARRIER_OPTIONS = [
  ["", "Not assigned"],
  ["ups", "UPS"],
  ["fedex", "FedEx"],
  ["usps", "USPS"],
  ["dhl", "DHL"],
  ["local_pickup", "Local Pickup"],
  ["other", "Other"]
];

const FIELD =
  "w-full rounded-xl border border-black/15 bg-white px-3.5 py-2.5 text-sm font-medium text-black outline-none transition focus:border-black focus:ring-2 focus:ring-black/10";

function SaveRow({ dirty, error }) {
  const { pending } = useFormStatus();

  let status = null;

  if (pending) {
    status = <span className="text-black/55">Saving…</span>;
  } else if (error) {
    status = <span className="font-semibold text-red-700">{error}</span>;
  } else if (dirty) {
    status = <span className="font-semibold text-amber-700">Unsaved changes</span>;
  } else {
    status = (
      <span className="inline-flex items-center gap-1.5 text-emerald-700">
        <Check size={14} aria-hidden="true" />
        All changes saved
      </span>
    );
  }

  return (
    <div className="grid gap-2.5">
      <button
        type="submit"
        disabled={pending || !dirty}
        className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-black px-5 py-3 text-sm font-bold text-white transition hover:bg-black/85 disabled:cursor-not-allowed disabled:bg-black/[0.06] disabled:text-black/40"
      >
        {pending ? (
          <LoaderCircle size={16} className="animate-spin" aria-hidden="true" />
        ) : (
          <Check size={16} aria-hidden="true" />
        )}
        Save changes
      </button>

      <p className="text-xs" role="status" aria-live="polite">
        {status}
      </p>
    </div>
  );
}

export default function FulfillmentForm({
  order
}) {
  const initial = {
    status: order.fulfillment_status || "new",
    carrier: order.shipping_carrier || "",
    tracking: order.tracking_number || "",
    notes: order.internal_notes || ""
  };

  const [status, setStatus] = useState(initial.status);
  const [carrier, setCarrier] = useState(initial.carrier);
  const [trackingNumber, setTrackingNumber] = useState(initial.tracking);
  const [notes, setNotes] = useState(initial.notes);
  const [error, setError] = useState("");

  const dirty =
    status !== initial.status ||
    carrier !== initial.carrier ||
    trackingNumber !== initial.tracking ||
    notes !== initial.notes;

  const requiresCarrier =
    status === "shipped";

  const requiresTracking =
    status === "shipped" &&
    carrier !== "local_pickup";

  // The server action re-renders this page when it saves; the parent gives
  // this form a key from updated_at, so it restarts with the saved values.
  async function save(formData) {
    setError("");

    try {
      await updateOrderDetails(formData);
    } catch (saveError) {
      console.error("Unable to save order:", saveError);
      setError("Couldn't save. Check the fields and try again.");
    }
  }

  return (
    <form
      action={save}
      aria-label="Update order fulfillment"
      className="grid gap-4"
    >
      <input type="hidden" name="orderId" value={order.id} />
      {/* The action looks the order up within its store. */}
      <input type="hidden" name="storefront" value={order.storefront || "shakti_foods"} />

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="grid gap-1.5">
          <span className="text-sm font-semibold text-black">
            Order status
          </span>

          <select
            name="fulfillmentStatus"
            value={status}
            onChange={(event) => setStatus(event.target.value)}
            className={FIELD}
          >
            {STATUS_OPTIONS.map(([value, label]) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>
        </label>

        <label className="grid gap-1.5">
          <span className="text-sm font-semibold text-black">
            Carrier
            {requiresCarrier ? <span className="text-red-600"> *</span> : null}
          </span>

          <select
            name="shippingCarrier"
            value={carrier}
            onChange={(event) => setCarrier(event.target.value)}
            required={requiresCarrier}
            className={FIELD}
          >
            {CARRIER_OPTIONS.map(([value, label]) => (
              <option key={value || "none"} value={value}>{label}</option>
            ))}
          </select>
        </label>
      </div>

      <label className="grid gap-1.5">
        <span className="text-sm font-semibold text-black">
          Tracking number
          {requiresTracking ? <span className="text-red-600"> *</span> : null}
        </span>

        <input
          type="text"
          name="trackingNumber"
          value={trackingNumber}
          onChange={(event) => setTrackingNumber(event.target.value)}
          required={requiresTracking}
          placeholder="Enter tracking number"
          className={FIELD}
        />

        {requiresTracking && !trackingNumber.trim() ? (
          <span className="text-xs font-semibold text-amber-700">
            Add a tracking number before marking this order as shipped.
          </span>
        ) : null}
      </label>

      <label className="grid gap-1.5">
        <span className="text-sm font-semibold text-black">
          Internal note
        </span>

        <textarea
          name="internalNotes"
          rows={3}
          value={notes}
          onChange={(event) => setNotes(event.target.value)}
          placeholder="Add a packing or delivery note…"
          className={`${FIELD} resize-y`}
        />

        <span className="text-xs text-black/50">
          Visible to your team only.
        </span>
      </label>

      <SaveRow dirty={dirty} error={error} />
    </form>
  );
}
