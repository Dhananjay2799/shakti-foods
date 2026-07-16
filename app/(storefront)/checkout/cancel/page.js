import { redirect } from "next/navigation";
import { createSupabaseAdmin } from "@/lib/supabase-admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export default async function CheckoutCancelPage({
  searchParams
}) {
  const reservationId =
    typeof searchParams?.reservation_id === "string"
      ? searchParams.reservation_id.trim()
      : null;

  if (reservationId) {
    const supabase = createSupabaseAdmin();

    const { error } = await supabase.rpc(
      "release_inventory_reservation",
      {
        p_reservation_id: reservationId
      }
    );

    if (error) {
      console.error(
        "Unable to release canceled reservation:",
        error
      );
    }
  }

  redirect("/cart?canceled=true");
}