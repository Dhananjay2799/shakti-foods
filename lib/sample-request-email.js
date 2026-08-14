import { sendTransactionalEmail } from "@/lib/email";

const EMAIL_PATTERN =
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const VALID_STATUSES = new Set([
  "approved",
  "rejected",
  "shipped",
  "completed"
]);

function cleanText(
  value,
  fallback = "",
  maxLength = 500
) {
  const normalized = String(value ?? "")
    .replace(
      /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g,
      ""
    )
    .replace(/\s+/g, " ")
    .trim();

  return (normalized || fallback).slice(
    0,
    maxLength
  );
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function normalizeEmail(value) {
  const email = cleanText(
    value,
    "",
    320
  ).toLowerCase();

  if (
    !email ||
    !EMAIL_PATTERN.test(email)
  ) {
    throw new TypeError(
      "A valid customer email address is required."
    );
  }

  return email;
}

function getStatusConfig(status) {
  const configs = {
    approved: {
      subject:
        "Your Simpli Ecoware Sample Request Was Approved",

      title:
        "Your free sample request was approved",

      message:
        "Great news! Your Simpli Ecoware sample request has been approved. Our team is preparing your sample for shipment.",

      accent:
        "Approved"
    },

    rejected: {
      subject:
        "Update on Your Simpli Ecoware Sample Request",

      title:
        "An update on your sample request",

      message:
        "Thank you for your interest in Simpli Ecoware. After reviewing your request, we are unable to approve this sample request at this time.",

      accent:
        "Request Update"
    },

    shipped: {
      subject:
        "Your Simpli Ecoware Free Sample Has Shipped",

      title:
        "Your free sample is on the way",

      message:
        "Your Simpli Ecoware sample has been shipped and is on its way to you.",

      accent:
        "Shipped"
    },

    completed: {
      subject:
        "We Hope You Enjoyed Your Simpli Ecoware Sample",

      title:
        "Your sample request is complete",

      message:
        "We hope you had a chance to test your Simpli Ecoware sample. If the product is a good fit for your business, our team would be happy to help with wholesale pricing and larger quantities.",

      accent:
        "Completed"
    }
  };

  return configs[status];
}

export function buildSampleRequestEmail({
  request
}) {
  if (
    !request ||
    typeof request !== "object"
  ) {
    throw new TypeError(
      "Sample request information is required."
    );
  }

  const requestId = cleanText(
    request.id,
    "",
    100
  );

  if (!requestId) {
    throw new TypeError(
      "Sample request ID is required."
    );
  }

  const status = cleanText(
    request.status,
    "",
    30
  ).toLowerCase();

  if (!VALID_STATUSES.has(status)) {
    throw new TypeError(
      `Sample request email is not supported for status: ${status}`
    );
  }

  const customerName = cleanText(
    request.customer_name ??
      request.customerName,
    "Customer",
    150
  );

  const productName = cleanText(
    request.product_name ??
      request.productName,
    "Simpli Ecoware product",
    250
  );

  const businessName = cleanText(
    request.business_name ??
      request.businessName,
    "",
    200
  );

  const carrier = cleanText(
    request.shipping_carrier ??
      request.shippingCarrier,
    "",
    80
  );

  const trackingNumber = cleanText(
    request.tracking_number ??
      request.trackingNumber,
    "",
    200
  );

  const rawTrackingUrl = cleanText(
    request.tracking_url ??
      request.trackingUrl,
    "",
    1000
  );

  const trackingUrl =
    /^https?:\/\//i.test(rawTrackingUrl)
      ? rawTrackingUrl
      : "";

  const config =
    getStatusConfig(status);

  const safeCustomerName =
    escapeHtml(customerName);

  const safeProductName =
    escapeHtml(productName);

  const safeBusinessName =
    escapeHtml(businessName);

  const safeCarrier =
    escapeHtml(
      carrier
        ? carrier.toUpperCase()
        : ""
    );

  const safeTrackingNumber =
    escapeHtml(trackingNumber);

  const safeTrackingUrl =
    escapeHtml(trackingUrl);

  const shippingHtml =
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
              font-size:12px;
              font-weight:700;
              letter-spacing:.12em;
              text-transform:uppercase;
              color:#8a6a34;
            "
          >
            Shipping Information
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
                <div
                  style="
                    margin-top:18px;
                  "
                >
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
                    Track Your Sample
                  </a>
                </div>
              `
              : ""
          }
        </div>
      `
      : "";

  const completedHtml =
    status === "completed"
      ? `
        <div
          style="
            margin-top:24px;
            padding:20px;
            background:#f0fdf4;
            border-radius:16px;
          "
        >
          <div
            style="
              font-weight:700;
              color:#166534;
            "
          >
            Need wholesale pricing?
          </div>

          <p
            style="
              margin:8px 0 0;
              color:#374151;
              line-height:1.6;
            "
          >
            Contact the Shakti Foods team
            for case quantities, restaurant
            supply, catering orders, and
            wholesale opportunities.
          </p>
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

  <title>
    ${escapeHtml(config.subject)}
  </title>
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
  style="
    width:100%;
    background:#f6f3ed;
  "
>
<tr>
<td
  align="center"
  style="
    padding:32px 16px;
  "
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
    Simpli Ecoware
  </div>

  <h1
    style="
      margin:10px 0 0;
      font-size:30px;
      line-height:1.2;
      color:#111827;
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
    line-height:1.7;
    color:#374151;
  "
>
  ${escapeHtml(config.message)}
</p>

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
      font-size:12px;
      font-weight:700;
      letter-spacing:.12em;
      text-transform:uppercase;
      color:#8a6a34;
    "
  >
    Sample Request
  </div>

  <p
    style="
      margin:14px 0 0;
      color:#374151;
      line-height:1.6;
    "
  >
    <strong>Product:</strong>
    ${safeProductName}
  </p>

  ${
    safeBusinessName
      ? `
        <p
          style="
            margin:6px 0 0;
            color:#374151;
            line-height:1.6;
          "
        >
          <strong>Business:</strong>
          ${safeBusinessName}
        </p>
      `
      : ""
  }

  <p
    style="
      margin:6px 0 0;
      color:#374151;
      line-height:1.6;
    "
  >
    <strong>Status:</strong>
    ${escapeHtml(config.accent)}
  </p>

</div>

${shippingHtml}

${completedHtml}

<p
  style="
    margin:30px 0 0;
    color:#374151;
    line-height:1.6;
  "
>
  Thank you for your interest in
  Simpli Ecoware.
</p>

<p
  style="
    margin:8px 0 0;
    color:#374151;
    line-height:1.6;
  "
>
  Shakti Foods
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
  Simpli Ecoware by Shakti Foods
</div>

</td>
</tr>

</table>

</td>
</tr>
</table>

</body>
</html>`;

  const shippingText =
    status === "shipped"
      ? [
          "",
          "Shipping information:",
          carrier
            ? `Carrier: ${carrier.toUpperCase()}`
            : null,
          trackingNumber
            ? `Tracking number: ${trackingNumber}`
            : null,
          trackingUrl
            ? `Track your sample: ${trackingUrl}`
            : null
        ]
          .filter(Boolean)
          .join("\n")
      : "";

  const completedText =
    status === "completed"
      ? `

Need wholesale pricing?

Contact the Shakti Foods team for case quantities, restaurant supply, catering orders, and wholesale opportunities.`
      : "";

  const text = `${config.title}

Hi ${customerName},

${config.message}

Sample Request

Product: ${productName}
${businessName ? `Business: ${businessName}\n` : ""}Status: ${config.accent}
${shippingText}
${completedText}

Thank you for your interest in Simpli Ecoware.

Shakti Foods
Simpli Ecoware by Shakti Foods`;

  return {
    requestId,
    status,
    subject: config.subject,
    html,
    text
  };
}

export async function sendSampleRequestEmailSafely({
  customerEmail,
  request
}) {
  const requestId =
    String(request?.id ?? "");

  try {
    const recipient =
      normalizeEmail(customerEmail);

    const email =
      buildSampleRequestEmail({
        request
      });

    const result =
      await sendTransactionalEmail({
        to: recipient,
        subject: email.subject,
        html: email.html,
        text: email.text,

        /*
         * Different key for each status.
         * This prevents accidental duplicate
         * emails for the same status.
         */
        idempotencyKey:
          `sample-request-${email.requestId}-${email.status}`
      });

    return {
      sent: true,
      requestId:
        email.requestId,
      status:
        email.status,
      emailId:
        result?.id ?? null
    };
  } catch (error) {
    console.error(
      "Unable to send sample request email:",
      {
        requestId:
          requestId || null,

        message:
          error instanceof Error
            ? error.message
            : String(error)
      }
    );

    /*
     * Email failure must NOT prevent the
     * admin from updating the request.
     */
    return {
      sent: false,
      requestId:
        requestId || null,

      error:
        error instanceof Error
          ? error.message
          : String(error)
    };
  }
}