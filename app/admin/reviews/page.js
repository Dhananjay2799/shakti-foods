import Link from "next/link";
import { createSupabaseAdmin } from "@/lib/supabase-admin";

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

export default async function ReviewsPage({
  searchParams
}) {
  const params = await Promise.resolve(
    searchParams || {}
  );

  const requestedStatus = String(
    params.status || "all"
  ).trim();

  const validStatuses = [
    "all",
    "pending",
    "approved",
    "rejected"
  ];

  const activeStatus =
    validStatuses.includes(requestedStatus)
      ? requestedStatus
      : "all";

  const supabase =
    createSupabaseAdmin();

  let query = supabase
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
      created_at,
      updated_at
    `)
    .order("created_at", {
      ascending: false
    });

  if (activeStatus !== "all") {
    query = query.eq(
      "status",
      activeStatus
    );
  }

  const {
    data: reviews,
    error
  } = await query;

  if (error) {
    console.error(
      "Unable to load product reviews:",
      error
    );
  }

  const {
    data: allReviews,
    error: countsError
  } = await supabase
    .from("product_reviews")
    .select("status");

  if (countsError) {
    console.error(
      "Unable to load review counts:",
      countsError
    );
  }

  const counts = {
    all: allReviews?.length || 0,
    pending: 0,
    approved: 0,
    rejected: 0
  };

  for (const review of allReviews || []) {
    if (
      Object.prototype.hasOwnProperty.call(
        counts,
        review.status
      )
    ) {
      counts[review.status] += 1;
    }
  }

  const filters = [
    ["all", "All"],
    ["pending", "Pending"],
    ["approved", "Approved"],
    ["rejected", "Rejected"]
  ];

  const rows = reviews || [];

  return (
    <main>
      <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="text-xs font-bold uppercase tracking-[.2em] text-black/40">
            Customer Trust
          </div>

          <h1 className="mt-2 font-display text-4xl font-bold text-black md:text-5xl">
            Product Reviews
          </h1>

          <p className="mt-2 max-w-2xl text-sm leading-6 text-black/55">
            Moderate customer reviews,
            approve public feedback, reject
            inappropriate submissions and
            manage verified-purchase status.
          </p>
        </div>

        <div className="rounded-full bg-black px-5 py-3 text-sm font-bold text-white">
          {counts.pending} Pending
        </div>
      </div>

      {/* Filters */}
      <div className="mt-8 overflow-x-auto">
        <div className="flex min-w-max gap-2">
          {filters.map(
            ([value, label]) => {
              const active =
                activeStatus === value;

              const href =
                value === "all"
                  ? "/admin/reviews"
                  : `/admin/reviews?status=${value}`;

              return (
                <Link
                  key={value}
                  href={href}
                  className={[
                    "inline-flex items-center gap-2 rounded-full px-4 py-2.5 text-sm font-bold transition",
                    active
                      ? "bg-black text-white"
                      : "bg-white text-black shadow-soft hover:bg-[#f1eadf]"
                  ].join(" ")}
                >
                  {label}

                  <span
                    className={[
                      "rounded-full px-2 py-0.5 text-xs",
                      active
                        ? "bg-white/20 text-white"
                        : "bg-black/5 text-black"
                    ].join(" ")}
                  >
                    {counts[value]}
                  </span>
                </Link>
              );
            }
          )}
        </div>
      </div>

      {error ? (
        <div className="mt-8 rounded-[1.5rem] border border-red-200 bg-red-50 p-5 text-sm text-red-800">
          Unable to load product reviews.
        </div>
      ) : rows.length === 0 ? (
        <div className="mt-8 rounded-[2rem] bg-white p-10 text-center shadow-soft">
          <div className="font-display text-3xl font-bold text-black">
            No reviews
          </div>

          <p className="mt-3 text-black/55">
            No reviews exist in this
            status yet.
          </p>
        </div>
      ) : (
        <>
          {/* Desktop */}
          <div className="mt-8 hidden overflow-hidden rounded-[2rem] bg-white shadow-soft lg:block">
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="border-b border-black/10 bg-[#f8f6f1] text-left">
                    <th className="px-5 py-4 text-xs font-bold uppercase tracking-[.12em] text-black/50">
                      Customer
                    </th>

                    <th className="px-5 py-4 text-xs font-bold uppercase tracking-[.12em] text-black/50">
                      Product
                    </th>

                    <th className="px-5 py-4 text-xs font-bold uppercase tracking-[.12em] text-black/50">
                      Rating
                    </th>

                    <th className="px-5 py-4 text-xs font-bold uppercase tracking-[.12em] text-black/50">
                      Review
                    </th>

                    <th className="px-5 py-4 text-xs font-bold uppercase tracking-[.12em] text-black/50">
                      Status
                    </th>

                    <th className="px-5 py-4 text-xs font-bold uppercase tracking-[.12em] text-black/50">
                      Submitted
                    </th>

                    <th className="px-5 py-4 text-right text-xs font-bold uppercase tracking-[.12em] text-black/50">
                      Action
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {rows.map((review) => (
                    <tr
                      key={review.id}
                      className="border-b border-black/5 last:border-b-0"
                    >
                      <td className="px-5 py-5 align-top">
                        <div className="font-bold text-black">
                          {review.customer_name}
                        </div>

                        {review.email ? (
                          <div className="mt-1 text-xs text-black/50">
                            {review.email}
                          </div>
                        ) : null}

                        {review.verified_purchase ? (
                          <span className="mt-2 inline-flex rounded-full bg-green-50 px-2.5 py-1 text-[11px] font-bold text-green-700">
                            Verified Purchase
                          </span>
                        ) : null}
                      </td>

                      <td className="px-5 py-5 align-top">
                        <div className="font-mono text-sm font-bold text-black">
                          {review.product_id}
                        </div>
                      </td>

                      <td className="px-5 py-5 align-top">
                        <div className="whitespace-nowrap text-lg tracking-wide text-amber-500">
                          {renderStars(review.rating)}
                        </div>

                        <div className="mt-1 text-xs text-black/45">
                          {review.rating}/5
                        </div>
                      </td>

                      <td className="px-5 py-5 align-top">
                        <div className="max-w-[280px]">
                          {review.review_title ? (
                            <div className="font-bold text-black">
                              {review.review_title}
                            </div>
                          ) : null}

                          <p className="mt-1 line-clamp-3 text-sm leading-6 text-black/60">
                            {review.review_text}
                          </p>
                        </div>
                      </td>

                      <td className="px-5 py-5 align-top">
                        <span
                          className={[
                            "inline-flex rounded-full px-3 py-1.5 text-xs font-bold",
                            statusStyles[
                              review.status
                            ] ||
                              "bg-black/5 text-black"
                          ].join(" ")}
                        >
                          {statusLabels[
                            review.status
                          ] ||
                            review.status}
                        </span>
                      </td>

                      <td className="px-5 py-5 align-top text-sm text-black/55">
                        {formatDate(
                          review.created_at
                        )}
                      </td>

                      <td className="px-5 py-5 text-right align-top">
                        <Link
                          href={`/admin/reviews/${review.id}`}
                          className="inline-flex rounded-full bg-black px-4 py-2 text-sm font-bold text-white transition hover:bg-black/80"
                        >
                          Review
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Mobile */}
          <div className="mt-8 grid gap-4 lg:hidden">
            {rows.map((review) => (
              <article
                key={review.id}
                className="rounded-[1.75rem] bg-white p-5 shadow-soft"
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="font-display text-2xl font-bold">
                      {review.customer_name}
                    </div>

                    <div className="mt-2 text-lg tracking-wide text-amber-500">
                      {renderStars(
                        review.rating
                      )}
                    </div>
                  </div>

                  <span
                    className={[
                      "shrink-0 rounded-full px-3 py-1.5 text-xs font-bold",
                      statusStyles[
                        review.status
                      ] ||
                        "bg-black/5 text-black"
                    ].join(" ")}
                  >
                    {statusLabels[
                      review.status
                    ] ||
                      review.status}
                  </span>
                </div>

                <div className="mt-5 rounded-2xl bg-[#f8f6f1] p-4">
                  <div className="text-xs font-bold uppercase tracking-[.12em] text-black/40">
                    Product
                  </div>

                  <div className="mt-1 font-mono text-sm font-bold">
                    {review.product_id}
                  </div>

                  {review.review_title ? (
                    <div className="mt-4 font-bold">
                      {review.review_title}
                    </div>
                  ) : null}

                  <p className="mt-2 text-sm leading-6 text-black/60">
                    {review.review_text}
                  </p>
                </div>

                {review.verified_purchase ? (
                  <div className="mt-4 inline-flex rounded-full bg-green-50 px-3 py-1.5 text-xs font-bold text-green-700">
                    Verified Purchase
                  </div>
                ) : null}

                <div className="mt-4 text-xs text-black/45">
                  Submitted{" "}
                  {formatDate(
                    review.created_at
                  )}
                </div>

                <Link
                  href={`/admin/reviews/${review.id}`}
                  className="mt-5 block rounded-full bg-black px-5 py-3 text-center text-sm font-bold text-white"
                >
                  Review Submission
                </Link>
              </article>
            ))}
          </div>
        </>
      )}
    </main>
  );
}