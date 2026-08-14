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