import {
  ExternalLink,
  ShieldCheck
} from "lucide-react";

export default function ProductCertificationsPanel({
  certifications = []
}) {
  /*
   * PUBLIC STOREFRONT RULE:
   *
   * Only verified product certifications
   * are allowed to appear as certification
   * claims to customers.
   *
   * Pending, expired and unverified records
   * remain available in Supabase/admin,
   * but are not rendered here.
   */
  const verifiedCertifications =
    certifications.filter(
      (item) =>
        item?.verification_status ===
        "verified"
    );

  return (
    <section className="h-full rounded-[1.75rem] bg-white p-5 text-black shadow-soft ring-1 ring-black/5 md:rounded-[2rem] md:p-7">
      <div className="flex items-center gap-3">
        <span className="flex h-10 w-10 items-center justify-center rounded-full bg-[#f2eadc] text-black">
          <ShieldCheck size={21} />
        </span>

        <div>
          <div className="text-xs font-bold uppercase tracking-[0.16em] text-black/45">
            Product Trust
          </div>

          <h2 className="font-display text-2xl font-bold text-black md:text-3xl">
            Certifications
          </h2>
        </div>
      </div>

      <p className="mt-4 text-sm leading-6 text-black/60">
        Verified certification and compliance
        information available for this product.
      </p>

      {verifiedCertifications.length === 0 ? (
        <div className="mt-5 rounded-2xl bg-[#faf7f1] p-5">
          <div className="text-sm font-bold text-black">
            No verified certifications are
            currently published.
          </div>

          <p className="mt-2 text-xs leading-5 text-black/55">
            Certification information is shown
            here only after supporting records
            have been verified.
          </p>
        </div>
      ) : (
        <div className="mt-5 grid gap-3">
          {verifiedCertifications.map(
            (item) => {
              const certification =
                item.certification;

              return (
                <article
                  key={item.id}
                  className="rounded-2xl border border-green-200 bg-green-50 p-4"
                >
                  <div className="flex items-start gap-3">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-green-700 text-white">
                      <ShieldCheck
                        size={18}
                      />
                    </span>

                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <h3 className="font-bold text-black">
                          {certification?.name ||
                            "Certification"}
                        </h3>

                        <span className="rounded-full bg-green-100 px-3 py-1 text-xs font-bold text-green-800">
                          Verified
                        </span>
                      </div>

                      {certification?.issuing_organization ? (
                        <p className="mt-1 text-xs text-black/55">
                          {
                            certification.issuing_organization
                          }
                        </p>
                      ) : null}

                      {certification?.description ? (
                        <p className="mt-3 text-sm leading-6 text-black/65">
                          {
                            certification.description
                          }
                        </p>
                      ) : null}

                      {item.certificate_number ? (
                        <p className="mt-3 text-xs text-black/65">
                          Certificate:{" "}
                          <strong>
                            {
                              item.certificate_number
                            }
                          </strong>
                        </p>
                      ) : null}

                      {item.issued_at ? (
                        <p className="mt-1 text-xs text-black/65">
                          Issued:{" "}
                          {item.issued_at}
                        </p>
                      ) : null}

                      {item.expires_at ? (
                        <p className="mt-1 text-xs text-black/65">
                          Expires:{" "}
                          {item.expires_at}
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
                            className="inline-flex items-center gap-2 rounded-full bg-black px-4 py-2 text-xs font-bold text-white transition hover:bg-black/80"
                          >
                            View Certificate

                            <ExternalLink
                              size={13}
                            />
                          </a>
                        ) : null}

                        {certification?.verification_url ? (
                          <a
                            href={
                              certification.verification_url
                            }
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-2 rounded-full border border-black/15 bg-white px-4 py-2 text-xs font-bold text-black transition hover:bg-black hover:text-white"
                          >
                            Verify

                            <ExternalLink
                              size={13}
                            />
                          </a>
                        ) : null}
                      </div>
                    </div>
                  </div>
                </article>
              );
            }
          )}
        </div>
      )}
    </section>
  );
}