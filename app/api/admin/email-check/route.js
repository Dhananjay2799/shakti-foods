import { NextResponse } from "next/server";
import { Resend } from "resend";

import { requireApiAdmin } from "@/lib/require-api-admin";
import { createSupabaseAdmin } from "@/lib/supabase-admin";
import { sendTransactionalEmail } from "@/lib/email";
import {
  buildOrderConfirmationEmail,
  formatOrderNumber
} from "@/lib/order-confirmation-email";
import {
  ECOWARE_STOREFRONT,
  SHAKTI_STOREFRONT,
  getStorefrontBrand
} from "@/lib/storefront-config";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/*
 * Admin-only email setup check for the live site.
 *
 * GET  -> sender per store, Resend domain status, tracking migration,
 *         recent confirmation results.
 * POST -> sends a sample order confirmation to the signed-in admin only
 *         (never to an arbitrary address), without creating an order.
 */

function emailDomain(from) {
  const match = String(from || "").match(/@([^>\s]+)>?\s*$/);
  return match ? match[1].toLowerCase() : null;
}

async function loadResendDomains() {
  if (!process.env.RESEND_API_KEY) {
    return { domains: null, error: "RESEND_API_KEY is not set." };
  }

  try {
    const resend = new Resend(process.env.RESEND_API_KEY);
    const { data, error } = await resend.domains.list();

    if (error) {
      // Send-only API keys cannot list domains; sending still works.
      return {
        domains: null,
        error:
          error.message ||
          "Unable to list Resend domains with this API key."
      };
    }

    return {
      domains: (data?.data || []).map((domain) => ({
        name: String(domain.name || "").toLowerCase(),
        status: domain.status
      })),
      error: null
    };
  } catch (error) {
    return {
      domains: null,
      error: error instanceof Error ? error.message : String(error)
    };
  }
}

async function checkTracking(supabase) {
  const { error } = await supabase
    .from("orders")
    .select(
      "id, confirmation_email_status, confirmation_email_sent_at, confirmation_email_attempts, confirmation_email_last_error"
    )
    .limit(1);

  if (error) {
    return {
      applied: false,
      detail:
        "Not installed: run supabase/migrations/20261015120000_order_confirmation_email_tracking.sql in the Supabase SQL editor.",
      error: error.message
    };
  }

  const since = new Date(
    Date.now() - 7 * 24 * 60 * 60 * 1000
  ).toISOString();

  const { data: recent, error: recentError } = await supabase
    .from("orders")
    .select(
      "id, storefront, created_at, confirmation_email_status, confirmation_email_attempts, confirmation_email_last_error"
    )
    .eq("payment_status", "paid")
    .gte("created_at", since)
    .order("created_at", { ascending: false })
    .limit(200);

  if (recentError) {
    return {
      applied: true,
      detail: "Installed.",
      last7Days: null
    };
  }

  const counts = { sent: 0, failed: 0, notTracked: 0 };

  for (const order of recent || []) {
    if (order.confirmation_email_status === "sent") counts.sent += 1;
    else if (order.confirmation_email_status === "failed") counts.failed += 1;
    else counts.notTracked += 1;
  }

  return {
    applied: true,
    detail: "Installed.",
    last7Days: counts,
    recentFailures: (recent || [])
      .filter((order) => order.confirmation_email_status === "failed")
      .slice(0, 5)
      .map((order) => ({
        orderNumber: formatOrderNumber(order.id),
        storefront: order.storefront,
        createdAt: order.created_at,
        attempts: order.confirmation_email_attempts,
        lastError: order.confirmation_email_last_error
      }))
  };
}

export async function GET() {
  const admin = await requireApiAdmin();

  if (!admin.authorized) {
    return NextResponse.json(
      { message: admin.message },
      { status: admin.status }
    );
  }

  const resend = await loadResendDomains();

  const senders = [SHAKTI_STOREFRONT, ECOWARE_STOREFRONT].map(
    (storefront) => {
      const brand = getStorefrontBrand(storefront);
      const domain = emailDomain(brand.emailFrom);
      const resendDomain = resend.domains?.find(
        (entry) => entry.name === domain
      );

      return {
        storefront,
        businessName: brand.businessName,
        from: brand.emailFrom,
        domain,
        domainStatus: resend.domains
          ? resendDomain?.status || "not added in Resend"
          : "unknown",
        replyTo: brand.replyTo || null,
        siteUrl: brand.siteUrl
      };
    }
  );

  let tracking;

  try {
    tracking = await checkTracking(createSupabaseAdmin());
  } catch (error) {
    tracking = {
      applied: false,
      detail: "Unable to check.",
      error: error instanceof Error ? error.message : String(error)
    };
  }

  return NextResponse.json({
    checkedAt: new Date().toISOString(),
    environment: process.env.VERCEL_ENV || process.env.NODE_ENV || null,
    adminEmail: admin.user.email || null,
    resend: {
      apiKeyConfigured: Boolean(process.env.RESEND_API_KEY),
      domains: resend.domains,
      domainsError: resend.error
    },
    senders,
    tracking
  });
}

const SAMPLE_ADDRESS = {
  line1: "123 Sample Street",
  city: "Weston",
  state: "FL",
  postal_code: "33326",
  country: "US"
};

function buildSample(kind) {
  if (kind === "ecoware") {
    return {
      storefront: ECOWARE_STOREFRONT,
      items: [
        { product_name: "3-Compartment Plate (50 pack)", quantity: 2, line_total: 3000 },
        { product_name: "Bagasse Bowl 240 ml (50 pack)", quantity: 1, line_total: 1200 }
      ],
      subtotal: 4200,
      shippingAmount: 0,
      taxAmount: 294,
      totalAmount: 4494,
      subscription: null
    };
  }

  return {
    storefront: SHAKTI_STOREFRONT,
    items: [
      { product_name: "Sona Masoori Rice 10 lb", quantity: 1, line_total: 2000 }
    ],
    subtotal: 2000,
    shippingAmount: 500,
    taxAmount: 0,
    totalAmount: 2500,
    subscription:
      kind === "shakti_subscription"
        ? {
            intervalUnit: "week",
            intervalCount: 2,
            nextOrderAt: new Date(
              Date.now() + 14 * 24 * 60 * 60 * 1000
            ).toISOString(),
            isFirstOrder: true
          }
        : null
  };
}

export async function POST(request) {
  const admin = await requireApiAdmin();

  if (!admin.authorized) {
    return NextResponse.json(
      { message: admin.message },
      { status: admin.status }
    );
  }

  const to = String(admin.user.email || "").trim();

  if (!to) {
    return NextResponse.json(
      { message: "Your admin account has no email address." },
      { status: 400 }
    );
  }

  let body = {};

  try {
    body = await request.json();
  } catch {
    body = {};
  }

  const kind = ["shakti", "shakti_subscription", "ecoware"].includes(
    body?.kind
  )
    ? body.kind
    : "shakti";

  const sample = buildSample(kind);
  const orderId = crypto.randomUUID();

  const email = buildOrderConfirmationEmail({
    orderId,
    customerName: "Test Customer",
    currency: "USD",
    items: sample.items,
    subtotal: sample.subtotal,
    shippingAmount: sample.shippingAmount,
    taxAmount: sample.taxAmount,
    totalAmount: sample.totalAmount,
    shippingAddress: SAMPLE_ADDRESS,
    storefront: sample.storefront,
    subscription: sample.subscription
  });

  const subject = `[Test] ${email.subject}`;

  try {
    const result = await sendTransactionalEmail({
      from: email.from,
      replyTo: email.replyTo,
      to,
      subject,
      html: email.html,
      text: email.text
    });

    return NextResponse.json({
      sent: true,
      kind,
      to,
      from: email.from,
      subject,
      resendId: result?.id || null
    });
  } catch (error) {
    return NextResponse.json(
      {
        sent: false,
        kind,
        to,
        from: email.from,
        subject,
        message:
          error instanceof Error ? error.message : String(error)
      },
      { status: 502 }
    );
  }
}
