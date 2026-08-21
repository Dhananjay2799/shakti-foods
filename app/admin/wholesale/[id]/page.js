import Link from "next/link";
import { notFound } from "next/navigation";
import { createSupabaseAdmin } from "@/lib/supabase-admin";

import {
  updateWholesaleInquiry,
  createWholesaleQuote,
  sendWholesaleQuote,
  convertWholesaleQuoteToOrder
} from "@/app/admin/wholesale/actions";

export const dynamic = "force-dynamic";

const statusStyles = {
  new: "bg-blue-50 text-blue-800",
  contacted: "bg-amber-50 text-amber-800",
  quoted: "bg-purple-50 text-purple-800",
  won: "bg-green-50 text-green-800",
  lost: "bg-red-50 text-red-800"
};

const statusLabels = {
  new: "New",
  contacted: "Contacted",
  quoted: "Quoted",
  won: "Won",
  lost: "Lost"
};

const quoteStatusStyles = {
  draft: "bg-amber-50 text-amber-800",
  sent: "bg-blue-50 text-blue-800",
  accepted: "bg-green-50 text-green-800",
  declined: "bg-red-50 text-red-800",
  expired: "bg-black/5 text-black/60",
  converted: "bg-black text-white"
};

function formatDate(value) {
  if (!value) {
    return "—";
  }

  return new Intl.DateTimeFormat(
    "en-US",
    {
      dateStyle: "medium",
      timeStyle: "short"
    }
  ).format(
    new Date(value)
  );
}

function formatQuoteDate(value) {
  if (!value) {
    return "—";
  }

  return new Intl.DateTimeFormat(
    "en-US",
    {
      dateStyle: "medium"
    }
  ).format(
    new Date(
      `${value}T00:00:00`
    )
  );
}

function formatMoney(
  cents,
  currency = "USD"
) {
  return new Intl.NumberFormat(
    "en-US",
    {
      style: "currency",
      currency
    }
  ).format(
    Number(cents || 0) / 100
  );
}

function formatBusinessType(value) {
  const labels = {
    restaurant: "Restaurant",
    caterer: "Caterer",
    event: "Event / Wedding",
    school: "School / Institution",
    "food-truck": "Food Truck",
    distributor:
      "Distributor / Wholesaler",
    retailer: "Retailer",
    other: "Other"
  };

  return (
    labels[value] ||
    value ||
    "Not provided"
  );
}

function formatFrequency(value) {
  const labels = {
    "one-time": "One-time order",
    weekly: "Weekly",
    biweekly: "Every 2 weeks",
    monthly: "Monthly",
    quarterly: "Quarterly",
    ongoing: "Ongoing / Variable"
  };

  return (
    labels[value] ||
    value ||
    "Not provided"
  );
}

export default async function WholesaleInquiryDetailPage({
  params,
  searchParams
}) {
  const resolvedParams =
    await Promise.resolve(params);

  const resolvedSearchParams =
    await Promise.resolve(searchParams);

  const quoteError =
    resolvedSearchParams?.quoteError ===
    "email-send-failed"
      ? "Unable to send this quote. Please verify the customer email address and try again."
      : null;

  const inquiryId =
    String(
      resolvedParams?.id || ""
    ).trim();

  if (!inquiryId) {
    notFound();
  }

  const supabase =
    createSupabaseAdmin();

  const {
    data: inquiry,
    error
  } = await supabase
    .from("wholesale_inquiries")
    .select(`
      id,
      product_id,
      product_name,
      customer_name,
      business_name,
      business_type,
      email,
      phone,
      estimated_quantity,
      quantity_unit,
      purchase_frequency,
      delivery_city,
      delivery_state,
      delivery_postal_code,
      message,
      status,
      internal_notes,
      contacted_at,
      quoted_at,
      won_at,
      lost_at,
      created_at,
      updated_at
    `)
    .eq(
      "id",
      inquiryId
    )
    .maybeSingle();

  if (error) {
    console.error(
      "Unable to load wholesale inquiry:",
      error
    );

    throw new Error(
      error.message ||
        "Unable to load wholesale inquiry."
    );
  }

  if (!inquiry) {
    notFound();
  }

  const [
    productsResult,
    quotesResult
  ] = await Promise.all([
    supabase
      .from("products")
      .select(`
        product_id,
        title,
        price_cents,
        category,
        status,
        is_active
      `)
      .eq(
        "status",
        "active"
      )
      .eq(
        "is_active",
        true
      )
      .is(
        "deleted_at",
        null
      )
      .order(
        "title",
        {
          ascending: true
        }
      ),

    supabase
      .from("wholesale_quotes")
      .select(`
        id,
        quote_number,
        status,
        currency,
        subtotal_cents,
        discount_cents,
        shipping_cents,
        tax_cents,
        total_cents,
        valid_until,
        payment_terms,
        customer_notes,
        internal_notes,
        sent_at,
        accepted_at,
        declined_at,
        expired_at,
        converted_at,
        converted_order_id,
        created_at,
        wholesale_quote_items (
          id,
          product_id,
          product_name,
          quantity,
          unit_price_cents,
          line_total_cents,
          sort_order
        )
      `)
      .eq(
        "inquiry_id",
        inquiry.id
      )
      .order(
        "created_at",
        {
          ascending: false
        }
      )
  ]);

  if (
    productsResult.error
  ) {
    console.error(
      "Unable to load products for wholesale quote:",
      productsResult.error
    );
  }

  if (
    quotesResult.error
  ) {
    console.error(
      "Unable to load wholesale quotes:",
      quotesResult.error
    );
  }

  const quoteProducts =
    productsResult.data || [];

  const quotes =
    quotesResult.data || [];

  const defaultProduct =
    quoteProducts.find(
      (product) =>
        product.product_id ===
        inquiry.product_id
    ) ||
    quoteProducts[0] ||
    null;

  const defaultQuantity =
    Math.max(
      1,
      Number(
        inquiry.estimated_quantity ||
          1
      )
    );

  return (
    <main>
      {/* Header */}
      <div className="flex flex-col gap-5 md:flex-row md:items-start md:justify-between">
        <div>
          <Link
            href="/admin/wholesale"
            className="inline-flex rounded-full bg-white px-4 py-2 text-sm font-bold text-black shadow-soft transition hover:bg-[#f1eadf]"
          >
            ← Back to Wholesale Inquiries
          </Link>

          <div className="mt-6 text-xs font-bold uppercase tracking-[.2em] text-black/40">
            B2B Sales Opportunity
          </div>

          <h1 className="mt-2 font-display text-4xl font-bold text-black md:text-5xl">
            {inquiry.customer_name}
          </h1>

          <p className="mt-2 text-sm text-black/50">
            Received{" "}
            {formatDate(
              inquiry.created_at
            )}
          </p>
        </div>

        <span
          className={[
            "inline-flex w-fit rounded-full px-4 py-2 text-sm font-bold",
            statusStyles[
              inquiry.status
            ] ||
              "bg-black/5 text-black"
          ].join(" ")}
        >
          {statusLabels[
            inquiry.status
          ] ||
            inquiry.status}
        </span>
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_380px]">
        {/* Main content */}
        <div className="grid gap-6">

          {/* Product Opportunity */}
          <section className="rounded-[2rem] bg-white p-5 shadow-soft md:p-6">
            <div className="text-xs font-bold uppercase tracking-[.16em] text-black/40">
              Product Opportunity
            </div>

            <h2 className="mt-2 font-display text-3xl font-bold text-black">
              {inquiry.product_name}
            </h2>

            {inquiry.product_id ? (
              <div className="mt-3 font-mono text-sm text-black/45">
                {inquiry.product_id}
              </div>
            ) : null}

            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              <div className="rounded-2xl bg-[#f8f6f1] p-4">
                <div className="text-xs font-bold uppercase tracking-[.14em] text-black/40">
                  Estimated Quantity
                </div>

                <div className="mt-2 font-bold text-black">
                  {inquiry.estimated_quantity
                    ? `${Number(
                        inquiry.estimated_quantity
                      ).toLocaleString()} ${
                        inquiry.quantity_unit ||
                        "units"
                      }`
                    : "Not provided"}
                </div>
              </div>

              <div className="rounded-2xl bg-[#f8f6f1] p-4">
                <div className="text-xs font-bold uppercase tracking-[.14em] text-black/40">
                  Purchase Frequency
                </div>

                <div className="mt-2 font-bold text-black">
                  {formatFrequency(
                    inquiry.purchase_frequency
                  )}
                </div>
              </div>
            </div>
          </section>

          {/* Create Quote */}
          <section className="rounded-[2rem] bg-white p-5 shadow-soft md:p-6">
            <div className="text-xs font-bold uppercase tracking-[.16em] text-black/40">
              B2B Quote
            </div>

            {quoteError ? (
              <div
                role="alert"
                className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-700"
              >
                {quoteError}
              </div>
            ) : null}

            <div className="mt-2 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
              <div>
                <h2 className="font-display text-3xl font-bold text-black">
                  Create Wholesale Quote
                </h2>

                <p className="mt-2 max-w-2xl text-sm leading-6 text-black/55">
                  Create a formal wholesale
                  offer using the requested
                  quantity as a starting point.
                  Prices entered here become
                  historical quoted prices.
                </p>
              </div>

              <div className="text-sm font-bold text-black/50">
                {quotes.length}{" "}
                {quotes.length === 1
                  ? "quote"
                  : "quotes"}
              </div>
            </div>

            {defaultProduct ? (
              <form
                action={
                  createWholesaleQuote
                }
                className="mt-7 grid gap-5"
              >
                <input
                  type="hidden"
                  name="inquiryId"
                  value={inquiry.id}
                />

                <div className="grid gap-5 md:grid-cols-2">
                  <label className="grid gap-2">
                    <span className="text-sm font-bold text-black">
                      Product
                    </span>

                    <select
                      name="productId"
                      defaultValue={
                        defaultProduct
                          .product_id
                      }
                      className="h-12 rounded-2xl border border-black/10 bg-white px-4 text-black outline-none focus:border-black"
                    >
                      {quoteProducts.map(
                        (product) => (
                          <option
                            key={
                              product
                                .product_id
                            }
                            value={
                              product
                                .product_id
                            }
                          >
                            {
                              product.title
                            }
                          </option>
                        )
                      )}
                    </select>
                  </label>

                  <label className="grid gap-2">
                    <span className="text-sm font-bold text-black">
                      Quantity
                    </span>

                    <input
                      type="number"
                      name="quantity"
                      min="1"
                      step="1"
                      defaultValue={
                        defaultQuantity
                      }
                      className="h-12 rounded-2xl border border-black/10 bg-white px-4 text-black outline-none focus:border-black"
                    />
                  </label>

                  <label className="grid gap-2">
                    <span className="text-sm font-bold text-black">
                      Wholesale Unit Price ($)
                    </span>

                    <input
                      type="number"
                      name="unitPrice"
                      min="0"
                      step="0.01"
                      defaultValue={
                        defaultProduct
                          .price_cents
                          ? (
                              Number(
                                defaultProduct
                                  .price_cents
                              ) / 100
                            ).toFixed(2)
                          : ""
                      }
                      placeholder="0.00"
                      className="h-12 rounded-2xl border border-black/10 bg-white px-4 text-black outline-none focus:border-black"
                    />
                  </label>

                  <label className="grid gap-2">
                    <span className="text-sm font-bold text-black">
                      Discount ($)
                    </span>

                    <input
                      type="number"
                      name="discount"
                      min="0"
                      step="0.01"
                      defaultValue="0.00"
                      className="h-12 rounded-2xl border border-black/10 bg-white px-4 text-black outline-none focus:border-black"
                    />
                  </label>

                  <label className="grid gap-2">
                    <span className="text-sm font-bold text-black">
                      Shipping ($)
                    </span>

                    <input
                      type="number"
                      name="shipping"
                      min="0"
                      step="0.01"
                      defaultValue="0.00"
                      className="h-12 rounded-2xl border border-black/10 bg-white px-4 text-black outline-none focus:border-black"
                    />
                  </label>

                  <label className="grid gap-2">
                    <span className="text-sm font-bold text-black">
                      Tax ($)
                    </span>

                    <input
                      type="number"
                      name="tax"
                      min="0"
                      step="0.01"
                      defaultValue="0.00"
                      className="h-12 rounded-2xl border border-black/10 bg-white px-4 text-black outline-none focus:border-black"
                    />
                  </label>

                  <label className="grid gap-2">
                    <span className="text-sm font-bold text-black">
                      Valid Until
                    </span>

                    <input
                      type="date"
                      name="validUntil"
                      className="h-12 rounded-2xl border border-black/10 bg-white px-4 text-black outline-none focus:border-black"
                    />
                  </label>
                </div>

                <label className="grid gap-2">
                  <span className="text-sm font-bold text-black">
                    Payment Terms
                  </span>

                  <input
                    name="paymentTerms"
                    defaultValue="Payment due upon acceptance"
                    className="h-12 rounded-2xl border border-black/10 bg-white px-4 text-black outline-none focus:border-black"
                    placeholder="Net 15, Net 30, payment upon acceptance..."
                  />
                </label>

                <label className="grid gap-2">
                  <span className="text-sm font-bold text-black">
                    Customer Notes
                  </span>

                  <textarea
                    name="customerNotes"
                    rows={4}
                    className="rounded-2xl border border-black/10 bg-white px-4 py-3 text-black outline-none focus:border-black"
                    placeholder="Delivery expectations, case requirements, quote conditions..."
                  />
                </label>

                <label className="grid gap-2">
                  <span className="text-sm font-bold text-black">
                    Internal Quote Notes
                  </span>

                  <textarea
                    name="quoteInternalNotes"
                    rows={4}
                    className="rounded-2xl border border-black/10 bg-white px-4 py-3 text-black outline-none focus:border-black"
                    placeholder="Margin notes, negotiation details, approval information..."
                  />
                </label>

                <button
                  type="submit"
                  className="w-full rounded-full bg-black px-6 py-4 font-bold text-white transition hover:bg-black/80 md:w-fit"
                >
                  Create Draft Quote
                </button>
              </form>
            ) : (
              <div className="mt-6 rounded-2xl bg-amber-50 p-4 text-sm font-bold text-amber-900">
                No active products are
                available for quotation.
              </div>
            )}
          </section>

          {/* Quote History */}
          {quotes.length > 0 ? (
            <section className="rounded-[2rem] bg-white p-5 shadow-soft md:p-6">
              <h2 className="font-display text-3xl font-bold text-black">
                Quote History
              </h2>

              <div className="mt-6 grid gap-4">
                {quotes.map(
                  (quote) => (
                    <div
                      key={quote.id}
                      className="rounded-2xl border border-black/10 p-5"
                    >
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                        <div>
                          <div className="font-mono text-sm font-bold text-black">
                            {
                              quote.quote_number
                            }
                          </div>

                          <div className="mt-1 text-xs text-black/45">
                            Created{" "}
                            {formatDate(
                              quote.created_at
                            )}
                          </div>
                        </div>

                        <span
                          className={[
                            "w-fit rounded-full px-3 py-1.5 text-xs font-bold uppercase",
                            quoteStatusStyles[
                              quote.status
                            ] ||
                              "bg-[#f8f6f1] text-black"
                          ].join(" ")}
                        >
                          {quote.status}
                        </span>
                      </div>

                      {/* Quote items */}
                      <div className="mt-5 grid gap-3 sm:grid-cols-2">
                        {(
                          quote.wholesale_quote_items ||
                          []
                        )
                          .sort(
                            (a, b) =>
                              Number(
                                a.sort_order ||
                                  0
                              ) -
                              Number(
                                b.sort_order ||
                                  0
                              )
                          )
                          .map(
                            (item) => (
                              <div
                                key={
                                  item.id
                                }
                                className="rounded-xl bg-[#f8f6f1] p-4"
                              >
                                <div className="font-bold text-black">
                                  {
                                    item.product_name
                                  }
                                </div>

                                <div className="mt-2 text-sm text-black/60">
                                  {Number(
                                    item.quantity
                                  ).toLocaleString()}{" "}
                                  ×{" "}
                                  {formatMoney(
                                    item.unit_price_cents,
                                    quote.currency
                                  )}
                                </div>

                                <div className="mt-2 font-bold text-black">
                                  {formatMoney(
                                    item.line_total_cents,
                                    quote.currency
                                  )}
                                </div>
                              </div>
                            )
                          )}
                      </div>

                      {/* Totals */}
                      <div className="mt-5 grid gap-2 border-t border-black/10 pt-4 text-sm">
                        <div className="flex justify-between">
                          <span className="text-black/55">
                            Subtotal
                          </span>

                          <span>
                            {formatMoney(
                              quote.subtotal_cents,
                              quote.currency
                            )}
                          </span>
                        </div>

                        {Number(
                          quote.discount_cents
                        ) > 0 ? (
                          <div className="flex justify-between">
                            <span className="text-black/55">
                              Discount
                            </span>

                            <span>
                              -
                              {formatMoney(
                                quote.discount_cents,
                                quote.currency
                              )}
                            </span>
                          </div>
                        ) : null}

                        <div className="flex justify-between">
                          <span className="text-black/55">
                            Shipping
                          </span>

                          <span>
                            {formatMoney(
                              quote.shipping_cents,
                              quote.currency
                            )}
                          </span>
                        </div>

                        <div className="flex justify-between">
                          <span className="text-black/55">
                            Tax
                          </span>

                          <span>
                            {formatMoney(
                              quote.tax_cents,
                              quote.currency
                            )}
                          </span>
                        </div>

                        <div className="mt-2 flex justify-between border-t border-black/10 pt-3 text-lg font-bold">
                          <span>
                            Total
                          </span>

                          <span>
                            {formatMoney(
                              quote.total_cents,
                              quote.currency
                            )}
                          </span>
                        </div>
                      </div>

                      {/* Quote metadata */}
                      {quote.valid_until ? (
                        <div className="mt-4 text-sm text-black/50">
                          Valid until{" "}
                          {formatQuoteDate(
                            quote.valid_until
                          )}
                        </div>
                      ) : null}

                      {quote.payment_terms ? (
                        <div className="mt-2 text-sm text-black/50">
                          Payment terms:{" "}
                          <span className="font-medium text-black/70">
                            {
                              quote.payment_terms
                            }
                          </span>
                        </div>
                      ) : null}

                      {quote.customer_notes ? (
                        <div className="mt-4 rounded-xl bg-[#f8f6f1] p-4 text-sm leading-6 text-black/65">
                          <div className="mb-1 font-bold text-black">
                            Customer Notes
                          </div>

                          {
                            quote.customer_notes
                          }
                        </div>
                      ) : null}

                      {/* Send Quote */}
                      {quote.status ===
                      "draft" ? (
                        <form
                          action={
                            sendWholesaleQuote
                          }
                          className="mt-5"
                        >
                          <input
                            type="hidden"
                            name="quoteId"
                            value={
                              quote.id
                            }
                          />

                          <button
                            type="submit"
                            className="rounded-full bg-black px-5 py-3 text-sm font-bold text-white transition hover:bg-black/80"
                          >
                            Send Quote
                          </button>
                        </form>
                      ) : quote.status ===
                        "sent" ? (
                        <div className="mt-5 rounded-2xl bg-green-50 px-4 py-3 text-sm font-bold text-green-800">
                          Quote sent to
                          customer
                          {quote.sent_at
                            ? ` on ${formatDate(
                                quote.sent_at
                              )}`
                            : ""}
                        </div>
                      ) : null}

                      {quote.status ===
                      "accepted" ? (
                        <div className="mt-5">
                          <div className="rounded-2xl bg-green-50 px-4 py-3 text-sm font-bold text-green-800">
                            Quote accepted
                            {quote.accepted_at
                              ? ` on ${formatDate(
                                  quote.accepted_at
                                )}`
                              : ""}
                          </div>

                          <form
                            action={
                              convertWholesaleQuoteToOrder
                            }
                            className="mt-4"
                          >
                            <input
                              type="hidden"
                              name="quoteId"
                              value={
                                quote.id
                              }
                            />

                            <button
                              type="submit"
                              className="rounded-full bg-black px-5 py-3 text-sm font-bold text-white transition hover:bg-black/80"
                            >
                              Convert to Order
                            </button>
                          </form>
                        </div>
                      ) : null}

                      {quote.status ===
                      "declined" ? (
                        <div className="mt-5 rounded-2xl bg-red-50 px-4 py-3 text-sm font-bold text-red-800">
                          Quote declined
                          {quote.declined_at
                            ? ` on ${formatDate(
                                quote.declined_at
                              )}`
                            : ""}
                        </div>
                      ) : null}

                      {quote.status ===
                      "converted" ? (
                        <div className="mt-5">
                          <div className="rounded-2xl bg-black px-4 py-3 text-sm font-bold text-white">
                            Quote converted to order
                            {quote.converted_at
                              ? ` on ${formatDate(
                                  quote.converted_at
                                )}`
                              : ""}
                          </div>

                          {quote.converted_order_id ? (
                            <Link
                              href={`/admin/orders/${quote.converted_order_id}`}
                              className="mt-4 inline-flex rounded-full border border-black px-5 py-3 text-sm font-bold text-black transition hover:bg-black hover:text-white"
                            >
                              View Order
                            </Link>
                          ) : null}
                        </div>
                      ) : null}
                    </div>
                  )
                )}
              </div>
            </section>
          ) : null}

          {/* Customer */}
          <section className="rounded-[2rem] bg-white p-5 shadow-soft md:p-6">
            <h2 className="font-display text-3xl font-bold text-black">
              Customer & Business
            </h2>

            <div className="mt-6 grid gap-5 sm:grid-cols-2">
              <div className="rounded-2xl bg-[#f8f6f1] p-4">
                <div className="text-xs font-bold uppercase tracking-[.14em] text-black/40">
                  Contact
                </div>

                <div className="mt-3 font-bold text-black">
                  {
                    inquiry.customer_name
                  }
                </div>

                <a
                  href={`mailto:${inquiry.email}`}
                  className="mt-2 block text-sm text-black/65 hover:underline"
                >
                  {inquiry.email}
                </a>

                {inquiry.phone ? (
                  <a
                    href={`tel:${inquiry.phone}`}
                    className="mt-1 block text-sm text-black/65 hover:underline"
                  >
                    {inquiry.phone}
                  </a>
                ) : null}
              </div>

              <div className="rounded-2xl bg-[#f8f6f1] p-4">
                <div className="text-xs font-bold uppercase tracking-[.14em] text-black/40">
                  Business
                </div>

                <div className="mt-3 font-bold text-black">
                  {inquiry.business_name ||
                    "Not provided"}
                </div>

                <div className="mt-2 text-sm text-black/65">
                  {formatBusinessType(
                    inquiry.business_type
                  )}
                </div>
              </div>
            </div>
          </section>

          {/* Delivery */}
          <section className="rounded-[2rem] bg-white p-5 shadow-soft md:p-6">
            <h2 className="font-display text-3xl font-bold text-black">
              Delivery Location
            </h2>

            <div className="mt-5 rounded-2xl bg-[#f8f6f1] p-4 leading-7 text-black">
              {[
                inquiry.delivery_city,
                inquiry.delivery_state,
                inquiry.delivery_postal_code
              ]
                .filter(Boolean)
                .join(", ") ||
                "Not provided"}
            </div>
          </section>

          {/* Customer Message */}
          <section className="rounded-[2rem] bg-white p-5 shadow-soft md:p-6">
            <h2 className="font-display text-3xl font-bold text-black">
              Customer Message
            </h2>

            <div className="mt-5 rounded-2xl bg-[#f8f6f1] p-4 leading-7 text-black">
              {inquiry.message ||
                "No message was submitted."}
            </div>
          </section>

          {/* Timeline */}
          <section className="rounded-[2rem] bg-white p-5 shadow-soft md:p-6">
            <h2 className="font-display text-3xl font-bold text-black">
              Opportunity Timeline
            </h2>

            <div className="mt-6 grid gap-4">
              <TimelineItem
                label="Inquiry Received"
                value={
                  inquiry.created_at
                }
              />

              <TimelineItem
                label="Contacted"
                value={
                  inquiry.contacted_at
                }
              />

              <TimelineItem
                label="Quoted"
                value={
                  inquiry.quoted_at
                }
              />

              <TimelineItem
                label="Won"
                value={
                  inquiry.won_at
                }
              />

              <TimelineItem
                label="Lost"
                value={
                  inquiry.lost_at
                }
              />
            </div>
          </section>
        </div>

        {/* Sidebar */}
        <aside className="h-fit rounded-[2rem] bg-white p-5 shadow-soft md:p-6 lg:sticky lg:top-28">
          <div className="text-xs font-bold uppercase tracking-[.16em] text-black/40">
            Sales Workflow
          </div>

          <h2 className="mt-2 font-display text-3xl font-bold text-black">
            Manage Opportunity
          </h2>

          <p className="mt-2 text-sm leading-6 text-black/55">
            Track the sales process from new
            lead through quote and conversion.
          </p>

          <div className="mt-6 rounded-2xl bg-[#f8f6f1] p-4">
            <div className="text-xs font-bold uppercase tracking-[.14em] text-black/40">
              Current Status
            </div>

            <div className="mt-2 font-bold text-black">
              {statusLabels[
                inquiry.status
              ] ||
                inquiry.status}
            </div>
          </div>

          <form
            action={
              updateWholesaleInquiry
            }
            className="mt-6 grid gap-4"
          >
            <input
              type="hidden"
              name="inquiryId"
              value={inquiry.id}
            />

            <label className="grid gap-2">
              <span className="text-sm font-bold text-black">
                Status
              </span>

              <select
                name="status"
                defaultValue={
                  inquiry.status
                }
                className="h-12 rounded-2xl border border-black/10 bg-white px-4 text-black outline-none focus:border-black"
              >
                <option value="new">
                  New
                </option>

                <option value="contacted">
                  Contacted
                </option>

                <option value="quoted">
                  Quoted
                </option>

                <option value="won">
                  Won
                </option>

                <option value="lost">
                  Lost
                </option>
              </select>
            </label>

            <label className="grid gap-2">
              <span className="text-sm font-bold text-black">
                Internal Notes
              </span>

              <textarea
                name="internalNotes"
                defaultValue={
                  inquiry.internal_notes ||
                  ""
                }
                rows={7}
                className="rounded-2xl border border-black/10 bg-white px-4 py-3 text-black outline-none focus:border-black"
                placeholder="Pricing discussion, requested case quantities, follow-up date, quote details..."
              />
            </label>

            <button
              type="submit"
              className="mt-2 w-full rounded-full bg-black px-6 py-4 font-bold text-white transition hover:bg-black/80"
            >
              Save Changes
            </button>
          </form>

          <div className="mt-6 border-t border-black/10 pt-5">
            <a
              href={`mailto:${inquiry.email}`}
              className="block rounded-full border border-black px-5 py-3 text-center text-sm font-bold text-black transition hover:bg-black hover:text-white"
            >
              Email Customer
            </a>

            {inquiry.phone ? (
              <a
                href={`tel:${inquiry.phone}`}
                className="mt-3 block rounded-full border border-black px-5 py-3 text-center text-sm font-bold text-black transition hover:bg-black hover:text-white"
              >
                Call Customer
              </a>
            ) : null}
          </div>
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