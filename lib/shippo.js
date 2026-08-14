const SHIPPO_API_URL = "https://api.goshippo.com";

function getShippoToken() {
  const token = process.env.SHIPPO_API_TOKEN;

  if (!token) {
    throw new Error(
      "SHIPPO_API_TOKEN is not configured."
    );
  }

  return token;
}

async function shippoRequest(
  endpoint,
  options = {}
) {
  const response = await fetch(
    `${SHIPPO_API_URL}${endpoint}`,
    {
      ...options,
      headers: {
        Authorization: `ShippoToken ${getShippoToken()}`,
        "Content-Type": "application/json",
        ...(options.headers || {})
      },
      cache: "no-store"
    }
  );

  const data = await response.json();

  if (!response.ok) {
    console.error(
      "Shippo API Error:",
      data
    );

    throw new Error(
      data.detail ||
        data.error ||
        "Shippo request failed."
    );
  }

  return data;
}

export async function createShipment(
  shipment
) {
  return shippoRequest("/shipments/", {
    method: "POST",
    body: JSON.stringify(shipment)
  });
}

export async function purchaseLabel(rateObjectId) {
  return shippoRequest("/transactions/", {
    method: "POST",
    body: JSON.stringify({
      rate: rateObjectId,
      label_file_type: "PDF",
      async: false,
    }),
  });
}