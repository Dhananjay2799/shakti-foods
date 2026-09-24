import Link from "next/link";
import WholesaleInquiryForm from "@/components/WholesaleInquiryForm";

export const metadata = {
  title: "Wholesale | Simpli Ecoware",
  description:
    "Request wholesale pricing for Simpli Ecoware sustainable foodservice products, restaurant supply, catering, hospitality and distribution."
};

export default function EcowareWholesalePage() {
  return (
    <main className="min-h-screen bg-[#f8f5ed] pt-[132px] text-[#182114]">
      <section className="px-5 py-12 sm:px-8 sm:py-16 md:py-20">
        <div className="mx-auto max-w-[1280px]">
          <div className="grid gap-10 lg:grid-cols-[1fr_520px] lg:gap-16">
            <div className="pt-4">
              <p className="text-[11px] font-black uppercase tracking-[0.25em] text-[#527b32]">
                B2B / Wholesale
              </p>

              <h1 className="mt-5 max-w-2xl text-4xl font-black leading-[1.05] tracking-tight sm:text-5xl md:text-6xl">
                Sustainable packaging
                <br />
                built for volume.
              </h1>

              <p className="mt-6 max-w-xl text-[16px] leading-8 text-black/60">
                Request volume pricing for restaurants,
                catering businesses, hospitality teams,
                retailers, institutions and distributors.
                Tell us what you need and our team will
                prepare a custom wholesale quote.
              </p>

              <div className="mt-10 grid gap-4 sm:grid-cols-2">
                <div className="rounded-[24px] bg-[#e8e1d0] p-5">
                  <div className="text-sm font-black">
                    Volume Pricing
                  </div>

                  <p className="mt-2 text-sm leading-6 text-black/55">
                    Custom pricing based on product,
                    quantity and purchasing frequency.
                  </p>
                </div>

                <div className="rounded-[24px] bg-[#e8e1d0] p-5">
                  <div className="text-sm font-black">
                    Business Supply
                  </div>

                  <p className="mt-2 text-sm leading-6 text-black/55">
                    Built for restaurants, catering,
                    hospitality and distribution.
                  </p>
                </div>

                <div className="rounded-[24px] bg-[#e8e1d0] p-5">
                  <div className="text-sm font-black">
                    Custom Quotes
                  </div>

                  <p className="mt-2 text-sm leading-6 text-black/55">
                    Receive a formal quote with pricing,
                    shipping and payment terms.
                  </p>
                </div>

                <div className="rounded-[24px] bg-[#e8e1d0] p-5">
                  <div className="text-sm font-black">
                    Eco-Friendly Products
                  </div>

                  <p className="mt-2 text-sm leading-6 text-black/55">
                    Sugarcane bagasse tableware designed
                    for modern foodservice.
                  </p>
                </div>
              </div>

              <Link
                href="/ecoware/products"
                className="mt-8 inline-flex rounded-full border border-black/15 px-6 py-3 text-sm font-black transition hover:bg-black hover:text-white"
              >
                Browse Products
              </Link>
            </div>

            <div>
              <WholesaleInquiryForm
                storefront="ecoware"
              />
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}