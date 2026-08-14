import { NextResponse } from "next/server";

import {
  createSupabaseAdmin
} from "@/lib/supabase-admin";

import {
  getStorefrontProducts
} from "@/lib/storefront-products";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

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
            "Invalid recovery request."
        },
        {
          status: 400
        }
      );
    }

    const token =
      String(
        body?.token || ""
      ).trim();

    if (!token) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Recovery token is required."
        },
        {
          status: 400
        }
      );
    }

    const supabase =
      createSupabaseAdmin();

    /*
     * Find the recovery session.
     *
     * Only abandoned sessions may restore
     * a cart. Completed/cancelled/etc.
     * sessions cannot be reused.
     */
    const {
      data: recovery,
      error: recoveryError
    } = await supabase
      .from("cart_recovery_sessions")
      .select(`
        id,
        recovery_token,
        cart_snapshot,
        status,
        abandoned_at,
        recovered_at,
        completed_at
      `)
      .eq(
        "recovery_token",
        token
      )
      .maybeSingle();

    if (recoveryError) {
      console.error(
        "Unable to load cart recovery session:",
        recoveryError
      );

      throw new Error(
        "Unable to restore this cart."
      );
    }

    if (!recovery) {
      return NextResponse.json(
        {
          success: false,
          message:
            "This recovery link is invalid."
        },
        {
          status: 404
        }
      );
    }

    if (
      recovery.status !==
      "abandoned"
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            recovery.status ===
            "completed"
              ? "This order has already been completed."
              : "This recovery link is no longer available."
        },
        {
          status: 409
        }
      );
    }

    const snapshot =
      Array.isArray(
        recovery.cart_snapshot
      )
        ? recovery.cart_snapshot
        : [];

    if (snapshot.length === 0) {
      return NextResponse.json(
        {
          success: false,
          message:
            "There are no products available to restore."
        },
        {
          status: 409
        }
      );
    }

    /*
     * Load CURRENT storefront information.
     *
     * We deliberately do not trust old
     * snapshot prices, images or inventory.
     */
    const storefrontProducts =
      await getStorefrontProducts();

    const productsById =
      new Map(
        storefrontProducts.map(
          (product) => [
            product.id,
            product
          ]
        )
      );

    const restoredItems = [];
    const unavailableItems = [];

    for (
      const snapshotItem
      of snapshot
    ) {
      const productId =
        String(
          snapshotItem?.product_id ||
          ""
        ).trim();

      const requestedQuantity =
        Math.max(
          1,
          Math.floor(
            Number(
              snapshotItem?.quantity ||
              1
            )
          )
        );

      const product =
        productsById.get(
          productId
        );

      /*
       * Product may have been removed,
       * disabled or unpublished since the
       * original checkout.
       */
      if (!product) {
        unavailableItems.push({
          productId,
          name:
            snapshotItem?.product_name ||
            "Unavailable product",
          reason:
            "product_unavailable"
        });

        continue;
      }

      const availableStock =
        Math.max(
          Number(
            product.inventory
              ?.available_quantity ??
            product.availableQuantity ??
            product.inventoryQuantity ??
            0
          ),
          0
        );

      /*
       * Product still exists but cannot
       * currently be purchased.
       */
      if (
        !product.canCheckout ||
        !product.unitPrice ||
        availableStock <= 0
      ) {
        unavailableItems.push({
          productId:
            product.id,
          name:
            product.name,
          reason:
            "out_of_stock"
        });

        continue;
      }

      /*
       * Never restore more than current
       * available inventory.
       */
      const quantity =
        Math.min(
          requestedQuantity,
          availableStock
        );

      restoredItems.push({
        ...product,

        quantity,

        availableStock
      });

      if (
        quantity <
        requestedQuantity
      ) {
        unavailableItems.push({
          productId:
            product.id,

          name:
            product.name,

          reason:
            "quantity_adjusted",

          requestedQuantity,

          restoredQuantity:
            quantity
        });
      }
    }

    if (
      restoredItems.length === 0
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "The products from this cart are no longer available.",
          unavailableItems
        },
        {
          status: 409
        }
      );
    }

    /*
     * The link has successfully produced
     * a recoverable cart.
     *
     * We mark it recovered here, but this
     * does NOT mean payment was completed.
     */
    const {
      error: updateError
    } = await supabase
      .from(
        "cart_recovery_sessions"
      )
      .update({
        status:
          "recovered",

        recovered_at:
          new Date().toISOString(),

        last_recovery_attempt_at:
          new Date().toISOString()
      })
      .eq(
        "id",
        recovery.id
      )
      .eq(
        "status",
        "abandoned"
      );

    if (updateError) {
      console.error(
        "Unable to mark cart recovery session recovered:",
        {
          recoveryId:
            recovery.id,
          updateError
        }
      );

      /*
       * Do not prevent the customer from
       * restoring their cart merely because
       * analytics/state tracking failed.
       */
    }

    return NextResponse.json({
      success: true,

      recoveryId:
        recovery.id,

      items:
        restoredItems,

      unavailableItems
    });
  } catch (error) {
    console.error(
      "Cart recovery error:",
      error
    );

    return NextResponse.json(
      {
        success: false,

        message:
          error instanceof Error
            ? error.message
            : "Unable to restore this cart."
      },
      {
        status: 500
      }
    );
  }
}