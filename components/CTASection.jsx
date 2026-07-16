import Link from "next/link";

export default function CTASection() {
  return (
    <section className="section-pad bg-brand-radial py-16 text-black md:py-24">
      <div className="container-brand rounded-[2rem] bg-[#fff8ee] p-5 text-black shadow-lift md:rounded-[2.5rem] md:p-14">
        <div className="max-w-4xl">
          <div className="text-xs font-bold uppercase tracking-[.22em] text-black md:text-sm md:tracking-[.28em]">Business-ready flow</div>
          <h2 className="mobile-section-title mt-3 font-display font-bold leading-tight text-black md:text-6xl">Retail checkout for small packs. Wholesale inquiry for bulk orders.</h2>
          <p className="mt-4 text-base leading-7 text-black md:mt-5 md:text-lg md:leading-8">
            This hybrid model keeps mobile checkout fast for regular buyers while giving restaurants,
            caterers, and wholesale customers a better way to request custom pricing and shipping.
          </p>
          <div className="mt-7 grid gap-3 sm:flex md:mt-8">
            <Link href="/products" className="rounded-full bg-black px-7 py-4 text-center font-bold text-white">Shop Products</Link>
            <Link href="/contact" className="rounded-full bg-brand.sand px-7 py-4 text-center font-bold text-black">Wholesale Inquiry</Link>
          </div>
        </div>
      </div>
    </section>
  );
}
