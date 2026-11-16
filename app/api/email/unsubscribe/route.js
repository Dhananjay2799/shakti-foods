import { NextResponse } from "next/server";
import { createSupabaseAdmin } from "@/lib/supabase-admin";
import { readSignedToken } from "@/lib/signed-link";
import { UNSUBSCRIBE_PURPOSE } from "@/lib/review-request-email";
import { getStorefrontBrand } from "@/lib/storefront-config";
import { getEcowareHostname } from "@/lib/storefront-hosts";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/*
 * "Unsubscribe from review requests" (link in the review request email).
 *   GET  -> a page with an Unsubscribe button (email scanners open links
 *           automatically, so opening the link alone changes nothing).
 *   POST -> records the opt-out. Also what Gmail/Yahoo's one-click
 *           "Unsubscribe" sends (List-Unsubscribe-Post header).
 */

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function page(request, { title, message, form = "" }, status = 200) {
  const brand = getStorefrontBrand(
    getEcowareHostname(request.headers.get("host")) ? "ecoware" : "shakti_foods"
  );

  const html = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <meta name="robots" content="noindex" />
    <title>${escapeHtml(title)} | ${escapeHtml(brand.businessName)}</title>
  </head>
  <body style="margin:0;background:#f6f3ed;font-family:Arial,sans-serif;color:#111827;">
    <main style="max-width:480px;margin:64px auto;padding:0 16px;">
      <div style="background:#fff;border-radius:24px;padding:32px;text-align:center;box-shadow:0 10px 30px rgba(0,0,0,.06);">
        <div style="font-size:12px;font-weight:700;letter-spacing:.16em;text-transform:uppercase;color:#8b7b66;">${escapeHtml(brand.businessName)}</div>
        <h1 style="margin:10px 0 12px;font-size:26px;">${escapeHtml(title)}</h1>
        <p style="margin:0;font-size:16px;line-height:1.6;color:#374151;">${escapeHtml(message)}</p>
        ${form}
        <p style="margin:24px 0 0;font-size:14px;"><a href="${escapeHtml(brand.siteUrl)}" style="color:#111827;">Back to ${escapeHtml(brand.siteLabel)}</a></p>
      </div>
    </main>
  </body>
</html>`;

  return new NextResponse(html, {
    status,
    headers: { "content-type": "text/html; charset=utf-8", "cache-control": "no-store" }
  });
}

function emailFromToken(token) {
  const email = String(readSignedToken(UNSUBSCRIBE_PURPOSE, token)?.e || "").trim().toLowerCase();
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? email : null;
}

const INVALID = {
  title: "This link isn't valid",
  message: "The unsubscribe link is incomplete or has been changed. Please reply to any of our emails and we'll take you off the list."
};

export async function GET(request) {
  const token = request.nextUrl.searchParams.get("token") || "";

  if (!emailFromToken(token)) {
    return page(request, INVALID, 400);
  }

  return page(request, {
    title: "Unsubscribe from review requests?",
    message: "We'll stop asking you to review your orders. Order confirmations and shipping updates still arrive as usual.",
    form: `<form method="post" style="margin-top:24px;">
        <input type="hidden" name="token" value="${escapeHtml(token)}" />
        <button type="submit" style="background:#000;color:#fff;border:0;border-radius:999px;padding:14px 28px;font-size:16px;font-weight:700;cursor:pointer;">Unsubscribe</button>
      </form>`
  });
}

export async function POST(request) {
  let token = request.nextUrl.searchParams.get("token") || "";

  if (!token) {
    try {
      const form = await request.formData();
      token = String(form.get("token") || "");
    } catch {
      token = "";
    }
  }

  const email = emailFromToken(token);

  if (!email) {
    return page(request, INVALID, 400);
  }

  const supabase = createSupabaseAdmin();
  const { error } = await supabase
    .from("email_opt_outs")
    .upsert({ email, source: "review_request" }, { onConflict: "email", ignoreDuplicates: true });

  if (error) {
    console.error("Unable to save email opt-out:", error);

    return page(
      request,
      {
        title: "Something went wrong",
        message: "We couldn't save that just now. Please try again in a minute, or reply to any of our emails."
      },
      500
    );
  }

  return page(request, {
    title: "You're unsubscribed",
    message: "You won't get any more review requests from us. Thank you for being a customer."
  });
}
