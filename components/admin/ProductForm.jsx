import Link from "next/link";
import { ChevronDown, Info, Plus } from "lucide-react";
import {
  ProductFormHelpers,
  SubmitButton
} from "@/components/admin/ProductFormClient";
import {
  BUTTON_SECONDARY,
  Check,
  Field,
  Help,
  SelectField,
  TextAreaField
} from "@/components/admin/product-ui";

/*
 * The Add product form. Field names match readProductForm in
 * app/admin/products/product-actions.js — keep them in sync.
 * (Edit product uses EditProductForm.)
 */

function Card({ title, aside, className = "", children }) {
  return (
    <section className={`rounded-2xl border border-black/10 bg-white shadow-sm ${className}`}>
      <div className="flex items-start justify-between gap-3 px-5 pt-5">
        <h2 className="min-w-0 text-base font-bold text-black">{title}</h2>
        {aside}
      </div>

      <div className="p-5">{children}</div>
    </section>
  );
}

function Collapsible({ title, hint, defaultOpen = false, className = "", children }) {
  return (
    <details
      open={defaultOpen}
      className={`group rounded-2xl border border-black/10 bg-white shadow-sm ${className}`}
    >
      <summary className="flex cursor-pointer list-none items-center justify-between gap-3 rounded-2xl px-5 py-4 transition hover:bg-[#faf7f2] group-open:rounded-b-none [&::-webkit-details-marker]:hidden">
        <span className="min-w-0">
          <span className="block text-base font-bold text-black">{title}</span>
          {hint ? (
            <span className="mt-0.5 block truncate text-sm text-black/55">
              {hint}
            </span>
          ) : null}
        </span>

        <ChevronDown
          size={18}
          aria-hidden="true"
          className="shrink-0 text-black/50 transition group-open:rotate-180"
        />
      </summary>

      <div className="border-t border-black/[0.07] p-5">{children}</div>
    </details>
  );
}

function StatusOption({ value, label, defaultChecked }) {
  return (
    <label className="relative flex-1 cursor-pointer">
      <input
        type="radio"
        name="status"
        value={value}
        defaultChecked={defaultChecked}
        className="peer sr-only"
      />
      <span className="flex h-9 items-center justify-center rounded-lg text-sm font-semibold text-black/60 transition hover:text-black peer-checked:bg-white peer-checked:text-black peer-checked:shadow-sm peer-checked:ring-1 peer-checked:ring-black/10 peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-black">
        {label}
      </span>
    </label>
  );
}

export default function ProductForm({
  action,
  storefront,
  cancelHref,
  formId = "product-form",
  categories = []
}) {
  const categoriesHref = `/admin/${storefront.slug}/categories`;

  const buttons = (
    <div className="flex items-center gap-2">
      <Link href={cancelHref} className={BUTTON_SECONDARY}>
        Cancel
      </Link>

      <SubmitButton pendingLabel="Creating…">
        <Plus size={16} aria-hidden="true" />
        Create product
      </SubmitButton>
    </div>
  );

  return (
    <form id={formId} action={action} className="grid grid-cols-1 gap-6">
      {/* Saved to this store only. */}
      <input type="hidden" name="storefrontSlug" value={storefront.slug} />

      <ProductFormHelpers formId={formId} suggestIdentifiers />

      <header className="flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0">
          <h1 className="font-display text-4xl font-bold text-black">
            Add product
          </h1>
          <p className="mt-1.5 text-sm text-black/55">
            Enter the product details and starting inventory.
          </p>
        </div>

        {buttons}
      </header>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_20rem] lg:items-start lg:gap-5">
        {/*
          * Two columns on large screens. On phones the columns dissolve
          * (display: contents) and the order-* classes put Pricing,
          * Inventory and Visibility right after Product details.
          */}
        {/* Main column */}
        <div className="contents lg:grid lg:min-w-0 lg:grid-cols-1 lg:gap-4">
          <Card title="Product details" className="order-1">
            <div className="grid gap-4">
              <Field
                label="Product title"
                name="title"
                required
                placeholder="Premium Basmati Rice – 10 lb"
                autoComplete="off"
              />

              <div className="grid gap-1.5">
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field
                    label="Product ID"
                    name="productId"
                    required
                    placeholder="rice-10"
                    autoComplete="off"
                    spellCheck={false}
                  />

                  <Field
                    label="SKU"
                    name="sku"
                    optional
                    placeholder="SFRICE10"
                    autoComplete="off"
                    spellCheck={false}
                    inputClassName="uppercase placeholder:normal-case"
                  />
                </div>

                <p className="flex items-start gap-1.5 text-xs leading-5 text-black/50">
                  <Info size={13} className="mt-1 shrink-0" aria-hidden="true" />
                  Keep the Product ID permanent after saving — it links the
                  product to its stock and orders.
                </p>
              </div>

              <Field
                label="URL slug"
                name="slug"
                required
                prefix="/products/"
                placeholder="premium-basmati-rice-10-lb"
                autoComplete="off"
                spellCheck={false}
                help="Suggested from the product title."
              />

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="grid min-w-0 content-start gap-1.5">
                  <SelectField
                    label="Category"
                    name="category"
                    required
                    defaultValue=""
                  >
                    <option value="" disabled>
                      Select a category
                    </option>
                    {categories.map((category) => (
                      <option key={category.id} value={category.category_id}>
                        {category.name}
                      </option>
                    ))}
                  </SelectField>

                  <Help>
                    Manage the list under{" "}
                    <Link
                      href={categoriesHref}
                      className="font-semibold text-black/70 underline decoration-black/20 underline-offset-2 hover:text-black"
                    >
                      Categories
                    </Link>
                    .
                  </Help>
                </div>

                <Field
                  label="Subcategory"
                  name="subcategory"
                  optional
                  placeholder="basmati-rice"
                  autoComplete="off"
                />
              </div>
            </div>
          </Card>

          <Collapsible
            className="order-5"
            title="Descriptions"
            hint="Short summary and full product description"
            defaultOpen
          >
            <div className="grid gap-4">
              <TextAreaField
                label="Short description"
                name="shortDescription"
                rows={3}
                maxLength={300}
                counter
                placeholder="A one or two sentence summary for product cards."
                help="Shown on product cards. Aim for 100–200 characters."
              />

              <TextAreaField
                label="Full description"
                name="description"
                rows={8}
                placeholder="Describe the product, quality, uses, and packaging."
              />
            </div>
          </Collapsible>

          <Collapsible
            className="order-8"
            title="Packaging"
            hint="Pack size, selling unit, and weight"
          >
            <div className="grid gap-4 sm:grid-cols-3">
              <Field label="Pack size" name="packSize" optional placeholder="50 pcs" />
              <Field label="Unit label" name="unitLabel" optional placeholder="bag" />
              <Field label="Weight label" name="weightLabel" optional placeholder="10 lb" />
            </div>
          </Collapsible>

          <Collapsible
            className="order-9"
            title="Merchandising & behavior"
            hint="Badges, sort order, tax, and shipping"
          >
            <div className="grid gap-4">
              <div className="grid gap-2 sm:grid-cols-2">
                <Check
                  name="featured"
                  title="Featured"
                  description="Shown first in featured collections."
                />
                <Check
                  name="bestSeller"
                  title="Best Seller"
                  description="Adds a Best Seller badge."
                />
                <Check
                  name="newArrival"
                  title="New Arrival"
                  description="Adds a New Arrival badge."
                />
                <Check
                  name="taxable"
                  title="Taxable"
                  description="Included in sales-tax calculations."
                  defaultChecked
                />
                <Check
                  name="requiresShipping"
                  title="Requires shipping"
                  description="A physical product that is delivered."
                  defaultChecked
                />
              </div>

              <Field
                label="Display order"
                name="displayOrder"
                type="number"
                min="0"
                step="1"
                inputMode="numeric"
                defaultValue={999}
                className="sm:max-w-[16rem]"
                help="Lower numbers appear first when sorting by Featured."
              />
            </div>
          </Collapsible>

          <Collapsible
            className="order-10"
            title="Search appearance (SEO)"
            hint="How the product looks in Google results"
          >
            <div className="grid gap-4">
              <Field
                label="SEO title"
                name="seoTitle"
                optional
                maxLength={70}
                counter
                placeholder="Premium Basmati Rice – 10 lb | Shakti Foods"
                help="Aim for around 60 characters."
              />

              <TextAreaField
                label="SEO description"
                name="seoDescription"
                optional
                rows={3}
                maxLength={180}
                counter
                placeholder="A short summary that appears under the title in search results."
                help="Aim for around 155–160 characters."
              />
            </div>
          </Collapsible>
        </div>

        {/* Side column */}
        <div className="contents lg:grid lg:min-w-0 lg:grid-cols-1 lg:gap-4">
          <Card
            className="order-2"
            title="Pricing"
            aside={
              <span className="rounded-md bg-black/[0.05] px-2 py-0.5 text-xs font-semibold text-black/60">
                USD
              </span>
            }
          >
            <input type="hidden" name="currency" value="USD" />

            <div className="grid gap-4">
              <Field
                label="Selling price"
                name="price"
                type="number"
                required
                min="0"
                step="0.01"
                inputMode="decimal"
                prefix="$"
                placeholder="0.00"
              />

              <details className="group/price">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-2 rounded-lg py-1 text-sm font-semibold text-black/70 transition hover:text-black [&::-webkit-details-marker]:hidden">
                  Compare-at price &amp; cost
                  <ChevronDown
                    size={16}
                    aria-hidden="true"
                    className="text-black/45 transition group-open/price:rotate-180"
                  />
                </summary>

                <div className="mt-3 grid gap-4">
                  <Field
                    label="Compare-at price"
                    name="compareAtPrice"
                    type="number"
                    min="0"
                    step="0.01"
                    inputMode="decimal"
                    prefix="$"
                    placeholder="0.00"
                    help="Shown crossed out. Must be at least the selling price."
                  />

                  <Field
                    label="Product cost"
                    name="cost"
                    type="number"
                    min="0"
                    step="0.01"
                    inputMode="decimal"
                    prefix="$"
                    placeholder="0.00"
                    help="Your cost. Customers never see this."
                  />
                </div>
              </details>
            </div>
          </Card>

          <Card title="Inventory" className="order-3">
            <div className="grid grid-cols-2 gap-3">
              <Field
                label="Initial stock"
                name="initialStock"
                type="number"
                required
                min="0"
                step="1"
                inputMode="numeric"
                defaultValue={0}
              />

              <Field
                label="Low-stock alert"
                name="lowStockThreshold"
                type="number"
                required
                min="0"
                step="1"
                inputMode="numeric"
                defaultValue={5}
              />
            </div>

            <p className="mt-3 text-xs leading-5 text-black/50">
              Reserved stock starts at zero.
            </p>
          </Card>

          <Card title="Visibility" className="order-4">
            <fieldset>
              <legend className="sr-only">Status</legend>
              <div className="flex gap-1 rounded-xl bg-black/[0.05] p-1">
                <StatusOption value="draft" label="Draft" defaultChecked />
                <StatusOption value="active" label="Active" />
              </div>
            </fieldset>

            <p className="mt-3 text-xs leading-5 text-black/50">
              Draft products are hidden from the storefront.
            </p>
          </Card>
        </div>
      </div>

      <footer className="flex flex-wrap items-center justify-end gap-3 rounded-2xl border border-black/10 bg-white px-5 py-3.5 shadow-sm sm:justify-between">
        <p className="text-sm text-black/55">
          Add images, specifications, and certifications after creating the product.
        </p>

        {buttons}
      </footer>
    </form>
  );
}
