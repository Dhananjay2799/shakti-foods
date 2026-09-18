import Link from "next/link";
import {
  ArrowDown,
  ArrowUp,
  Check,
  Edit3,
  FolderTree,
  Plus,
  Trash2
} from "lucide-react";
import { createSupabaseAdmin } from "@/lib/supabase-admin";
import {
  createCategory,
  deleteCategory,
  moveCategoryDown,
  moveCategoryUp,
  updateCategory
} from "@/app/admin/[storefront]/categories/actions";
import { notFound } from "next/navigation";
import { getAdminStorefront } from "@/lib/admin-storefronts";

export const dynamic = "force-dynamic";

function Message({ children, type = "success" }) {
  const className =
    type === "info"
      ? "border-blue-200 bg-blue-50 text-blue-800"
      : "border-green-200 bg-green-50 text-green-800";

  return (
    <div
      className={`rounded-2xl border px-5 py-4 text-sm font-semibold ${className}`}
    >
      <span className="inline-flex items-center gap-2">
        <Check size={17} />
        {children}
      </span>
    </div>
  );
}

export default async function CategoriesPage({ params, searchParams }) {
  const resolvedParams = await Promise.resolve(params);

  const storefront = getAdminStorefront(resolvedParams.storefront);

  if (!storefront) {
    notFound();
  }

  const basePath = `/admin/${storefront.slug}`;

  const queryParams = await Promise.resolve(searchParams || {});

  const created = String(queryParams.created || "") === "1";
  const updated = String(queryParams.updated || "") === "1";
  const deleted = String(queryParams.deleted || "") === "1";
  const reordered = String(queryParams.reordered || "") === "1";
  const position = String(queryParams.position || "");
  const editId = String(queryParams.edit || "").trim();

  const supabase = createSupabaseAdmin();

  const [categoriesResult, productsResult] = await Promise.all([
    supabase
      .from("product_categories")
      .select("*")
      .eq("storefront", storefront.id)
      .order("sort_order", {
        ascending: true
      })
      .order("name", {
        ascending: true
      }),

    supabase
      .from("products")
      .select("category")
      .eq("storefront", storefront.id)
      .is("deleted_at", null)
  ]);

  if (categoriesResult.error) {
    throw new Error(
      categoriesResult.error.message || "Unable to load categories."
    );
  }

  if (productsResult.error) {
    throw new Error(
      productsResult.error.message || "Unable to load category product counts."
    );
  }

  const categories = categoriesResult.data || [];
  const products = productsResult.data || [];

  const productCounts = products.reduce((counts, product) => {
    const categoryId = product.category || "uncategorized";
    counts[categoryId] = (counts[categoryId] || 0) + 1;
    return counts;
  }, {});

  const editingCategory = editId
    ? categories.find((category) => category.id === editId)
    : null;

  return (
    <main className="min-h-screen bg-[#f8f6f1]">
      <div className="mx-auto max-w-6xl py-3">
        <section className="rounded-[1.75rem] border border-black/5 bg-white p-5 shadow-sm md:p-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-black/40">
                {storefront.name} Product Management
              </p>

              <h1 className="mt-2 font-display text-4xl font-bold text-black">
                Categories
              </h1>

              <p className="mt-2 text-sm leading-6 text-black/50">
                Add, edit, delete, activate, and reorder {storefront.name}{" "}
                product categories.
              </p>
            </div>

            <Link
              href={`${basePath}/products`}
              className="rounded-full bg-[#f1eadf] px-5 py-3 text-sm font-bold text-black transition hover:bg-[#e8dece]"
            >
              View Products
            </Link>
          </div>
        </section>

        <div className="mt-5 grid gap-3">
          {created ? (
            <Message>
              Category created successfully and placed at the end of the list.
            </Message>
          ) : null}

          {updated ? <Message>Category updated successfully.</Message> : null}

          {deleted ? <Message>Category deleted successfully.</Message> : null}

          {reordered ? (
            <Message>Category order updated successfully.</Message>
          ) : null}

          {position === "first" ? (
            <Message type="info">This category is already first.</Message>
          ) : null}

          {position === "last" ? (
            <Message type="info">This category is already last.</Message>
          ) : null}
        </div>

        <div className="mt-5 grid gap-5 lg:grid-cols-[360px_minmax(0,1fr)]">
          <form
            action={editingCategory ? updateCategory : createCategory}
            className="h-fit rounded-[1.75rem] border border-black/5 bg-white p-5 shadow-sm"
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

            {editingCategory ? (
              <input
                type="hidden"
                name="categoryRecordId"
                value={editingCategory.id}
              />
            ) : null}

            <div className="flex items-center gap-3">
              <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#f1eadf]">
                {editingCategory ? <Edit3 size={20} /> : <Plus size={20} />}
              </span>

              <div>
                <h2 className="font-display text-2xl font-bold text-black">
                  {editingCategory ? "Edit Category" : "Add Category"}
                </h2>

                <p className="mt-1 text-sm text-black/50">
                  New categories are ordered automatically.
                </p>
              </div>
            </div>

            <div className="mt-5 grid gap-4">
              <label className="grid gap-2">
                <span className="text-sm font-bold">Category name</span>

                <input
                  name="name"
                  required
                  defaultValue={editingCategory?.name || ""}
                  placeholder="Eco-Friendly Tableware"
                  className="h-12 rounded-2xl border border-black/10 bg-[#faf8f4] px-4 text-sm outline-none transition focus:border-black"
                />
              </label>

              <label className="grid gap-2">
                <span className="text-sm font-bold">Category ID</span>

                <input
                  name="categoryId"
                  required
                  defaultValue={editingCategory?.category_id || ""}
                  placeholder="tableware"
                  className="h-12 rounded-2xl border border-black/10 bg-[#faf8f4] px-4 text-sm outline-none transition focus:border-black"
                />

                <span className="text-xs leading-5 text-black/45">
                  Existing products update automatically when this ID changes.
                </span>
              </label>

              <label className="grid gap-2">
                <span className="text-sm font-bold">URL slug</span>

                <input
                  name="slug"
                  required
                  defaultValue={editingCategory?.slug || ""}
                  placeholder="eco-friendly-tableware"
                  className="h-12 rounded-2xl border border-black/10 bg-[#faf8f4] px-4 text-sm outline-none transition focus:border-black"
                />
              </label>

              <label className="grid gap-2">
                <span className="text-sm font-bold">Description</span>

                <textarea
                  name="description"
                  rows={4}
                  defaultValue={editingCategory?.description || ""}
                  placeholder="Describe this product category."
                  className="resize-y rounded-2xl border border-black/10 bg-[#faf8f4] px-4 py-3 text-sm outline-none transition focus:border-black"
                />
              </label>

              <label className="grid gap-2">
                <span className="text-sm font-bold">Parent category</span>

                <select
                  name="parentCategoryId"
                  defaultValue={editingCategory?.parent_category_id || ""}
                  className="h-12 rounded-2xl border border-black/10 bg-[#faf8f4] px-4 text-sm outline-none transition focus:border-black"
                >
                  <option value="">No parent category</option>

                  {categories
                    .filter((category) => category.id !== editingCategory?.id)
                    .map((category) => (
                      <option key={category.id} value={category.id}>
                        {category.name}
                      </option>
                    ))}
                </select>
              </label>

              {editingCategory ? (
                <label className="flex items-start gap-3 rounded-2xl bg-[#faf8f4] p-4">
                  <input
                    type="checkbox"
                    name="isActive"
                    defaultChecked={editingCategory.is_active}
                    className="mt-1 h-4 w-4"
                  />

                  <span>
                    <span className="block text-sm font-bold">
                      Active category
                    </span>

                    <span className="mt-1 block text-xs leading-5 text-black/50">
                      Active categories appear in product creation and editing
                      forms.
                    </span>
                  </span>
                </label>
              ) : null}

              <div className="flex flex-wrap gap-2">
                <button
                  type="submit"
                  className="inline-flex flex-1 items-center justify-center gap-2 rounded-full bg-black px-5 py-3 text-sm font-bold text-white transition hover:bg-black/80"
                >
                  {editingCategory ? <Edit3 size={16} /> : <Plus size={16} />}

                  {editingCategory ? "Save Category" : "Create Category"}
                </button>

                {editingCategory ? (
                  <Link
                    href={`${basePath}/categories`}
                    className="rounded-full bg-[#f1eadf] px-5 py-3 text-sm font-bold text-black"
                  >
                    Cancel
                  </Link>
                ) : null}
              </div>
            </div>
          </form>

          <section className="rounded-[1.75rem] border border-black/5 bg-white p-5 shadow-sm">
            <div className="flex items-center gap-3">
              <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#f1eadf]">
                <FolderTree size={20} />
              </span>

              <div>
                <h2 className="font-display text-2xl font-bold text-black">
                  Category Order
                </h2>

                <p className="mt-1 text-sm text-black/50">
                  Use the arrow buttons to change the display order.
                </p>
              </div>
            </div>

            <div className="mt-5 grid gap-3">
              {categories.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-black/15 bg-[#faf8f4] p-8 text-center">
                  <p className="font-bold text-black">No categories yet</p>

                  <p className="mt-2 text-sm text-black/50">
                    Create your first product category using the form.
                  </p>
                </div>
              ) : null}

              {categories.map((category, index) => {
                const isFirst = index === 0;
                const isLast = index === categories.length - 1;

                return (
                  <article
                    key={category.id}
                    className="rounded-2xl border border-black/5 bg-[#faf8f4] p-4"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-4">
                      <div className="flex min-w-0 items-start gap-3">
                        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-black text-sm font-bold text-white">
                          {index + 1}
                        </span>

                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <h3 className="font-bold text-black">
                              {category.name}
                            </h3>

                            <span
                              className={[
                                "rounded-full px-2.5 py-1 text-xs font-bold",
                                category.is_active
                                  ? "bg-green-100 text-green-800"
                                  : "bg-gray-200 text-gray-600"
                              ].join(" ")}
                            >
                              {category.is_active ? "Active" : "Inactive"}
                            </span>
                          </div>

                          <p className="mt-1 text-xs text-black/45">
                            ID: {category.category_id}
                          </p>

                          <p className="mt-1 text-xs text-black/45">
                            {productCounts[category.category_id] || 0} product
                            {(productCounts[category.category_id] || 0) === 1
                              ? ""
                              : "s"}
                          </p>

                          {category.description ? (
                            <p className="mt-3 max-w-xl text-sm leading-6 text-black/55">
                              {category.description}
                            </p>
                          ) : null}
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center gap-2">
                        <form action={moveCategoryUp}>
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
                            name="categoryRecordId"
                            value={category.id}
                          />

                          <button
                            type="submit"
                            disabled={isFirst}
                            title="Move category up"
                            className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-white text-black transition hover:bg-[#f1eadf] disabled:cursor-not-allowed disabled:opacity-30"
                          >
                            <ArrowUp size={15} />
                          </button>
                        </form>

                        <form action={moveCategoryDown}>
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
                            name="categoryRecordId"
                            value={category.id}
                          />

                          <button
                            type="submit"
                            disabled={isLast}
                            title="Move category down"
                            className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-white text-black transition hover:bg-[#f1eadf] disabled:cursor-not-allowed disabled:opacity-30"
                          >
                            <ArrowDown size={15} />
                          </button>
                        </form>

                        <Link
                          href={`${basePath}/categories?edit=${category.id}`}
                          className="inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-2 text-xs font-bold text-black transition hover:bg-[#f1eadf]"
                        >
                          <Edit3 size={14} />
                          Edit
                        </Link>

                        <form action={deleteCategory}>
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
                            name="categoryRecordId"
                            value={category.id}
                          />
                          <input
                            type="hidden"
                            name="categoryId"
                            value={category.category_id}
                          />

                          <button
                            type="submit"
                            className="inline-flex items-center gap-1.5 rounded-full bg-red-100 px-3 py-2 text-xs font-bold text-red-800 transition hover:bg-red-200"
                          >
                            <Trash2 size={14} />
                            Delete
                          </button>
                        </form>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}