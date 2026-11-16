import {
  createSupabaseAdmin
} from "@/lib/supabase-admin";

import {
  sendCartRecoveryEmailSafely
} from "@/lib/cart-recovery-email";

const FIRST_EMAIL_DELAY_MINUTES = 30;
const SECOND_EMAIL_DELAY_HOURS = 24;
const FINAL_EMAIL_DELAY_HOURS = 72;

// Never remind anyone about a cart older than this.
const MAX_REMINDER_AGE_DAYS = 7;

// A checkout holds its stock for 10 minutes; a cart still "active" well
// after that was left (PayPal closed or cancelled, or a missed Stripe
// "expired" event).
const STALE_ACTIVE_MINUTES = 30;

// Carts tidied per run (the daily cron catches up on the rest).
const HOUSEKEEPING_LIMIT = 500;

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

function normalizeEmail(value) {
  return String(value || "").trim().toLowerCase();
}

async function setStatus(supabase, ids, fromStatus, fields) {
  if (ids.length === 0) {
    return 0;
  }

  const { data, error } = await supabase
    .from("cart_recovery_sessions")
    .update({ ...fields, updated_at: new Date().toISOString() })
    .in("id", ids)
    .eq("status", fromStatus)
    .select("id");

  if (error) {
    throw new Error(error.message || "Unable to update cart recovery sessions.");
  }

  return (data || []).length;
}

/*
 * Carts still "active" long after checkout ended. Stripe marks its own
 * expired checkouts abandoned, but PayPal sends nothing when a customer
 * closes or cancels the PayPal window, so those carts stayed "active"
 * and were never reminded. Paid ones become "completed"; the rest
 * become "abandoned" from the moment their stock hold ended.
 */
async function settleStaleActiveCarts(supabase, now) {
  const { data: stale, error } = await supabase
    .from("cart_recovery_sessions")
    .select("id, order_id, reservation_id, created_at")
    .eq("status", "active")
    .lt("created_at", subtractMinutes(now, STALE_ACTIVE_MINUTES).toISOString())
    .order("created_at", { ascending: true })
    .limit(HOUSEKEEPING_LIMIT);

  if (error) {
    throw new Error(error.message || "Unable to load active carts.");
  }

  if (!stale?.length) {
    return { completed: 0, abandoned: 0 };
  }

  const orderIds = [...new Set(stale.map((cart) => cart.order_id).filter(Boolean))];
  const reservationIds = [
    ...new Set(stale.map((cart) => cart.reservation_id).filter(Boolean))
  ];

  const paidOrderIds = new Set();

  if (orderIds.length) {
    const { data: orders, error: orderError } = await supabase
      .from("orders")
      .select("id, payment_status")
      .in("id", orderIds);

    if (orderError) {
      throw new Error(orderError.message || "Unable to load cart orders.");
    }

    for (const order of orders || []) {
      if (order.payment_status === "paid") {
        paidOrderIds.add(String(order.id));
      }
    }
  }

  const reservations = new Map();

  if (reservationIds.length) {
    const { data, error: reservationError } = await supabase
      .from("checkout_reservations")
      .select("id, status, expires_at")
      .in("id", reservationIds);

    if (reservationError) {
      throw new Error(reservationError.message || "Unable to load cart reservations.");
    }

    for (const reservation of data || []) {
      reservations.set(String(reservation.id), reservation);
    }
  }

  const completedIds = [];
  const abandonedAtById = new Map();

  for (const cart of stale) {
    if (cart.order_id && paidOrderIds.has(String(cart.order_id))) {
      completedIds.push(cart.id);
      continue;
    }

    const reservation = reservations.get(String(cart.reservation_id || ""));
    const holdEndedAt = reservation?.expires_at
      ? new Date(reservation.expires_at)
      : null;

    // Still holding stock: the customer may be paying right now.
    if (
      reservation?.status === "active" &&
      holdEndedAt &&
      holdEndedAt > now
    ) {
      continue;
    }

    abandonedAtById.set(
      cart.id,
      (holdEndedAt && holdEndedAt < now ? holdEndedAt : new Date(cart.created_at)).toISOString()
    );
  }

  const completed = await setStatus(supabase, completedIds, "active", {
    status: "completed",
    completed_at: now.toISOString()
  });

  let abandoned = 0;

  // abandoned_at differs per cart, so one small update each.
  for (const [id, abandonedAt] of abandonedAtById) {
    abandoned += await setStatus(supabase, [id], "active", {
      status: "abandoned",
      abandoned_at: abandonedAt
    });
  }

  return { completed, abandoned };
}

/*
 * Stops reminders that would annoy rather than help:
 *   - carts abandoned more than MAX_REMINDER_AGE_DAYS ago,
 *   - older carts of someone who started a newer checkout since
 *     (one reminder series per person, for their latest cart),
 *   - carts of someone who has paid for an order since.
 * They become "expired" (no more reminders).
 */
async function expireUnhelpfulReminders(supabase, now) {
  const { data: carts, error } = await supabase
    .from("cart_recovery_sessions")
    .select("id, email, created_at, abandoned_at")
    .eq("status", "abandoned")
    .is("final_email_sent_at", null)
    .order("created_at", { ascending: true })
    .limit(HOUSEKEEPING_LIMIT);

  if (error) {
    throw new Error(error.message || "Unable to load abandoned carts.");
  }

  if (!carts?.length) {
    return { tooOld: 0, superseded: 0, boughtSince: 0 };
  }

  const cutoff = subtractHours(now, MAX_REMINDER_AGE_DAYS * 24);
  const tooOld = [];
  const live = [];

  for (const cart of carts) {
    const abandonedAt = new Date(cart.abandoned_at || cart.created_at);

    if (abandonedAt < cutoff) {
      tooOld.push(cart.id);
    } else if (normalizeEmail(cart.email)) {
      live.push(cart);
    }
  }

  // Newest checkout per email (any status), to spot superseded carts.
  const emails = [...new Set(live.map((cart) => normalizeEmail(cart.email)))];
  const newestCartByEmail = new Map();
  const lastPaidByEmail = new Map();

  if (emails.length) {
    const since = new Date(
      Math.min(...live.map((cart) => new Date(cart.created_at).getTime()))
    ).toISOString();

    const { data: recent, error: recentError } = await supabase
      .from("cart_recovery_sessions")
      .select("id, email, created_at")
      .gte("created_at", since)
      .not("email", "is", null)
      .limit(HOUSEKEEPING_LIMIT * 4);

    if (recentError) {
      throw new Error(recentError.message || "Unable to load recent carts.");
    }

    for (const cart of recent || []) {
      const email = normalizeEmail(cart.email);
      const current = newestCartByEmail.get(email);

      if (!current || new Date(cart.created_at) > new Date(current.created_at)) {
        newestCartByEmail.set(email, cart);
      }
    }

    const { data: paidOrders, error: paidError } = await supabase
      .from("orders")
      .select("customer_email, created_at")
      .eq("payment_status", "paid")
      .gte("created_at", since)
      .not("customer_email", "is", null)
      .limit(HOUSEKEEPING_LIMIT * 4);

    if (paidError) {
      throw new Error(paidError.message || "Unable to load paid orders.");
    }

    for (const order of paidOrders || []) {
      const email = normalizeEmail(order.customer_email);
      const paidAt = new Date(order.created_at);

      if (!lastPaidByEmail.has(email) || paidAt > lastPaidByEmail.get(email)) {
        lastPaidByEmail.set(email, paidAt);
      }
    }
  }

  const superseded = [];
  const boughtSince = [];

  for (const cart of live) {
    const email = normalizeEmail(cart.email);
    const lastPaid = lastPaidByEmail.get(email);

    if (lastPaid && lastPaid > new Date(cart.created_at)) {
      boughtSince.push(cart.id);
    } else if (newestCartByEmail.get(email)?.id !== cart.id) {
      superseded.push(cart.id);
    }
  }

  const expired = { status: "expired" };

  return {
    tooOld: await setStatus(supabase, tooOld, "abandoned", expired),
    superseded: await setStatus(supabase, superseded, "abandoned", expired),
    boughtSince: await setStatus(supabase, boughtSince, "abandoned", expired)
  };
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

  // Tidy up first, so the reminders below only go where they help.
  const settled = await settleStaleActiveCarts(supabase, now);
  const expired = await expireUnhelpfulReminders(supabase, now);

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
    // Carts that got all three reminders no longer take up the batch.
    .is(
      "final_email_sent_at",
      null
    )
    .gte(
      "abandoned_at",
      subtractHours(now, MAX_REMINDER_AGE_DAYS * 24).toISOString()
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
    settled,
    expired,
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