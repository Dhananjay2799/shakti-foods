import Link from "next/link";
import {
  ArrowRight,
  Check,
  ExternalLink,
  Leaf,
  Recycle,
  ShieldCheck,
  Sprout
} from "lucide-react";

import { createSupabaseAdmin } from "@/lib/supabase-admin";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Sustainability | Simpli Ecoware",
  description:
    "Learn about Simpli Ecoware sugarcane bagasse products, product performance, responsible disposal guidance, and certification transparency."
};

function getSection(sections, key) {
  return sections.find(
    (section) => section.section_key === key
  );
}

export default async function SustainabilityPage() {
  const supabase = createSupabaseAdmin();

  const [
    sustainabilityResult,
    certificationsResult,
    verifiedProductCertificationsResult
  ] = await Promise.all([
    supabase
      .from("sustainability_content")
      .select(`
        id,
        section_key,
        eyebrow,
        title,
        description,
        content,
        image_url,
        sort_order
      `)
      .eq("is_active", true)
      .order("sort_order", {
        ascending: true
      }),

    supabase
      .from("certifications")
      .select(`
        id,
        code,
        name,
        issuing_organization,
        description,
        logo_url,
        verification_url
      `)
      .eq("is_active", true)
      .order("name", {
        ascending: true
      }),

    supabase
      .from("product_certifications")
      .select(`
        id,
        product_id,
        certificate_number,
        issued_at,
        expires_at,
        document_url,
        verification_status,
        certification:certifications (
          id,
          code,
          name,
          issuing_organization,
          description,
          logo_url,
          verification_url
        )
      `)
      .eq("verification_status", "verified")
      .order("created_at", {
        ascending: false
      })
  ]);

  if (sustainabilityResult.error) {
    console.error(
      "Unable to load sustainability content:",
      sustainabilityResult.error
    );
  }

  if (certificationsResult.error) {
    console.error(
      "Unable to load certification library:",
      certificationsResult.error
    );
  }

  if (verifiedProductCertificationsResult.error) {
    console.error(
      "Unable to load verified product certifications:",
      verifiedProductCertificationsResult.error
    );
  }

  const sections =
    sustainabilityResult.data || [];

  const certifications =
    certificationsResult.data || [];

  const verifiedProductCertifications =
    verifiedProductCertificationsResult.data || [];

  const hero = getSection(sections, "hero");
  const material = getSection(
    sections,
    "material"
  );
  const performance = getSection(
    sections,
    "performance"
  );
  const disposal = getSection(
    sections,
    "disposal"
  );
  const transparency = getSection(
    sections,
    "certification-transparency"
  );

  const materialItems =
    material?.content?.items || [];

  const performanceItems =
    performance?.content?.items || [];

  return (
    <main className="bg-brand-radial pt-24 text-black md:pt-28">

      {/* HERO */}
      <section className="section-pad py-16 md:py-24">
        <div className="container-brand">
          <div className="overflow-hidden rounded-[2rem] bg-white p-7 shadow-soft md:rounded-[3rem] md:p-12 lg:p-16">
            <div className="grid gap-10 lg:grid-cols-[1.2fr_.8fr] lg:items-center">

              <div>
                <div className="inline-flex items-center gap-2 rounded-full bg-green-50 px-4 py-2 text-xs font-black uppercase tracking-[.18em] text-green-800">
                  <Leaf size={15} />

                  {hero?.eyebrow ||
                    "Simpli Ecoware"}
                </div>

                <h1 className="mt-6 max-w-4xl font-display text-5xl font-bold leading-[.95] text-black md:text-6xl lg:text-7xl">
                  {hero?.title ||
                    "Designed with a better material choice in mind."}
                </h1>

                <p className="mt-6 max-w-3xl text-base leading-8 text-black/60 md:text-lg">
                  {hero?.description ||
                    "Explore the materials, product characteristics, disposal guidance, and certification information behind Simpli Ecoware."}
                </p>

                <div className="mt-8 flex flex-wrap gap-3">
                  <Link
                    href="/ecoware/products"
                    className="inline-flex items-center gap-2 rounded-full bg-black px-6 py-3.5 text-sm font-bold text-white transition hover:bg-black/80"
                  >
                    Shop Simpli Ecoware
                    <ArrowRight size={16} />
                  </Link>

                  <a
                    href="#certifications"
                    className="inline-flex items-center gap-2 rounded-full border border-black/10 bg-[#f7f3ea] px-6 py-3.5 text-sm font-bold text-black transition hover:bg-white"
                  >
                    Explore Certifications
                  </a>
                </div>
              </div>

              <div className="rounded-[2rem] bg-[#f2eadc] p-7 md:p-9">
                <div className="flex h-14 w-14 items-center justify-center rounded-full bg-green-700 text-white">
                  <Sprout size={27} />
                </div>

                <div className="mt-7 text-xs font-black uppercase tracking-[.18em] text-black/45">
                  Material Focus
                </div>

                <h2 className="mt-2 font-display text-4xl font-bold">
                  Sugarcane Bagasse
                </h2>

                <p className="mt-4 text-sm leading-7 text-black/65">
                  Plant-fiber material used across
                  the Simpli Ecoware foodservice
                  collection.
                </p>

                <div className="mt-7 grid gap-3">
                  {[
                    "Plant-based fiber",
                    "Foodservice-focused design",
                    "Product-specific performance",
                    "Clear disposal guidance"
                  ].map((item) => (
                    <div
                      key={item}
                      className="flex items-center gap-3 rounded-2xl bg-white/70 px-4 py-3 text-sm font-bold"
                    >
                      <span className="flex h-6 w-6 items-center justify-center rounded-full bg-green-100 text-green-800">
                        <Check size={14} />
                      </span>

                      {item}
                    </div>
                  ))}
                </div>
              </div>

            </div>
          </div>
        </div>
      </section>

      {/* MATERIAL */}
      {material ? (
        <section className="section-pad pb-16 md:pb-24">
          <div className="container-brand">

            <div className="max-w-3xl">
              <div className="text-xs font-black uppercase tracking-[.2em] text-green-800">
                {material.eyebrow}
              </div>

              <h2 className="mt-3 font-display text-4xl font-bold md:text-5xl">
                {material.title}
              </h2>

              <p className="mt-4 text-base leading-8 text-black/60">
                {material.description}
              </p>
            </div>

            {materialItems.length > 0 ? (
              <div className="mt-8 grid gap-5 md:grid-cols-3">
                {materialItems.map(
                  (item, index) => (
                    <article
                      key={`${item.title}-${index}`}
                      className="rounded-[2rem] bg-white p-7 shadow-soft"
                    >
                      <div className="flex h-11 w-11 items-center justify-center rounded-full bg-green-50 text-green-800">
                        <Leaf size={20} />
                      </div>

                      <h3 className="mt-5 font-display text-2xl font-bold">
                        {item.title}
                      </h3>

                      <p className="mt-3 text-sm leading-7 text-black/60">
                        {item.text}
                      </p>
                    </article>
                  )
                )}
              </div>
            ) : null}

          </div>
        </section>
      ) : null}

      {/* PERFORMANCE */}
      {performance ? (
        <section className="section-pad bg-white/45 py-16 md:py-24">
          <div className="container-brand">

            <div className="grid gap-10 lg:grid-cols-[.8fr_1.2fr] lg:items-start">

              <div>
                <div className="text-xs font-black uppercase tracking-[.2em] text-green-800">
                  {performance.eyebrow}
                </div>

                <h2 className="mt-3 font-display text-4xl font-bold md:text-5xl">
                  {performance.title}
                </h2>

                <p className="mt-4 text-base leading-8 text-black/60">
                  {performance.description}
                </p>

                <p className="mt-5 rounded-2xl bg-[#f7f3ea] p-4 text-xs leading-6 text-black/55">
                  Always check the individual
                  product page for the
                  specifications applicable to
                  that product.
                </p>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                {performanceItems.map(
                  (item) => (
                    <div
                      key={item}
                      className="flex items-center gap-4 rounded-2xl bg-white p-5 shadow-sm"
                    >
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-green-50 text-green-800">
                        <Check size={17} />
                      </span>

                      <span className="font-bold">
                        {item}
                      </span>
                    </div>
                  )
                )}
              </div>

            </div>
          </div>
        </section>
      ) : null}

      {/* DISPOSAL */}
      {disposal ? (
        <section className="section-pad py-16 md:py-24">
          <div className="container-brand">

            <div className="rounded-[2rem] bg-green-950 p-7 text-white shadow-soft md:rounded-[3rem] md:p-12">

              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-white/10">
                <Recycle size={27} />
              </div>

              <div className="mt-7 text-xs font-black uppercase tracking-[.2em] text-green-200">
                {disposal.eyebrow}
              </div>

              <h2 className="mt-3 max-w-3xl font-display text-4xl font-bold md:text-5xl">
                {disposal.title}
              </h2>

              <p className="mt-5 max-w-4xl text-base leading-8 text-white/70">
                {disposal.description}
              </p>

              {disposal.content?.notice ? (
                <div className="mt-7 max-w-4xl rounded-2xl bg-white/10 p-5 text-sm leading-7 text-white/80">
                  <strong className="text-white">
                    Important:
                  </strong>{" "}
                  {disposal.content.notice}
                </div>
              ) : null}

            </div>
          </div>
        </section>
      ) : null}

      {/* CERTIFICATIONS */}
      <section
        id="certifications"
        className="section-pad bg-white/45 py-16 md:py-24"
      >
        <div className="container-brand">

          <div className="max-w-4xl">
            <div className="flex items-center gap-3 text-xs font-black uppercase tracking-[.2em] text-green-800">
              <ShieldCheck size={18} />
              {transparency?.eyebrow ||
                "Product Trust"}
            </div>

            <h2 className="mt-3 font-display text-4xl font-bold md:text-5xl">
              {transparency?.title ||
                "Certification transparency."}
            </h2>

            <p className="mt-4 text-base leading-8 text-black/60">
              {transparency?.description}
            </p>
          </div>

          {transparency?.content?.verified_rule ? (
            <div className="mt-7 rounded-2xl border border-green-200 bg-green-50 p-5 text-sm leading-7 text-green-950">
              <strong>
                Verified certification policy:
              </strong>{" "}
              {
                transparency.content
                  .verified_rule
              }
            </div>
          ) : null}

          {/* EDUCATIONAL LIBRARY */}
          <div className="mt-12">
            <div className="text-xs font-black uppercase tracking-[.18em] text-black/40">
              Certification & Standards Library
            </div>

            <h3 className="mt-2 font-display text-3xl font-bold">
              Understanding the standards
            </h3>

            <p className="mt-3 max-w-3xl text-sm leading-7 text-black/60">
              The information below explains
              standards and certification
              programs relevant to compostable
              foodservice products. Listing a
              standard here does not mean every
              Simpli Ecoware product holds that
              certification.
            </p>

            <div className="mt-7 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {certifications.map(
                (certification) => (
                  <article
                    key={certification.id}
                    className="rounded-[1.75rem] bg-white p-6 shadow-soft"
                  >
                    <div className="text-xs font-black uppercase tracking-[.15em] text-green-800">
                      {certification.code}
                    </div>

                    <h4 className="mt-2 font-display text-2xl font-bold">
                      {certification.name}
                    </h4>

                    {certification.issuing_organization ? (
                      <div className="mt-2 text-xs font-semibold text-black/45">
                        {
                          certification.issuing_organization
                        }
                      </div>
                    ) : null}

                    {certification.description ? (
                      <p className="mt-4 text-sm leading-7 text-black/60">
                        {
                          certification.description
                        }
                      </p>
                    ) : null}

                    {certification.verification_url ? (
                      <a
                        href={
                          certification.verification_url
                        }
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-5 inline-flex items-center gap-2 text-xs font-bold text-black"
                      >
                        Learn More
                        <ExternalLink
                          size={13}
                        />
                      </a>
                    ) : null}
                  </article>
                )
              )}
            </div>
          </div>

          {/* VERIFIED PRODUCT CERTIFICATIONS */}
          <div className="mt-14 rounded-[2rem] bg-white p-7 shadow-soft md:p-10">

            <div className="flex items-center gap-3">
              <span className="flex h-11 w-11 items-center justify-center rounded-full bg-green-700 text-white">
                <ShieldCheck size={21} />
              </span>

              <div>
                <div className="text-xs font-black uppercase tracking-[.16em] text-green-800">
                  Verified Records
                </div>

                <h3 className="font-display text-3xl font-bold">
                  Verified Product Certifications
                </h3>
              </div>
            </div>

            {verifiedProductCertifications.length ===
            0 ? (
              <div className="mt-7 rounded-2xl bg-[#f7f3ea] p-6">
                <div className="font-bold">
                  No verified product
                  certifications are currently
                  published.
                </div>

                <p className="mt-2 text-sm leading-7 text-black/55">
                  Product-specific certification
                  records will appear here after
                  supporting documentation has
                  been reviewed and verified.
                </p>
              </div>
            ) : (
              <div className="mt-7 grid gap-4 md:grid-cols-2">
                {verifiedProductCertifications.map(
                  (item) => (
                    <article
                      key={item.id}
                      className="rounded-2xl border border-green-200 bg-green-50 p-5"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="text-xs font-bold uppercase tracking-[.14em] text-green-800">
                            {
                              item
                                .certification
                                ?.code
                            }
                          </div>

                          <h4 className="mt-1 font-bold">
                            {item.certification
                              ?.name ||
                              "Certification"}
                          </h4>

                          <p className="mt-1 text-xs text-black/55">
                            Product ID:{" "}
                            {item.product_id}
                          </p>
                        </div>

                        <span className="rounded-full bg-green-700 px-3 py-1 text-xs font-bold text-white">
                          Verified
                        </span>
                      </div>

                      {item.certificate_number ? (
                        <p className="mt-4 text-xs text-black/65">
                          Certificate:{" "}
                          <strong>
                            {
                              item.certificate_number
                            }
                          </strong>
                        </p>
                      ) : null}

                      <div className="mt-4 flex flex-wrap gap-2">
                        {item.document_url ? (
                          <a
                            href={
                              item.document_url
                            }
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-2 rounded-full bg-black px-4 py-2 text-xs font-bold text-white"
                          >
                            View Certificate
                            <ExternalLink
                              size={13}
                            />
                          </a>
                        ) : null}

                        {item.certification
                          ?.verification_url ? (
                          <a
                            href={
                              item.certification
                                .verification_url
                            }
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-2 rounded-full border border-black/10 bg-white px-4 py-2 text-xs font-bold"
                          >
                            Verify
                            <ExternalLink
                              size={13}
                            />
                          </a>
                        ) : null}
                      </div>
                    </article>
                  )
                )}
              </div>
            )}

          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="section-pad py-16 md:py-24">
        <div className="container-brand">
          <div className="rounded-[2rem] bg-black p-8 text-white md:rounded-[3rem] md:p-12">

            <div className="max-w-3xl">
              <div className="text-xs font-black uppercase tracking-[.2em] text-white/50">
                Simpli Ecoware
              </div>

              <h2 className="mt-3 font-display text-4xl font-bold md:text-5xl">
                Find the right product for your use case.
              </h2>

              <p className="mt-4 text-base leading-8 text-white/60">
                Explore compostable foodservice
                products for restaurants,
                caterers, events, schools, food
                trucks, and everyday use.
              </p>

              <Link
                href="/ecoware/products"
                className="mt-7 inline-flex items-center gap-2 rounded-full bg-white px-6 py-3.5 text-sm font-bold text-black transition hover:bg-[#f2eadc]"
              >
                Shop Simpli Ecoware
                <ArrowRight size={16} />
              </Link>
            </div>

          </div>
        </div>
      </section>

    </main>
  );
}
