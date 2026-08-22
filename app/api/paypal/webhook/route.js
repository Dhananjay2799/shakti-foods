import { NextResponse } from "next/server";

import {
  fulfillRecurringSubscriptionPayment
} from "@/lib/subscriptions/fulfill-subscription";

import {
  createSupabaseAdmin
} from "@/lib/supabase-admin";

export const runtime = "nodejs";


const PAYPAL_API_BASE =
  process.env.PAYPAL_ENVIRONMENT === "live"
    ? "https://api-m.paypal.com"
    : "https://api-m.sandbox.paypal.com";


function getPayPalCredentials() {
  const clientId =
    process.env.PAYPAL_CLIENT_ID;

  const clientSecret =
    process.env.PAYPAL_CLIENT_SECRET;

  const webhookId =
    process.env.PAYPAL_WEBHOOK_ID;

  if (!clientId) {
    throw new Error(
      "PAYPAL_CLIENT_ID is not configured."
    );
  }

  if (!clientSecret) {
    throw new Error(
      "PAYPAL_CLIENT_SECRET is not configured."
    );
  }

  if (!webhookId) {
    throw new Error(
      "PAYPAL_WEBHOOK_ID is not configured."
    );
  }

  return {
    clientId,
    clientSecret,
    webhookId
  };
}


async function getPayPalAccessToken() {
  const {
    clientId,
    clientSecret
  } = getPayPalCredentials();

  const credentials =
    Buffer.from(
      `${clientId}:${clientSecret}`
    ).toString(
      "base64"
    );

  const response =
    await fetch(
      `${PAYPAL_API_BASE}/v1/oauth2/token`,
      {
        method:
          "POST",

        headers: {
          Authorization:
            `Basic ${credentials}`,

          "Content-Type":
            "application/x-www-form-urlencoded"
        },

        body:
          "grant_type=client_credentials",

        cache:
          "no-store"
      }
    );

  const data =
    await response.json();

  if (!response.ok) {
    throw new Error(
      data.error_description ||
      data.error ||
      "Unable to authenticate with PayPal."
    );
  }

  if (!data.access_token) {
    throw new Error(
      "PayPal did not return an access token."
    );
  }

  return data.access_token;
}


async function verifyPayPalWebhook({
  request,
  webhookEvent
}) {
  const {
    webhookId
  } = getPayPalCredentials();

  const authAlgo =
    request.headers.get(
      "paypal-auth-algo"
    );

  const certUrl =
    request.headers.get(
      "paypal-cert-url"
    );

  const transmissionId =
    request.headers.get(
      "paypal-transmission-id"
    );

  const transmissionSig =
    request.headers.get(
      "paypal-transmission-sig"
    );

  const transmissionTime =
    request.headers.get(
      "paypal-transmission-time"
    );

  if (
    !authAlgo ||
    !certUrl ||
    !transmissionId ||
    !transmissionSig ||
    !transmissionTime
  ) {
    throw new Error(
      "Missing PayPal webhook verification headers."
    );
  }

  const accessToken =
    await getPayPalAccessToken();

  const response =
    await fetch(
      `${PAYPAL_API_BASE}/v1/notifications/verify-webhook-signature`,
      {
        method:
          "POST",

        headers: {
          Authorization:
            `Bearer ${accessToken}`,

          "Content-Type":
            "application/json"
        },

        body:
          JSON.stringify({
            auth_algo:
              authAlgo,

            cert_url:
              certUrl,

            transmission_id:
              transmissionId,

            transmission_sig:
              transmissionSig,

            transmission_time:
              transmissionTime,

            webhook_id:
              webhookId,

            webhook_event:
              webhookEvent
          }),

        cache:
          "no-store"
      }
    );

  const data =
    await response.json();

  if (!response.ok) {
    console.error(
      "PayPal webhook verification API error:",
      data
    );

    throw new Error(
      data.message ||
      "Unable to verify PayPal webhook."
    );
  }

  return (
    data.verification_status ===
    "SUCCESS"
  );
}


function normalizePayPalStatus(
  value
) {
  switch (
    String(
      value || ""
    )
      .trim()
      .toUpperCase()
  ) {
    case "ACTIVE":
      return "active";

    case "SUSPENDED":
      return "paused";

    case "CANCELLED":
      return "canceled";

    case "EXPIRED":
      return "ended";

    case "APPROVAL_PENDING":
    case "APPROVED":
    default:
      return "pending";
  }
}


function normalizeText(
  value
) {
  return String(
    value || ""
  ).trim();
}


async function findInternalSubscription({
  paypalSubscriptionId,
  customId
}) {
  const supabase =
    createSupabaseAdmin();

  if (customId) {
    const {
      data,
      error
    } = await supabase
      .from("subscriptions")
      .select(`
        id,
        payment_provider,
        paypal_subscription_id,
        provider_subscription_id,
        status
      `)
      .eq(
        "id",
        customId
      )
      .maybeSingle();

    if (error) {
      throw new Error(
        error.message ||
        "Unable to load PayPal subscription."
      );
    }

    if (data) {
      return data;
    }
  }

  if (paypalSubscriptionId) {
    const {
      data,
      error
    } = await supabase
      .from("subscriptions")
      .select(`
        id,
        payment_provider,
        paypal_subscription_id,
        provider_subscription_id,
        status
      `)
      .eq(
        "paypal_subscription_id",
        paypalSubscriptionId
      )
      .maybeSingle();

    if (error) {
      throw new Error(
        error.message ||
        "Unable to load PayPal subscription."
      );
    }

    return data || null;
  }

  return null;
}


async function syncPayPalSubscriptionResource(
  resource
) {
  const paypalSubscriptionId =
    normalizeText(
      resource?.id
    );

  const customId =
    normalizeText(
      resource?.custom_id
    );

  if (!paypalSubscriptionId) {
    throw new Error(
      "PayPal subscription resource has no subscription ID."
    );
  }

  const internalSubscription =
    await findInternalSubscription({
      paypalSubscriptionId,
      customId
    });

  if (!internalSubscription) {
    console.warn(
      "PayPal subscription webhook could not find internal subscription:",
      {
        paypalSubscriptionId,
        customId
      }
    );

    return;
  }

  const supabase =
    createSupabaseAdmin();

  const now =
    new Date().toISOString();

  const status =
    normalizePayPalStatus(
      resource?.status
    );

  const updatePayload = {
    payment_provider:
      "paypal",

    provider_subscription_id:
      paypalSubscriptionId,

    paypal_subscription_id:
      paypalSubscriptionId,

    status,

    updated_at:
      now
  };

  const paypalShipping =
    resource
      ?.subscriber
      ?.shipping_address;

  if (
    paypalShipping?.address
  ) {
    updatePayload.shipping_address = {
      line1:
        paypalShipping
          .address
          .address_line_1 ||
        null,

      line2:
        paypalShipping
          .address
          .address_line_2 ||
        null,

      city:
        paypalShipping
          .address
          .admin_area_2 ||
        null,

      state:
        paypalShipping
          .address
          .admin_area_1 ||
        null,

      postal_code:
        paypalShipping
          .address
          .postal_code ||
        null,

      country:
        paypalShipping
          .address
          .country_code ||
        null
    };
  }

  const nextBillingTime =
    resource
      ?.billing_info
      ?.next_billing_time;

  if (nextBillingTime) {
    updatePayload.next_billing_at =
      nextBillingTime;
  }

  if (
    status === "canceled"
  ) {
    updatePayload.canceled_at =
      now;
  }

  if (
    status === "ended"
  ) {
    updatePayload.ended_at =
      now;
  }

  const {
    error
  } = await supabase
    .from("subscriptions")
    .update(
      updatePayload
    )
    .eq(
      "id",
      internalSubscription.id
    );

  if (error) {
    throw new Error(
      error.message ||
      "Unable to synchronize PayPal subscription."
    );
  }

  console.log(
    "PayPal subscription synchronized:",
    {
      internalSubscriptionId:
        internalSubscription.id,

      paypalSubscriptionId,

      status
    }
  );
}


async function handlePayPalPaymentFailure(
  resource
) {
  const paypalSubscriptionId =
    normalizeText(
      resource?.id
    ) ||
    normalizeText(
      resource
        ?.billing_agreement_id
    );

  if (!paypalSubscriptionId) {
    console.warn(
      "PayPal failed-payment event has no subscription identifier."
    );

    return;
  }

  const supabase =
    createSupabaseAdmin();

  const {
    error
  } = await supabase
    .from("subscriptions")
    .update({
      status:
        "past_due",

      updated_at:
        new Date().toISOString()
    })
    .eq(
      "paypal_subscription_id",
      paypalSubscriptionId
    );

  if (error) {
    throw new Error(
      error.message ||
      "Unable to mark PayPal subscription past due."
    );
  }

  console.log(
    "PayPal subscription marked past due:",
    {
      paypalSubscriptionId
    }
  );
}


async function handlePayPalSaleCompleted(
  resource
) {
  const saleId =
    normalizeText(
      resource?.id
    );

  const paypalSubscriptionId =
    normalizeText(
      resource?.billing_agreement_id
    );

  if (!saleId) {
    throw new Error(
      "PayPal sale ID is missing."
    );
  }

  if (!paypalSubscriptionId) {
    console.warn(
      "PayPal sale does not contain billing_agreement_id:",
      saleId
    );

    return;
  }

  const supabase =
    createSupabaseAdmin();

  const {
    data: subscription,
    error: subscriptionError
  } = await supabase
    .from("subscriptions")
    .select(`
      id,
      status,
      payment_provider,
      paypal_subscription_id
    `)
    .eq(
      "paypal_subscription_id",
      paypalSubscriptionId
    )
    .maybeSingle();

  if (
    subscriptionError ||
    !subscription
  ) {
    throw new Error(
      subscriptionError?.message ||
      `Unable to find internal subscription for PayPal subscription ${paypalSubscriptionId}.`
    );
  }

  if (
    subscription.payment_provider !==
    "paypal"
  ) {
    throw new Error(
      "PayPal subscription provider mismatch."
    );
  }

  /*
   * PAYMENT.SALE.COMPLETED means PayPal
   * successfully collected money for this
   * subscription cycle.
   */
  const fulfillmentResult =
    await fulfillRecurringSubscriptionPayment({
      subscriptionId:
        subscription.id,

      paymentProvider:
        "paypal",

      paymentReference:
        saleId
    });

  /*
   * Keep local subscription active after a
   * successful recurring charge.
   */
  const {
    error: updateError
  } = await supabase
    .from("subscriptions")
    .update({
      status:
        "active",

      updated_at:
        new Date().toISOString()
    })
    .eq(
      "id",
      subscription.id
    );

  if (updateError) {
    console.error(
      "Unable to update PayPal subscription after successful recurring payment:",
      {
        subscriptionId:
          subscription.id,

        paypalSubscriptionId,

        saleId,

        updateError
      }
    );
  }

  console.log(
    "PayPal recurring subscription payment fulfilled:",
    {
      saleId,

      paypalSubscriptionId,

      internalSubscriptionId:
        subscription.id,

      fulfillmentResult
    }
  );
}


export async function POST(request) {
  let webhookEvent;

  try {
    webhookEvent =
      await request.json();
  } catch {
    return NextResponse.json(
      {
        message:
          "Invalid PayPal webhook body."
      },
      {
        status: 400
      }
    );
  }

  try {
    const verified =
      await verifyPayPalWebhook({
        request,
        webhookEvent
      });

    if (!verified) {
      return NextResponse.json(
        {
          message:
            "Invalid PayPal webhook signature."
        },
        {
          status: 400
        }
      );
    }

    const eventType =
      String(
        webhookEvent
          ?.event_type ||
        ""
      )
        .trim()
        .toUpperCase();

    const resource =
      webhookEvent?.resource ||
      {};

    switch (eventType) {

      case "BILLING.SUBSCRIPTION.ACTIVATED":
      case "BILLING.SUBSCRIPTION.RE-ACTIVATED":
      case "BILLING.SUBSCRIPTION.UPDATED":
      case "BILLING.SUBSCRIPTION.SUSPENDED":
      case "BILLING.SUBSCRIPTION.CANCELLED":
      case "BILLING.SUBSCRIPTION.EXPIRED": {
        await syncPayPalSubscriptionResource(
          resource
        );

        break;
      }


      case "BILLING.SUBSCRIPTION.PAYMENT.FAILED": {
        await handlePayPalPaymentFailure(
          resource
        );

        break;
      }


      case "PAYMENT.SALE.COMPLETED": {
        await handlePayPalSaleCompleted(
          resource
        );

        break;
      }


      case "PAYMENT.SALE.REFUNDED":
      case "PAYMENT.SALE.REVERSED": {
        console.warn(
          "PayPal subscription payment was refunded/reversed:",
          {
            eventType,

            resourceId:
              resource?.id ||
              null,

            billingAgreementId:
              resource
                ?.billing_agreement_id ||
              null
          }
        );

        break;
      }


      case "PAYMENT.CAPTURE.COMPLETED": {
        /*
         * This event is selected in the PayPal
         * webhook configuration but is not used
         * to drive subscription state because
         * PAYMENT.SALE.COMPLETED is the canonical
         * recurring subscription payment event.
         */
        console.log(
          "Ignoring PayPal capture completed event for subscription webhook:",
          resource?.id ||
          null
        );

        break;
      }


      default:
        console.log(
          `Unhandled PayPal webhook event: ${eventType}`
        );
    }

    return NextResponse.json({
      received:
        true
    });

  } catch (error) {
    console.error(
      "PayPal webhook processing failed:",
      {
        eventId:
          webhookEvent?.id ||
          null,

        eventType:
          webhookEvent
            ?.event_type ||
          null,

        error
      }
    );

    return NextResponse.json(
      {
        message:
          error instanceof Error
            ? error.message
            : "PayPal webhook processing failed."
      },
      {
        status: 500
      }
    );
  }
}