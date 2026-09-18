import { notFound } from "next/navigation";
import { getAdminStorefront } from "@/lib/admin-storefronts";
import { createSupabaseAdmin } from "@/lib/supabase-admin";

export default async function CustomerDocumentsSettingsPage({ params }) {
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

  // Fetch shared customer documents
  const { data: documents } = await supabase
    .from("customer_documents")
    .select("*")
    .eq("customer_id", customerId)
    .order("created_at", { ascending: false });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">Customer Documents</h1>
      </div>

      <div className="rounded-lg border border-gray-200 bg-white shadow-sm">
        {documents && documents.length > 0 ? (
          <ul className="divide-y divide-gray-200">
            {documents.map((doc) => (
              <li key={doc.id} className="p-4 flex justify-between items-center">
                <div>
                  <p className="font-medium text-gray-900">{doc.name || doc.file_name}</p>
                  <p className="text-xs text-gray-500">Uploaded: {new Date(doc.created_at).toLocaleDateString()}</p>
                </div>
                {doc.file_url && (
                  <a href={doc.file_url} target="_blank" rel="noopener noreferrer" className="text-sm text-blue-600 hover:underline">
                    View File
                  </a>
                )}
              </li>
            ))}
          </ul>
        ) : (
          <p className="p-4 text-sm text-gray-500">No documents uploaded for this customer.</p>
        )}
      </div>
    </div>
  );
}