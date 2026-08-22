import {
  NextResponse
} from "next/server";

import {
  createSupabaseAdmin
} from "@/lib/supabase-admin";

import {
  prepareSubscription
} from "@/lib/subscriptions/prepare-subscription";

import {
  createPayPalSubscriptionProduct,
  createPayPalSubscriptionPlan,
  createPayPalSubscription
} from "@/lib/paypal";

export const runtime =
  "nodejs";


function getBaseUrl() {
  return (
    process.env.NEXT_PUBLIC_BASE_URL ||
    process.env.NEXT_PUBLIC_SITE_URL ||
    "http://localhost:3000"
  ).replace(/\/$/, "");
}


function findApprovalUrl(
  paypalSubscription
) {
  const links =
    Array.isArray(
      paypalSubscription?.links
    )
      ? paypalSubscription.links
      : [];

  return (
    links.find(
      (link) =>
        link?.rel === "approve"
    )?.href ||
    null
  );
}


export async function POST(request) {
  let createdSubscriptionId =
    null;

  try {
    let body;

    try {
      body =
        await request.json();
    } catch {
      return NextResponse.json(
        {
          message:
            "Invalid PayPal subscription request."
        },
        {
          status: 400
        }
      );
    }

    const productId =
      String(
        body?.productId ||
        ""
      ).trim();

    const quantity =
      body?.quantity;

    const frequencyId =
      String(
        body?.frequencyId ||
        ""
      ).trim();

    const rawCustomer =
      body?.customer &&
      typeof body.customer ===
        "object"
        ? body.customer
        : {};

    const customerName =
      String(
        rawCustomer.name ||
        ""
      ).trim();

    const customerEmail =
      String(
        rawCustomer.email ||
        ""
      )
        .trim()
        .toLowerCase();

    const customerPhone =
      String(
        rawCustomer.phone ||
        ""
      ).trim() ||
      null;


    if (!customerName) {
      return NextResponse.json(
        {
          message:
            "Customer name is required."
        },
        {
          status: 400
        }
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
        {
          status: 400
        }
      );
    }


    /*
     * Server-authoritative subscription pricing.
     */
    const prepared =
      await prepareSubscription({
        productId,
        quantity,
        frequencyId
      });


    const supabase =
      createSupabaseAdmin();


    /*
     * Create internal pending subscription.
     */
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
          "paypal",

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
          "Unable to create PayPal subscription record."
      );
    }


    createdSubscriptionId =
      subscription.id;


    const {
      error: itemError
    } = await supabase
      .from(
        "subscription_items"
      )
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
      throw new Error(
        itemError.message ||
          "Unable to save PayPal subscription item."
      );
    }


    /*
     * Find an existing matching PayPal billing plan.
     *
     * Price is included because a price change must
     * create a new PayPal plan instead of silently
     * mutating an already-used plan.
     */
    const {
      data: existingPlan,
      error: existingPlanError
    } = await supabase
      .from(
        "subscription_payment_plans"
      )
      .select(`
        id,
        provider_product_id,
        provider_plan_id
      `)
      .eq(
        "product_id",
        prepared.product.productId
      )
      .eq(
        "payment_provider",
        "paypal"
      )
      .eq(
        "interval_unit",
        prepared.frequency.intervalUnit
      )
      .eq(
        "interval_count",
        prepared.frequency.intervalCount
      )
      .eq(
        "unit_price_cents",
        prepared.subscriptionUnitPriceCents
      )
      .eq(
        "currency",
        prepared.currency
      )
      .eq(
        "is_active",
        true
      )
      .maybeSingle();


    if (existingPlanError) {
      throw new Error(
        existingPlanError.message ||
          "Unable to load PayPal subscription plan."
      );
    }


    let providerProductId =
      existingPlan
        ?.provider_product_id ||
      null;

    let providerPlanId =
      existingPlan
        ?.provider_plan_id ||
      null;


    /*
     * No reusable plan exists:
     * create PayPal Catalog Product + Plan.
     */
    if (!providerPlanId) {
      const paypalProduct =
        await createPayPalSubscriptionProduct({
          name:
            prepared.product.name,

          description:
            prepared.product.description,

          referenceId:
            prepared.product.productId
        });


      if (!paypalProduct?.id) {
        throw new Error(
          "PayPal did not return a product ID."
        );
      }


      providerProductId =
        paypalProduct.id;


      const paypalPlan =
        await createPayPalSubscriptionPlan({
          productId:
            providerProductId,

          name:
            `${prepared.product.name} - ${prepared.frequency.label}`,

          description:
            `${prepared.frequency.label} Subscribe & Save`,

          currency:
            prepared.currency,

          unitPriceCents:
            prepared.subscriptionUnitPriceCents,

          intervalUnit:
            prepared.frequency.intervalUnit,

          intervalCount:
            prepared.frequency.intervalCount,

          referenceId:
            `${prepared.product.productId}-${prepared.frequency.id}-${prepared.subscriptionUnitPriceCents}`
        });


      if (!paypalPlan?.id) {
        throw new Error(
          "PayPal did not return a billing plan ID."
        );
      }


      providerPlanId =
        paypalPlan.id;


      const {
        error: planSaveError
      } = await supabase
        .from(
          "subscription_payment_plans"
        )
        .insert({
          product_id:
            prepared.product.productId,

          payment_provider:
            "paypal",

          interval_unit:
            prepared.frequency.intervalUnit,

          interval_count:
            prepared.frequency.intervalCount,

          unit_price_cents:
            prepared.subscriptionUnitPriceCents,

          currency:
            prepared.currency,

          provider_product_id:
            providerProductId,

          provider_plan_id:
            providerPlanId,

          is_active:
            true
        });


      if (planSaveError) {
        throw new Error(
          planSaveError.message ||
            "Unable to save PayPal billing plan."
        );
      }
    }


    const baseUrl =
      getBaseUrl();


    const paypalSubscription =
      await createPayPalSubscription({
        planId:
          providerPlanId,

        quantity:
          prepared.quantity,

        customerName,

        customerEmail,

        internalSubscriptionId:
          subscription.id,

        returnUrl:
          `${baseUrl}/subscriptions/paypal/success`,

        cancelUrl:
          `${baseUrl}/subscriptions/checkout?productId=${encodeURIComponent(
            prepared.product.productId
          )}&frequencyId=${encodeURIComponent(
            prepared.frequency.id
          )}&quantity=${encodeURIComponent(
            String(
              prepared.quantity
            )
          )}&paypalCanceled=1`
      });


    if (
      !paypalSubscription?.id
    ) {
      throw new Error(
        "PayPal did not return a subscription ID."
      );
    }


    const approvalUrl =
      findApprovalUrl(
        paypalSubscription
      );


    if (!approvalUrl) {
      throw new Error(
        "PayPal did not return an approval URL."
      );
    }


    const {
      error: linkError
    } = await supabase
      .from("subscriptions")
      .update({
        provider_subscription_id:
          paypalSubscription.id,

        paypal_subscription_id:
          paypalSubscription.id,

        paypal_plan_id:
          providerPlanId,

        updated_at:
          new Date().toISOString()
      })
      .eq(
        "id",
        subscription.id
      );


    if (linkError) {
      throw new Error(
        linkError.message ||
          "Unable to link PayPal subscription."
      );
    }


    return NextResponse.json({
      success:
        true,

      subscriptionId:
        subscription.id,

      paypalSubscriptionId:
        paypalSubscription.id,

      approvalUrl
    });

  } catch (error) {
    console.error(
      "PayPal subscription checkout error:",
      error
    );


    /*
     * Delete only our incomplete database
     * records. PayPal-created Products/Plans
     * may remain reusable and should not be
     * blindly deleted.
     */
    if (createdSubscriptionId) {
      const supabase =
        createSupabaseAdmin();

      await supabase
        .from(
          "subscription_items"
        )
        .delete()
        .eq(
          "subscription_id",
          createdSubscriptionId
        );

      await supabase
        .from("subscriptions")
        .delete()
        .eq(
          "id",
          createdSubscriptionId
        );
    }


    return NextResponse.json(
      {
        success:
          false,

        message:
          error instanceof Error
            ? error.message
            : "Unable to start PayPal subscription checkout."
      },
      {
        status: 400
      }
    );
  }
}