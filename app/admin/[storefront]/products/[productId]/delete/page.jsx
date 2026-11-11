import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Archive, Trash2 } from "lucide-react";

import {
  archiveProduct,
  deleteProductPermanently
} from "@/app/admin/products/product-actions";
import ProductStatusNotice from "@/components/admin/ProductStatusNotice";
import {
  describeBlocker,
  getProductDeleteBlockers
} from "@/lib/admin-product-delete";
import {
  adminProductsPath,
  requireAdminStore,
  requireStoreProduct
} from "@/lib/admin-store";
import { createSupabaseAdmin } from "@/lib/supabase-admin";

export const dynamic = "force-dynamic";

function escapeRegExp(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export default async function DeleteProductPage({ params }) {
  const resolvedParams = await Promise.resolve(params || {});
  const productId = decodeURIComponent(
    String(resolvedParams.productId || "").trim()
  );

  if (!productId) {
    notFound();
  }

  const storefront = requireAdminStore(resolvedParams.storefront);

  const product = await requireStoreProduct({
    storefront,
    productId,
    suffix: "/delete",
    select: "product_id, title, status, is_active, slug"
  });

  const productBase = adminProductsPath(storefront, productId);

  const { canDeletePermanently, blockers } =
    await getProductDeleteBlockers(createSupabaseAdmin(), productId);

  const isArchived = product.status === "archived";

  return (
    <div>
      <div className="mx-auto max-w-4xl py-2">
        <Link
          href={productBase}
          className="inline-flex items-center gap-2 rounded-full bg-white px-5 py-3 text-sm font-bold text-black shadow-sm transition hover:bg-[#f1eadf]"
        >
          <ArrowLeft size={17} />
          Back to Product
        </Link>

        <header className="mt-6 rounded-[1.75rem] border border-black/5 bg-white p-5 shadow-sm md:p-7">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-black/40">
            {storefront.name} · Delete product
          </p>

          <h1 className="mt-2 font-display text-3xl font-bold text-black md:text-4xl">
            {product.title || product.product_id}
          </h1>

          <p className="mt-2 text-sm text-black/50">
            Product ID: {product.product_id}
          </p>
        </header>

        <ProductStatusNotice storefront={storefront} product={product} />

        <section className="mt-5 rounded-[1.75rem] border border-black/5 bg-white p-5 shadow-sm md:p-7">
          <div className="flex items-start gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-amber-50 text-amber-700">
              <Archive size={19} />
            </span>

            <div className="min-w-0">
              <h2 className="text-xl font-bold text-black">
                Archive {isArchived ? "(already archived)" : "(recommended)"}
              </h2>

              <p className="mt-2 text-sm leading-6 text-black/60">
                Removes the product from the {storefront.name} website and from
                the main product list. Past orders, stock history and reviews
                are kept, and you can restore it at any time from{" "}
                <Link
                  href={`${adminProductsPath(storefront)}?view=archived`}
                  className="font-bold text-black underline underline-offset-4"
                >
                  Archived products
                </Link>
                .
              </p>

              {!isArchived ? (
                <form action={archiveProduct} className="mt-5">
                  <input type="hidden" name="productId" value={product.product_id} />
                  <input type="hidden" name="storefrontSlug" value={storefront.slug} />
                  <button
                    type="submit"
                    className="inline-flex items-center gap-2 rounded-full bg-black px-6 py-3 text-sm font-bold text-white transition hover:bg-black/80"
                  >
                    <Archive size={16} />
                    Archive product
                  </button>
                </form>
              ) : null}
            </div>
          </div>
        </section>

        <section className="mt-5 rounded-[1.75rem] border border-red-100 bg-white p-5 shadow-sm md:p-7">
          <div className="flex items-start gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-red-50 text-red-700">
              <Trash2 size={19} />
            </span>

            <div className="min-w-0 flex-1">
              <h2 className="text-xl font-bold text-black">
                Delete permanently
              </h2>

              {canDeletePermanently ? (
                <>
                  <p className="mt-2 text-sm leading-6 text-black/60">
                    Erases the product, its stock record, images,
                    specifications, price tiers, certifications and Subscribe
                    &amp; Save settings. This cannot be undone.
                  </p>

                  <form action={deleteProductPermanently} className="mt-5 grid gap-3">
                    <input type="hidden" name="productId" value={product.product_id} />
                    <input type="hidden" name="storefrontSlug" value={storefront.slug} />

                    <label className="grid gap-2">
                      <span className="text-sm font-bold text-black">
                        Type <code className="rounded bg-black/5 px-1.5 py-0.5">{product.product_id}</code> to confirm
                      </span>
                      <input
                        name="confirmation"
                        required
                        autoComplete="off"
                        pattern={escapeRegExp(product.product_id)}
                        title={`Type ${product.product_id} exactly`}
                        className="w-full max-w-sm rounded-2xl border border-black/15 bg-white px-4 py-3 text-black outline-none focus:border-red-600"
                      />
                    </label>

                    <div>
                      <button
                        type="submit"
                        className="inline-flex items-center gap-2 rounded-full bg-red-600 px-6 py-3 text-sm font-bold text-white transition hover:bg-red-700"
                      >
                        <Trash2 size={16} />
                        Delete permanently
                      </button>
                    </div>
                  </form>
                </>
              ) : (
                <div className="mt-2 text-sm leading-6 text-black/60">
                  <p>
                    This product can&apos;t be erased because other records
                    refer to it:
                  </p>

                  <ul className="mt-2 list-disc pl-5 font-semibold text-black/75">
                    {blockers.map((blocker) => (
                      <li key={blocker.table}>{describeBlocker(blocker)}</li>
                    ))}
                  </ul>

                  <p className="mt-3">
                    Archive it instead: it disappears from the website and the
                    product list, and that history stays intact.
                  </p>
                </div>
              )}
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
