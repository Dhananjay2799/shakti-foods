import { notFound } from "next/navigation";
import { getAdminStorefront } from "@/lib/admin-storefronts";
import { createSupabaseAdmin } from "@/lib/supabase-admin";

export default async function CustomerSettingsPage({ params }) {
  const resolvedParams = await Promise.resolve(params || {});

  // 1. Resolve storefront first
  const storefront = await getAdminStorefront(resolvedParams.storefront);
  if (!storefront) notFound();

  const customerId = String(resolvedParams.customerId || "").trim();
  if (!customerId) notFound();

  const supabase = createSupabaseAdmin();

  // Customers are shared across storefronts. Verify the customer exists.
  const { data: existingCustomer, error: customerLookupError } = await supabase
    .from("customers")
    .select("id")
    .eq("id", customerId)
    .maybeSingle();

  if (customerLookupError || !existingCustomer) notFound();

  // 3. Query shared customer profile (no storefront filter)
  const { data: customer, error } = await supabase
    .from("customers")
    .select("*")
    .eq("id", customerId)
    .maybeSingle();

  if (error || !customer) notFound();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">Customer Profile</h1>
        <p className="text-sm text-gray-500">Profile for {customer.full_name || customer.email || "Customer"}</p>
      </div>

      <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-xs font-medium text-gray-500 uppercase">First Name</label>
            <p className="text-base font-medium text-gray-900">{customer.full_name || "-"}</p>
          </div>
          
          <div>
            <label className="text-xs font-medium text-gray-500 uppercase">Email</label>
            <p className="text-base font-medium text-gray-900">{customer.email || "-"}</p>
          </div>
          <div>
            <label className="text-xs font-medium text-gray-500 uppercase">Phone</label>
            <p className="text-base font-medium text-gray-900">{customer.phone || "-"}</p>
          </div>
        </div>
      </div>
    </div>
  );
}