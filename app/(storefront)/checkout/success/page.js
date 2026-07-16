import { Suspense } from "react";
import CheckoutSuccessClient from "@/components/CheckoutSuccessClient";

function SuccessPageLoading() {
  return (
    <main className="min-h-[100svh] bg-brand-radial pt-24 text-black md:pt-28">
      <section className="section-pad py-14 md:py-24">
        <div className="container-brand">
          <div className="max-w-3xl rounded-[2rem] bg-white p-6 shadow-lift md:p-10">
            <div className="text-sm font-bold uppercase tracking-[.22em] text-black">
              Processing Order
            </div>

            <h1 className="mt-3 font-display text-4xl font-bold text-black md:text-6xl">
              Please wait a moment.
            </h1>

            <p className="mt-5 text-lg leading-8 text-black">
              We are confirming your payment and finalizing your order.
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}

export default function CheckoutSuccessPage() {
  return (
    <Suspense fallback={<SuccessPageLoading />}>
      <CheckoutSuccessClient />
    </Suspense>
  );
}