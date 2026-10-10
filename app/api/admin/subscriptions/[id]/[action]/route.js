
import Stripe from "stripe";
import { NextResponse } from "next/server";
import { requireApiAdmin } from "@/lib/require-api-admin";

import { createSupabaseAdmin } from "@/lib/supabase-admin";

import {
  cancelPayPalSubscription,
  suspendPayPalSubscription,
  activatePayPalSubscription
} from "@/lib/paypal";

export const runtime = "nodejs";

function redirectToSubscription(request, subscriptionId, params = {}) {
  const url = new URL(
    `/admin/subscriptions/${subscriptionId}`,
    request.url
  );

  for (const [key, value] of Object.entries(params)) {
    if (value) {
      url.searchParams.set(key, value);
    }
  }

  return NextResponse.redirect(url, 303);
}

async function updateSubscriptionStatus(
  supabase,
  subscriptionId,
  updates
) {
  const { data, error } = await supabase
    .from("subscriptions")
    .update({
      ...updates,
      updated_at: new Date().toISOString()
    })
    .eq("id", subscriptionId)
    .select("id")
    .single();

  if (error || !data) {
    throw new Error(
      `Payment provider action may have succeeded, but Supabase update failed: ${
        error?.message || "Subscription was not updated."
      }`
    );
  }

  return data;
}

export async function POST(request, { params }) {
  const admin = await requireApiAdmin();

  if (!admin.authorized) {
    return NextResponse.json(
      { message: admin.message },
      { status: admin.status }
    );
  }

  const resolvedParams = await Promise.resolve(params);

  const subscriptionId = String(
    resolvedParams?.id || ""
  ).trim();

  const action = String(
    resolvedParams?.action || ""
  ).trim().toLowerCase();

  if (!subscriptionId) {
    return NextResponse.json(
      { message: "Subscription ID is required." },
      { status: 400 }
    );
  }

  if (!["cancel", "suspend", "reactivate"].includes(action)) {
    return NextResponse.json(
      { message: "Unsupported subscription action." },
      { status: 400 }
    );
  }

  const supabase = createSupabaseAdmin();

  const { data: subscription, error } = await supabase
    .from("subscriptions")
    .select(`
      id,
      payment_provider,
      status,
      stripe_subscription_id,
      paypal_subscription_id
    `)
    .eq("id", subscriptionId)
    .maybeSingle();

  if (error || !subscription) {
    return redirectToSubscription(request, subscriptionId, {
      error: "Subscription could not be found."
    });
  }

  const provider = String(
    subscription.payment_provider || ""
  ).trim().toLowerCase();

  try {
    // PayPal subscription management
    if (provider === "paypal") {
      const paypalSubscriptionId = String(
        subscription.paypal_subscription_id || ""
      ).trim();

      if (!paypalSubscriptionId) {
        throw new Error("PayPal subscription ID is missing.");
      }

      if (action === "cancel") {
        await cancelPayPalSubscription(paypalSubscriptionId);

        await updateSubscriptionStatus(
          supabase,
          subscriptionId,
          {
            status: "canceled",
            canceled_at: new Date().toISOString(),
            next_billing_at: null
          }
        );

        return redirectToSubscription(request, subscriptionId, {
          success: "PayPal subscription canceled successfully."
        });
      }

      if (action === "suspend") {
        await suspendPayPalSubscription(paypalSubscriptionId);

        await updateSubscriptionStatus(
          supabase,
          subscriptionId,
          {
            status: "paused"
          }
        );

        return redirectToSubscription(request, subscriptionId, {
          success: "PayPal subscription suspended successfully."
        });
      }

      if (action === "reactivate") {
        await activatePayPalSubscription(paypalSubscriptionId);

        await updateSubscriptionStatus(
          supabase,
          subscriptionId,
          {
            status: "active"
          }
        );

        return redirectToSubscription(request, subscriptionId, {
          success: "PayPal subscription reactivated successfully."
        });
      }
    }

    // Stripe subscription management
    if (provider === "stripe") {
      const stripeSecretKey = process.env.STRIPE_SECRET_KEY;

      if (!stripeSecretKey) {
        throw new Error("STRIPE_SECRET_KEY is not configured.");
      }

      const stripeSubscriptionId = String(
        subscription.stripe_subscription_id || ""
      ).trim();

      if (!stripeSubscriptionId) {
        throw new Error("Stripe subscription ID is missing.");
      }

      const stripe = new Stripe(stripeSecretKey);

      if (action === "cancel") {
        await stripe.subscriptions.cancel(stripeSubscriptionId);

        await updateSubscriptionStatus(
          supabase,
          subscriptionId,
          {
            status: "canceled",
            canceled_at: new Date().toISOString(),
            next_billing_at: null
          }
        );

        return redirectToSubscription(request, subscriptionId, {
          success: "Stripe subscription canceled successfully."
        });
      }

      throw new Error(
        "This action is not supported for Stripe subscriptions."
      );
    }

    throw new Error(
      "Unsupported subscription payment provider."
    );

  } catch (actionError) {
    console.error("Admin subscription action failed:", {
      subscriptionId,
      provider,
      action,
      actionError
    });

    return redirectToSubscription(request, subscriptionId, {
      error: actionError instanceof Error
        ? actionError.message
        : "Unable to update subscription."
    });
  }
}
