import {
  ExternalLink,
  ShieldCheck
} from "lucide-react";

function getStatusStyles(status) {
  switch (status) {
    case "verified":
      return {
        card: "border-green-200 bg-green-50",
        icon: "bg-green-700 text-white",
        badge: "bg-green-100 text-green-800",
        label: "Verified"
      };

    case "pending":
      return {
        card: "border-amber-200 bg-amber-50",
        icon: "bg-amber-600 text-white",
        badge: "bg-amber-100 text-amber-800",
        label: "Pending"
      };

    case "expired":
      return {
        card: "border-red-200 bg-red-50",
        icon: "bg-red-700 text-white",
        badge: "bg-red-100 text-red-800",
        label: "Expired"
      };

    default:
      return {
        card: "border-black/10 bg-[#faf7f1]",
        icon: "bg-black text-white",
        badge: "bg-gray-200 text-gray-700",
        label: "Unverified"
      };
  }
}

export default function ProductCertificationsPanel({
  certifications = []
}) {
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
        Verified documents and compliance
        information for this product.
      </p>

      {certifications.length === 0 ? (
        <div className="mt-5 rounded-2xl bg-[#faf7f1] p-5 text-sm leading-6 text-black/65">
          No certification documents have been
          assigned to this product yet.
        </div>
      ) : (
        <div className="mt-5 grid gap-3">
          {certifications.map((item) => {
            const certification =
              item.certification;

            const styles =
              getStatusStyles(
                item.verification_status
              );

            return (
              <article
                key={item.id}
                className={`rounded-2xl border p-4 ${styles.card}`}
              >
                <div className="flex items-start gap-3">
                  <span
                    className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${styles.icon}`}
                  >
                    <ShieldCheck size={18} />
                  </span>

                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <h3 className="font-bold text-black">
                        {certification?.name ||
                          "Certification"}
                      </h3>

                      <span
                        className={`rounded-full px-3 py-1 text-xs font-bold ${styles.badge}`}
                      >
                        {styles.label}
                      </span>
                    </div>

                    {certification?.issuing_organization ? (
                      <p className="mt-1 text-xs text-black/55">
                        {
                          certification.issuing_organization
                        }
                      </p>
                    ) : null}

                    {item.certificate_number ? (
                      <p className="mt-2 text-xs text-black/65">
                        Certificate:{" "}
                        <strong>
                          {item.certificate_number}
                        </strong>
                      </p>
                    ) : null}

                    {item.expires_at ? (
                      <p className="mt-1 text-xs text-black/65">
                        Expires: {item.expires_at}
                      </p>
                    ) : null}

                    {item.document_url ? (
                      <a
                        href={item.document_url}
                        target="_blank"
                        rel="noreferrer"
                        className="mt-3 inline-flex items-center gap-2 rounded-full bg-black px-4 py-2 text-xs font-bold text-white"
                      >
                        View certificate
                        <ExternalLink size={13} />
                      </a>
                    ) : null}
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}