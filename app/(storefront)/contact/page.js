import { Clock, Mail, MapPin, MessageCircle, Phone } from "lucide-react";
import WholesaleInquiryForm from "@/components/WholesaleInquiryForm";
import { site, whatsappLink } from "@/lib/site";
import { getWholesaleProductOptions } from "@/lib/storefront-products";

// Refresh the product list in the wholesale form every 10 minutes.
export const revalidate = 600;

export const metadata = {
  title: "Contact & Wholesale Inquiry",
  description: "Contact Shakti Foods for Basmati rice, Simpli Ecoware products, restaurant supply, catering, and wholesale pricing."
};

const RED = "#d71920";

/*
 * Desktop: contact details card on the left, wholesale form on the right.
 * Phone: Call / WhatsApp / Email buttons and location + hours, then the
 * form (the nav's "Wholesale" link opens this page).
 */
export default async function ContactPage() {
  const wholesaleProducts = await getWholesaleProductOptions("shakti_foods");

  const contacts = [
    {
      label: "Call",
      value: site.phone,
      href: `tel:${site.phoneRaw}`,
      Icon: Phone
    },
    {
      label: "WhatsApp",
      value: site.phone,
      href: whatsappLink(),
      Icon: MessageCircle,
      external: true
    },
    {
      label: "Email",
      value: site.email,
      href: `mailto:${site.email}`,
      Icon: Mail
    }
  ];

  const facts = [
    { label: "Location", value: site.address, Icon: MapPin },
    { label: "Hours", value: site.hours, Icon: Clock }
  ];

  const linkProps = (contact) =>
    contact.external ? { target: "_blank", rel: "noreferrer" } : {};

  return (
    <main className="bg-white pt-24 text-black md:pt-28">
      <section className="section-pad py-8 md:py-12">
        <div className="mx-auto max-w-6xl">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-black md:text-sm">
            Contact
          </p>
          <h1 className="mt-1 font-display text-[2rem] font-bold leading-tight text-black sm:text-4xl md:text-5xl">
            Contact Shakti Foods
          </h1>
          <p className="mt-2 text-base text-black/75 md:text-lg">
            Get in touch about products, orders, or wholesale pricing.
          </p>

          <div className="mt-5 grid gap-6 md:mt-8 lg:grid-cols-[minmax(0,340px)_minmax(0,1fr)] lg:items-start lg:gap-8">
            {/* Phone and tablet */}
            <div className="lg:hidden">
              <div className="grid grid-cols-3 gap-2 sm:gap-3">
                {contacts.map((contact) => (
                  <a
                    key={contact.label}
                    href={contact.href}
                    {...linkProps(contact)}
                    className="flex h-11 min-w-0 items-center justify-center gap-1 rounded-lg border-2 px-1 text-[13px] font-bold transition hover:bg-[#fff5f5] min-[400px]:gap-1.5 min-[400px]:text-sm"
                    style={{ borderColor: RED, color: RED }}
                  >
                    {/* Icons drop out on very narrow phones so the words fit. */}
                    <contact.Icon size={16} aria-hidden="true" className="hidden shrink-0 min-[375px]:block" />
                    <span className="truncate">{contact.label}</span>
                  </a>
                ))}
              </div>

              <ul className="mt-4 grid gap-2 text-sm text-black">
                {facts.map((fact) => (
                  <li key={fact.label} className="flex items-center gap-2.5">
                    <fact.Icon size={18} aria-hidden="true" className="shrink-0" />
                    <span>
                      <span className="font-bold">{fact.label}:</span> {fact.value}
                    </span>
                  </li>
                ))}
              </ul>

              <hr className="mt-5 border-black/10" />
            </div>

            {/* Desktop */}
            <aside
              aria-labelledby="contact-details-heading"
              className="hidden rounded-[1.5rem] border border-black/10 bg-[#faf7f1] p-6 lg:block"
            >
              <h2
                id="contact-details-heading"
                className="font-display text-2xl font-bold text-black md:text-3xl"
              >
                Contact details
              </h2>

              <ul className="mt-5 grid gap-5">
                {contacts.map((contact) => (
                  <li key={contact.label} className="flex items-start gap-4">
                    <span
                      className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-white"
                      style={{ backgroundColor: RED }}
                    >
                      <contact.Icon size={22} aria-hidden="true" />
                    </span>
                    <span className="min-w-0">
                      <span className="block text-lg font-bold text-black">{contact.label}</span>
                      <a
                        href={contact.href}
                        {...linkProps(contact)}
                        className="break-words underline underline-offset-2"
                        style={{ color: RED }}
                      >
                        {contact.value}
                      </a>
                    </span>
                  </li>
                ))}
              </ul>

              <ul className="mt-6 grid gap-4 border-t border-black/10 pt-5">
                {facts.map((fact) => (
                  <li key={fact.label} className="flex items-start gap-4">
                    <span className="flex w-11 shrink-0 justify-center pt-0.5">
                      <fact.Icon size={24} aria-hidden="true" />
                    </span>
                    <span>
                      <span className="block font-bold text-black">{fact.label}</span>
                      <span className="text-black/80">{fact.value}</span>
                    </span>
                  </li>
                ))}
              </ul>
            </aside>

            <WholesaleInquiryForm
              storefront="shakti_foods"
              products={wholesaleProducts}
              frame="page"
            />
          </div>
        </div>
      </section>
    </main>
  );
}
