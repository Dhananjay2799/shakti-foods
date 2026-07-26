import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  BadgeDollarSign,
  Box,
  Package,
  Save,
  Search,
  Settings2,
  Tags
} from "lucide-react";
import { createSupabaseAdmin } from "@/lib/supabase-admin";
import { updateProduct } from "@/app/admin/products/product-actions";

export const dynamic = "force-dynamic";

function centsToDollars(value) {
  if (
    value === null ||
    value === undefined
  ) {
    return "";
  }

  return (
    Number(value) / 100
  ).toFixed(2);
}

function moneyValue(value) {
  if (
    value === null ||
    value === undefined ||
    value === ""
  ) {
    return "";
  }

  const amount = Number(value);

  if (!Number.isFinite(amount)) {
    return "";
  }

  return amount.toFixed(2);
}

function FormSection({
  icon: Icon,
  title,
  description,
  children
}) {
  return (
    <section className="rounded-[1.75rem] border border-black/5 bg-white p-5 shadow-sm md:p-6">
      <div className="flex items-start gap-3">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#f1eadf] text-black">
          <Icon size={21} />
        </span>

        <div>
          <h2 className="font-display text-2xl font-bold text-black">
            {title}
          </h2>

          <p className="mt-1 text-sm leading-6 text-black/50">
            {description}
          </p>
        </div>
      </div>

      <div className="mt-6">
        {children}
      </div>
    </section>
  );
}

function TextInput({
  label,
  name,
  type = "text",
  required = false,
  placeholder,
  defaultValue,
  helpText,
  min,
  step,
  maxLength,
  readOnly = false
}) {
  return (
    <label className="grid gap-2">
      <span className="text-sm font-bold text-black">
        {label}

        {required ? (
          <span className="ml-1 text-red-600">
            *
          </span>
        ) : null}
      </span>

      <input
        type={type}
        name={name}
        required={required}
        placeholder={placeholder}
        defaultValue={defaultValue}
        min={min}
        step={step}
        maxLength={maxLength}
        readOnly={readOnly}
        className={[
          "h-12 rounded-2xl border border-black/10 px-4 text-sm text-black outline-none transition focus:border-black",
          readOnly
            ? "cursor-not-allowed bg-black/5 text-black/50"
            : "bg-[#faf8f4]"
        ].join(" ")}
      />

      {helpText ? (
        <span className="text-xs leading-5 text-black/45">
          {helpText}
        </span>
      ) : null}
    </label>
  );
}

function TextArea({
  label,
  name,
  defaultValue,
  placeholder,
  rows = 5,
  helpText,
  maxLength
}) {
  return (
    <label className="grid gap-2">
      <span className="text-sm font-bold text-black">
        {label}
      </span>

      <textarea
        name={name}
        rows={rows}
        defaultValue={defaultValue || ""}
        placeholder={placeholder}
        maxLength={maxLength}
        className="resize-y rounded-2xl border border-black/10 bg-[#faf8f4] px-4 py-3 text-sm leading-6 text-black outline-none transition focus:border-black"
      />

      {helpText ? (
        <span className="text-xs leading-5 text-black/45">
          {helpText}
        </span>
      ) : null}
    </label>
  );
}

function CheckboxField({
  name,
  title,
  description,
  defaultChecked = false
}) {
  return (
    <label className="flex items-start gap-3 rounded-2xl border border-black/10 bg-[#faf8f4] p-4">
      <input
        type="checkbox"
        name={name}
        defaultChecked={defaultChecked}
        className="mt-1 h-4 w-4"
      />

      <span>
        <span className="block text-sm font-bold text-black">
          {title}
        </span>

        <span className="mt-1 block text-xs leading-5 text-black/50">
          {description}
        </span>
      </span>
    </label>
  );
}

export default async function EditProductPage({
  params
}) {
  const resolvedParams =
    await Promise.resolve(
      params || {}
    );

  const productId =
    String(
      resolvedParams.productId || ""
    ).trim();

  if (!productId) {
    notFound();
  }

  const supabase =
    createSupabaseAdmin();

  const [
    productResult,
    inventoryResult,
    categoriesResult
  ] = await Promise.all([
    supabase
      .from("products")
      .select("*")
      .eq("product_id", productId)
      .is("deleted_at", null)
      .maybeSingle(),

    supabase
      .from("inventory")
      .select(`
        product_id,
        stock_quantity,
        reserved_quantity,
        low_stock_threshold,
        is_active
      `)
      .eq("product_id", productId)
      .maybeSingle(),

    supabase
      .from("product_categories")
      .select(`
        id,
        category_id,
        name,
        is_active,
        sort_order
      `)
      .order("sort_order", {
        ascending: true
      })
      .order("name", {
        ascending: true
      })
  ]);

  if (
    productResult.error ||
    !productResult.data
  ) {
    console.error(
      "Unable to load product:",
      productResult.error
    );

    notFound();
  }

  if (inventoryResult.error) {
    console.error(
      "Unable to load inventory:",
      inventoryResult.error
    );
  }

  if (categoriesResult.error) {
    console.error(
      "Unable to load categories:",
      categoriesResult.error
    );
  }

  const product =
    productResult.data;

  const inventory =
    inventoryResult.data || {
      stock_quantity: 0,
      reserved_quantity: 0,
      low_stock_threshold: 5,
      is_active: false
    };

  const categories =
    categoriesResult.data || [];

  const currentCategoryExists =
    categories.some(
      (category) =>
        category.category_id ===
        product.category
    );

  return (
    <main className="min-h-screen bg-[#f8f6f1]">
      <div className="mx-auto max-w-5xl py-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Link
            href={`/admin/products/${productId}`}
            className="inline-flex items-center gap-2 rounded-full bg-white px-5 py-3 text-sm font-bold text-black shadow-sm transition hover:bg-[#f1eadf]"
          >
            <ArrowLeft size={17} />
            Back to Product
          </Link>

          <span className="rounded-full bg-[#f1eadf] px-4 py-2 text-xs font-bold uppercase tracking-[0.1em] text-black/60">
            Edit Product
          </span>
        </div>

        <header className="mt-6 rounded-[1.75rem] border border-black/5 bg-white p-5 shadow-sm md:p-7">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-black/40">
            Product Management
          </p>

          <h1 className="mt-2 font-display text-3xl font-bold text-black md:text-4xl">
            {product.title}
          </h1>

          <p className="mt-2 text-sm text-black/50">
            Product ID: {product.product_id}
          </p>

          <div className="mt-5 flex flex-wrap gap-3">
            <Link
              href={`/admin/products/${productId}/images`}
              className="rounded-full bg-[#f1eadf] px-5 py-3 text-sm font-bold text-black transition hover:bg-[#e7dbc8]"
            >
              Manage Images
            </Link>

            <Link
              href={`/admin/products/${productId}/certifications`}
              className="rounded-full bg-[#f1eadf] px-5 py-3 text-sm font-bold text-black transition hover:bg-[#e7dbc8]"
            >
              Certifications
            </Link>

            <Link
              href={`/products/${product.slug}`}
              target="_blank"
              className="rounded-full bg-black px-5 py-3 text-sm font-bold text-white transition hover:bg-black/80"
            >
              View Storefront
            </Link>
          </div>
        </header>

        <form
          action={updateProduct}
          className="mt-6 grid gap-5"
        >
          <input
            type="hidden"
            name="originalProductId"
            value={product.product_id}
          />

          <FormSection
            icon={Package}
            title="Basic Information"
            description="Update the product name, identifiers, status, and descriptions."
          >
            <div className="grid gap-5 md:grid-cols-2">
              <div className="md:col-span-2">
                <TextInput
                  label="Product title"
                  name="title"
                  required
                  defaultValue={product.title}
                />
              </div>

              <TextInput
                label="Product ID"
                name="productId"
                required
                defaultValue={
                  product.product_id
                }
                helpText="Changing this also changes the inventory product ID and admin URLs."
              />

              <TextInput
                label="URL slug"
                name="slug"
                required
                defaultValue={product.slug}
                helpText="Changing this changes the storefront product URL."
              />

              <TextInput
                label="SKU"
                name="sku"
                defaultValue={
                  product.sku || ""
                }
                placeholder="SFRICE10"
              />

              <label className="grid gap-2">
                <span className="text-sm font-bold text-black">
                  Status
                </span>

                <select
                  name="status"
                  defaultValue={
                    product.status ||
                    "draft"
                  }
                  required
                  className="h-12 rounded-2xl border border-black/10 bg-[#faf8f4] px-4 text-sm font-semibold text-black outline-none transition focus:border-black"
                >
                  <option value="draft">
                    Draft
                  </option>

                  <option value="active">
                    Active
                  </option>

                  <option value="archived">
                    Archived
                  </option>
                </select>

                <span className="text-xs leading-5 text-black/45">
                  Active products appear on the storefront.
                </span>
              </label>

              <div className="md:col-span-2">
                <TextArea
                  label="Short description"
                  name="shortDescription"
                  rows={3}
                  maxLength={300}
                  defaultValue={
                    product.short_description
                  }
                  placeholder="Short description displayed on product cards."
                />
              </div>

              <div className="md:col-span-2">
                <TextArea
                  label="Full description"
                  name="description"
                  rows={8}
                  defaultValue={
                    product.description
                  }
                  placeholder="Complete product description."
                />
              </div>
            </div>
          </FormSection>

          <FormSection
            icon={Tags}
            title="Category"
            description="Move this product to another active category."
          >
            <div className="grid gap-5 md:grid-cols-2">
              <label className="grid gap-2">
                <span className="text-sm font-bold text-black">
                  Category
                  <span className="ml-1 text-red-600">
                    *
                  </span>
                </span>

                <select
                  name="category"
                  required
                  defaultValue={
                    product.category || ""
                  }
                  className="h-12 rounded-2xl border border-black/10 bg-[#faf8f4] px-4 text-sm font-semibold text-black outline-none transition focus:border-black"
                >
                  {!currentCategoryExists &&
                  product.category ? (
                    <option
                      value={product.category}
                    >
                      {product.category} — Current
                    </option>
                  ) : null}

                  {categories.map(
                    (category) => (
                      <option
                        key={category.id}
                        value={
                          category.category_id
                        }
                        disabled={
                          !category.is_active &&
                          category.category_id !==
                            product.category
                        }
                      >
                        {category.name}
                        {!category.is_active
                          ? " — Inactive"
                          : ""}
                      </option>
                    )
                  )}
                </select>

                <span className="text-xs leading-5 text-black/45">
                  Categories are managed under Admin → Categories.
                </span>
              </label>

              <TextInput
                label="Subcategory"
                name="subcategory"
                defaultValue={
                  product.subcategory ||
                  ""
                }
                placeholder="basmati-rice"
              />
            </div>
          </FormSection>

          <FormSection
            icon={BadgeDollarSign}
            title="Pricing"
            description="Update selling price, comparison price, internal cost, and currency."
          >
            <div className="grid gap-5 md:grid-cols-2">
              <TextInput
                label="Selling price"
                name="price"
                type="number"
                required
                min="0"
                step="0.01"
                defaultValue={centsToDollars(
                  product.price_cents
                )}
              />

              <TextInput
                label="Compare-at price"
                name="compareAtPrice"
                type="number"
                min="0"
                step="0.01"
                defaultValue={moneyValue(
                  product.compare_at_price
                )}
                helpText="Optional original price. It must be greater than or equal to the selling price."
              />

              <TextInput
                label="Product cost"
                name="cost"
                type="number"
                min="0"
                step="0.01"
                defaultValue={centsToDollars(
                  product.cost_cents
                )}
              />

              <label className="grid gap-2">
                <span className="text-sm font-bold text-black">
                  Currency
                </span>

                <select
                  name="currency"
                  defaultValue={
                    product.currency ||
                    "USD"
                  }
                  className="h-12 rounded-2xl border border-black/10 bg-[#faf8f4] px-4 text-sm font-semibold text-black outline-none transition focus:border-black"
                >
                  <option value="USD">
                    USD — US Dollar
                  </option>
                </select>
              </label>
            </div>
          </FormSection>

          <FormSection
            icon={Box}
            title="Packaging"
            description="Update pack quantity, selling unit, and customer-facing weight."
          >
            <div className="grid gap-5 md:grid-cols-3">
              <TextInput
                label="Pack size"
                name="packSize"
                defaultValue={
                  product.pack_size || ""
                }
                placeholder="50 pcs"
              />

              <TextInput
                label="Unit label"
                name="unitLabel"
                defaultValue={
                  product.unit_label ||
                  ""
                }
                placeholder="pack"
              />

              <TextInput
                label="Weight label"
                name="weightLabel"
                defaultValue={
                  product.weight_label ||
                  ""
                }
                placeholder="10 lb"
              />
            </div>
          </FormSection>

          <FormSection
            icon={Settings2}
            title="Merchandising and Behavior"
            description="Control product promotion, storefront order, taxation, and shipping."
          >
            <div className="grid gap-4 md:grid-cols-2">
              <CheckboxField
                name="featured"
                title="Featured product"
                description="Show this product in featured collections and prioritize it in storefront ordering."
                defaultChecked={Boolean(
                  product.featured
                )}
              />

              <CheckboxField
                name="bestSeller"
                title="Best Seller"
                description="Display a Best Seller badge and include this product in best-selling filters."
                defaultChecked={Boolean(
                  product.best_seller
                )}
              />

              <CheckboxField
                name="newArrival"
                title="New Arrival"
                description="Display a New Arrival badge and include this product in new-product collections."
                defaultChecked={Boolean(
                  product.new_arrival
                )}
              />

              <TextInput
                label="Display order"
                name="displayOrder"
                type="number"
                min="0"
                step="1"
                defaultValue={
                  product.display_order ?? 999
                }
                placeholder="999"
                helpText="Lower numbers appear first when customers sort by Featured."
              />

              <CheckboxField
                name="taxable"
                title="Taxable product"
                description="Include this product in applicable sales-tax calculations."
                defaultChecked={Boolean(
                  product.taxable
                )}
              />

              <CheckboxField
                name="requiresShipping"
                title="Requires shipping"
                description="This is a physical product requiring delivery."
                defaultChecked={Boolean(
                  product.requires_shipping
                )}
              />
            </div>
          </FormSection>

          <FormSection
            icon={Package}
            title="Inventory"
            description="Update physical stock and the low-stock warning threshold."
          >
            <div className="grid gap-5 md:grid-cols-3">
              <TextInput
                label="Stock quantity"
                name="initialStock"
                type="number"
                required
                min="0"
                step="1"
                defaultValue={
                  inventory.stock_quantity
                }
              />

              <TextInput
                label="Reserved quantity"
                name="reservedQuantity"
                type="number"
                defaultValue={
                  inventory.reserved_quantity
                }
                readOnly
                helpText="Controlled automatically by checkout reservations."
              />

              <TextInput
                label="Low-stock threshold"
                name="lowStockThreshold"
                type="number"
                required
                min="0"
                step="1"
                defaultValue={
                  inventory.low_stock_threshold
                }
              />
            </div>

            <div className="mt-5 rounded-2xl bg-amber-50 p-4 text-sm leading-6 text-amber-900">
              Available inventory:{" "}
              <strong>
                {Math.max(
                  Number(
                    inventory.stock_quantity ||
                      0
                  ) -
                    Number(
                      inventory.reserved_quantity ||
                        0
                    ),
                  0
                )}
              </strong>
            </div>
          </FormSection>

          <FormSection
            icon={Search}
            title="Search Engine Optimization"
            description="Update product-page title and description for search engines."
          >
            <div className="grid gap-5">
              <TextInput
                label="SEO title"
                name="seoTitle"
                maxLength={70}
                defaultValue={
                  product.seo_title || ""
                }
              />

              <TextArea
                label="SEO description"
                name="seoDescription"
                rows={4}
                maxLength={180}
                defaultValue={
                  product.seo_description
                }
              />
            </div>
          </FormSection>

          <section className="sticky bottom-4 z-20 rounded-[1.75rem] border border-black/5 bg-white/95 p-4 shadow-xl backdrop-blur">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <Link
                href={`/admin/products/${productId}`}
                className="rounded-full border border-black/10 bg-white px-6 py-3 text-sm font-bold text-black transition hover:bg-[#f1eadf]"
              >
                Cancel
              </Link>

              <button
                type="submit"
                className="inline-flex items-center justify-center gap-2 rounded-full bg-black px-7 py-3 text-sm font-bold text-white transition hover:bg-black/80"
              >
                <Save size={17} />
                Save Product
              </button>
            </div>
          </section>
        </form>
      </div>
    </main>
  );
}