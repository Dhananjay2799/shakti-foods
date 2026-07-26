function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

export function formatEmailMoney(cents) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD"
  }).format(Number(cents || 0) / 100);
}

function formatStatus(status) {
  if (!status) {
    return "New";
  }

  return (
    status.charAt(0).toUpperCase() +
    status.slice(1)
  );
}

function buildItemsHtml(items = []) {
  if (!items.length) {
    return `
      <p style="color:#666;">
        No item details were available.
      </p>
    `;
  }

  return items
    .map(
      (item) => `
        <tr>
          <td style="padding:12px 0;border-bottom:1px solid #eee;">
            <strong>${escapeHtml(
              item.product_name
            )}</strong>
          </td>

          <td style="padding:12px 0;border-bottom:1px solid #eee;text-align:center;">
            ${Number(item.quantity || 0)}
          </td>

          <td style="padding:12px 0;border-bottom:1px solid #eee;text-align:right;">
            ${formatEmailMoney(
              item.line_total
            )}
          </td>
        </tr>
      `
    )
    .join("");
}

export function buildOrderStatusEmail({
  order,
  items = []
}) {
  const shortOrderId = order.id
    .slice(0, 8)
    .toUpperCase();

  const fulfillmentStatus =
    formatStatus(
      order.fulfillment_status
    );

  const trackingSection =
    order.tracking_number
      ? `
        <div style="margin-top:24px;padding:18px;background:#f8f4ec;border-radius:14px;">
          <strong>Tracking information</strong>

          <p style="margin:8px 0 0;">
            Carrier:
            ${escapeHtml(
              order.shipping_carrier ||
                "Not specified"
            )}
          </p>

          <p style="margin:6px 0 0;">
            Tracking number:
            ${escapeHtml(
              order.tracking_number
            )}
          </p>

          ${
            order.tracking_url
              ? `
                <p style="margin:14px 0 0;">
                  <a
                    href="${escapeHtml(
                      order.tracking_url
                    )}"
                    style="display:inline-block;background:#000;color:#fff;padding:12px 20px;border-radius:999px;text-decoration:none;font-weight:bold;"
                  >
                    Track Your Package
                  </a>
                </p>
              `
              : ""
          }
        </div>
      `
      : "";

  const html = `
    <!doctype html>
    <html>
      <body style="margin:0;background:#f4f1ea;font-family:Arial,sans-serif;color:#111;">
        <div style="max-width:640px;margin:0 auto;padding:32px 18px;">
          <div style="background:#fff;border-radius:24px;padding:32px;">
            <p style="margin:0;font-size:12px;font-weight:bold;letter-spacing:3px;color:#777;">
              SHAKTI FOODS
            </p>

            <h1 style="margin:16px 0 8px;font-size:30px;">
              Order ${fulfillmentStatus}
            </h1>

            <p style="font-size:16px;line-height:1.7;color:#555;">
              Hello
              ${escapeHtml(
                order.customer_name || "Customer"
              )},
            </p>

            <p style="font-size:16px;line-height:1.7;color:#555;">
              Your order
              <strong>#${shortOrderId}</strong>
              is now
              <strong>${fulfillmentStatus}</strong>.
            </p>

            <table style="width:100%;border-collapse:collapse;margin-top:26px;">
              <thead>
                <tr>
                  <th style="text-align:left;padding-bottom:10px;">
                    Product
                  </th>

                  <th style="text-align:center;padding-bottom:10px;">
                    Qty
                  </th>

                  <th style="text-align:right;padding-bottom:10px;">
                    Total
                  </th>
                </tr>
              </thead>

              <tbody>
                ${buildItemsHtml(items)}
              </tbody>
            </table>

            <div style="margin-top:22px;text-align:right;font-size:18px;">
              <strong>
                Order total:
                ${formatEmailMoney(
                  order.total_amount
                )}
              </strong>
            </div>

            ${trackingSection}

            <p style="margin-top:28px;font-size:14px;line-height:1.7;color:#777;">
              Thank you for shopping with Shakti Foods.
            </p>
          </div>
        </div>
      </body>
    </html>
  `;

  const text = [
    "SHAKTI FOODS",
    "",
    `Order #${shortOrderId}`,
    `Status: ${fulfillmentStatus}`,
    "",
    `Hello ${order.customer_name || "Customer"},`,
    "",
    `Your order is now ${fulfillmentStatus}.`,
    `Order total: ${formatEmailMoney(
      order.total_amount
    )}`,
    order.shipping_carrier
      ? `Carrier: ${order.shipping_carrier}`
      : "",
    order.tracking_number
      ? `Tracking number: ${order.tracking_number}`
      : "",
    order.tracking_url
      ? `Tracking link: ${order.tracking_url}`
      : "",
    "",
    "Thank you for shopping with Shakti Foods."
  ]
    .filter(Boolean)
    .join("\n");

  return {
    subject:
      `Order #${shortOrderId} is ${fulfillmentStatus}`,
    html,
    text
  };
}