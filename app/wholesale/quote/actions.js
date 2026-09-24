"use server";

import {
  redirect
} from "next/navigation";

import {
  revalidatePath
} from "next/cache";

import {
  createSupabaseAdmin
} from "@/lib/supabase-admin";

function cleanToken(value) {
  if (
    typeof value !== "string"
  ) {
    return "";
  }

  return value
    .trim()
    .slice(0, 100);
}

async function loadActionableQuote(token) {
  if (!token || typeof token !== "string" || !token.trim()) {
    throw new Error("Invalid or missing quote token.");
  }

  const supabase = createSupabaseAdmin();

  const { data: quote, error } = await supabase
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
      subtotal_cents,
      discount_cents,
      shipping_cents,
      tax_cents,
      total_cents,
      payment_terms,
      response_token,
      valid_until,
      sent_at,
      accepted_at,
      declined_at,
      expired_at,
      created_at,
      wholesale_quote_items (
        id,
        product_id,
        product_name,
        quantity,
        unit_price_cents,
        line_total_cents
      )
    `)
    .eq("response_token", token.trim())
    .maybeSingle();

  if (error || !quote) {
    throw new Error(error?.message || "Quote was not found.");
  }

  if (quote.status !== "sent") {
    return {
      supabase,
      quote,
      actionable: false,
    };
  }

  if (quote.valid_until && new Date(`${quote.valid_until}T23:59:59`) < new Date()) {
    const now = new Date().toISOString();

    await supabase
      .from("wholesale_quotes")
      .update({
        status: "expired",
        expired_at: now,
      })
      .eq("id", quote.id)
      .eq("status", "sent");

    return {
      supabase,
      quote: {
        ...quote,
        status: "expired",
        expired_at: now,
      },
      actionable: false,
    };
  }

  return {
    supabase,
    quote,
    actionable: true,
  };
}

export async function acceptWholesaleQuote(
  formData
) {
  const token =
    cleanToken(
      formData.get("token")
    );

  if (!token) {
    throw new Error(
      "Quote token is required."
    );
  }

  const {
    supabase,
    quote,
    actionable
  } =
    await loadActionableQuote(
      token
    );

  if (!actionable) {
    redirect(
      `/wholesale/quote?token=${encodeURIComponent(
        token
      )}`
    );
  }

  const now =
    new Date().toISOString();

  const {
    data: updatedQuote,
    error: quoteUpdateError
  } = await supabase
    .from("wholesale_quotes")
    .update({
      status: "accepted",
      accepted_at: now,
      declined_at: null
    })
    .eq(
      "id",
      quote.id
    )
    .eq(
      "status",
      "sent"
    )
    .select("id")
    .maybeSingle();

  if (
    quoteUpdateError ||
    !updatedQuote
  ) {
    throw new Error(
      quoteUpdateError?.message ||
        "Unable to accept quote."
    );
  }

  const {
    error: inquiryError
  } = await supabase
    .from(
      "wholesale_inquiries"
    )
    .update({
      status: "won",
      won_at: now,
      lost_at: null
    })
    .eq(
      "id",
      quote.inquiry_id
    )
    .eq(
      "storefront",
      quote.storefront
    );

  if (inquiryError) {
    throw new Error(
      inquiryError.message ||
        "Quote was accepted but the opportunity could not be updated."
    );
  }

  const adminWholesaleBase =
    quote.storefront === "ecoware"
      ? "/admin/ecoware/wholesale"
      : "/admin/wholesale";

  revalidatePath(
    `/wholesale/quote`
  );

  revalidatePath(
    `${adminWholesaleBase}/${quote.inquiry_id}`
  );

  revalidatePath(
    adminWholesaleBase
  );

  redirect(
    `/wholesale/quote?token=${encodeURIComponent(
      token
    )}`
  );
}

export async function declineWholesaleQuote(
  formData
) {
  const token =
    cleanToken(
      formData.get("token")
    );

  if (!token) {
    throw new Error(
      "Quote token is required."
    );
  }

  const {
    supabase,
    quote,
    actionable
  } =
    await loadActionableQuote(
      token
    );

  if (!actionable) {
    redirect(
      `/wholesale/quote?token=${encodeURIComponent(
        token
      )}`
    );
  }

  const now =
    new Date().toISOString();

  const {
    data: updatedQuote,
    error: quoteUpdateError
  } = await supabase
    .from("wholesale_quotes")
    .update({
      status: "declined",
      declined_at: now,
      accepted_at: null
    })
    .eq(
      "id",
      quote.id
    )
    .eq(
      "status",
      "sent"
    )
    .select("id")
    .maybeSingle();

  if (
    quoteUpdateError ||
    !updatedQuote
  ) {
    throw new Error(
      quoteUpdateError?.message ||
        "Unable to decline quote."
    );
  }

  const {
    error: inquiryError
  } = await supabase
    .from(
      "wholesale_inquiries"
    )
    .update({
      status: "lost",
      lost_at: now,
      won_at: null
    })
    .eq(
      "id",
      quote.inquiry_id
    )
    .eq(
      "storefront",
      quote.storefront
    );

  if (inquiryError) {
    throw new Error(
      inquiryError.message ||
        "Quote was declined but the opportunity could not be updated."
    );
  }

  const adminWholesaleBase =
    quote.storefront === "ecoware"
      ? "/admin/ecoware/wholesale"
      : "/admin/wholesale";

  revalidatePath(
    `/wholesale/quote`
  );

  revalidatePath(
    `${adminWholesaleBase}/${quote.inquiry_id}`
  );

  revalidatePath(
    adminWholesaleBase
  );

  redirect(
    `/wholesale/quote?token=${encodeURIComponent(
      token
    )}`
  );
}