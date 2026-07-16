import { NextResponse } from "next/server";
import { createSupabaseAdmin } from "@/lib/supabase-admin";

export const runtime = "nodejs";

export async function GET() {
  try {
    const supabase = createSupabaseAdmin();

    const { data, error } = await supabase
      .from("orders")
      .select("id")
      .limit(1);

    if (error) {
      throw error;
    }

    return NextResponse.json({
      connected: true,
      message: "Supabase connection is working.",
      data
    });
  } catch (error) {
    return NextResponse.json(
      {
        connected: false,
        message: error.message
      },
      { status: 500 }
    );
  }
}