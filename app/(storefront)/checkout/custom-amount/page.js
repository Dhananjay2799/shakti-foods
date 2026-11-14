import { Suspense } from "react";
import CustomPaymentPageContent from "@/components/CustomPaymentPageContent";

export const metadata = {
  title: "Pay a Custom Amount",
  description: "Pay an invoice or an agreed amount to Shakti Foods by card or PayPal.",
  robots: { index: false, follow: false }
};

export default function CustomAmountPage() {
  return (
    <Suspense fallback={null}>
      <CustomPaymentPageContent storefront="shakti_foods" />
    </Suspense>
  );
}
