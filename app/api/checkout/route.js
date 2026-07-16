import Stripe from "stripe";
import { NextResponse } from "next/server";
import { products } from "@/lib/data";
import { commerce } from "@/lib/commerce";
import { createSupabaseAdmin } from "@/lib/supabase-admin";

export const runtime = "nodejs";

export async function POST(request) {
  let reservationId = null;
  let supabase = null;

  try {
    if (!process.env.STRIPE_SECRET_KEY) {
      return NextResponse.json(
        {
          message:
            "Missing STRIPE_SECRET_KEY. Add it to .env.local or Vercel environment variables."
        },
        { status: 500 }
      );
    }

    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

    const body = await request.json();
    const cartItems = Array.isArray(body.items) ? body.items : [];

    if (!cartItems.length) {
      return NextResponse.json(
        { message: "Cart is empty." },
        { status: 400 }
      );
    }

    const checkoutItems = cartItems.map((cartItem) => {
      const product = products.find(
        (item) => item.id === cartItem.id
      );

      if (!product) {
        throw new Error(
          `Product not found: ${cartItem.id}`
        );
      }

      if (
        product.unitPrice === null ||
        product.unitPrice === undefined ||
        product.unitPrice <= 0
      ) {
        throw new Error(
          `Missing valid price for product: ${product.name}`
        );
      }

      return {
        product,
        quantity: Math.max(
          1,
          Number(cartItem.quantity) || 1
        )
      };
    });

    const subtotal = checkoutItems.reduce(
      (sum, item) =>
        sum +
        item.product.unitPrice * item.quantity,
      0
    );

    supabase = createSupabaseAdmin();

    /*Reserve inventory for 30 minutes before opening Stripe Checkout.*/
    const reservationExpiresAt = new Date(
      Date.now() + 30 * 60 * 1000
    );

    const reservationItems = checkoutItems.map(
      ({ product, quantity }) => ({
        product_id: product.id,
        quantity
      })
    );

    const {
      data: createdReservationId,
      error: reservationError
    } = await supabase.rpc(
      "reserve_inventory_for_checkout",
      {
        p_items: reservationItems,
        p_expires_at:
          reservationExpiresAt.toISOString()
      }
    );

    if (reservationError) {
      throw new Error(
        reservationError.message ||
          "Unable to reserve inventory."
      );
    }

    reservationId = createdReservationId;

    if (!reservationId) {
      throw new Error(
        "Inventory reservation was not created."
      );
    }

    const lineItems = checkoutItems.map(
      ({ product, quantity }) => ({
        quantity,
        price_data: {
          currency: "usd",
          unit_amount: Math.round(
            product.unitPrice * 100
          ),
          product_data: {
            name: product.name,
            description:
              product.subtitle || product.name,
            metadata: {
              product_id: product.id
            }
          }
        }
      })
    );

    const baseUrl = (
      process.env.NEXT_PUBLIC_BASE_URL ||
      process.env.NEXT_PUBLIC_SITE_URL ||
      "http://localhost:3000"
    ).replace(/\/$/, "");

    const shippingAmount =
      subtotal >= commerce.freeShippingThreshold
        ? 0
        : commerce.standardShipping;

    let session;

    try {
      session =
        await stripe.checkout.sessions.create({
          mode: "payment",

          line_items: lineItems,

          /*Stripe expects expires_at as a Unix timestamp.*/
          expires_at: Math.floor(
            reservationExpiresAt.getTime() / 1000
          ),

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
              process.env
                .STRIPE_AUTOMATIC_TAX === "true"
          },

          shipping_options: [
            {
              shipping_rate_data: {
                type: "fixed_amount",
                fixed_amount: {
                  amount: Math.round(
                    shippingAmount * 100
                  ),
                  currency: "usd"
                },
                display_name:
                  shippingAmount === 0
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
                  currency: "usd"
                },
                display_name:
                  "Local Pickup - Weston, Florida"
              }
            }
          ],

          metadata: {
            business: "Shakti Foods",
            orderType: "online-order",
            reservation_id: reservationId
          },

          success_url:
            `${baseUrl}/checkout/success` +
            `?session_id={CHECKOUT_SESSION_ID}`,

          cancel_url:
            `${baseUrl}/checkout/cancel?reservation_id=${encodeURIComponent(
              reservationId
            )}`
        });
    } catch (stripeError) {
      /*If Stripe Session creation fails, release the inventory hold.*/
      await supabase.rpc(
        "release_inventory_reservation",
        {
          p_reservation_id: reservationId
        }
      );

      reservationId = null;

      throw stripeError;
    }

    /*Link the Stripe Checkout Session to the reservation.*/
    const {
      error: reservationUpdateError
    } = await supabase
      .from("checkout_reservations")
      .update({
        stripe_session_id: session.id,
        updated_at: new Date().toISOString()
      })
      .eq("id", reservationId);

    if (reservationUpdateError) {
      await supabase.rpc(
        "release_inventory_reservation",
        {
          p_reservation_id: reservationId
        }
      );

      throw new Error(
        "Checkout was created, but the inventory reservation could not be linked."
      );
    }

    return NextResponse.json({
      url: session.url
    });
  } catch (error) {
    /*Final safety cleanup for errors after reservation creation.*/
    if (reservationId && supabase) {
      try {
        await supabase.rpc(
          "release_inventory_reservation",
          {
            p_reservation_id: reservationId
          }
        );
      } catch (releaseError) {
        console.error(
          "Unable to release inventory reservation:",
          releaseError
        );
      }
    }

    console.error(
      "Checkout creation error:",
      error
    );

    return NextResponse.json(
      {
        message:
          error.message ||
          "Unable to create checkout session."
      },
      { status: 500 }
    );
  }
}