import { notFound } from "next/navigation";
import { getAdminStorefront } from "@/lib/admin-storefronts";
import { createSupabaseAdmin } from "@/lib/supabase-admin";

export default async function CustomerAddressesSettingsPage({ params }) {
  const resolvedParams = await Promise.resolve(params || {});

  const storefront = await getAdminStorefront(resolvedParams.storefront);
  if (!storefront) notFound();

  const customerId = String(resolvedParams.customerId || "").trim();
  if (!customerId) notFound();

  const supabase = createSupabaseAdmin();

  // Validate storefront access
  const { data: storefrontOrder } = await supabase
    .from("orders")
    .select("id")
    .eq("customer_id", customerId)
    .eq("storefront_id", storefront.id)
    .limit(1)
    .maybeSingle();

  if (!storefrontOrder) notFound();

  // Fetch shared customer addresses
  const { data: addresses } = await supabase
    .from("customer_addresses")
    .select("*")
    .eq("customer_id", customerId)
    .order("is_default", { ascending: false });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">Customer Addresses</h1>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {addresses && addresses.length > 0 ? (
          addresses.map((address) => (
            <div key={address.id} className="rounded-lg border border-gray-200 p-4 shadow-sm relative">
              {address.is_default && (
                <span className="absolute top-3 right-3 rounded bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-800">
                  Default
                </span>
              )}
              <p className="font-medium text-gray-900">{address.first_name} {address.last_name}</p>
              <p className="text-sm text-gray-600">{address.address_line1}</p>
              {address.address_line2 && <p className="text-sm text-gray-600">{address.address_line2}</p>}
              <p className="text-sm text-gray-600">{address.city}, {address.state} {address.postal_code}</p>
              <p className="text-sm text-gray-600">{address.country}</p>
            </div>
          ))
        ) : (
          <p className="text-sm text-gray-500">No addresses on file for this customer.</p>
        )}
      </div>
    </div>
  );
}