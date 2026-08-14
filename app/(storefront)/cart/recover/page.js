import { Suspense } from "react";
import CartRecoveryClient from "@/components/CartRecoveryClient";

function RecoveryLoading() {
  return (
    <main className="min-h-[100svh] bg-brand-radial pt-24 text-black md:pt-28">
      <section className="section-pad py-14 md:py-24">
        <div className="container-brand">
          <div className="mx-auto max-w-2xl rounded-[2rem] bg-white p-7 text-center shadow-soft md:p-10">
            <div className="text-xs font-black uppercase tracking-[.2em] text-black/40">
              Cart Recovery
            </div>

            <h1 className="mt-3 font-display text-4xl font-bold md:text-5xl">
              Restoring your cart...
            </h1>

            <p className="mt-4 text-sm leading-7 text-black/60">
              We’re checking current product availability and pricing.
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}

export default function CartRecoveryPage() {
  return (
    <Suspense fallback={<RecoveryLoading />}>
      <CartRecoveryClient />
    </Suspense>
  );
}