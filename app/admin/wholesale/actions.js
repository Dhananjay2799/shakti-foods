"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createSupabaseAdmin } from "@/lib/supabase-admin";
import {
  sendWholesaleInquiryEmailSafely
} from "@/lib/wholesale-inquiry-email";
import {
  sendWholesaleQuoteEmailSafely
} from "@/lib/wholesale-quote-email";

const VALID_STATUSES = new Set([
  "new",
  "contacted",
  "quoted",
  "won",
  "lost"
]);

async function requireAdmin() {
  const authClient = await createClient();

  const {
    data: { user },
    error
  } = await authClient.auth.getUser();

  if (error || !user) {
    redirect("/admin/login");
  }

  return user;
}

function cleanText(value, maxLength = 5000) {
  if (typeof value !== "string") {
    return "";
  }

  return value
    .trim()
    .slice(0, maxLength);
}

function buildTimestampUpdates(
  nextStatus,
  inquiry
) {
  const now = new Date().toISOString();

  const updates = {};

  if (
    nextStatus === "contacted" &&
    !inquiry.contacted_at
  ) {
    updates.contacted_at = now;
  }

  if (
    nextStatus === "quoted" &&
    !inquiry.quoted_at
  ) {
    updates.quoted_at = now;
  }

  if (nextStatus === "won") {
    if (!inquiry.won_at) {
      updates.won_at = now;
    }

    updates.lost_at = null;
  }

  if (nextStatus === "lost") {
    if (!inquiry.lost_at) {
      updates.lost_at = now;
    }

    updates.won_at = null;
  }

  return updates;
}

export async function updateWholesaleInquiry(
  formData
) {
  await requireAdmin();

  const inquiryId =
    cleanText(
      formData.get("inquiryId"),
      100
    );

  const status =
    cleanText(
      formData.get("status"),
      50
    ).toLowerCase();

  const internalNotes =
    cleanText(
      formData.get("internalNotes"),
      5000
    );

  if (!inquiryId) {
    throw new Error(
      "Wholesale inquiry ID is required."
    );
  }

  if (!VALID_STATUSES.has(status)) {
    throw new Error(
      "Invalid wholesale inquiry status."
    );
  }

  const supabase =
    createSupabaseAdmin();

  const {
    data: currentInquiry,
    error: currentInquiryError
  } = await supabase
    .from("wholesale_inquiries")
    .select(`
        id,
        status,
        customer_name,
        business_name,
        email,
        product_name,
        estimated_quantity,
        quantity_unit,
        contacted_at,
        quoted_at,
        won_at,
        lost_at
        `)
    .eq("id", inquiryId)
    .maybeSingle();

  if (currentInquiryError) {
    console.error(
      "Unable to load wholesale inquiry before update:",
      currentInquiryError
    );

    throw new Error(
      currentInquiryError.message ||
        "Unable to load wholesale inquiry."
    );
  }

  if (!currentInquiry) {
    throw new Error(
      "Wholesale inquiry does not exist."
    );
  }

  const timestampUpdates =
    buildTimestampUpdates(
      status,
      currentInquiry
    );

  const {
    error: updateError
  } = await supabase
    .from("wholesale_inquiries")
    .update({
      status,

      internal_notes:
        internalNotes || null,

      ...timestampUpdates
    })
    .eq("id", inquiryId);

  if (updateError) {
    console.error(
      "Unable to update wholesale inquiry:",
      updateError
    );

    throw new Error(
      updateError.message ||
        "Unable to update wholesale inquiry."
    );
  }

  const statusChanged =
    currentInquiry.status !== status;

    if (statusChanged) {
    const emailStatuses =
        new Set([
        "contacted",
        "quoted",
        "won",
        "lost"
        ]);

    if (emailStatuses.has(status)) {
        await sendWholesaleInquiryEmailSafely({
        customerEmail:
            currentInquiry.email,

        inquiry: {
            id:
            currentInquiry.id,

            status,

            customer_name:
            currentInquiry.customer_name,

            business_name:
            currentInquiry.business_name,

            product_name:
            currentInquiry.product_name,

            estimated_quantity:
            currentInquiry.estimated_quantity,

            quantity_unit:
            currentInquiry.quantity_unit
        }
        });
    }
    }
  
  revalidatePath(
    "/admin/wholesale"
  );

  revalidatePath(
    `/admin/wholesale/${inquiryId}`
  );

  redirect(
    `/admin/wholesale/${inquiryId}`
  );
}

export async function createWholesaleQuote(
  formData
) {
  await requireAdmin();

  const inquiryId =
    cleanText(
      formData.get("inquiryId"),
      100
    );

  const productId =
    cleanText(
      formData.get("productId"),
      200
    );

  const quantity =
    Number(
      formData.get("quantity")
    );

  const unitPrice =
    Number(
      formData.get("unitPrice")
    );

  const discount =
    Number(
      formData.get("discount") || 0
    );

  const shipping =
    Number(
      formData.get("shipping") || 0
    );

  const tax =
    Number(
      formData.get("tax") || 0
    );

  const validUntil =
    cleanText(
      formData.get("validUntil"),
      20
    );

  const paymentTerms =
    cleanText(
      formData.get("paymentTerms"),
      1000
    );

  const customerNotes =
    cleanText(
      formData.get("customerNotes"),
      5000
    );

  const internalNotes =
    cleanText(
      formData.get("quoteInternalNotes"),
      5000
    );

  if (!inquiryId) {
    throw new Error(
      "Wholesale inquiry ID is required."
    );
  }

  if (!productId) {
    throw new Error(
      "A product is required for the quote."
    );
  }

  if (
    !Number.isSafeInteger(quantity) ||
    quantity <= 0
  ) {
    throw new Error(
      "Quote quantity must be greater than zero."
    );
  }

  if (
    !Number.isFinite(unitPrice) ||
    unitPrice < 0
  ) {
    throw new Error(
      "A valid wholesale unit price is required."
    );
  }

  if (
    !Number.isFinite(discount) ||
    discount < 0 ||
    !Number.isFinite(shipping) ||
    shipping < 0 ||
    !Number.isFinite(tax) ||
    tax < 0
  ) {
    throw new Error(
      "Quote adjustments cannot be negative."
    );
  }

  const unitPriceCents =
    Math.round(unitPrice * 100);

  const discountCents =
    Math.round(discount * 100);

  const shippingCents =
    Math.round(shipping * 100);

  const taxCents =
    Math.round(tax * 100);

  const lineTotalCents =
    unitPriceCents * quantity;

  const subtotalCents =
    lineTotalCents;

  const totalCents =
    subtotalCents -
    discountCents +
    shippingCents +
    taxCents;

  if (totalCents < 0) {
    throw new Error(
      "Quote total cannot be negative."
    );
  }

  const supabase =
    createSupabaseAdmin();

    const {
      data: quoteProduct,
      error: quoteProductError
    } = await supabase
      .from("products")
      .select(`
        product_id,
        title,
        status,
        is_active,
        deleted_at
      `)
      .eq(
        "product_id",
        productId
      )
      .is(
        "deleted_at",
        null
      )
      .maybeSingle();

    if (quoteProductError) {
      console.error(
        "Unable to verify wholesale quote product:",
        quoteProductError
      );

      throw new Error(
        quoteProductError.message ||
          "Unable to verify quote product."
      );
    }

    if (
      !quoteProduct ||
      quoteProduct.status !== "active" ||
      quoteProduct.is_active !== true
    ) {
      throw new Error(
        "The selected product is not currently available."
      );
    }

  const {
    data: inquiry,
    error: inquiryError
  } = await supabase
    .from("wholesale_inquiries")
    .select(`
      id,
      customer_name,
      business_name,
      email,
      phone,
      storefront
    `)
    .eq("id", inquiryId)
    .maybeSingle();

  if (inquiryError) {
    console.error(
      "Unable to load inquiry for quote:",
      inquiryError
    );

    throw new Error(
      inquiryError.message ||
        "Unable to load wholesale inquiry."
    );
  }

  if (!inquiry) {
    throw new Error(
      "Wholesale inquiry does not exist."
    );
  }

  const quoteNumber =
    `WQ-${new Date()
      .toISOString()
      .slice(0, 10)
      .replaceAll("-", "")}-${crypto
      .randomUUID()
      .slice(0, 8)
      .toUpperCase()}`;

  const {
    data: quote,
    error: quoteError
  } = await supabase
    .from("wholesale_quotes")
    .insert({
      inquiry_id:
        inquiry.id,

      storefront:
        inquiry.storefront || "shakti",

      quote_number:
        quoteNumber,

      status:
        "draft",

      customer_name:
        inquiry.customer_name,

      business_name:
        inquiry.business_name || null,

      email:
        inquiry.email,

      phone:
        inquiry.phone || null,

      currency:
        "USD",

      subtotal_cents:
        subtotalCents,

      discount_cents:
        discountCents,

      shipping_cents:
        shippingCents,

      tax_cents:
        taxCents,

      total_cents:
        totalCents,

      valid_until:
        validUntil || null,

      payment_terms:
        paymentTerms || null,

      customer_notes:
        customerNotes || null,

      internal_notes:
        internalNotes || null
    })
    .select("id, quote_number")
    .single();

  if (quoteError || !quote) {
    console.error(
      "Unable to create wholesale quote:",
      quoteError
    );

    throw new Error(
      quoteError?.message ||
        "Unable to create wholesale quote."
    );
  }

  const {
    error: itemError
  } = await supabase
    .from("wholesale_quote_items")
    .insert({
      quote_id:
        quote.id,

      product_id:
        productId,

      product_name:
        quoteProduct.title,

      quantity,

      unit_price_cents:
        unitPriceCents,

      line_total_cents:
        lineTotalCents,

      sort_order:
        0
    });

  if (itemError) {
    console.error(
      "Unable to create wholesale quote item:",
      itemError
    );

    await supabase
      .from("wholesale_quotes")
      .delete()
      .eq("id", quote.id);

    throw new Error(
      itemError.message ||
        "Unable to create wholesale quote item."
    );
  }

  revalidatePath(
    `/admin/wholesale/${inquiryId}`
  );

  redirect(
    `/admin/wholesale/${inquiryId}?quote=${quote.id}`
  );
}

export async function sendWholesaleQuote(
  formData
) {
  await requireAdmin();

  const quoteId =
    cleanText(
      formData.get("quoteId"),
      100
    );

  if (!quoteId) {
    throw new Error(
      "Quote ID is required."
    );
  }

  const supabase =
    createSupabaseAdmin();

  const {
    data: quote,
    error: quoteError
  } = await supabase
    .from("wholesale_quotes")
    .select(`
      id,
      inquiry_id,
      quote_number,
      response_token,
      status,
      customer_name,
      business_name,
      email,
      phone,
      currency,
      subtotal_cents,
      discount_cents,
      shipping_cents,
      tax_cents,
      total_cents,
      valid_until,
      payment_terms,
      customer_notes,
      sent_at
    `)
    .eq("id", quoteId)
    .maybeSingle();

  if (
    quoteError ||
    !quote
  ) {
    throw new Error(
      quoteError?.message ||
        "Wholesale quote was not found."
    );
  }

  if (
    quote.status !== "draft"
  ) {
    redirect(
      `/admin/wholesale/${quote.inquiry_id}`
    );
  }

  const {
    data: items,
    error: itemsError
  } = await supabase
    .from(
      "wholesale_quote_items"
    )
    .select(`
      id,
      product_id,
      product_name,
      quantity,
      unit_price_cents,
      line_total_cents,
      sort_order
    `)
    .eq(
      "quote_id",
      quote.id
    )
    .order(
      "sort_order",
      {
        ascending: true
      }
    );

  if (
    itemsError ||
    !items ||
    items.length === 0
  ) {
    throw new Error(
      itemsError?.message ||
        "Quote contains no line items."
    );
  }

  const emailResult =
    await sendWholesaleQuoteEmailSafely({
      quote,
      items
    });

  if (!emailResult.sent) {
    redirect(
      `/admin/wholesale/${quote.inquiry_id}` +
        `?quoteError=email-send-failed`
    );
  }

  const now =
    new Date().toISOString();

  const {
    error: updateQuoteError
  } = await supabase
    .from("wholesale_quotes")
    .update({
      status: "sent",
      sent_at: now
    })
    .eq("id", quote.id)
    .eq("status", "draft");

  if (updateQuoteError) {
    throw new Error(
      updateQuoteError.message ||
        "Quote email was sent, but quote status could not be updated."
    );
  }

  const {
    data: inquiry
  } = await supabase
    .from("wholesale_inquiries")
    .select(`
      id,
      quoted_at
    `)
    .eq(
      "id",
      quote.inquiry_id
    )
    .maybeSingle();

  const inquiryUpdate = {
    status: "quoted",
    won_at: null,
    lost_at: null
  };

  if (!inquiry?.quoted_at) {
    inquiryUpdate.quoted_at =
      now;
  }

  const {
    error: inquiryUpdateError
  } = await supabase
    .from("wholesale_inquiries")
    .update(inquiryUpdate)
    .eq(
      "id",
      quote.inquiry_id
    );

  if (inquiryUpdateError) {
    console.error(
      "Quote sent but inquiry status update failed:",
      inquiryUpdateError
    );
  }

  revalidatePath(
    "/admin/wholesale"
  );

  revalidatePath(
    `/admin/wholesale/${quote.inquiry_id}`
  );

  redirect(
    `/admin/wholesale/${quote.inquiry_id}?quoteSent=${quote.id}`
  );
}

export async function convertWholesaleQuoteToOrder(
  formData
) {
  await requireAdmin();

  const quoteId =
    cleanText(
      formData.get("quoteId"),
      100
    );

  if (!quoteId) {
    throw new Error(
      "Quote ID is required."
    );
  }

  const supabase =
    createSupabaseAdmin();

  const {
    data: quote,
    error: quoteError
  } = await supabase
    .from("wholesale_quotes")
    .select(`
      id,
      inquiry_id,
      quote_number,
      storefront,
      status,
      customer_name,
      business_name,
      email,
      phone,
      currency,
      subtotal_cents,
      discount_cents,
      shipping_cents,
      tax_cents,
      total_cents,
      payment_terms,
      customer_notes,
      internal_notes,
      converted_at,
      converted_order_id,
      wholesale_quote_items (
        id,
        product_id,
        product_name,
        quantity,
        unit_price_cents,
        line_total_cents,
        sort_order
      )
    `)
    .eq(
      "id",
      quoteId
    )
    .maybeSingle();

  if (
    quoteError ||
    !quote
  ) {
    throw new Error(
      quoteError?.message ||
        "Wholesale quote was not found."
    );
  }

  if (
    quote.converted_order_id
  ) {
    redirect(
      `/admin/orders/${quote.converted_order_id}`
    );
  }

  if (
    quote.status !== "accepted"
  ) {
    throw new Error(
      "Only accepted wholesale quotes can be converted to orders."
    );
  }

  const items =
    (
      quote.wholesale_quote_items ||
      []
    ).sort(
      (a, b) =>
        Number(
          a.sort_order || 0
        ) -
        Number(
          b.sort_order || 0
        )
    );

  if (
    items.length === 0
  ) {
    throw new Error(
      "Wholesale quote contains no line items."
    );
  }

  const {
    data: inquiry,
    error: inquiryError
  } = await supabase
    .from("wholesale_inquiries")
    .select(`
      id,
      delivery_city,
      delivery_state,
      delivery_postal_code
    `)
    .eq(
      "id",
      quote.inquiry_id
    )
    .maybeSingle();

  if (inquiryError) {
    throw new Error(
      inquiryError.message ||
        "Unable to load wholesale delivery information."
    );
  }

  const shippingAddress =
    inquiry &&
    (
      inquiry.delivery_city ||
      inquiry.delivery_state ||
      inquiry.delivery_postal_code
    )
      ? {
          city:
            inquiry.delivery_city ||
            null,

          state:
            inquiry.delivery_state ||
            null,

          postal_code:
            inquiry.delivery_postal_code ||
            null,

          country:
            "US"
        }
      : null;

  const internalNotes = [
    `Wholesale order converted from quote ${quote.quote_number}.`,

    quote.payment_terms
      ? `Payment terms: ${quote.payment_terms}`
      : null,

    quote.internal_notes
      ? `Quote notes: ${quote.internal_notes}`
      : null
  ]
    .filter(Boolean)
    .join("\n");

  const {
    data: order,
    error: orderError
  } = await supabase
    .from("orders")
    .insert({
      storefront:
        quote.storefront || "shakti",

      order_type:
        "wholesale",

      payment_provider:
        "wholesale",

      payment_status:
        "pending",

      fulfillment_status:
        "new",

      customer_name:
        quote.customer_name,

      customer_email:
        quote.email,

      customer_phone:
        quote.phone || null,

      shipping_address:
        shippingAddress,

      shipping_method:
        "Wholesale delivery",

      currency:
        String(
          quote.currency ||
          "USD"
        ).toLowerCase(),

      subtotal:
        quote.subtotal_cents,

      discount_amount:
        quote.discount_cents,

      shipping_amount:
        quote.shipping_cents,

      tax_amount:
        quote.tax_cents,

      total_amount:
        quote.total_cents,

      internal_notes:
        internalNotes || null
    })
    .select("id")
    .single();

  if (
    orderError ||
    !order
  ) {
    console.error(
      "Unable to create wholesale order:",
      orderError
    );

    throw new Error(
      orderError?.message ||
        "Unable to create wholesale order."
    );
  }

  const orderItems =
    items.map((item) => ({
      order_id:
        order.id,

      product_id:
        item.product_id,

      product_name:
        item.product_name,

      quantity:
        item.quantity,

      unit_price:
        item.unit_price_cents,

      line_total:
        item.line_total_cents
    }));

  const {
    error: itemInsertError
  } = await supabase
    .from("order_items")
    .insert(
      orderItems
    );

  if (
    itemInsertError
  ) {
    console.error(
      "Unable to create wholesale order items:",
      itemInsertError
    );

    await supabase
      .from("orders")
      .delete()
      .eq(
        "id",
        order.id
      );

    throw new Error(
      itemInsertError.message ||
        "Unable to create wholesale order items."
    );
  }

  const now =
    new Date().toISOString();

  const {
    data: convertedQuote,
    error: conversionError
  } = await supabase
    .from("wholesale_quotes")
    .update({
      status:
        "converted",

      converted_at:
        now,

      converted_order_id:
        order.id
    })
    .eq(
      "id",
      quote.id
    )
    .eq(
      "status",
      "accepted"
    )
    .is(
      "converted_order_id",
      null
    )
    .select(`
      id,
      converted_order_id
    `)
    .maybeSingle();

  if (
    conversionError ||
    !convertedQuote
  ) {
    const {
      data: latestQuote
    } = await supabase
      .from("wholesale_quotes")
      .select(
        "converted_order_id"
      )
      .eq(
        "id",
        quote.id
      )
      .maybeSingle();

    if (
      latestQuote
        ?.converted_order_id
    ) {
      await supabase
        .from("order_items")
        .delete()
        .eq(
          "order_id",
          order.id
        );

      await supabase
        .from("orders")
        .delete()
        .eq(
          "id",
          order.id
        );

      redirect(
        `/admin/orders/${latestQuote.converted_order_id}`
      );
    }

    await supabase
      .from("order_items")
      .delete()
      .eq(
        "order_id",
        order.id
      );

    await supabase
      .from("orders")
      .delete()
      .eq(
        "id",
        order.id
      );

    throw new Error(
      conversionError?.message ||
        "Unable to finalize wholesale quote conversion."
    );
  }

  revalidatePath(
    "/admin/orders"
  );

  revalidatePath(
    `/admin/orders/${order.id}`
  );

  revalidatePath(
    "/admin/wholesale"
  );

  revalidatePath(
    `/admin/wholesale/${quote.inquiry_id}`
  );

  redirect(
    `/admin/orders/${order.id}`
  );
}