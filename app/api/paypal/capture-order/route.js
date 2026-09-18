import { NextResponse } from "next/server";
import { fulfillPayPalOrder } from "@/lib/fulfill-checkout";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request) {
  try {
    const body = await request.json();

    // Ignores any request body storefront to ensure database state is authoritative
    const paypalOrderId = String(
      body?.paypalOrderId ||
      body?.orderID ||
      ""
    ).trim();

    if (!paypalOrderId) {
      return NextResponse.json(
        {
          success: false,
          error: "PayPal order ID is required."
        },
        { status: 400 }
      );
    }

    // Delegates to fulfillment logic, which loads order.storefront directly from Supabase
    const result = await fulfillPayPalOrder(paypalOrderId);

    return NextResponse.json(
      {
        success: true,
        ...result
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("PayPal capture failed:", error);

    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Unable to complete PayPal payment."
      },
      { status: 500 }
    );
  }
}