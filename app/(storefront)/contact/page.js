import SectionHeading from "@/components/SectionHeading";
import WholesaleInquiryForm from "@/components/WholesaleInquiryForm";
import { site, whatsappLink } from "@/lib/site";

export const metadata = {
  title: "Contact & Wholesale Inquiry",
  description: "Contact Shakti Foods for Basmati rice, Simpli Ecoware products, restaurant supply, catering, and wholesale pricing."
};

export default function ContactPage() {
  return (
    <main className="bg-brand-radial pt-24 text-black md:pt-28">
      <section className="section-pad py-14 md:py-20">
        <div className="container-brand">
          <SectionHeading eyebrow="Contact" title="Contact Shakti Foods" text="For retail questions, wholesale pricing, restaurant supply, and catering orders, use the details below or submit the wholesale inquiry form." />
          <div className="mt-8 grid gap-5 md:mt-10 md:grid-cols-3">
            <div className="glass rounded-3xl p-5 text-black md:p-6">
              <div className="font-display text-2xl font-bold text-black">Phone / WhatsApp</div>
              <a className="mt-2 block text-black underline" href={`tel:${site.phoneRaw}`}>{site.phone}</a>
              <a className="mt-2 inline-flex rounded-full bg-[#25D366] px-4 py-2 font-bold text-white" href={whatsappLink()} target="_blank" rel="noreferrer">Message on WhatsApp</a>
            </div>
            <div className="glass rounded-3xl p-5 text-black md:p-6">
              <div className="font-display text-2xl font-bold text-black">Email</div>
              <a className="mt-2 block text-black underline" href={`mailto:${site.email}`}>{site.email}</a>
            </div>
            <div className="glass rounded-3xl p-5 text-black md:p-6">
              <div className="font-display text-2xl font-bold text-black">Location & Hours</div>
              <div className="mt-2 text-black">{site.address}</div>
              <div className="mt-2 text-black">{site.hours}</div>
            </div>
          </div>
          <div className="mt-10 max-w-3xl">
            <WholesaleInquiryForm />
          </div>
        </div>
      </section>
    </main>
  );
}
