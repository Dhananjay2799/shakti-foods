import { getStorefrontBrand } from "@/lib/storefront-config";

const MAX_ITEMS = 100;
const MAX_TEXT_LENGTH = 500;
const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

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

export function formatOrderNumber(orderId) {
  return String(orderId ?? "")
    .replaceAll("-", "")
    .slice(0, 8)
    .toUpperCase();
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

  // Shakti Foods and Simpli Ecoware orders are branded separately.
  const brand =
    getStorefrontBrand(order.storefront);

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
        `Your ${brand.businessName} order is on the way.`,
      subject:
        `Your Order Has Shipped #${orderNumber}`
    },

    delivered: {
      title: "Your order was delivered",
      message:
        `Your ${brand.businessName} order has been marked as delivered.`,
      subject:
        `Your Order Was Delivered #${orderNumber}`
    },

    canceled: {
      title: "Your order was canceled",
      message:
        `Your ${brand.businessName} order has been canceled.`,
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
                  ${escapeHtml(brand.businessName)}
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
                ${escapeHtml(brand.businessName)}.
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
                <a
                  href="${escapeHtml(brand.siteUrl)}"
                  style="color:#6b7280;text-decoration:none;"
                >
                  ${escapeHtml(brand.businessName)} — ${escapeHtml(brand.siteLabel)}
                </a>
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

Thank you for shopping with ${brand.businessName}.

${brand.businessName}
${brand.siteUrl}`;

  return {
    orderId,
    orderNumber,
    status,
    subject: config.subject,
    html,
    text,
    from: brand.emailFrom,
    replyTo: brand.replyTo
  };
}