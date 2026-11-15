import { NextResponse } from "next/server";
import { createPayPalOrder } from "@/lib/paypal";
import { getPayPalCheckoutAvailability } from "@/lib/paypal-availability";
import { createSupabaseAdmin } from "@/lib/supabase-admin";
import { CUSTOM_PAYMENT_PAYPAL_CUSTOM_ID } from "@/lib/custom-payment";
import {
  CustomPaymentInputError,
  applyCustomPaymentAdjustment,
  createPendingCustomOrder,
  deleteUnpaidCustomOrder,
  readCustomPaymentRequest
} from "@/lib/custom-payment-server";
import {
  CheckoutAdjustmentError,
  readAdjustmentRequest
} from "@/lib/checkout-adjustment-server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function isProductionDeployment() {
  return process.env.VERCEL_ENV
    ? process.env.VERCEL_ENV === "production"
    : process.env.NODE_ENV === "production";
}

/*
 * Creates a PayPal order for a custom amount. The PayPal buttons then show
 * PayPal's window; /api/paypal/capture-order captures it after approval.
 * Same rules as the cart checkout: never sandbox on the live site, and no
 * PayPal for Simpli Ecoware on the live site yet.
 */
export async function POST(request) {
  const availability = getPayPalCheckoutAvailability();

  if (!availability.enabled) {
    console.warn("Blocked new custom PayPal payment:", availability.reason);

    return NextResponse.json(
      { message: "PayPal is temporarily unavailable. Please pay by card." },
      { status: 503 }
    );
  }

  let supabase = null;
  let orderId = null;

  try {
    let body;

    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ message: "Invalid payment request." }, { status: 400 });
    }

    const adjustment = readAdjustmentRequest(body?.adjustment);
    const payment = applyCustomPaymentAdjustment(readCustomPaymentRequest(body), adjustment);

    if (payment.storefront === "ecoware" && isProductionDeployment()) {
      return NextResponse.json(
        { message: "PayPal is not available for Simpli Ecoware yet. Please pay by card." },
        { status: 503 }
      );
    }

    const businessName = payment.storefront === "ecoware" ? "Simpli Ecoware" : "Shakti Foods";

    supabase = createSupabaseAdmin();
    orderId = await createPendingCustomOrder({ supabase, provider: "paypal", payment });

    const paypalOrder = await createPayPalOrder({
      amount: (payment.totalCents / 100).toFixed(2),
      currency: "USD",
      referenceId: orderId,
      customId: CUSTOM_PAYMENT_PAYPAL_CUSTOM_ID,
      description: (payment.note
        ? `${businessName} payment: ${payment.note}`
        : `${businessName} payment`
      ).slice(0, 127),
      brandName: businessName,
      shippingPreference: payment.includeShipping ? "GET_FROM_FILE" : "NO_SHIPPING"
    });

    if (!paypalOrder?.id) {
      throw new Error("PayPal did not return an order ID.");
    }

    const { error: linkError } = await supabase
      .from("orders")
      .update({ paypal_order_id: paypalOrder.id, updated_at: new Date().toISOString() })
      .eq("id", orderId);

    if (linkError) {
      console.error("Unable to link custom payment to PayPal:", linkError);
      throw new Error("Unable to start the PayPal payment. Please try again.");
    }

    return NextResponse.json({ orderId: paypalOrder.id, internalOrderId: orderId });
  } catch (error) {
    if (orderId && supabase) {
      await deleteUnpaidCustomOrder(supabase, orderId);
    }

    if (error instanceof CustomPaymentInputError) {
      return NextResponse.json({ message: error.message }, { status: 400 });
    }

    if (error instanceof CheckoutAdjustmentError) {
      return NextResponse.json(
        { message: error.message, adjustmentRejected: true },
        { status: error.status }
      );
    }

    console.error("Custom payment (PayPal) error:", error);

    return NextResponse.json(
      { message: "Unable to start the PayPal payment. Please try again." },
      { status: 500 }
    );
  }
}
