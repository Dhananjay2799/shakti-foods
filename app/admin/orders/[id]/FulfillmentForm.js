"use client";

import { useState } from "react";
import { updateOrderDetails } from "@/app/admin/orders/actions";

export default function FulfillmentForm({
  order
}) {
  const [status, setStatus] =
    useState(
      order.fulfillment_status || "new"
    );

  const [carrier, setCarrier] =
    useState(
      order.shipping_carrier || ""
    );

  const requiresCarrier =
    status === "shipped";

  const requiresTracking =
    status === "shipped" &&
    carrier !== "local_pickup";

  return (
    <form
      action={updateOrderDetails}
      aria-label="Update order fulfillment"
      className="mt-6 grid gap-4"
    >
      <input
        type="hidden"
        name="orderId"
        value={order.id}
      />

      <label className="grid gap-2">
        <span className="text-sm font-bold text-black">
          Order Status
        </span>

        <select
          name="fulfillmentStatus"
          value={status}
          onChange={(event) =>
            setStatus(event.target.value)
          }
          className="rounded-2xl border border-black/15 bg-white px-4 py-3 font-semibold text-black outline-none focus:border-black"
        >
          <option value="new">New</option>
          <option value="processing">
            Processing
          </option>
          <option value="packed">
            Packed
          </option>
          <option value="shipped">
            Shipped
          </option>
          <option value="delivered">
            Delivered
          </option>
          <option value="canceled">
            Canceled
          </option>
        </select>
      </label>

      <label className="grid gap-2">
        <span className="text-sm font-bold text-black">
          Carrier
          {requiresCarrier ? " *" : ""}
        </span>

        <select
          name="shippingCarrier"
          value={carrier}
          onChange={(event) =>
            setCarrier(event.target.value)
          }
          required={requiresCarrier}
          className="rounded-2xl border border-black/15 bg-white px-4 py-3 font-semibold text-black outline-none focus:border-black"
        >
          <option value="">
            None / Unassigned
          </option>
          <option value="ups">UPS</option>
          <option value="fedex">
            FedEx
          </option>
          <option value="usps">USPS</option>
          <option value="dhl">DHL</option>
          <option value="local_pickup">
            Local Pickup
          </option>
          <option value="other">
            Other
          </option>
        </select>
      </label>

      <label className="grid gap-2">
        <span className="text-sm font-bold text-black">
          Tracking Number
          {requiresTracking ? " *" : ""}
        </span>

        <input
          type="text"
          inputMode="text"
          name="trackingNumber"
          defaultValue={
            order.tracking_number || ""
          }
          required={requiresTracking}
          placeholder="e.g. 1Z9999999999999999"
          className="rounded-2xl border border-black/15 bg-white px-4 py-3 text-sm font-semibold text-black outline-none focus:border-black"
        />

        {requiresTracking ? (
          <span className="text-xs font-semibold text-amber-700">
            Enter a tracking number before
            marking this order as shipped.
          </span>
        ) : null}
      </label>

      <label className="grid gap-2">
        <span className="text-sm font-bold text-black">
          Internal Notes
        </span>

        <textarea
          name="internalNotes"
          rows={4}
          defaultValue={
            order.internal_notes || ""
          }
          placeholder="Warehouse / delivery notes..."
          className="resize-y rounded-2xl border border-black/15 bg-white px-4 py-3 text-sm font-semibold text-black outline-none focus:border-black"
        />
      </label>

      <button
        type="submit"
        className="rounded-full bg-black px-6 py-4 font-bold text-white transition hover:bg-[#333333]"
      >
        Save Changes
      </button>
    </form>
  );
}