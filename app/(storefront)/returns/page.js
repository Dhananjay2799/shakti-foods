import PolicyPage, { policyMetadata } from "@/components/PolicyPage";

export const metadata = policyMetadata("shakti_foods", "returns");

export default function ShaktiPolicyPage() {
  return (
    <main>
      <PolicyPage storefront="shakti_foods" pageId="returns" />
    </main>
  );
}
