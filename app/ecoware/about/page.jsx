import Link from "next/link";
import {
  ArrowRight,
  Building2,
  House,
  Leaf,
  PartyPopper,
  ShieldCheck,
  Truck,
  UtensilsCrossed
} from "lucide-react";

/*
 * Simpli Ecoware "About" page (linked from the header and footer menus).
 *
 * The copy only restates what the Simpli Ecoware site already says elsewhere
 * (home page, footer, sustainability page, checkout options). Add the brand's
 * own story — founding, team, location — here when it is ready.
 */

export const metadata = {
  title: "About",
  description:
    "Simpli Ecoware makes sustainable plates, bowls, trays and food-service packaging from sugarcane bagasse for homes, restaurants, caterers, events and wholesale buyers."
};

const PRODUCT_TYPES = [
  "Plates",
  "Bowls",
  "Trays",
  "Food-service packaging"
];

const AUDIENCES = [
  {
    icon: House,
    title: "Homes & everyday meals",
    text: "Practical plant-fiber tableware for family meals, parties and gatherings at home."
  },
  {
    icon: UtensilsCrossed,
    title: "Restaurants & food trucks",
    text: "Plates, bowls, trays and packaging built for busy food-service operations."
  },
  {
    icon: PartyPopper,
    title: "Caterers & events",
    text: "Tableware for catering, hospitality teams, schools and event companies."
  },
  {
    icon: Building2,
    title: "Wholesale buyers",
    text: "Volume pricing and custom quotes for businesses and distributors that buy in bulk."
  }
];

export default function EcowareAboutPage() {
  return (
    <main className="min-h-screen bg-[#faf8f2] text-black">
      {/* =====================================================
          HERO (top padding clears the absolute Ecoware header)
      ===================================================== */}

      <section
        className="
          relative
          overflow-hidden
          bg-[#173a18]
          bg-[linear-gradient(90deg,rgba(15,48,17,0.97),rgba(28,77,27,0.82)),url('/images/ecoware-body-bg.png')]
          bg-cover
          bg-center
        "
      >
        <div className="mx-auto max-w-[1440px] px-4 pb-16 pt-[150px] text-white sm:px-8 sm:pb-20 sm:pt-[170px] lg:px-12 lg:pb-24 lg:pt-[190px]">
          <p className="text-[11px] font-black uppercase tracking-[0.3em] text-white/75">
            About Simpli Ecoware
          </p>

          <h1 className="mt-5 max-w-3xl text-[44px] font-black leading-[0.92] tracking-[-0.05em] sm:text-[60px] lg:text-[72px]">
            Better tableware.
            <br />
            Smaller footprint.
          </h1>

          <p className="mt-6 max-w-2xl text-base leading-7 text-white/85 sm:text-lg sm:leading-8">
            Simpli Ecoware makes sustainable plates, bowls, trays and
            food-service packaging designed for homes, restaurants, caterers,
            events and wholesale buyers.
          </p>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Link
              href="/ecoware/products"
              className="inline-flex min-h-[52px] items-center justify-center rounded-full bg-white px-7 text-sm font-black text-black transition hover:bg-white/90"
            >
              Shop Products
              <ArrowRight className="ml-2 h-4 w-4" aria-hidden="true" />
            </Link>

            <Link
              href="/ecoware/sustainability"
              className="inline-flex min-h-[52px] items-center justify-center rounded-full border border-white/70 px-7 text-sm font-black text-white transition hover:bg-white hover:text-black"
            >
              Our Sustainability Approach
            </Link>
          </div>
        </div>
      </section>

      {/* =====================================================
          WHAT WE MAKE
      ===================================================== */}

      <section className="mx-auto max-w-[1440px] px-4 py-14 sm:px-8 sm:py-20 lg:px-12">
        <div className="grid gap-8 lg:grid-cols-[320px_minmax(0,1fr)] lg:gap-20">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.26em] text-black/40">
              What we make
            </p>

            <h2 className="mt-3 text-[30px] font-black leading-none tracking-[-0.04em] sm:text-[38px]">
              Made from sugarcane bagasse.
            </h2>

            <div className="mt-4 h-[3px] w-10 rounded-full bg-[#4d7c2f]" />
          </div>

          <div className="max-w-[780px]">
            <p className="text-[15px] leading-7 text-black/65 sm:text-base sm:leading-8">
              Sugarcane bagasse is the plant-fiber material used across the
              Simpli Ecoware food-service collection. We use it to make
              everyday tableware that is ready for real meals — from a family
              dinner to a full catering order.
            </p>

            <ul className="mt-6 flex flex-wrap gap-2.5">
              {PRODUCT_TYPES.map((type) => (
                <li
                  key={type}
                  className="inline-flex items-center gap-2 rounded-full border border-[#dbe3ce] bg-[#f1f6e8] px-4 py-2 text-sm font-bold text-[#2f5a1c]"
                >
                  <Leaf className="h-4 w-4" aria-hidden="true" />
                  {type}
                </li>
              ))}
            </ul>

            <p className="mt-6 text-sm leading-6 text-black/50">
              Each product page lists the specifications that apply to that
              product, so you can check sizes and materials before you order.
            </p>
          </div>
        </div>
      </section>

      {/* =====================================================
          WHO WE SERVE
      ===================================================== */}

      <section className="border-y border-black/10 bg-[#f4f1e8]">
        <div className="mx-auto max-w-[1440px] px-4 py-14 sm:px-8 sm:py-20 lg:px-12">
          <p className="text-[10px] font-black uppercase tracking-[0.26em] text-black/40">
            Who we serve
          </p>

          <h2 className="mt-3 max-w-2xl text-[30px] font-black leading-none tracking-[-0.04em] sm:text-[38px]">
            Sustainable solutions for every table.
          </h2>

          <div className="mt-9 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {AUDIENCES.map(({ icon: Icon, title, text }) => (
              <article
                key={title}
                className="rounded-[22px] border border-black/10 bg-white p-6"
              >
                <span className="flex h-11 w-11 items-center justify-center rounded-full bg-[#f1f6e8] text-[#4d7c2f]">
                  <Icon className="h-5 w-5" aria-hidden="true" />
                </span>

                <h3 className="mt-5 text-lg font-black tracking-[-0.02em]">
                  {title}
                </h3>

                <p className="mt-2 text-sm leading-6 text-black/55">
                  {text}
                </p>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* =====================================================
          HOW WE WORK
      ===================================================== */}

      <section className="mx-auto max-w-[1440px] px-4 py-14 sm:px-8 sm:py-20 lg:px-12">
        <div className="grid gap-5 lg:grid-cols-2">
          <article className="rounded-[26px] border border-black/10 bg-white p-6 sm:p-8">
            <span className="flex h-11 w-11 items-center justify-center rounded-full bg-[#f1f6e8] text-[#4d7c2f]">
              <ShieldCheck className="h-5 w-5" aria-hidden="true" />
            </span>

            <h2 className="mt-5 text-2xl font-black tracking-[-0.03em]">
              Honest about certifications
            </h2>

            <p className="mt-3 text-[15px] leading-7 text-black/60">
              We only show a certification on a product once its supporting
              documentation has been reviewed and verified. Our sustainability
              page explains the standards that apply to compostable
              food-service products and lists the verified records.
            </p>

            <Link
              href="/ecoware/sustainability"
              className="mt-6 inline-flex items-center text-sm font-black text-[#2f5a1c] transition hover:text-black"
            >
              Explore certifications
              <ArrowRight className="ml-2 h-4 w-4" aria-hidden="true" />
            </Link>
          </article>

          <article className="rounded-[26px] border border-black/10 bg-white p-6 sm:p-8">
            <span className="flex h-11 w-11 items-center justify-center rounded-full bg-[#fbf2df] text-[#9b6819]">
              <Truck className="h-5 w-5" aria-hidden="true" />
            </span>

            <h2 className="mt-5 text-2xl font-black tracking-[-0.03em]">
              Easy to try, easy to order
            </h2>

            <p className="mt-3 text-[15px] leading-7 text-black/60">
              Businesses can request free samples to evaluate quality,
              dimensions and performance before placing a larger order, and
              request volume pricing or a custom quote. We ship within the
              United States, and local pickup is available in Weston, Florida.
            </p>

            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
              <Link
                href="/ecoware/sample-requests"
                className="inline-flex min-h-[48px] items-center justify-center rounded-full bg-black px-6 text-sm font-black text-white transition hover:bg-black/80"
              >
                Request Samples
              </Link>

              <Link
                href="/ecoware/wholesale/quote"
                className="inline-flex min-h-[48px] items-center justify-center rounded-full border border-black/20 px-6 text-sm font-black text-black transition hover:bg-black hover:text-white"
              >
                Request Wholesale Pricing
              </Link>
            </div>
          </article>
        </div>
      </section>
    </main>
  );
}
