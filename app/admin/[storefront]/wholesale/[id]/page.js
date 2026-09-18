import { notFound } from "next/navigation";

export default async function WholesaleInquiryPage({ params }) {
  const resolvedParams = await Promise.resolve(params);

  // Validate storefront param
  if (resolvedParams?.storefront !== "ecoware") {
    notFound();
  }

  const inquiryId = String(resolvedParams?.id || "").trim();

  if (!inquiryId) {
    notFound();
  }

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">
        Wholesale Inquiry: {inquiryId}
      </h1>
    </div>
  );
}