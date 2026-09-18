import { NextResponse } from "next/server";
import { fulfillCheckoutSession } from "@/lib/fulfill-checkout";

export const runtime = "nodejs";

export async function POST(request) {
  try {
    const body = await request.json();
    const sessionId = body?.sessionId;

    console.log(
      "Stripe fulfill API received:",
      {
        sessionId
      }
    );

    if (!sessionId || !sessionId.startsWith("cs_")) {
      return NextResponse.json(
        { message: "Invalid Checkout Session ID." },
        { status: 400 }
      );
    }

    console.log(
      "Starting Stripe fulfillment:",
      sessionId
    );

    const result = await fulfillCheckoutSession(sessionId);

    console.log(
      "Stripe fulfillment completed:",
      result
    );

    return NextResponse.json({
      success: true,
      ...result
    });
  } catch (error) {
    console.error(
      "Stripe fulfillment API error:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        message:
          error instanceof Error
            ? error.message
            : "Unable to finalize checkout."
      },
      { status: 500 }
    );
  }
}