import Stripe from "stripe";
import { NextResponse } from "next/server";

import {
  createSupabaseAdmin
} from "@/lib/supabase-admin";

import {
  prepareSubscription
} from "@/lib/subscriptions/prepare-subscription";

export const runtime = "nodejs";

function getBaseUrl() {
  return (
    process.env.NEXT_PUBLIC_BASE_URL ||
    process.env.NEXT_PUBLIC_SITE_URL ||
    "http://localhost:3000"
  ).replace(/\/$/, "");
}

export async function POST(request) {
  try {
    const stripeSecretKey =
      process.env.STRIPE_SECRET_KEY;

    if (!stripeSecretKey) {
      return NextResponse.json(
        {
          message:
            "Subscription checkout is temporarily unavailable."
        },
        { status: 500 }
      );
    }

    const stripe =
      new Stripe(stripeSecretKey);

    let body;

    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        {
          message:
            "Invalid subscription request."
        },
        { status: 400 }
      );
    }

    const productId =
      String(
        body?.productId || ""
      ).trim();

    const quantity =
      body?.quantity;

    const frequencyId =
      String(
        body?.frequencyId || ""
      ).trim();

    const rawCustomer =
      body?.customer &&
      typeof body.customer === "object"
        ? body.customer
        : {};

    const customerName =
      String(
        rawCustomer.name || ""
      ).trim();

    const customerEmail =
      String(
        rawCustomer.email || ""
      )
        .trim()
        .toLowerCase();

    const customerPhone =
      String(
        rawCustomer.phone || ""
      ).trim() || null;

    if (!customerName) {
      return NextResponse.json(
        {
          message:
            "Customer name is required."
        },
        { status: 400 }
      );
    }

    if (
      !customerEmail ||
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
        customerEmail
      )
    ) {
      return NextResponse.json(
        {
          message:
            "A valid customer email is required."
        },
        { status: 400 }
      );
    }

    const prepared =
      await prepareSubscription({
        productId,
        quantity,
        frequencyId
      });

    const supabase =
      createSupabaseAdmin();

    const {
      data: subscription,
      error: subscriptionError
    } = await supabase
      .from("subscriptions")
      .insert({
        customer_email:
          customerEmail,

        customer_name:
          customerName,

        customer_phone:
          customerPhone,

        payment_provider:
          "stripe",

        status:
          "pending",

        currency:
          prepared.currency,

        subtotal_cents:
          prepared.subtotalCents,

        discount_cents:
          prepared.discountCents,

        shipping_cents:
          prepared.shippingCents,

        tax_cents:
          prepared.taxCents,

        total_cents:
          prepared.totalCents,

        interval_unit:
          prepared.frequency.intervalUnit,

        interval_count:
          prepared.frequency.intervalCount
      })
      .select("id")
      .single();

    if (
      subscriptionError ||
      !subscription
    ) {
      throw new Error(
        subscriptionError?.message ||
          "Unable to create subscription record."
      );
    }

    const {
      error: itemError
    } = await supabase
      .from("subscription_items")
      .insert({
        subscription_id:
          subscription.id,

        product_id:
          prepared.product.productId,

        product_name:
          prepared.product.name,

        quantity:
          prepared.quantity,

        regular_unit_price_cents:
          prepared.regularUnitPriceCents,

        subscription_unit_price_cents:
          prepared.subscriptionUnitPriceCents,

        line_total_cents:
          prepared.subtotalCents,

        discount_percent:
          prepared.discountPercent
      });

    if (itemError) {
      await supabase
        .from("subscriptions")
        .delete()
        .eq(
          "id",
          subscription.id
        );

      throw new Error(
        itemError.message ||
          "Unable to save subscription item."
      );
    }

    const baseUrl =
      getBaseUrl();

    let session;

    try {
      session =
        await stripe.checkout.sessions.create(
          {
            mode:
              "subscription",

            customer_email:
              customerEmail,

            line_items: [
              {
                quantity:
                  prepared.quantity,

                price_data: {
                  currency:
                    prepared.currency.toLowerCase(),

                  unit_amount:
                    prepared.subscriptionUnitPriceCents,

                  recurring: {
                    interval:
                      prepared.frequency.intervalUnit,

                    interval_count:
                      prepared.frequency.intervalCount
                  },

                  product_data: {
                    name:
                      prepared.product.name,

                    description:
                      prepared.product.description,

                    metadata: {
                      product_id:
                        prepared.product.productId,

                      internal_subscription_id:
                        subscription.id
                    }
                  }
                }
              }
            ],

            metadata: {
              internal_subscription_id:
                subscription.id,

              product_id:
                prepared.product.productId,

              frequency_id:
                prepared.frequency.id,

              order_type:
                "subscription"
            },

            subscription_data: {
              metadata: {
                internal_subscription_id:
                  subscription.id,

                product_id:
                  prepared.product.productId
              }
            },

            phone_number_collection: {
              enabled: true
            },

            billing_address_collection:
              "auto",

            shipping_address_collection: {
              allowed_countries: [
                "US"
              ]
            },

            success_url:
              `${baseUrl}/subscriptions/success` +
              "?session_id={CHECKOUT_SESSION_ID}",

            cancel_url:
              `${baseUrl}/products/${encodeURIComponent(
                prepared.product.productId
              )}?subscriptionCanceled=1`
          },
          {
            idempotencyKey:
              `subscription-checkout-${subscription.id}`
          }
        );
    } catch (stripeError) {
      await supabase
        .from("subscription_items")
        .delete()
        .eq(
          "subscription_id",
          subscription.id
        );

      await supabase
        .from("subscriptions")
        .delete()
        .eq(
          "id",
          subscription.id
        );

      throw stripeError;
    }

    if (!session?.url) {
      throw new Error(
        "Stripe did not return a subscription checkout URL."
      );
    }

    return NextResponse.json({
      success: true,
      url:
        session.url,

      sessionId:
        session.id,

      subscriptionId:
        subscription.id
    });
  } catch (error) {
    console.error(
      "Stripe subscription checkout error:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        message:
          error instanceof Error
            ? error.message
            : "Unable to start subscription checkout."
      },
      { status: 400 }
    );
  }
}