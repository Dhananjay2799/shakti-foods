import nodemailer from "nodemailer";
import { NextResponse } from "next/server";
import { mailtoLink, site, whatsappLink } from "@/lib/site";

function inquiryText(body) {
  return [
    `Name: ${body.name || "-"}`,
    `Email: ${body.email || "-"}`,
    `Phone: ${body.phone || "-"}`,
    `Company: ${body.company || "-"}`,
    `Product: ${body.product || "-"}`,
    `Quantity: ${body.quantity || "-"}`,
    `Message: ${body.message || "-"}`
  ].join("\n");
}

export async function POST(request) {
  try {
    const body = await request.json();

    if (!body.name || !body.email) {
      return NextResponse.json({ message: "Name and email are required." }, { status: 400 });
    }

    const text = inquiryText(body);
    const subject = `Wholesale Inquiry - ${body.product || "Shakti Foods"}`;
    const missingSmtp = ["SMTP_HOST", "SMTP_PORT", "SMTP_USER", "SMTP_PASS"].filter((key) => !process.env[key]);

    if (missingSmtp.length) {
      return NextResponse.json({
        fallback: true,
        mailto: mailtoLink(subject, text),
        whatsapp: whatsappLink(text),
        message: "SMTP is not configured. Use email or WhatsApp fallback."
      });
    }

    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT),
      secure: Number(process.env.SMTP_PORT) === 465,
      auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
    });

    await transporter.sendMail({
      from: process.env.SMTP_FROM || process.env.SMTP_USER,
      to: process.env.INQUIRY_TO || site.email,
      replyTo: body.email,
      subject,
      text
    });

    return NextResponse.json({ message: "Inquiry sent." });
  } catch (error) {
    return NextResponse.json({ message: error.message || "Unable to send inquiry." }, { status: 500 });
  }
}
