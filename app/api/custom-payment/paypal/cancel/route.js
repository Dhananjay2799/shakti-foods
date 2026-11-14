import { NextResponse } from "next/server";
import { cancelPendingCustomPayment } from "@/lib/custom-payment-server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/*
 * The customer closed the PayPal window without paying. Marks the unpaid
 * custom payment as cancelled; a paid order is never changed.
 */
export async function POST(request) {
  try {
    const body = await request.json().catch(() => ({}));
    const paypalOrderId = String(body?.paypalOrderId || "").trim();

    if (!paypalOrderId) {
      return NextResponse.json({ message: "PayPal order ID is required." }, { status: 400 });
    }

    const result = await cancelPendingCustomPayment({ paypalOrderId });

    return NextResponse.json({ success: true, ...result });
  } catch (error) {
    console.error("Unable to cancel custom PayPal payment:", error);

    return NextResponse.json(
      { message: "Unable to cancel the payment." },
      { status: 500 }
    );
  }
}
