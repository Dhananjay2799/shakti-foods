import Stripe from "stripe";
import { NextResponse } from "next/server";
import { commerce } from "@/lib/commerce";
import { createSupabaseAdmin } from "@/lib/supabase-admin";

export const runtime = "nodejs";

const MAX_ITEM_QUANTITY = 100;
const RESERVATION_DURATION_MINUTES = 10;
const STRIPE_SESSION_DURATION_MINUTES = 30;
const CHECKOUT_CURRENCY = "USD";

function normalizeCartItems(items) {
  const quantitiesByProductId = new Map();

  for (const item of items) {
    const productId = String(
      item?.id || item?.productId || ""
    ).trim();

    if (!productId) {
      throw new Error(
        "A cart item is missing its product ID."
      );
    }

    const rawQuantity = String(
      item?.quantity ?? 1
    ).trim();

    if (!/^\d+$/.test(rawQuantity)) {
      throw new Error(
        `Invalid quantity for product ${productId}.`
      );
    }

    const quantity = Number(rawQuantity);

    if (
      !Number.isSafeInteger(quantity) ||
      quantity < 1 ||
      quantity > MAX_ITEM_QUANTITY
    ) {
      throw new Error(
        `Invalid quantity for product ${productId}.`
      );
    }

    const currentQuantity =
      quantitiesByProductId.get(productId) || 0;

    const combinedQuantity =
      currentQuantity + quantity;

    if (combinedQuantity > MAX_ITEM_QUANTITY) {
      throw new Error(
        `Maximum quantity exceeded for product ${productId}.`
      );
    }

    quantitiesByProductId.set(
      productId,
      combinedQuantity
    );
  }

  return Array.from(
    quantitiesByProductId,
    ([productId, quantity]) => ({
      productId,
      quantity
    })
  );
}

function getBaseUrl() {
  return (
    process.env.NEXT_PUBLIC_BASE_URL ||
    process.env.NEXT_PUBLIC_SITE_URL ||
    "http://localhost:3000"
  ).replace(/\/$/, "");
}

async function releaseReservation({
  supabase,
  reservationId
}) {
  if (!supabase || !reservationId) {
    return false;
  }

  try {
    const { error } = await supabase.rpc(
      "release_inventory_reservation",
      {
        p_reservation_id: reservationId
      }
    );

    if (error) {
      console.error(
        "Unable to release inventory reservation:",
        {
          reservationId,
          error
        }
      );

      return false;
    }

    return true;
  } catch (error) {
    console.error(
      "Unexpected reservation release error:",
      {
        reservationId,
        error
      }
    );

    return false;
  }
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

async function deleteIncompleteOrder({
  supabase,
  orderId
}) {
  if (!supabase || !orderId) {
    return false;
  }

  try {
    const { error } = await supabase
      .from("orders")
      .delete()
      .eq("id", orderId);

    if (error) {
      console.error(
        "Unable to delete incomplete order:",
        {
          orderId,
          error
        }
      );

      return false;
    }

    return true;
  } catch (error) {
    console.error(
      "Unexpected incomplete-order cleanup error:",
      {
        orderId,
        error
      }
    );

    return false;
  }
}
export async function POST(request) {
  let reservationId = null;
  let createdOrderId = null;
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

    const rawCartItems = Array.isArray(body?.items)
      ? body.items
      : [];

    if (rawCartItems.length === 0) {
      return NextResponse.json(
        { message: "Cart is empty." },
        { status: 400 }
      );
    }

    const cartItems =
      normalizeCartItems(rawCartItems);

    const productIds = cartItems.map(
      (item) => item.productId
    );

    supabase = createSupabaseAdmin();

    const [productsResult, inventoryResult] =
      await Promise.all([
        supabase
          .from("products")
          .select(`
            product_id,
            title,
            short_description,
            price_cents,
            currency,
            status,
            is_active,
            requires_shipping,
            deleted_at
          `)
          .in("product_id", productIds)
          .is("deleted_at", null),

        supabase
          .from("inventory")
          .select(`
            product_id,
            stock_quantity,
            reserved_quantity,
            is_active
          `)
          .in("product_id", productIds)
      ]);

    if (productsResult.error) {
      console.error(
        "Unable to load checkout products:",
        productsResult.error
      );

      throw new Error(
        "Unable to load checkout products."
      );
    }

    if (inventoryResult.error) {
      console.error(
        "Unable to load product inventory:",
        inventoryResult.error
      );

      throw new Error(
        "Unable to load product inventory."
      );
    }

    const productsById = new Map(
      (productsResult.data || []).map(
        (product) => [
          product.product_id,
          product
        ]
      )
    );

    const inventoryById = new Map(
      (inventoryResult.data || []).map(
        (inventory) => [
          inventory.product_id,
          inventory
        ]
      )
    );

    const checkoutItems = cartItems.map(
      ({ productId, quantity }) => {
        const product =
          productsById.get(productId);

        if (!product) {
          throw new Error(
            `Product is no longer available: ${productId}`
          );
        }

        if (
          product.status !== "active" ||
          product.is_active !== true
        ) {
          throw new Error(
            `${product.title} is not currently available.`
          );
        }

        const priceCents = Number(
          product.price_cents
        );

        if (
          !Number.isSafeInteger(priceCents) ||
          priceCents <= 0
        ) {
          throw new Error(
            `${product.title} does not have a valid checkout price.`
          );
        }

        const productCurrency = String(
          product.currency || CHECKOUT_CURRENCY
        ).toUpperCase();

        if (
          productCurrency !== CHECKOUT_CURRENCY
        ) {
          throw new Error(
            `${product.title} cannot be purchased in this checkout currency.`
          );
        }

        const inventory =
          inventoryById.get(productId);

        if (
          !inventory ||
          inventory.is_active !== true
        ) {
          throw new Error(
            `${product.title} is not currently available for purchase.`
          );
        }

        const stockQuantity = Number(
          inventory.stock_quantity || 0
        );

        const reservedQuantity = Number(
          inventory.reserved_quantity || 0
        );

        if (
          !Number.isSafeInteger(stockQuantity) ||
          !Number.isSafeInteger(reservedQuantity)
        ) {
          throw new Error(
            `Inventory information is invalid for ${product.title}.`
          );
        }

        const availableQuantity =
          stockQuantity - reservedQuantity;

        if (availableQuantity < quantity) {
          throw new Error(
            availableQuantity > 0
              ? `Only ${availableQuantity} unit(s) of ${product.title} are currently available.`
              : `${product.title} is out of stock.`
          );
        }

        return {
          product,
          quantity,
          priceCents
        };
      }
    );

    const subtotalCents =
      checkoutItems.reduce(
        (total, item) =>
          total +
          item.priceCents * item.quantity,
        0
      );

    if (
      !Number.isSafeInteger(subtotalCents) ||
      subtotalCents <= 0
    ) {
      throw new Error(
        "The checkout total is invalid."
      );
    }

    const reservationItems =
      checkoutItems.map(
        ({ product, quantity }) => ({
          product_id: product.product_id,
          quantity
        })
      );

    const reservationExpiresAt = new Date(
      Date.now() +
        RESERVATION_DURATION_MINUTES *
          60 *
          1000
    );

    const stripeSessionExpiresAt = Math.floor(
      Date.now() / 1000 +
        STRIPE_SESSION_DURATION_MINUTES * 60
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
      console.error(
        "Unable to reserve checkout inventory:",
        reservationError
      );

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
      ({ product, quantity, priceCents }) => ({
        quantity,
        price_data: {
          currency:
            CHECKOUT_CURRENCY.toLowerCase(),
          unit_amount: priceCents,
          product_data: {
            name: product.title,
            description:
              product.short_description ||
              product.title,
            metadata: {
              product_id: product.product_id
            }
          }
        }
      })
    );

    const baseUrl = getBaseUrl();

    const freeShippingThresholdCents =
      Math.round(
        Number(
          commerce.freeShippingThreshold
        ) * 100
      );

    const standardShippingCents =
      Math.round(
        Number(commerce.standardShipping) *
          100
      );

    if (
      !Number.isSafeInteger(
        freeShippingThresholdCents
      ) ||
      freeShippingThresholdCents < 0 ||
      !Number.isSafeInteger(
        standardShippingCents
      ) ||
      standardShippingCents < 0
    ) {
      throw new Error(
        "Shipping configuration is invalid."
      );
    }

    const shippingAmountCents =
      subtotalCents >=
      freeShippingThresholdCents
        ? 0
        : standardShippingCents;

    let session;

    try {
      session =
        await stripe.checkout.sessions.create(
          {
            mode: "payment",
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
              business: "Shakti Foods",
              order_type: "online-order",
              reservation_id: String(reservationId)
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
      await releaseReservation({
        supabase,
        reservationId
      });

      reservationId = null;

      throw stripeError;
    }

    stripeSessionId = session.id;

    if (!session.url) {
      await expireCheckoutSession({
        stripe,
        sessionId: stripeSessionId
      });

      await releaseReservation({
        supabase,
        reservationId
      });

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

      await releaseReservation({
        supabase,
        reservationId
      });

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
        stripe_session_id: session.id,
        reservation_id: reservationId,

        payment_status: "pending",
        fulfillment_status: "new",

        subtotal: subtotalCents,
        shipping_amount: shippingAmountCents,
        tax_amount: 0,
        total_amount:
          subtotalCents + shippingAmountCents,

        currency: CHECKOUT_CURRENCY
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

      await releaseReservation({
        supabase,
        reservationId
      });

      reservationId = null;
      stripeSessionId = null;

      throw new Error(
        "Unable to record order in database."
      );
    }

    createdOrderId = order.id;

    const orderItemsToInsert =
      checkoutItems.map(
        ({
          product,
          quantity,
          priceCents
        }) => ({
          order_id: order.id,
          product_id: product.product_id,
          product_name: product.title,
          quantity,
          unit_price: priceCents,
          line_total: priceCents * quantity
        })
      );

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

      await expireCheckoutSession({
        stripe,
        sessionId: stripeSessionId
      });

      await deleteIncompleteOrder({
        supabase,
        orderId: createdOrderId
      });

      createdOrderId = null;

      await releaseReservation({
        supabase,
        reservationId
      });

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
    /*
     * This is a final safety-net cleanup.
     * Failure branches above normally clear these
     * variables after performing cleanup.
     */
    if (stripeSessionId && stripe) {
      await expireCheckoutSession({
        stripe,
        sessionId: stripeSessionId
      });
    }

    if (createdOrderId && supabase) {
      await deleteIncompleteOrder({
        supabase,
        orderId: createdOrderId
      });
    }

    if (reservationId && supabase) {
      await releaseReservation({
        supabase,
        reservationId
      });
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