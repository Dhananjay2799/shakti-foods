import {
  createSupabaseAdmin
} from "@/lib/supabase-admin";

import {
  sendCartRecoveryEmailSafely
} from "@/lib/cart-recovery-email";

const FIRST_EMAIL_DELAY_MINUTES = 30;
const SECOND_EMAIL_DELAY_HOURS = 24;
const FINAL_EMAIL_DELAY_HOURS = 72;

function subtractMinutes(
  date,
  minutes
) {
  return new Date(
    date.getTime() -
      minutes * 60 * 1000
  );
}

function subtractHours(
  date,
  hours
) {
  return new Date(
    date.getTime() -
      hours * 60 * 60 * 1000
  );
}

function determineEmailStage(
  recovery,
  now
) {
  if (!recovery.abandoned_at) {
    return null;
  }

  const abandonedAt =
    new Date(
      recovery.abandoned_at
    );

  /*
   * Final email has highest priority.
   */
  if (
    !recovery.final_email_sent_at &&
    recovery.second_email_sent_at &&
    abandonedAt <=
      subtractHours(
        now,
        FINAL_EMAIL_DELAY_HOURS
      )
  ) {
    return "final";
  }

  /*
   * Second reminder.
   */
  if (
    !recovery.second_email_sent_at &&
    recovery.first_email_sent_at &&
    abandonedAt <=
      subtractHours(
        now,
        SECOND_EMAIL_DELAY_HOURS
      )
  ) {
    return "second";
  }

  /*
   * Initial abandoned-cart reminder.
   */
  if (
    !recovery.first_email_sent_at &&
    abandonedAt <=
      subtractMinutes(
        now,
        FIRST_EMAIL_DELAY_MINUTES
      )
  ) {
    return "first";
  }

  return null;
}

function timestampFieldForStage(
  stage
) {
  switch (stage) {
    case "first":
      return "first_email_sent_at";

    case "second":
      return "second_email_sent_at";

    case "final":
      return "final_email_sent_at";

    default:
      return null;
  }
}

async function loadOrderStorefronts(
  supabase,
  recoveries
) {
  const orderIds = [
    ...new Set(
      recoveries
        .map((recovery) =>
          String(recovery.order_id || "").trim()
        )
        .filter(Boolean)
    )
  ];

  const storefrontByOrderId = new Map();

  if (orderIds.length === 0) {
    return storefrontByOrderId;
  }

  const { data, error } = await supabase
    .from("orders")
    .select("id, storefront")
    .in("id", orderIds);

  if (error) {
    /*
     * Without the storefront we cannot brand the email
     * correctly, so fail this run (the cron retries
     * tomorrow) rather than send Ecoware carts a
     * Shakti Foods email.
     */
    throw new Error(
      error.message ||
        "Unable to load storefronts for cart recovery."
    );
  }

  for (const order of data || []) {
    storefrontByOrderId.set(
      String(order.id),
      order.storefront || "shakti_foods"
    );
  }

  return storefrontByOrderId;
}

export async function processCartRecoveryEmails({
  limit = 25
} = {}) {
  const supabase =
    createSupabaseAdmin();

  const now =
    new Date();

  /*
   * Only abandoned carts are eligible.
   *
   * Recovered/completed/cancelled/expired
   * carts can never enter this processor.
   */
  const {
    data: recoveries,
    error: loadError
  } = await supabase
    .from(
      "cart_recovery_sessions"
    )
    .select(`
      id,
      order_id,
      recovery_token,
      email,
      cart_snapshot,
      subtotal_cents,
      currency,
      status,
      abandoned_at,
      recovered_at,
      completed_at,
      first_email_sent_at,
      second_email_sent_at,
      final_email_sent_at,
      last_recovery_attempt_at
    `)
    .eq(
      "status",
      "abandoned"
    )
    .not(
      "email",
      "is",
      null
    )
    .order(
      "abandoned_at",
      {
        ascending: true
      }
    )
    .limit(limit);

  if (loadError) {
    throw new Error(
      loadError.message ||
        "Unable to load cart recovery sessions."
    );
  }

  /*
   * Shakti Foods and Simpli Ecoware are separate
   * websites: each recovery email must use the
   * storefront of the cart's original order.
   */
  const storefrontByOrderId =
    await loadOrderStorefronts(
      supabase,
      recoveries || []
    );

  const summary = {
    examined:
      recoveries?.length || 0,

    attempted: 0,
    sent: 0,
    skipped: 0,
    failed: 0,

    results: []
  };

  for (
    const recovery
    of recoveries || []
  ) {
    /*
     * Defensive guard even though the
     * query already filters status.
     */
    if (
      recovery.status !==
      "abandoned"
    ) {
      summary.skipped += 1;
      continue;
    }

    if (!recovery.email) {
      summary.skipped += 1;
      continue;
    }

    const stage =
      determineEmailStage(
        recovery,
        now
      );

    if (!stage) {
      summary.skipped += 1;
      continue;
    }

    const timestampField =
      timestampFieldForStage(
        stage
      );

    if (!timestampField) {
      summary.skipped += 1;
      continue;
    }

    summary.attempted += 1;

    /*
     * Re-read immediately before sending.
     *
     * This protects against a cart becoming
     * recovered/completed after the initial
     * query but before delivery.
     */
    const {
      data: latestRecovery,
      error: latestError
    } = await supabase
      .from(
        "cart_recovery_sessions"
      )
      .select(`
        id,
        recovery_token,
        email,
        cart_snapshot,
        subtotal_cents,
        currency,
        status,
        first_email_sent_at,
        second_email_sent_at,
        final_email_sent_at
      `)
      .eq(
        "id",
        recovery.id
      )
      .maybeSingle();

    if (
      latestError ||
      !latestRecovery
    ) {
      summary.failed += 1;

      summary.results.push({
        recoveryId:
          recovery.id,
        stage,
        sent: false,
        reason:
          "unable_to_revalidate"
      });

      continue;
    }

    if (
      latestRecovery.status !==
      "abandoned"
    ) {
      summary.skipped += 1;

      summary.results.push({
        recoveryId:
          recovery.id,
        stage,
        sent: false,
        reason:
          "no_longer_abandoned"
      });

      continue;
    }

    if (
      latestRecovery[
        timestampField
      ]
    ) {
      summary.skipped += 1;

      summary.results.push({
        recoveryId:
          recovery.id,
        stage,
        sent: false,
        reason:
          "already_sent"
      });

      continue;
    }

    const emailResult =
      await sendCartRecoveryEmailSafely({
        to:
          latestRecovery.email,

        recoveryId:
          latestRecovery.id,

        recoveryToken:
          latestRecovery
            .recovery_token,

        emailStage:
          stage,

        items:
          Array.isArray(
            latestRecovery
              .cart_snapshot
          )
            ? latestRecovery
                .cart_snapshot
            : [],

        currency:
          latestRecovery
            .currency ||
          "USD",

        subtotalCents:
          Number(
            latestRecovery
              .subtotal_cents ||
            0
          ),

        storefront:
          storefrontByOrderId.get(
            String(recovery.order_id || "")
          ) || "shakti_foods"
      });

    /*
     * Do not record sent_at if actual
     * delivery failed.
     */
    if (!emailResult.sent) {
      if (
        emailResult.skipped
      ) {
        summary.skipped += 1;
      } else {
        summary.failed += 1;
      }

      summary.results.push({
        recoveryId:
          recovery.id,
        stage,
        sent: false,
        reason:
          emailResult.reason ||
          "send_failed"
      });

      continue;
    }

    const sentAt =
      new Date()
        .toISOString();

    const {
      error: updateError
    } = await supabase
      .from(
        "cart_recovery_sessions"
      )
      .update({
        [timestampField]:
          sentAt,

        last_recovery_attempt_at:
          sentAt
      })
      .eq(
        "id",
        recovery.id
      )
      .eq(
        "status",
        "abandoned"
      )
      .is(
        timestampField,
        null
      );

    if (updateError) {
      console.error(
        "Recovery email was sent but timestamp update failed:",
        {
          recoveryId:
            recovery.id,
          stage,
          updateError
        }
      );

      summary.failed += 1;

      summary.results.push({
        recoveryId:
          recovery.id,
        stage,
        sent: true,
        recorded: false
      });

      continue;
    }

    summary.sent += 1;

    summary.results.push({
      recoveryId:
        recovery.id,
      stage,
      sent: true,
      recorded: true
    });
  }

  return summary;
}