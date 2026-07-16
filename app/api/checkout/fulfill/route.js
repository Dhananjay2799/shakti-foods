import { NextResponse } from "next/server";
import { fulfillCheckoutSession } from "@/lib/fulfill-checkout";

export const runtime = "nodejs";

export async function POST(request) {
  try {
    const body = await request.json();
    const sessionId = body?.sessionId;

    if (!sessionId || !sessionId.startsWith("cs_")) {
      return NextResponse.json(
        { message: "Invalid Checkout Session ID." },
        { status: 400 }
      );
    }

    const result = await fulfillCheckoutSession(sessionId);

    return NextResponse.json({
      success: true,
      ...result
    });
  } catch (error) {
    console.error("Checkout fulfillment recovery error:", error);

    return NextResponse.json(
      {
        success: false,
        message:
          error.message ||
          "Unable to finalize the order."
      },
      { status: 500 }
    );
  }
}