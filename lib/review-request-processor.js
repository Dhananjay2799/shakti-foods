import { createSupabaseAdmin } from "@/lib/supabase-admin";
import { isInventoryProductId } from "@/lib/checkout-adjustment";
import { sendReviewRequestEmailSafely } from "@/lib/review-request-email";

/*
 * Daily: one "How was your rice?" email per paid order, a few days after
 * it should have arrived.
 *
 * When is an order "due"?
 *   delivered in admin            -> 5 days after delivered_at
 *   shipped in admin              -> 8 days after shipped_at
 *   otherwise (pickup, or status
 *   never updated in admin)       -> 10 days after the order
 *
 * Never sent:
 *   - more than 21 days after it was due (no surprise emails about old
 *     orders, e.g. right after this feature goes live),
 *   - to someone who got a review request in the last 90 days, or two
 *     in one run (subscriptions and repeat buyers aren't asked monthly),
 *   - to someone who unsubscribed (email_opt_outs),
 *   - for products that person has already reviewed,
 *   - for cancelled/refunded orders, test orders under $1.01, custom
 *     payments and wholesale orders (no product to review).
 */

const DELIVERED_DELAY_DAYS = 5;
const SHIPPED_DELAY_DAYS = 8;
const ORDERED_DELAY_DAYS = 10;
const MAX_LATE_DAYS = 21;
const REPEAT_GAP_DAYS = 90;
const MAX_PRODUCTS_PER_EMAIL = 3;
const MIN_ORDER_CENTS = 101;

const REVIEWABLE_ORDER_TYPES = ["retail", "subscription"];
const CLOSED_FULFILLMENT = new Set(["cancelled", "canceled", "refunded", "returned"]);

const DAY_MS = 24 * 60 * 60 * 1000;

function normalizeEmail(value) {
  return String(value || "").trim().toLowerCase();
}

function addDays(value, days) {
  return value ? new Date(new Date(value).getTime() + days * DAY_MS) : null;
}

export function reviewDueAt(order) {
  return (
    addDays(order.delivered_at, DELIVERED_DELAY_DAYS) ||
    addDays(order.shipped_at, SHIPPED_DELAY_DAYS) ||
    addDays(order.paid_at || order.created_at, ORDERED_DELAY_DAYS)
  );
}

/** Active products by ID: { id, slug, name, storefront }. */
async function loadProducts(supabase, productIds) {
  const byId = new Map();

  if (!productIds.length) {
    return byId;
  }

  const { data, error } = await supabase
    .from("products")
    .select("product_id, slug, title, storefront, status, is_active, deleted_at")
    .in("product_id", productIds);

  if (error) {
    throw new Error(error.message || "Unable to load products for review requests.");
  }

  for (const product of data || []) {
    if (product.status === "active" && product.is_active === true && !product.deleted_at) {
      byId.set(String(product.product_id), {
        id: String(product.product_id),
        // Same URL rule as the product pages.
        slug: product.slug || product.product_id,
        name: product.title || String(product.product_id),
        storefront: product.storefront
      });
    }
  }

  return byId;
}

export async function processReviewRequests({ limit = 25, now = new Date() } = {}) {
  const supabase = createSupabaseAdmin({ fresh: true });

  // Oldest order that could still be due today.
  const oldest = new Date(now.getTime() - (ORDERED_DELAY_DAYS + MAX_LATE_DAYS + 30) * DAY_MS);

  const { data: candidates, error } = await supabase
    .from("orders")
    .select(
      "id, storefront, order_type, customer_name, customer_email, total_amount, fulfillment_status, canceled_at, created_at, paid_at, shipped_at, delivered_at"
    )
    .eq("payment_status", "paid")
    .is("review_request_sent_at", null)
    .in("order_type", REVIEWABLE_ORDER_TYPES)
    .not("customer_email", "is", null)
    .gte("created_at", oldest.toISOString())
    .order("created_at", { ascending: true })
    .limit(500);

  if (error) {
    throw new Error(error.message || "Unable to load orders for review requests.");
  }

  const lateCutoff = new Date(now.getTime() - MAX_LATE_DAYS * DAY_MS);

  const due = (candidates || []).filter((order) => {
    const dueAt = reviewDueAt(order);

    return (
      dueAt &&
      dueAt <= now &&
      dueAt >= lateCutoff &&
      !order.canceled_at &&
      !CLOSED_FULFILLMENT.has(String(order.fulfillment_status || "").toLowerCase()) &&
      Number(order.total_amount || 0) >= MIN_ORDER_CENTS &&
      normalizeEmail(order.customer_email)
    );
  });

  const summary = { due: due.length, sent: 0, skipped: 0, failed: 0, results: [] };

  if (!due.length) {
    return summary;
  }

  const emails = [...new Set(due.map((order) => normalizeEmail(order.customer_email)))];

  // Who was asked recently, who unsubscribed, and what they already reviewed.
  const since = new Date(now.getTime() - REPEAT_GAP_DAYS * DAY_MS).toISOString();

  const [{ data: recentlyAsked, error: askedError }, { data: optOuts, error: optOutError }, { data: reviews, error: reviewError }] =
    await Promise.all([
      supabase
        .from("orders")
        .select("customer_email")
        .gte("review_request_sent_at", since)
        .not("customer_email", "is", null)
        .limit(2000),
      supabase.from("email_opt_outs").select("email").in("email", emails),
      supabase.from("product_reviews").select("email, product_id").in("email", emails)
    ]);

  if (askedError || optOutError || reviewError) {
    throw new Error(
      (askedError || optOutError || reviewError).message || "Unable to load review request history."
    );
  }

  const askedEmails = new Set((recentlyAsked || []).map((row) => normalizeEmail(row.customer_email)));
  const optedOut = new Set((optOuts || []).map((row) => normalizeEmail(row.email)));
  const reviewed = new Set((reviews || []).map((row) => `${normalizeEmail(row.email)}|${row.product_id}`));

  // Newest due order per person: that's the one we ask about.
  const newestByEmail = new Map();

  for (const order of due) {
    const email = normalizeEmail(order.customer_email);
    const current = newestByEmail.get(email);

    if (!current || new Date(order.created_at) > new Date(current.created_at)) {
      newestByEmail.set(email, order);
    }
  }

  const toSend = [...newestByEmail.values()]
    .filter((order) => {
      const email = normalizeEmail(order.customer_email);
      const reason = optedOut.has(email) ? "unsubscribed" : askedEmails.has(email) ? "asked_recently" : null;

      if (reason) {
        summary.skipped += 1;
        summary.results.push({ orderId: order.id, sent: false, reason });
      }

      return !reason;
    })
    .slice(0, limit);

  summary.skipped += newestByEmail.size < due.length ? due.length - newestByEmail.size : 0;

  if (!toSend.length) {
    return summary;
  }

  const { data: items, error: itemsError } = await supabase
    .from("order_items")
    .select("order_id, product_id, product_name, line_total")
    .in(
      "order_id",
      toSend.map((order) => order.id)
    );

  if (itemsError) {
    throw new Error(itemsError.message || "Unable to load order items for review requests.");
  }

  const productsById = await loadProducts(supabase, [
    ...new Set(
      (items || [])
        .map((item) => String(item.product_id || ""))
        .filter((id) => id && isInventoryProductId(id))
    )
  ]);

  for (const order of toSend) {
    const email = normalizeEmail(order.customer_email);
    const storefront = order.storefront || "shakti_foods";
    const seen = new Set();

    const products = (items || [])
      .filter((item) => item.order_id === order.id && isInventoryProductId(item.product_id))
      .sort((a, b) => Number(b.line_total || 0) - Number(a.line_total || 0))
      .map((item) => {
        const product = productsById.get(String(item.product_id));
        // A product of the order's own store only.
        return { item, product: product && (product.storefront || "shakti_foods") === storefront ? product : null };
      })
      .filter(({ item, product }) => {
        const key = String(item.product_id);

        if (!product || seen.has(key) || reviewed.has(`${email}|${key}`)) {
          return false;
        }

        seen.add(key);
        return true;
      })
      .slice(0, MAX_PRODUCTS_PER_EMAIL)
      .map(({ product }) => ({ productId: String(product.id), name: product.name, slug: product.slug }));

    if (!products.length) {
      summary.skipped += 1;
      summary.results.push({ orderId: order.id, sent: false, reason: "nothing_to_review" });
      continue;
    }

    // Claim the order first, so two runs can never both send it.
    const sentAt = new Date().toISOString();
    const { data: claimed, error: claimError } = await supabase
      .from("orders")
      .update({ review_request_sent_at: sentAt })
      .eq("id", order.id)
      .is("review_request_sent_at", null)
      .select("id");

    if (claimError || !claimed?.length) {
      summary.skipped += 1;
      summary.results.push({ orderId: order.id, sent: false, reason: claimError ? "claim_failed" : "already_claimed" });
      continue;
    }

    const result = await sendReviewRequestEmailSafely({
      orderId: order.id,
      storefront,
      customerName: order.customer_name,
      email,
      products
    });

    if (!result.sent) {
      // Let tomorrow's run try again.
      await supabase.from("orders").update({ review_request_sent_at: null }).eq("id", order.id).eq("review_request_sent_at", sentAt);

      summary.failed += 1;
      summary.results.push({ orderId: order.id, sent: false, reason: result.reason || "send_failed" });
      continue;
    }

    summary.sent += 1;
    summary.results.push({ orderId: order.id, sent: true, products: products.map((product) => product.productId) });
  }

  return summary;
}
