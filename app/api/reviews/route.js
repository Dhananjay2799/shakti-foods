import { NextResponse } from "next/server";
import { createSupabaseAdmin } from "@/lib/supabase-admin";
import { readSignedToken } from "@/lib/signed-link";
import { REVIEW_LINK_PURPOSE } from "@/lib/review-request-email";

export const runtime = "nodejs";

function cleanText(value, maxLength = 500) {
  if (typeof value !== "string") {
    return "";
  }

  return value.trim().slice(0, maxLength);
}

/*
 * A review opened from the "How was your rice?" email carries a signed
 * code for (order, product). If that order is paid and contains this
 * product, the review is a verified purchase. Anything else (no code,
 * changed, expired, other product) is simply an ordinary review.
 */
async function findVerifiedPurchase(supabase, reviewToken, productId) {
  const token = readSignedToken(REVIEW_LINK_PURPOSE, reviewToken);

  if (!token?.o || String(token.p) !== String(productId)) {
    return null;
  }

  const { data: order } = await supabase
    .from("orders")
    .select("id, payment_status, customer_email")
    .eq("id", token.o)
    .maybeSingle();

  if (!order || order.payment_status !== "paid") {
    return null;
  }

  const { data: items } = await supabase
    .from("order_items")
    .select("product_id")
    .eq("order_id", order.id)
    .eq("product_id", String(productId))
    .limit(1);

  return items?.length
    ? { email: String(order.customer_email || "").trim().toLowerCase() || null }
    : null;
}

export async function POST(request) {
  try {
    const body = await request.json();

    const productId = cleanText(
      body.productId,
      100
    );

    const customerName = cleanText(
      body.customerName,
      150
    );

    const email = cleanText(
      body.email,
      254
    ).toLowerCase();

    const reviewTitle = cleanText(
      body.reviewTitle,
      150
    );

    const reviewText = cleanText(
      body.reviewText,
      3000
    );

    const rating = Number(body.rating);

    const reviewToken = cleanText(
      body.reviewToken,
      1000
    );

    if (!productId) {
      return NextResponse.json(
        {
          message: "Product is required."
        },
        { status: 400 }
      );
    }

    if (!customerName) {
      return NextResponse.json(
        {
          message: "Your name is required."
        },
        { status: 400 }
      );
    }

    if (
      !Number.isInteger(rating) ||
      rating < 1 ||
      rating > 5
    ) {
      return NextResponse.json(
        {
          message:
            "Please select a rating from 1 to 5 stars."
        },
        { status: 400 }
      );
    }

    if (!reviewText) {
      return NextResponse.json(
        {
          message: "Review text is required."
        },
        { status: 400 }
      );
    }

    if (
      email &&
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
        email
      )
    ) {
      return NextResponse.json(
        {
          message:
            "Please enter a valid email address."
        },
        { status: 400 }
      );
    }

    const supabase =
      createSupabaseAdmin();

    // Never trust product information sent
    // from the browser.
    const {
      data: product,
      error: productError
    } = await supabase
      .from("products")
      .select(`
        product_id,
        title,
        status,
        is_active,
        deleted_at,
        storefront
      `)
      .eq("product_id", productId)
      .is("deleted_at", null)
      .maybeSingle();

    if (productError) {
      console.error(
        "Review product lookup failed:",
        productError
      );

      return NextResponse.json(
        {
          message:
            "Unable to verify product."
        },
        { status: 500 }
      );
    }

    if (
      !product ||
      product.status !== "active" ||
      product.is_active !== true
    ) {
      return NextResponse.json(
        {
          message:
            "This product is not currently available for reviews."
        },
        { status: 404 }
      );
    }

    const verifiedPurchase =
      reviewToken
        ? await findVerifiedPurchase(
            supabase,
            reviewToken,
            product.product_id
          )
        : null;

    const {
      data: review,
      error: insertError
    } = await supabase
      .from("product_reviews")
      .insert({
        product_id: product.product_id,

        // The review belongs to the product's store (Shakti Foods or
        // Simpli Ecoware), so it appears in that store's admin.
        storefront: product.storefront,

        customer_name: customerName,

        // From the order, if the email link was used and the
        // reviewer left the email field empty.
        email:
          email ||
          verifiedPurchase?.email ||
          null,

        rating,

        review_title:
          reviewTitle || null,

        review_text: reviewText,

        // Never allow the browser to approve
        // its own review.
        status: "pending",

        // Only true when the server checked the order.
        verified_purchase: Boolean(verifiedPurchase)
      })
      .select(`
        id,
        status,
        created_at
      `)
      .single();

    if (insertError) {
      console.error(
        "Unable to create product review:",
        insertError
      );

      return NextResponse.json(
        {
          message:
            insertError.message ||
            "Unable to submit review."
        },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        reviewId: review.id,
        status: review.status,
        verifiedPurchase: Boolean(verifiedPurchase),
        message:
          "Thank you. Your review has been submitted for approval."
      },
      { status: 201 }
    );
  } catch (error) {
    console.error(
      "Product review API error:",
      error
    );

    return NextResponse.json(
      {
        message:
          error instanceof Error
            ? error.message
            : "Unable to submit review."
      },
      { status: 500 }
    );
  }
}