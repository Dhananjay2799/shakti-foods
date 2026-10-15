import { Resend } from "resend";

import {
  getStorefrontEmailFrom
} from "@/lib/storefront-config";

let resendClient;

function getResend() {
  if (!process.env.RESEND_API_KEY) {
    throw new Error(
      "RESEND_API_KEY is not configured."
    );
  }

  if (!resendClient) {
    resendClient = new Resend(
      process.env.RESEND_API_KEY
    );
  }

  return resendClient;
}

// Default sender for emails that don't pass their own `from`:
// SHAKTI_ORDER_EMAIL_FROM / ORDER_EMAIL_FROM, else orders@shaktifoodsus.com.
function getFromAddress() {
  return getStorefrontEmailFrom("shakti_foods");
}

/**
 * `from` and `replyTo` are optional. Storefront emails pass them so Shakti
 * Foods and Simpli Ecoware mail is sent under the right brand; other callers
 * keep the ORDER_EMAIL_FROM default.
 */
export async function sendTransactionalEmail({
  from,
  replyTo,
  to,
  subject,
  html,
  text,
  idempotencyKey
}) {
  if (!to) {
    throw new Error(
      "Email recipient is required."
    );
  }

  const resend = getResend();

  const { data, error } =
    await resend.emails.send(
      {
        from:
          String(from || "").trim() ||
          getFromAddress(),
        to: Array.isArray(to) ? to : [to],
        ...(replyTo ? { replyTo } : {}),
        subject,
        html,
        text
      },
      idempotencyKey
        ? {
            idempotencyKey
          }
        : undefined
    );

  if (error) {
    throw new Error(
      error.message ||
        "Unable to send transactional email."
    );
  }

  return data;
}