import Link from "next/link";
import {
  ChevronDown,
  ExternalLink,
  FileBadge2,
  Images,
  Info,
  Plus,
  Save,
  Trash2
} from "lucide-react";
import {
  ProductFormHelpers,
  SubmitButton
} from "@/components/admin/ProductFormClient";

/*
 * The Add product and Edit product form. Field names match readProductForm,
 * readPriceTiers and readSubscriptionSettings in
 * app/admin/products/product-actions.js — keep them in sync.
 */

const INPUT =
  "h-11 w-full rounded-xl border border-black/10 bg-[#faf8f4] px-3.5 text-sm text-black outline-none transition placeholder:text-black/35 focus:border-black focus:bg-white";

const TEXTAREA =
  "w-full resize-y rounded-xl border border-black/10 bg-[#faf8f4] px-3.5 py-3 text-sm leading-6 text-black outline-none transition placeholder:text-black/35 focus:border-black focus:bg-white";

const TIER_QUANTITIES = [5, 10, 25, 50, 100];

function centsToDollars(value) {
  if (value === null || value === undefined || value === "") {
    return "";
  }

  return (Number(value) / 100).toFixed(2);
}

function moneyValue(value) {
  if (value === null || value === undefined || value === "") {
    return "";
  }

  const amount = Number(value);

  return Number.isFinite(amount) ? amount.toFixed(2) : "";
}

function Card({ title, aside, description, className = "", children }) {
  return (
    <section className={`rounded-2xl border border-black/10 bg-white shadow-sm ${className}`}>
      <div className="flex items-start justify-between gap-3 px-5 pt-5">
        <div className="min-w-0">
          <h2 className="text-base font-bold text-black">{title}</h2>
          {description ? (
            <p className="mt-0.5 text-sm text-black/55">{description}</p>
          ) : null}
        </div>
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

function FieldLabel({ htmlFor, children, required, optional }) {
  return (
    <label htmlFor={htmlFor} className="text-sm font-semibold text-black">
      {children}
      {required ? (
        <span className="ml-0.5 text-red-600" aria-hidden="true">
          *
        </span>
      ) : null}
      {optional ? (
        <span className="ml-1.5 text-xs font-medium text-black/40">
          Optional
        </span>
      ) : null}
    </label>
  );
}

function Help({ children, id }) {
  return (
    <p id={id} className="text-xs leading-5 text-black/50">
      {children}
    </p>
  );
}

function Field({
  label,
  name,
  required = false,
  optional = false,
  help,
  counter = false,
  prefix,
  className = "",
  inputClassName = "",
  ...inputProps
}) {
  const id = `field-${name}`;
  const helpId = help ? `${id}-help` : undefined;

  return (
    <div className={`grid min-w-0 content-start gap-1.5 ${className}`}>
      <FieldLabel htmlFor={id} required={required} optional={optional}>
        {label}
      </FieldLabel>

      {prefix ? (
        // The box is drawn by the wrapper so the prefix ($, /products/)
        // sits right before the typed text at any width.
        <div className="flex h-11 min-w-0 items-center rounded-xl border border-black/10 bg-[#faf8f4] transition focus-within:border-black focus-within:bg-white">
          <span
            className="select-none whitespace-nowrap pl-3.5 pr-1 text-sm font-semibold text-black/45"
            aria-hidden="true"
          >
            {prefix}
          </span>
          <input
            id={id}
            name={name}
            required={required}
            aria-describedby={helpId}
            className={`h-full w-full min-w-0 rounded-r-xl bg-transparent pr-3.5 text-sm text-black outline-none placeholder:text-black/35 ${inputClassName}`}
            {...inputProps}
          />
        </div>
      ) : (
        <input
          id={id}
          name={name}
          required={required}
          aria-describedby={helpId}
          className={`${INPUT} ${inputClassName}`}
          {...inputProps}
        />
      )}

      {help || counter ? (
        <div className="flex items-start justify-between gap-3">
          {help ? <Help id={helpId}>{help}</Help> : <span />}
          {counter ? (
            <span
              data-count={name}
              className="shrink-0 text-xs tabular-nums text-black/40"
              aria-hidden="true"
            />
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

function TextAreaField({ label, name, help, counter = false, optional = false, ...props }) {
  const id = `field-${name}`;
  const helpId = help ? `${id}-help` : undefined;

  return (
    <div className="grid min-w-0 gap-1.5">
      <FieldLabel htmlFor={id} optional={optional}>
        {label}
      </FieldLabel>

      <textarea
        id={id}
        name={name}
        aria-describedby={helpId}
        className={TEXTAREA}
        {...props}
      />

      {help || counter ? (
        <div className="flex items-start justify-between gap-3">
          {help ? <Help id={helpId}>{help}</Help> : <span />}
          {counter ? (
            <span
              data-count={name}
              className="shrink-0 text-xs tabular-nums text-black/40"
              aria-hidden="true"
            />
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

function Check({ name, title, description, defaultChecked = false }) {
  return (
    <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-black/10 px-3.5 py-3 transition hover:bg-[#faf7f2] has-[:checked]:border-black/25 has-[:checked]:bg-[#faf7f2]">
      <input
        type="checkbox"
        name={name}
        defaultChecked={defaultChecked}
        className="mt-0.5 h-4 w-4 shrink-0 accent-black"
      />
      <span className="min-w-0">
        <span className="block text-sm font-semibold text-black">{title}</span>
        {description ? (
          <span className="mt-0.5 block text-xs leading-5 text-black/50">
            {description}
          </span>
        ) : null}
      </span>
    </label>
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

function SideLink({ href, icon: Icon, children, external = false }) {
  return (
    <Link
      href={href}
      target={external ? "_blank" : undefined}
      rel={external ? "noreferrer" : undefined}
      className="flex items-center justify-between gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold text-black transition hover:bg-[#faf7f2]"
    >
      <span className="flex items-center gap-2.5">
        <Icon size={17} aria-hidden="true" className="text-black/55" />
        {children}
      </span>
      {external ? (
        <ExternalLink size={15} aria-hidden="true" className="text-black/40" />
      ) : null}
    </Link>
  );
}

/** Up to three tier rows: the saved tiers first, then unused presets. */
function buildTierRows(priceTiers) {
  const saved = [...priceTiers]
    .sort((a, b) => Number(a.min_quantity) - Number(b.min_quantity))
    .slice(0, 3)
    .map((tier) => ({ quantity: Number(tier.min_quantity), tier }));

  for (const quantity of [5, 10, 25]) {
    if (saved.length >= 3) {
      break;
    }

    if (!saved.some((row) => row.quantity === quantity)) {
      saved.push({ quantity, tier: null });
    }
  }

  return saved;
}

export default function ProductForm({
  mode = "create",
  action,
  storefront,
  cancelHref,
  formId = "product-form",
  product = null,
  inventory = null,
  categories = [],
  priceTiers = [],
  subscription = null,
  links = null
}) {
  const isEdit = mode === "edit";
  const p = product || {};
  const categoriesHref = `/admin/${storefront.slug}/categories`;

  const currentCategory = p.category || "";
  const categoryListed = categories.some(
    (category) => category.category_id === currentCategory
  );

  const status = p.status || "draft";
  const stock = Number(inventory?.stock_quantity ?? 0);
  const reserved = Number(inventory?.reserved_quantity ?? 0);
  const available = Math.max(stock - reserved, 0);

  const packagingHint =
    [p.pack_size, p.unit_label, p.weight_label].filter(Boolean).join(" · ") ||
    "Pack size, selling unit, and weight";

  const merchandisingFlags = [
    p.featured && "Featured",
    p.best_seller && "Best Seller",
    p.new_arrival && "New Arrival",
    p.taxable && "Taxable",
    p.requires_shipping && "Requires shipping"
  ].filter(Boolean);

  const seoHint = isEdit
    ? p.seo_title || p.seo_description
      ? p.seo_title || "Custom description set"
      : "Uses the product title and short description"
    : "How the product looks in Google results";

  const tierRows = isEdit ? buildTierRows(priceTiers) : [];
  const activeTierCount = priceTiers.filter((tier) => tier.is_active !== false).length;

  const subscriptionSettings = subscription?.settings || {};
  const hasFrequency = subscription?.hasFrequency || (() => false);

  const hasComparePricing =
    moneyValue(p.compare_at_price) !== "" || centsToDollars(p.cost_cents) !== "";

  const submitLabel = isEdit ? "Save changes" : "Create product";
  const submitIcon = isEdit ? <Save size={16} aria-hidden="true" /> : <Plus size={16} aria-hidden="true" />;

  const buttons = (
    <div className="flex items-center gap-2">
      <Link
        href={cancelHref}
        className="inline-flex h-10 items-center rounded-xl border border-black/10 bg-white px-4 text-sm font-semibold text-black transition hover:bg-black/[0.03]"
      >
        Cancel
      </Link>

      <SubmitButton pendingLabel={isEdit ? "Saving…" : "Creating…"}>
        {submitIcon}
        {submitLabel}
      </SubmitButton>
    </div>
  );

  return (
    <form id={formId} action={action} className="grid grid-cols-1 gap-6">
      {/* Saved to this store only. */}
      <input type="hidden" name="storefrontSlug" value={storefront.slug} />
      {isEdit ? (
        <input type="hidden" name="originalProductId" value={p.product_id} />
      ) : null}

      <ProductFormHelpers formId={formId} suggestIdentifiers={!isEdit} />

      <header className="flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0">
          <h1 className="font-display text-4xl font-bold text-black">
            {isEdit ? "Edit product" : "Add product"}
          </h1>
          <p className="mt-1.5 text-sm text-black/55">
            {isEdit ? (
              <>
                <span className="font-semibold text-black/75">{p.title}</span>
                <span className="mx-1.5 text-black/30">·</span>
                {p.product_id}
              </>
            ) : (
              "Enter the product details and starting inventory."
            )}
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
                defaultValue={p.title || ""}
                placeholder="Premium Basmati Rice – 10 lb"
                autoComplete="off"
              />

              <div className="grid gap-1.5">
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field
                    label="Product ID"
                    name="productId"
                    required
                    defaultValue={p.product_id || ""}
                    placeholder="rice-10"
                    autoComplete="off"
                    spellCheck={false}
                  />

                  <Field
                    label="SKU"
                    name="sku"
                    optional
                    defaultValue={p.sku || ""}
                    placeholder="SFRICE10"
                    autoComplete="off"
                    spellCheck={false}
                    inputClassName="uppercase placeholder:normal-case"
                  />
                </div>

                <p className="flex items-start gap-1.5 text-xs leading-5 text-black/50">
                  <Info size={13} className="mt-1 shrink-0" aria-hidden="true" />
                  {isEdit
                    ? "Changing the Product ID also updates its stock record and admin links."
                    : "Keep the Product ID permanent after saving — it links the product to its stock and orders."}
                </p>
              </div>

              <Field
                label="URL slug"
                name="slug"
                required
                prefix="/products/"
                defaultValue={p.slug || ""}
                placeholder="premium-basmati-rice-10-lb"
                autoComplete="off"
                spellCheck={false}
                help={
                  isEdit
                    ? "Changing this changes the product's web address."
                    : "Suggested from the product title."
                }
              />

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="grid min-w-0 content-start gap-1.5">
                  <FieldLabel htmlFor="field-category" required>
                    Category
                  </FieldLabel>

                  <select
                    id="field-category"
                    name="category"
                    required
                    defaultValue={currentCategory}
                    className={`${INPUT} font-medium`}
                  >
                    {!isEdit || !currentCategory ? (
                      <option value="" disabled>
                        Select a category
                      </option>
                    ) : null}

                    {isEdit && currentCategory && !categoryListed ? (
                      <option value={currentCategory}>
                        {currentCategory} — current
                      </option>
                    ) : null}

                    {categories.map((category) => (
                      <option
                        key={category.id}
                        value={category.category_id}
                        disabled={
                          category.is_active === false &&
                          category.category_id !== currentCategory
                        }
                      >
                        {category.name}
                        {category.is_active === false ? " — inactive" : ""}
                      </option>
                    ))}
                  </select>

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
                  defaultValue={p.subcategory || ""}
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
                defaultValue={p.short_description || ""}
                placeholder="A one or two sentence summary for product cards."
                help="Shown on product cards. Aim for 100–200 characters."
              />

              <TextAreaField
                label="Full description"
                name="description"
                rows={8}
                defaultValue={p.description || ""}
                placeholder="Describe the product, quality, uses, and packaging."
              />
            </div>
          </Collapsible>

          {isEdit ? (
            <Collapsible
              className="order-6"
              title="Quantity pricing"
              hint={
                activeTierCount > 0
                  ? `${activeTierCount} active ${activeTierCount === 1 ? "tier" : "tiers"}`
                  : "Lower unit price for larger orders"
              }
            >
              <div className="grid gap-3">
                <div className="hidden grid-cols-[minmax(0,1fr)_minmax(0,1fr)_6rem] gap-3 px-1 text-xs font-semibold text-black/50 sm:grid">
                  <span>Minimum quantity</span>
                  <span>Price per unit</span>
                  <span>Active</span>
                </div>

                {tierRows.map(({ quantity, tier }, index) => {
                  const options = TIER_QUANTITIES.includes(quantity)
                    ? TIER_QUANTITIES
                    : [...TIER_QUANTITIES, quantity].sort((a, b) => a - b);

                  return (
                    <div
                      key={`${quantity}-${index}`}
                      className="grid grid-cols-2 gap-3 rounded-xl border border-black/10 bg-[#faf8f4] p-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_6rem] sm:items-center"
                    >
                      <label className="grid min-w-0 gap-1">
                        <span className="text-xs font-semibold text-black/50 sm:sr-only">
                          Minimum quantity
                        </span>
                        <select
                          name={`tierQuantity_${index}`}
                          defaultValue={String(quantity)}
                          className={`${INPUT} bg-white font-medium`}
                        >
                          {options.map((option) => (
                            <option key={option} value={String(option)}>
                              {option}+ units
                            </option>
                          ))}
                        </select>
                      </label>

                      <label className="grid min-w-0 gap-1">
                        <span className="text-xs font-semibold text-black/50 sm:sr-only">
                          Price per unit
                        </span>
                        <span className="relative">
                          <span
                            className="pointer-events-none absolute inset-y-0 left-3.5 flex items-center text-sm font-semibold text-black/45"
                            aria-hidden="true"
                          >
                            $
                          </span>
                          <input
                            type="number"
                            name={`tierPrice_${index}`}
                            min="0"
                            step="0.01"
                            inputMode="decimal"
                            defaultValue={tier ? centsToDollars(tier.unit_price_cents) : ""}
                            placeholder="0.00"
                            className={`${INPUT} bg-white pl-7`}
                          />
                        </span>
                      </label>

                      <label className="col-span-2 flex cursor-pointer items-center gap-2 text-sm font-semibold text-black sm:col-span-1">
                        <input
                          type="checkbox"
                          name={`tierActive_${index}`}
                          defaultChecked={tier ? tier.is_active !== false : false}
                          className="h-4 w-4 accent-black"
                        />
                        Active
                      </label>

                      {tier ? (
                        <input type="hidden" name={`tierId_${index}`} value={tier.id} />
                      ) : null}
                    </div>
                  );
                })}

                <Help>
                  Example: with a 5+ price of $13.99, orders of 5 or more units use
                  that price until the next tier starts. Leave the price empty to
                  remove a tier.
                </Help>
              </div>
            </Collapsible>
          ) : null}

          {isEdit ? (
            <Collapsible
              className="order-7"
              title="Subscribe & Save"
              hint={
                subscriptionSettings.is_enabled
                  ? `On · ${Number(subscriptionSettings.discount_percent ?? 10)}% off repeat deliveries`
                  : "Off"
              }
            >
              <div className="grid gap-4">
                <Check
                  name="subscriptionEnabled"
                  title="Enable Subscribe & Save"
                  description="Customers can buy this product as a recurring subscription."
                  defaultChecked={Boolean(subscriptionSettings.is_enabled)}
                />

                <div className="grid gap-4 sm:grid-cols-2">
                  <Field
                    label="Discount (%)"
                    name="subscriptionDiscountPercent"
                    type="number"
                    min="0"
                    max="100"
                    step="1"
                    inputMode="numeric"
                    defaultValue={subscriptionSettings.discount_percent ?? 10}
                    help="Applied to each subscription delivery."
                  />

                  <Field
                    label="Minimum quantity"
                    name="subscriptionMinimumQuantity"
                    type="number"
                    min="1"
                    step="1"
                    inputMode="numeric"
                    defaultValue={subscriptionSettings.minimum_quantity ?? 1}
                    help="Smallest quantity allowed per delivery."
                  />
                </div>

                <fieldset className="grid gap-2">
                  <legend className="mb-1.5 text-sm font-semibold text-black">
                    Delivery frequencies
                  </legend>

                  <div className="grid gap-2 sm:grid-cols-3">
                    <Check
                      name="subscriptionFrequency2Weeks"
                      title="Every 2 weeks"
                      defaultChecked={hasFrequency("week", 2)}
                    />
                    <Check
                      name="subscriptionFrequency4Weeks"
                      title="Every 4 weeks"
                      defaultChecked={hasFrequency("week", 4)}
                    />
                    <Check
                      name="subscriptionFrequency8Weeks"
                      title="Every 8 weeks"
                      defaultChecked={hasFrequency("week", 8)}
                    />
                  </div>
                </fieldset>
              </div>
            </Collapsible>
          ) : null}

          <Collapsible className="order-8" title="Packaging" hint={isEdit ? packagingHint : "Pack size, selling unit, and weight"}>
            <div className="grid gap-4 sm:grid-cols-3">
              <Field
                label="Pack size"
                name="packSize"
                optional
                defaultValue={p.pack_size || ""}
                placeholder="50 pcs"
              />
              <Field
                label="Unit label"
                name="unitLabel"
                optional
                defaultValue={p.unit_label || ""}
                placeholder="bag"
              />
              <Field
                label="Weight label"
                name="weightLabel"
                optional
                defaultValue={p.weight_label || ""}
                placeholder="10 lb"
              />
            </div>
          </Collapsible>

          <Collapsible
            className="order-9"
            title="Merchandising & behavior"
            hint={
              isEdit && merchandisingFlags.length
                ? merchandisingFlags.join(" · ")
                : "Badges, sort order, tax, and shipping"
            }
          >
            <div className="grid gap-4">
              <div className="grid gap-2 sm:grid-cols-2">
                <Check
                  name="featured"
                  title="Featured"
                  description="Shown first in featured collections."
                  defaultChecked={Boolean(p.featured)}
                />
                <Check
                  name="bestSeller"
                  title="Best Seller"
                  description="Adds a Best Seller badge."
                  defaultChecked={Boolean(p.best_seller)}
                />
                <Check
                  name="newArrival"
                  title="New Arrival"
                  description="Adds a New Arrival badge."
                  defaultChecked={Boolean(p.new_arrival)}
                />
                <Check
                  name="taxable"
                  title="Taxable"
                  description="Included in sales-tax calculations."
                  defaultChecked={isEdit ? Boolean(p.taxable) : true}
                />
                <Check
                  name="requiresShipping"
                  title="Requires shipping"
                  description="A physical product that is delivered."
                  defaultChecked={isEdit ? Boolean(p.requires_shipping) : true}
                />
              </div>

              <Field
                label="Display order"
                name="displayOrder"
                type="number"
                min="0"
                step="1"
                inputMode="numeric"
                defaultValue={p.display_order ?? 999}
                className="sm:max-w-[16rem]"
                help="Lower numbers appear first when sorting by Featured."
              />
            </div>
          </Collapsible>

          <Collapsible className="order-10" title="Search appearance (SEO)" hint={seoHint}>
            <div className="grid gap-4">
              <Field
                label="SEO title"
                name="seoTitle"
                optional
                maxLength={70}
                counter
                defaultValue={p.seo_title || ""}
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
                defaultValue={p.seo_description || ""}
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
            <input type="hidden" name="currency" value={p.currency || "USD"} />

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
                defaultValue={isEdit ? centsToDollars(p.price_cents) : ""}
                placeholder="0.00"
              />

              <details open={isEdit && hasComparePricing} className="group/price">
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
                    defaultValue={moneyValue(p.compare_at_price)}
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
                    defaultValue={centsToDollars(p.cost_cents)}
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
                label={isEdit ? "Stock" : "Initial stock"}
                name="initialStock"
                type="number"
                required
                min="0"
                step="1"
                inputMode="numeric"
                defaultValue={isEdit ? stock : 0}
              />

              <Field
                label="Low-stock alert"
                name="lowStockThreshold"
                type="number"
                required
                min="0"
                step="1"
                inputMode="numeric"
                defaultValue={inventory?.low_stock_threshold ?? 5}
              />
            </div>

            {isEdit ? (
              <dl className="mt-4 grid grid-cols-2 gap-3 rounded-xl bg-[#faf7f2] px-3.5 py-3 text-sm">
                <div>
                  <dt className="text-xs text-black/50">Reserved</dt>
                  <dd className="font-semibold tabular-nums text-black">{reserved}</dd>
                </div>
                <div>
                  <dt className="text-xs text-black/50">Available</dt>
                  <dd className="font-semibold tabular-nums text-black">{available}</dd>
                </div>
                <p className="col-span-2 text-xs leading-5 text-black/50">
                  Reserved stock is held by checkouts in progress and updates automatically.
                </p>
              </dl>
            ) : (
              <p className="mt-3 text-xs leading-5 text-black/50">
                Reserved stock starts at zero.
              </p>
            )}
          </Card>

          <Card title="Visibility" className="order-4">
            <fieldset>
              <legend className="sr-only">Status</legend>
              <div className="flex gap-1 rounded-xl bg-black/[0.05] p-1">
                <StatusOption value="draft" label="Draft" defaultChecked={status === "draft"} />
                <StatusOption value="active" label="Active" defaultChecked={status === "active"} />
                {isEdit ? (
                  <StatusOption value="archived" label="Archived" defaultChecked={status === "archived"} />
                ) : null}
              </div>
            </fieldset>

            <p className="mt-3 text-xs leading-5 text-black/50">
              Draft products are hidden from the storefront.
              {isEdit ? " Archived products are also hidden from the product list." : ""}
            </p>
          </Card>

          {isEdit && links ? (
            <Card title="More" className="order-11">
              <div className="-mx-2 -my-1 grid gap-0.5">
                <SideLink href={links.images} icon={Images}>
                  Images
                </SideLink>
                <SideLink href={links.certifications} icon={FileBadge2}>
                  Certifications
                </SideLink>
                <SideLink href={links.storefront} icon={ExternalLink} external>
                  View on {storefront.name}
                </SideLink>

                <div className="mx-3 my-1 h-px bg-black/[0.07]" />

                <Link
                  href={links.delete}
                  className="flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-semibold text-red-700 transition hover:bg-red-50"
                >
                  <Trash2 size={17} aria-hidden="true" />
                  Delete product
                </Link>
              </div>
            </Card>
          ) : null}
        </div>
      </div>

      <footer
        className={[
          "flex flex-wrap items-center justify-end gap-3 rounded-2xl border border-black/10 bg-white/95 px-5 py-3.5 shadow-sm backdrop-blur sm:justify-between",
          isEdit ? "sticky bottom-3 z-20 shadow-lg" : ""
        ].join(" ")}
      >
        <p className={`text-sm text-black/55 ${isEdit ? "hidden sm:block" : ""}`}>
          {isEdit
            ? "Images, specifications, and certifications are managed on their own pages."
            : "Add images, specifications, and certifications after creating the product."}
        </p>

        {buttons}
      </footer>
    </form>
  );
}
