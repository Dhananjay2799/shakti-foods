import { notFound } from "next/navigation";
import { createSupabaseAdmin } from "@/lib/supabase-admin";
import {
  acceptWholesaleQuote,
  declineWholesaleQuote
} from "@/app/wholesale/quote/actions";

export const dynamic = "force-dynamic";

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

function formatDate(value) {
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

export default async function WholesaleQuotePage({
  searchParams
}) {
  const resolvedSearchParams =
    await Promise.resolve(searchParams);

  const token =
    String(
      resolvedSearchParams?.token || ""
    ).trim();

  if (!token) {
    notFound();
  }

  const supabase =
    createSupabaseAdmin();

  const {
    data: quote,
    error
  } = await supabase
    .from("wholesale_quotes")
    .select(`
      id,
      inquiry_id,
      quote_number,
      storefront,
      response_token,
      status,
      customer_name,
      business_name,
      email,
      currency,
      subtotal_cents,
      discount_cents,
      shipping_cents,
      tax_cents,
      total_cents,
      valid_until,
      payment_terms,
      customer_notes,
      sent_at,
      accepted_at,
      declined_at,
      expired_at,
      converted_at,
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
      "response_token",
      token
    )
    .maybeSingle();

  if (error) {
    console.error(
      "Unable to load wholesale quote:",
      error
    );

    throw new Error(
      error.message ||
        "Unable to load wholesale quote."
    );
  }

  if (!quote) {
    notFound();
  }

  const isEcoware =
    quote.storefront === "ecoware";

  const brandName =
    isEcoware
      ? "Simpli Ecoware"
      : "Shakti Foods";

  const isExpired =
    quote.valid_until &&
    new Date(
      `${quote.valid_until}T23:59:59`
    ) < new Date();

  const actionable =
    quote.status === "sent" &&
    !isExpired;

  const items =
    (
      quote.wholesale_quote_items ||
      []
    ).sort(
      (a, b) =>
        Number(
          a.sort_order || 0
        ) -
        Number(
          b.sort_order || 0
        )
    );

  return (
    <main className="mx-auto max-w-4xl px-4 py-12 md:py-20">
      <div className="rounded-[2rem] bg-white p-6 shadow-soft md:p-10">
        <div className="border-b border-black/10 pb-6">
          <div className="text-xs font-black uppercase tracking-[.22em] text-black/45">
            {brandName}
          </div>

          <div className="mt-1 text-sm text-black/50">
            {isEcoware
              ? "Good for Earth, Good for You"
              : "Power of Purity"}
          </div>
        </div>

        <div className="mt-8 text-xs font-bold uppercase tracking-[.18em] text-black/40">
          Wholesale Quote
        </div>

        <h1 className="mt-2 font-display text-4xl font-bold text-black md:text-5xl">
          Wholesale Quote
        </h1>

        <div className="mt-3 font-mono text-sm text-black/50">
          {quote.quote_number}
        </div>

        <div className="mt-8">
          <div className="text-sm text-black/55">
            Prepared for
          </div>

          <div className="mt-1 text-xl font-bold text-black">
            {quote.customer_name}
          </div>

          {quote.business_name ? (
            <div className="mt-1 text-black/60">
              {quote.business_name}
            </div>
          ) : null}
        </div>

        <div className="mt-8 grid gap-4">
          {items.map((item) => (
            <div
              key={item.id}
              className="rounded-2xl bg-[#f8f6f1] p-5"
            >
              <div className="font-bold text-black">
                {item.product_name}
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

              <div className="mt-3 text-lg font-bold text-black">
                {formatMoney(
                  item.line_total_cents,
                  quote.currency
                )}
              </div>
            </div>
          ))}
        </div>

        <div className="mt-8 grid gap-3 border-t border-black/10 pt-6">
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

          <div className="mt-2 flex justify-between border-t border-black/10 pt-4 text-xl font-bold">
            <span>Total</span>

            <span>
              {formatMoney(
                quote.total_cents,
                quote.currency
              )}
            </span>
          </div>
        </div>

        <div className="mt-8 rounded-2xl bg-[#f8f6f1] p-5 text-sm leading-7 text-black/65">
          {quote.valid_until ? (
            <div>
              <strong>
                Valid until:
              </strong>{" "}
              {formatDate(
                quote.valid_until
              )}
            </div>
          ) : null}

          {quote.payment_terms ? (
            <div>
              <strong>
                Payment terms:
              </strong>{" "}
              {quote.payment_terms}
            </div>
          ) : null}

          {quote.customer_notes ? (
            <div className="mt-3">
              {quote.customer_notes}
            </div>
          ) : null}
        </div>

        {actionable ? (
          <div className="mt-8 grid gap-3 sm:grid-cols-2">
            <form
              action={
                acceptWholesaleQuote
              }
            >
              <input
                type="hidden"
                name="token"
                value={token}
              />

              <button
                type="submit"
                className="w-full rounded-full bg-black px-6 py-4 font-bold text-white transition hover:bg-black/80"
              >
                Accept Quote
              </button>
            </form>

            <form
              action={
                declineWholesaleQuote
              }
            >
              <input
                type="hidden"
                name="token"
                value={token}
              />

              <button
                type="submit"
                className="w-full rounded-full border border-black px-6 py-4 font-bold text-black transition hover:bg-black hover:text-white"
              >
                Decline Quote
              </button>
            </form>
          </div>
        ) : quote.status ===
          "accepted" ? (
          <div className="mt-8 rounded-2xl bg-green-50 p-5 font-bold text-green-800">
            This quote has been accepted.
          </div>
        ) : quote.status ===
          "declined" ? (
          <div className="mt-8 rounded-2xl bg-red-50 p-5 font-bold text-red-800">
            This quote has been declined.
          </div>
        ) : isExpired ? (
          <div className="mt-8 rounded-2xl bg-amber-50 p-5 font-bold text-amber-800">
            This quote has expired.
          </div>
        ) : (
          <div className="mt-8 rounded-2xl bg-black/5 p-5 font-bold text-black/60">
            This quote is no longer available for response.
          </div>
        )}
      </div>
    </main>
  );
}