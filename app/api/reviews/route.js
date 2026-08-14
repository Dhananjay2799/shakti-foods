import { NextResponse } from "next/server";
import { createSupabaseAdmin } from "@/lib/supabase-admin";

export const runtime = "nodejs";

function cleanText(value, maxLength = 500) {
  if (typeof value !== "string") {
    return "";
  }

  return value.trim().slice(0, maxLength);
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
        deleted_at
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

    const {
      data: review,
      error: insertError
    } = await supabase
      .from("product_reviews")
      .insert({
        product_id: product.product_id,
        customer_name: customerName,

        email:
          email || null,

        rating,

        review_title:
          reviewTitle || null,

        review_text: reviewText,

        // Never allow the browser to approve
        // its own review.
        status: "pending",

        verified_purchase: false
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