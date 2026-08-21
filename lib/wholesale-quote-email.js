import {
  sendTransactionalEmail
} from "@/lib/email";

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function formatMoney(
  cents,
  currency = "USD"
) {
  return new Intl.NumberFormat(
    "en-US",
    {
      style: "currency",
      currency
    }
  ).format(
    Number(cents || 0) / 100
  );
}

function formatDate(value) {
  if (!value) {
    return "No expiration date";
  }

  return new Intl.DateTimeFormat(
    "en-US",
    {
      dateStyle: "medium"
    }
  ).format(
    new Date(`${value}T00:00:00`)
  );
}

export function buildWholesaleQuoteEmail({
  quote,
  items
}) {
  const baseUrl = (
    process.env.NEXT_PUBLIC_BASE_URL ||
    process.env.NEXT_PUBLIC_SITE_URL ||
    "http://localhost:3000"
  ).replace(/\/$/, "");

  const quoteUrl =
    `${baseUrl}/wholesale/quote?token=` +
    encodeURIComponent(
      quote.response_token
    );

  const itemRows =
    (items || [])
      .map((item) => `
        <tr>
          <td style="padding:14px 0;border-bottom:1px solid #e5e7eb;">
            <strong>${escapeHtml(item.product_name)}</strong>
          </td>

          <td
            align="right"
            style="padding:14px 8px;border-bottom:1px solid #e5e7eb;"
          >
            ${Number(item.quantity).toLocaleString()}
          </td>

          <td
            align="right"
            style="padding:14px 8px;border-bottom:1px solid #e5e7eb;"
          >
            ${formatMoney(
              item.unit_price_cents,
              quote.currency
            )}
          </td>

          <td
            align="right"
            style="padding:14px 0;border-bottom:1px solid #e5e7eb;"
          >
            <strong>
              ${formatMoney(
                item.line_total_cents,
                quote.currency
              )}
            </strong>
          </td>
        </tr>
      `)
      .join("");

  const textItems =
    (items || [])
      .map(
        (item) =>
          `${item.product_name} — ` +
          `${item.quantity} × ` +
          `${formatMoney(
            item.unit_price_cents,
            quote.currency
          )} = ` +
          `${formatMoney(
            item.line_total_cents,
            quote.currency
          )}`
      )
      .join("\n");

  const html = `
    <!doctype html>
    <html>
      <body
        style="
          margin:0;
          padding:0;
          background:#f6f3ed;
          font-family:Arial,sans-serif;
          color:#111827;
        "
      >
        <div
          style="
            max-width:700px;
            margin:0 auto;
            padding:32px 16px;
          "
        >
          <div
            style="
              background:#ffffff;
              border-radius:24px;
              padding:32px;
            "
          >
            <div
              style="
                text-align:center;
                margin-bottom:30px;
              "
            >
              <div
                style="
                  font-size:12px;
                  font-weight:700;
                  letter-spacing:.16em;
                  text-transform:uppercase;
                  color:#8b7b66;
                "
              >
                Shakti Foods
              </div>

              <h1
                style="
                  margin:10px 0 0;
                  font-size:30px;
                "
              >
                Wholesale Quote
              </h1>

              <div
                style="
                  margin-top:8px;
                  color:#6b7280;
                "
              >
                ${escapeHtml(quote.quote_number)}
              </div>
            </div>

            <p
              style="
                font-size:16px;
                line-height:1.7;
              "
            >
              Hello ${escapeHtml(
                quote.customer_name
              )},
            </p>

            <p
              style="
                font-size:16px;
                line-height:1.7;
                color:#374151;
              "
            >
              Thank you for your interest in our
              wholesale products. Please review
              your quote below.
            </p>

            ${
              quote.business_name
                ? `
                  <p style="color:#374151;">
                    <strong>Business:</strong>
                    ${escapeHtml(
                      quote.business_name
                    )}
                  </p>
                `
                : ""
            }

            <table
              style="
                width:100%;
                border-collapse:collapse;
                margin-top:24px;
              "
            >
              <thead>
                <tr>
                  <th align="left">
                    Product
                  </th>

                  <th align="right">
                    Qty
                  </th>

                  <th align="right">
                    Unit
                  </th>

                  <th align="right">
                    Total
                  </th>
                </tr>
              </thead>

              <tbody>
                ${itemRows}
              </tbody>
            </table>

            <div
              style="
                margin-top:24px;
                max-width:340px;
                margin-left:auto;
              "
            >
              <p>
                Subtotal:
                <strong style="float:right;">
                  ${formatMoney(
                    quote.subtotal_cents,
                    quote.currency
                  )}
                </strong>
              </p>

              ${
                quote.discount_cents > 0
                  ? `
                    <p>
                      Discount:
                      <strong style="float:right;">
                        -${formatMoney(
                          quote.discount_cents,
                          quote.currency
                        )}
                      </strong>
                    </p>
                  `
                  : ""
              }

              <p>
                Shipping:
                <strong style="float:right;">
                  ${formatMoney(
                    quote.shipping_cents,
                    quote.currency
                  )}
                </strong>
              </p>

              <p>
                Tax:
                <strong style="float:right;">
                  ${formatMoney(
                    quote.tax_cents,
                    quote.currency
                  )}
                </strong>
              </p>

              <p
                style="
                  padding-top:12px;
                  border-top:1px solid #e5e7eb;
                  font-size:18px;
                "
              >
                Total:
                <strong style="float:right;">
                  ${formatMoney(
                    quote.total_cents,
                    quote.currency
                  )}
                </strong>
              </p>
            </div>

            <div
              style="
                margin-top:28px;
                padding:18px;
                background:#faf7f1;
                border-radius:16px;
                line-height:1.7;
              "
            >
              <div>
                <strong>Valid until:</strong>
                ${escapeHtml(
                  formatDate(
                    quote.valid_until
                  )
                )}
              </div>

              ${
                quote.payment_terms
                  ? `
                    <div>
                      <strong>Payment terms:</strong>
                      ${escapeHtml(
                        quote.payment_terms
                      )}
                    </div>
                  `
                  : ""
              }
            </div>

            ${
              quote.customer_notes
                ? `
                  <div
                    style="
                      margin-top:24px;
                      line-height:1.7;
                    "
                  >
                    ${escapeHtml(
                      quote.customer_notes
                    )}
                  </div>
                `
                : ""
            }

            <p
              style="
                margin-top:30px;
                color:#6b7280;
                line-height:1.7;
              "
            >
              Please reply to this email if you
              would like to proceed or have any
              questions about the quote.
            </p>

            <div style="margin-top:30px;text-align:center;">
              <a
                href="${escapeHtml(quoteUrl)}"
                style="
                  display:inline-block;
                  background:#000000;
                  color:#ffffff;
                  text-decoration:none;
                  padding:14px 24px;
                  border-radius:999px;
                  font-weight:700;
                "
              >
                Review &amp; Respond to Quote
              </a>
            </div>
          </div>
        </div>
      </body>
    </html>
  `;

  const text = `
Shakti Foods Wholesale Quote

Quote: ${quote.quote_number}

Hello ${quote.customer_name},

Thank you for your interest in our wholesale products.

${textItems}

Subtotal: ${formatMoney(
    quote.subtotal_cents,
    quote.currency
  )}

Discount: ${formatMoney(
    quote.discount_cents,
    quote.currency
  )}

Shipping: ${formatMoney(
    quote.shipping_cents,
    quote.currency
  )}

Tax: ${formatMoney(
    quote.tax_cents,
    quote.currency
  )}

Total: ${formatMoney(
    quote.total_cents,
    quote.currency
  )}

Valid until: ${formatDate(
    quote.valid_until
  )}

Payment terms: ${
    quote.payment_terms ||
    "Not specified"
  }

Please reply to this email if you would like to proceed.

Review and respond to your quote:${quoteUrl}

Shakti Foods
  `.trim();

  return {
    subject:
      `Wholesale Quote ${quote.quote_number} — Shakti Foods`,
    html,
    text
  };
}

export async function sendWholesaleQuoteEmailSafely({
  quote,
  items
}) {
  if (!quote?.response_token) {
    return {
      sent: false,
      reason: "missing_response_token"
    };
  }

  const recipient =
    String(
      quote?.email || ""
    )
      .trim()
      .toLowerCase();

  if (!recipient) {
    return {
      sent: false,
      reason: "missing_recipient"
    };
  }

  try {
    const email =
      buildWholesaleQuoteEmail({
        quote,
        items
      });

    const result =
      await sendTransactionalEmail({
        to: recipient,
        subject: email.subject,
        html: email.html,
        text: email.text,

        idempotencyKey:
          `wholesale-quote-${quote.id}`
      });

    return {
      sent: true,
      result
    };
  } catch (error) {
    console.error(
      "Wholesale quote email failed:",
      {
        quoteId:
          quote?.id,

        message:
          error instanceof Error
            ? error.message
            : String(error)
      }
    );

    return {
      sent: false,
      reason: "send_failed"
    };
  }
}