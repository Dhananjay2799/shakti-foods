import {
  createSupabaseAdmin
} from "@/lib/supabase-admin";

const CHECKOUT_CURRENCY = "USD";
const MAX_SUBSCRIPTION_QUANTITY = 100;

function normalizeQuantity(value) {
  const raw = String(
    value ?? "1"
  ).trim();

  if (!/^\d+$/.test(raw)) {
    throw new Error(
      "Invalid subscription quantity."
    );
  }

  const quantity = Number(raw);

  if (
    !Number.isSafeInteger(quantity) ||
    quantity < 1 ||
    quantity >
      MAX_SUBSCRIPTION_QUANTITY
  ) {
    throw new Error(
      "Invalid subscription quantity."
    );
  }

  return quantity;
}

function calculatePercentagePrice(
  priceCents,
  discountPercent
) {
  const multiplier =
    100 - discountPercent;

  return Math.round(
    (priceCents * multiplier) /
      100
  );
}

export async function prepareSubscription({
  productId,
  quantity,
  frequencyId
}) {
  const normalizedProductId =
    String(
      productId || ""
    ).trim();

  const normalizedFrequencyId =
    String(
      frequencyId || ""
    ).trim();

  const normalizedQuantity =
    normalizeQuantity(quantity);

  if (!normalizedProductId) {
    throw new Error(
      "Subscription product is required."
    );
  }

  if (!normalizedFrequencyId) {
    throw new Error(
      "Delivery frequency is required."
    );
  }

  const supabase =
    createSupabaseAdmin();

  const [
    productResult,
    inventoryResult,
    settingsResult,
    frequencyResult,
    tiersResult
  ] = await Promise.all([
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
      .eq(
        "product_id",
        normalizedProductId
      )
      .is(
        "deleted_at",
        null
      )
      .maybeSingle(),

    supabase
      .from("inventory")
      .select(`
        product_id,
        stock_quantity,
        reserved_quantity,
        is_active
      `)
      .eq(
        "product_id",
        normalizedProductId
      )
      .maybeSingle(),

    supabase
      .from(
        "product_subscription_settings"
      )
      .select(`
        product_id,
        is_enabled,
        discount_percent,
        minimum_quantity
      `)
      .eq(
        "product_id",
        normalizedProductId
      )
      .maybeSingle(),

    supabase
      .from(
        "product_subscription_frequencies"
      )
      .select(`
        id,
        product_id,
        interval_unit,
        interval_count,
        label,
        is_active
      `)
      .eq(
        "id",
        normalizedFrequencyId
      )
      .eq(
        "product_id",
        normalizedProductId
      )
      .eq(
        "is_active",
        true
      )
      .maybeSingle(),

    supabase
      .from("product_price_tiers")
      .select(`
        id,
        min_quantity,
        max_quantity,
        unit_price_cents,
        tier_name,
        is_active
      `)
      .eq(
        "product_id",
        normalizedProductId
      )
      .eq(
        "is_active",
        true
      )
      .order(
        "min_quantity",
        {
          ascending: true
        }
      )
  ]);

  if (
    productResult.error ||
    !productResult.data
  ) {
    throw new Error(
      "Subscription product was not found."
    );
  }

  if (inventoryResult.error) {
    throw new Error(
      "Unable to verify subscription inventory."
    );
  }

  if (
    settingsResult.error ||
    !settingsResult.data
  ) {
    throw new Error(
      "Subscribe & Save is not configured for this product."
    );
  }

  if (
    frequencyResult.error ||
    !frequencyResult.data
  ) {
    throw new Error(
      "The selected delivery frequency is unavailable."
    );
  }

  if (tiersResult.error) {
    throw new Error(
      "Unable to load subscription pricing."
    );
  }

  const product =
    productResult.data;

  const inventory =
    inventoryResult.data;

  const settings =
    settingsResult.data;

  const frequency =
    frequencyResult.data;

  if (
    product.status !== "active" ||
    product.is_active !== true
  ) {
    throw new Error(
      `${product.title} is not currently available.`
    );
  }

  if (
    settings.is_enabled !== true
  ) {
    throw new Error(
      "Subscribe & Save is not enabled for this product."
    );
  }

  const minimumQuantity =
    Number(
      settings.minimum_quantity || 1
    );

  if (
    normalizedQuantity <
    minimumQuantity
  ) {
    throw new Error(
      `Minimum subscription quantity is ${minimumQuantity}.`
    );
  }

  const regularPriceCents =
    Number(
      product.price_cents
    );

  if (
    !Number.isSafeInteger(
      regularPriceCents
    ) ||
    regularPriceCents <= 0
  ) {
    throw new Error(
      "Subscription product price is invalid."
    );
  }

  const currency =
    String(
      product.currency ||
        CHECKOUT_CURRENCY
    ).toUpperCase();

  if (
    currency !==
    CHECKOUT_CURRENCY
  ) {
    throw new Error(
      "This subscription currency is not supported."
    );
  }

  /*
   * Determine quantity-tier price.
   */
  let volumePriceCents =
    regularPriceCents;

  let activeTier = null;

  for (
    const tier of
      tiersResult.data || []
  ) {
    const min =
      Number(
        tier.min_quantity
      );

    const max =
      tier.max_quantity == null
        ? null
        : Number(
            tier.max_quantity
          );

    if (
      normalizedQuantity >= min &&
      (
        max == null ||
        normalizedQuantity <= max
      )
    ) {
      const tierPrice =
        Number(
          tier.unit_price_cents
        );

      if (
        Number.isSafeInteger(
          tierPrice
        ) &&
        tierPrice > 0
      ) {
        volumePriceCents =
          tierPrice;

        activeTier =
          tier;

        break;
      }
    }
  }

  const discountPercent =
    Math.max(
      0,
      Math.min(
        100,
        Number(
          settings.discount_percent ||
            0
        )
      )
    );

  const subscriptionDiscountPriceCents =
    calculatePercentagePrice(
      regularPriceCents,
      discountPercent
    );

  /*
   * BEST PRICE WINS.
   *
   * Quantity pricing and Subscribe & Save
   * do NOT stack.
   */
  const subscriptionUnitPriceCents =
    Math.min(
      volumePriceCents,
      subscriptionDiscountPriceCents
    );

  const lineTotalCents =
    subscriptionUnitPriceCents *
    normalizedQuantity;

  const regularTotalCents =
    regularPriceCents *
    normalizedQuantity;

  const discountCents =
    Math.max(
      regularTotalCents -
        lineTotalCents,
      0
    );

  if (
    !inventory ||
    inventory.is_active !== true
  ) {
    throw new Error(
      `${product.title} is not available for subscription.`
    );
  }

  const availableQuantity =
    Number(
      inventory.stock_quantity || 0
    ) -
    Number(
      inventory.reserved_quantity || 0
    );

  /*
   * This validates that the first shipment
   * can currently be fulfilled.
   *
   * We are NOT reserving every future
   * subscription shipment.
   */
  if (
    availableQuantity <
    normalizedQuantity
  ) {
    throw new Error(
      `Only ${Math.max(
        availableQuantity,
        0
      )} unit(s) are currently available.`
    );
  }

  return {
    product: {
      productId:
        product.product_id,

      name:
        product.title,

      description:
        product.short_description ||
        product.title
    },

    quantity:
      normalizedQuantity,

    frequency: {
      id:
        frequency.id,

      intervalUnit:
        frequency.interval_unit,

      intervalCount:
        Number(
          frequency.interval_count
        ),

      label:
        frequency.label
    },

    regularUnitPriceCents:
      regularPriceCents,

    volumeUnitPriceCents:
      volumePriceCents,

    subscriptionUnitPriceCents,

    regularTotalCents,

    subtotalCents:
      lineTotalCents,

    discountCents,

    shippingCents: 0,

    taxCents: 0,

    totalCents:
      lineTotalCents,

    discountPercent,

    appliedPriceSource:
      activeTier &&
      volumePriceCents <=
        subscriptionDiscountPriceCents
        ? "volume"
        : "subscription",

    currency:
      CHECKOUT_CURRENCY
  };
}