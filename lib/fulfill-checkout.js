import Stripe from "stripe";
import {
  createSupabaseAdmin
} from "@/lib/supabase-admin";
import {
  capturePayPalOrder,
  getPayPalOrder
} from "@/lib/paypal";
import {
  sendOrderConfirmationEmailSafely
} from "@/lib/order-confirmation-email";

function normalizeIdentifier(
  value,
  fieldName
) {
  const normalized =
    String(value ?? "").trim();

  if (!normalized) {
    throw new Error(
      `${fieldName} is required.`
    );
  }

  return normalized;
}

function normalizeCurrency(
  value,
  fallback = "USD"
) {
  const normalized =
    String(value || fallback)
      .trim()
      .toUpperCase();

  if (!/^[A-Z]{3}$/.test(normalized)) {
    throw new Error(
      "Payment currency must be a three-letter code."
    );
  }

  return normalized;
}

function requireNonNegativeCents(
  value,
  fieldName
) {
  const number = Number(value);

  if (
    !Number.isSafeInteger(number) ||
    number < 0
  ) {
    throw new Error(
      `${fieldName} must be a non-negative integer in cents.`
    );
  }

  return number;
}

function decimalAmountToCents(
  value,
  fieldName
) {
  const normalized =
    String(value ?? "").trim();

  if (
    !/^\d+(?:\.\d{1,2})?$/.test(
      normalized
    )
  ) {
    throw new Error(
      `${fieldName} is not a valid monetary amount.`
    );
  }

  const [
    wholePart,
    fractionalPart = ""
  ] = normalized.split(".");

  const whole =
    Number(wholePart);

  const fraction =
    Number(
      fractionalPart.padEnd(
        2,
        "0"
      )
    );

  const cents =
    whole * 100 +
    fraction;

  if (
    !Number.isSafeInteger(cents) ||
    cents < 0
  ) {
    throw new Error(
      `${fieldName} is outside the supported range.`
    );
  }

  return cents;
}

function normalizeStripeOrderItems({
  lineItems,
  orderId
}) {
  if (
    !Array.isArray(lineItems) ||
    lineItems.length === 0
  ) {
    throw new Error(
      "The Stripe Checkout Session contains no order items."
    );
  }

  return lineItems.map(
    (item) => {
      const stripeProduct =
        item.price?.product;

      const productId =
        stripeProduct &&
        typeof stripeProduct ===
          "object"
          ? String(
              stripeProduct
                .metadata
                ?.product_id ||
                ""
            ).trim()
          : "";

      if (!productId) {
        throw new Error(
          `Stripe line item "${
            item.description ||
            "Product"
          }" is missing product_id metadata.`
        );
      }

      const quantity =
        Number(
          item.quantity || 0
        );

      if (
        !Number.isSafeInteger(
          quantity
        ) ||
        quantity <= 0
      ) {
        throw new Error(
          `Invalid Stripe quantity for product ${productId}.`
        );
      }

      const unitPrice =
        Number(
          item.price
            ?.unit_amount
        );

      if (
        !Number.isSafeInteger(
          unitPrice
        ) ||
        unitPrice < 0
      ) {
        throw new Error(
          `Invalid Stripe unit price for product ${productId}.`
        );
      }

      const expectedLineTotal =
        unitPrice * quantity;

      const stripeLineSubtotal =
        Number(
          item.amount_subtotal
        );

      if (
        Number.isSafeInteger(
          stripeLineSubtotal
        ) &&
        stripeLineSubtotal !==
          expectedLineTotal
      ) {
        throw new Error(
          `Stripe line item subtotal mismatch for product ${productId}. Discounts are not supported by this fulfillment flow.`
        );
      }

      return {
        order_id:
          orderId,

        product_id:
          productId,

        product_name:
          String(
            item.description ||
              "Product"
          ).trim() ||
          "Product",

        quantity,

        unit_price:
          unitPrice,

        line_total:
          expectedLineTotal
      };
    }
  );
}

function normalizeStoredOrderItems(
  items,
  orderId
) {
  if (
    !Array.isArray(items) ||
    items.length === 0
  ) {
    throw new Error(
      `Order ${orderId} contains no stored order items.`
    );
  }

  return items.map(
    (item) => {
      const productId =
        normalizeIdentifier(
          item.product_id,
          "Product ID"
        );

      const quantity =
        Number(item.quantity);

      const unitPrice =
        Number(
          item.unit_price
        );

      const lineTotal =
        Number(
          item.line_total
        );

      if (
        !Number.isSafeInteger(
          quantity
        ) ||
        quantity <= 0
      ) {
        throw new Error(
          `Invalid quantity for product ${productId}.`
        );
      }

      if (
        !Number.isSafeInteger(
          unitPrice
        ) ||
        unitPrice < 0
      ) {
        throw new Error(
          `Invalid unit price for product ${productId}.`
        );
      }

      if (
        !Number.isSafeInteger(
          lineTotal
        ) ||
        lineTotal !==
          unitPrice *
            quantity
      ) {
        throw new Error(
          `Invalid line total for product ${productId}.`
        );
      }

      return {
        order_id:
          orderId,

        product_id:
          productId,

        product_name:
          String(
            item.product_name ||
              "Product"
          ).trim() ||
          "Product",

        quantity,

        unit_price:
          unitPrice,

        line_total:
          lineTotal
      };
    }
  );
}

function orderItemsMatch(
  existingItems,
  expectedItems
) {
  if (
    !Array.isArray(
      existingItems
    ) ||
    existingItems.length !==
      expectedItems.length
  ) {
    return false;
  }

  const createKey =
    (item) =>
      [
        String(
          item.product_id
        ),

        Number(
          item.quantity
        ),

        Number(
          item.unit_price
        ),

        Number(
          item.line_total
        )
      ].join(":");

  const existingCounts =
    new Map();

  for (
    const item of
    existingItems
  ) {
    const key =
      createKey(item);

    existingCounts.set(
      key,
      (
        existingCounts.get(
          key
        ) || 0
      ) + 1
    );
  }

  for (
    const item of
    expectedItems
  ) {
    const key =
      createKey(item);

    const count =
      existingCounts.get(
        key
      ) || 0;

    if (count === 0) {
      return false;
    }

    existingCounts.set(
      key,
      count - 1
    );
  }

  return [
    ...existingCounts.values()
  ].every(
    (count) =>
      count === 0
  );
}

async function inventoryAlreadyCompleted({
  supabase,
  orderId,
  orderItems
}) {
  const productIds = [
    ...new Set(
      orderItems.map(
        (item) =>
          String(
            item.product_id
          )
      )
    )
  ];

  const {
    data,
    error
  } = await supabase
    .from(
      "inventory_transactions"
    )
    .select("product_id")
    .eq(
      "order_id",
      orderId
    )
    .eq(
      "transaction_type",
      "sale"
    )
    .in(
      "product_id",
      productIds
    );

  if (error) {
    console.error(
      "Unable to verify inventory fulfillment:",
      error
    );

    throw new Error(
      error.message ||
        "Unable to verify inventory fulfillment."
    );
  }

  const completedProductIds =
    new Set(
      (data || []).map(
        (transaction) =>
          String(
            transaction
              .product_id
          )
      )
    );

  return productIds.every(
    (productId) =>
      completedProductIds.has(
        productId
      )
  );
}

async function completeInventoryReservation({
  supabase,
  reservationId,
  orderId,
  externalPaymentId,
  orderItems
}) {
  const alreadyCompleted =
    await inventoryAlreadyCompleted({
      supabase,
      orderId,
      orderItems
    });

  if (alreadyCompleted) {
    return true;
  }

  const {
    error
  } = await supabase.rpc(
    "complete_inventory_reservation",
    {
      p_reservation_id:
        reservationId,

      p_order_id:
        orderId,

      /*
       * Your current RPC uses this
       * legacy Stripe-specific name.
       *
       * For PayPal, the PayPal order
       * ID is passed as the external
       * payment reference.
       */
      p_stripe_session_id:
        externalPaymentId
    }
  );

  if (error) {
    console.error(
      "Unable to complete inventory reservation:",
      error
    );

    throw new Error(
      error.message ||
        "Unable to complete inventory reservation."
    );
  }

  return false;
}

async function ensureStripeOrderItems({
  supabase,
  orderId,
  expectedOrderItems
}) {
  const {
    data:
      existingItems,

    error
  } = await supabase
    .from("order_items")
    .select(`
      product_id,
      product_name,
      quantity,
      unit_price,
      line_total
    `)
    .eq(
      "order_id",
      orderId
    );

  if (error) {
    throw new Error(
      error.message ||
        "Unable to load order items."
    );
  }

  if (
    !existingItems ||
    existingItems.length === 0
  ) {
    const {
      error:
        insertError
    } = await supabase
      .from("order_items")
      .insert(
        expectedOrderItems
      );

    if (insertError) {
      throw new Error(
        insertError.message ||
          "Unable to create order items."
      );
    }

    return expectedOrderItems;
  }

  if (
    !orderItemsMatch(
      existingItems,
      expectedOrderItems
    )
  ) {
    throw new Error(
      "Stored order items do not match the Stripe Checkout Session."
    );
  }

  return normalizeStoredOrderItems(
    existingItems,
    orderId
  );
}

function getPayPalCaptureDetails(
  paypalOrder
) {
  if (
    !paypalOrder ||
    typeof paypalOrder !==
      "object"
  ) {
    throw new Error(
      "PayPal returned an invalid capture response."
    );
  }

  if (
    paypalOrder.status !==
    "COMPLETED"
  ) {
    throw new Error(
      `PayPal order was not completed. Current status: ${
        paypalOrder.status ||
        "unknown"
      }.`
    );
  }

  const purchaseUnits =
    Array.isArray(
      paypalOrder.purchase_units
    )
      ? paypalOrder.purchase_units
      : [];

  if (
    purchaseUnits.length !== 1
  ) {
    throw new Error(
      "PayPal capture must contain exactly one purchase unit."
    );
  }

  const purchaseUnit =
    purchaseUnits[0];

  const captures =
    Array.isArray(
      purchaseUnit?.payments
        ?.captures
    )
      ? purchaseUnit
          .payments
          .captures
      : [];

  const completedCaptures =
    captures.filter(
      (capture) =>
        capture?.status ===
        "COMPLETED"
    );

  if (
    completedCaptures.length !==
    1
  ) {
    throw new Error(
      "PayPal did not return exactly one completed capture."
    );
  }

  const capture =
    completedCaptures[0];

  const amount =
    capture.amount ||
    purchaseUnit.amount;

  return {
    purchaseUnit,
    capture,

    captureId:
      normalizeIdentifier(
        capture.id,
        "PayPal capture ID"
      ),

    amountCents:
      decimalAmountToCents(
        amount?.value,
        "PayPal captured amount"
      ),

    currency:
      normalizeCurrency(
        amount?.currency_code
      )
  };
}

function normalizePayPalAddress(
  address
) {
  if (
    !address ||
    typeof address !==
      "object"
  ) {
    return null;
  }

  return {
    line1:
      String(
        address
          .address_line_1 ||
          ""
      ).trim() ||
      null,

    line2:
      String(
        address
          .address_line_2 ||
          ""
      ).trim() ||
      null,

    city:
      String(
        address
          .admin_area_2 ||
          ""
      ).trim() ||
      null,

    state:
      String(
        address
          .admin_area_1 ||
          ""
      ).trim() ||
      null,

    postal_code:
      String(
        address
          .postal_code ||
          ""
      ).trim() ||
      null,

    country:
      String(
        address
          .country_code ||
          ""
      ).trim() ||
      null
  };
}

export async function fulfillCheckoutSession(
  sessionId
) {
  const normalizedSessionId =
    normalizeIdentifier(
      sessionId,
      "Stripe Checkout Session ID"
    );

  const stripeSecretKey =
    process.env
      .STRIPE_SECRET_KEY;

  if (!stripeSecretKey) {
    throw new Error(
      "Missing STRIPE_SECRET_KEY."
    );
  }

  const stripe =
    new Stripe(
      stripeSecretKey
    );

  const supabase =
    createSupabaseAdmin();

  const fullSession =
    await stripe
      .checkout
      .sessions
      .retrieve(
        normalizedSessionId,
        {
          expand: [
            "payment_intent"
          ]
        }
      );

  if (
    fullSession
      .payment_status !==
    "paid"
  ) {
    return {
      fulfilled: false,

      reason:
        "Checkout payment is not complete.",

      sessionId:
        fullSession.id
    };
  }

  const reservationId =
    normalizeIdentifier(
      fullSession.metadata
        ?.reservation_id,

      `Reservation ID for Stripe session ${fullSession.id}`
    );

  const lineItemsResponse =
    await stripe
      .checkout
      .sessions
      .listLineItems(
        fullSession.id,
        {
          limit: 100,

          expand: [
            "data.price.product"
          ]
        }
      );

  if (
    lineItemsResponse.has_more
  ) {
    throw new Error(
      "Stripe Checkout Session contains more than 100 line items, which this fulfillment flow does not support."
    );
  }

  const customer =
    fullSession
      .customer_details ||
    null;

  const shippingDetails =
    fullSession
      .collected_information
      ?.shipping_details ||
    fullSession
      .shipping_details ||
    null;

  const shippingAddress =
    shippingDetails
      ?.address ||
    customer?.address ||
    null;

  const paymentIntentId =
    typeof fullSession
      .payment_intent ===
    "string"
      ? fullSession
          .payment_intent
      : fullSession
          .payment_intent
          ?.id ||
        null;

  const shippingRate =
    typeof fullSession
      .shipping_cost
      ?.shipping_rate ===
    "string"
      ? fullSession
          .shipping_cost
          .shipping_rate
      : fullSession
          .shipping_cost
          ?.shipping_rate
          ?.id ||
        null;

  const currency =
    normalizeCurrency(
      fullSession.currency
    );

  const subtotal =
    requireNonNegativeCents(
      fullSession
        .amount_subtotal ||
        0,

      "Stripe subtotal"
    );

  const shippingAmount =
    requireNonNegativeCents(
      fullSession
        .total_details
        ?.amount_shipping ||
        0,

      "Stripe shipping amount"
    );

  const taxAmount =
    requireNonNegativeCents(
      fullSession
        .total_details
        ?.amount_tax ||
        0,

      "Stripe tax amount"
    );

  const totalAmount =
    requireNonNegativeCents(
      fullSession
        .amount_total ||
        0,

      "Stripe total amount"
    );

  if (
    subtotal +
      shippingAmount +
      taxAmount !==
    totalAmount
  ) {
    throw new Error(
      "Stripe totals do not match. Discounts are not supported by this fulfillment flow."
    );
  }

  const {
    data:
      existingOrder,

    error:
      existingOrderError
  } = await supabase
    .from("orders")
    .select(`
      id,
      reservation_id,
      payment_status,
      fulfillment_status
    `)
    .eq(
      "stripe_session_id",
      fullSession.id
    )
    .maybeSingle();

  if (existingOrderError) {
    throw new Error(
      existingOrderError
        .message ||
        "Unable to load checkout order."
    );
  }

  if (
    existingOrder
      ?.reservation_id &&
    String(
      existingOrder
        .reservation_id
    ) !==
      reservationId
  ) {
    throw new Error(
      `Reservation mismatch for Stripe session ${fullSession.id}.`
    );
  }

  const {
    data:
      order,

    error:
      orderError
  } = await supabase
    .from("orders")
    .upsert(
      {
        stripe_session_id:
          fullSession.id,

        payment_provider:
          "stripe",

        reservation_id:
          reservationId,

        stripe_payment_intent_id:
          paymentIntentId,

        customer_name:
          shippingDetails
            ?.name ||
          customer?.name ||
          null,

        customer_email:
          customer?.email ||
          fullSession
            .customer_email ||
          null,

        customer_phone:
          customer?.phone ||
          null,

        shipping_address:
          shippingAddress,

        shipping_method:
          shippingRate,

        currency,
        subtotal,

        shipping_amount:
          shippingAmount,

        tax_amount:
          taxAmount,

        total_amount:
          totalAmount,

        payment_status:
          existingOrder
            ?.payment_status ||
          "pending",

        fulfillment_status:
          existingOrder
            ?.fulfillment_status ||
          "new",

        updated_at:
          new Date()
            .toISOString()
      },
      {
        onConflict:
          "stripe_session_id"
      }
    )
    .select(`
      id,
      reservation_id,
      payment_status,
      fulfillment_status
    `)
    .single();

  if (
    orderError ||
    !order
  ) {
    throw new Error(
      orderError?.message ||
        "Unable to save checkout order."
    );
  }

  const expectedOrderItems =
    normalizeStripeOrderItems({
      lineItems:
        lineItemsResponse.data,

      orderId:
        order.id
    });

  const orderItems =
    await ensureStripeOrderItems({
      supabase,

      orderId:
        order.id,

      expectedOrderItems
    });

  const alreadyProcessed =
    await completeInventoryReservation({
      supabase,

      reservationId,

      orderId:
        order.id,

      externalPaymentId:
        fullSession.id,

      orderItems
    });

  const {
    data:
      completedOrder,

    error:
      completedOrderError
  } = await supabase
    .from("orders")
    .update({
      stripe_payment_intent_id:
        paymentIntentId,

      customer_name:
        shippingDetails
          ?.name ||
        customer?.name ||
        null,

      customer_email:
        customer?.email ||
        fullSession
          .customer_email ||
        null,

      customer_phone:
        customer?.phone ||
        null,

      shipping_address:
        shippingAddress,

      shipping_method:
        shippingRate,

      currency,
      subtotal,

      shipping_amount:
        shippingAmount,

      tax_amount:
        taxAmount,

      total_amount:
        totalAmount,

      payment_status:
        "paid",

      fulfillment_status:
        order
          .fulfillment_status ||
        "new",

      updated_at:
        new Date()
          .toISOString()
    })
    .eq(
      "id",
      order.id
    )
    .eq(
      "stripe_session_id",
      fullSession.id
    )
    .select(`
      id,
      payment_status,
      fulfillment_status
    `)
    .single();

  if (
    completedOrderError ||
    !completedOrder
  ) {
    throw new Error(
      completedOrderError
        ?.message ||
        "Unable to finalize the paid Stripe order."
    );
  }

    /*
  * Stripe payment is confirmed and the
  * database order has been finalized.
  *
  * Complete the recovery lifecycle here,
  * rather than relying only on the webhook.
  */
  const recoveryEmail =
    String(
      customer?.email ||
      fullSession.customer_email ||
      ""
    )
      .trim()
      .toLowerCase() ||
    null;

  const recoveryPhone =
    String(
      customer?.phone ||
      ""
    ).trim() ||
    null;

  console.log(
    "Attempting Stripe recovery completion:",
    {
      reservationId,
      stripeSessionId:
        fullSession.id,
      orderId:
        completedOrder.id,
      recoveryEmail,
      recoveryPhone
    }
  );
  
    const {
    data: updatedRecovery,
    error: recoveryError
  } = await supabase
    .from("cart_recovery_sessions")
    .update({
      email: recoveryEmail,
      phone: recoveryPhone,

      status: "completed",

      completed_at:
        new Date().toISOString(),

      sms_consent: false
    })
    .eq(
      "reservation_id",
      reservationId
    )
    .in(
      "status",
      [
        "active",
        "abandoned"
      ]
    )
    .select(`
      id,
      reservation_id,
      status,
      email,
      phone,
      completed_at
    `);

  if (recoveryError) {
    console.error(
      "Unable to complete Stripe cart recovery session:",
      {
        reservationId,
        stripeSessionId:
          fullSession.id,
        orderId:
          completedOrder.id,
        recoveryError
      }
    );
  } else {
    console.log(
      "Stripe cart recovery completion result:",
      {
        reservationId,
        stripeSessionId:
          fullSession.id,
        orderId:
          completedOrder.id,
        updatedRows:
          updatedRecovery?.length || 0,
        recovery:
          updatedRecovery || []
      }
    );
  }

  let emailResult = {
    sent: false
  };

  /*
  * Do not resend the confirmation email when
  * fulfillment is being replayed for an order
  * that has already completed inventory processing.
  */
  if (!alreadyProcessed) {
    emailResult =
      await sendOrderConfirmationEmailSafely({
        to:
          customer?.email ||
          fullSession.customer_email ||
          null,

        orderId:
          completedOrder.id,

        customerName:
          shippingDetails?.name ||
          customer?.name ||
          "Customer",

        currency,
        items:
          orderItems,

        subtotal,
        shippingAmount,
        taxAmount,
        totalAmount,
        shippingAddress
      });
  } else {
    console.log(
      "Skipping duplicate Stripe order confirmation email:",
      {
        orderId:
          completedOrder.id,

        stripeSessionId:
          fullSession.id
      }
    );
  }

  return {
    fulfilled: true,

    alreadyProcessed,

    orderId:
      completedOrder.id,

    sessionId:
      fullSession.id,

    paymentStatus:
      completedOrder
        .payment_status,

    fulfillmentStatus:
      completedOrder
        .fulfillment_status,

    emailSent:
      emailResult.sent
  };
}

export async function fulfillPayPalOrder(
  paypalOrderId
) {
  const normalizedPayPalOrderId =
    normalizeIdentifier(
      paypalOrderId,
      "PayPal order ID"
    );

  const supabase =
    createSupabaseAdmin();

  const {
    data:
      existingOrder,

    error:
      orderError
  } = await supabase
    .from("orders")
    .select(`
      id,
      reservation_id,
      paypal_order_id,
      paypal_capture_id,
      payment_status,
      fulfillment_status,
      subtotal,
      shipping_amount,
      tax_amount,
      total_amount,
      currency,
      customer_name,
      customer_email,
      customer_phone,
      shipping_address
    `)
    .eq(
      "paypal_order_id",
      normalizedPayPalOrderId
    )
    .maybeSingle();

  if (orderError) {
    throw new Error(
      orderError.message ||
        "Unable to load the PayPal order."
    );
  }

  if (!existingOrder) {
    throw new Error(
      `No database order exists for PayPal order ${normalizedPayPalOrderId}.`
    );
  }

  const {
    data:
      storedItems,

    error:
      itemsError
  } = await supabase
    .from("order_items")
    .select(`
      product_id,
      product_name,
      quantity,
      unit_price,
      line_total
    `)
    .eq(
      "order_id",
      existingOrder.id
    );

  if (itemsError) {
    throw new Error(
      itemsError.message ||
        "Unable to load PayPal order items."
    );
  }

  const orderItems =
    normalizeStoredOrderItems(
      storedItems,
      existingOrder.id
    );

  const subtotal =
    requireNonNegativeCents(
      existingOrder.subtotal,
      "Order subtotal"
    );

  const shippingAmount =
    requireNonNegativeCents(
      existingOrder
        .shipping_amount,

      "Order shipping amount"
    );

  const taxAmount =
    requireNonNegativeCents(
      existingOrder.tax_amount,
      "Order tax amount"
    );

  const totalAmount =
    requireNonNegativeCents(
      existingOrder.total_amount,
      "Order total"
    );

  const currency =
    normalizeCurrency(
      existingOrder.currency
    );

  const itemSubtotal =
    orderItems.reduce(
      (sum, item) =>
        sum +
        item.line_total,
      0
    );

  if (
    itemSubtotal !==
    subtotal
  ) {
    throw new Error(
      "Stored PayPal order items do not match the stored subtotal."
    );
  }

  if (
    subtotal +
      shippingAmount +
      taxAmount !==
    totalAmount
  ) {
    throw new Error(
      "Stored PayPal order totals are inconsistent."
    );
  }

  /*
   * Never capture the same PayPal
   * order twice.
   */
  if (
    existingOrder
      .payment_status ===
      "paid" &&
    existingOrder
      .paypal_capture_id
  ) {
    const alreadyProcessed =
      await inventoryAlreadyCompleted({
        supabase,

        orderId:
          existingOrder.id,

        orderItems
      });

    if (!alreadyProcessed) {
      throw new Error(
        "The PayPal order is marked paid, but its inventory sale transactions are missing."
      );
    }

    const {
      error: recoveryError
    } = await supabase
      .from("cart_recovery_sessions")
      .update({
        email:
          existingOrder.customer_email ||
          null,

        phone:
          existingOrder.customer_phone ||
          null,

        status:
          "completed",

        completed_at:
          new Date().toISOString(),

        sms_consent:
          false
      })
      .eq(
        "reservation_id",
        existingOrder.reservation_id
      )
      .in(
        "status",
        [
          "active",
          "abandoned"
        ]
      );

    if (recoveryError) {
      console.error(
        "Unable to reconcile PayPal cart recovery session:",
        {
          orderId:
            existingOrder.id,

          paypalOrderId:
            normalizedPayPalOrderId,

          recoveryError
        }
      );
    }

    return {
      fulfilled: true,

      alreadyProcessed:
        true,

      orderId:
        existingOrder.id,

      paypalOrderId:
        normalizedPayPalOrderId,

      paypalCaptureId:
        existingOrder
          .paypal_capture_id,

      paymentStatus:
        existingOrder
          .payment_status,

      fulfillmentStatus:
        existingOrder
          .fulfillment_status,

      emailSent:
        false
    };
  }

  const paypalOrderBeforeCapture =
    await getPayPalOrder(
      normalizedPayPalOrderId
    );

  const purchaseUnitsBeforeCapture =
    Array.isArray(
      paypalOrderBeforeCapture
        ?.purchase_units
    )
      ? paypalOrderBeforeCapture
          .purchase_units
      : [];

  if (
    purchaseUnitsBeforeCapture.length !==
    1
  ) {
    throw new Error(
      "PayPal order must contain exactly one purchase unit."
    );
  }

  const purchaseUnitBeforeCapture =
    purchaseUnitsBeforeCapture[0];

  if (
    String(
      purchaseUnitBeforeCapture
        .reference_id ||
        ""
    ) !==
    String(existingOrder.id)
  ) {
    throw new Error(
      "PayPal purchase-unit reference does not match the database order ID."
    );
  }

  if (
    String(
      purchaseUnitBeforeCapture
        .custom_id ||
        ""
    ) !==
    String(
      existingOrder
        .reservation_id ||
        ""
    )
  ) {
    console.error(
      "PayPal reservation validation mismatch:",
      {
        paypalOrderId:
          normalizedPayPalOrderId,

        paypalReferenceId:
          purchaseUnitBeforeCapture
            .reference_id ||
          null,

        paypalCustomId:
          purchaseUnitBeforeCapture
            .custom_id ||
          null,

        databaseOrderId:
          existingOrder.id,

        databaseReservationId:
          existingOrder
            .reservation_id
      }
    );

    throw new Error(
      "PayPal purchase-unit custom ID does not match the reservation ID."
    );
  }
  
  const paypalOrder =
    await capturePayPalOrder(
      normalizedPayPalOrderId
    );

  const {
    purchaseUnit,
    capture,
    captureId,
    amountCents,
    currency:
      capturedCurrency
  } = getPayPalCaptureDetails(
    paypalOrder
  );
  

  if (
    amountCents !==
    totalAmount
  ) {
    throw new Error(
      `PayPal captured ${amountCents} cents, but the database order total is ${totalAmount} cents.`
    );
  }

  if (
    capturedCurrency !==
    currency
  ) {
    throw new Error(
      `PayPal captured ${capturedCurrency}, but the database order currency is ${currency}.`
    );
  }

  const payer =
    paypalOrder.payer ||
    {};

  const shipping =
    purchaseUnit.shipping ||
    {};

  const shippingAddress =
    normalizePayPalAddress(
      shipping.address
    ) ||
    existingOrder
      .shipping_address ||
    null;

  const payerName = [
    payer.name
      ?.given_name,

    payer.name
      ?.surname
  ]
    .filter(Boolean)
    .join(" ")
    .trim();

  const customerName =
    String(
      shipping.name
        ?.full_name ||
      payerName ||
      existingOrder
        .customer_name ||
      "Customer"
    ).trim() ||
    "Customer";

  const customerEmail =
    String(
      payer.email_address ||
      existingOrder
        .customer_email ||
      ""
    ).trim() ||
    null;

  const customerPhone =
    String(
      payer.phone
        ?.phone_number
        ?.national_number ||
      existingOrder
        .customer_phone ||
      ""
    ).trim() ||
    null;

  const alreadyProcessed =
    await completeInventoryReservation({
      supabase,

      reservationId:
        normalizeIdentifier(
          existingOrder
            .reservation_id,

          "Reservation ID"
        ),

      orderId:
        existingOrder.id,

      externalPaymentId:
        normalizedPayPalOrderId,

      orderItems
    });

  const {
    data:
      completedOrder,

    error:
      completedOrderError
  } = await supabase
    .from("orders")
    .update({
      payment_provider:
        "paypal",

      paypal_capture_id:
        captureId,

      customer_name:
        customerName,

      customer_email:
        customerEmail,

      customer_phone:
        customerPhone,

      shipping_address:
        shippingAddress,

      currency,
      subtotal,

      shipping_amount:
        shippingAmount,

      tax_amount:
        taxAmount,

      total_amount:
        totalAmount,

      payment_status:
        "paid",

      fulfillment_status:
        existingOrder
          .fulfillment_status ||
        "new",

      updated_at:
        new Date()
          .toISOString()
    })
    .eq(
      "id",
      existingOrder.id
    )
    .eq(
      "paypal_order_id",
      normalizedPayPalOrderId
    )
    .select(`
      id,
      payment_status,
      fulfillment_status,
      paypal_capture_id
    `)
    .single();

  if (
    completedOrderError ||
    !completedOrder
  ) {
    console.error(
      "PayPal was captured and inventory completed, but order update failed.",
      {
        orderId:
          existingOrder.id,

        paypalOrderId:
          normalizedPayPalOrderId,

        paypalCaptureId:
          captureId,

        capture,

        error:
          completedOrderError
      }
    );

    throw new Error(
      completedOrderError
        ?.message ||
        "Unable to finalize the paid PayPal order."
    );
  }

  /*
 * Payment is now confirmed and the order
 * has been finalized.
 *
 * Complete the cart recovery lifecycle so
 * no abandoned-cart messages can be sent
 * for this purchase.
 */
const {
  error: recoveryError
} = await supabase
  .from("cart_recovery_sessions")
  .update({
    email:
      customerEmail,

    phone:
      customerPhone,

    status:
      "completed",

    completed_at:
      new Date().toISOString(),

    /*
     * A PayPal phone number does not
     * constitute SMS marketing consent.
     */
    sms_consent:
      false
  })
  .eq(
    "reservation_id",
    existingOrder.reservation_id
  )
  .in(
    "status",
    [
      "active",
      "abandoned"
    ]
  );

if (recoveryError) {
  console.error(
    "Unable to complete PayPal cart recovery session:",
    {
      orderId:
        completedOrder.id,

      paypalOrderId:
        normalizedPayPalOrderId,

      reservationId:
        existingOrder.reservation_id,

      recoveryError
    }
  );
}

  const emailResult =
    await sendOrderConfirmationEmailSafely({
      to:
        customerEmail,

      orderId:
        completedOrder.id,

      customerName,
      currency,
      items:
        orderItems,
      subtotal,
      shippingAmount,
      taxAmount,
      totalAmount,
      shippingAddress
    });

  return {
    fulfilled: true,

    alreadyProcessed,

    orderId:
      completedOrder.id,

    paypalOrderId:
      normalizedPayPalOrderId,

    paypalCaptureId:
      completedOrder
        .paypal_capture_id,

    paymentStatus:
      completedOrder
        .payment_status,

    fulfillmentStatus:
      completedOrder
        .fulfillment_status,

    emailSent:
      emailResult.sent
  };
}