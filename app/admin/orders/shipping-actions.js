"use server";

import { revalidatePath } from "next/cache";
import {
  createShipment,
  purchaseLabel,
} from "@/lib/shippo";
import { createSupabaseAdmin } from "@/lib/supabase-admin";
import { requireAuthenticatedAdmin } from "@/lib/admin-auth";
import { sendTransactionalEmail } from "@/lib/email";
import { buildOrderStatusEmail } from "@/lib/order-email-template";

function getErrorMessage(error) {
  return error instanceof Error
    ? error.message
    : "An unexpected Shippo error occurred.";
}

async function calculateOrderParcel(
  supabase,
  orderId
) {
  const {
    data: orderItems,
    error: orderItemsError,
  } = await supabase
    .from("order_items")
    .select(`
      product_id,
      product_name,
      quantity
    `)
    .eq("order_id", orderId);

  if (orderItemsError) {
    throw new Error(
      `Unable to load order items: ${orderItemsError.message}`
    );
  }

  if (!orderItems?.length) {
    throw new Error(
      "This order does not contain any products."
    );
  }

  const productIds = [
    ...new Set(
      orderItems
        .map((item) => item.product_id)
        .filter(Boolean)
    ),
  ];

  if (productIds.length === 0) {
    throw new Error(
      "The order items do not contain product IDs."
    );
  }

  const {
    data: products,
    error: productsError,
  } = await supabase
    .from("products")
    .select(`
      product_id,
      title,
      shipping_weight_lb,
      shipping_length_in,
      shipping_width_in,
      shipping_height_in
    `)
    .in("product_id", productIds);

  if (productsError) {
    throw new Error(
      `Unable to load product shipping measurements: ${productsError.message}`
    );
  }

  const productsById = new Map(
    (products || []).map((product) => [
      String(product.product_id),
      product,
    ])
  );

  let totalWeight = 0;
  let parcelLength = 0;
  let parcelWidth = 0;
  let parcelHeight = 0;

  const missingProducts = [];

  for (const item of orderItems) {
    const product = productsById.get(
      String(item.product_id)
    );

    const quantity = Math.max(
      Number(item.quantity) || 1,
      1
    );

    if (!product) {
      missingProducts.push(
        product.title ||
        item.product_name ||
        item.product_id
      );

      continue;
    }

    const weight = Number(
      product.shipping_weight_lb
    );

    const length = Number(
      product.shipping_length_in
    );

    const width = Number(
      product.shipping_width_in
    );

    const height = Number(
      product.shipping_height_in
    );

    const hasValidMeasurements =
      Number.isFinite(weight) &&
      weight > 0 &&
      Number.isFinite(length) &&
      length > 0 &&
      Number.isFinite(width) &&
      width > 0 &&
      Number.isFinite(height) &&
      height > 0;

    if (!hasValidMeasurements) {
      missingProducts.push(
        item.product_name ||
          item.product_id ||
          "Unknown product"
      );

      continue;
    }

    totalWeight += weight * quantity;

    parcelLength = Math.max(
      parcelLength,
      length
    );

    parcelWidth = Math.max(
      parcelWidth,
      width
    );

    /*
     * Initial packing rule:
     * products are treated as vertically stacked.
     */
    parcelHeight += height * quantity;
  }

  if (missingProducts.length > 0) {
    const uniqueMissingProducts = [
      ...new Set(missingProducts),
    ];

    throw new Error(
      `Shipping measurements are missing for: ${uniqueMissingProducts.join(
        ", "
      )}.`
    );
  }

  /*
   * Weight allowance for the box,
   * tape and protective packaging.
   */
  const packagingWeight = 0.5;

  totalWeight += packagingWeight;

  if (
    totalWeight <= 0 ||
    parcelLength <= 0 ||
    parcelWidth <= 0 ||
    parcelHeight <= 0
  ) {
    throw new Error(
      "The calculated parcel measurements are invalid."
    );
  }

  return {
    weight: totalWeight.toFixed(2),
    length: parcelLength.toFixed(2),
    width: parcelWidth.toFixed(2),
    height: parcelHeight.toFixed(2),
  };
}

export async function getCalculatedParcel(orderId) {
  await requireAuthenticatedAdmin();

  try {
    if (!orderId) {
      throw new Error("Order ID is required.");
    }

    const supabase = createSupabaseAdmin();

    const parcel = await calculateOrderParcel(
      supabase,
      orderId
    );

    return {
      success: true,
      parcel,
    };
  } catch (error) {
    console.error(
      "Unable to calculate order parcel:",
      error
    );

    return {
      success: false,
      error: getErrorMessage(error),
    };
  }
}

export async function getShippingRates(
  shipmentData
) {
  /*
   * Keep authentication outside the try/catch.
   * Next.js redirect() works by throwing a special
   * redirect response that should not be caught.
   */
  await requireAuthenticatedAdmin();

  try {
    const shipment =
      await createShipment(shipmentData);

    return {
      success: true,
      shipment,
      rates: shipment.rates || [],
    };
  } catch (error) {
    console.error(
      "Error getting shipping rates:",
      error
    );

    return {
      success: false,
      error: getErrorMessage(error),
    };
  }
}

export async function buyShippingLabel({
  orderId,
  rateObjectId,
  shipmentObjectId,
  provider,
  service,
  amount,
  parcel,
}) {
  /*
   * Authentication must happen before entering
   * the catch block so unauthorized users are
   * redirected correctly.
   */
  await requireAuthenticatedAdmin();

  try {
    if (!orderId) {
      throw new Error(
        "Order ID is required."
      );
    }

    if (!rateObjectId) {
      throw new Error(
        "Shipping rate ID is required."
      );
    }

    const supabase =
      createSupabaseAdmin();

    /*
     * Check whether the order exists and whether
     * a label has already been created.
     */
    const {
      data: existingOrder,
      error: orderError,
    } = await supabase
      .from("orders")
      .select(`
        id,
        fulfillment_status,
        shippo_transaction_id,
        label_url,
        tracking_number
      `)
      .eq("id", orderId)
      .single();

    if (orderError || !existingOrder) {
      console.error(
        "Unable to load order before label purchase:",
        orderError
      );

      throw new Error(
        "The order could not be found."
      );
    }

    if (
      existingOrder.shippo_transaction_id ||
      existingOrder.label_url ||
      existingOrder.tracking_number
    ) {
      throw new Error(
        "A shipping label has already been created for this order."
      );
    }

    /*
     * Purchase the label from Shippo.
     */
    const transaction =
      await purchaseLabel(rateObjectId);

    if (
      transaction.status !== "SUCCESS"
    ) {
      const shippoMessage =
        transaction.messages?.[0]?.text ||
        transaction.messages?.[0]?.message ||
        "Shippo could not create the shipping label.";

      throw new Error(shippoMessage);
    }

    if (
      !transaction.tracking_number ||
      !transaction.label_url
    ) {
      throw new Error(
        "Shippo created the transaction but did not return complete label information."
      );
    }

    const normalizedCarrier =
      provider?.trim().toLowerCase() ||
      "other";

    const shippingCost =
      Number(amount);

    if (
      !Number.isFinite(shippingCost)
    ) {
      throw new Error(
        "The selected shipping rate is invalid."
      );
    }

    const shippedAt =
      new Date().toISOString();

    /*
     * Save all shipment information.
     */
    const {
      data: updatedOrder,
      error: updateError,
    } = await supabase
      .from("orders")
      .update({
        shipping_carrier:
          normalizedCarrier,

        shipping_service:
          service || null,

        shipping_cost:
          shippingCost,

        tracking_number:
          transaction.tracking_number,

        tracking_url:
          transaction.tracking_url_provider ||
          null,

        label_url:
          transaction.label_url,

        shippo_shipment_id:
          shipmentObjectId || null,

        shippo_rate_id:
          rateObjectId,

        shippo_transaction_id:
          transaction.object_id || null,

        parcel_weight:
          Number(parcel?.weight) || null,

        parcel_length:
          Number(parcel?.length) || null,

        parcel_width:
          Number(parcel?.width) || null,

        parcel_height:
          Number(parcel?.height) || null,

        fulfillment_status:
          "shipped",

        shipped_at:
          shippedAt,

        updated_at:
          shippedAt,
      })
      .eq("id", orderId)
      .select(`
        id,
        customer_name,
        customer_email,
        fulfillment_status,
        shipping_carrier,
        shipping_method,
        shipping_service,
        shipping_cost,
        tracking_number,
        tracking_url,
        label_url,
        shippo_shipment_id,
        shippo_rate_id,
        shippo_transaction_id,
        shipped_at,
        updated_at
      `)
      .single();

    if (updateError) {
      console.error(
        "Unable to save Shippo label to order:",
        updateError
      );

      throw new Error(
        "The label was created, but the order could not be updated. Do not purchase another label."
      );
    }

    /*
     * Send the customer a shipped-status email.
     *
     * An email failure does not reverse the label
     * purchase or database update.
     */
    let emailSent = false;
    let emailErrorMessage = null;

    try {
      const [
        emailOrderResult,
        orderItemsResult,
      ] = await Promise.all([
        supabase
          .from("orders")
          .select(`
            id,
            customer_name,
            customer_email,
            fulfillment_status,
            total_amount,
            shipping_carrier,
            shipping_service,
            tracking_number,
            tracking_url
          `)
          .eq("id", orderId)
          .single(),

        supabase
          .from("order_items")
          .select(`
            product_name,
            quantity,
            line_total
          `)
          .eq("order_id", orderId),
      ]);

      if (emailOrderResult.error) {
        throw new Error(
          emailOrderResult.error.message ||
            "Unable to load order email details."
        );
      }

      if (orderItemsResult.error) {
        throw new Error(
          orderItemsResult.error.message ||
            "Unable to load order items for the shipment email."
        );
      }

      const emailOrder =
        emailOrderResult.data;

      const orderItems =
        orderItemsResult.data || [];

      if (emailOrder?.customer_email) {
        const email =
          buildOrderStatusEmail({
            order: emailOrder,
            items: orderItems,
          });

        await sendTransactionalEmail({
          to: emailOrder.customer_email,
          subject: email.subject,
          html: email.html,
          text: email.text,

          /*
           * The Shippo transaction ID makes this
           * email request idempotent.
           */
          idempotencyKey:
            `shippo-shipped/${orderId}/${transaction.object_id}`,
        });

        emailSent = true;
      } else {
        emailErrorMessage =
          "The customer does not have an email address.";
      }
    } catch (emailError) {
      emailErrorMessage =
        getErrorMessage(emailError);

      console.error(
        "Shipping label was saved, but the customer email could not be sent:",
        emailError
      );
    }

    revalidatePath("/admin");
    revalidatePath("/admin/orders");
    revalidatePath(
      `/admin/orders/${orderId}`
    );

    return {
      success: true,
      transaction,
      order: updatedOrder,
      emailSent,
      emailError:
        emailErrorMessage,
    };
  } catch (error) {
    console.error(
      "Error purchasing shipping label:",
      error
    );

    return {
      success: false,
      error: getErrorMessage(error),
    };
  }
}