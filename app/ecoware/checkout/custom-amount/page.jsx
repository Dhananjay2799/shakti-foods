import { Suspense } from "react";
import CustomPaymentPageContent from "@/components/CustomPaymentPageContent";

export const metadata = {
  title: "Pay a Custom Amount",
  description: "Pay an invoice or an agreed amount to Simpli Ecoware by card.",
  robots: { index: false, follow: false }
};

export default function EcowareCustomAmountPage() {
  return (
    <Suspense fallback={null}>
      <CustomPaymentPageContent storefront="ecoware" />
    </Suspense>
  );
}
