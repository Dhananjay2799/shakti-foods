import nodemailer from "nodemailer";

import { sendTransactionalEmail } from "@/lib/email";
import { getAdminOrderNotificationRecipients } from "@/lib/admin-order-notification";
import { ADMIN_STOREFRONTS } from "@/lib/admin-storefronts";
import { site } from "@/lib/site";
import { QUANTITY_UNIT_LABELS } from "@/lib/wholesale-units";
import {
  SHAKTI_STOREFRONT,
  getStorefrontBrand,
  getStorefrontSiteUrl,
  normalizeStorefront
} from "@/lib/storefront-config";

/*
 * "New wholesale inquiry" email to the business.
 *
 * Recipients: INQUIRY_TO (comma-separated), else the order-notification
 * list (SHAKTI_/ECOWARE_ORDER_NOTIFICATION_EMAILS, ORDER_NOTIFICATION_EMAILS,
 * ADMIN_EMAILS), else the public business email.
 *
 * Sent with Resend, the same service as the order emails. If Resend is not
 * set up or fails, the SMTP account (SMTP_HOST/PORT/USER/PASS) is tried.
 * The inquiry is saved before this runs, so a failed email never loses it.
 */

const EMAIL_PATTERN = /^[^\s@<>()[\],;:"]+@[^\s@<>()[\],;:"]+\.[^\s@<>()[\],;:"]+$/;

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function singleLine(value, maxLength = 60) {
  const text = String(value ?? "").replace(/\s+/g, " ").trim();
  return text.length > maxLength ? `${text.slice(0, maxLength - 1)}…` : text;
}

function parseList(value) {
  const seen = new Set();
  const out = [];

  for (const part of String(value || "").split(/[,;\s]+/)) {
    const email = part.trim();
    const key = email.toLowerCase();

    if (EMAIL_PATTERN.test(email) && !seen.has(key)) {
      seen.add(key);
      out.push(email);
    }
  }

  return out.slice(0, 20);
}

export function getWholesaleNotificationRecipients(storefront) {
  const inquiryTo = parseList(process.env.INQUIRY_TO);

  if (inquiryTo.length) {
    return { recipients: inquiryTo, source: "INQUIRY_TO" };
  }

  const orderList = getAdminOrderNotificationRecipients(storefront);

  if (orderList.recipients.length) {
    return { recipients: orderList.recipients, source: orderList.source };
  }

  const fallback = parseList(site.email);

  return {
    recipients: fallback,
    source: fallback.length ? "site.email" : null
  };
}

export function formatQuantity(quantity, unit) {
  if (!quantity) {
    return "";
  }

  const label = QUANTITY_UNIT_LABELS[unit] || unit || "";
  return `${Number(quantity).toLocaleString("en-US")} ${label.toLowerCase()}`.trim();
}

function adminInquiryUrl(storefront, inquiryId) {
  const slug =
    ADMIN_STOREFRONTS[storefront]?.slug ||
    ADMIN_STOREFRONTS[SHAKTI_STOREFRONT].slug;

  // The admin lives on the Shakti Foods domain for both stores.
  return `${getStorefrontSiteUrl(SHAKTI_STOREFRONT)}/admin/${slug}/wholesale/${encodeURIComponent(inquiryId)}`;
}

/**
 * Subject, HTML and text for the admin email. `inquiry` uses the API's
 * camelCase field names.
 */
export function buildWholesaleInquiryEmail({ inquiryId, createdAt, inquiry }) {
  const storefront = normalizeStorefront(inquiry.storefront);
  const brand = getStorefrontBrand(storefront);
  const adminUrl = inquiryId ? adminInquiryUrl(storefront, inquiryId) : "";
  const quantity = formatQuantity(inquiry.estimatedQuantity, inquiry.quantityUnit);
  const who = inquiry.businessName || inquiry.customerName || "New customer";

  const subject = [
    `[${brand.businessName}] New wholesale inquiry`,
    singleLine(who, 40),
    singleLine(
      [inquiry.productName, quantity].filter(Boolean).join(" × "),
      60
    )
  ]
    .filter(Boolean)
    .join(" – ");

  const location = [
    inquiry.deliveryCity,
    [inquiry.deliveryState, inquiry.deliveryPostalCode].filter(Boolean).join(" ")
  ]
    .filter(Boolean)
    .join(", ");

  const rows = [
    ["Product", inquiry.productName || "Not specified"],
    ["Quantity", quantity || "Not specified"],
    ["Purchase frequency", inquiry.purchaseFrequency],
    ["Name", inquiry.customerName],
    ["Business", inquiry.businessName],
    ["Business type", inquiry.businessType],
    ["Email", inquiry.email, inquiry.email ? `mailto:${inquiry.email}` : ""],
    ["Phone", inquiry.phone, inquiry.phone ? `tel:${String(inquiry.phone).replace(/[^\d+]/g, "")}` : ""],
    ["Delivery location", location]
  ].filter(([, value]) => value);

  const submitted = createdAt
    ? new Intl.DateTimeFormat("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
        hour: "numeric",
        minute: "2-digit",
        timeZone: "America/New_York",
        timeZoneName: "short"
      }).format(new Date(createdAt))
    : "";

  const text = [
    `New wholesale inquiry on ${brand.businessName}`,
    submitted ? `Received ${submitted}` : "",
    "",
    ...rows.map(([label, value]) => `${label}: ${value}`),
    "",
    `Message:\n${inquiry.message || "-"}`,
    "",
    adminUrl ? `Open in admin: ${adminUrl}` : "",
    "Reply to this email to answer the customer directly."
  ]
    .filter((line, index, lines) => line !== "" || lines[index - 1] !== "")
    .join("\n");

  const rowHtml = rows
    .map(([label, value, href]) => {
      const valueHtml = href
        ? `<a href="${escapeHtml(href)}" style="color:#1d4ed8;">${escapeHtml(value)}</a>`
        : escapeHtml(value);

      return `
        <tr>
          <td style="padding:7px 14px 7px 0;color:#6b7280;vertical-align:top;white-space:nowrap;">${escapeHtml(label)}</td>
          <td style="padding:7px 0;color:#111827;font-weight:600;">${valueHtml}</td>
        </tr>`;
    })
    .join("");

  const html = `<!doctype html>
<html>
  <body style="margin:0;background:#f6f2ea;font-family:Arial,Helvetica,sans-serif;">
    <div style="max-width:600px;margin:0 auto;padding:24px 16px;">
      <div style="background:#ffffff;border-radius:16px;padding:24px;border:1px solid #eadfce;">
        <p style="margin:0;color:#b80b19;font-size:12px;font-weight:700;letter-spacing:.14em;text-transform:uppercase;">${escapeHtml(brand.businessName)} · Wholesale</p>
        <h1 style="margin:8px 0 4px;font-size:22px;color:#111827;">New wholesale inquiry</h1>
        ${submitted ? `<p style="margin:0 0 16px;color:#6b7280;font-size:14px;">Received ${escapeHtml(submitted)}</p>` : ""}
        <table role="presentation" style="width:100%;border-collapse:collapse;font-size:14px;">${rowHtml}</table>
        <div style="margin-top:16px;padding:14px 16px;background:#faf7f2;border-radius:12px;">
          <p style="margin:0 0 6px;color:#6b7280;font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:.08em;">Message</p>
          <p style="margin:0;color:#111827;font-size:14px;line-height:1.55;white-space:pre-wrap;">${escapeHtml(inquiry.message || "No message.")}</p>
        </div>
        ${
          adminUrl
            ? `<p style="margin:20px 0 0;"><a href="${escapeHtml(adminUrl)}" style="display:inline-block;background:#111827;color:#ffffff;text-decoration:none;font-weight:700;font-size:14px;padding:12px 18px;border-radius:10px;">Open in admin</a></p>`
            : ""
        }
        <p style="margin:16px 0 0;color:#6b7280;font-size:13px;">Reply to this email to answer the customer directly.</p>
      </div>
    </div>
  </body>
</html>`;

  return {
    subject,
    html,
    text,
    from: brand.emailFrom,
    replyTo: inquiry.email || undefined
  };
}

function smtpConfigured() {
  return ["SMTP_HOST", "SMTP_PORT", "SMTP_USER", "SMTP_PASS"].every(
    (key) => String(process.env[key] || "").trim()
  );
}

async function sendWithSmtp({ to, replyTo, subject, html, text }) {
  const port = Number(process.env.SMTP_PORT);

  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port,
    secure: port === 465,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS
    }
  });

  return transporter.sendMail({
    from: process.env.SMTP_FROM || process.env.SMTP_USER,
    to: to.join(", "),
    replyTo,
    subject,
    html,
    text
  });
}

/**
 * Emails the business about a saved inquiry. Never throws.
 * Returns { sent, via: "resend" | "smtp" | null, recipients, source, errors }.
 */
export async function notifyWholesaleInquiry({ inquiryId, createdAt, inquiry }) {
  const storefront = normalizeStorefront(inquiry?.storefront);
  const { recipients, source } = getWholesaleNotificationRecipients(storefront);
  const errors = [];

  if (!recipients.length) {
    console.warn("Wholesale inquiry email skipped: no recipients (set INQUIRY_TO).", {
      inquiryId,
      storefront
    });

    return { sent: false, via: null, recipients: 0, source, errors: ["no_recipients"] };
  }

  let message;

  try {
    message = buildWholesaleInquiryEmail({ inquiryId, createdAt, inquiry });
  } catch (error) {
    console.error("Unable to build wholesale inquiry email:", error);
    return { sent: false, via: null, recipients: recipients.length, source, errors: ["build_failed"] };
  }

  if (String(process.env.RESEND_API_KEY || "").trim()) {
    try {
      await sendTransactionalEmail({
        from: message.from,
        replyTo: message.replyTo,
        to: recipients,
        subject: message.subject,
        html: message.html,
        text: message.text,
        idempotencyKey: inquiryId ? `wholesale-inquiry-${inquiryId}` : undefined
      });

      console.log("Wholesale inquiry email sent:", {
        inquiryId,
        storefront,
        via: "resend",
        recipients: recipients.length,
        source
      });

      return { sent: true, via: "resend", recipients: recipients.length, source, errors };
    } catch (error) {
      const text = error instanceof Error ? error.message : String(error);
      errors.push(`resend: ${text}`);
      console.error("Wholesale inquiry email via Resend failed:", { inquiryId, message: text });
    }
  }

  if (smtpConfigured()) {
    try {
      await sendWithSmtp({ to: recipients, ...message });

      console.log("Wholesale inquiry email sent:", {
        inquiryId,
        storefront,
        via: "smtp",
        recipients: recipients.length,
        source
      });

      return { sent: true, via: "smtp", recipients: recipients.length, source, errors };
    } catch (error) {
      const text = error instanceof Error ? error.message : String(error);
      errors.push(`smtp: ${text}`);
      console.error("Wholesale inquiry email via SMTP failed:", { inquiryId, message: text });
    }
  }

  return { sent: false, via: null, recipients: recipients.length, source, errors };
}
