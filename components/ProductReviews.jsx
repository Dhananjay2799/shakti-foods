"use client";

import {
  useMemo,
  useState
} from "react";

import {
  CheckCircle2,
  Star
} from "lucide-react";

function StarRating({
  value,
  onChange,
  interactive = false,
  size = 22
}) {
  return (
    <div
      className="flex items-center gap-1"
      aria-label={`${value} out of 5 stars`}
    >
      {[1, 2, 3, 4, 5].map(
        (star) => {
          const active =
            star <= value;

          if (interactive) {
            return (
              <button
                key={star}
                type="button"
                onClick={() =>
                  onChange(star)
                }
                className="transition hover:scale-110"
                aria-label={`Rate ${star} star${
                  star === 1 ? "" : "s"
                }`}
              >
                <Star
                  size={size}
                  className={
                    active
                      ? "fill-amber-400 text-amber-400"
                      : "text-black/20"
                  }
                />
              </button>
            );
          }

          return (
            <Star
              key={star}
              size={size}
              className={
                active
                  ? "fill-amber-400 text-amber-400"
                  : "text-black/15"
              }
            />
          );
        }
      )}
    </div>
  );
}

export default function ProductReviews({
  productId,
  productName,
  reviews = []
}) {
  const [customerName, setCustomerName] =
    useState("");

  const [email, setEmail] =
    useState("");

  const [rating, setRating] =
    useState(0);

  const [reviewTitle, setReviewTitle] =
    useState("");

  const [reviewText, setReviewText] =
    useState("");

  const [submitting, setSubmitting] =
    useState(false);

  const [error, setError] =
    useState("");

  const [success, setSuccess] =
    useState(false);

  const averageRating = useMemo(() => {
    if (!reviews.length) {
      return 0;
    }

    const total = reviews.reduce(
      (sum, review) =>
        sum + Number(review.rating || 0),
      0
    );

    return total / reviews.length;
  }, [reviews]);

  async function handleSubmit(event) {
    event.preventDefault();

    setError("");
    setSuccess(false);

    if (rating < 1) {
      setError(
        "Please select a star rating."
      );
      return;
    }

    setSubmitting(true);

    try {
      const response = await fetch(
        "/api/reviews",
        {
          method: "POST",
          headers: {
            "Content-Type":
              "application/json"
          },
          body: JSON.stringify({
            productId,
            customerName,
            email,
            rating,
            reviewTitle,
            reviewText
          })
        }
      );

      const data =
        await response.json();

      if (!response.ok) {
        throw new Error(
          data.message ||
            "Unable to submit review."
        );
      }

      setSuccess(true);

      setCustomerName("");
      setEmail("");
      setRating(0);
      setReviewTitle("");
      setReviewText("");
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : "Unable to submit review."
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section
      id="reviews"
      className="rounded-[2rem] bg-white p-5 shadow-soft md:p-8"
    >
      <div className="grid gap-10 lg:grid-cols-[.8fr_1.2fr]">

        {/* REVIEW SUMMARY */}
        <div>
          <div className="text-xs font-black uppercase tracking-[.18em] text-black/45">
            Customer Reviews
          </div>

          <h2 className="mt-2 font-display text-3xl font-bold md:text-4xl">
            What customers say
          </h2>

          {reviews.length > 0 ? (
            <div className="mt-6 rounded-[1.5rem] bg-[#f8f4ed] p-6">

              <div className="flex items-end gap-2">
                <span className="font-display text-5xl font-bold">
                  {averageRating.toFixed(
                    1
                  )}
                </span>

                <span className="pb-1 text-sm text-black/50">
                  / 5
                </span>
              </div>

              <div className="mt-3">
                <StarRating
                  value={Math.round(
                    averageRating
                  )}
                />
              </div>

              <p className="mt-3 text-sm text-black/60">
                Based on{" "}
                {reviews.length} approved{" "}
                {reviews.length === 1
                  ? "review"
                  : "reviews"}
              </p>
            </div>
          ) : (
            <div className="mt-6 rounded-[1.5rem] bg-[#f8f4ed] p-6">
              <div className="font-bold">
                No reviews yet.
              </div>

              <p className="mt-2 text-sm leading-6 text-black/55">
                Be the first to share your
                experience with {productName}.
              </p>
            </div>
          )}

          {/* APPROVED REVIEWS */}
          {reviews.length > 0 ? (
            <div className="mt-6 grid gap-4">
              {reviews.map(
                (review) => (
                  <article
                    key={review.id}
                    className="rounded-[1.5rem] border border-black/10 p-5"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <div className="font-bold">
                          {
                            review.customer_name
                          }
                        </div>

                        {review.verified_purchase ? (
                          <div className="mt-1 flex items-center gap-1 text-xs font-bold text-green-700">
                            <CheckCircle2
                              size={14}
                            />

                            Verified Purchase
                          </div>
                        ) : null}
                      </div>

                      <StarRating
                        value={Number(
                          review.rating
                        )}
                        size={17}
                      />
                    </div>

                    {review.review_title ? (
                      <h3 className="mt-4 font-bold">
                        {
                          review.review_title
                        }
                      </h3>
                    ) : null}

                    <p className="mt-2 whitespace-pre-line text-sm leading-7 text-black/65">
                      {review.review_text}
                    </p>

                    {review.created_at ? (
                      <div className="mt-4 text-xs text-black/40">
                        {new Intl.DateTimeFormat(
                          "en-US",
                          {
                            year: "numeric",
                            month: "short",
                            day: "numeric"
                          }
                        ).format(
                          new Date(
                            review.created_at
                          )
                        )}
                      </div>
                    ) : null}
                  </article>
                )
              )}
            </div>
          ) : null}
        </div>

        {/* REVIEW FORM */}
        <div>
          <div className="rounded-[1.75rem] bg-[#f8f4ed] p-5 md:p-7">

            <div className="text-xs font-black uppercase tracking-[.18em] text-black/45">
              Share Your Experience
            </div>

            <h3 className="mt-2 font-display text-3xl font-bold">
              Write a Review
            </h3>

            <p className="mt-2 text-sm leading-6 text-black/55">
              Your review will be published
              after our team reviews it.
            </p>

            {success ? (
              <div className="mt-6 rounded-2xl border border-green-200 bg-green-50 p-5">
                <div className="flex items-center gap-2 font-bold text-green-800">
                  <CheckCircle2
                    size={19}
                  />

                  Review submitted
                </div>

                <p className="mt-2 text-sm leading-6 text-green-800">
                  Thank you. Your review has
                  been received and is pending
                  approval.
                </p>
              </div>
            ) : (
              <form
                onSubmit={handleSubmit}
                className="mt-6 grid gap-5"
              >
                <div>
                  <label className="text-sm font-bold">
                    Rating *
                  </label>

                  <div className="mt-2">
                    <StarRating
                      value={rating}
                      onChange={setRating}
                      interactive
                      size={28}
                    />
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label
                      htmlFor={`review-name-${productId}`}
                      className="text-sm font-bold"
                    >
                      Your Name *
                    </label>

                    <input
                      id={`review-name-${productId}`}
                      value={customerName}
                      onChange={(event) =>
                        setCustomerName(
                          event.target.value
                        )
                      }
                      required
                      maxLength={150}
                      placeholder="Full name"
                      className="mt-2 w-full rounded-2xl border border-black/10 bg-white px-4 py-3 outline-none transition focus:border-black/30"
                    />
                  </div>

                  <div>
                    <label
                      htmlFor={`review-email-${productId}`}
                      className="text-sm font-bold"
                    >
                      Email
                    </label>

                    <input
                      id={`review-email-${productId}`}
                      type="email"
                      value={email}
                      onChange={(event) =>
                        setEmail(
                          event.target.value
                        )
                      }
                      maxLength={254}
                      placeholder="you@example.com"
                      className="mt-2 w-full rounded-2xl border border-black/10 bg-white px-4 py-3 outline-none transition focus:border-black/30"
                    />
                  </div>
                </div>

                <div>
                  <label
                    htmlFor={`review-title-${productId}`}
                    className="text-sm font-bold"
                  >
                    Review Title
                  </label>

                  <input
                    id={`review-title-${productId}`}
                    value={reviewTitle}
                    onChange={(event) =>
                      setReviewTitle(
                        event.target.value
                      )
                    }
                    maxLength={150}
                    placeholder="Summarize your experience"
                    className="mt-2 w-full rounded-2xl border border-black/10 bg-white px-4 py-3 outline-none transition focus:border-black/30"
                  />
                </div>

                <div>
                  <label
                    htmlFor={`review-text-${productId}`}
                    className="text-sm font-bold"
                  >
                    Your Review *
                  </label>

                  <textarea
                    id={`review-text-${productId}`}
                    value={reviewText}
                    onChange={(event) =>
                      setReviewText(
                        event.target.value
                      )
                    }
                    required
                    maxLength={3000}
                    rows={6}
                    placeholder="Tell us about your experience with this product..."
                    className="mt-2 w-full resize-y rounded-2xl border border-black/10 bg-white px-4 py-3 outline-none transition focus:border-black/30"
                  />
                </div>

                {error ? (
                  <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-700">
                    {error}
                  </div>
                ) : null}

                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full rounded-full bg-black px-6 py-4 font-bold text-white transition hover:bg-[#333333] disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
                >
                  {submitting
                    ? "Submitting..."
                    : "Submit Review"}
                </button>
              </form>
            )}

          </div>
        </div>

      </div>
    </section>
  );
}