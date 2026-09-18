const PAYPAL_API_BASE =
  process.env.PAYPAL_ENVIRONMENT === "live"
    ? "https://api-m.paypal.com"
    : "https://api-m.sandbox.paypal.com";

function getPayPalCredentials() {
  const clientId =
    process.env.PAYPAL_CLIENT_ID;

  const clientSecret =
    process.env.PAYPAL_CLIENT_SECRET;

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

  return {
    clientId,
    clientSecret
  };
}

async function getPayPalAccessToken() {
  const {
    clientId,
    clientSecret
  } = getPayPalCredentials();

  const credentials = Buffer.from(
    `${clientId}:${clientSecret}`
  ).toString("base64");

  const response = await fetch(
    `${PAYPAL_API_BASE}/v1/oauth2/token`,
    {
      method: "POST",

      headers: {
        Authorization:
          `Basic ${credentials}`,

        "Content-Type":
          "application/x-www-form-urlencoded"
      },

      body: "grant_type=client_credentials",

      cache: "no-store"
    }
  );

  const data = await response.json();

  if (!response.ok) {
    console.error(
      "PayPal access token error:",
      data
    );

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

async function paypalRequest(
  endpoint,
  options = {}
) {
  const accessToken =
    await getPayPalAccessToken();

  const response =
    await fetch(
      `${PAYPAL_API_BASE}${endpoint}`,
      {
        ...options,

        headers: {
          Authorization:
            `Bearer ${accessToken}`,

          "Content-Type":
            "application/json",

          "PayPal-Request-Id":
            options.requestId ||
            crypto.randomUUID(),

          ...(options.headers || {})
        },

        cache:
          "no-store"
      }
    );

  /*
   * Some PayPal endpoints return:
   *
   * 200 / 201 + JSON
   *
   * while management actions such as
   * suspend/cancel/activate may return
   * 204 No Content.
   *
   * Calling response.json() on an empty
   * body throws:
   *
   * "Unexpected end of JSON input"
   */
  const responseText =
    await response.text();

  let data = null;

  if (
    responseText &&
    responseText.trim()
  ) {
    try {
      data =
        JSON.parse(
          responseText
        );
    } catch (parseError) {
      console.error(
        "Unable to parse PayPal response:",
        {
          endpoint,
          status:
            response.status,
          responseText,
          parseError
        }
      );

      throw new Error(
        "PayPal returned an invalid response."
      );
    }
  }

  if (!response.ok) {
    console.error(
      "PayPal API error:",
      {
        endpoint,
        status:
          response.status,
        data
      }
    );

    const detailMessage =
      data
        ?.details
        ?.[0]
        ?.description ||
      data?.message ||
      data?.error_description ||
      `PayPal request failed with status ${response.status}.`;

    throw new Error(
      detailMessage
    );
  }

  /*
   * Successful endpoints such as suspend,
   * cancel or activate may intentionally
   * return no JSON body.
   */
  return (
    data ?? {
      success: true,
      status:
        response.status
    }
  );
}

export async function createPayPalOrder({
  amount,
  currency = "USD",
  referenceId,
  description,
  customId,
  brandName = "Shakti Foods"
}) {
  const numericAmount =
    Number(amount);

  if (
    !Number.isFinite(numericAmount) ||
    numericAmount <= 0
  ) {
    throw new Error(
      "A valid PayPal order amount is required."
    );
  }

  const normalizedReferenceId =
    String(
      referenceId || ""
    ).trim();

  const normalizedCustomId =
    String(
      customId || ""
    ).trim();

  const normalizedBrandName =
    String(
      brandName ||
      "Shakti Foods"
    ).trim();

  if (!normalizedReferenceId) {
    throw new Error(
      "PayPal reference ID is required."
    );
  }

  if (!normalizedCustomId) {
    throw new Error(
      "PayPal custom ID is required."
    );
  }

  const payload = {
    intent: "CAPTURE",

    purchase_units: [
      {
        reference_id:
          normalizedReferenceId,

        custom_id:
          normalizedCustomId,

        description:
          description ||
          `${normalizedBrandName} Order`,

        amount: {
          currency_code:
            String(currency)
              .trim()
              .toUpperCase(),

          value:
            numericAmount.toFixed(2)
        }
      }
    ],

    application_context: {
      brand_name:
        normalizedBrandName,

      shipping_preference:
        "GET_FROM_FILE",

      user_action:
        "PAY_NOW"
    }
  };

  console.log(
    "Creating PayPal order:",
    {
      referenceId:
        normalizedReferenceId,

      customId:
        normalizedCustomId,

      brandName:
        normalizedBrandName,

      amount:
        numericAmount.toFixed(2),

      currency:
        String(currency)
          .trim()
          .toUpperCase()
    }
  );

  const result =
    await paypalRequest(
      "/v2/checkout/orders",
      {
        method: "POST",

        requestId:
          `create-${normalizedReferenceId}`,

        body:
          JSON.stringify(
            payload
          )
      }
    );

  console.log(
    "Created PayPal order:",
    {
      paypalOrderId:
        result?.id,

      status:
        result?.status,

      referenceId:
        result
          ?.purchase_units
          ?.[0]
          ?.reference_id,

      customId:
        result
          ?.purchase_units
          ?.[0]
          ?.custom_id
    }
  );

  return result;
}

export async function getPayPalOrder(
  paypalOrderId
) {
  const normalizedOrderId =
    String(
      paypalOrderId || ""
    ).trim();

  if (!normalizedOrderId) {
    throw new Error(
      "PayPal order ID is required."
    );
  }

  return paypalRequest(
    `/v2/checkout/orders/${encodeURIComponent(
      normalizedOrderId
    )}`,
    {
      method: "GET",

      requestId:
        `get-${normalizedOrderId}`
    }
  );
}

export async function capturePayPalOrder(
  paypalOrderId
) {
  const normalizedOrderId =
    String(paypalOrderId || "").trim();

  if (!normalizedOrderId) {
    throw new Error(
      "PayPal order ID is required."
    );
  }

  return paypalRequest(
    `/v2/checkout/orders/${encodeURIComponent(
      normalizedOrderId
    )}/capture`,
    {
      method: "POST",

      requestId:
        `capture-${normalizedOrderId}`,

      body: JSON.stringify({})
    }
  );
}

function centsToPayPalValue(
  cents
) {
  const amount =
    Number(cents);

  if (
    !Number.isSafeInteger(amount) ||
    amount <= 0
  ) {
    throw new Error(
      "PayPal subscription amount is invalid."
    );
  }

  return (
    amount / 100
  ).toFixed(2);
}


function normalizePayPalIntervalUnit(
  value
) {
  const normalized =
    String(value || "")
      .trim()
      .toUpperCase();

  if (
    ![
      "DAY",
      "WEEK",
      "MONTH",
      "YEAR"
    ].includes(normalized)
  ) {
    throw new Error(
      "Unsupported PayPal billing interval."
    );
  }

  return normalized;
}


export async function createPayPalSubscriptionProduct({
  name,
  description,
  referenceId
}) {
  const productName =
    String(
      name || ""
    ).trim();

  if (!productName) {
    throw new Error(
      "PayPal subscription product name is required."
    );
  }

  return paypalRequest(
    "/v1/catalogs/products",
    {
      method: "POST",

      requestId:
        `subscription-product-${referenceId || crypto.randomUUID()}`,

      headers: {
        Prefer:
          "return=representation"
      },

      body: JSON.stringify({
        name:
          productName.slice(
            0,
            127
          ),

        description:
          String(
            description ||
            productName
          )
            .trim()
            .slice(
              0,
              256
            ),

        type:
          "PHYSICAL",

        category:
          "FOOD_PRODUCTS"
      })
    }
  );
}


export async function createPayPalSubscriptionPlan({
  productId,
  name,
  description,
  currency = "USD",
  unitPriceCents,
  intervalUnit,
  intervalCount,
  referenceId
}) {
  const normalizedProductId =
    String(
      productId || ""
    ).trim();

  if (!normalizedProductId) {
    throw new Error(
      "PayPal product ID is required."
    );
  }

  const normalizedCount =
    Number(
      intervalCount
    );

  if (
    !Number.isSafeInteger(
      normalizedCount
    ) ||
    normalizedCount < 1
  ) {
    throw new Error(
      "PayPal billing interval count is invalid."
    );
  }

  return paypalRequest(
    "/v1/billing/plans",
    {
      method: "POST",

      requestId:
        `subscription-plan-${referenceId || crypto.randomUUID()}`,

      headers: {
        Prefer:
          "return=representation"
      },

      body: JSON.stringify({
        product_id:
          normalizedProductId,

        name:
          String(
            name ||
            "Shakti Foods Subscribe & Save"
          )
            .trim()
            .slice(
              0,
              127
            ),

        description:
          String(
            description ||
            "Recurring Shakti Foods subscription"
          )
            .trim()
            .slice(
              0,
              127
            ),

        status:
          "ACTIVE",

        billing_cycles: [
          {
            frequency: {
              interval_unit:
                normalizePayPalIntervalUnit(
                  intervalUnit
                ),

              interval_count:
                normalizedCount
            },

            tenure_type:
              "REGULAR",

            sequence:
              1,

            /*
             * 0 = infinite recurring billing
             * until customer cancellation.
             */
            total_cycles:
              0,

            pricing_scheme: {
              fixed_price: {
                value:
                  centsToPayPalValue(
                    unitPriceCents
                  ),

                currency_code:
                  String(
                    currency ||
                    "USD"
                  ).toUpperCase()
              }
            }
          }
        ],

        payment_preferences: {
          auto_bill_outstanding:
            true,

          setup_fee_failure_action:
            "CANCEL",

          payment_failure_threshold:
            2
        },

        quantity_supported:
          true
      })
    }
  );
}


export async function createPayPalSubscription({
  planId,
  quantity = 1,
  customerName,
  customerEmail,
  internalSubscriptionId,
  returnUrl,
  cancelUrl
}) {
  const normalizedPlanId =
    String(
      planId || ""
    ).trim();

  if (!normalizedPlanId) {
    throw new Error(
      "PayPal plan ID is required."
    );
  }

  const normalizedQuantity =
    Number(
      quantity
    );

  if (
    !Number.isSafeInteger(
      normalizedQuantity
    ) ||
    normalizedQuantity < 1
  ) {
    throw new Error(
      "PayPal subscription quantity is invalid."
    );
  }

  const fullName =
    String(
      customerName || ""
    ).trim();

  const nameParts =
    fullName
      .split(/\s+/)
      .filter(Boolean);

  const givenName =
    nameParts[0] ||
    "Customer";

  const surname =
    nameParts.length > 1
      ? nameParts
          .slice(1)
          .join(" ")
      : ".";

  return paypalRequest(
    "/v1/billing/subscriptions",
    {
      method: "POST",

      requestId:
        `subscription-${internalSubscriptionId}`,

      headers: {
        Prefer:
          "return=representation"
      },

      body: JSON.stringify({
        plan_id:
          normalizedPlanId,

        quantity:
          String(
            normalizedQuantity
          ),

        custom_id:
          internalSubscriptionId,

        subscriber: {
          name: {
            given_name:
              givenName,

            surname
          },

          email_address:
            String(
              customerEmail ||
              ""
            )
              .trim()
              .toLowerCase()
        },

        application_context: {
          brand_name:
            "Shakti Foods",

          locale:
            "en-US",

          shipping_preference:
            "GET_FROM_FILE",

          user_action:
            "SUBSCRIBE_NOW",

          return_url:
            returnUrl,

          cancel_url:
            cancelUrl
        }
      })
    }
  );
}

export async function getPayPalSubscription(
  paypalSubscriptionId
) {
  const normalizedId =
    String(
      paypalSubscriptionId ||
      ""
    ).trim();

  if (!normalizedId) {
    throw new Error(
      "PayPal subscription ID is required."
    );
  }

  return paypalRequest(
    `/v1/billing/subscriptions/${encodeURIComponent(
      normalizedId
    )}`,
    {
      method: "GET",

      requestId:
        `get-subscription-${normalizedId}`
    }
  );
}

export async function cancelPayPalSubscription(
  paypalSubscriptionId,
  reason =
    "Subscription canceled by Shakti Foods admin."
) {
  const normalizedId =
    String(
      paypalSubscriptionId ||
      ""
    ).trim();

  if (!normalizedId) {
    throw new Error(
      "PayPal subscription ID is required."
    );
  }

  await paypalRequest(
    `/v1/billing/subscriptions/${encodeURIComponent(
      normalizedId
    )}/cancel`,
    {
      method: "POST",

      requestId:
        `cancel-subscription-${normalizedId}`,

      body:
        JSON.stringify({
          reason:
            String(
              reason
            ).slice(
              0,
              128
            )
        })
    }
  );

  return {
    success: true
  };
}


export async function suspendPayPalSubscription(
  paypalSubscriptionId,
  reason =
    "Subscription suspended by Shakti Foods admin."
) {
  const normalizedId =
    String(
      paypalSubscriptionId ||
      ""
    ).trim();

  if (!normalizedId) {
    throw new Error(
      "PayPal subscription ID is required."
    );
  }

  await paypalRequest(
    `/v1/billing/subscriptions/${encodeURIComponent(
      normalizedId
    )}/suspend`,
    {
      method: "POST",

      requestId:
        `suspend-subscription-${normalizedId}`,

      body:
        JSON.stringify({
          reason:
            String(
              reason
            ).slice(
              0,
              128
            )
        })
    }
  );

  return {
    success: true
  };
}


export async function activatePayPalSubscription(
  paypalSubscriptionId,
  reason =
    "Subscription reactivated by Shakti Foods admin."
) {
  const normalizedId =
    String(
      paypalSubscriptionId ||
      ""
    ).trim();

  if (!normalizedId) {
    throw new Error(
      "PayPal subscription ID is required."
    );
  }

  await paypalRequest(
    `/v1/billing/subscriptions/${encodeURIComponent(
      normalizedId
    )}/activate`,
    {
      method: "POST",

      requestId:
        `activate-subscription-${normalizedId}`,

      body:
        JSON.stringify({
          reason:
            String(
              reason
            ).slice(
              0,
              128
            )
        })
    }
  );

  return {
    success: true
  };
}