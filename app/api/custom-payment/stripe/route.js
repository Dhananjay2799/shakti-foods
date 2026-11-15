import Stripe from "stripe";
import { NextResponse } from "next/server";
import { createSupabaseAdmin } from "@/lib/supabase-admin";
import { stripeKeyForStorefront } from "@/lib/stripe-storefront";
import { getStorefrontPageUrl } from "@/lib/storefront-config";
import {
  CUSTOM_PAYMENT_ORDER_TYPE,
  CUSTOM_PAYMENT_TAX_PERCENT
} from "@/lib/custom-payment";
import {
  CustomPaymentInputError,
  createPendingCustomOrder,
  deleteUnpaidCustomOrder,
  readCustomPaymentRequest
} from "@/lib/custom-payment-server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Stripe's minimum Checkout Session lifetime.
const SESSION_MINUTES = 30;

/*
 * Starts a Stripe Checkout payment for a custom amount (no cart items).
 * Shipping and tax are recalculated here from the amount and the two
 * checkboxes; the browser never sends a total.
 */
export async function POST(request) {
  let supabase = null;
  let orderId = null;

  try {
    let body;

    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ message: "Invalid payment request." }, { status: 400 });
    }

    const payment = readCustomPaymentRequest(body);
    const stripe = new Stripe(stripeKeyForStorefront(payment.storefront));
    const businessName = payment.storefront === "ecoware" ? "Simpli Ecoware" : "Shakti Foods";

    supabase = createSupabaseAdmin();
    orderId = await createPendingCustomOrder({ supabase, provider: "stripe", payment });

    const lineItems = [
      {
        quantity: 1,
        price_data: {
          currency: "usd",
          unit_amount: payment.amountCents,
          product_data: {
            name: `Payment to ${businessName}`,
            ...(payment.note ? { description: payment.note } : {})
          }
        }
      }
    ];

    if (payment.taxCents > 0) {
      lineItems.push({
        quantity: 1,
        price_data: {
          currency: "usd",
          unit_amount: payment.taxCents,
          product_data: { name: `Sales tax (${CUSTOM_PAYMENT_TAX_PERCENT}%)` }
        }
      });
    }

    const session = await stripe.checkout.sessions.create(
      {
        mode: "payment",
        // Without an email, Stripe asks for one on its page.
        ...(payment.customer.email ? { customer_email: payment.customer.email } : {}),
        line_items: lineItems,
        expires_at: Math.floor(Date.now() / 1000) + SESSION_MINUTES * 60,
        phone_number_collection: { enabled: true },
        billing_address_collection: "auto",
        // Tax is added above only when the customer kept it on.
        automatic_tax: { enabled: false },
        ...(payment.includeShipping
          ? {
              shipping_address_collection: { allowed_countries: ["US"] },
              shipping_options: [
                {
                  shipping_rate_data: {
                    type: "fixed_amount",
                    fixed_amount: { amount: payment.shippingCents, currency: "usd" },
                    display_name:
                      payment.shippingCents === 0 ? "Free Standard Shipping" : "Standard Shipping"
                  }
                }
              ]
            }
          : {}),
        payment_intent_data: {
          description: payment.note
            ? `${businessName} custom payment: ${payment.note}`
            : `${businessName} custom payment`
        },
        metadata: {
          business: businessName,
          storefront: payment.storefront,
          order_type: CUSTOM_PAYMENT_ORDER_TYPE,
          order_id: orderId,
          customer_name: payment.customer.name,
          note: payment.note
        },
        success_url:
          getStorefrontPageUrl(payment.storefront, "/checkout/success") +
          "?session_id={CHECKOUT_SESSION_ID}",
        cancel_url:
          getStorefrontPageUrl(payment.storefront, "/checkout/custom-amount") + "?cancelled=1"
      },
      { idempotencyKey: `custom-payment-${orderId}` }
    );

    if (!session?.url) {
      throw new Error("Stripe did not return a payment page.");
    }

    const { error: linkError } = await supabase
      .from("orders")
      .update({ stripe_session_id: session.id, updated_at: new Date().toISOString() })
      .eq("id", orderId);

    if (linkError) {
      console.error("Unable to link custom payment to Stripe:", linkError);

      try {
        await stripe.checkout.sessions.expire(session.id);
      } catch (expireError) {
        console.error("Unable to expire unlinked Stripe session:", expireError);
      }

      throw new Error("Unable to start the payment. Please try again.");
    }

    return NextResponse.json({ url: session.url, sessionId: session.id, orderId });
  } catch (error) {
    if (orderId && supabase) {
      await deleteUnpaidCustomOrder(supabase, orderId);
    }

    if (error instanceof CustomPaymentInputError) {
      return NextResponse.json({ message: error.message }, { status: 400 });
    }

    console.error("Custom payment (Stripe) error:", error);

    return NextResponse.json(
      { message: "Unable to start the card payment. Please try again." },
      { status: 500 }
    );
  }
}
