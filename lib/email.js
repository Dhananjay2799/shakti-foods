import { Resend } from "resend";

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

function getFromAddress() {
  return (
    process.env.ORDER_EMAIL_FROM ||
    "Shakti Foods <onboarding@resend.dev>"
  );
}

export async function sendTransactionalEmail({
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
        from: getFromAddress(),
        to: Array.isArray(to) ? to : [to],
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