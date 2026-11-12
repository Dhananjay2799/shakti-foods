import PolicyPage, { policyMetadata } from "@/components/PolicyPage";

export const metadata = policyMetadata("shakti_foods", "terms");

export default function ShaktiPolicyPage() {
  return (
    <main>
      <PolicyPage storefront="shakti_foods" pageId="terms" />
    </main>
  );
}
