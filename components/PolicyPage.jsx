import Link from "next/link";
import { Mail, MessageCircle, Phone } from "lucide-react";
import { POLICY_NAV } from "@/lib/policy-nav";
import { getStorePolicy } from "@/lib/store-policies";

/*
 * Shipping, Returns, FAQ, Privacy and Terms pages for both stores.
 * Content lives in lib/store-policies.js; this file only lays it out.
 */

const THEMES = {
  shakti_foods: {
    prefix: "",
    accent: "text-[#bd0d1b]",
    accentBg: "bg-[#bd0d1b]",
    paper: "bg-[#faf8f2]",
    heading: "font-display font-bold tracking-[-0.03em]",
    top: "pt-28 md:pt-36"
  },
  ecoware: {
    prefix: "/ecoware",
    accent: "text-[#27802f]",
    accentBg: "bg-[#27802f]",
    paper: "bg-[#f8f6ef]",
    heading: "font-black tracking-[-0.04em]",
    top: "pt-[132px] sm:pt-[140px] lg:pt-[160px]"
  }
};

function resolveHref(href, prefix) {
  if (href.startsWith("page:")) {
    return `${prefix}/${href.slice(5)}`;
  }

  if (href.startsWith("path:")) {
    return `${prefix}${href.slice(5)}`;
  }

  return href;
}

function Inline({ parts, prefix, accent }) {
  const items = Array.isArray(parts) ? parts : [parts];

  return items.map((part, index) =>
    typeof part === "string" ? (
      <span key={index}>{part}</span>
    ) : (
      <Link
        key={index}
        href={resolveHref(part.href, prefix)}
        className={`font-semibold underline decoration-current/30 underline-offset-4 hover:decoration-current ${accent}`}
      >
        {part.label}
      </Link>
    )
  );
}

function Block({ block, prefix, accent }) {
  if (block && typeof block === "object" && !Array.isArray(block) && block.list) {
    return (
      <ul className="grid gap-2 pl-5 [list-style:disc] marker:text-black/30">
        {block.list.map((item, index) => (
          <li key={index} className="pl-1">
            <Inline parts={item} prefix={prefix} accent={accent} />
          </li>
        ))}
      </ul>
    );
  }

  return (
    <p>
      <Inline parts={block} prefix={prefix} accent={accent} />
    </p>
  );
}

export default function PolicyPage({ storefront = "shakti_foods", pageId }) {
  const theme = THEMES[storefront] || THEMES.shakti_foods;
  const policy = getStorePolicy(storefront, pageId);

  if (!policy) {
    return null;
  }

  const { contact } = policy;

  return (
    <div className={`${theme.paper} ${theme.top} pb-16 text-black sm:pb-20`}>
      <div className="mx-auto max-w-5xl px-5 sm:px-8">
        <p className={`text-xs font-black uppercase tracking-[0.22em] ${theme.accent}`}>
          {policy.brand} · Help
        </p>
        <h1 className={`mt-3 text-4xl leading-[1.05] text-black sm:text-5xl ${theme.heading}`}>
          {policy.title}
        </h1>
        <p className="mt-4 max-w-2xl text-base leading-7 text-black/65 sm:text-lg sm:leading-8">
          {policy.intro}
        </p>
        <p className="mt-3 text-sm text-black/45">Last updated {policy.lastUpdated}</p>

        <nav aria-label="Store policies" className="mt-8 flex flex-wrap gap-2">
          {POLICY_NAV.map((item) => {
            const current = item.id === policy.id;

            return (
              <Link
                key={item.id}
                href={`${theme.prefix}/${item.id}`}
                aria-current={current ? "page" : undefined}
                className={[
                  "rounded-full px-4 py-2 text-sm font-semibold transition",
                  current
                    ? `${theme.accentBg} text-white`
                    : "border border-black/10 bg-white text-black/70 hover:border-black/25 hover:text-black"
                ].join(" ")}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="mt-10 grid gap-10 lg:grid-cols-[13rem_minmax(0,1fr)] lg:gap-14">
          <aside className="hidden lg:block">
            <div className="sticky top-28">
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-black/45">
                On this page
              </p>
              <ul className="mt-3 grid gap-2 text-sm">
                {policy.sections.map((section) => (
                  <li key={section.id}>
                    <a
                      href={`#${section.id}`}
                      className="block leading-5 text-black/60 transition hover:text-black"
                    >
                      {section.title}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          </aside>

          <div className="min-w-0">
            <div className="rounded-3xl border border-black/[0.08] bg-white px-5 py-2 shadow-[0_10px_40px_rgba(0,0,0,0.04)] sm:px-8">
              {policy.sections.map((section) => (
                <section
                  key={section.id}
                  id={section.id}
                  className="scroll-mt-32 border-t border-black/[0.07] py-7 first:border-t-0"
                >
                  <h2 className="text-xl font-bold leading-7 text-black">{section.title}</h2>
                  <div className="mt-3 grid gap-3 text-[15px] leading-7 text-black/70 sm:text-base">
                    {section.body.map((block, index) => (
                      <Block key={index} block={block} prefix={theme.prefix} accent={theme.accent} />
                    ))}
                  </div>
                </section>
              ))}
            </div>

            <section
              aria-labelledby="policy-contact"
              className="mt-6 rounded-3xl border border-black/[0.08] bg-white p-5 sm:p-8"
            >
              <h2 id="policy-contact" className="text-xl font-bold text-black">
                Questions? We're here to help.
              </h2>
              <p className="mt-2 text-sm leading-6 text-black/60">
                {contact.hours}
              </p>

              <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-[1fr_1fr_1.35fr]">
                <a
                  href={`tel:${contact.phoneRaw}`}
                  className="flex items-center gap-3 rounded-2xl border border-black/10 px-4 py-3 transition hover:border-black/25"
                >
                  <Phone size={18} aria-hidden="true" className={theme.accent} />
                  <span className="min-w-0">
                    <span className="block text-xs text-black/50">Call</span>
                    <span className="block truncate text-sm font-semibold">{contact.phone}</span>
                  </span>
                </a>
                <a
                  href={`https://wa.me/${contact.whatsappNumber}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 rounded-2xl border border-black/10 px-4 py-3 transition hover:border-black/25"
                >
                  <MessageCircle size={18} aria-hidden="true" className={theme.accent} />
                  <span className="min-w-0">
                    <span className="block text-xs text-black/50">WhatsApp</span>
                    <span className="block truncate text-sm font-semibold">{contact.phone}</span>
                  </span>
                </a>
                <a
                  href={`mailto:${contact.email}`}
                  className="flex items-center gap-3 rounded-2xl border border-black/10 px-4 py-3 transition hover:border-black/25"
                >
                  <Mail size={18} aria-hidden="true" className={theme.accent} />
                  <span className="min-w-0">
                    <span className="block text-xs text-black/50">Email</span>
                    <span className="block break-all text-sm font-semibold">{contact.email}</span>
                  </span>
                </a>
              </div>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}

/** Page metadata for a policy page. */
export function policyMetadata(storefront, pageId) {
  const policy = getStorePolicy(storefront, pageId);

  return policy
    ? { title: policy.title, description: policy.description }
    : {};
}
