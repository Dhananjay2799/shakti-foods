import { commerce } from "@/lib/commerce";
import { createSupabaseAdmin } from "@/lib/supabase-admin";

const MAX_ITEM_QUANTITY = 100;
const RESERVATION_DURATION_MINUTES = 10;
const CHECKOUT_CURRENCY = "USD";

function normalizeCartItems(items) {
  if (!Array.isArray(items) || items.length === 0) {
    throw new Error("Cart is empty.");
  }

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

function getShippingConfiguration(
  subtotalCents
) {
  const freeShippingThresholdCents =
    Math.round(
      Number(
        commerce.freeShippingThreshold
      ) * 100
    );

  const standardShippingCents =
    Math.round(
      Number(
        commerce.standardShipping
      ) * 100
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
    subtotalCents >= freeShippingThresholdCents
      ? 0
      : standardShippingCents;

  return {
    freeShippingThresholdCents,
    standardShippingCents,
    shippingAmountCents
  };
}

export async function releaseCheckoutReservation(
  reservationId
) {
  if (!reservationId) {
    return false;
  }

  const supabase =
    createSupabaseAdmin();

  try {
    const { error } = await supabase.rpc(
      "release_inventory_reservation",
      {
        p_reservation_id:
          reservationId
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

export async function deleteIncompleteOrder(
  orderId
) {
  if (!orderId) {
    return false;
  }

  const supabase =
    createSupabaseAdmin();

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

export async function prepareCheckout(
  rawCartItems,
  storefront = "shakti_foods"
) {
  const storefrontId =
    String(
      storefront ||
      "shakti_foods"
    ).trim();

  const allowedStorefronts =
    new Set([
      "shakti_foods",
      "ecoware"
    ]);

  if (
    !allowedStorefronts.has(
      storefrontId
    )
  ) {
    throw new Error(
      "Invalid storefront."
    );
  }

  console.log(
    "prepareCheckout storefront:",
    storefrontId
  );

  const cartItems =
    normalizeCartItems(rawCartItems);

  const productIds = cartItems.map(
    (item) => item.productId
  );

  const supabase =
    createSupabaseAdmin();

  const [
    productsResult,
    inventoryResult,
    priceTiersResult
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
        deleted_at,
        storefront
      `)
      .eq(
        "storefront",
        storefrontId
      )
      .in(
        "product_id",
        productIds
      )
      .is(
        "deleted_at",
        null
      ),

    supabase
      .from("inventory")
      .select(`
        product_id,
        stock_quantity,
        reserved_quantity,
        is_active,
        storefront
      `)
      .eq(
        "storefront",
        storefrontId
      )
      .in(
        "product_id",
        productIds
      ),

    supabase
      .from("product_price_tiers")
      .select(`
        product_id,
        min_quantity,
        max_quantity,
        unit_price_cents,
        tier_name,
        sort_order
      `)
      .in("product_id", productIds)
      .order("sort_order", {
        ascending: true
      })
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

  if (priceTiersResult.error) {
    console.error(
      "Unable to load product price tiers:",
      priceTiersResult.error
    );

    throw new Error(
      "Unable to load product pricing."
    );
  }

  const productsById = new Map(
    (productsResult.data || []).map(
      (product) => [
        String(product.product_id),
        product
      ]
    )
  );

  const inventoryById = new Map(
    (inventoryResult.data || []).map(
      (inventory) => [
        String(inventory.product_id),
        inventory
      ]
    )
  );

  const priceTiersByProductId = new Map();

  for (const tier of priceTiersResult.data || []) {
    const productId =
      String(tier.product_id);

    if (
      !priceTiersByProductId.has(productId)
    ) {
      priceTiersByProductId.set(
        productId,
        []
      );
    }

    priceTiersByProductId
      .get(productId)
      .push(tier);
  }

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

      const regularPriceCents = Number(
        product.price_cents
      );

      if (
        !Number.isSafeInteger(
          regularPriceCents
        ) ||
        regularPriceCents <= 0
      ) {
        throw new Error(
          `${product.title} does not have a valid checkout price.`
        );
      }

      let priceCents =
        regularPriceCents;

      let appliedPriceTier = null;

      const productPriceTiers =
        priceTiersByProductId.get(
          productId
        ) || [];

      for (const tier of productPriceTiers) {
        const minQuantity =
          Number(tier.min_quantity);

        const maxQuantity =
          tier.max_quantity == null
            ? null
            : Number(tier.max_quantity);

        const tierPriceCents =
          Number(tier.unit_price_cents);

        const meetsMinimum =
          quantity >= minQuantity;

        const meetsMaximum =
          maxQuantity == null ||
          quantity <= maxQuantity;

        if (
          meetsMinimum &&
          meetsMaximum
        ) {
          if (
            !Number.isSafeInteger(
              tierPriceCents
            ) ||
            tierPriceCents <= 0
          ) {
            throw new Error(
              `Invalid price tier for ${product.title}.`
            );
          }

          priceCents =
            tierPriceCents;

          appliedPriceTier = {
            name:
              tier.tier_name || null,

            minQuantity,

            maxQuantity,

            unitPriceCents:
              tierPriceCents
          };

          break;
        }
      }

      const productCurrency = String(
        product.currency ||
          CHECKOUT_CURRENCY
      ).toUpperCase();

      if (
        productCurrency !==
        CHECKOUT_CURRENCY
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
        !Number.isSafeInteger(
          stockQuantity
        ) ||
        !Number.isSafeInteger(
          reservedQuantity
        )
      ) {
        throw new Error(
          `Inventory information is invalid for ${product.title}.`
        );
      }

      const availableQuantity =
        stockQuantity - reservedQuantity;

      if (
        availableQuantity < quantity
      ) {
        throw new Error(
          availableQuantity > 0
            ? `Only ${availableQuantity} unit(s) of ${product.title} are currently available.`
            : `${product.title} is out of stock.`
        );
      }

      return {
        product,
        quantity,

        regularPriceCents,

        priceCents,

        appliedPriceTier,

        savingsCents:
          Math.max(
            0,
            (regularPriceCents - priceCents) *
              quantity
          ),

        lineTotalCents:
          priceCents * quantity
      };
    }
  );

  const subtotalCents =
    checkoutItems.reduce(
      (total, item) =>
        total +
        item.lineTotalCents,
      0
    );

  if (
    !Number.isSafeInteger(
      subtotalCents
    ) ||
    subtotalCents <= 0
  ) {
    throw new Error(
      "The checkout subtotal is invalid."
    );
  }

  const {
    shippingAmountCents
  } = getShippingConfiguration(
    subtotalCents
  );

  const taxAmountCents = 0;

  const totalAmountCents =
    subtotalCents +
    shippingAmountCents +
    taxAmountCents;

  if (
    !Number.isSafeInteger(
      totalAmountCents
    ) ||
    totalAmountCents <= 0
  ) {
    throw new Error(
      "The checkout total is invalid."
    );
  }

  const reservationItems =
    checkoutItems.map(
      ({ product, quantity }) => ({
        product_id:
          product.product_id,

        quantity
      })
    );

  const reservationExpiresAt =
    new Date(
      Date.now() +
        RESERVATION_DURATION_MINUTES *
          60 *
          1000
    );

  const {
    data: reservationId,
    error: reservationError
  } = await supabase.rpc(
    "reserve_inventory_for_checkout",
    {
      p_items:
        reservationItems,

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

  if (!reservationId) {
    throw new Error(
      "Inventory reservation was not created."
    );
  }

  const stripeLineItems =
    checkoutItems.map(
      ({
        product,
        quantity,
        priceCents
      }) => ({
        quantity,

        price_data: {
          currency:
            CHECKOUT_CURRENCY.toLowerCase(),

          unit_amount:
            priceCents,

          product_data: {
            name:
              product.title,

            description:
              product.short_description ||
              product.title,

            metadata: {
              product_id:
                product.product_id
            }
          }
        }
      })
    );

  const orderItems =
    checkoutItems.map(
      ({
        product,
        quantity,
        priceCents,
        lineTotalCents
      }) => ({
        product_id:
          product.product_id,

        product_name:
          product.title,

        quantity,

        unit_price:
          priceCents,

        line_total:
          lineTotalCents
      })
    );

  return {
    reservationId,

    reservationExpiresAt:
      reservationExpiresAt.toISOString(),

    currency:
      CHECKOUT_CURRENCY,

    checkoutItems,

    stripeLineItems,

    orderItems,

    subtotalCents,

    shippingAmountCents,

    taxAmountCents,

    totalAmountCents
  };
}