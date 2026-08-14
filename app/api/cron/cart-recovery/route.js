import {
  NextResponse
} from "next/server";

import {
  processCartRecoveryEmails
} from "@/lib/cart-recovery-processor";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request) {
  try {
    const expectedSecret =
      process.env.CRON_SECRET;

    if (!expectedSecret) {
      console.error(
        "CRON_SECRET is not configured."
      );

      return NextResponse.json(
        {
          success: false,
          message:
            "Cron processor is not configured."
        },
        {
          status: 500
        }
      );
    }

    const authorization =
      request.headers.get(
        "authorization"
      );

    if (
      authorization !==
      `Bearer ${expectedSecret}`
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Unauthorized."
        },
        {
          status: 401
        }
      );
    }

    const summary =
      await processCartRecoveryEmails({
        limit: 25
      });

    return NextResponse.json({
      success: true,
      ...summary
    });
  } catch (error) {
    console.error(
      "Scheduled cart recovery failed:",
      error
    );

    return NextResponse.json(
      {
        success: false,

        message:
          error instanceof Error
            ? error.message
            : "Unable to process scheduled recovery emails."
      },
      {
        status: 500
      }
    );
  }
}