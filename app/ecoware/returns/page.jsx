import PolicyPage, { policyMetadata } from "@/components/PolicyPage";

export const metadata = policyMetadata("ecoware", "returns");

export default function EcowarePolicyPage() {
  // The Ecoware layout already wraps pages in <main>.
  return <PolicyPage storefront="ecoware" pageId="returns" />;
}
