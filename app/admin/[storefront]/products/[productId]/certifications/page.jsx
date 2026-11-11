import Link from "next/link";
import { notFound } from "next/navigation";
import {
  BadgeCheck,
  ExternalLink,
  Pencil,
  Save,
  ShieldCheck,
  Trash2
} from "lucide-react";
import { createSupabaseAdmin } from "@/lib/supabase-admin";
import {
  adminProductsPath,
  requireAdminStore,
  requireStoreProduct
} from "@/lib/admin-store";
import { getStorefrontPageUrl } from "@/lib/storefront-config";
import {
  saveProductCertification,
  removeProductCertification
} from "@/app/admin/products/certification-actions";
import {
  ConfirmSubmitButton,
  SubmitButton
} from "@/components/admin/ProductFormClient";
import {
  BUTTON_SECONDARY,
  Badge,
  Field,
  PageHeader,
  Panel,
  ProductActionsCard,
  SelectField,
  SuccessNotice
} from "@/components/admin/product-ui";

export const dynamic = "force-dynamic";

const STATUSES = [
  { value: "unverified", label: "Unverified", tone: "neutral" },
  { value: "pending", label: "Pending", tone: "amber" },
  { value: "verified", label: "Verified", tone: "green" },
  { value: "expired", label: "Expired", tone: "red" },
  { value: "rejected", label: "Rejected", tone: "red" }
];

function statusInfo(status) {
  return (
    STATUSES.find((item) => item.value === status) || {
      label: String(status || "Unverified").replaceAll("_", " "),
      tone: "neutral"
    }
  );
}

function formatDate(value) {
  if (!value) {
    return "";
  }

  // Dates are stored as YYYY-MM-DD; show them without a time-zone shift.
  const date = new Date(`${String(value).slice(0, 10)}T12:00:00Z`);

  if (Number.isNaN(date.getTime())) {
    return String(value);
  }

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC"
  }).format(date);
}

function dateInputValue(value) {
  return value ? String(value).slice(0, 10) : "";
}

export default async function CertificationManagerPage({ params, searchParams }) {
  const resolvedParams = await Promise.resolve(params || {});
  const resolvedSearchParams = await Promise.resolve(searchParams || {});
  const productId = decodeURIComponent(
    String(resolvedParams.productId || "").trim()
  );

  if (!productId) {
    notFound();
  }

  // Only this store's products; another store's product opens in its store.
  const storefront = requireAdminStore(resolvedParams.storefront);

  const product = await requireStoreProduct({
    storefront,
    productId,
    suffix: "/certifications",
    select: "product_id, title, slug"
  });

  const productBase = adminProductsPath(storefront, productId);
  const basePath = `${productBase}/certifications`;
  const productTitle = product.title || product.product_id;

  const supabase = createSupabaseAdmin();

  const [certificationTypesResult, assignmentsResult] = await Promise.all([
    supabase
      .from("certifications")
      .select("id, code, name, issuing_organization, description, is_active")
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
      .order("created_at", { ascending: false })
  ]);

  if (certificationTypesResult.error) {
    console.error("Unable to load certification types:", certificationTypesResult.error);
  }

  if (assignmentsResult.error) {
    console.error("Unable to load product certifications:", assignmentsResult.error);
  }

  const certificationTypes = certificationTypesResult.data || [];
  const assignments = assignmentsResult.data || [];

  // ?edit=<id> fills the form with that certification so it can be updated.
  const editId = String(resolvedSearchParams.edit || "").trim();
  const editing = editId
    ? assignments.find((assignment) => assignment.id === editId) || null
    : null;

  const saved = String(resolvedSearchParams.saved || "") === "1";
  const removed = String(resolvedSearchParams.removed || "") === "1";

  const verifiedCount = assignments.filter(
    (assignment) => assignment.verification_status === "verified"
  ).length;

  const links = {
    edit: `${productBase}/edit`,
    images: `${productBase}/images`,
    storefront: product.slug
      ? getStorefrontPageUrl(storefront.id, `/products/${product.slug}`)
      : null,
    delete: `${productBase}/delete`
  };

  return (
    <div className="grid grid-cols-1 gap-5">
      <PageHeader title="Certifications" subtitle={productTitle}>
        <div className="mt-2.5 flex flex-wrap gap-1.5">
          <Badge>{assignments.length} assigned</Badge>
          <Badge tone={verifiedCount ? "green" : "neutral"}>{verifiedCount} verified</Badge>
        </div>
      </PageHeader>

      {saved ? <SuccessNotice>Certification saved.</SuccessNotice> : null}
      {removed ? <SuccessNotice>Certification removed.</SuccessNotice> : null}

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] lg:items-start">
        <Panel
          icon={ShieldCheck}
          title={editing ? "Edit certification" : "Add certification"}
          description={
            editing
              ? editing.certification?.name || "Update the details below."
              : "Choose a certification and enter its details."
          }
        >
          <form
            key={editing?.id || "new"}
            action={saveProductCertification}
            className="grid gap-4"
          >
            <input type="hidden" name="productId" value={productId} />

            {editing ? (
              // Saving matches on product + certification, so keep it fixed.
              <input type="hidden" name="certificationId" value={editing.certification_id} />
            ) : null}

            <SelectField
              label="Certification"
              name={editing ? "certificationDisplay" : "certificationId"}
              required={!editing}
              disabled={Boolean(editing)}
              defaultValue={editing ? editing.certification_id : ""}
            >
              <option value="" disabled>
                Select a certification
              </option>
              {editing && !certificationTypes.some((type) => type.id === editing.certification_id) ? (
                <option value={editing.certification_id}>
                  {editing.certification?.name || "Current certification"}
                </option>
              ) : null}
              {certificationTypes.map((certification) => (
                <option key={certification.id} value={certification.id}>
                  {certification.name}
                </option>
              ))}
            </SelectField>

            <div className="grid gap-4 sm:grid-cols-2">
              <SelectField
                label="Verification status"
                name="verificationStatus"
                defaultValue={editing?.verification_status || "unverified"}
              >
                {STATUSES.map((status) => (
                  <option key={status.value} value={status.value}>
                    {status.label}
                  </option>
                ))}
              </SelectField>

              <Field
                label="Certificate number"
                name="certificateNumber"
                defaultValue={editing?.certificate_number || ""}
                placeholder="BPI-2026-001"
                autoComplete="off"
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <Field
                label="Issued date"
                name="issuedAt"
                type="date"
                defaultValue={dateInputValue(editing?.issued_at)}
              />
              <Field
                label="Expiry date"
                name="expiresAt"
                type="date"
                defaultValue={dateInputValue(editing?.expires_at)}
              />
            </div>

            <Field
              label="Document link"
              name="documentUrl"
              type="url"
              defaultValue={editing?.document_url || ""}
              placeholder="https://"
              help="A public link to the certificate PDF or the issuer's verification page."
            />

            <p className="rounded-xl bg-amber-50 px-4 py-3 text-sm leading-6 text-amber-900">
              Mark a certification as Verified only when you have valid documents for it.
            </p>

            <div className="flex flex-wrap items-center justify-end gap-2">
              {editing ? (
                <Link href={basePath} className={BUTTON_SECONDARY}>
                  Cancel
                </Link>
              ) : null}
              <SubmitButton pendingLabel="Saving…">
                <Save size={16} aria-hidden="true" />
                {editing ? "Save changes" : "Save certification"}
              </SubmitButton>
            </div>
          </form>
        </Panel>

        <Panel
          icon={BadgeCheck}
          title="Assigned certifications"
          bodyClassName="grid gap-3"
        >
          {assignments.length === 0 ? (
            <div className="rounded-xl bg-[#faf7f2] px-4 py-8 text-center">
              <p className="font-semibold text-black">No certifications yet</p>
              <p className="mt-1 text-sm text-black/55">
                Certifications you add appear here and on the product page.
              </p>
            </div>
          ) : (
            assignments.map((assignment) => {
              const certification = assignment.certification;
              const status = statusInfo(assignment.verification_status);
              const issued = formatDate(assignment.issued_at);
              const expires = formatDate(assignment.expires_at);
              const isEditing = editing?.id === assignment.id;

              return (
                <article
                  key={assignment.id}
                  className={`rounded-xl border p-4 ${
                    isEditing ? "border-black/30 bg-[#faf7f2]" : "border-black/10"
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex min-w-0 items-start gap-3">
                      <span
                        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#f1eadf] text-black/75"
                        aria-hidden="true"
                      >
                        <BadgeCheck size={18} />
                      </span>
                      <div className="min-w-0">
                        <h3 className="font-bold text-black">
                          {certification?.name || "Certification"}
                        </h3>
                        <p className="text-sm text-black/55">
                          {certification?.issuing_organization || "Issuer not recorded"}
                        </p>
                      </div>
                    </div>

                    <Badge tone={status.tone}>{status.label}</Badge>
                  </div>

                  <dl className="mt-3 grid gap-3 text-sm sm:grid-cols-2">
                    <div>
                      <dt className="text-xs text-black/50">Certificate number</dt>
                      <dd className="font-semibold text-black">
                        {assignment.certificate_number || "Not provided"}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-xs text-black/50">Valid</dt>
                      <dd className="font-semibold text-black">
                        {issued || expires
                          ? `${issued || "—"} to ${expires || "no expiry"}`
                          : "No dates recorded"}
                      </dd>
                    </div>
                  </dl>

                  <div className="mt-3 flex flex-wrap items-center gap-1 border-t border-black/[0.07] pt-2">
                    <Link
                      href={`${basePath}?edit=${encodeURIComponent(assignment.id)}`}
                      className="inline-flex h-8 items-center gap-1.5 rounded-lg px-2.5 text-sm font-semibold text-black transition hover:bg-black/[0.05]"
                    >
                      <Pencil size={14} aria-hidden="true" />
                      Edit
                    </Link>

                    {assignment.document_url ? (
                      <a
                        href={assignment.document_url}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex h-8 items-center gap-1.5 rounded-lg px-2.5 text-sm font-semibold text-black transition hover:bg-black/[0.05]"
                      >
                        <ExternalLink size={14} aria-hidden="true" />
                        Open document
                      </a>
                    ) : null}

                    <form action={removeProductCertification} className="ml-auto">
                      <input type="hidden" name="productId" value={productId} />
                      <input type="hidden" name="assignmentId" value={assignment.id} />
                      <ConfirmSubmitButton
                        message={`Remove ${certification?.name || "this certification"} from this product?`}
                        pendingLabel="Removing…"
                        className="inline-flex h-8 items-center gap-1.5 rounded-lg px-2.5 text-sm font-semibold text-red-700 transition hover:bg-red-50"
                      >
                        <Trash2 size={14} aria-hidden="true" />
                        Remove
                      </ConfirmSubmitButton>
                    </form>
                  </div>
                </article>
              );
            })
          )}
        </Panel>
      </div>

      <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
        <ProductActionsCard
          links={links}
          storefrontName={storefront.name}
          current="certifications"
        />
      </div>
    </div>
  );
}
