"use client";

import {
  ArrowUpRight,
  Clock3,
  Mail,
  MapPin,
  MessageCircle,
  Phone,
} from "lucide-react";
import { site, whatsappLink } from "@/lib/site";

const contactItems = [
  { icon: Phone, label: "Phone", valueKey: "phone", hrefKey: "phoneRaw" },
  { icon: Mail, label: "Email", valueKey: "email", hrefKey: "email" },
  { icon: MapPin, label: "Location", valueKey: "address" },
  { icon: Clock3, label: "Hours", valueKey: "hours" },
];

function ContactItem({ icon: Icon, label, value, href }) {
  const content = (
    <>
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-[#e7b650]/70 text-[#f4bd4c]">
        <Icon size={19} strokeWidth={1.8} aria-hidden="true" />
      </span>
      <span className="min-w-0">
        <span className="block text-[10px] font-bold uppercase tracking-[0.12em] text-[#f4bd4c]">
          {label}
        </span>
        <span className="mt-0.5 block break-words text-[13px] leading-5 text-[#fff8ec] sm:text-[14px]">
          {value}
        </span>
      </span>
    </>
  );

  const classes = "flex items-center gap-3 text-left";
  return href ? (
    <a href={href} className={`${classes} transition hover:opacity-80`}>
      {content}
    </a>
  ) : (
    <div className={classes}>{content}</div>
  );
}

export default function Footer() {
  return (
    <footer className="relative isolate overflow-hidden bg-[#E42027] text-[#fff8ec]">
      {/* Keep the established Shakti footer background and subtle lighting. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 -z-30 bg-[#E42027]"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -top-40 left-[18%] -z-20 h-[430px] w-[600px] rounded-full bg-[#ef1b29]/20 blur-[120px]"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 bottom-0 -z-20 h-[45%] bg-gradient-to-t from-[#680006]/55 to-transparent"
      />

      <div className="relative z-10 mx-auto max-w-[1040px] px-5 pb-7 pt-12 sm:px-8 md:pt-16">
        <div className="mx-auto grid max-w-[900px] gap-10 md:grid-cols-[1fr_1fr] md:items-start md:gap-16">
          {/* CONTACT US */}
          <section aria-labelledby="shakti-footer-contact" className="w-full max-w-[410px] md:justify-self-end">
            <h2
              id="shakti-footer-contact"
              className="text-[12px] font-extrabold uppercase tracking-[0.22em] text-[#f4bd4c]"
            >
              Contact Us
            </h2>
            <div className="mt-3 h-[2px] w-12 bg-[#e7b650]" />
            <div className="mt-6 grid gap-5">
              {contactItems.map(({ icon, label, valueKey, hrefKey }) => (
                <ContactItem
                  key={label}
                  icon={icon}
                  label={label}
                  value={site[valueKey]}
                  href={
                    hrefKey === "phoneRaw"
                      ? `tel:${site.phoneRaw}`
                      : hrefKey === "email"
                        ? `mailto:${site.email}`
                        : undefined
                  }
                />
              ))}
            </div>
          </section>

          {/* WHATSAPP */}
          <section
            aria-labelledby="shakti-footer-help"
            className="w-full max-w-[390px] rounded-[22px] border border-[#e5ad42]/70 bg-[#7d000b]/35 p-6 shadow-[0_18px_45px_rgba(61,0,4,0.22)] backdrop-blur-[4px] md:justify-self-start"
          >
            <p className="text-[10px] font-black uppercase tracking-[0.22em] text-[#f5bd4c]">
              Need Help?
            </p>
            <div className="mt-2 h-[2px] w-10 bg-[#e5ad42]" />
            <h2 id="shakti-footer-help" className="mt-4 text-[27px] font-bold leading-[1.1] tracking-[-0.025em] text-[#fff8ec] sm:text-[30px]">
              Talk with <span className="block text-[#f4b63f]">Shakti Foods</span>
            </h2>
            <p className="mt-4 text-[13px] leading-[1.7] text-[#fff8ec]/90">
              Questions about our rice, retail orders, or wholesale pricing?
              Chat with us directly.
            </p>
            <a
              href={whatsappLink()}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Chat with Shakti Foods on WhatsApp"
              className="group mt-5 inline-flex w-full items-center justify-center gap-2.5 rounded-full bg-[#25D366] px-5 py-3.5 text-[13px] font-bold text-white shadow-[0_10px_28px_rgba(0,0,0,0.25)] transition duration-300 hover:-translate-y-0.5 hover:bg-[#20c45d]"
            >
              <MessageCircle size={19} strokeWidth={2} aria-hidden="true" />
              Chat on WhatsApp
              <ArrowUpRight size={16} strokeWidth={2} className="transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" aria-hidden="true" />
            </a>
          </section>
        </div>

        <div className="mt-12 border-t border-[#e7b650]/55 pt-6 text-center text-[11px] text-[#fff3df]/80">
          © {new Date().getFullYear()} {site.name}. All rights reserved.
        </div>
      </div>
    </footer>
  );
}
