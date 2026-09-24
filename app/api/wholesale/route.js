import nodemailer from "nodemailer";
import { NextResponse } from "next/server";
import { createSupabaseAdmin } from "@/lib/supabase-admin";
import {
  mailtoLink,
  site,
  whatsappLink
} from "@/lib/site";

export const runtime = "nodejs";

function cleanText(value, maxLength = 500) {
  if (typeof value !== "string") {
    return "";
  }

  return value.trim().slice(0, maxLength);
}

function inquiryText(data) {
  return [
    `Storefront: ${data.storefront || "-"}`,
    `Name: ${data.customerName || "-"}`,
    `Email: ${data.email || "-"}`,
    `Phone: ${data.phone || "-"}`,
    `Business: ${data.businessName || "-"}`,
    `Business Type: ${data.businessType || "-"}`,
    `Product: ${data.productName || "-"}`,
    `Estimated Quantity: ${
      data.estimatedQuantity || "-"
    }`,
    `Quantity Unit: ${data.quantityUnit || "-"}`,
    `Purchase Frequency: ${
      data.purchaseFrequency || "-"
    }`,
    `Delivery City: ${data.deliveryCity || "-"}`,
    `Delivery State: ${data.deliveryState || "-"}`,
    `Delivery ZIP: ${
      data.deliveryPostalCode || "-"
    }`,
    `Message: ${data.message || "-"}`
  ].join("\n");
}

export async function POST(request) {
  try {
    const body = await request.json();

    // 1. Derive storefront and enforce strict boundaries
    const storefront =
      body?.storefront === "ecoware"
        ? "ecoware"
        : "shakti_foods";

    /*
     * Support the new form fields while
     * remaining compatible with the current
     * WholesaleInquiryForm during migration.
     */
    const productId = cleanText(
      body.productId,
      100
    );

    const customerName = cleanText(
      body.customerName || body.name,
      150
    );

    const businessName = cleanText(
      body.businessName || body.company,
      200
    );

    const businessType = cleanText(
      body.businessType,
      100
    );

    const email = cleanText(
      body.email,
      254
    ).toLowerCase();

    const phone = cleanText(
      body.phone,
      50
    );

    const quantityRaw =
      body.estimatedQuantity ??
      body.quantity;

    const quantityUnit = cleanText(
      body.quantityUnit,
      50
    );

    const purchaseFrequency = cleanText(
      body.purchaseFrequency,
      100
    );

    const deliveryCity = cleanText(
      body.deliveryCity,
      100
    );

    const deliveryState = cleanText(
      body.deliveryState,
      100
    );

    const deliveryPostalCode = cleanText(
      body.deliveryPostalCode,
      30
    );

    const message = cleanText(
      body.message,
      3000
    );

    const legacyProductName = cleanText(
      body.product,
      250
    );

    let estimatedQuantity = null;

    if (
      quantityRaw !== undefined &&
      quantityRaw !== null &&
      String(quantityRaw).trim() !== ""
    ) {
      estimatedQuantity =
        Number(quantityRaw);

      if (
        !Number.isInteger(
          estimatedQuantity
        ) ||
        estimatedQuantity < 1
      ) {
        return NextResponse.json(
          {
            message:
              "Estimated quantity must be a positive whole number."
          },
          { status: 400 }
        );
      }
    }

    if (!customerName) {
      return NextResponse.json(
        {
          message:
            "Your name is required."
        },
        { status: 400 }
      );
    }

    if (
      !email ||
      !email.includes("@")
    ) {
      return NextResponse.json(
        {
          message:
            "A valid email address is required."
        },
        { status: 400 }
      );
    }

    const supabase =
      createSupabaseAdmin();

    let product = null;

    /*
     * New PDP form:
     * productId is sent and we verify the
     * product directly against Supabase.
     */
    if (productId) {
      const {
        data,
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
        .eq(
          "product_id",
          productId
        )
        // 2. Scope lookup by storefront
        .eq(
          "storefront",
          storefront
        )
        .is(
          "deleted_at",
          null
        )
        .maybeSingle();

      if (productError) {
        console.error(
          "Wholesale product lookup failed:",
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
        !data ||
        data.status !== "active" ||
        data.is_active !== true
      ) {
        return NextResponse.json(
          {
            message:
              "This product is not currently available."
          },
          { status: 404 }
        );
      }

      product = data;
    }

    /*
     * During migration the old form only
     * sends product name, not productId.
     *
     * This keeps the existing form working
     * until we update it in the next step.
     */
    const productName =
      product?.title ||
      legacyProductName ||
      "General Wholesale Inquiry";

    const resolvedProductId =
      product?.product_id || null;

    const inquiryData = {
      storefront,
      productId:
        resolvedProductId,

      productName,

      customerName,
      businessName,
      businessType,
      email,
      phone,
      estimatedQuantity,
      quantityUnit,
      purchaseFrequency,
      deliveryCity,
      deliveryState,
      deliveryPostalCode,
      message
    };

    /*
     * Save the lead FIRST.
     *
     * Email delivery should never be the
     * system of record for a B2B inquiry.
     */
    const {
      data: inquiry,
      error: insertError
    } = await supabase
      .from("wholesale_inquiries")
      .insert({
        // 3. Storefront explicit insert
        storefront,

        product_id:
          resolvedProductId,

        product_name:
          productName,

        customer_name:
          customerName,

        business_name:
          businessName || null,

        business_type:
          businessType || null,

        email,

        phone:
          phone || null,

        estimated_quantity:
          estimatedQuantity,

        quantity_unit:
          quantityUnit || null,

        purchase_frequency:
          purchaseFrequency || null,

        delivery_city:
          deliveryCity || null,

        delivery_state:
          deliveryState || null,

        delivery_postal_code:
          deliveryPostalCode || null,

        message:
          message || null,

        status:
          "new"
      })
      .select(`
        id,
        status,
        created_at
      `)
      .single();

    if (insertError) {
      console.error(
        "Unable to save wholesale inquiry:",
        insertError
      );

      return NextResponse.json(
        {
          message:
            insertError.message ||
            "Unable to submit wholesale inquiry."
        },
        { status: 500 }
      );
    }

    /*
     * Prepare the internal sales
     * notification.
     */
    const text =
      inquiryText(inquiryData);

    const subject =
      `Wholesale Inquiry - ${productName}`;

    const missingSmtp = [
      "SMTP_HOST",
      "SMTP_PORT",
      "SMTP_USER",
      "SMTP_PASS"
    ].filter(
      (key) =>
        !process.env[key]
    );

    /*
     * IMPORTANT:
     * The inquiry is already safely stored
     * in Supabase at this point.
     *
     * Missing SMTP therefore does not make
     * the customer submission fail.
     */
    if (missingSmtp.length) {
      return NextResponse.json(
        {
          success: true,
          saved: true,
          fallback: true,

          inquiryId:
            inquiry.id,

          status:
            inquiry.status,

          mailto:
            mailtoLink(
              subject,
              text
            ),

          whatsapp:
            whatsappLink(text),

          message:
            "Wholesale inquiry received successfully."
        },
        { status: 201 }
      );
    }

    /*
     * Try to notify the sales/admin inbox.
     * If email fails, preserve the database
     * lead and return fallback contact links.
     */
    try {
      const transporter =
        nodemailer.createTransport({
          host:
            process.env.SMTP_HOST,

          port:
            Number(
              process.env.SMTP_PORT
            ),

          secure:
            Number(
              process.env.SMTP_PORT
            ) === 465,

          auth: {
            user:
              process.env.SMTP_USER,

            pass:
              process.env.SMTP_PASS
          }
        });

      await transporter.sendMail({
        from:
          process.env.SMTP_FROM ||
          process.env.SMTP_USER,

        to:
          process.env.INQUIRY_TO ||
          site.email,

        replyTo:
          email,

        subject,

        text
      });

      return NextResponse.json(
        {
          success: true,
          saved: true,
          emailSent: true,

          inquiryId:
            inquiry.id,

          status:
            inquiry.status,

          message:
            "Wholesale inquiry received successfully."
        },
        { status: 201 }
      );
    } catch (emailError) {
      console.error(
        "Wholesale notification email failed:",
        emailError
      );

      return NextResponse.json(
        {
          success: true,
          saved: true,
          emailSent: false,
          fallback: true,

          inquiryId:
            inquiry.id,

          status:
            inquiry.status,

          mailto:
            mailtoLink(
              subject,
              text
            ),

          whatsapp:
            whatsappLink(text),

          message:
            "Wholesale inquiry received successfully."
        },
        { status: 201 }
      );
    }
  } catch (error) {
    console.error(
      "Wholesale inquiry API error:",
      error
    );

    return NextResponse.json(
      {
        message:
          error instanceof Error
            ? error.message
            : "Unable to submit wholesale inquiry."
      },
      { status: 500 }
    );
  }
}