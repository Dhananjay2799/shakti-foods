import Link from "next/link";
import {
  ArrowLeft,
  BadgeDollarSign,
  Box,
  FileText,
  Package,
  Plus,
  Search,
  Settings2,
  Tags
} from "lucide-react";
import { createProduct } from "@/app/admin/products/product-actions";
import { createSupabaseAdmin } from "@/lib/supabase-admin";

export const dynamic = "force-dynamic";

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
  maxLength
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
        className="h-12 rounded-2xl border border-black/10 bg-[#faf8f4] px-4 text-sm text-black outline-none transition focus:border-black"
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

export default async function NewProductPage() {
  const supabase = createSupabaseAdmin();
  const { data: categories } = await supabase
    .from("product_categories")
    .select("id, category_id, name")
    .eq("is_active", true)
    .order("sort_order", { ascending: true })
    .order("name", { ascending: true });

  const activeCategories = categories || [];

  return (
    <main className="min-h-screen bg-[#f8f6f1]">
      <div className="mx-auto max-w-5xl px-5 py-8 md:px-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Link
            href="/admin/products"
            className="inline-flex items-center gap-2 rounded-full bg-white px-5 py-3 text-sm font-bold text-black shadow-sm transition hover:bg-[#f1eadf]"
          >
            <ArrowLeft size={17} />
            Back to Products
          </Link>

          <span className="rounded-full bg-[#f1eadf] px-4 py-2 text-xs font-bold uppercase tracking-[0.1em] text-black/60">
            New Product
          </span>
        </div>

        <header className="mt-6 rounded-[1.75rem] border border-black/5 bg-white p-5 shadow-sm md:p-7">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-black/40">
            Product Management
          </p>

          <h1 className="mt-2 font-display text-3xl font-bold text-black md:text-4xl">
            Add Product
          </h1>

          <p className="mt-2 max-w-2xl text-sm leading-6 text-black/55">
            Create a product catalog record and its initial
            inventory record. Images, specifications, and
            certifications can be added after saving.
          </p>
        </header>

        <form
          action={createProduct}
          className="mt-6 grid gap-5"
        >
          <FormSection
            icon={Package}
            title="Basic Information"
            description="Enter the customer-facing product name, identifiers, and descriptions."
          >
            <div className="grid gap-5 md:grid-cols-2">
              <div className="md:col-span-2">
                <TextInput
                  label="Product title"
                  name="title"
                  required
                  placeholder="Example: Shakti Foods Premium Basmati Rice – 10 lb"
                  helpText="The main name shown to customers and administrators."
                />
              </div>

              <TextInput
                label="Product ID"
                name="productId"
                required
                placeholder="rice-10"
                helpText="A permanent internal identifier. Use lowercase letters, numbers, hyphens, or underscores."
              />

              <TextInput
                label="URL slug"
                name="slug"
                required
                placeholder="premium-basmati-rice-10-lb"
                helpText="Used in the storefront product URL."
              />

              <TextInput
                label="SKU"
                name="sku"
                placeholder="SFRICE10"
                helpText="Optional unique stock-keeping unit."
              />

              <label className="grid gap-2">
                <span className="text-sm font-bold text-black">
                  Status
                </span>

                <select
                  name="status"
                  defaultValue="draft"
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
                  Draft products are hidden from normal storefront workflows.
                </span>
              </label>

              <div className="md:col-span-2">
                <TextArea
                  label="Short description"
                  name="shortDescription"
                  rows={3}
                  maxLength={300}
                  placeholder="A concise product summary for cards and search results."
                  helpText="Recommended length: 100–200 characters."
                />
              </div>

              <div className="md:col-span-2">
                <TextArea
                  label="Full description"
                  name="description"
                  rows={8}
                  placeholder="Describe the product, quality, use cases, benefits, packaging, and other relevant information."
                />
              </div>
            </div>
          </FormSection>

          <FormSection
            icon={Tags}
            title="Classification"
            description="Organize the product into storefront and administrative categories."
          >
            <div className="grid gap-5 md:grid-cols-2">
              <label className="grid gap-2">
                <span className="text-sm font-bold text-black">
                  Category
                  <span className="ml-1 text-red-600">*</span>
                </span>

                <select
                  name="category"
                  required
                  defaultValue=""
                  className="h-12 rounded-2xl border border-black/10 bg-[#faf8f4] px-4 text-sm font-semibold text-black outline-none transition focus:border-black"
                >
                  <option value="" disabled>
                    Select a category
                  </option>
                  {activeCategories.map((category) => (
                    <option key={category.id} value={category.category_id}>
                      {category.name}
                    </option>
                  ))}
                </select>

                <span className="text-xs leading-5 text-black/45">
                  Manage available categories from Admin → Categories.
                </span>
              </label>

              <TextInput
                label="Subcategory"
                name="subcategory"
                placeholder="basmati-rice"
                helpText="Optional, more specific classification."
              />
            </div>
          </FormSection>

          <FormSection
            icon={BadgeDollarSign}
            title="Pricing"
            description="Set storefront pricing, comparison pricing, cost, and currency."
          >
            <div className="grid gap-5 md:grid-cols-2">
              <TextInput
                label="Selling price"
                name="price"
                type="number"
                required
                min="0"
                step="0.01"
                placeholder="21.99"
                helpText="Enter the amount in dollars, not cents."
              />

              <TextInput
                label="Compare-at price"
                name="compareAtPrice"
                type="number"
                min="0"
                step="0.01"
                placeholder="24.99"
                helpText="Optional original price displayed beside a discounted selling price."
              />

              <TextInput
                label="Product cost"
                name="cost"
                type="number"
                min="0"
                step="0.01"
                placeholder="12.00"
                helpText="Internal cost used for future margin analytics."
              />

              <label className="grid gap-2">
                <span className="text-sm font-bold text-black">
                  Currency
                </span>

                <select
                  name="currency"
                  defaultValue="USD"
                  className="h-12 rounded-2xl border border-black/10 bg-[#faf8f4] px-4 text-sm font-semibold text-black outline-none transition focus:border-black"
                >
                  <option value="USD">
                    USD — US Dollar
                  </option>
                </select>

                <span className="text-xs leading-5 text-black/45">
                  Additional currencies can be added later.
                </span>
              </label>
            </div>
          </FormSection>

          <FormSection
            icon={Box}
            title="Packaging"
            description="Describe the size, selling unit, and product weight."
          >
            <div className="grid gap-5 md:grid-cols-3">
              <TextInput
                label="Pack size"
                name="packSize"
                placeholder="50 pcs"
                helpText="Examples: 50 pcs, 25 pcs, 1 bag."
              />

              <TextInput
                label="Unit label"
                name="unitLabel"
                placeholder="pack"
                helpText="Examples: pack, case, bag, box."
              />

              <TextInput
                label="Weight label"
                name="weightLabel"
                placeholder="10 lb"
                helpText="Customer-facing weight or capacity."
              />
            </div>
          </FormSection>

          <FormSection
            icon={Settings2}
            title="Merchandising and Behavior"
            description="Control product promotion, storefront order, tax, and fulfillment behavior."
          >
            <div className="grid gap-4 md:grid-cols-2">
              <CheckboxField
                name="featured"
                title="Featured product"
                description="Show this product in featured collections and prioritize it in storefront ordering."
              />

              <CheckboxField
                name="bestSeller"
                title="Best Seller"
                description="Display a Best Seller badge and include this product in best-selling filters."
              />

              <CheckboxField
                name="newArrival"
                title="New Arrival"
                description="Display a New Arrival badge and include this product in new-product collections."
              />

              <TextInput
                label="Display order"
                name="displayOrder"
                type="number"
                min="0"
                step="1"
                defaultValue="999"
                placeholder="999"
                helpText="Lower numbers appear first when customers sort by Featured."
              />

              <CheckboxField
                name="taxable"
                title="Taxable product"
                description="Include this product in applicable sales-tax calculations."
                defaultChecked
              />

              <CheckboxField
                name="requiresShipping"
                title="Requires shipping"
                description="This is a physical product that must be delivered."
                defaultChecked
              />
            </div>
          </FormSection>

          <FormSection
            icon={Plus}
            title="Initial Inventory"
            description="Create the initial inventory record for this product."
          >
            <div className="grid gap-5 md:grid-cols-2">
              <TextInput
                label="Initial stock"
                name="initialStock"
                type="number"
                required
                min="0"
                step="1"
                defaultValue="0"
                placeholder="0"
                helpText="The starting physical stock quantity."
              />

              <TextInput
                label="Low-stock threshold"
                name="lowStockThreshold"
                type="number"
                required
                min="0"
                step="1"
                defaultValue="5"
                placeholder="5"
                helpText="The quantity at which the admin portal should show a low-stock warning."
              />
            </div>

            <div className="mt-5 rounded-2xl bg-amber-50 p-4 text-sm leading-6 text-amber-900">
              Reserved quantity starts at zero and is controlled
              automatically by the checkout reservation system.
            </div>
          </FormSection>

          <FormSection
            icon={Search}
            title="Search Engine Optimization"
            description="Control how the product may appear in search engines and shared links."
          >
            <div className="grid gap-5">
              <TextInput
                label="SEO title"
                name="seoTitle"
                maxLength={70}
                placeholder="Premium Basmati Rice – 10 lb | Shakti Foods"
                helpText="Recommended maximum: approximately 60 characters."
              />

              <TextArea
                label="SEO description"
                name="seoDescription"
                rows={4}
                maxLength={180}
                placeholder="Shop naturally aged premium basmati rice with traditional aroma and reliable cooking quality."
                helpText="Recommended maximum: approximately 155–160 characters."
              />
            </div>
          </FormSection>

          <section className="rounded-[1.75rem] border border-black/5 bg-white p-4 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <Link
                href="/admin/products"
                className="rounded-full border border-black/10 bg-white px-6 py-3 text-sm font-bold text-black transition hover:bg-[#f1eadf]"
              >
                Cancel
              </Link>

              <button
                type="submit"
                className="inline-flex items-center justify-center gap-2 rounded-full bg-black px-7 py-3 text-sm font-bold text-white transition hover:bg-black/80"
              >
                <Plus size={17} />
                Create Product
              </button>
            </div>
          </section>
        </form>

        <section className="mt-5 rounded-2xl bg-[#f1eadf] p-5">
          <div className="flex items-start gap-3">
            <FileText
              size={19}
              className="mt-0.5 shrink-0 text-black"
            />

            <div>
              <p className="font-bold text-black">
                After creating the product
              </p>

              <p className="mt-1 text-sm leading-6 text-black/60">
                You will be redirected to the product details page.
                From there, add images, specifications,
                certifications, and make further updates.
              </p>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}