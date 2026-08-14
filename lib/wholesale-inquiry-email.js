import { sendTransactionalEmail } from "@/lib/email";

const EMAIL_PATTERN =
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const VALID_STATUSES = new Set([
  "contacted",
  "quoted",
  "won",
  "lost"
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
    contacted: {
      subject:
        "We Received Your Wholesale Inquiry",
      title:
        "Our team is reviewing your request",
      message:
        "Thank you for contacting Shakti Foods. Our team has started reviewing your wholesale inquiry and may contact you for additional details.",
      statusLabel:
        "Contacted"
    },

    quoted: {
      subject:
        "Your Shakti Foods Wholesale Inquiry Has Been Reviewed",
      title:
        "Your wholesale opportunity has moved to quoting",
      message:
        "We have reviewed your wholesale requirements and your inquiry is now in the quotation stage. Our team will contact you with pricing and order details.",
      statusLabel:
        "Quoted"
    },

    won: {
      subject:
        "Welcome to Shakti Foods Wholesale",
      title:
        "Your wholesale opportunity is confirmed",
      message:
        "Thank you for choosing Shakti Foods. Your wholesale opportunity has been confirmed, and our team will coordinate the next steps for fulfillment and delivery.",
      statusLabel:
        "Won"
    },

    lost: {
      subject:
        "Update on Your Shakti Foods Wholesale Inquiry",
      title:
        "An update on your wholesale inquiry",
      message:
        "Thank you for considering Shakti Foods. We have closed this wholesale opportunity for now. You are always welcome to contact us again if your purchasing needs change.",
      statusLabel:
        "Closed"
    }
  };

  return configs[status];
}

export function buildWholesaleInquiryEmail({
  inquiry
}) {
  if (
    !inquiry ||
    typeof inquiry !== "object"
  ) {
    throw new TypeError(
      "Wholesale inquiry information is required."
    );
  }

  const inquiryId = cleanText(
    inquiry.id,
    "",
    100
  );

  if (!inquiryId) {
    throw new TypeError(
      "Wholesale inquiry ID is required."
    );
  }

  const status = cleanText(
    inquiry.status,
    "",
    30
  ).toLowerCase();

  if (!VALID_STATUSES.has(status)) {
    throw new TypeError(
      `Wholesale inquiry email is not supported for status: ${status}`
    );
  }

  const customerName = cleanText(
    inquiry.customer_name ??
      inquiry.customerName,
    "Customer",
    150
  );

  const businessName = cleanText(
    inquiry.business_name ??
      inquiry.businessName,
    "",
    200
  );

  const productName = cleanText(
    inquiry.product_name ??
      inquiry.productName,
    "Wholesale product",
    250
  );

  const estimatedQuantity =
    Number(
      inquiry.estimated_quantity ??
      inquiry.estimatedQuantity
    );

  const quantityUnit = cleanText(
    inquiry.quantity_unit ??
      inquiry.quantityUnit,
    "units",
    50
  );

  const config =
    getStatusConfig(status);

  const safeCustomerName =
    escapeHtml(customerName);

  const safeBusinessName =
    escapeHtml(businessName);

  const safeProductName =
    escapeHtml(productName);

  const quantityText =
    Number.isInteger(estimatedQuantity) &&
    estimatedQuantity > 0
      ? `${estimatedQuantity.toLocaleString()} ${quantityUnit}`
      : "Not provided";

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
                  Wholesale Inquiry
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
                  <strong>Estimated quantity:</strong>
                  ${escapeHtml(quantityText)}
                </p>

                <p
                  style="
                    margin:6px 0 0;
                    color:#374151;
                    line-height:1.6;
                  "
                >
                  <strong>Status:</strong>
                  ${escapeHtml(config.statusLabel)}
                </p>
              </div>

              ${
                status === "won"
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
                        Next steps
                      </div>

                      <p
                        style="
                          margin:8px 0 0;
                          color:#374151;
                          line-height:1.6;
                        "
                      >
                        Our team will follow up with fulfillment,
                        payment, shipping, and delivery information.
                      </p>
                    </div>
                  `
                  : ""
              }

              <p
                style="
                  margin:30px 0 0;
                  color:#374151;
                  line-height:1.6;
                "
              >
                Thank you for your interest in Shakti Foods.
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

  const text = `${config.title}

Hi ${customerName},

${config.message}

Wholesale Inquiry

Product: ${productName}
${businessName ? `Business: ${businessName}\n` : ""}Estimated quantity: ${quantityText}
Status: ${config.statusLabel}

Thank you for your interest in Shakti Foods.

Shakti Foods`;

  return {
    inquiryId,
    status,
    subject: config.subject,
    html,
    text
  };
}

export async function sendWholesaleInquiryEmailSafely({
  customerEmail,
  inquiry
}) {
  const inquiryId =
    String(inquiry?.id ?? "");

  try {
    const recipient =
      normalizeEmail(customerEmail);

    const email =
      buildWholesaleInquiryEmail({
        inquiry
      });

    const result =
      await sendTransactionalEmail({
        to: recipient,
        subject: email.subject,
        html: email.html,
        text: email.text,

        idempotencyKey:
          `wholesale-inquiry-${email.inquiryId}-${email.status}`
      });

    return {
      sent: true,
      inquiryId:
        email.inquiryId,
      status:
        email.status,
      emailId:
        result?.id ?? null
    };
  } catch (error) {
    console.error(
      "Unable to send wholesale inquiry email:",
      {
        inquiryId:
          inquiryId || null,

        message:
          error instanceof Error
            ? error.message
            : String(error)
      }
    );

    return {
      sent: false,
      inquiryId:
        inquiryId || null,
      error:
        error instanceof Error
          ? error.message
          : String(error)
    };
  }
}