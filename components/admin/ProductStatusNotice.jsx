import { restoreProduct } from "@/app/admin/products/product-actions";

const MESSAGES = {
  created: "Product created.",
  updated: "Product saved.",
  restored: "Product restored.",
  archived: "Product archived. It is hidden from the store website and the product list."
};

/*
 * Confirmation after a save, plus an "archived" notice with Restore
 * buttons. Used on the store-scoped product pages.
 */
export default function ProductStatusNotice({
  storefront,
  product,
  searchParams = {}
}) {
  const messageKey = Object.keys(MESSAGES).find(
    (key) => searchParams?.[key] === "1"
  );

  const isArchived = product?.status === "archived";

  if (!messageKey && !isArchived) {
    return null;
  }

  return (
    <div className="mt-6 grid gap-3">
      {messageKey && !(messageKey === "archived" && isArchived) ? (
        <div className="rounded-2xl bg-emerald-50 px-5 py-4 text-sm font-bold text-emerald-800">
          {MESSAGES[messageKey]}
        </div>
      ) : null}

      {isArchived ? (
        <div className="flex flex-col gap-4 rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4 md:flex-row md:items-center md:justify-between">
          <div className="text-sm text-amber-900">
            <div className="font-bold">This product is archived.</div>
            <div className="mt-1">
              It is hidden from the {storefront.name} website and from the
              main product list. Orders and history are kept.
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <form action={restoreProduct}>
              <input type="hidden" name="productId" value={product.product_id} />
              <input type="hidden" name="storefrontSlug" value={storefront.slug} />
              <input type="hidden" name="restoreAs" value="draft" />
              <button
                type="submit"
                className="rounded-full bg-white px-4 py-2 text-sm font-bold text-black shadow transition hover:bg-black/5"
              >
                Restore as draft
              </button>
            </form>

            <form action={restoreProduct}>
              <input type="hidden" name="productId" value={product.product_id} />
              <input type="hidden" name="storefrontSlug" value={storefront.slug} />
              <input type="hidden" name="restoreAs" value="active" />
              <button
                type="submit"
                className="rounded-full bg-black px-4 py-2 text-sm font-bold text-white transition hover:bg-black/80"
              >
                Restore &amp; show on website
              </button>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  );
}
