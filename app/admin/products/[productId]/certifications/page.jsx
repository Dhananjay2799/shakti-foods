import Link from "next/link";
import { notFound } from "next/navigation";
import {
  BadgeCheck,
  ExternalLink,
  ShieldCheck,
  Trash2
} from "lucide-react";
import { createSupabaseAdmin } from "@/lib/supabase-admin";
import {
  saveProductCertification,
  removeProductCertification
} from "@/app/admin/products/certification-actions";

export const dynamic = "force-dynamic";

function getStatusStyles(status) {
  switch (status) {
    case "verified":
      return "bg-green-100 text-green-800";

    case "pending":
      return "bg-amber-100 text-amber-800";

    case "expired":
      return "bg-red-100 text-red-800";

    case "rejected":
      return "bg-red-100 text-red-800";

    default:
      return "bg-gray-200 text-gray-700";
  }
}

function formatStatus(status) {
  return String(status || "unverified")
    .replaceAll("_", " ")
    .replace(/\b\w/g, (letter) =>
      letter.toUpperCase()
    );
}

export default async function CertificationManagerPage({
  params
}) {
  const productId = params.productId;
  const supabase = createSupabaseAdmin();

  const [
    productResult,
    certificationTypesResult,
    assignmentsResult
  ] = await Promise.all([
    supabase
      .from("inventory")
      .select(
        "product_id, product_name, is_active"
      )
      .eq("product_id", productId)
      .maybeSingle(),

    supabase
      .from("certifications")
      .select(
        `
          id,
          code,
          name,
          issuing_organization,
          description,
          is_active
        `
      )
      .eq("is_active", true)
      .order("name"),

    supabase
      .from("product_certifications")
      .select(`
        id,
        certification_id,
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
          description
        )
      `)
      .eq("product_id", productId)
      .order("created_at", {
        ascending: false
      })
  ]);

  if (
    productResult.error ||
    !productResult.data
  ) {
    console.error(
      "Unable to load product:",
      productResult.error
    );

    notFound();
  }

  if (certificationTypesResult.error) {
    console.error(
      "Unable to load certification types:",
      certificationTypesResult.error
    );
  }

  if (assignmentsResult.error) {
    console.error(
      "Unable to load product certifications:",
      assignmentsResult.error
    );
  }

  const product = productResult.data;

  const certificationTypes =
    certificationTypesResult.data || [];

  const assignments =
    assignmentsResult.data || [];

  return (
    <main className="min-h-screen bg-[#f8f6f1]">
      <div className="mx-auto max-w-6xl px-5 py-10 md:px-8 md:py-12">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <Link
            href={`/admin/products/${productId}`}
            className="inline-flex rounded-full bg-white px-5 py-3 font-bold text-black shadow"
          >
            ← Back to Product
          </Link>

          <Link
            href="/admin/products"
            className="inline-flex rounded-full bg-[#eadfce] px-5 py-3 font-bold text-black"
          >
            All Products
          </Link>
        </div>

        <div className="mt-8">
          <div className="text-sm font-bold uppercase tracking-[.18em] text-black/50">
            Product Trust Management
          </div>

          <h1 className="mt-2 font-display text-4xl font-bold text-black md:text-6xl">
            Certifications
          </h1>

          <p className="mt-2 text-lg text-black/60">
            {product.product_name}
          </p>

          <p className="mt-1 text-sm text-black/45">
            Product ID: {product.product_id}
          </p>
        </div>

        <div className="mt-10 grid gap-6 xl:grid-cols-[.85fr_1.15fr]">
          <section className="h-fit rounded-[2rem] bg-white p-5 shadow md:p-7">
            <div className="flex items-center gap-3">
              <span className="flex h-11 w-11 items-center justify-center rounded-full bg-black text-white">
                <ShieldCheck size={22} />
              </span>

              <div>
                <h2 className="font-display text-3xl font-bold text-black">
                  Assign Certification
                </h2>

                <p className="mt-1 text-sm text-black/55">
                  Add or update certification details.
                </p>
              </div>
            </div>

            <form
              action={saveProductCertification}
              className="mt-7 grid gap-5"
            >
              <input
                type="hidden"
                name="productId"
                value={productId}
              />

              <label className="grid gap-2">
                <span className="text-sm font-bold text-black">
                  Certification
                </span>

                <select
                  name="certificationId"
                  required
                  defaultValue=""
                  className="rounded-2xl border border-black/15 bg-white px-4 py-3 text-black outline-none focus:border-black"
                >
                  <option value="" disabled>
                    Select certification
                  </option>

                  {certificationTypes.map(
                    (certification) => (
                      <option
                        key={certification.id}
                        value={certification.id}
                      >
                        {certification.name}
                      </option>
                    )
                  )}
                </select>
              </label>

              <label className="grid gap-2">
                <span className="text-sm font-bold text-black">
                  Verification status
                </span>

                <select
                  name="verificationStatus"
                  defaultValue="unverified"
                  className="rounded-2xl border border-black/15 bg-white px-4 py-3 text-black outline-none focus:border-black"
                >
                  <option value="unverified">
                    Unverified
                  </option>

                  <option value="pending">
                    Pending
                  </option>

                  <option value="verified">
                    Verified
                  </option>

                  <option value="expired">
                    Expired
                  </option>

                  <option value="rejected">
                    Rejected
                  </option>
                </select>
              </label>

              <label className="grid gap-2">
                <span className="text-sm font-bold text-black">
                  Certificate number
                </span>

                <input
                  type="text"
                  name="certificateNumber"
                  placeholder="Example: BPI-2026-001"
                  className="rounded-2xl border border-black/15 bg-white px-4 py-3 text-black outline-none focus:border-black"
                />
              </label>

              <div className="grid gap-5 sm:grid-cols-2">
                <label className="grid gap-2">
                  <span className="text-sm font-bold text-black">
                    Issued date
                  </span>

                  <input
                    type="date"
                    name="issuedAt"
                    className="rounded-2xl border border-black/15 bg-white px-4 py-3 text-black outline-none focus:border-black"
                  />
                </label>

                <label className="grid gap-2">
                  <span className="text-sm font-bold text-black">
                    Expiry date
                  </span>

                  <input
                    type="date"
                    name="expiresAt"
                    className="rounded-2xl border border-black/15 bg-white px-4 py-3 text-black outline-none focus:border-black"
                  />
                </label>
              </div>

              <label className="grid gap-2">
                <span className="text-sm font-bold text-black">
                  Document URL
                </span>

                <input
                  type="url"
                  name="documentUrl"
                  placeholder="https://..."
                  className="rounded-2xl border border-black/15 bg-white px-4 py-3 text-black outline-none focus:border-black"
                />

                <span className="text-xs leading-5 text-black/45">
                  Use a public link to the certificate PDF or verification page.
                </span>
              </label>

              <div className="rounded-2xl bg-amber-50 p-4 text-sm leading-6 text-amber-900">
                Mark a certification as verified only
                when you have valid supporting
                documentation.
              </div>

              <button
                type="submit"
                className="rounded-full bg-black px-6 py-4 font-bold text-white transition hover:bg-[#333333]"
              >
                Save Certification
              </button>
            </form>
          </section>

          <section className="rounded-[2rem] bg-white p-5 shadow md:p-7">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="font-display text-3xl font-bold text-black">
                  Assigned Certifications
                </h2>

                <p className="mt-1 text-sm text-black/55">
                  Current product certification records.
                </p>
              </div>

              <span className="rounded-full bg-black px-4 py-2 text-sm font-bold text-white">
                {assignments.length} assigned
              </span>
            </div>

            {assignments.length === 0 ? (
              <div className="mt-7 rounded-2xl bg-[#faf7f1] p-6 text-black/60">
                No certifications have been assigned
                to this product.
              </div>
            ) : (
              <div className="mt-7 grid gap-4">
                {assignments.map((assignment) => {
                  const certification =
                    assignment.certification;

                  return (
                    <article
                      key={assignment.id}
                      className="rounded-2xl border border-black/10 bg-[#faf7f1] p-5"
                    >
                      <div className="flex flex-wrap items-start justify-between gap-4">
                        <div className="flex min-w-0 items-start gap-3">
                          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-black text-white">
                            <BadgeCheck size={20} />
                          </span>

                          <div>
                            <h3 className="font-bold text-black">
                              {certification?.name ||
                                "Certification"}
                            </h3>

                            <p className="mt-1 text-sm text-black/55">
                              {certification?.issuing_organization ||
                                "Issuing organization not recorded"}
                            </p>
                          </div>
                        </div>

                        <span
                          className={`rounded-full px-3 py-1 text-xs font-bold ${getStatusStyles(
                            assignment.verification_status
                          )}`}
                        >
                          {formatStatus(
                            assignment.verification_status
                          )}
                        </span>
                      </div>

                      <div className="mt-5 grid gap-3 text-sm sm:grid-cols-2">
                        <div className="rounded-xl bg-white p-3">
                          <div className="text-black/45">
                            Certificate number
                          </div>

                          <div className="mt-1 font-bold text-black">
                            {assignment.certificate_number ||
                              "Not provided"}
                          </div>
                        </div>

                        <div className="rounded-xl bg-white p-3">
                          <div className="text-black/45">
                            Validity
                          </div>

                          <div className="mt-1 font-bold text-black">
                            {assignment.issued_at ||
                              "No issue date"}
                            {" — "}
                            {assignment.expires_at ||
                              "No expiry date"}
                          </div>
                        </div>
                      </div>

                      <div className="mt-5 flex flex-wrap gap-3">
                        {assignment.document_url ? (
                          <a
                            href={assignment.document_url}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-2 rounded-full bg-black px-4 py-2 text-sm font-bold text-white"
                          >
                            Open Document
                            <ExternalLink size={14} />
                          </a>
                        ) : null}

                        <form
                          action={
                            removeProductCertification
                          }
                        >
                          <input
                            type="hidden"
                            name="productId"
                            value={productId}
                          />

                          <input
                            type="hidden"
                            name="assignmentId"
                            value={assignment.id}
                          />

                          <button
                            type="submit"
                            className="inline-flex items-center gap-2 rounded-full bg-red-100 px-4 py-2 text-sm font-bold text-red-800"
                          >
                            <Trash2 size={14} />
                            Remove
                          </button>
                        </form>
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </section>
        </div>
      </div>
    </main>
  );
}