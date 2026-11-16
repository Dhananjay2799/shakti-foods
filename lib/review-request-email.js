import { sendTransactionalEmail } from "@/lib/email";
import { createSignedToken } from "@/lib/signed-link";
import {
  ECOWARE_STOREFRONT,
  getStorefrontBrand,
  getStorefrontPageUrl,
  getStorefrontSiteUrl
} from "@/lib/storefront-config";

/*
 * "How was your rice?" email, sent once a few days after an order
 * arrives (see lib/review-request-processor.js). Each product gets a
 * "Write a review" link with a signed code, so the review is marked
 * "Verified purchase". No incentive is offered: we ask for an honest
 * review, good or bad.
 */

export const REVIEW_LINK_PURPOSE = "review-link";
export const UNSUBSCRIBE_PURPOSE = "unsubscribe";
const REVIEW_LINK_DAYS = 90;

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function firstName(name) {
  const first = String(name || "").trim().split(/\s+/)[0] || "";
  return first.length > 1 && first.length <= 30 ? first : "";
}

export function reviewLinkFor({ storefront, orderId, productId, slug }) {
  const token = createSignedToken(
    REVIEW_LINK_PURPOSE,
    { o: orderId, p: productId },
    { expiresInDays: REVIEW_LINK_DAYS }
  );

  return `${getStorefrontPageUrl(storefront, `/products/${slug}`)}?review=${encodeURIComponent(token)}#reviews`;
}

export function unsubscribeLinkFor({ storefront, email }) {
  const token = createSignedToken(UNSUBSCRIBE_PURPOSE, {
    e: String(email || "").trim().toLowerCase()
  });

  // API routes sit at the root on both websites (no /ecoware prefix).
  return `${getStorefrontSiteUrl(storefront)}/api/email/unsubscribe?token=${encodeURIComponent(token)}`;
}

/**
 * products: [{ productId, name, slug }] (1–3 products from the order).
 */
export function buildReviewRequestEmail({ storefront, orderId, customerName, email, products }) {
  const brand = getStorefrontBrand(storefront);
  const isEcoware = brand.storefront === ECOWARE_STOREFRONT;
  const hello = firstName(customerName);

  const subject = isEcoware
    ? "How are you liking your Simpli Ecoware order?"
    : "How was your Shakti Foods rice?";
  const heading = isEcoware ? "How is your order working out?" : "How was your rice?";
  const intro = isEcoware
    ? `Thank you for ordering from Simpli Ecoware. We hope everything arrived in good shape and is working well for you.`
    : `Thank you for ordering from Shakti Foods. We hope your rice cooked up fluffy and fragrant.`;
  const ask =
    "Would you take a minute to share your honest opinion? Good or bad, every review helps other customers decide, and helps a small family business improve.";

  const lines = products.map((product) => ({
    ...product,
    url: reviewLinkFor({ storefront: brand.storefront, orderId, productId: product.productId, slug: product.slug })
  }));
  const unsubscribeUrl = unsubscribeLinkFor({ storefront: brand.storefront, email });

  const productRows = lines
    .map(
      (line) => `
        <tr>
          <td style="padding:14px 0;border-bottom:1px solid #e5e7eb;font-weight:700;color:#111827;">
            ${escapeHtml(line.name)}
          </td>
          <td style="padding:14px 0;border-bottom:1px solid #e5e7eb;text-align:right;white-space:nowrap;">
            <a href="${escapeHtml(line.url)}" style="display:inline-block;background:#000000;color:#ffffff;text-decoration:none;font-weight:700;font-size:14px;padding:10px 18px;border-radius:999px;">
              Write a review
            </a>
          </td>
        </tr>`
    )
    .join("");

  const html = `<!doctype html>
<html>
  <body style="margin:0;padding:0;background:#f6f3ed;font-family:Arial,sans-serif;color:#111827;">
    <div style="max-width:640px;margin:0 auto;padding:32px 16px;">
      <div style="background:#ffffff;border-radius:24px;padding:32px;box-shadow:0 10px 30px rgba(0,0,0,.06);">
        <div style="text-align:center;margin-bottom:24px;">
          <div style="font-size:12px;font-weight:700;letter-spacing:.16em;text-transform:uppercase;color:#8b7b66;">
            ${escapeHtml(brand.businessName)}
          </div>
          <h1 style="margin:10px 0 0;font-size:30px;color:#111827;">${escapeHtml(heading)}</h1>
        </div>

        <p style="font-size:16px;line-height:1.7;color:#374151;margin:0 0 12px;">
          ${hello ? `Hi ${escapeHtml(hello)},` : "Hi there,"}
        </p>
        <p style="font-size:16px;line-height:1.7;color:#374151;margin:0 0 12px;">${escapeHtml(intro)}</p>
        <p style="font-size:16px;line-height:1.7;color:#374151;margin:0 0 20px;">${escapeHtml(ask)}</p>

        <table style="width:100%;border-collapse:collapse;">${productRows}</table>

        <p style="margin:24px 0 0;font-size:14px;line-height:1.6;color:#6b7280;">
          Something not right with your order? Just reply to this email and we'll make it right.
        </p>

        <div style="margin-top:32px;padding-top:20px;border-top:1px solid #e5e7eb;text-align:center;color:#6b7280;font-size:12px;line-height:1.7;">
          <a href="${escapeHtml(brand.siteUrl)}" style="color:#6b7280;text-decoration:none;">
            ${escapeHtml(brand.businessName)} — ${escapeHtml(brand.siteLabel)}
          </a><br />
          You're getting this because you ordered from us.
          <a href="${escapeHtml(unsubscribeUrl)}" style="color:#6b7280;">Unsubscribe from review requests</a>
        </div>
      </div>
    </div>
  </body>
</html>`;

  const text = [
    heading,
    "",
    hello ? `Hi ${hello},` : "Hi there,",
    "",
    intro,
    "",
    ask,
    "",
    ...lines.map((line) => `${line.name}\nWrite a review: ${line.url}\n`),
    "Something not right with your order? Just reply to this email and we'll make it right.",
    "",
    `${brand.businessName} — ${brand.siteUrl}`,
    `Unsubscribe from review requests: ${unsubscribeUrl}`
  ].join("\n");

  return {
    subject,
    html,
    text,
    from: brand.emailFrom,
    replyTo: brand.replyTo,
    unsubscribeUrl,
    links: lines.map((line) => line.url)
  };
}

export async function sendReviewRequestEmailSafely({ orderId, storefront, customerName, email, products }) {
  const recipient = String(email || "").trim().toLowerCase();

  if (!recipient || !products?.length) {
    return { sent: false, skipped: true, reason: "nothing_to_send" };
  }

  try {
    const message = buildReviewRequestEmail({
      storefront,
      orderId,
      customerName,
      email: recipient,
      products
    });

    const result = await sendTransactionalEmail({
      from: message.from,
      replyTo: message.replyTo,
      to: recipient,
      subject: message.subject,
      html: message.html,
      text: message.text,
      headers: {
        "List-Unsubscribe": `<${message.unsubscribeUrl}>`,
        "List-Unsubscribe-Post": "List-Unsubscribe=One-Click"
      },
      idempotencyKey: `review-request-${orderId}`
    });

    console.log("Review request email sent:", { orderId, storefront, result });

    return { sent: true, result };
  } catch (error) {
    console.error("Review request email failed:", {
      orderId,
      message: error instanceof Error ? error.message : String(error)
    });

    return { sent: false, skipped: false, reason: "send_failed" };
  }
}
