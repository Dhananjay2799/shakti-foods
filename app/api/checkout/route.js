import Stripe from "stripe";
import { NextResponse } from "next/server";
import { createSupabaseAdmin } from "@/lib/supabase-admin";
import {
  prepareCheckout,
  releaseCheckoutReservation,
  deleteIncompleteOrder
} from "@/lib/checkout/prepare-checkout";

export const runtime = "nodejs";

const STRIPE_SESSION_DURATION_MINUTES = 30;
const CHECKOUT_CURRENCY = "USD";

function getBaseUrl() {
  return (
    process.env.NEXT_PUBLIC_BASE_URL ||
    process.env.NEXT_PUBLIC_SITE_URL ||
    "http://localhost:3000"
  ).replace(/\/$/, "");
}

async function expireCheckoutSession({
  stripe,
  sessionId
}) {
  if (!stripe || !sessionId) {
    return false;
  }

  try {
    await stripe.checkout.sessions.expire(
      sessionId
    );

    return true;
  } catch (error) {
    console.error(
      "Unable to expire Stripe Checkout Session:",
      {
        sessionId,
        error
      }
    );

    return false;
  }
}

export async function POST(request) {
  let reservationId = null;
  let createdOrderId = null;
  let createdRecoveryId = null;
  let stripeSessionId = null;
  let supabase = null;
  let stripe = null;

  try {
    const stripeSecretKey =
      process.env.STRIPE_SECRET_KEY;

    if (!stripeSecretKey) {
      console.error(
        "STRIPE_SECRET_KEY is not configured."
      );

      return NextResponse.json(
        {
          message:
            "Checkout is temporarily unavailable."
        },
        { status: 500 }
      );
    }

    stripe = new Stripe(stripeSecretKey);

    let body;

    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        {
          message: "Invalid checkout request."
        },
        { status: 400 }
      );
    }

    const storefront =
      String(
        body?.storefront ||
        "shakti_foods"
      ).trim();

    const allowedStorefronts =
      new Set([
        "shakti_foods",
        "ecoware"
      ]);

    if (
      !allowedStorefronts.has(
        storefront
      )
    ) {
      return NextResponse.json(
        {
          message:
            "Invalid storefront."
        },
        {
          status: 400
        }
      );
    }

    const rawCartItems = Array.isArray(body?.items)
      ? body.items
      : [];

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

    const marketingEmailConsent =
      rawCustomer.marketingEmailConsent ===
      true;

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
            "A valid customer email address is required."
        },
        { status: 400 }
      );
    }

    if (rawCartItems.length === 0) {
      return NextResponse.json(
        { message: "Cart is empty." },
        { status: 400 }
      );
    }

    const checkout =
      await prepareCheckout(
        rawCartItems,
        storefront
      );

    reservationId =
      checkout.reservationId;

    const subtotalCents =
      checkout.subtotalCents;

    const shippingAmountCents =
      checkout.shippingAmountCents;

    const taxAmountCents =
      checkout.taxAmountCents;

    const totalAmountCents =
      checkout.totalAmountCents;  

    const lineItems =
      checkout.stripeLineItems;

    supabase = createSupabaseAdmin();

    const baseUrl = getBaseUrl();

    const stripeSessionExpiresAt =
      Math.floor(
        Date.now() / 1000 +
          STRIPE_SESSION_DURATION_MINUTES * 60
      );

    const businessName =
      storefront === "ecoware"
        ? "Simpli Ecoware"
        : "Shakti Foods";

    let session;

    try {
      session =
        await stripe.checkout.sessions.create(
          {
            mode: "payment",

            customer_email: customerEmail,

            line_items: lineItems,
            expires_at: stripeSessionExpiresAt,

            allow_promotion_codes: true,

            phone_number_collection: {
              enabled: true
            },

            billing_address_collection: "auto",

            shipping_address_collection: {
              allowed_countries: ["US"]
            },

            automatic_tax: {
              enabled:
                process.env.STRIPE_AUTOMATIC_TAX ===
                "true"
            },

            shipping_options: [
              {
                shipping_rate_data: {
                  type: "fixed_amount",
                  fixed_amount: {
                    amount: shippingAmountCents,
                    currency:
                      CHECKOUT_CURRENCY.toLowerCase()
                  },
                  display_name:
                    shippingAmountCents === 0
                      ? "Free Standard Shipping"
                      : "Standard Shipping",
                  delivery_estimate: {
                    minimum: {
                      unit: "business_day",
                      value: 3
                    },
                    maximum: {
                      unit: "business_day",
                      value: 7
                    }
                  }
                }
              },
              {
                shipping_rate_data: {
                  type: "fixed_amount",
                  fixed_amount: {
                    amount: 0,
                    currency:
                      CHECKOUT_CURRENCY.toLowerCase()
                  },
                  display_name:
                    "Local Pickup - Weston, Florida"
                }
              }
            ],

            metadata: {
              business:
                businessName,

              storefront,

              order_type:
                "online-order",

              reservation_id:
                String(reservationId)
            },

            success_url:
              `${baseUrl}/checkout/success` +
              "?session_id={CHECKOUT_SESSION_ID}",

            cancel_url:
              `${baseUrl}/checkout/cancel` +
              `?reservation_id=${encodeURIComponent(
                reservationId
              )}`
          },
          {
            idempotencyKey:
              `checkout-reservation-${reservationId}`
          }
        );
    }  
    catch (stripeError) {
      await releaseCheckoutReservation(
        reservationId
      );

      reservationId = null;

      throw stripeError;
    }

    stripeSessionId = session.id;

    if (!session.url) {
      await expireCheckoutSession({
        stripe,
        sessionId: stripeSessionId
      });

      await releaseCheckoutReservation(
        reservationId
      );

      reservationId = null;
      stripeSessionId = null;

      throw new Error(
        "Stripe did not return a checkout URL."
      );
    }

    const {
      error: reservationUpdateError
    } = await supabase
      .from("checkout_reservations")
      .update({
        stripe_session_id: session.id,
        updated_at: new Date().toISOString()
      })
      .eq("id", reservationId)
      .eq("status", "pending");

    if (reservationUpdateError) {
      console.error(
        "Unable to link reservation to Stripe session:",
        reservationUpdateError
      );

      await expireCheckoutSession({
        stripe,
        sessionId: stripeSessionId
      });

      await releaseCheckoutReservation(
        reservationId
      );

      reservationId = null;
      stripeSessionId = null;

      throw new Error(
        "Checkout was created, but its inventory reservation could not be linked."
      );
    }

    const {
      data: order,
      error: orderError
    } = await supabase
      .from("orders")
      .insert({
        storefront,

        payment_provider:
          "stripe",

        stripe_session_id:
          session.id,

        reservation_id:
          reservationId,

        payment_status:
          "pending",

        fulfillment_status:
          "new",

        subtotal:
          subtotalCents,

        shipping_amount:
          shippingAmountCents,

        tax_amount:
          taxAmountCents,

        total_amount:
          totalAmountCents,

        currency:
          CHECKOUT_CURRENCY
      })
      .select("id")
      .single();

    if (orderError || !order) {
      console.error(
        "Unable to create checkout order:",
        orderError
      );

      await expireCheckoutSession({
        stripe,
        sessionId: stripeSessionId
      });

      await releaseCheckoutReservation(
        reservationId
      );

      reservationId = null;
      stripeSessionId = null;

      throw new Error(
        "Unable to record order in database."
      );
    }

    createdOrderId = order.id;

    const recoverySnapshot =
      checkout.orderItems.map((item) => ({
        product_id:
          item.product_id,

        product_name:
          item.product_name,

        quantity:
          item.quantity,

        unit_price:
          item.unit_price,

        line_total:
          item.line_total
      }));

    const {
      data: recovery,
      error: recoveryError
    } = await supabase
      .from("cart_recovery_sessions")
      .insert({
        reservation_id: reservationId,
        order_id: order.id,
        payment_provider: "stripe",

        email:
          customerEmail,

        phone:
          customerPhone,

        marketing_email_consent:
          marketingEmailConsent,

        sms_consent:
          false,

        cart_snapshot: recoverySnapshot,

        subtotal_cents: subtotalCents,
        shipping_cents: shippingAmountCents,
        tax_cents: taxAmountCents,
        total_cents: totalAmountCents,

        currency: CHECKOUT_CURRENCY,
        status: "active"
      })
      .select("id")
      .single();

    if (recoveryError) {
      console.error(
        "Unable to create Stripe cart recovery session:",
        recoveryError
      );
    } else {
      createdRecoveryId = recovery.id;
    }

    const orderItemsToInsert =
      checkout.orderItems.map((item) => ({
        order_id: order.id,
        ...item
      }));

    const {
      error: orderItemsError
    } = await supabase
      .from("order_items")
      .insert(orderItemsToInsert);

    if (orderItemsError) {
      console.error(
        "Unable to create order items:",
        orderItemsError
      );

      if (createdRecoveryId) {
        const { error: recoveryDeleteError } =
          await supabase
            .from("cart_recovery_sessions")
            .delete()
            .eq("id", createdRecoveryId);

        if (recoveryDeleteError) {
          console.error(
            "Unable to clean up cart recovery session:",
            recoveryDeleteError
          );
        }

        createdRecoveryId = null;
      }

      await expireCheckoutSession({
        stripe,
        sessionId: stripeSessionId
      });

      await deleteIncompleteOrder(
        createdOrderId
      );

      createdOrderId = null;

      await releaseCheckoutReservation(
        reservationId
      );

      reservationId = null;
      stripeSessionId = null;

      throw new Error(
        "Unable to save order items."
      );
    }

    return NextResponse.json({
      url: session.url,
      sessionId: session.id,
      reservationId
    });
  } catch (error) {
    if (stripeSessionId && stripe) {
      await expireCheckoutSession({
        stripe,
        sessionId: stripeSessionId
      });
    }

    if (createdRecoveryId && supabase) {
      const { error: recoveryDeleteError } =
        await supabase
          .from("cart_recovery_sessions")
          .delete()
          .eq("id", createdRecoveryId);

      if (recoveryDeleteError) {
        console.error(
          "Unable to clean up cart recovery session:",
          recoveryDeleteError
        );
      }

      createdRecoveryId = null;
    }

    if (createdOrderId && supabase) {
      await deleteIncompleteOrder(
        createdOrderId
      );
    }

    if (reservationId && supabase) {
      await releaseCheckoutReservation(
        reservationId
      );
    }

    console.error(
      "Checkout creation error:",
      error
    );

    const message =
      error instanceof Error
        ? error.message
        : "Unable to create checkout session.";

    return NextResponse.json(
      { message },
      { status: 400 }
    );
  }
}