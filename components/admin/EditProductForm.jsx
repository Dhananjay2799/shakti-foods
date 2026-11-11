"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useFormStatus } from "react-dom";
import {
  AlignLeft,
  Boxes,
  ChevronDown,
  Eye,
  Layers,
  Package,
  PackageOpen,
  Repeat,
  Save,
  Search,
  SlidersHorizontal,
  Tag
} from "lucide-react";
import { ProductFormHelpers } from "@/components/admin/ProductFormClient";
import {
  BUTTON_PRIMARY,
  BUTTON_SECONDARY,
  Badge,
  Check,
  Field,
  INPUT,
  PageHeader,
  Panel,
  ProductActionsCard,
  SelectField,
  StatRow,
  TIER_QUANTITIES,
  TextAreaField,
  buildTierRows,
  centsToDollars,
  formatMoney,
  moneyValue
} from "@/components/admin/product-ui";
import { PRODUCT_EDIT_TABS } from "@/lib/admin-product-tabs";

/*
 * Edit product, in tabs. One form holds every tab (hidden tabs still
 * submit), so field names must match readProductForm, readPriceTiers and
 * readSubscriptionSettings in app/admin/products/product-actions.js.
 */

const FORM_ID = "product-form";

// Not part of the product: never count as an unsaved change.
const NOT_DATA = new Set(["returnTo", "returnTab"]);

const STATUS_HELP = {
  draft: "Draft products are hidden from the storefront.",
  active: "Active products appear on the storefront.",
  archived: "Archived products are hidden from the storefront and the product list."
};

function readForm(form) {
  const values = {};

  for (const [key, value] of new FormData(form).entries()) {
    if (!NOT_DATA.has(key) && typeof value === "string") {
      values[key] = value;
    }
  }

  return values;
}

function fingerprint(values) {
  return JSON.stringify(
    Object.keys(values)
      .sort()
      .map((key) => [key, values[key]])
  );
}

function toNumber(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
}

/** Values shown in badges and "At a glance", from the form's current values. */
function summarize(values, reserved) {
  const price = toNumber(values.price);
  const compareAt = toNumber(values.compareAtPrice);
  const stock = Math.max(Math.trunc(toNumber(values.initialStock)), 0);
  const threshold = Math.max(Math.trunc(toNumber(values.lowStockThreshold)), 0);
  const available = Math.max(stock - reserved, 0);
  const discount = Math.min(Math.max(toNumber(values.subscriptionDiscountPercent), 0), 100);
  const priceCents = Math.round(price * 100);

  let activeTiers = 0;
  for (let index = 0; index < 3; index += 1) {
    if (values[`tierActive_${index}`] === "on" && toNumber(values[`tierPrice_${index}`]) > 0) {
      activeTiers += 1;
    }
  }

  return {
    productId: values.productId || "",
    price,
    compareAt: compareAt > price ? compareAt : 0,
    available,
    stockState:
      available === 0 ? "out" : available <= threshold ? "low" : "in",
    subscriptionOn: values.subscriptionEnabled === "on",
    discount,
    // Same rounding as lib/subscriptions/prepare-subscription.js
    subscriptionPrice: Math.round((priceCents * (100 - discount)) / 100) / 100,
    activeTiers,
    status: values.status || "draft"
  };
}

function SaveButton() {
  const { pending } = useFormStatus();

  return (
    <button type="submit" disabled={pending} className={BUTTON_PRIMARY}>
      <Save size={16} aria-hidden="true" />
      {pending ? "Saving…" : "Save product"}
    </button>
  );
}

function TabPanel({ id, active, children }) {
  return (
    <div
      role="tabpanel"
      id={`panel-${id}`}
      aria-labelledby={`tab-${id}`}
      data-tab={id}
      hidden={!active}
      // The "grid" class would override the hidden attribute, so swap it.
      className={active ? "grid grid-cols-1 gap-5" : "hidden"}
    >
      {children}
    </div>
  );
}

export default function EditProductForm({
  action,
  storefront,
  product,
  inventory,
  categories,
  priceTiers,
  subscriptionSettings,
  frequencies,
  links,
  initialTab = "details",
  justSaved = false
}) {
  const formRef = useRef(null);
  const baselineRef = useRef("");
  const invalidHandledRef = useRef(false);

  const reserved = Math.max(Math.trunc(toNumber(inventory.reserved_quantity)), 0);

  const [tab, setTab] = useState(initialTab);
  const [dirty, setDirty] = useState(false);
  const [values, setValues] = useState(() => ({
    productId: product.product_id || "",
    price: centsToDollars(product.price_cents),
    compareAtPrice: moneyValue(product.compare_at_price),
    initialStock: String(inventory.stock_quantity ?? 0),
    lowStockThreshold: String(inventory.low_stock_threshold ?? 5),
    subscriptionEnabled: subscriptionSettings.is_enabled ? "on" : undefined,
    subscriptionDiscountPercent: String(subscriptionSettings.discount_percent ?? 10),
    status: product.status || "draft",
    ...Object.fromEntries(
      buildTierRows(priceTiers).flatMap(({ tier }, index) =>
        tier
          ? [
              [`tierPrice_${index}`, centsToDollars(tier.unit_price_cents)],
              [`tierActive_${index}`, tier.is_active !== false ? "on" : undefined]
            ]
          : []
      )
    )
  }));

  const sync = useCallback(() => {
    const form = formRef.current;

    if (!form) {
      return;
    }

    const current = readForm(form);
    setValues(current);
    setDirty(fingerprint(current) !== baselineRef.current);
  }, []);

  // What the form holds when the page opens is "saved".
  useEffect(() => {
    if (formRef.current) {
      const initial = readForm(formRef.current);
      baselineRef.current = fingerprint(initial);
      setValues(initial);
    }
  }, []);

  // Keep the open tab in the address, so a reload opens it again.
  useEffect(() => {
    const url = new URL(window.location.href);

    if (tab === "details") {
      url.searchParams.delete("tab");
    } else {
      url.searchParams.set("tab", tab);
    }

    if (url.href !== window.location.href) {
      window.history.replaceState(window.history.state, "", url);
    }

    // On phones the tab row scrolls sideways; keep the open tab in view.
    document
      .getElementById(`tab-${tab}`)
      ?.scrollIntoView({ block: "nearest", inline: "nearest" });
  }, [tab]);

  // Warn before closing the tab or reloading with unsaved changes.
  useEffect(() => {
    if (!dirty) {
      return undefined;
    }

    const warn = (event) => {
      event.preventDefault();
      event.returnValue = "";
    };

    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  function discardChanges() {
    const form = formRef.current;

    if (!form) {
      return;
    }

    form.reset();

    // reset() runs after the "reset" event, so read the form afterwards,
    // and let the character counters catch up.
    window.setTimeout(() => {
      form.querySelectorAll("[data-count]").forEach((counter) => {
        form.elements
          .namedItem(counter.dataset.count)
          ?.dispatchEvent(new Event("input", { bubbles: true }));
      });
      sync();
    }, 0);
  }

  // A required field on a hidden tab: open that tab and point at the field.
  function onInvalidCapture(event) {
    if (invalidHandledRef.current) {
      event.preventDefault();
      return;
    }

    invalidHandledRef.current = true;
    window.setTimeout(() => {
      invalidHandledRef.current = false;
    }, 0);

    const field = event.target;
    const panel = field.closest?.('[role="tabpanel"]');
    const section = field.closest?.("details");

    if (section && !section.open) {
      section.open = true;
    }

    if (panel && panel.dataset.tab !== tab) {
      event.preventDefault();
      setTab(panel.dataset.tab);
      window.setTimeout(() => {
        field.focus();
        field.reportValidity();
      }, 30);
    }
  }

  function onTabKeyDown(event) {
    const index = PRODUCT_EDIT_TABS.findIndex((item) => item.id === tab);
    let next = null;

    if (event.key === "ArrowRight") next = (index + 1) % PRODUCT_EDIT_TABS.length;
    if (event.key === "ArrowLeft") next = (index - 1 + PRODUCT_EDIT_TABS.length) % PRODUCT_EDIT_TABS.length;
    if (event.key === "Home") next = 0;
    if (event.key === "End") next = PRODUCT_EDIT_TABS.length - 1;

    if (next !== null) {
      event.preventDefault();
      const id = PRODUCT_EDIT_TABS[next].id;
      setTab(id);
      document.getElementById(`tab-${id}`)?.focus();
    }
  }

  const summary = summarize(values, reserved);
  const tierRows = buildTierRows(priceTiers);
  const currentCategory = product.category || "";
  const categoryListed = categories.some(
    (category) => category.category_id === currentCategory
  );

  const stockBadge = {
    in: <Badge tone="green">In stock</Badge>,
    low: <Badge tone="amber">Low stock</Badge>,
    out: <Badge tone="red">Out of stock</Badge>
  }[summary.stockState];

  return (
    <form
      ref={formRef}
      id={FORM_ID}
      action={action}
      onInput={sync}
      onChange={sync}
      onInvalidCapture={onInvalidCapture}
      className="grid grid-cols-1 gap-5"
    >
      <input type="hidden" name="storefrontSlug" value={storefront.slug} />
      <input type="hidden" name="originalProductId" value={product.product_id} />
      <input type="hidden" name="currency" value={product.currency || "USD"} />
      {/* After saving, come back to this page and tab. */}
      <input type="hidden" name="returnTo" value="edit" />
      <input type="hidden" name="returnTab" value={tab} readOnly />

      <ProductFormHelpers formId={FORM_ID} />

      <PageHeader
        title="Edit product"
        subtitle={product.title}
        actions={
          <>
            <button
              type="button"
              onClick={discardChanges}
              disabled={!dirty}
              className={BUTTON_SECONDARY}
            >
              Discard changes
            </button>
            <SaveButton />
          </>
        }
      >
        <p
          className="mt-2 flex items-center gap-2 text-sm text-black/55"
          aria-live="polite"
          data-save-state={dirty ? "dirty" : "saved"}
        >
          <span
            aria-hidden="true"
            className={`h-2 w-2 rounded-full ${
              dirty ? "bg-amber-500" : justSaved ? "bg-emerald-500" : "bg-black/30"
            }`}
          />
          {dirty ? "Unsaved changes" : justSaved ? "Product saved" : "All changes saved"}
        </p>
      </PageHeader>

      <div className="rounded-2xl border border-black/10 bg-white shadow-sm">
        <div
          role="tablist"
          aria-label="Product sections"
          className="flex gap-6 overflow-x-auto px-5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        >
          {PRODUCT_EDIT_TABS.map((item) => {
            const selected = item.id === tab;

            return (
              <button
                key={item.id}
                type="button"
                role="tab"
                id={`tab-${item.id}`}
                aria-selected={selected}
                aria-controls={`panel-${item.id}`}
                tabIndex={selected ? 0 : -1}
                onClick={() => setTab(item.id)}
                onKeyDown={onTabKeyDown}
                className={[
                  "-mb-px shrink-0 whitespace-nowrap border-b-2 py-3.5 text-sm font-semibold transition",
                  selected
                    ? "border-black text-black"
                    : "border-transparent text-black/50 hover:text-black"
                ].join(" ")}
              >
                {item.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* ---------- Details ---------- */}
      <TabPanel id="details" active={tab === "details"}>
        <Panel
          icon={Package}
          title="Product details"
          bodyClassName="grid gap-4"
          after={
            <details className="group/desc border-t border-black/[0.07]">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-3 rounded-b-2xl px-5 py-4 transition hover:bg-[#faf7f2] group-open/desc:rounded-none [&::-webkit-details-marker]:hidden">
                <span className="flex items-center gap-2.5 text-sm font-semibold text-black">
                  <AlignLeft size={17} aria-hidden="true" className="text-black/55" />
                  Descriptions
                </span>
                <ChevronDown
                  size={17}
                  aria-hidden="true"
                  className="text-black/45 transition group-open/desc:rotate-180"
                />
              </summary>

              <div className="grid gap-4 px-5 pb-5">
                <TextAreaField
                  label="Short description"
                  name="shortDescription"
                  rows={3}
                  maxLength={300}
                  counter
                  defaultValue={product.short_description || ""}
                  placeholder="A one or two sentence summary for product cards."
                  help="Shown on product cards. Aim for 100–200 characters."
                />
                <TextAreaField
                  label="Full description"
                  name="description"
                  rows={8}
                  defaultValue={product.description || ""}
                  placeholder="Describe the product, quality, uses, and packaging."
                />
              </div>
            </details>
          }
        >
          <Field
            label="Product title"
            name="title"
            required
            defaultValue={product.title || ""}
            autoComplete="off"
          />

          <div className="grid gap-4 sm:grid-cols-2">
            <Field
              label="Product ID"
              name="productId"
              required
              defaultValue={product.product_id || ""}
              autoComplete="off"
              spellCheck={false}
              help="Changing this also updates the inventory ID and admin URLs."
            />
            <Field
              label="SKU"
              name="sku"
              defaultValue={product.sku || ""}
              placeholder="SFRICE10"
              autoComplete="off"
              spellCheck={false}
              inputClassName="uppercase placeholder:normal-case"
            />
          </div>

          <Field
            label="URL slug"
            name="slug"
            required
            prefix="/products/"
            defaultValue={product.slug || ""}
            autoComplete="off"
            spellCheck={false}
            help="Changing the slug changes the storefront product URL."
          />

          <div className="grid gap-4 sm:grid-cols-2">
            <SelectField
              label="Category"
              name="category"
              required
              defaultValue={currentCategory}
            >
              {!currentCategory ? (
                <option value="" disabled>
                  Select a category
                </option>
              ) : null}
              {currentCategory && !categoryListed ? (
                <option value={currentCategory}>{currentCategory} — current</option>
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
            </SelectField>

            <Field
              label="Subcategory"
              name="subcategory"
              defaultValue={product.subcategory || ""}
              placeholder="basmati-rice"
              autoComplete="off"
            />
          </div>
        </Panel>

        <Panel icon={PackageOpen} title="Packaging" bodyClassName="grid gap-4 sm:grid-cols-3">
          <Field label="Pack size" name="packSize" defaultValue={product.pack_size || ""} placeholder="50 pcs" />
          <Field label="Unit label" name="unitLabel" defaultValue={product.unit_label || ""} placeholder="bag" />
          <Field label="Weight label" name="weightLabel" defaultValue={product.weight_label || ""} placeholder="10 lb" />
        </Panel>
      </TabPanel>

      {/* ---------- Pricing ---------- */}
      <TabPanel id="pricing" active={tab === "pricing"}>
        <Panel icon={Tag} title="Pricing" badge={<Badge>USD</Badge>} bodyClassName="grid gap-4 sm:grid-cols-2">
          <Field
            label="Selling price"
            name="price"
            type="number"
            required
            min="0"
            step="0.01"
            inputMode="decimal"
            prefix="$"
            defaultValue={centsToDollars(product.price_cents)}
            placeholder="0.00"
          />
          <Field
            label="Compare-at price"
            name="compareAtPrice"
            type="number"
            min="0"
            step="0.01"
            inputMode="decimal"
            prefix="$"
            defaultValue={moneyValue(product.compare_at_price)}
            placeholder="0.00"
            help="At least the selling price."
          />
          <Field
            label="Product cost"
            name="cost"
            type="number"
            min="0"
            step="0.01"
            inputMode="decimal"
            prefix="$"
            defaultValue={centsToDollars(product.cost_cents)}
            placeholder="0.00"
            help="Your cost. Customers never see this."
          />
        </Panel>

        <Panel
          icon={Layers}
          title="Bulk pricing"
          badge={<Badge tone={summary.activeTiers ? "green" : "neutral"}>{summary.activeTiers} active</Badge>}
          bodyClassName="grid gap-3"
        >
          <div className="hidden grid-cols-[minmax(0,1fr)_minmax(0,1fr)_8rem] gap-3 text-xs font-semibold text-black/50 sm:grid">
            <span>Minimum quantity</span>
            <span>Price per unit</span>
            <span>Status</span>
          </div>

          {tierRows.map(({ quantity, tier }, index) => {
            const options = TIER_QUANTITIES.includes(quantity)
              ? TIER_QUANTITIES
              : [...TIER_QUANTITIES, quantity].sort((a, b) => a - b);

            return (
              <div
                key={`${quantity}-${index}`}
                className="grid grid-cols-2 gap-3 border-t border-black/[0.07] pt-3 first-of-type:border-t-0 first-of-type:pt-0 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_8rem] sm:border-t-0 sm:pt-0"
              >
                <label className="grid min-w-0 content-start gap-1.5">
                  <span className="text-xs font-semibold text-black/50 sm:sr-only">
                    Minimum quantity
                  </span>
                  <span className="relative">
                    <select
                      name={`tierQuantity_${index}`}
                      defaultValue={String(quantity)}
                      className={`${INPUT} appearance-none pr-10 font-medium`}
                    >
                      {options.map((option) => (
                        <option key={option} value={String(option)}>
                          {option} units
                        </option>
                      ))}
                    </select>
                    <ChevronDown
                      size={16}
                      aria-hidden="true"
                      className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-black/45"
                    />
                  </span>
                </label>

                <Field
                  id={`field-tierPrice_${index}`}
                  label={<span className="text-xs font-semibold text-black/50 sm:sr-only">Price per unit</span>}
                  name={`tierPrice_${index}`}
                  type="number"
                  min="0"
                  step="0.01"
                  inputMode="decimal"
                  prefix="$"
                  defaultValue={tier ? centsToDollars(tier.unit_price_cents) : ""}
                  placeholder="0.00"
                />

                <label className="col-span-2 flex h-11 cursor-pointer items-center gap-2.5 self-end rounded-xl border border-black/10 px-3.5 text-sm font-semibold text-black transition hover:bg-[#faf7f2] has-[:checked]:bg-[#faf7f2] sm:col-span-1">
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

          <p className="text-xs leading-5 text-black/50">
            Orders of at least the minimum quantity get that unit price. Leave a
            price empty to remove the tier.
          </p>
        </Panel>
      </TabPanel>

      {/* ---------- Subscribe & Save ---------- */}
      <TabPanel id="subscribe" active={tab === "subscribe"}>
        <Panel
          icon={Repeat}
          title="Subscribe & Save"
          badge={
            summary.subscriptionOn ? (
              <Badge tone="green">Enabled</Badge>
            ) : (
              <Badge>Disabled</Badge>
            )
          }
          bodyClassName="grid gap-4"
          footer={
            <>
              <span className="text-black/60">Subscription price per unit</span>
              <span className="font-bold tabular-nums text-black">
                {formatMoney(summary.subscriptionPrice)}
              </span>
            </>
          }
        >
          <Check
            name="subscriptionEnabled"
            title="Enable Subscribe & Save"
            defaultChecked={Boolean(subscriptionSettings.is_enabled)}
          />

          <div className="grid gap-4 sm:grid-cols-2">
            <Field
              label="Subscription discount (%)"
              name="subscriptionDiscountPercent"
              type="number"
              min="0"
              max="100"
              step="1"
              inputMode="numeric"
              defaultValue={subscriptionSettings.discount_percent ?? 10}
            />
            <Field
              label="Minimum subscription quantity"
              name="subscriptionMinimumQuantity"
              type="number"
              min="1"
              step="1"
              inputMode="numeric"
              defaultValue={subscriptionSettings.minimum_quantity ?? 1}
            />
          </div>

          <fieldset className="grid gap-2">
            <legend className="mb-2 text-sm font-semibold text-black">
              Delivery frequencies
            </legend>
            <div className="grid gap-2 sm:grid-cols-3">
              <Check name="subscriptionFrequency2Weeks" title="Every 2 weeks" defaultChecked={frequencies[2]} />
              <Check name="subscriptionFrequency4Weeks" title="Every 4 weeks" defaultChecked={frequencies[4]} />
              <Check name="subscriptionFrequency8Weeks" title="Every 8 weeks" defaultChecked={frequencies[8]} />
            </div>
          </fieldset>
        </Panel>
      </TabPanel>

      {/* ---------- Inventory ---------- */}
      <TabPanel id="inventory" active={tab === "inventory"}>
        <Panel
          icon={Boxes}
          title="Inventory"
          badge={stockBadge}
          bodyClassName="grid gap-4 sm:grid-cols-3"
          footer={
            <>
              <span className="text-black/60">Available inventory</span>
              <span className="font-bold tabular-nums text-black">
                {summary.available.toLocaleString("en-US")}
              </span>
            </>
          }
        >
          <Field
            label="Stock quantity"
            name="initialStock"
            type="number"
            required
            min="0"
            step="1"
            inputMode="numeric"
            defaultValue={inventory.stock_quantity ?? 0}
          />
          <Field
            id="field-reservedQuantity"
            label="Reserved quantity"
            type="number"
            value={reserved}
            readOnly
            tabIndex={-1}
            help="Managed by checkout reservations."
          />
          <Field
            label="Low-stock threshold"
            name="lowStockThreshold"
            type="number"
            required
            min="0"
            step="1"
            inputMode="numeric"
            defaultValue={inventory.low_stock_threshold ?? 5}
          />
        </Panel>
      </TabPanel>

      {/* ---------- Storefront ---------- */}
      <TabPanel id="storefront" active={tab === "storefront"}>
        <Panel icon={SlidersHorizontal} title="Merchandising & behavior" bodyClassName="grid gap-3 sm:grid-cols-2">
          <Check name="featured" title="Featured product" defaultChecked={Boolean(product.featured)} />
          <Check name="bestSeller" title="Best Seller" defaultChecked={Boolean(product.best_seller)} />
          <Check name="newArrival" title="New Arrival" defaultChecked={Boolean(product.new_arrival)} />
          <Field
            label="Display order"
            name="displayOrder"
            type="number"
            min="0"
            step="1"
            inputMode="numeric"
            defaultValue={product.display_order ?? 999}
            help="Lower numbers appear first."
          />
          <Check name="taxable" title="Taxable product" defaultChecked={Boolean(product.taxable)} />
          <Check name="requiresShipping" title="Requires shipping" defaultChecked={Boolean(product.requires_shipping)} />
        </Panel>

        <Panel icon={Search} title="Search appearance (SEO)" bodyClassName="grid gap-4">
          <Field
            label="SEO title"
            name="seoTitle"
            maxLength={70}
            counter
            defaultValue={product.seo_title || ""}
            placeholder={`${product.title || "Product"} | ${storefront.name}`}
            help="Aim for around 60 characters."
          />
          <TextAreaField
            label="SEO description"
            name="seoDescription"
            rows={3}
            maxLength={180}
            counter
            defaultValue={product.seo_description || ""}
            placeholder="A short summary that appears under the title in search results."
            help="Aim for around 155–160 characters."
          />
        </Panel>
      </TabPanel>

      {/* ---------- Always shown ---------- */}
      <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
        <Panel icon={Eye} title="Visibility">
          <SelectField label="Status" name="status" defaultValue={product.status || "draft"}>
            <option value="draft">Draft</option>
            <option value="active">Active</option>
            <option value="archived">Archived</option>
          </SelectField>
          <p className="mt-2 text-xs leading-5 text-black/50">
            {STATUS_HELP[summary.status] || STATUS_HELP.draft}
          </p>
        </Panel>

        <section className="min-w-0 rounded-2xl border border-black/10 bg-white shadow-sm">
          <div className="flex items-center justify-between gap-3 px-5 pt-5">
            <h2 className="text-base font-bold text-black">At a glance</h2>
            {summary.productId ? <Badge className="max-w-[60%] truncate">{summary.productId}</Badge> : null}
          </div>

          <div className="px-5 pb-2 pt-3">
            <div className="flex items-start justify-between gap-3 pb-3">
              <span className="pt-1 text-sm text-black/55">Selling price</span>
              <span className="text-right">
                <span className="block text-2xl font-bold tabular-nums text-black">
                  {formatMoney(summary.price)}
                </span>
                {summary.compareAt ? (
                  <span className="block text-sm tabular-nums text-black/45 line-through">
                    {formatMoney(summary.compareAt)}
                  </span>
                ) : null}
              </span>
            </div>

            <div className="divide-y divide-black/[0.07] border-t border-black/[0.07]">
              <StatRow label="Available stock">
                <span className="tabular-nums">{summary.available.toLocaleString("en-US")}</span>
              </StatRow>
              <StatRow label="Subscribe & Save">
                {summary.subscriptionOn ? `${summary.discount}% off` : "Off"}
              </StatRow>
            </div>
          </div>
        </section>

        <ProductActionsCard
          links={links}
          storefrontName={storefront.name}
          current="edit"
          className="md:col-start-1"
        />
      </div>
    </form>
  );
}
