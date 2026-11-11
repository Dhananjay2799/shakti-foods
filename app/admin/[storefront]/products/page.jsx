import Link from "next/link";
import { notFound } from "next/navigation";
import { CheckCircle2, Package, Plus } from "lucide-react";
import { createSupabaseAdmin } from "@/lib/supabase-admin";
import { getAdminStorefront } from "@/lib/admin-storefronts";
import ProductRowMenu from "@/components/admin/ProductRowMenu";
import { PRODUCT_IMAGE_BUCKET } from "@/lib/admin-product-delete";

export const dynamic = "force-dynamic";

const ROW_GRID =
  "lg:grid-cols-[minmax(0,1.9fr)_minmax(0,1fr)_5.5rem_8.5rem_6.5rem_6rem]";

function formatPrice(cents) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD"
  }).format(Number(cents || 0) / 100);
}

function getStockBadge(inventory) {
  if (!inventory) {
    return {
      label: "No inventory",
      tone: "bg-black/[0.04] text-black/55 ring-black/10",
      detail: "No inventory record yet."
    };
  }

  const stock = Number(inventory.stock_quantity || 0);
  const reserved = Number(inventory.reserved_quantity || 0);
  const available = Math.max(stock - reserved, 0);
  const threshold = Number(inventory.low_stock_threshold ?? 5);

  const detail = `Stock ${stock} · Reserved ${reserved} · Low-stock alert at ${threshold}`;

  if (available === 0) {
    return {
      label: "Out of stock",
      tone: "bg-red-50 text-red-700 ring-red-600/20",
      detail
    };
  }

  return {
    label: `${available.toLocaleString("en-US")} in stock`,
    tone:
      available <= threshold
        ? "bg-amber-50 text-amber-800 ring-amber-600/25"
        : "bg-emerald-50 text-emerald-700 ring-emerald-600/20",
    detail
  };
}

function getStatusBadge(product) {
  if (product.status === "archived") {
    return {
      label: "Archived",
      tone: "bg-amber-50 text-amber-800 ring-amber-600/25",
      dot: "bg-amber-500"
    };
  }

  if (product.status === "active" && product.is_active !== false) {
    return {
      label: "Active",
      tone: "bg-emerald-50 text-emerald-700 ring-emerald-600/20",
      dot: "bg-emerald-500"
    };
  }

  if (product.status === "active") {
    return {
      label: "Hidden",
      tone: "bg-black/[0.04] text-black/60 ring-black/10",
      dot: "bg-black/35"
    };
  }

  return {
    label: "Draft",
    tone: "bg-black/[0.04] text-black/60 ring-black/10",
    dot: "bg-black/35"
  };
}

function Metric({ label, children, className = "" }) {
  return (
    <div className={`min-w-0 ${className}`}>
      <p className="text-xs text-black/50 lg:hidden">{label}</p>
      <div className="mt-1 min-w-0 text-sm font-semibold text-black lg:mt-0">
        {children}
      </div>
    </div>
  );
}

function Notice({ children }) {
  return (
    <div
      role="status"
      className="flex items-start gap-2.5 rounded-xl border border-emerald-600/15 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-800"
    >
      <CheckCircle2 size={18} className="mt-px shrink-0" aria-hidden="true" />
      <div>{children}</div>
    </div>
  );
}

export default async function AdminProductsPage({ params, searchParams }) {
  const resolvedParams = await Promise.resolve(params);
  const resolvedSearchParams = await Promise.resolve(searchParams || {});
  const storefront = getAdminStorefront(resolvedParams.storefront);

  if (!storefront) {
    notFound();
  }

  // Archived products are kept out of the main list.
  const showArchived = resolvedSearchParams.view === "archived";
  const deleted = resolvedSearchParams.deleted === "1";
  const archived = resolvedSearchParams.archived === "1";
  const restored = resolvedSearchParams.restored === "1";

  const supabase = createSupabaseAdmin();

  const [productsResult, inventoryResult, categoriesResult] = await Promise.all([
    supabase
      .from("products")
      .select("*")
      .eq("storefront", storefront.id)
      .is("deleted_at", null)
      .order("created_at", { ascending: false }),

    supabase
      .from("inventory")
      .select("*")
      .eq("storefront", storefront.id),

    supabase
      .from("product_categories")
      .select("*")
      .eq("storefront", storefront.id)
  ]);

  if (productsResult.error) {
    console.error(`Unable to load ${storefront.name} products:`, productsResult.error);
  }

  const allProducts = productsResult.data || [];
  const inventory = inventoryResult.data || [];
  const categories = categoriesResult.data || [];

  const archivedProducts = allProducts.filter((product) => product.status === "archived");
  const currentProducts = allProducts.filter((product) => product.status !== "archived");
  const products = showArchived ? archivedProducts : currentProducts;

  // One thumbnail per product: its main image, else its first image.
  const thumbnailByProductId = new Map();

  if (products.length > 0) {
    const { data: images, error: imagesError } = await supabase
      .from("product_images")
      .select("product_id, storage_bucket, storage_path, is_primary, sort_order, is_active")
      .in(
        "product_id",
        products.map((product) => product.product_id)
      )
      .eq("is_active", true)
      .order("is_primary", { ascending: false })
      .order("sort_order", { ascending: true });

    if (imagesError) {
      console.error("Unable to load product thumbnails:", imagesError);
    }

    for (const image of images || []) {
      if (!image.storage_path || thumbnailByProductId.has(image.product_id)) {
        continue;
      }

      const { data } = supabase.storage
        .from(image.storage_bucket || PRODUCT_IMAGE_BUCKET)
        .getPublicUrl(image.storage_path);

      if (data?.publicUrl) {
        thumbnailByProductId.set(image.product_id, data.publicUrl);
      }
    }
  }

  const inventoryByProductId = new Map(
    inventory.map((item) => [item.product_id, item])
  );

  const categoryById = new Map(
    categories.map((cat) => [cat.category_id, cat])
  );

  const basePath = `/admin/${storefront.slug}`;
  const productsPath = `${basePath}/products`;

  const tabClass = (active) =>
    [
      "-mb-px inline-flex items-center gap-2 border-b-2 px-1 pb-3 pt-1 text-sm font-semibold transition",
      active
        ? "border-black text-black"
        : "border-transparent text-black/50 hover:border-black/20 hover:text-black"
    ].join(" ");

  const countClass = (active) =>
    [
      "rounded-md px-1.5 py-0.5 text-xs font-semibold",
      active ? "bg-black text-white" : "bg-black/[0.05] text-black/55"
    ].join(" ");

  return (
    <div className="grid gap-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-4xl font-bold text-black">
            Products
          </h1>
          <p className="mt-1.5 text-sm text-black/55">
            Manage your catalog, prices, and stock.
          </p>
        </div>

        <Link
          href={`${productsPath}/new`}
          className="inline-flex h-11 items-center gap-2 rounded-xl bg-black px-5 text-sm font-bold text-white transition hover:bg-black/80"
        >
          <Plus size={17} aria-hidden="true" />
          Add product
        </Link>
      </header>

      {deleted ? <Notice>Product permanently deleted.</Notice> : null}

      {archived ? (
        <Notice>
          Product archived. It is hidden from the store.{" "}
          <Link
            href={`${productsPath}?view=archived`}
            className="underline decoration-emerald-800/40 underline-offset-4"
          >
            View archived products
          </Link>
        </Notice>
      ) : null}

      {restored ? (
        <Notice>
          Product restored as a draft. Set it to Active when it is ready to sell.
        </Notice>
      ) : null}

      <section className="rounded-2xl border border-black/10 bg-white shadow-sm">
        <nav
          aria-label="Product views"
          className="flex gap-6 border-b border-black/[0.07] px-5 pt-3"
        >
          <Link
            href={productsPath}
            className={tabClass(!showArchived)}
            aria-current={!showArchived ? "page" : undefined}
          >
            Products
            <span className={countClass(!showArchived)}>
              {currentProducts.length}
            </span>
          </Link>

          <Link
            href={`${productsPath}?view=archived`}
            className={tabClass(showArchived)}
            aria-current={showArchived ? "page" : undefined}
          >
            Archived
            <span className={countClass(showArchived)}>
              {archivedProducts.length}
            </span>
          </Link>
        </nav>

        {productsResult.error ? (
          <div className="p-5">
            <div className="rounded-xl bg-red-50 p-4 text-red-800">
              <p className="font-bold">Unable to load products</p>
              <p className="mt-1 text-sm">
                Check the server logs for the Supabase error details.
              </p>
            </div>
          </div>
        ) : products.length === 0 ? (
          <div className="px-6 py-14 text-center">
            <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-[#f1eadf] text-black">
              <Package size={24} aria-hidden="true" />
            </span>

            <h2 className="mt-4 text-lg font-bold text-black">
              {showArchived ? "No archived products" : "No products yet"}
            </h2>

            <p className="mx-auto mt-1.5 max-w-md text-sm text-black/55">
              {showArchived
                ? "Products you archive are kept here, hidden from the store, until you restore or delete them."
                : `Add your first ${storefront.name} product to start selling.`}
            </p>

            {!showArchived ? (
              <Link
                href={`${productsPath}/new`}
                className="mt-5 inline-flex h-10 items-center gap-2 rounded-xl bg-black px-4 text-sm font-bold text-white transition hover:bg-black/80"
              >
                <Plus size={16} aria-hidden="true" />
                Add product
              </Link>
            ) : null}
          </div>
        ) : (
          <>
            <div
              className={`hidden gap-4 border-b border-black/[0.07] bg-[#faf7f2] px-5 py-2.5 text-xs font-semibold text-black/50 lg:grid ${ROW_GRID}`}
            >
              <span>Product</span>
              <span>Category</span>
              <span className="text-right">Price</span>
              <span className="pl-4">Stock</span>
              <span>Status</span>
              <span className="sr-only">Actions</span>
            </div>

            <ul className="divide-y divide-black/[0.07]">
              {products.map((product) => {
                const inv = inventoryByProductId.get(product.product_id);
                const cat = categoryById.get(product.category);
                const stock = getStockBadge(inv);
                const status = getStatusBadge(product);
                const thumbnail = thumbnailByProductId.get(product.product_id);
                const productPath = `${productsPath}/${encodeURIComponent(product.product_id)}`;
                const title = product.title || product.product_id;
                const primaryHref = showArchived ? productPath : `${productPath}/edit`;

                const actions = (
                  <div className="flex shrink-0 items-center gap-1">
                    <Link
                      href={primaryHref}
                      className="rounded-lg px-2.5 py-1.5 text-sm font-bold text-black transition hover:bg-black/[0.05]"
                      aria-label={`${showArchived ? "Open" : "Edit"} ${title}`}
                    >
                      {showArchived ? "Open" : "Edit"}
                    </Link>

                    <ProductRowMenu
                      // A fresh menu (closed) after switching between the
                      // Products and Archived views, e.g. after Restore.
                      key={showArchived ? "archived" : "current"}
                      productId={product.product_id}
                      title={title}
                      storefrontSlug={storefront.slug}
                      archived={showArchived}
                      openHref={productPath}
                      deleteHref={`${productPath}/delete`}
                    />
                  </div>
                );

                return (
                  <li
                    key={product.id || product.product_id}
                    className={`grid gap-3 px-5 py-4 transition last:rounded-b-2xl hover:bg-[#faf7f2] lg:items-center lg:gap-4 ${ROW_GRID}`}
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      {thumbnail ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={thumbnail}
                          alt=""
                          loading="lazy"
                          className="h-11 w-11 shrink-0 rounded-xl bg-[#f1eadf] object-cover ring-1 ring-black/10"
                        />
                      ) : (
                        <span
                          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#f1eadf] text-black/70"
                          aria-hidden="true"
                        >
                          <Package size={20} />
                        </span>
                      )}

                      <div className="min-w-0 flex-1">
                        <Link
                          href={primaryHref}
                          className="line-clamp-2 break-words font-bold text-black hover:underline hover:underline-offset-4 lg:line-clamp-1"
                        >
                          {title}
                        </Link>
                        <p className="truncate text-xs text-black/50">
                          {product.product_id}
                        </p>
                      </div>

                      <div className="lg:hidden">{actions}</div>
                    </div>

                    <div className="grid grid-cols-2 gap-x-4 gap-y-3 sm:grid-cols-4 lg:contents">
                      <Metric label="Category">
                        <p className="truncate font-medium text-black/75">
                          {cat?.name || product.category || "Uncategorized"}
                        </p>
                      </Metric>

                      <Metric label="Price" className="lg:text-right">
                        <p className="tabular-nums">
                          {formatPrice(product.price_cents)}
                        </p>
                      </Metric>

                      <Metric label="Stock" className="lg:pl-4">
                        <span
                          title={stock.detail}
                          className={`inline-flex items-center whitespace-nowrap rounded-md px-2 py-0.5 text-xs font-semibold ring-1 ring-inset ${stock.tone}`}
                        >
                          {stock.label}
                        </span>
                      </Metric>

                      <Metric label="Status">
                        <span
                          className={`inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 text-xs font-semibold ring-1 ring-inset ${status.tone}`}
                        >
                          <span className={`h-1.5 w-1.5 rounded-full ${status.dot}`} aria-hidden="true" />
                          {status.label}
                        </span>
                      </Metric>
                    </div>

                    <div className="hidden justify-end lg:flex">{actions}</div>
                  </li>
                );
              })}
            </ul>
          </>
        )}
      </section>
    </div>
  );
}
