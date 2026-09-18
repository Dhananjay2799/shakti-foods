import { NextResponse } from "next/server";
import { createSupabaseAdmin } from "@/lib/supabase-admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_ITEM_QUANTITY = 100;
const CHECKOUT_CURRENCY = "USD";

function normalizeItems(rawItems) {
  if (
    !Array.isArray(rawItems) ||
    rawItems.length === 0
  ) {
    throw new Error("Cart is empty.");
  }

  const quantities = new Map();

  for (const rawItem of rawItems) {
    const productId = String(
      rawItem?.id ||
        rawItem?.productId ||
        ""
    ).trim();

    if (!productId) {
      throw new Error(
        "A cart item is missing its product ID."
      );
    }

    const quantity =
      Number(rawItem?.quantity);

    if (
      !Number.isSafeInteger(quantity) ||
      quantity < 1 ||
      quantity > MAX_ITEM_QUANTITY
    ) {
      throw new Error(
        `Invalid quantity for product ${productId}.`
      );
    }

    const previousQuantity =
      quantities.get(productId) || 0;

    const combinedQuantity =
      previousQuantity + quantity;

    if (
      combinedQuantity >
      MAX_ITEM_QUANTITY
    ) {
      throw new Error(
        `Maximum quantity exceeded for product ${productId}.`
      );
    }

    quantities.set(
      productId,
      combinedQuantity
    );
  }

  return Array.from(
    quantities,
    ([productId, quantity]) => ({
      productId,
      quantity
    })
  );
}

function findMatchingTier(
  tiers,
  quantity
) {
  const matchingTiers = (
    Array.isArray(tiers)
      ? tiers
      : []
  )
    .filter((tier) => {
      if (tier.is_active !== true) {
        return false;
      }

      const minQuantity =
        Number(tier.min_quantity);

      const maxQuantity =
        tier.max_quantity == null
          ? null
          : Number(
              tier.max_quantity
            );

      return (
        Number.isSafeInteger(
          minQuantity
        ) &&
        quantity >= minQuantity &&
        (
          maxQuantity === null ||
          quantity <= maxQuantity
        )
      );
    })
    .sort(
      (a, b) =>
        Number(b.min_quantity) -
        Number(a.min_quantity)
    );

  return matchingTiers[0] || null;
}

export async function POST(request) {
  try {
    let body;

    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        {
          success: false,
          message:
            "Invalid pricing request."
        },
        {
          status: 400
        }
      );
    }

    const storefront = String(
      body?.storefront || "shakti_foods"
    ).trim();

    const allowedStorefronts =
      new Set([
        "shakti_foods",
        "ecoware"
      ]);

    if (
      !allowedStorefronts.has(
        storefront
      )
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Invalid storefront."
        },
        {
          status: 400
        }
      );
    }

    console.log(
      "Cart pricing storefront:",
      storefront
    );

    const items =
      normalizeItems(body?.items);

    const productIds =
      items.map(
        (item) => item.productId
      );

    const supabase =
      createSupabaseAdmin();

    const [
      productsResult,
      priceTiersResult
    ] = await Promise.all([
      supabase
        .from("products")
        .select(`
          product_id,
          title,
          price_cents,
          currency,
          status,
          is_active,
          storefront,
          deleted_at
        `)
        .in(
          "product_id",
          productIds
        )
        .eq(
          "storefront",
          storefront
        )
        .is(
          "deleted_at",
          null
        ),

      supabase
        .from("product_price_tiers")
        .select(`
          id,
          product_id,
          min_quantity,
          max_quantity,
          unit_price_cents,
          tier_name,
          sort_order,
          is_active
        `)
        .in(
          "product_id",
          productIds
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

    if (productsResult.error) {
      console.error(
        "Unable to load cart products:",
        productsResult.error
      );

      throw new Error(
        "Unable to load product pricing."
      );
    }

    if (priceTiersResult.error) {
      console.error(
        "Unable to load quantity pricing:",
        priceTiersResult.error
      );

      throw new Error(
        "Unable to load quantity pricing."
      );
    }

    const productsById =
      new Map(
        (
          productsResult.data ||
          []
        ).map(
          (product) => [
            String(
              product.product_id
            ),
            product
          ]
        )
      );

    const tiersByProductId =
      new Map();

    for (
      const tier of
      priceTiersResult.data || []
    ) {
      const productId =
        String(
          tier.product_id
        );

      if (
        !tiersByProductId.has(
          productId
        )
      ) {
        tiersByProductId.set(
          productId,
          []
        );
      }

      tiersByProductId
        .get(productId)
        .push(tier);
    }

    let subtotalCents = 0;
    let savingsCents = 0;

    const pricedItems =
      items.map(
        ({
          productId,
          quantity
        }) => {
          const product =
            productsById.get(
              productId
            );

          if (!product) {
            throw new Error(
              `Product is no longer available: ${productId}`
            );
          }

          if (
            product.status !==
              "active" ||
            product.is_active !==
              true
          ) {
            throw new Error(
              `${product.title} is not currently available.`
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
              `${product.title} cannot be priced in this cart currency.`
            );
          }

          const regularUnitPriceCents =
            Number(
              product.price_cents
            );

          if (
            !Number.isSafeInteger(
              regularUnitPriceCents
            ) ||
            regularUnitPriceCents <= 0
          ) {
            throw new Error(
              `${product.title} does not have a valid price.`
            );
          }

          const matchingTier =
            findMatchingTier(
              tiersByProductId.get(
                productId
              ) || [],
              quantity
            );

          let unitPriceCents =
            regularUnitPriceCents;

          let tier = null;

          if (matchingTier) {
            const tierPriceCents =
              Number(
                matchingTier
                  .unit_price_cents
              );

            if (
              !Number.isSafeInteger(
                tierPriceCents
              ) ||
              tierPriceCents <= 0
            ) {
              throw new Error(
                `Invalid quantity price for ${product.title}.`
              );
            }

            unitPriceCents =
              tierPriceCents;

            tier = {
              id:
                matchingTier.id,

              name:
                matchingTier
                  .tier_name ||
                null,

              minQuantity:
                Number(
                  matchingTier
                    .min_quantity
                ),

              maxQuantity:
                matchingTier
                  .max_quantity ==
                null
                  ? null
                  : Number(
                      matchingTier
                        .max_quantity
                    )
            };
          }

          const lineTotalCents =
            unitPriceCents *
            quantity;

          const lineSavingsCents =
            Math.max(
              0,
              (
                regularUnitPriceCents -
                unitPriceCents
              ) *
                quantity
            );

          subtotalCents +=
            lineTotalCents;

          savingsCents +=
            lineSavingsCents;

          return {
            productId,
            title:
              product.title,

            quantity,

            currency,

            regularUnitPriceCents,

            unitPriceCents,

            lineTotalCents,

            savingsCents:
              lineSavingsCents,

            hasQuantityDiscount:
              Boolean(
                matchingTier
              ),

            tier
          };
        }
      );

    if (
      !Number.isSafeInteger(
        subtotalCents
      ) ||
      subtotalCents < 0
    ) {
      throw new Error(
        "The cart subtotal is invalid."
      );
    }

    return NextResponse.json({
      success: true,

      storefront,

      currency:
        CHECKOUT_CURRENCY,

      items:
        pricedItems,

      subtotalCents,

      savingsCents
    });
  } catch (error) {
    console.error(
      "Cart pricing error:",
      error
    );

    return NextResponse.json(
      {
        success: false,

        message:
          error instanceof Error
            ? error.message
            : "Unable to calculate cart pricing."
      },
      {
        status: 400
      }
    );
  }
}