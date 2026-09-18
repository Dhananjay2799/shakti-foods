import Link from "next/link";
import { notFound } from "next/navigation";
import { createSupabaseAdmin } from "@/lib/supabase-admin";
import { updateProductReview } from "@/app/admin/[storefront]/reviews/actions";
import { getAdminStorefront } from "@/lib/admin-storefronts";

export const dynamic = "force-dynamic";

const statusStyles = {
  pending: "bg-amber-50 text-amber-800",
  approved: "bg-green-50 text-green-800",
  rejected: "bg-red-50 text-red-800"
};

const statusLabels = {
  pending: "Pending",
  approved: "Approved",
  rejected: "Rejected"
};

function formatDate(value) {
  if (!value) {
    return "—";
  }

  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(new Date(value));
}

function renderStars(rating) {
  const value = Number(rating || 0);
  return "★".repeat(value) + "☆".repeat(5 - value);
}

export default async function ReviewDetailPage({
  params
}) {
  const resolvedParams =
    await Promise.resolve(params);

  const storefront =
    getAdminStorefront(
      resolvedParams.storefront
    );

  if (!storefront) {
    notFound();
  }

  const reviewId = String(
    resolvedParams?.id || ""
  ).trim();

  if (!reviewId) {
    notFound();
  }

  const basePath =
    `/admin/${storefront.slug}`;

  const supabase =
    createSupabaseAdmin();

  const {
    data: review,
    error
  } = await supabase
    .from("product_reviews")
    .select(`
      id,
      product_id,
      customer_name,
      email,
      rating,
      review_title,
      review_text,
      status,
      verified_purchase,
      admin_notes,
      approved_at,
      rejected_at,
      created_at,
      updated_at,
      storefront
    `)
    .eq("id", reviewId)
    .eq(
      "storefront",
      storefront.id
    )
    .maybeSingle();

  if (error) {
    console.error(
      "Unable to load product review:",
      error
    );

    throw new Error(
      error.message ||
        "Unable to load product review."
    );
  }

  if (!review) {
    notFound();
  }

  return (
    <main>
      <div className="flex flex-col gap-5 md:flex-row md:items-start md:justify-between">
        <div>
          <Link
            href={`${basePath}/reviews`}
            className="inline-flex rounded-full bg-white px-4 py-2 text-sm font-bold text-black shadow-soft transition hover:bg-[#f1eadf]"
          >
            ← Back to Reviews
          </Link>

          <div className="mt-6 text-xs font-bold uppercase tracking-[.2em] text-black/40">
            {storefront.name} Product Review
          </div>

          <h1 className="mt-2 font-display text-4xl font-bold text-black md:text-5xl">
            {review.customer_name}
          </h1>

          <p className="mt-2 text-sm text-black/50">
            Submitted {formatDate(review.created_at)}
          </p>
        </div>

        <span
          className={[
            "inline-flex w-fit rounded-full px-4 py-2 text-sm font-bold",
            statusStyles[review.status] ||
              "bg-black/5 text-black"
          ].join(" ")}
        >
          {statusLabels[review.status] ||
            review.status}
        </span>
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_380px]">
        <div className="grid gap-6">

          <section className="rounded-[2rem] bg-white p-5 shadow-soft md:p-6">
            <div className="text-xs font-bold uppercase tracking-[.16em] text-black/40">
              Product
            </div>

            <div className="mt-2 font-mono text-lg font-bold text-black">
              {review.product_id}
            </div>
          </section>

          <section className="rounded-[2rem] bg-white p-5 shadow-soft md:p-6">
            <h2 className="font-display text-3xl font-bold text-black">
              Customer
            </h2>

            <div className="mt-5 rounded-2xl bg-[#f8f6f1] p-4">
              <div className="font-bold text-black">
                {review.customer_name}
              </div>

              {review.email ? (
                <a
                  href={`mailto:${review.email}`}
                  className="mt-2 block text-sm text-black/60 hover:underline"
                >
                  {review.email}
                </a>
              ) : null}

              {review.verified_purchase ? (
                <span className="mt-3 inline-flex rounded-full bg-green-100 px-3 py-1.5 text-xs font-bold text-green-800">
                  Verified Purchase
                </span>
              ) : null}
            </div>
          </section>

          <section className="rounded-[2rem] bg-white p-5 shadow-soft md:p-6">
            <h2 className="font-display text-3xl font-bold text-black">
              Review
            </h2>

            <div className="mt-5 rounded-2xl bg-[#f8f6f1] p-5">
              <div className="text-2xl tracking-wide text-amber-500">
                {renderStars(review.rating)}
              </div>

              <div className="mt-1 text-xs text-black/50">
                {review.rating}/5
              </div>

              {review.review_title ? (
                <h3 className="mt-5 text-xl font-bold text-black">
                  {review.review_title}
                </h3>
              ) : null}

              <p className="mt-3 whitespace-pre-line leading-8 text-black/70">
                {review.review_text}
              </p>
            </div>
          </section>

          <section className="rounded-[2rem] bg-white p-5 shadow-soft md:p-6">
            <h2 className="font-display text-3xl font-bold text-black">
              Moderation Timeline
            </h2>

            <div className="mt-6 grid gap-4">
              <TimelineItem
                label="Submitted"
                value={review.created_at}
              />

              <TimelineItem
                label="Approved"
                value={review.approved_at}
              />

              <TimelineItem
                label="Rejected"
                value={review.rejected_at}
              />
            </div>
          </section>
        </div>

        <aside className="h-fit rounded-[2rem] bg-white p-5 shadow-soft md:p-6 lg:sticky lg:top-28">
          <div className="text-xs font-bold uppercase tracking-[.16em] text-black/40">
            Moderation
          </div>

          <h2 className="mt-2 font-display text-3xl font-bold text-black">
            Manage Review
          </h2>

          <div className="mt-6 rounded-2xl bg-[#f8f6f1] p-4">
            <div className="text-xs font-bold uppercase tracking-[.14em] text-black/40">
              Current Status
            </div>

            <div className="mt-2 font-bold text-black">
              {statusLabels[review.status] ||
                review.status}
            </div>
          </div>

          <form
            action={updateProductReview}
            className="mt-6 grid gap-4"
          >
            <input
              type="hidden"
              name="storefrontId"
              value={storefront.id}
            />

            <input
              type="hidden"
              name="storefrontSlug"
              value={storefront.slug}
            />

            <input
              type="hidden"
              name="reviewId"
              value={review.id}
            />

            <label className="grid gap-2">
              <span className="text-sm font-bold">
                Status
              </span>

              <select
                name="status"
                defaultValue={review.status}
                className="h-12 rounded-2xl border border-black/10 bg-white px-4 outline-none focus:border-black"
              >
                <option value="pending">
                  Pending
                </option>

                <option value="approved">
                  Approved
                </option>

                <option value="rejected">
                  Rejected
                </option>
              </select>
            </label>

            <label className="flex items-center gap-3 rounded-2xl bg-[#f8f6f1] p-4">
              <input
                type="checkbox"
                name="verifiedPurchase"
                defaultChecked={
                  review.verified_purchase
                }
                className="h-5 w-5"
              />

              <span className="text-sm font-bold">
                Verified Purchase
              </span>
            </label>

            <label className="grid gap-2">
              <span className="text-sm font-bold">
                Internal Notes
              </span>

              <textarea
                name="adminNotes"
                defaultValue={
                  review.admin_notes || ""
                }
                rows={6}
                className="rounded-2xl border border-black/10 bg-white px-4 py-3 outline-none focus:border-black"
                placeholder="Moderation notes..."
              />
            </label>

            <button
              type="submit"
              className="mt-2 w-full rounded-full bg-black px-6 py-4 font-bold text-white transition hover:bg-black/80"
            >
              Save Changes
            </button>
          </form>
        </aside>
      </div>
    </main>
  );
}

function TimelineItem({
  label,
  value
}) {
  const completed =
    Boolean(value);

  return (
    <div className="flex items-start gap-3">
      <div
        className={[
          "mt-1 h-3 w-3 shrink-0 rounded-full",
          completed
            ? "bg-green-600"
            : "bg-black/10"
        ].join(" ")}
      />

      <div>
        <div
          className={
            completed
              ? "font-bold text-black"
              : "font-medium text-black/40"
          }
        >
          {label}
        </div>

        <div className="mt-1 text-xs text-black/45">
          {completed
            ? formatDate(value)
            : "Not yet"}
        </div>
      </div>
    </div>
  );
}