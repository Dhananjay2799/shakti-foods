"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createSupabaseAdmin } from "@/lib/supabase-admin";

const allowedStatuses = [
  "new",
  "processing",
  "packed",
  "shipped",
  "delivered",
  "canceled"
];

export async function updateFulfillmentStatus(formData) {
  const orderId = String(
    formData.get("orderId") || ""
  ).trim();

  const status = String(
    formData.get("fulfillmentStatus") || ""
  ).trim();

  if (!orderId) {
    throw new Error("Missing order ID.");
  }

  if (!allowedStatuses.includes(status)) {
    throw new Error(
      "Invalid fulfillment status."
    );
  }

  /*
   * Confirm that the person performing this action
   * is signed in through Supabase Auth.
   */
  const authClient = await createClient();

  const {
    data: { user },
    error: userError
  } = await authClient.auth.getUser();

  if (userError || !user) {
    redirect("/admin/login");
  }

  /*
   * Perform the trusted database update server-side.
   * The service-role key is never sent to the browser.
   */
  const supabase = createSupabaseAdmin();

  const { error } = await supabase
    .from("orders")
    .update({
      fulfillment_status: status,
      updated_at: new Date().toISOString()
    })
    .eq("id", orderId);

  if (error) {
    console.error(
      "Unable to update fulfillment status:",
      error
    );

    throw new Error(
      error.message ||
        "Unable to update fulfillment status."
    );
  }

  revalidatePath("/admin");
  revalidatePath("/admin/orders");
  revalidatePath(`/admin/orders/${orderId}`);
}