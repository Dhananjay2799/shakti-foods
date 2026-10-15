import {
  sendTransactionalEmail
} from "@/lib/email";

import {
  createSupabaseAdmin
} from "@/lib/supabase-admin";

import {
  getStorefrontBrand
} from "@/lib/storefront-config";

const TRACKING_MIGRATION =
  "supabase/migrations/20261015120000_order_confirmation_email_tracking.sql";

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function formatMoney(
  amount,
  currency = "USD"
) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency
  }).format(Number(amount || 0) / 100);
}

function formatShippingAddress(address) {
  if (!address) {
    return "Shipping address unavailable";
  }

  return [
    address.line1,
    address.line2,
    address.city,
    address.state,
    address.postal_code,
    address.country
  ]
    .filter(Boolean)
    .join(", ");
}

function formatInterval(unit, count) {
  const normalizedUnit = String(unit || "")
    .trim()
    .toLowerCase()
    .replace(/s$/, "");

  if (
    !["day", "week", "month", "year"].includes(
      normalizedUnit
    )
  ) {
    return null;
  }

  const normalizedCount =
    Math.max(1, Math.floor(Number(count) || 1));

  return normalizedCount === 1
    ? `every ${normalizedUnit}`
    : `every ${normalizedCount} ${normalizedUnit}s`;
}

/*
 * Only show a next-order date that is clearly in the future. A stale value
 * (the subscription row not yet synced for the new period) would otherwise
 * tell the customer their next order is today.
 */
function formatFutureDate(value) {
  if (!value) {
    return null;
  }

  const date = new Date(value);

  if (
    Number.isNaN(date.getTime()) ||
    date.getTime() < Date.now() + 60 * 60 * 1000
  ) {
    return null;
  }

  return new Intl.DateTimeFormat("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
    timeZone: "America/New_York"
  }).format(date);
}

function getContactLine(brand) {
  const parts = [
    brand.supportEmail,
    brand.supportPhone
  ].filter(Boolean);

  return parts.length
    ? parts.join(" or ")
    : null;
}

export function formatOrderNumber(orderId) {
  return String(orderId || "")
    .replaceAll("-", "")
    .slice(0, 8)
    .toUpperCase();
}

/**
 * `subscription` is present only for Subscribe & Save orders:
 * { intervalUnit, intervalCount, nextOrderAt, isFirstOrder }
 */
export function buildOrderConfirmationEmail({
  orderId,
  customerName,
  currency,
  items,
  subtotal,
  shippingAmount,
  taxAmount,
  totalAmount,
  shippingAddress,
  storefront,
  subscription = null
}) {
  const brand =
    getStorefrontBrand(storefront);

  const displayOrderNumber =
    formatOrderNumber(orderId);

  const safeCustomerName =
    escapeHtml(customerName || "Customer");

  const safeOrderNumber =
    escapeHtml(displayOrderNumber);

  const contactLine =
    getContactLine(brand);

  const isSubscription =
    Boolean(subscription);

  const isFirstSubscriptionOrder =
    isSubscription &&
    subscription.isFirstOrder === true;

  const intervalText = isSubscription
    ? formatInterval(
        subscription.intervalUnit,
        subscription.intervalCount
      )
    : null;

  const nextOrderText = isSubscription
    ? formatFutureDate(
        subscription.nextOrderAt
      )
    : null;

  const subject = !isSubscription
    ? `Your ${brand.businessName} order confirmation #${displayOrderNumber}`
    : isFirstSubscriptionOrder
      ? `Your ${brand.businessName} subscription is confirmed #${displayOrderNumber}`
      : `Your ${brand.businessName} subscription order #${displayOrderNumber}`;

  const headline = !isSubscription
    ? "Thank you for your order! Your payment was successful."
    : isFirstSubscriptionOrder
      ? "Thank you for subscribing! Your payment was successful."
      : "Your Subscribe & Save payment was successful.";

  const introText = !isSubscription
    ? "We received your order and are preparing it for shipment."
    : isFirstSubscriptionOrder
      ? "Your Subscribe & Save plan is active and we are preparing your first delivery."
      : "We are preparing your next Subscribe & Save delivery.";

  const cancelText = contactLine
    ? `To skip, change or cancel your subscription, contact us at ${contactLine} before your next order date.`
    : "To skip, change or cancel your subscription, reply to this email before your next order date.";

  const subscriptionLines = isSubscription
    ? [
        intervalText
          ? `Delivery: ${intervalText}`
          : null,
        nextOrderText
          ? `Next order: ${nextOrderText}`
          : null,
        "Each delivery is charged automatically to the payment method you used, until you cancel.",
        cancelText
      ].filter(Boolean)
    : [];

  const subscriptionHtml = isSubscription
    ? `
            <div style="margin:24px 0;padding:18px;background:#f1f7ef;border-radius:16px;">
              <div style="font-size:13px;color:#4b6b3f;text-transform:uppercase;letter-spacing:.08em;font-weight:700;">
                Your Subscribe &amp; Save plan
              </div>
              ${subscriptionLines
                .map(
                  (line) => `
              <p style="margin:10px 0 0;font-size:15px;line-height:1.6;color:#374151;">
                ${escapeHtml(line)}
              </p>`
                )
                .join("")}
            </div>`
    : "";

  const itemRows = (items || [])
    .map((item) => `
      <tr>
        <td style="padding:12px 0;border-bottom:1px solid #e5e7eb;">
          <div style="font-weight:700;color:#111827;">
            ${escapeHtml(item.product_name)}
          </div>

          <div style="font-size:13px;color:#6b7280;">
            Quantity: ${Number(item.quantity)}
          </div>
        </td>

        <td style="padding:12px 0;border-bottom:1px solid #e5e7eb;text-align:right;color:#111827;">
          ${formatMoney(
            item.line_total,
            currency
          )}
        </td>
      </tr>
    `)
    .join("");

  const textItems = (items || [])
    .map(
      (item) =>
        `${item.product_name} × ${item.quantity} — ${formatMoney(
          item.line_total,
          currency
        )}`
    )
    .join("\n");

  const formattedAddress =
    formatShippingAddress(
      shippingAddress
    );

  const html = `
    <!doctype html>
    <html>
      <body style="margin:0;padding:0;background:#f6f3ed;font-family:Arial,sans-serif;color:#111827;">
        <div style="max-width:640px;margin:0 auto;padding:32px 16px;">
          <div style="background:#ffffff;border-radius:24px;padding:32px;box-shadow:0 10px 30px rgba(0,0,0,.06);">

            <div style="text-align:center;margin-bottom:28px;">
              <h1 style="margin:0;font-size:30px;color:#111827;">
                ${escapeHtml(brand.businessName)}
              </h1>

              <p style="margin:10px 0 0;color:#6b7280;">
                ${escapeHtml(headline)}
              </p>
            </div>

            <p style="font-size:16px;line-height:1.6;">
              Hi ${safeCustomerName},
            </p>

            <p style="font-size:16px;line-height:1.6;color:#374151;">
              ${escapeHtml(introText)}
            </p>

            <div style="margin:24px 0;padding:18px;background:#faf7f1;border-radius:16px;">
              <div style="font-size:13px;color:#6b7280;text-transform:uppercase;letter-spacing:.08em;">
                Order number
              </div>

              <div style="margin-top:6px;font-size:20px;font-weight:700;color:#111827;">
                ${safeOrderNumber}
              </div>
            </div>
            ${subscriptionHtml}

            <h2 style="font-size:20px;margin:28px 0 10px;">
              Order summary
            </h2>

            <table style="width:100%;border-collapse:collapse;">
              ${itemRows}
            </table>

            <table style="width:100%;margin-top:20px;border-collapse:collapse;">
              <tr>
                <td style="padding:6px 0;color:#6b7280;">
                  Subtotal
                </td>

                <td style="padding:6px 0;text-align:right;">
                  ${formatMoney(
                    subtotal,
                    currency
                  )}
                </td>
              </tr>

              <tr>
                <td style="padding:6px 0;color:#6b7280;">
                  Shipping
                </td>

                <td style="padding:6px 0;text-align:right;">
                  ${formatMoney(
                    shippingAmount,
                    currency
                  )}
                </td>
              </tr>

              <tr>
                <td style="padding:6px 0;color:#6b7280;">
                  Tax
                </td>

                <td style="padding:6px 0;text-align:right;">
                  ${formatMoney(
                    taxAmount,
                    currency
                  )}
                </td>
              </tr>

              <tr>
                <td style="padding:12px 0 0;font-size:18px;font-weight:700;border-top:1px solid #e5e7eb;">
                  Total
                </td>

                <td style="padding:12px 0 0;text-align:right;font-size:18px;font-weight:700;border-top:1px solid #e5e7eb;">
                  ${formatMoney(
                    totalAmount,
                    currency
                  )}
                </td>
              </tr>
            </table>

            <h2 style="font-size:20px;margin:30px 0 10px;">
              Shipping address
            </h2>

            <p style="margin:0;line-height:1.6;color:#374151;">
              ${escapeHtml(formattedAddress)}
            </p>

            <p style="margin:30px 0 0;line-height:1.6;color:#374151;">
              We’ll send another email when your order ships.
            </p>
            ${
              contactLine
                ? `
            <p style="margin:12px 0 0;line-height:1.6;color:#374151;">
              Questions? Contact us at ${escapeHtml(contactLine)}.
            </p>`
                : ""
            }

            <div style="margin-top:32px;padding-top:20px;border-top:1px solid #e5e7eb;text-align:center;color:#6b7280;font-size:13px;">
              <a href="${escapeHtml(brand.siteUrl)}" style="color:#6b7280;text-decoration:none;">
                ${escapeHtml(brand.businessName)} — ${escapeHtml(brand.siteLabel)}
              </a>
            </div>
          </div>
        </div>
      </body>
    </html>
  `;

  const text = `
Your ${brand.businessName} ${
    isSubscription ? "subscription order" : "order confirmation"
  }

Hi ${customerName || "Customer"},

${headline} ${introText}

Order number: ${displayOrderNumber}
${
  isSubscription
    ? `
Your Subscribe & Save plan:
${subscriptionLines.join("\n")}
`
    : ""
}
Order summary:
${textItems}

Subtotal: ${formatMoney(
    subtotal,
    currency
  )}
Shipping: ${formatMoney(
    shippingAmount,
    currency
  )}
Tax: ${formatMoney(
    taxAmount,
    currency
  )}
Total: ${formatMoney(
    totalAmount,
    currency
  )}

Shipping address:
${formattedAddress}

We’ll send another email when your order ships.
${contactLine ? `Questions? Contact us at ${contactLine}.\n` : ""}
${brand.businessName}
${brand.siteUrl}
  `.trim();

  return {
    subject,
    html,
    text,
    from: brand.emailFrom,
    replyTo: brand.replyTo
  };
}

export async function sendOrderConfirmationEmailSafely({
  to,
  orderId,
  customerName,
  currency,
  items,
  subtotal,
  shippingAmount,
  taxAmount,
  totalAmount,
  shippingAddress,
  storefront,
  subscription = null,
  idempotencyKey
}) {
  const recipient =
    String(to || "").trim();

  if (!recipient) {
    console.warn(
      "Order confirmation email skipped because no customer email was available.",
      {
        orderId
      }
    );

    return {
      sent: false,
      skipped: true,
      reason: "missing_recipient",
      error: "No customer email address on the order."
    };
  }

  try {
    const email =
      buildOrderConfirmationEmail({
        orderId,
        customerName,
        currency,
        items,
        subtotal,
        shippingAmount,
        taxAmount,
        totalAmount,
        shippingAddress,
        storefront,
        subscription
      });

    const result =
      await sendTransactionalEmail({
        from: email.from,
        replyTo: email.replyTo,
        to: recipient,
        subject: email.subject,
        html: email.html,
        text: email.text,

        // Full UUID remains the
        // idempotency identifier.
        idempotencyKey:
          idempotencyKey ||
          `order-confirmation-${orderId}`
      });

    console.log(
      "Order confirmation email sent:",
      {
        orderId,
        storefront,
        from: email.from,
        customerEmail:
          recipient,
        result
      }
    );

    return {
      sent: true,
      skipped: false,
      result
    };
  } catch (error) {
    /*
    * Email failure must never undo
    * successful payment or inventory
    * fulfillment.
    */
    const message =
      error instanceof Error
        ? error.message
        : String(error);

    console.error(
      "Order confirmation email failed:",
      {
        orderId,
        storefront,
        customerEmail:
          recipient,
        message
      }
    );

    return {
      sent: false,
      skipped: false,
      reason: "send_failed",
      error: message
    };
  }
}


/*
 * =========================================================
 * DELIVERY TRACKING AND RETRY
 * =========================================================
 *
 * orders.confirmation_email_status records whether the confirmation went
 * out ("sent") or needs another try ("failed"). Orders created before the
 * tracking migration keep a NULL status and are never re-sent.
 *
 * If the migration has not been run yet, everything falls back to the
 * previous behaviour: send once, on the first fulfillment of the order.
 */

let warnedAboutMissingTracking = false;

function isMissingTrackingColumn(error) {
  const text =
    `${error?.code || ""} ${error?.message || ""}`;

  return /42703|PGRST204|confirmation_email/i.test(
    text
  );
}

function warnMissingTracking(error) {
  if (warnedAboutMissingTracking) {
    return;
  }

  warnedAboutMissingTracking = true;

  console.warn(
    `Order confirmation email tracking is not installed. Run ${TRACKING_MIGRATION} in Supabase to enable automatic retries.`,
    {
      message: error?.message || null
    }
  );
}

async function readConfirmationEmailState(
  supabase,
  orderId
) {
  if (!supabase || !orderId) {
    return { tracked: false };
  }

  try {
    const { data, error } = await supabase
      .from("orders")
      .select(`
        id,
        confirmation_email_status,
        confirmation_email_attempts
      `)
      .eq("id", orderId)
      .maybeSingle();

    if (error) {
      if (isMissingTrackingColumn(error)) {
        warnMissingTracking(error);
      } else {
        console.error(
          "Unable to read order confirmation email status:",
          {
            orderId,
            message: error.message
          }
        );
      }

      return { tracked: false };
    }

    if (!data) {
      return { tracked: false };
    }

    return {
      tracked: true,
      status:
        data.confirmation_email_status ||
        null,
      attempts:
        Number(
          data.confirmation_email_attempts
        ) || 0
    };
  } catch (error) {
    console.error(
      "Unable to read order confirmation email status:",
      {
        orderId,
        message:
          error instanceof Error
            ? error.message
            : String(error)
      }
    );

    return { tracked: false };
  }
}

async function recordConfirmationEmailResult({
  supabase,
  orderId,
  result,
  attempt
}) {
  try {
    if (result.sent) {
      const { error } = await supabase
        .from("orders")
        .update({
          confirmation_email_status: "sent",
          confirmation_email_sent_at:
            new Date().toISOString(),
          confirmation_email_attempts: attempt,
          confirmation_email_last_error: null
        })
        .eq("id", orderId);

      if (error) {
        throw error;
      }

      return;
    }

    /*
     * Never downgrade "sent" to "failed": a concurrent delivery (webhook
     * and success page at the same time) may already have sent it.
     */
    const { error } = await supabase
      .from("orders")
      .update({
        confirmation_email_status: "failed",
        confirmation_email_attempts: attempt,
        confirmation_email_last_error:
          String(
            result.error ||
            result.reason ||
            "Unknown email error."
          ).slice(0, 500)
      })
      .eq("id", orderId)
      .or(
        "confirmation_email_status.is.null,confirmation_email_status.eq.failed"
      );

    if (error) {
      throw error;
    }
  } catch (error) {
    console.error(
      "Unable to record order confirmation email status:",
      {
        orderId,
        sent: result.sent,
        message:
          error?.message || String(error)
      }
    );
  }
}

/**
 * Sends the order confirmation at most once per order, and again only if
 * the previous attempt failed.
 *
 * `alreadyProcessed` is true when this call is a repeat fulfillment of an
 * order (duplicate webhook, success-page refresh). Repeats only send when
 * the last recorded attempt failed.
 */
export async function deliverOrderConfirmationEmail({
  supabase,
  alreadyProcessed = false,
  email
}) {
  const orderId = email?.orderId;

  const state =
    await readConfirmationEmailState(
      supabase,
      orderId
    );

  if (
    state.tracked &&
    state.status === "sent"
  ) {
    return {
      sent: false,
      skipped: true,
      reason: "already_sent"
    };
  }

  const isRetry =
    state.tracked &&
    state.status === "failed";

  if (!isRetry && alreadyProcessed) {
    console.log(
      "Skipping duplicate order confirmation email:",
      { orderId }
    );

    return {
      sent: false,
      skipped: true,
      reason: "duplicate_delivery"
    };
  }

  const attempt =
    (state.attempts || 0) + 1;

  const result =
    await sendOrderConfirmationEmailSafely({
      ...email,

      /*
       * A retry gets a fresh key so Resend does not replay a cached
       * failure; concurrent retries of the same attempt still share one.
       */
      idempotencyKey: isRetry
        ? `order-confirmation-${orderId}-retry-${attempt}`
        : `order-confirmation-${orderId}`
    });

  if (state.tracked) {
    await recordConfirmationEmailResult({
      supabase,
      orderId,
      result,
      attempt
    });
  }

  return result;
}

async function loadSubscriptionContext(
  supabase,
  subscriptionId,
  { nextBillingAt = null } = {}
) {
  const context = {
    intervalUnit: null,
    intervalCount: null,
    nextOrderAt: nextBillingAt,
    isFirstOrder: null,
    customerEmail: null,
    customerName: null,
    shippingAddress: null
  };

  try {
    const [subscriptionResult, orderCountResult] =
      await Promise.all([
        supabase
          .from("subscriptions")
          .select(`
            id,
            customer_email,
            customer_name,
            shipping_address,
            interval_unit,
            interval_count,
            next_billing_at,
            current_period_end
          `)
          .eq("id", subscriptionId)
          .maybeSingle(),

        supabase
          .from("orders")
          .select("id", {
            count: "exact",
            head: true
          })
          .eq("subscription_id", subscriptionId)
      ]);

    const subscription =
      subscriptionResult?.data || null;

    if (subscriptionResult?.error) {
      console.error(
        "Unable to load subscription for confirmation email:",
        {
          subscriptionId,
          message:
            subscriptionResult.error.message
        }
      );
    }

    if (subscription) {
      context.intervalUnit =
        subscription.interval_unit;
      context.intervalCount =
        subscription.interval_count;
      context.nextOrderAt =
        nextBillingAt ||
        subscription.next_billing_at ||
        subscription.current_period_end ||
        null;
      context.customerEmail =
        subscription.customer_email || null;
      context.customerName =
        subscription.customer_name || null;
      context.shippingAddress =
        subscription.shipping_address || null;
    }

    if (
      !orderCountResult?.error &&
      typeof orderCountResult?.count === "number"
    ) {
      context.isFirstOrder =
        orderCountResult.count === 1;
    }
  } catch (error) {
    console.error(
      "Unable to load subscription for confirmation email:",
      {
        subscriptionId,
        message:
          error instanceof Error
            ? error.message
            : String(error)
      }
    );
  }

  return context;
}

/**
 * Builds the confirmation email input for a stored order. Used for
 * Subscribe & Save orders and by the retry sweep.
 */
export async function loadOrderConfirmationEmailData(
  supabase,
  orderId,
  { nextBillingAt = null } = {}
) {
  const [orderResult, itemsResult] =
    await Promise.all([
      supabase
        .from("orders")
        .select(`
          id,
          storefront,
          customer_name,
          customer_email,
          shipping_address,
          currency,
          subtotal,
          shipping_amount,
          tax_amount,
          total_amount,
          subscription_id
        `)
        .eq("id", orderId)
        .single(),

      supabase
        .from("order_items")
        .select(`
          product_name,
          quantity,
          line_total
        `)
        .eq("order_id", orderId)
        .order("created_at", {
          ascending: true
        })
    ]);

  if (orderResult.error || !orderResult.data) {
    throw new Error(
      orderResult.error?.message ||
        "Unable to load order for confirmation email."
    );
  }

  if (itemsResult.error) {
    throw new Error(
      itemsResult.error.message ||
        "Unable to load order items for confirmation email."
    );
  }

  const order = orderResult.data;

  const subscription =
    order.subscription_id
      ? await loadSubscriptionContext(
          supabase,
          order.subscription_id,
          { nextBillingAt }
        )
      : null;

  return {
    to:
      order.customer_email ||
      subscription?.customerEmail ||
      null,

    orderId: order.id,

    customerName:
      order.customer_name ||
      subscription?.customerName ||
      "Customer",

    currency: String(
      order.currency || "USD"
    ).toUpperCase(),

    items: itemsResult.data || [],

    subtotal: Number(order.subtotal || 0),
    shippingAmount: Number(order.shipping_amount || 0),
    taxAmount: Number(order.tax_amount || 0),
    totalAmount: Number(order.total_amount || 0),

    shippingAddress:
      order.shipping_address ||
      subscription?.shippingAddress ||
      null,

    storefront: order.storefront,

    subscription: subscription
      ? {
          intervalUnit: subscription.intervalUnit,
          intervalCount: subscription.intervalCount,
          nextOrderAt: subscription.nextOrderAt,
          isFirstOrder: subscription.isFirstOrder
        }
      : null
  };
}

/**
 * Daily sweep (run from the existing cron) that re-sends confirmations
 * whose last attempt failed — e.g. a Resend outage or a missing API key
 * that has since been fixed.
 */
export async function retryFailedOrderConfirmationEmails({
  limit = 25,
  maxAttempts = 5,
  maxAgeDays = 7
} = {}) {
  const supabase = createSupabaseAdmin();

  const cutoff = new Date(
    Date.now() -
      maxAgeDays * 24 * 60 * 60 * 1000
  ).toISOString();

  const { data: orders, error } =
    await supabase
      .from("orders")
      .select("id")
      .eq("confirmation_email_status", "failed")
      .eq("payment_status", "paid")
      .lt("confirmation_email_attempts", maxAttempts)
      .gte("created_at", cutoff)
      .order("created_at", {
        ascending: true
      })
      .limit(limit);

  if (error) {
    if (isMissingTrackingColumn(error)) {
      warnMissingTracking(error);

      return {
        examined: 0,
        sent: 0,
        failed: 0,
        skipped: true,
        reason: "tracking_not_installed"
      };
    }

    throw new Error(
      error.message ||
        "Unable to load failed order confirmation emails."
    );
  }

  const summary = {
    examined: orders?.length || 0,
    sent: 0,
    failed: 0,
    results: []
  };

  for (const { id } of orders || []) {
    try {
      const email =
        await loadOrderConfirmationEmailData(
          supabase,
          id
        );

      const result =
        await deliverOrderConfirmationEmail({
          supabase,
          alreadyProcessed: true,
          email
        });

      if (result.sent) {
        summary.sent += 1;
      } else if (!result.skipped || result.reason === "missing_recipient") {
        summary.failed += 1;
      }

      summary.results.push({
        orderId: id,
        sent: result.sent,
        reason: result.reason || null
      });
    } catch (retryError) {
      summary.failed += 1;

      summary.results.push({
        orderId: id,
        sent: false,
        reason:
          retryError instanceof Error
            ? retryError.message
            : String(retryError)
      });
    }
  }

  return summary;
}
