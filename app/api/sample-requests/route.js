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

    const productId = cleanText(body.productId, 100);
    const customerName = cleanText(body.customerName, 150);
    const businessName = cleanText(body.businessName, 150);
    const businessType = cleanText(body.businessType, 100);
    const email = cleanText(body.email, 254).toLowerCase();
    const phone = cleanText(body.phone, 50);
    const notes = cleanText(body.notes, 2000);

    const addressLine1 = cleanText(body.addressLine1, 200);
    const addressLine2 = cleanText(body.addressLine2, 200);
    const city = cleanText(body.city, 100);
    const state = cleanText(body.state, 100);
    const postalCode = cleanText(body.postalCode, 30);
    const country = cleanText(body.country || "US", 100);

    const estimatedMonthlyQuantity =
      body.estimatedMonthlyQuantity === "" ||
      body.estimatedMonthlyQuantity === null ||
      body.estimatedMonthlyQuantity === undefined
        ? null
        : Number(body.estimatedMonthlyQuantity);

    if (!productId) {
      return NextResponse.json(
        { message: "Product is required." },
        { status: 400 }
      );
    }

    if (!customerName) {
      return NextResponse.json(
        { message: "Your name is required." },
        { status: 400 }
      );
    }

    if (!email || !email.includes("@")) {
      return NextResponse.json(
        { message: "A valid email address is required." },
        { status: 400 }
      );
    }

    if (
      estimatedMonthlyQuantity !== null &&
      (!Number.isInteger(estimatedMonthlyQuantity) ||
        estimatedMonthlyQuantity < 1)
    ) {
      return NextResponse.json(
        {
          message:
            "Estimated monthly quantity must be a positive whole number."
        },
        { status: 400 }
      );
    }

    if (
      !addressLine1 ||
      !city ||
      !state ||
      !postalCode ||
      !country
    ) {
      return NextResponse.json(
        {
          message:
            "A complete shipping address is required."
        },
        { status: 400 }
      );
    }

    const supabase = createSupabaseAdmin();

    // Never trust the product name coming from the browser.
    const { data: product, error: productError } =
        await supabase
            .from("products")
            .select(`
            product_id,
            title,
            category,
            status,
            is_active,
            deleted_at
            `)
            .eq("product_id", productId)
            .is("deleted_at", null)
            .maybeSingle();

    if (productError) {
      console.error(
        "Sample request product lookup failed:",
        productError
      );

      return NextResponse.json(
        { message: "Unable to verify product." },
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
                "This product is not currently available."
            },
            { status: 404 }
        );
    }

    /*
    * Free samples are currently available
    * only for active Simpli Ecoware /
    * tableware products.
    */
    if (product.category !== "tableware") {
      return NextResponse.json(
        {
          message:
            "Free samples are currently available for Simpli Ecoware products only."
        },
        { status: 400 }
      );
    }

    const { data: sampleRequest, error: insertError } =
      await supabase
        .from("sample_requests")
        .insert({
          product_id: product.product_id,
          product_name: product.title,

          customer_name: customerName,
          business_name: businessName || null,
          business_type: businessType || null,

          email,
          phone: phone || null,

          estimated_monthly_quantity:
            estimatedMonthlyQuantity,

          shipping_address: {
            line1: addressLine1,
            line2: addressLine2 || null,
            city,
            state,
            postal_code: postalCode,
            country
          },

          notes: notes || null,

          status: "new"
        })
        .select("id, status, created_at")
        .single();

    if (insertError) {
      console.error(
        "Unable to create sample request:",
        insertError
      );

      return NextResponse.json(
        {
          message:
            insertError.message ||
            "Unable to submit sample request."
        },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        requestId: sampleRequest.id,
        status: sampleRequest.status
      },
      { status: 201 }
    );
  } catch (error) {
    console.error(
      "Sample request API error:",
      error
    );

    return NextResponse.json(
      {
        message:
          error instanceof Error
            ? error.message
            : "Unable to submit sample request."
      },
      { status: 500 }
    );
  }
}