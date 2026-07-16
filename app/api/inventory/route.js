import { NextResponse } from "next/server";
import { createSupabaseAdmin } from "@/lib/supabase-admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const supabase = createSupabaseAdmin();

    const { data, error } = await supabase
      .from("inventory")
      .select(
        "product_id, product_name, stock_quantity, reserved_quantity, low_stock_threshold, is_active"
      )
      .order("product_name");

    if (error) {
      throw error;
    }

    return NextResponse.json({
      success: true,
      inventory: data || []
    });
  } catch (error) {
    console.error("Inventory API error:", error);

    return NextResponse.json(
      {
        success: false,
        message: error.message || "Unable to load inventory."
      },
      { status: 500 }
    );
  }
}