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

  const response = await fetch(
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

      cache: "no-store"
    }
  );

  const data = await response.json();

  if (!response.ok) {
    console.error(
      "PayPal API error:",
      data
    );

    const detailMessage =
      data.details?.[0]?.description ||
      data.message ||
      data.error_description ||
      "PayPal request failed.";

    throw new Error(detailMessage);
  }

  return data;
}

export async function createPayPalOrder({
  amount,
  currency = "USD",
  referenceId,
  description,
  customId
}) {
  const numericAmount = Number(amount);

  if (
    !Number.isFinite(numericAmount) ||
    numericAmount <= 0
  ) {
    throw new Error(
      "A valid PayPal order amount is required."
    );
  }

  const formattedAmount =
    numericAmount.toFixed(2);

  return paypalRequest(
    "/v2/checkout/orders",
    {
      method: "POST",

      requestId:
        `create-${referenceId || crypto.randomUUID()}`,

      body: JSON.stringify({
        intent: "CAPTURE",

        purchase_units: [
          {
            reference_id:
              referenceId ||
              crypto.randomUUID(),

            custom_id:
              customId || undefined,

            description:
              description || undefined,

            amount: {
              currency_code:
                String(currency)
                  .toUpperCase(),

              value:
                formattedAmount
            }
          }
        ],

        application_context: {
          brand_name: "Shakti Foods",
          shipping_preference:
            "GET_FROM_FILE",
          user_action: "PAY_NOW"
        }
      })
    }
  );
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