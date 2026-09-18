import {
  sendTransactionalEmail
} from "@/lib/email";

function getStorefrontEmailBrand(
  storefront
) {
  if (storefront === "ecoware") {
    return {
      storefront: "ecoware",
      businessName:
        "Simpli Ecoware",

      website:
        "https://www.simpliecoware.com",

      supportName:
        "Simpli Ecoware"
    };
  }

  return {
    storefront:
      "shakti_foods",

    businessName:
      "Shakti Foods",

    website:
      "https://www.shakti-foods.com",

    supportName:
      "Shakti Foods"
  };
}

function getOrderEmailFrom(
  storefront
) {
  if (storefront === "ecoware") {
    return (
      process.env
        .ECOWARE_ORDER_EMAIL_FROM ||
      process.env
        .ORDER_EMAIL_FROM ||
      "Simpli Ecoware <orders@shakti-foods.com>"
    );
  }

  return (
    process.env
      .SHAKTI_ORDER_EMAIL_FROM ||
    process.env
      .ORDER_EMAIL_FROM ||
    "Shakti Foods <orders@shakti-foods.com>"
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

export function formatOrderNumber(orderId) {
  return String(orderId || "")
    .replaceAll("-", "")
    .slice(0, 8)
    .toUpperCase();
}

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
  storefront
}) {
  const brand =
    getStorefrontEmailBrand(
      storefront
    );

  const displayOrderNumber =
    formatOrderNumber(orderId);

  const safeCustomerName =
    escapeHtml(customerName || "Customer");

  const safeOrderNumber =
    escapeHtml(displayOrderNumber);

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
                Thank you for your order! Your payment was successful.
              </p>
            </div>

            <p style="font-size:16px;line-height:1.6;">
              Hi ${safeCustomerName},
            </p>

            <p style="font-size:16px;line-height:1.6;color:#374151;">
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

            <div style="margin-top:32px;padding-top:20px;border-top:1px solid #e5e7eb;text-align:center;color:#6b7280;font-size:13px;">
              <a href="${escapeHtml(brand.website)}" style="color:#6b7280;text-decoration:none;">
                ${escapeHtml(brand.businessName)} — ${escapeHtml(brand.website)}
              </a>
            </div>
          </div>
        </div>
      </body>
    </html>
  `;

  const text = `
Your ${brand.businessName} order confirmation

Hi ${customerName || "Customer"},

Your payment was successful and we are preparing your order.

Order number: ${displayOrderNumber}

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

${brand.businessName}
${brand.website}
  `.trim();

  return {
    subject:
      `Your ${brand.businessName} order confirmation #${displayOrderNumber}`,
    html,
    text
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
  storefront
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
      reason: "missing_recipient"
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
        storefront
      });

    const from =
      getOrderEmailFrom(
        storefront
      );

    const result =
      await sendTransactionalEmail({
        from,
        to: recipient,
        subject: email.subject,
        html: email.html,
        text: email.text,

        // Full UUID remains the
        // idempotency identifier.
        idempotencyKey:
          `order-confirmation-${orderId}`
      });

    console.log(
      "Order confirmation email sent:",
      {
        orderId,
        storefront,
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
    console.error(
      "Order confirmation email failed:",
      {
        orderId,
        storefront,
        customerEmail:
          recipient,

        message:
          error instanceof Error
            ? error.message
            : String(error)
      }
    );

    return {
      sent: false,
      skipped: false,
      reason: "send_failed"
    };
  }
}