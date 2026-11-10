import { sendTransactionalEmail } from "@/lib/email";
import { ADMIN_STOREFRONTS } from "@/lib/admin-storefronts";
import {
  ECOWARE_STOREFRONT,
  SHAKTI_STOREFRONT,
  getStorefrontBrand,
  getStorefrontSiteUrl,
  normalizeStorefront
} from "@/lib/storefront-config";

/*
 * "New order" email to the store admins, sent once when an order is paid
 * (Stripe, PayPal or a Subscribe & Save payment), alongside the customer's
 * confirmation. It never blocks or fails the order.
 *
 * Recipients (first one that is set wins):
 *   SHAKTI_ORDER_NOTIFICATION_EMAILS / ECOWARE_ORDER_NOTIFICATION_EMAILS
 *   ORDER_NOTIFICATION_EMAILS   (both stores)
 *   ADMIN_EMAILS                (the admin login list; the default)
 * Separate addresses with commas. Set a variable to "off" to stop the
 * emails for that scope.
 */

const EMAIL_PATTERN =
  /^[^\s@<>,;"']+@[^\s@<>,;"']+\.[^\s@<>,;"']+$/;

const OFF_VALUES = new Set([
  "off",
  "none",
  "false",
  "disabled",
  "0"
]);

const MAX_RECIPIENTS = 20;

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

// Customer-entered text in a subject line: one line, bounded length.
function singleLine(value, maxLength = 60) {
  const text = String(value ?? "")
    .replace(/[\r\n\t]+/g, " ")
    .replace(/\s{2,}/g, " ")
    .trim();

  return text.length > maxLength
    ? `${text.slice(0, maxLength - 1)}…`
    : text;
}

function formatMoney(amountCents, currency = "USD") {
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency
    }).format(Number(amountCents || 0) / 100);
  } catch {
    return `$${(Number(amountCents || 0) / 100).toFixed(2)}`;
  }
}

function formatOrderNumber(orderId) {
  return String(orderId || "")
    .replaceAll("-", "")
    .slice(0, 8)
    .toUpperCase();
}

function formatDateTime(value) {
  const date = value ? new Date(value) : new Date();

  if (Number.isNaN(date.getTime())) {
    return null;
  }

  // dateStyle/timeStyle cannot be combined with timeZoneName.
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZone: "America/New_York",
    timeZoneName: "short"
  }).format(date);
}

function addressLines(address) {
  if (!address || typeof address !== "object") {
    return [];
  }

  const cityLine = [
    address.city,
    [address.state, address.postal_code]
      .filter(Boolean)
      .join(" ")
  ]
    .filter(Boolean)
    .join(", ");

  return [
    address.name,
    address.line1,
    address.line2,
    cityLine,
    address.country
  ]
    .map((line) => singleLine(line, 120))
    .filter(Boolean);
}

function paymentLabel(provider) {
  switch (String(provider || "").toLowerCase()) {
    case "stripe":
      return "Card (Stripe)";
    case "paypal":
      return "PayPal";
    default:
      return provider ? String(provider) : null;
  }
}

function validEmail(value) {
  const email = String(value || "").trim();
  return EMAIL_PATTERN.test(email) ? email : null;
}

function parseRecipientList(value) {
  const seen = new Set();
  const recipients = [];

  for (const part of String(value || "").split(/[,;\s]+/)) {
    const email = validEmail(part);
    const key = email?.toLowerCase();

    if (email && !seen.has(key)) {
      seen.add(key);
      recipients.push(email);
    }
  }

  return recipients.slice(0, MAX_RECIPIENTS);
}

/**
 * Who receives "new order" emails for a store, and which setting chose them.
 */
export function getAdminOrderNotificationRecipients(storefront) {
  const id = normalizeStorefront(storefront);

  const perStoreVariable =
    id === ECOWARE_STOREFRONT
      ? "ECOWARE_ORDER_NOTIFICATION_EMAILS"
      : "SHAKTI_ORDER_NOTIFICATION_EMAILS";

  for (const variable of [
    perStoreVariable,
    "ORDER_NOTIFICATION_EMAILS",
    "ADMIN_EMAILS"
  ]) {
    const raw = String(process.env[variable] || "").trim();

    if (!raw) {
      continue;
    }

    if (OFF_VALUES.has(raw.toLowerCase())) {
      return {
        recipients: [],
        source: variable,
        disabled: true
      };
    }

    const recipients = parseRecipientList(raw);

    if (recipients.length) {
      return {
        recipients,
        source: variable,
        disabled: false
      };
    }
  }

  return {
    recipients: [],
    source: null,
    disabled: false
  };
}

export function getAdminOrderUrl(storefront, orderId) {
  const id = normalizeStorefront(storefront);
  const slug =
    ADMIN_STOREFRONTS[id]?.slug ||
    ADMIN_STOREFRONTS[SHAKTI_STOREFRONT].slug;

  // The admin portal lives on the Shakti Foods domain for both stores.
  return `${getStorefrontSiteUrl(SHAKTI_STOREFRONT)}/admin/${slug}/orders/${encodeURIComponent(orderId)}`;
}

/**
 * Builds the admin "new order" email. All amounts are in cents.
 */
export function buildAdminOrderNotificationEmail({
  orderId,
  storefront,
  createdAt = null,
  customerName,
  customerEmail,
  customerPhone,
  shippingAddress,
  shippingMethod = null,
  paymentProvider = null,
  currency = "USD",
  items = [],
  subtotal,
  shippingAmount,
  taxAmount,
  totalAmount,
  subscription = null
}) {
  const brand = getStorefrontBrand(storefront);
  const orderNumber = formatOrderNumber(orderId);
  const adminUrl = getAdminOrderUrl(storefront, orderId);
  const name = singleLine(customerName, 80) || "Customer";
  const email = validEmail(customerEmail);
  const phone = singleLine(customerPhone, 40) || null;
  const address = addressLines(shippingAddress);
  const placedAt = formatDateTime(createdAt);
  const payment = paymentLabel(paymentProvider);
  const shipping = singleLine(shippingMethod, 80) || null;
  const isSubscription = Boolean(subscription);
  const total = formatMoney(totalAmount, currency);

  const lineItems = (items || []).map((item) => {
    const quantity = Math.max(Number(item.quantity) || 0, 0);
    const lineTotal = Number(item.line_total || 0);
    const unitPrice =
      item.unit_price !== undefined && item.unit_price !== null
        ? Number(item.unit_price)
        : quantity > 0
          ? Math.round(lineTotal / quantity)
          : 0;

    return {
      name: singleLine(item.product_name, 120) || "Item",
      productId: singleLine(item.product_id, 60) || null,
      quantity,
      unitPrice,
      lineTotal
    };
  });

  const itemCount = lineItems.reduce(
    (sum, item) => sum + item.quantity,
    0
  );

  const subject = `[${brand.businessName}] New ${
    isSubscription ? "Subscribe & Save " : ""
  }order #${orderNumber} – ${singleLine(name, 40)} – ${total}`;

  const detailRow = (label, valueHtml) =>
    valueHtml
      ? `<tr>
          <td style="padding:6px 12px 6px 0;color:#6b7280;vertical-align:top;white-space:nowrap;">${escapeHtml(label)}</td>
          <td style="padding:6px 0;color:#111827;">${valueHtml}</td>
        </tr>`
      : "";

  const itemRowsHtml = lineItems
    .map(
      (item) => `
        <tr>
          <td style="padding:10px 8px 10px 0;border-bottom:1px solid #e5e7eb;">
            <div style="font-weight:700;color:#111827;">${escapeHtml(item.name)}</div>
            ${
              item.productId
                ? `<div style="font-size:12px;color:#9ca3af;">${escapeHtml(item.productId)}</div>`
                : ""
            }
          </td>
          <td style="padding:10px 8px;border-bottom:1px solid #e5e7eb;text-align:center;font-weight:700;">${item.quantity}</td>
          <td style="padding:10px 8px;border-bottom:1px solid #e5e7eb;text-align:right;color:#374151;">${formatMoney(item.unitPrice, currency)}</td>
          <td style="padding:10px 0 10px 8px;border-bottom:1px solid #e5e7eb;text-align:right;font-weight:700;">${formatMoney(item.lineTotal, currency)}</td>
        </tr>`
    )
    .join("");

  const totalRow = (label, amount, strong = false) => `
    <tr>
      <td style="padding:5px 0;color:${strong ? "#111827" : "#6b7280"};${strong ? "font-weight:700;font-size:16px;" : ""}">${escapeHtml(label)}</td>
      <td style="padding:5px 0;text-align:right;${strong ? "font-weight:700;font-size:16px;" : ""}">${formatMoney(amount, currency)}</td>
    </tr>`;

  const html = `<!doctype html>
<html>
  <body style="margin:0;padding:0;background:#f6f3ed;font-family:Arial,sans-serif;color:#111827;">
    <div style="max-width:680px;margin:0 auto;padding:28px 16px;">
      <div style="background:#ffffff;border-radius:20px;padding:28px;box-shadow:0 10px 30px rgba(0,0,0,.06);">
        <div style="font-size:12px;font-weight:700;letter-spacing:.12em;text-transform:uppercase;color:#6b7280;">
          ${escapeHtml(brand.businessName)} · New ${isSubscription ? "Subscribe &amp; Save " : ""}order
        </div>
        <h1 style="margin:8px 0 4px;font-size:26px;">Order #${escapeHtml(orderNumber)} · ${escapeHtml(total)}</h1>
        <p style="margin:0;color:#6b7280;font-size:14px;">
          ${itemCount} item${itemCount === 1 ? "" : "s"}${placedAt ? ` · ${escapeHtml(placedAt)}` : ""}${payment ? ` · Paid by ${escapeHtml(payment)}` : ""}
        </p>

        <div style="margin:22px 0 4px;">
          <a href="${escapeHtml(adminUrl)}" style="display:inline-block;background:#111827;color:#ffffff;text-decoration:none;font-weight:700;padding:12px 20px;border-radius:999px;">Open order in admin</a>
        </div>

        <h2 style="font-size:17px;margin:26px 0 8px;">Customer</h2>
        <table style="border-collapse:collapse;font-size:14px;">
          ${detailRow("Name", escapeHtml(name))}
          ${detailRow(
            "Email",
            email
              ? `<a href="mailto:${escapeHtml(email)}" style="color:#1d4ed8;">${escapeHtml(email)}</a>`
              : '<span style="color:#b45309;">Not provided</span>'
          )}
          ${detailRow(
            "Phone",
            phone
              ? `<a href="tel:${escapeHtml(phone.replace(/[^\d+]/g, ""))}" style="color:#1d4ed8;">${escapeHtml(phone)}</a>`
              : '<span style="color:#6b7280;">Not provided</span>'
          )}
        </table>

        <h2 style="font-size:17px;margin:22px 0 8px;">Delivery</h2>
        <table style="border-collapse:collapse;font-size:14px;">
          ${detailRow("Method", shipping ? escapeHtml(shipping) : "")}
          ${detailRow(
            "Address",
            address.length
              ? address.map(escapeHtml).join("<br>")
              : '<span style="color:#b45309;">No shipping address recorded</span>'
          )}
        </table>

        <h2 style="font-size:17px;margin:22px 0 8px;">Items</h2>
        <table style="width:100%;border-collapse:collapse;font-size:14px;">
          <tr>
            <th style="padding:0 8px 8px 0;text-align:left;color:#6b7280;font-weight:600;border-bottom:2px solid #e5e7eb;">Product</th>
            <th style="padding:0 8px 8px;text-align:center;color:#6b7280;font-weight:600;border-bottom:2px solid #e5e7eb;">Qty</th>
            <th style="padding:0 8px 8px;text-align:right;color:#6b7280;font-weight:600;border-bottom:2px solid #e5e7eb;">Price</th>
            <th style="padding:0 0 8px 8px;text-align:right;color:#6b7280;font-weight:600;border-bottom:2px solid #e5e7eb;">Total</th>
          </tr>
          ${itemRowsHtml || '<tr><td colspan="4" style="padding:10px 0;color:#b45309;">No items recorded</td></tr>'}
        </table>

        <table style="width:100%;margin-top:14px;border-collapse:collapse;font-size:14px;">
          ${totalRow("Subtotal", subtotal)}
          ${totalRow("Shipping", shippingAmount)}
          ${totalRow("Tax", taxAmount)}
          ${totalRow("Total paid", totalAmount, true)}
        </table>

        <p style="margin:26px 0 0;font-size:12px;line-height:1.6;color:#9ca3af;">
          Order ID ${escapeHtml(orderId)}. Reply to this email to contact the customer.
          You receive these because your address is on this store's order notification list.
        </p>
      </div>
    </div>
  </body>
</html>`;

  const text = [
    `${brand.businessName} – new ${isSubscription ? "Subscribe & Save " : ""}order #${orderNumber}`,
    `Total paid: ${total}${payment ? ` (${payment})` : ""}`,
    placedAt ? `Placed: ${placedAt}` : null,
    "",
    "CUSTOMER",
    `Name: ${name}`,
    `Email: ${email || "Not provided"}`,
    `Phone: ${phone || "Not provided"}`,
    "",
    "DELIVERY",
    shipping ? `Method: ${shipping}` : null,
    `Address: ${address.length ? address.join(", ") : "No shipping address recorded"}`,
    "",
    "ITEMS",
    ...(lineItems.length
      ? lineItems.map(
          (item) =>
            `${item.quantity} × ${item.name}${item.productId ? ` (${item.productId})` : ""} @ ${formatMoney(item.unitPrice, currency)} = ${formatMoney(item.lineTotal, currency)}`
        )
      : ["No items recorded"]),
    "",
    `Subtotal: ${formatMoney(subtotal, currency)}`,
    `Shipping: ${formatMoney(shippingAmount, currency)}`,
    `Tax: ${formatMoney(taxAmount, currency)}`,
    `Total paid: ${total}`,
    "",
    `Open in admin: ${adminUrl}`,
    `Order ID: ${orderId}`
  ]
    .filter((line) => line !== null)
    .join("\n");

  return {
    subject,
    html,
    text,
    from: brand.emailFrom,
    replyTo: email || undefined,
    adminUrl
  };
}

/*
 * Extra order fields the customer email does not carry (phone, payment
 * method, order time). Best effort: the notification still goes out with
 * what the caller passed if this lookup fails.
 */
async function loadOrderDetails(supabase, orderId) {
  if (!supabase || !orderId) {
    return null;
  }

  try {
    const { data, error } = await supabase
      .from("orders")
      .select("*")
      .eq("id", orderId)
      .maybeSingle();

    if (error) {
      throw error;
    }

    return data || null;
  } catch (error) {
    console.error(
      "Unable to load order details for admin notification:",
      {
        orderId,
        message: error?.message || String(error)
      }
    );

    return null;
  }
}

/**
 * Emails the store admins about a newly paid order. `email` is the same
 * payload used for the customer's confirmation. Never throws.
 */
export async function notifyAdminsOfNewOrder({
  supabase,
  email
}) {
  const orderId = email?.orderId;
  const storefront = email?.storefront;

  try {
    const { recipients, source, disabled } =
      getAdminOrderNotificationRecipients(storefront);

    if (!recipients.length) {
      if (!disabled) {
        console.warn(
          "Admin new-order email skipped: no recipients configured (set ORDER_NOTIFICATION_EMAILS or ADMIN_EMAILS).",
          { orderId, storefront }
        );
      }

      return {
        sent: false,
        skipped: true,
        reason: disabled ? "disabled" : "no_recipients"
      };
    }

    const order = await loadOrderDetails(supabase, orderId);

    const message = buildAdminOrderNotificationEmail({
      orderId,
      storefront: order?.storefront || storefront,
      createdAt: order?.created_at || null,
      customerName:
        email.customerName && email.customerName !== "Customer"
          ? email.customerName
          : order?.customer_name || email.customerName,
      customerEmail: email.to || order?.customer_email || null,
      customerPhone: order?.customer_phone || email.customerPhone || null,
      shippingAddress: email.shippingAddress || order?.shipping_address || null,
      shippingMethod: email.shippingMethod || null,
      paymentProvider: order?.payment_provider || email.paymentProvider || null,
      currency: email.currency || order?.currency || "USD",
      items: email.items || [],
      subtotal: email.subtotal,
      shippingAmount: email.shippingAmount,
      taxAmount: email.taxAmount,
      totalAmount: email.totalAmount,
      subscription: email.subscription || null
    });

    const result = await sendTransactionalEmail({
      from: message.from,
      replyTo: message.replyTo,
      to: recipients,
      subject: message.subject,
      html: message.html,
      text: message.text,
      // One notification per order, even if two deliveries race.
      idempotencyKey: `admin-new-order-${orderId}`
    });

    console.log("Admin new-order email sent:", {
      orderId,
      storefront,
      recipients: recipients.length,
      source,
      result
    });

    return { sent: true, skipped: false, result };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : String(error);

    console.error("Admin new-order email failed:", {
      orderId,
      storefront,
      message
    });

    return {
      sent: false,
      skipped: false,
      reason: "send_failed",
      error: message
    };
  }
}
