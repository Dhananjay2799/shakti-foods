import { sendTransactionalEmail } from "@/lib/email";

const DEFAULT_CURRENCY = "USD";
const MAX_ITEMS = 100;
const MAX_TEXT_LENGTH = 500;
const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function cleanText(value, fallback = "", maxLength = MAX_TEXT_LENGTH) {
  const normalized = String(value ?? "")
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "")
    .replace(/\s+/g, " ")
    .trim();

  return (normalized || fallback).slice(0, maxLength);
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function normalizeUuid(value, fieldName = "Order ID") {
  const normalized = cleanText(value, "", 64);

  if (!UUID_PATTERN.test(normalized)) {
    throw new TypeError(`${fieldName} must be a valid UUID.`);
  }

  return normalized.toLowerCase();
}

function normalizeEmail(value) {
  const normalized = cleanText(value, "", 320).toLowerCase();

  if (!normalized || !EMAIL_PATTERN.test(normalized)) {
    throw new TypeError("A valid customer email address is required.");
  }

  return normalized;
}

function normalizeCurrency(value) {
  const normalized = cleanText(value || DEFAULT_CURRENCY, DEFAULT_CURRENCY, 3)
    .toUpperCase();

  if (!/^[A-Z]{3}$/.test(normalized)) {
    throw new TypeError("Currency must be a three-letter ISO currency code.");
  }

  try {
    new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: normalized
    }).format(0);
  } catch {
    throw new TypeError(`Unsupported currency code: ${normalized}.`);
  }

  return normalized;
}

function normalizeMoney(value, fieldName) {
  const amount = Number(value);

  if (!Number.isSafeInteger(amount) || amount < 0) {
    throw new TypeError(`${fieldName} must be a non-negative integer in cents.`);
  }

  return amount;
}

function normalizeQuantity(value, fieldName) {
  const quantity = Number(value);

  if (!Number.isSafeInteger(quantity) || quantity <= 0) {
    throw new TypeError(`${fieldName} must be a positive integer.`);
  }

  return quantity;
}

function normalizeItems(items) {
  if (!Array.isArray(items) || items.length === 0) {
    throw new TypeError("At least one order item is required.");
  }

  if (items.length > MAX_ITEMS) {
    throw new TypeError(`An order confirmation cannot contain more than ${MAX_ITEMS} items.`);
  }

  return items.map((item, index) => {
    if (!item || typeof item !== "object") {
      throw new TypeError(`Order item ${index + 1} is invalid.`);
    }

    const productName = cleanText(
      item.product_name ?? item.productName ?? item.name,
      "Product",
      200
    );
    const quantity = normalizeQuantity(
      item.quantity,
      `Order item ${index + 1} quantity`
    );

    const rawUnitPrice = item.unit_price ?? item.unitPrice;
    const rawLineTotal = item.line_total ?? item.lineTotal;

    const unitPrice =
      rawUnitPrice === undefined || rawUnitPrice === null
        ? null
        : normalizeMoney(rawUnitPrice, `Order item ${index + 1} unit price`);

    const lineTotal =
      rawLineTotal === undefined || rawLineTotal === null
        ? unitPrice === null
          ? null
          : unitPrice * quantity
        : normalizeMoney(rawLineTotal, `Order item ${index + 1} line total`);

    if (lineTotal === null || !Number.isSafeInteger(lineTotal)) {
      throw new TypeError(
        `Order item ${index + 1} must include a valid line total or unit price.`
      );
    }

    const resolvedUnitPrice =
      unitPrice === null ? Math.round(lineTotal / quantity) : unitPrice;

    return {
      productName,
      quantity,
      unitPrice: resolvedUnitPrice,
      lineTotal
    };
  });
}

function normalizeShippingAddress(address) {
  if (!address || typeof address !== "object") {
    return null;
  }

  const normalized = {
    line1: cleanText(address.line1 ?? address.address_line_1, "", 200),
    line2: cleanText(address.line2 ?? address.address_line_2, "", 200),
    city: cleanText(address.city ?? address.admin_area_2, "", 120),
    state: cleanText(address.state ?? address.admin_area_1, "", 120),
    postalCode: cleanText(address.postal_code ?? address.postalCode, "", 32),
    country: cleanText(address.country ?? address.country_code, "", 80)
  };

  return Object.values(normalized).some(Boolean) ? normalized : null;
}

function getShippingAddressLines(address) {
  const normalized = normalizeShippingAddress(address);

  if (!normalized) {
    return ["Shipping address unavailable"];
  }

  const locality = [normalized.city, normalized.state]
    .filter(Boolean)
    .join(", ");
  const localityWithPostalCode = [locality, normalized.postalCode]
    .filter(Boolean)
    .join(" ");

  const lines = [
    normalized.line1,
    normalized.line2,
    localityWithPostalCode,
    normalized.country
  ].filter(Boolean);

  return lines.length > 0 ? lines : ["Shipping address unavailable"];
}

function formatMoney(amount, currency = DEFAULT_CURRENCY) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency
  }).format(amount / 100);
}

export function formatOrderNumber(orderId) {
  return String(orderId ?? "")
    .replaceAll("-", "")
    .slice(0, 8)
    .toUpperCase();
}

export function buildOrderConfirmationEmail({
  orderId,
  customerName,
  currency = DEFAULT_CURRENCY,
  items,
  subtotal,
  shippingAmount,
  taxAmount,
  totalAmount,
  shippingAddress
}) {
  const normalizedOrderId = normalizeUuid(orderId);
  const normalizedCurrency = normalizeCurrency(currency);
  const normalizedItems = normalizeItems(items);
  const normalizedSubtotal = normalizeMoney(subtotal, "Subtotal");
  const normalizedShippingAmount = normalizeMoney(
    shippingAmount,
    "Shipping amount"
  );
  const normalizedTaxAmount = normalizeMoney(taxAmount, "Tax amount");
  const normalizedTotalAmount = normalizeMoney(totalAmount, "Total amount");

  const expectedTotal =
    normalizedSubtotal + normalizedShippingAmount + normalizedTaxAmount;

  if (normalizedTotalAmount !== expectedTotal) {
    throw new TypeError(
      `Order total mismatch: expected ${expectedTotal} cents but received ${normalizedTotalAmount} cents.`
    );
  }

  const itemTotal = normalizedItems.reduce(
    (sum, item) => sum + item.lineTotal,
    0
  );

  if (itemTotal !== normalizedSubtotal) {
    throw new TypeError(
      `Order item subtotal mismatch: expected ${normalizedSubtotal} cents but received ${itemTotal} cents.`
    );
  }

  const displayOrderNumber = formatOrderNumber(normalizedOrderId);
  const normalizedCustomerName = cleanText(customerName, "Customer", 120);
  const addressLines = getShippingAddressLines(shippingAddress);

  const safeCustomerName = escapeHtml(normalizedCustomerName);
  const safeOrderNumber = escapeHtml(displayOrderNumber);
  const safeAddressHtml = addressLines.map(escapeHtml).join("<br>");

  const itemRows = normalizedItems
    .map(
      (item) => `
        <tr>
          <td style="padding:14px 0;border-bottom:1px solid #e5e7eb;vertical-align:top;">
            <div style="font-weight:700;color:#111827;line-height:1.4;">
              ${escapeHtml(item.productName)}
            </div>
            <div style="margin-top:4px;font-size:13px;color:#6b7280;line-height:1.4;">
              ${item.quantity} × ${escapeHtml(
                formatMoney(item.unitPrice, normalizedCurrency)
              )}
            </div>
          </td>
          <td style="padding:14px 0;border-bottom:1px solid #e5e7eb;text-align:right;vertical-align:top;font-weight:700;color:#111827;white-space:nowrap;">
            ${escapeHtml(formatMoney(item.lineTotal, normalizedCurrency))}
          </td>
        </tr>`
    )
    .join("");

  const textItems = normalizedItems
    .map(
      (item) =>
        `${item.productName} — ${item.quantity} × ${formatMoney(
          item.unitPrice,
          normalizedCurrency
        )} = ${formatMoney(item.lineTotal, normalizedCurrency)}`
    )
    .join("\n");

  const html = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <meta name="x-apple-disable-message-reformatting">
    <title>Order Confirmation #${safeOrderNumber}</title>
  </head>
  <body style="margin:0;padding:0;background:#f6f3ed;font-family:Arial,Helvetica,sans-serif;color:#111827;">
    <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;">
      Payment received for Shakti Foods order #${safeOrderNumber}.
    </div>
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="width:100%;background:#f6f3ed;">
      <tr>
        <td align="center" style="padding:32px 16px;">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="width:100%;max-width:640px;background:#ffffff;border-radius:24px;box-shadow:0 10px 30px rgba(0,0,0,.06);">
            <tr>
              <td style="padding:32px;">
                <div style="text-align:center;margin-bottom:28px;">
                  <div style="font-size:13px;font-weight:700;letter-spacing:.12em;text-transform:uppercase;color:#8a6a34;">
                    Shakti Foods
                  </div>
                  <h1 style="margin:10px 0 0;font-size:30px;line-height:1.2;color:#111827;">
                    Thank you for your order
                  </h1>
                  <p style="margin:10px 0 0;color:#6b7280;line-height:1.5;">
                    Your payment was successful.
                  </p>
                </div>

                <p style="margin:0;font-size:16px;line-height:1.6;">Hi ${safeCustomerName},</p>
                <p style="margin:12px 0 0;font-size:16px;line-height:1.6;color:#374151;">
                  We received your order and are preparing it for shipment.
                </p>

                <div style="margin:24px 0;padding:18px;background:#faf7f1;border-radius:16px;">
                  <div style="font-size:13px;color:#6b7280;text-transform:uppercase;letter-spacing:.08em;">
                    Order number
                  </div>
                  <div style="margin-top:6px;font-size:20px;font-weight:700;color:#111827;">
                    ${safeOrderNumber}
                  </div>
                </div>

                <h2 style="font-size:20px;line-height:1.3;margin:28px 0 10px;color:#111827;">
                  Order summary
                </h2>
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="width:100%;border-collapse:collapse;">
                  ${itemRows}
                </table>

                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="width:100%;margin-top:20px;border-collapse:collapse;">
                  <tr>
                    <td style="padding:6px 0;color:#6b7280;">Subtotal</td>
                    <td style="padding:6px 0;text-align:right;white-space:nowrap;">${escapeHtml(
                      formatMoney(normalizedSubtotal, normalizedCurrency)
                    )}</td>
                  </tr>
                  <tr>
                    <td style="padding:6px 0;color:#6b7280;">Shipping</td>
                    <td style="padding:6px 0;text-align:right;white-space:nowrap;">${escapeHtml(
                      formatMoney(normalizedShippingAmount, normalizedCurrency)
                    )}</td>
                  </tr>
                  <tr>
                    <td style="padding:6px 0;color:#6b7280;">Tax</td>
                    <td style="padding:6px 0;text-align:right;white-space:nowrap;">${escapeHtml(
                      formatMoney(normalizedTaxAmount, normalizedCurrency)
                    )}</td>
                  </tr>
                  <tr>
                    <td style="padding:14px 0 0;font-size:18px;font-weight:700;border-top:1px solid #e5e7eb;">Total</td>
                    <td style="padding:14px 0 0;text-align:right;font-size:18px;font-weight:700;border-top:1px solid #e5e7eb;white-space:nowrap;">${escapeHtml(
                      formatMoney(normalizedTotalAmount, normalizedCurrency)
                    )}</td>
                  </tr>
                </table>

                <h2 style="font-size:20px;line-height:1.3;margin:30px 0 10px;color:#111827;">
                  Shipping address
                </h2>
                <p style="margin:0;line-height:1.7;color:#374151;">${safeAddressHtml}</p>

                <p style="margin:30px 0 0;line-height:1.6;color:#374151;">
                  We’ll send another email when your order ships.
                </p>

                <div style="margin-top:32px;padding-top:20px;border-top:1px solid #e5e7eb;text-align:center;color:#6b7280;font-size:13px;">
                  Shakti Foods
                </div>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;

  const text = `Thank you for your order

Hi ${normalizedCustomerName},

Your payment was successful, and we are preparing your order for shipment.

Order number: ${displayOrderNumber}

Order summary:
${textItems}

Subtotal: ${formatMoney(normalizedSubtotal, normalizedCurrency)}
Shipping: ${formatMoney(normalizedShippingAmount, normalizedCurrency)}
Tax: ${formatMoney(normalizedTaxAmount, normalizedCurrency)}
Total: ${formatMoney(normalizedTotalAmount, normalizedCurrency)}

Shipping address:
${addressLines.join("\n")}

We’ll send another email when your order ships.

Shakti Foods`;

  return {
    orderId: normalizedOrderId,
    orderNumber: displayOrderNumber,
    subject: `Order Confirmation #${displayOrderNumber}`,
    html,
    text
  };
}

/**
 * Sends an order confirmation without allowing an email/provider failure to
 * escape into payment fulfillment. Stripe and PayPal should both call this
 * helper after the order has been durably marked paid and inventory completed.
 */
export async function sendOrderConfirmationEmailSafely({
  customerEmail,
  ...orderData
}) {
  const orderIdForLog = String(orderData?.orderId ?? "");

  try {
    const recipient = normalizeEmail(customerEmail);
    const email = buildOrderConfirmationEmail(orderData);
    const result = await sendTransactionalEmail({
      to: recipient,
      subject: email.subject,
      html: email.html,
      text: email.text,
      idempotencyKey: `order-confirmation-${email.orderId}`
    });

    return {
      sent: true,
      orderId: email.orderId,
      orderNumber: email.orderNumber,
      emailId: result?.id ?? null
    };
  } catch (error) {
    console.error("Unable to send order confirmation email:", {
      orderId: orderIdForLog || null,
      message: error instanceof Error ? error.message : String(error)
    });

    return {
      sent: false,
      orderId: orderIdForLog || null,
      orderNumber: formatOrderNumber(orderIdForLog) || null,
      error: error instanceof Error ? error.message : String(error)
    };
  }
}

export function buildOrderStatusEmail({
  order,
  items = []
}) {
  if (!order || typeof order !== "object") {
    throw new TypeError(
      "Order information is required to build a status email."
    );
  }

  const orderId = normalizeUuid(
    order.id,
    "Order ID"
  );

  const orderNumber =
    formatOrderNumber(orderId);

  const customerName = cleanText(
    order.customer_name ??
      order.customerName,
    "Customer",
    120
  );

  const status = cleanText(
    order.fulfillment_status ??
      order.fulfillmentStatus,
    "processing",
    30
  ).toLowerCase();

  const carrier = cleanText(
    order.shipping_carrier ??
      order.shippingCarrier,
    "",
    80
  );

  const service = cleanText(
    order.shipping_service ??
      order.shippingService,
    "",
    120
  );

  const trackingNumber = cleanText(
    order.tracking_number ??
      order.trackingNumber,
    "",
    200
  );

  const trackingUrl = cleanText(
    order.tracking_url ??
      order.trackingUrl,
    "",
    1000
  );

  const normalizedItems =
    Array.isArray(items)
      ? items.slice(0, MAX_ITEMS)
      : [];

  const safeCustomerName =
    escapeHtml(customerName);

  const safeOrderNumber =
    escapeHtml(orderNumber);

  const safeCarrier =
    escapeHtml(
      carrier
        ? carrier.toUpperCase()
        : ""
    );

  const safeService =
    escapeHtml(service);

  const safeTrackingNumber =
    escapeHtml(trackingNumber);

  const safeTrackingUrl =
    trackingUrl &&
    /^https?:\/\//i.test(trackingUrl)
      ? escapeHtml(trackingUrl)
      : "";

  const statusConfig = {
    new: {
      title: "We received your order",
      message:
        "Your order has been received and will be prepared soon.",
      subject:
        `Order Received #${orderNumber}`
    },

    processing: {
      title: "Your order is being prepared",
      message:
        "We are currently preparing your order.",
      subject:
        `Order Update #${orderNumber}`
    },

    packed: {
      title: "Your order is packed",
      message:
        "Your order has been packed and is getting ready for shipment.",
      subject:
        `Your Order Is Packed #${orderNumber}`
    },

    shipped: {
      title: "Your order has shipped",
      message:
        "Your Shakti Foods order is on the way.",
      subject:
        `Your Order Has Shipped #${orderNumber}`
    },

    delivered: {
      title: "Your order was delivered",
      message:
        "Your Shakti Foods order has been marked as delivered.",
      subject:
        `Your Order Was Delivered #${orderNumber}`
    },

    canceled: {
      title: "Your order was canceled",
      message:
        "Your Shakti Foods order has been canceled.",
      subject:
        `Order Canceled #${orderNumber}`
    }
  };

  const config =
    statusConfig[status] ||
    {
      title: "Your order was updated",
      message:
        `Your order status is now ${status}.`,
      subject:
        `Order Update #${orderNumber}`
    };

  const itemRows = normalizedItems
    .map((item) => {
      const productName =
        cleanText(
          item?.product_name ??
            item?.productName ??
            item?.name,
          "Product",
          200
        );

      const quantity =
        Number.isSafeInteger(
          Number(item?.quantity)
        ) &&
        Number(item?.quantity) > 0
          ? Number(item.quantity)
          : 1;

      return `
        <tr>
          <td
            style="
              padding:12px 0;
              border-bottom:1px solid #e5e7eb;
              color:#111827;
            "
          >
            ${escapeHtml(productName)}
          </td>

          <td
            style="
              padding:12px 0;
              border-bottom:1px solid #e5e7eb;
              text-align:right;
              color:#374151;
            "
          >
            Qty ${quantity}
          </td>
        </tr>
      `;
    })
    .join("");

  const textItems = normalizedItems
    .map((item) => {
      const productName =
        cleanText(
          item?.product_name ??
            item?.productName ??
            item?.name,
          "Product",
          200
        );

      const quantity =
        Number(item?.quantity) > 0
          ? Number(item.quantity)
          : 1;

      return `${productName} — Qty ${quantity}`;
    })
    .join("\n");

  const shippingDetailsHtml =
    status === "shipped"
      ? `
        <div
          style="
            margin-top:24px;
            padding:20px;
            background:#faf7f1;
            border-radius:16px;
          "
        >
          <div
            style="
              font-size:13px;
              font-weight:700;
              text-transform:uppercase;
              letter-spacing:.08em;
              color:#8a6a34;
            "
          >
            Shipping information
          </div>

          ${
            safeCarrier
              ? `
                <p
                  style="
                    margin:14px 0 0;
                    color:#374151;
                    line-height:1.6;
                  "
                >
                  <strong>Carrier:</strong>
                  ${safeCarrier}
                </p>
              `
              : ""
          }

          ${
            safeService
              ? `
                <p
                  style="
                    margin:6px 0 0;
                    color:#374151;
                    line-height:1.6;
                  "
                >
                  <strong>Service:</strong>
                  ${safeService}
                </p>
              `
              : ""
          }

          ${
            safeTrackingNumber
              ? `
                <p
                  style="
                    margin:6px 0 0;
                    color:#374151;
                    line-height:1.6;
                  "
                >
                  <strong>Tracking:</strong>
                  ${safeTrackingNumber}
                </p>
              `
              : ""
          }

          ${
            safeTrackingUrl
              ? `
                <div style="margin-top:18px;">
                  <a
                    href="${safeTrackingUrl}"
                    style="
                      display:inline-block;
                      padding:12px 20px;
                      background:#111111;
                      color:#ffffff;
                      text-decoration:none;
                      border-radius:999px;
                      font-weight:700;
                    "
                  >
                    Track Your Package
                  </a>
                </div>
              `
              : ""
          }
        </div>
      `
      : "";

  const html = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta
    name="viewport"
    content="width=device-width,initial-scale=1"
  >
  <title>${escapeHtml(config.subject)}</title>
</head>

<body
  style="
    margin:0;
    padding:0;
    background:#f6f3ed;
    font-family:Arial,Helvetica,sans-serif;
    color:#111827;
  "
>
  <table
    role="presentation"
    width="100%"
    cellspacing="0"
    cellpadding="0"
    border="0"
    style="background:#f6f3ed;"
  >
    <tr>
      <td
        align="center"
        style="padding:32px 16px;"
      >
        <table
          role="presentation"
          width="100%"
          cellspacing="0"
          cellpadding="0"
          border="0"
          style="
            width:100%;
            max-width:640px;
            background:#ffffff;
            border-radius:24px;
          "
        >
          <tr>
            <td style="padding:32px;">

              <div
                style="
                  text-align:center;
                  margin-bottom:28px;
                "
              >
                <div
                  style="
                    font-size:13px;
                    font-weight:700;
                    letter-spacing:.12em;
                    text-transform:uppercase;
                    color:#8a6a34;
                  "
                >
                  Shakti Foods
                </div>

                <h1
                  style="
                    margin:10px 0 0;
                    font-size:30px;
                    line-height:1.2;
                  "
                >
                  ${escapeHtml(config.title)}
                </h1>
              </div>

              <p
                style="
                  margin:0;
                  font-size:16px;
                  line-height:1.6;
                "
              >
                Hi ${safeCustomerName},
              </p>

              <p
                style="
                  margin:12px 0 0;
                  font-size:16px;
                  line-height:1.6;
                  color:#374151;
                "
              >
                ${escapeHtml(config.message)}
              </p>

              <div
                style="
                  margin:24px 0;
                  padding:18px;
                  background:#faf7f1;
                  border-radius:16px;
                "
              >
                <div
                  style="
                    font-size:13px;
                    color:#6b7280;
                    text-transform:uppercase;
                    letter-spacing:.08em;
                  "
                >
                  Order number
                </div>

                <div
                  style="
                    margin-top:6px;
                    font-size:20px;
                    font-weight:700;
                  "
                >
                  ${safeOrderNumber}
                </div>
              </div>

              ${
                itemRows
                  ? `
                    <h2
                      style="
                        margin:28px 0 8px;
                        font-size:20px;
                      "
                    >
                      Order items
                    </h2>

                    <table
                      role="presentation"
                      width="100%"
                      cellspacing="0"
                      cellpadding="0"
                      border="0"
                      style="
                        width:100%;
                        border-collapse:collapse;
                      "
                    >
                      ${itemRows}
                    </table>
                  `
                  : ""
              }

              ${shippingDetailsHtml}

              <p
                style="
                  margin:30px 0 0;
                  color:#374151;
                  line-height:1.6;
                "
              >
                Thank you for shopping with
                Shakti Foods.
              </p>

              <div
                style="
                  margin-top:32px;
                  padding-top:20px;
                  border-top:1px solid #e5e7eb;
                  text-align:center;
                  color:#6b7280;
                  font-size:13px;
                "
              >
                Shakti Foods
              </div>

            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

  const shippingDetailsText =
    status === "shipped"
      ? [
          "",
          "Shipping information:",
          carrier
            ? `Carrier: ${carrier.toUpperCase()}`
            : null,
          service
            ? `Service: ${service}`
            : null,
          trackingNumber
            ? `Tracking number: ${trackingNumber}`
            : null,
          trackingUrl
            ? `Track package: ${trackingUrl}`
            : null
        ]
          .filter(Boolean)
          .join("\n")
      : "";

  const text = `${config.title}

Hi ${customerName},

${config.message}

Order number: ${orderNumber}

${
  textItems
    ? `Order items:
${textItems}
`
    : ""
}
${shippingDetailsText}

Thank you for shopping with Shakti Foods.

Shakti Foods`;

  return {
    orderId,
    orderNumber,
    status,
    subject: config.subject,
    html,
    text
  };
}