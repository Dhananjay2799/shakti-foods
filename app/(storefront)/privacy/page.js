import PolicyPage, { policyMetadata } from "@/components/PolicyPage";

export const metadata = policyMetadata("shakti_foods", "privacy");

export default function ShaktiPolicyPage() {
  return (
    <main>
      <PolicyPage storefront="shakti_foods" pageId="privacy" />
    </main>
  );
}
