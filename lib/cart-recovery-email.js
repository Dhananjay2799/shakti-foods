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
  amount,
  currency = "USD"
) {
  return new Intl.NumberFormat(
    "en-US",
    {
      style: "currency",
      currency
    }
  ).format(
    Number(amount || 0) / 100
  );
}

function getBaseUrl() {
  return (
    process.env.NEXT_PUBLIC_BASE_URL ||
    process.env.NEXT_PUBLIC_SITE_URL ||
    "http://localhost:3000"
  ).replace(/\/$/, "");
}

const RECOVERY_EMAILS = {
  first: {
    subject:
      "You left something in your Shakti Foods cart",
    heading:
      "Your cart is waiting.",
    intro:
      "You left a few items in your cart. We saved the details so you can easily return and continue shopping.",
    button:
      "Return to Your Cart"
  },

  second: {
    subject:
      "Still thinking it over?",
    heading:
      "Your cart is still available.",
    intro:
      "Just a reminder that the items you were considering may still be available. Current pricing and availability will be confirmed when you return.",
    button:
      "Restore My Cart"
  },

  final: {
    subject:
      "Last reminder about your Shakti Foods cart",
    heading:
      "One last reminder.",
    intro:
      "This is our final reminder about the items you left behind. You can return to your cart and review current pricing and availability.",
    button:
      "View My Cart"
  }
};

export function buildCartRecoveryEmail({
  recoveryId,
  recoveryToken,
  emailStage,
  items,
  currency = "USD",
  subtotalCents = 0
}) {
  const content =
    RECOVERY_EMAILS[emailStage];

  if (!content) {
    throw new Error(
      `Unsupported recovery email stage: ${emailStage}`
    );
  }

  const recoveryUrl =
    `${getBaseUrl()}/cart/recover?token=` +
    encodeURIComponent(
      recoveryToken
    );

  const safeRecoveryUrl =
    escapeHtml(recoveryUrl);

  const itemRows =
    (items || [])
      .map((item) => {
        const name =
          item.product_name ||
          item.name ||
          "Product";

        const quantity =
          Math.max(
            1,
            Number(
              item.quantity || 1
            )
          );

        return `
          <tr>
            <td
              style="
                padding:14px 0;
                border-bottom:1px solid #e5e7eb;
              "
            >
              <div
                style="
                  font-weight:700;
                  color:#111827;
                "
              >
                ${escapeHtml(name)}
              </div>

              <div
                style="
                  margin-top:4px;
                  font-size:13px;
                  color:#6b7280;
                "
              >
                Quantity: ${quantity}
              </div>
            </td>
          </tr>
        `;
      })
      .join("");

  const textItems =
    (items || [])
      .map((item) => {
        const name =
          item.product_name ||
          item.name ||
          "Product";

        return `${name} × ${Math.max(
          1,
          Number(
            item.quantity || 1
          )
        )}`;
      })
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
            max-width:640px;
            margin:0 auto;
            padding:32px 16px;
          "
        >
          <div
            style="
              background:#ffffff;
              border-radius:24px;
              padding:32px;
              box-shadow:0 10px 30px rgba(0,0,0,.06);
            "
          >

            <div
              style="
                text-align:center;
                margin-bottom:28px;
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
                  color:#111827;
                "
              >
                ${escapeHtml(
                  content.heading
                )}
              </h1>
            </div>

            <p
              style="
                font-size:16px;
                line-height:1.7;
                color:#374151;
              "
            >
              ${escapeHtml(
                content.intro
              )}
            </p>

            ${
              itemRows
                ? `
                  <h2
                    style="
                      margin:28px 0 8px;
                      font-size:19px;
                    "
                  >
                    Your cart
                  </h2>

                  <table
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

            ${
              Number(
                subtotalCents
              ) > 0
                ? `
                  <div
                    style="
                      margin-top:18px;
                      text-align:right;
                      font-size:16px;
                    "
                  >
                    <span
                      style="
                        color:#6b7280;
                      "
                    >
                      Previous cart subtotal:
                    </span>

                    <strong
                      style="
                        margin-left:8px;
                      "
                    >
                      ${formatMoney(
                        subtotalCents,
                        currency
                      )}
                    </strong>
                  </div>
                `
                : ""
            }

            <div
              style="
                margin:32px 0;
                text-align:center;
              "
            >
              <a
                href="${safeRecoveryUrl}"
                style="
                  display:inline-block;
                  background:#000000;
                  color:#ffffff;
                  text-decoration:none;
                  font-weight:700;
                  padding:15px 26px;
                  border-radius:999px;
                "
              >
                ${escapeHtml(
                  content.button
                )}
              </a>
            </div>

            <div
              style="
                background:#faf7f1;
                border-radius:16px;
                padding:16px;
                font-size:13px;
                line-height:1.6;
                color:#6b7280;
              "
            >
              Prices and availability may have changed
              since your previous visit. Current
              information will be shown when your cart
              is restored.
            </div>

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

          </div>
        </div>
      </body>
    </html>
  `;

  const text = `
${content.heading}

${content.intro}

Your cart:
${textItems || "Your saved cart"}

${
  Number(subtotalCents) > 0
    ? `Previous cart subtotal: ${formatMoney(
        subtotalCents,
        currency
      )}`
    : ""
}

${content.button}:
${recoveryUrl}

Prices and availability may have changed since your previous visit. Current information will be shown when your cart is restored.

Shakti Foods
  `.trim();

  return {
    recoveryId,
    subject:
      content.subject,
    html,
    text,
    recoveryUrl
  };
}

export async function sendCartRecoveryEmailSafely({
  to,
  recoveryId,
  recoveryToken,
  emailStage,
  items,
  currency = "USD",
  subtotalCents = 0
}) {
  const recipient =
    String(to || "")
      .trim()
      .toLowerCase();

  if (!recipient) {
    return {
      sent: false,
      skipped: true,
      reason:
        "missing_recipient"
    };
  }

  if (
    !recoveryId ||
    !recoveryToken
  ) {
    return {
      sent: false,
      skipped: true,
      reason:
        "missing_recovery_information"
    };
  }

  try {
    const email =
      buildCartRecoveryEmail({
        recoveryId,
        recoveryToken,
        emailStage,
        items,
        currency,
        subtotalCents
      });

    const result =
      await sendTransactionalEmail({
        to:
          recipient,

        subject:
          email.subject,

        html:
          email.html,

        text:
          email.text,

        /*
         * Each stage receives its own
         * idempotency identifier.
         */
        idempotencyKey:
          `cart-recovery-${recoveryId}-${emailStage}`
      });

    console.log(
      "Cart recovery email sent:",
      {
        recoveryId,
        emailStage,
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
    console.error(
      "Cart recovery email failed:",
      {
        recoveryId,
        emailStage,
        recipient,

        message:
          error instanceof Error
            ? error.message
            : String(error)
      }
    );

    /*
     * Just like your confirmation email,
     * email failure must not alter checkout
     * or inventory state.
     */
    return {
      sent: false,
      skipped: false,
      reason:
        "send_failed"
    };
  }
}