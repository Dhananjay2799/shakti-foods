import Link from "next/link";

export default function SubscriptionSuccessPage() {
  return (
    <main className="min-h-screen bg-[#f8f6f1] px-5 py-24">
      <div className="mx-auto max-w-2xl rounded-[2rem] bg-white p-8 text-center shadow-soft md:p-12">
        <div className="text-xs font-bold uppercase tracking-[.18em] text-black/40">
          Shakti Foods
        </div>

        <h1 className="mt-3 font-display text-4xl font-bold text-black">
          Subscription Started
        </h1>

        <p className="mt-4 leading-7 text-black/60">
          Thank you. Your recurring order has been received and is being finalized.
        </p>

        <Link
          href="/products"
          className="mt-7 inline-flex rounded-full bg-black px-6 py-4 font-bold text-white"
        >
          Continue Shopping
        </Link>
      </div>
    </main>
  );
}