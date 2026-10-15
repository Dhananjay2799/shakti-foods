import {
  NextResponse
} from "next/server";

import {
  processCartRecoveryEmails
} from "@/lib/cart-recovery-processor";

import {
  retryFailedOrderConfirmationEmails
} from "@/lib/order-confirmation-email";

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

    /*
     * Same daily job (Vercel Hobby allows one run per
     * day): re-send order confirmations whose last
     * attempt failed. Runs even if cart recovery
     * fails, and never affects it.
     */
    let orderConfirmationRetries;

    try {
      orderConfirmationRetries =
        await retryFailedOrderConfirmationEmails({
          limit: 25
        });
    } catch (retryError) {
      console.error(
        "Order confirmation email retry failed:",
        retryError
      );

      orderConfirmationRetries = {
        success: false,
        message:
          retryError instanceof Error
            ? retryError.message
            : "Unable to retry order confirmation emails."
      };
    }

    let summary;

    try {
      summary =
        await processCartRecoveryEmails({
          limit: 25
        });
    } catch (recoveryError) {
      console.error(
        "Scheduled cart recovery failed:",
        recoveryError
      );

      return NextResponse.json(
        {
          success: false,

          message:
            recoveryError instanceof Error
              ? recoveryError.message
              : "Unable to process scheduled recovery emails.",

          orderConfirmationRetries
        },
        {
          status: 500
        }
      );
    }

    return NextResponse.json({
      success: true,
      ...summary,
      orderConfirmationRetries
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