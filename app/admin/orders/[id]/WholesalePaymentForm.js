"use client";

import { useState } from "react";
import { recordWholesalePayment } from "@/app/admin/orders/actions";

const paymentMethodLabels = {
  ach: "ACH",
  bank_transfer: "Bank Transfer / Wire",
  check: "Check",
  cash: "Cash",
  invoice: "Invoice / Net Terms",
  manual: "Manual / Other"
};

export default function WholesalePaymentForm({ order }) {
  const [paymentMethod, setPaymentMethod] = useState(
    order.payment_method || ""
  );

  const alreadyPaid = order.payment_status === "paid";

  if (alreadyPaid) {
    return (
      <div className="mt-4 rounded-xl bg-green-50 p-4">
        <div className="text-xs font-bold uppercase tracking-[.14em] text-green-700">
          Payment Received
        </div>

        <div className="mt-3 text-lg font-bold text-green-900">
          {paymentMethodLabels[order.payment_method] ||
            order.payment_method ||
            "Recorded payment"}
        </div>

        {order.payment_reference ? (
          <div className="mt-2 text-sm text-green-800">
            Reference:{" "}
            <span className="font-bold">{order.payment_reference}</span>
          </div>
        ) : null}

        {order.paid_at ? (
          <div className="mt-2 text-sm text-green-800">
            Payment has been recorded.
          </div>
        ) : null}
      </div>
    );
  }

  return (
    <form action={recordWholesalePayment} className="mt-4 grid gap-4">
      <input type="hidden" name="orderId" value={order.id} />

      <input
        type="hidden"
        name="storefront"
        value={order.storefront || "shakti_foods"}
      />

      <label className="grid gap-1.5">
        <span className="text-sm font-semibold text-black">
          Payment method
        </span>

        <select
          name="paymentMethod"
          value={paymentMethod}
          onChange={(event) => setPaymentMethod(event.target.value)}
          required
          className="w-full rounded-xl border border-black/15 bg-white px-3.5 py-2.5 text-sm font-medium text-black outline-none transition focus:border-black focus:ring-2 focus:ring-black/10"
        >
          <option value="">Select payment method</option>
          <option value="ach">ACH</option>
          <option value="bank_transfer">Bank Transfer / Wire</option>
          <option value="check">Check</option>
          <option value="cash">Cash</option>
          <option value="invoice">Invoice / Net Terms</option>
          <option value="manual">Manual / Other</option>
        </select>
      </label>

      <label className="grid gap-1.5">
        <span className="text-sm font-semibold text-black">
          Payment reference
        </span>

        <input
          type="text"
          name="paymentReference"
          maxLength={300}
          placeholder="ACH reference, check number, invoice payment ID..."
          className="w-full rounded-xl border border-black/15 bg-white px-3.5 py-2.5 text-sm font-medium text-black outline-none transition focus:border-black focus:ring-2 focus:ring-black/10"
        />
      </label>

      <p className="text-xs leading-5 text-black/45">
        Only record the payment after confirming that funds were actually
        received.
      </p>

      <button
        type="submit"
        className="rounded-xl bg-black px-5 py-3 text-sm font-bold text-white transition hover:bg-black/85"
      >
        Record payment
      </button>
    </form>
  );
}