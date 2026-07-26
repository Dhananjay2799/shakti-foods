import Link from "next/link";
import { notFound } from "next/navigation";
import {
  CalendarDays,
  Check,
  Download,
  Edit3,
  ExternalLink,
  FileImage,
  FileText,
  FolderLock,
  Plus,
  Save,
  ShieldCheck,
  Trash2,
  Upload,
  X
} from "lucide-react";
import { createSupabaseAdmin } from "@/lib/supabase-admin";
import {
  deleteCustomerDocument,
  updateCustomerDocument,
  updateCustomerDocumentStatus,
  uploadCustomerDocument
} from "@/app/admin/customers/document-actions";

export const dynamic = "force-dynamic";

const DOCUMENT_TYPES = [
  {
    value: "resale_certificate",
    label: "Resale Certificate"
  },
  {
    value: "tax_exemption_form",
    label: "Tax Exemption Form"
  },
  {
    value: "wholesale_agreement",
    label: "Wholesale Agreement"
  },
  {
    value: "credit_application",
    label: "Credit Application"
  },
  {
    value: "business_license",
    label: "Business License"
  },
  {
    value: "w9",
    label: "W-9"
  },
  {
    value: "identity_document",
    label: "Identity Document"
  },
  {
    value: "other",
    label: "Other"
  }
];

const VERIFICATION_STATUSES = [
  {
    value: "pending",
    label: "Pending"
  },
  {
    value: "verified",
    label: "Verified"
  },
  {
    value: "rejected",
    label: "Rejected"
  },
  {
    value: "expired",
    label: "Expired"
  }
];

function formatDocumentType(type) {
  const matchingType = DOCUMENT_TYPES.find(
    (documentType) =>
      documentType.value === type
  );

  return (
    matchingType?.label ||
    String(type || "other")
      .replaceAll("_", " ")
      .replace(/\b\w/g, (letter) =>
        letter.toUpperCase()
      )
  );
}

function formatStatus(status) {
  return String(status || "pending")
    .replaceAll("_", " ")
    .replace(/\b\w/g, (letter) =>
      letter.toUpperCase()
    );
}

function formatFileSize(bytes) {
  const value = Number(bytes || 0);

  if (value < 1024) {
    return `${value} B`;
  }

  if (value < 1024 * 1024) {
    return `${(value / 1024).toFixed(1)} KB`;
  }

  return `${(
    value /
    (1024 * 1024)
  ).toFixed(1)} MB`;
}

function formatDate(value) {
  if (!value) {
    return "Not provided";
  }

  const date = new Date(`${value}T00:00:00`);

  if (Number.isNaN(date.getTime())) {
    return "Not provided";
  }

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric"
  }).format(date);
}

function formatDateTime(value) {
  if (!value) {
    return "Unknown";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Unknown";
  }

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit"
  }).format(date);
}

function isExpired(expirationDate) {
  if (!expirationDate) {
    return false;
  }

  const expiration = new Date(
    `${expirationDate}T23:59:59`
  );

  if (Number.isNaN(expiration.getTime())) {
    return false;
  }

  return expiration.getTime() < Date.now();
}

function getEffectiveStatus(document) {
  if (
    document.verification_status !== "rejected" &&
    isExpired(document.expiration_date)
  ) {
    return "expired";
  }

  return document.verification_status || "pending";
}

function getStatusStyles(status) {
  switch (status) {
    case "verified":
      return "bg-green-100 text-green-800";

    case "rejected":
      return "bg-red-100 text-red-800";

    case "expired":
      return "bg-amber-100 text-amber-800";

    default:
      return "bg-blue-100 text-blue-800";
  }
}

function getDocumentIcon(mimeType) {
  if (
    String(mimeType || "").startsWith("image/")
  ) {
    return FileImage;
  }

  return FileText;
}

function SuccessMessage({ children }) {
  return (
    <div className="rounded-2xl border border-green-200 bg-green-50 px-5 py-4 text-sm font-semibold text-green-800">
      <span className="inline-flex items-center gap-2">
        <Check size={17} />
        {children}
      </span>
    </div>
  );
}

function UploadDocumentForm({
  customerId,
  cancelHref
}) {
  return (
    <form
      action={uploadCustomerDocument}
      encType="multipart/form-data"
      className="grid gap-5"
    >
      <input
        type="hidden"
        name="customerId"
        value={customerId}
      />

      <section className="rounded-[1.75rem] border border-black/5 bg-white p-5 shadow-sm md:p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-black/40">
              New Customer Document
            </p>

            <h2 className="mt-2 font-display text-3xl font-bold text-black">
              Upload Document
            </h2>

            <p className="mt-2 text-sm leading-6 text-black/50">
              Upload a PDF, JPG, JPEG, or PNG file.
              Maximum file size is 10 MB.
            </p>
          </div>

          <Link
            href={cancelHref}
            className="inline-flex items-center gap-2 rounded-full bg-[#f1eadf] px-4 py-2.5 text-sm font-bold text-black transition hover:bg-[#e6dac7]"
          >
            <X size={16} />
            Cancel
          </Link>
        </div>

        <div className="mt-6 grid gap-5 md:grid-cols-2">
          <label className="grid gap-2 md:col-span-2">
            <span className="text-sm font-bold text-black">
              Document file
            </span>

            <input
              type="file"
              name="file"
              required
              accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png"
              className="block w-full rounded-2xl border border-dashed border-black/20 bg-[#faf8f4] px-4 py-5 text-sm text-black file:mr-4 file:rounded-full file:border-0 file:bg-black file:px-4 file:py-2 file:text-sm file:font-bold file:text-white"
            />

            <span className="text-xs leading-5 text-black/45">
              Accepted formats: PDF, JPG, JPEG, and PNG.
            </span>
          </label>

          <label className="grid gap-2">
            <span className="text-sm font-bold text-black">
              Document type
            </span>

            <select
              name="documentType"
              defaultValue="other"
              required
              className="h-12 rounded-2xl border border-black/10 bg-[#faf8f4] px-4 text-sm font-semibold text-black outline-none focus:border-black"
            >
              {DOCUMENT_TYPES.map((type) => (
                <option
                  key={type.value}
                  value={type.value}
                >
                  {type.label}
                </option>
              ))}
            </select>
          </label>

          <label className="grid gap-2">
            <span className="text-sm font-bold text-black">
              Verification status
            </span>

            <select
              name="verificationStatus"
              defaultValue="pending"
              required
              className="h-12 rounded-2xl border border-black/10 bg-[#faf8f4] px-4 text-sm font-semibold text-black outline-none focus:border-black"
            >
              {VERIFICATION_STATUSES.map(
                (status) => (
                  <option
                    key={status.value}
                    value={status.value}
                  >
                    {status.label}
                  </option>
                )
              )}
            </select>
          </label>

          <label className="grid gap-2 md:col-span-2">
            <span className="text-sm font-bold text-black">
              Document title
            </span>

            <input
              type="text"
              name="title"
              required
              placeholder="Example: 2026 Florida Resale Certificate"
              className="h-12 rounded-2xl border border-black/10 bg-[#faf8f4] px-4 text-sm text-black outline-none focus:border-black"
            />
          </label>

          <label className="grid gap-2 md:col-span-2">
            <span className="text-sm font-bold text-black">
              Description
            </span>

            <textarea
              name="description"
              rows={3}
              placeholder="Brief description of this document..."
              className="resize-y rounded-2xl border border-black/10 bg-[#faf8f4] px-4 py-3 text-sm leading-6 text-black outline-none focus:border-black"
            />
          </label>

          <label className="grid gap-2">
            <span className="text-sm font-bold text-black">
              Document number
            </span>

            <input
              type="text"
              name="documentNumber"
              placeholder="Certificate or license number"
              className="h-12 rounded-2xl border border-black/10 bg-[#faf8f4] px-4 text-sm text-black outline-none focus:border-black"
            />
          </label>

          <div />

          <label className="grid gap-2">
            <span className="text-sm font-bold text-black">
              Issued date
            </span>

            <input
              type="date"
              name="issuedDate"
              className="h-12 rounded-2xl border border-black/10 bg-[#faf8f4] px-4 text-sm text-black outline-none focus:border-black"
            />
          </label>

          <label className="grid gap-2">
            <span className="text-sm font-bold text-black">
              Expiration date
            </span>

            <input
              type="date"
              name="expirationDate"
              className="h-12 rounded-2xl border border-black/10 bg-[#faf8f4] px-4 text-sm text-black outline-none focus:border-black"
            />
          </label>

          <label className="grid gap-2 md:col-span-2">
            <span className="text-sm font-bold text-black">
              Internal notes
            </span>

            <textarea
              name="notes"
              rows={5}
              placeholder="Private administrative notes..."
              className="resize-y rounded-2xl border border-black/10 bg-[#faf8f4] px-4 py-3 text-sm leading-6 text-black outline-none focus:border-black"
            />
          </label>
        </div>

        <div className="mt-6 rounded-2xl bg-amber-50 p-4 text-sm leading-6 text-amber-900">
          Mark a document as verified only after its
          authenticity has been reviewed.
        </div>
      </section>

      <div className="rounded-[1.75rem] border border-black/5 bg-white p-4 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Link
            href={cancelHref}
            className="rounded-full border border-black/10 bg-white px-6 py-3 text-sm font-bold text-black transition hover:bg-[#f1eadf]"
          >
            Cancel
          </Link>

          <button
            type="submit"
            className="inline-flex items-center justify-center gap-2 rounded-full bg-black px-7 py-3 text-sm font-bold text-white transition hover:bg-black/80"
          >
            <Upload size={17} />
            Upload Document
          </button>
        </div>
      </div>
    </form>
  );
}

function EditDocumentForm({
  customerId,
  document,
  cancelHref
}) {
  return (
    <form
      action={updateCustomerDocument}
      className="grid gap-5"
    >
      <input
        type="hidden"
        name="customerId"
        value={customerId}
      />

      <input
        type="hidden"
        name="documentId"
        value={document.id}
      />

      <section className="rounded-[1.75rem] border border-black/5 bg-white p-5 shadow-sm md:p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-black/40">
              Edit Customer Document
            </p>

            <h2 className="mt-2 font-display text-3xl font-bold text-black">
              {document.title}
            </h2>

            <p className="mt-2 break-words text-sm text-black/50">
              {document.original_filename}
            </p>
          </div>

          <Link
            href={cancelHref}
            className="inline-flex items-center gap-2 rounded-full bg-[#f1eadf] px-4 py-2.5 text-sm font-bold text-black transition hover:bg-[#e6dac7]"
          >
            <X size={16} />
            Cancel
          </Link>
        </div>

        <div className="mt-6 grid gap-5 md:grid-cols-2">
          <label className="grid gap-2">
            <span className="text-sm font-bold text-black">
              Document type
            </span>

            <select
              name="documentType"
              defaultValue={document.document_type}
              required
              className="h-12 rounded-2xl border border-black/10 bg-[#faf8f4] px-4 text-sm font-semibold text-black outline-none focus:border-black"
            >
              {DOCUMENT_TYPES.map((type) => (
                <option
                  key={type.value}
                  value={type.value}
                >
                  {type.label}
                </option>
              ))}
            </select>
          </label>

          <label className="grid gap-2">
            <span className="text-sm font-bold text-black">
              Verification status
            </span>

            <select
              name="verificationStatus"
              defaultValue={
                document.verification_status
              }
              required
              className="h-12 rounded-2xl border border-black/10 bg-[#faf8f4] px-4 text-sm font-semibold text-black outline-none focus:border-black"
            >
              {VERIFICATION_STATUSES.map(
                (status) => (
                  <option
                    key={status.value}
                    value={status.value}
                  >
                    {status.label}
                  </option>
                )
              )}
            </select>
          </label>

          <label className="grid gap-2 md:col-span-2">
            <span className="text-sm font-bold text-black">
              Document title
            </span>

            <input
              type="text"
              name="title"
              required
              defaultValue={document.title}
              className="h-12 rounded-2xl border border-black/10 bg-[#faf8f4] px-4 text-sm text-black outline-none focus:border-black"
            />
          </label>

          <label className="grid gap-2 md:col-span-2">
            <span className="text-sm font-bold text-black">
              Description
            </span>

            <textarea
              name="description"
              rows={3}
              defaultValue={
                document.description || ""
              }
              className="resize-y rounded-2xl border border-black/10 bg-[#faf8f4] px-4 py-3 text-sm leading-6 text-black outline-none focus:border-black"
            />
          </label>

          <label className="grid gap-2">
            <span className="text-sm font-bold text-black">
              Document number
            </span>

            <input
              type="text"
              name="documentNumber"
              defaultValue={
                document.document_number || ""
              }
              className="h-12 rounded-2xl border border-black/10 bg-[#faf8f4] px-4 text-sm text-black outline-none focus:border-black"
            />
          </label>

          <div />

          <label className="grid gap-2">
            <span className="text-sm font-bold text-black">
              Issued date
            </span>

            <input
              type="date"
              name="issuedDate"
              defaultValue={
                document.issued_date || ""
              }
              className="h-12 rounded-2xl border border-black/10 bg-[#faf8f4] px-4 text-sm text-black outline-none focus:border-black"
            />
          </label>

          <label className="grid gap-2">
            <span className="text-sm font-bold text-black">
              Expiration date
            </span>

            <input
              type="date"
              name="expirationDate"
              defaultValue={
                document.expiration_date || ""
              }
              className="h-12 rounded-2xl border border-black/10 bg-[#faf8f4] px-4 text-sm text-black outline-none focus:border-black"
            />
          </label>

          <label className="grid gap-2 md:col-span-2">
            <span className="text-sm font-bold text-black">
              Internal notes
            </span>

            <textarea
              name="notes"
              rows={5}
              defaultValue={document.notes || ""}
              className="resize-y rounded-2xl border border-black/10 bg-[#faf8f4] px-4 py-3 text-sm leading-6 text-black outline-none focus:border-black"
            />
          </label>

          <label className="flex items-start gap-3 rounded-2xl border border-black/10 bg-[#faf8f4] p-4 md:col-span-2">
            <input
              type="checkbox"
              name="isActive"
              defaultChecked={
                document.is_active === true
              }
              className="mt-1 h-4 w-4"
            />

            <span>
              <span className="block text-sm font-bold text-black">
                Active document
              </span>

              <span className="mt-1 block text-xs leading-5 text-black/50">
                Inactive documents remain stored but are
                excluded from normal business workflows.
              </span>
            </span>
          </label>
        </div>
      </section>

      <div className="rounded-[1.75rem] border border-black/5 bg-white p-4 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Link
            href={cancelHref}
            className="rounded-full border border-black/10 bg-white px-6 py-3 text-sm font-bold text-black transition hover:bg-[#f1eadf]"
          >
            Cancel
          </Link>

          <button
            type="submit"
            className="inline-flex items-center justify-center gap-2 rounded-full bg-black px-7 py-3 text-sm font-bold text-white transition hover:bg-black/80"
          >
            <Save size={17} />
            Save Document
          </button>
        </div>
      </div>
    </form>
  );
}

export default async function CustomerDocumentsPage({
  params,
  searchParams
}) {
  const resolvedParams =
    await Promise.resolve(params || {});

  const resolvedSearchParams =
    await Promise.resolve(searchParams || {});

  const customerId = String(
    resolvedParams.customerId || ""
  ).trim();

  if (!customerId) {
    notFound();
  }

  const showUploadForm =
    String(resolvedSearchParams.new || "") ===
    "1";

  const editDocumentId = String(
    resolvedSearchParams.edit || ""
  ).trim();

  const uploaded =
    String(
      resolvedSearchParams.uploaded || ""
    ) === "1";

  const updated =
    String(
      resolvedSearchParams.updated || ""
    ) === "1";

  const deleted =
    String(
      resolvedSearchParams.deleted || ""
    ) === "1";

  const statusChanged =
    String(
      resolvedSearchParams.statusChanged || ""
    ) === "1";

  const supabase = createSupabaseAdmin();

  const [customerResult, documentsResult] =
    await Promise.all([
      supabase
        .from("customers")
        .select("id, full_name, email")
        .eq("id", customerId)
        .maybeSingle(),

      supabase
        .from("customer_documents")
        .select("*")
        .eq("customer_id", customerId)
        .order("is_active", {
          ascending: false
        })
        .order("created_at", {
          ascending: false
        })
    ]);

  if (
    customerResult.error ||
    !customerResult.data
  ) {
    console.error(
      "Unable to load customer documents:",
      customerResult.error
    );

    notFound();
  }

  if (documentsResult.error) {
    console.error(
      "Unable to load documents:",
      documentsResult.error
    );
  }

  const documents =
    documentsResult.data || [];

  const editingDocument = editDocumentId
    ? documents.find(
        (document) =>
          document.id === editDocumentId
      )
    : null;

  if (
    editDocumentId &&
    !editingDocument
  ) {
    notFound();
  }

  const basePath =
    `/admin/customers/${customerId}/settings/documents`;

  if (showUploadForm) {
    return (
      <UploadDocumentForm
        customerId={customerId}
        cancelHref={basePath}
      />
    );
  }

  if (editingDocument) {
    return (
      <EditDocumentForm
        customerId={customerId}
        document={editingDocument}
        cancelHref={basePath}
      />
    );
  }

  const documentsWithUrls =
    await Promise.all(
      documents.map(async (document) => {
        const { data, error } =
          await supabase.storage
            .from(document.storage_bucket)
            .createSignedUrl(
              document.storage_path,
              60 * 60,
              {
                download:
                  document.original_filename
              }
            );

        if (error) {
          console.error(
            `Unable to create signed URL for document ${document.id}:`,
            error
          );
        }

        const { data: previewData } =
          await supabase.storage
            .from(document.storage_bucket)
            .createSignedUrl(
              document.storage_path,
              60 * 60
            );

        return {
          ...document,
          downloadUrl:
            data?.signedUrl || null,
          previewUrl:
            previewData?.signedUrl || null
        };
      })
    );

  const verifiedCount =
    documentsWithUrls.filter(
      (document) =>
        getEffectiveStatus(document) ===
        "verified"
    ).length;

  const pendingCount =
    documentsWithUrls.filter(
      (document) =>
        getEffectiveStatus(document) ===
        "pending"
    ).length;

  return (
    <div className="grid gap-5">
      <section className="rounded-[1.75rem] border border-black/5 bg-white p-5 shadow-sm md:p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-black/40">
              Customer Settings
            </p>

            <h2 className="mt-2 font-display text-3xl font-bold text-black">
              Documents
            </h2>

            <p className="mt-2 text-sm leading-6 text-black/50">
              Store and manage customer tax forms,
              wholesale agreements, licenses, and
              supporting files.
            </p>
          </div>

          <Link
            href={`${basePath}?new=1`}
            className="inline-flex items-center gap-2 rounded-full bg-black px-5 py-3 text-sm font-bold text-white transition hover:bg-black/80"
          >
            <Plus size={17} />
            Upload Document
          </Link>
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-3">
          <div className="rounded-2xl bg-[#faf8f4] p-4">
            <p className="text-xs font-bold uppercase tracking-[0.1em] text-black/40">
              Total
            </p>

            <p className="mt-2 text-2xl font-bold text-black">
              {documentsWithUrls.length}
            </p>
          </div>

          <div className="rounded-2xl bg-[#faf8f4] p-4">
            <p className="text-xs font-bold uppercase tracking-[0.1em] text-black/40">
              Verified
            </p>

            <p className="mt-2 text-2xl font-bold text-black">
              {verifiedCount}
            </p>
          </div>

          <div className="rounded-2xl bg-[#faf8f4] p-4">
            <p className="text-xs font-bold uppercase tracking-[0.1em] text-black/40">
              Pending
            </p>

            <p className="mt-2 text-2xl font-bold text-black">
              {pendingCount}
            </p>
          </div>
        </div>
      </section>

      {uploaded ? (
        <SuccessMessage>
          Document was uploaded successfully.
        </SuccessMessage>
      ) : null}

      {updated ? (
        <SuccessMessage>
          Document was updated successfully.
        </SuccessMessage>
      ) : null}

      {deleted ? (
        <SuccessMessage>
          Document was deleted successfully.
        </SuccessMessage>
      ) : null}

      {statusChanged ? (
        <SuccessMessage>
          Document verification status was updated.
        </SuccessMessage>
      ) : null}

      {documentsWithUrls.length === 0 ? (
        <section className="rounded-[1.75rem] border border-black/5 bg-white px-6 py-16 text-center shadow-sm">
          <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-[#f1eadf] text-black">
            <FolderLock size={28} />
          </span>

          <h3 className="mt-5 text-xl font-bold text-black">
            No customer documents
          </h3>

          <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-black/50">
            Upload tax forms, wholesale agreements,
            licenses, or other supporting documents.
          </p>

          <Link
            href={`${basePath}?new=1`}
            className="mt-5 inline-flex items-center gap-2 rounded-full bg-black px-5 py-3 text-sm font-bold text-white"
          >
            <Upload size={17} />
            Upload First Document
          </Link>
        </section>
      ) : (
        <div className="grid gap-4 xl:grid-cols-2">
          {documentsWithUrls.map(
            (document) => {
              const Icon = getDocumentIcon(
                document.mime_type
              );

              const effectiveStatus =
                getEffectiveStatus(document);

              return (
                <article
                  key={document.id}
                  className={[
                    "rounded-[1.75rem] border bg-white p-5 shadow-sm",
                    document.is_active
                      ? "border-black/5"
                      : "border-black/5 opacity-65"
                  ].join(" ")}
                >
                  <div className="flex items-start gap-3">
                    <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#f1eadf] text-black">
                      <Icon size={22} />
                    </span>

                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="text-xs font-bold uppercase tracking-[0.1em] text-black/40">
                            {formatDocumentType(
                              document.document_type
                            )}
                          </p>

                          <h3 className="mt-1 break-words text-lg font-bold text-black">
                            {document.title}
                          </h3>
                        </div>

                        <span
                          className={`rounded-full px-3 py-1 text-xs font-bold ${getStatusStyles(
                            effectiveStatus
                          )}`}
                        >
                          {formatStatus(
                            effectiveStatus
                          )}
                        </span>
                      </div>

                      <p className="mt-3 break-words text-sm font-semibold text-black/60">
                        {
                          document.original_filename
                        }
                      </p>

                      <p className="mt-1 text-xs text-black/40">
                        {formatFileSize(
                          document.file_size_bytes
                        )}
                        {" · "}
                        {document.mime_type}
                      </p>
                    </div>
                  </div>

                  {document.description ? (
                    <p className="mt-4 text-sm leading-6 text-black/60">
                      {document.description}
                    </p>
                  ) : null}

                  <div className="mt-5 grid gap-3 sm:grid-cols-2">
                    <div className="rounded-2xl bg-[#faf8f4] p-4">
                      <p className="text-xs font-bold uppercase tracking-[0.1em] text-black/40">
                        Document Number
                      </p>

                      <p className="mt-1 break-words text-sm font-bold text-black">
                        {document.document_number ||
                          "Not provided"}
                      </p>
                    </div>

                    <div className="rounded-2xl bg-[#faf8f4] p-4">
                      <p className="text-xs font-bold uppercase tracking-[0.1em] text-black/40">
                        Uploaded
                      </p>

                      <p className="mt-1 text-sm font-bold text-black">
                        {formatDateTime(
                          document.created_at
                        )}
                      </p>
                    </div>

                    <div className="rounded-2xl bg-[#faf8f4] p-4">
                      <p className="text-xs font-bold uppercase tracking-[0.1em] text-black/40">
                        Issued
                      </p>

                      <p className="mt-1 text-sm font-bold text-black">
                        {formatDate(
                          document.issued_date
                        )}
                      </p>
                    </div>

                    <div className="rounded-2xl bg-[#faf8f4] p-4">
                      <p className="text-xs font-bold uppercase tracking-[0.1em] text-black/40">
                        Expiration
                      </p>

                      <p className="mt-1 text-sm font-bold text-black">
                        {formatDate(
                          document.expiration_date
                        )}
                      </p>
                    </div>
                  </div>

                  {document.notes ? (
                    <div className="mt-4 rounded-2xl bg-amber-50 p-4">
                      <p className="text-xs font-bold uppercase tracking-[0.1em] text-amber-800">
                        Internal Notes
                      </p>

                      <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-amber-900">
                        {document.notes}
                      </p>
                    </div>
                  ) : null}

                  <div className="mt-5 flex flex-wrap gap-2 border-t border-black/5 pt-4">
                    {document.previewUrl ? (
                      <a
                        href={document.previewUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1.5 rounded-full bg-black px-3 py-2 text-xs font-bold text-white"
                      >
                        <ExternalLink size={14} />
                        Preview
                      </a>
                    ) : null}

                    {document.downloadUrl ? (
                      <a
                        href={document.downloadUrl}
                        className="inline-flex items-center gap-1.5 rounded-full bg-[#f1eadf] px-3 py-2 text-xs font-bold text-black"
                      >
                        <Download size={14} />
                        Download
                      </a>
                    ) : null}

                    <Link
                      href={`${basePath}?edit=${document.id}`}
                      className="inline-flex items-center gap-1.5 rounded-full bg-[#f1eadf] px-3 py-2 text-xs font-bold text-black"
                    >
                      <Edit3 size={14} />
                      Edit
                    </Link>

                    {effectiveStatus !==
                    "verified" ? (
                      <form
                        action={
                          updateCustomerDocumentStatus
                        }
                      >
                        <input
                          type="hidden"
                          name="customerId"
                          value={customerId}
                        />

                        <input
                          type="hidden"
                          name="documentId"
                          value={document.id}
                        />

                        <input
                          type="hidden"
                          name="verificationStatus"
                          value="verified"
                        />

                        <button
                          type="submit"
                          className="inline-flex items-center gap-1.5 rounded-full bg-green-100 px-3 py-2 text-xs font-bold text-green-800"
                        >
                          <ShieldCheck size={14} />
                          Verify
                        </button>
                      </form>
                    ) : null}

                    {effectiveStatus !==
                    "rejected" ? (
                      <form
                        action={
                          updateCustomerDocumentStatus
                        }
                      >
                        <input
                          type="hidden"
                          name="customerId"
                          value={customerId}
                        />

                        <input
                          type="hidden"
                          name="documentId"
                          value={document.id}
                        />

                        <input
                          type="hidden"
                          name="verificationStatus"
                          value="rejected"
                        />

                        <button
                          type="submit"
                          className="inline-flex items-center gap-1.5 rounded-full bg-amber-100 px-3 py-2 text-xs font-bold text-amber-800"
                        >
                          <CalendarDays size={14} />
                          Reject
                        </button>
                      </form>
                    ) : null}

                    <form
                      action={
                        deleteCustomerDocument
                      }
                    >
                      <input
                        type="hidden"
                        name="customerId"
                        value={customerId}
                      />

                      <input
                        type="hidden"
                        name="documentId"
                        value={document.id}
                      />

                      <button
                        type="submit"
                        className="inline-flex items-center gap-1.5 rounded-full bg-red-100 px-3 py-2 text-xs font-bold text-red-800"
                      >
                        <Trash2 size={14} />
                        Delete
                      </button>
                    </form>
                  </div>

                  <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                    <span
                      className={[
                        "rounded-full px-3 py-1 text-xs font-bold",
                        document.is_active
                          ? "bg-green-100 text-green-800"
                          : "bg-gray-100 text-gray-600"
                      ].join(" ")}
                    >
                      {document.is_active
                        ? "Active"
                        : "Inactive"}
                    </span>

                    {document.uploaded_by_email ? (
                      <span className="text-xs font-semibold text-black/35">
                        Uploaded by{" "}
                        {
                          document.uploaded_by_email
                        }
                      </span>
                    ) : null}
                  </div>
                </article>
              );
            }
          )}
        </div>
      )}
    </div>
  );
}