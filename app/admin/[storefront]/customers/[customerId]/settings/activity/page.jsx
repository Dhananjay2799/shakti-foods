import { notFound } from "next/navigation";
import { getAdminStorefront } from "@/lib/admin-storefronts";
import { createSupabaseAdmin } from "@/lib/supabase-admin";

export default async function CustomerActivitySettingsPage({ params }) {
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

  // Fetch activity log filtered by both customer_id AND storefront_id
  const { data: activities } = await supabase
    .from("activity_log")
    .select("*")
    .eq("customer_id", customerId)
    .eq("storefront_id", storefront.id)
    .order("created_at", { ascending: false });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">Activity Log</h1>
      </div>

      <div className="rounded-lg border border-gray-200 bg-white shadow-sm">
        {activities && activities.length > 0 ? (
          <ul className="divide-y divide-gray-200">
            {activities.map((item) => (
              <li key={item.id} className="p-4">
                <p className="text-sm font-medium text-gray-900">{item.action}</p>
                <p className="text-xs text-gray-500">{item.description}</p>
                <span className="text-xs text-gray-400">{new Date(item.created_at).toLocaleString()}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="p-4 text-sm text-gray-500">No activity recorded for this storefront.</p>
        )}
      </div>
    </div>
  );
}