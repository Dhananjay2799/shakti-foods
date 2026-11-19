"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { trackEvent } from "@/lib/analytics";
import {
  whatsappLink,
  mailtoLink
} from "@/lib/site";
import {
  QUANTITY_UNIT_LABELS,
  getWholesaleUnits
} from "@/lib/wholesale-units";

const initialForm = {
  customerName: "",
  email: "",
  phone: "",
  businessName: "",
  businessType: "",
  productId: "",
  estimatedQuantity: "",
  quantityUnit: "",
  purchaseFrequency: "",
  deliveryCity: "",
  deliveryState: "",
  deliveryPostalCode: "",
  message: ""
};

const BUSINESS_TYPES = [
  ["restaurant", "Restaurant"],
  ["caterer", "Caterer"],
  ["event", "Event / Wedding"],
  ["school", "School / Institution"],
  ["food-truck", "Food Truck"],
  ["distributor", "Distributor / Wholesaler"],
  ["retailer", "Retailer"],
  ["other", "Other"]
];

const PURCHASE_FREQUENCIES = [
  ["one-time", "One-time order"],
  ["weekly", "Weekly"],
  ["biweekly", "Every 2 weeks"],
  ["monthly", "Monthly"],
  ["quarterly", "Quarterly"],
  ["ongoing", "Ongoing / Variable"]
];

// Same look as the checkout page fields.
const FIELD_CLASS =
  "h-10 w-full min-w-0 rounded-lg border border-black/15 bg-white px-3.5 text-sm text-black outline-none transition placeholder:text-black/40 focus:border-black sm:h-11 sm:text-base";

const LABEL_CLASS =
  "mb-1 block text-sm font-bold text-black";

function Field({ label, required = false, className = "", children }) {
  return (
    <label className={`block min-w-0 ${className}`}>
      <span className={LABEL_CLASS}>
        {label}
        {required ? <span aria-hidden="true"> *</span> : null}
      </span>
      {children}
    </label>
  );
}

function Select({ children, ...props }) {
  return (
    <span className="relative block">
      <select
        {...props}
        className={`${FIELD_CLASS} cursor-pointer appearance-none pr-10`}
      >
        {children}
      </select>
      <ChevronDown
        size={18}
        aria-hidden="true"
        className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-black"
      />
    </span>
  );
}

/*
 * products: [{ id, name }] for the store, shown in the Product dropdown.
 * productId / productName: preselect a product (e.g. from a product page).
 */
export default function WholesaleInquiryForm({
  productId = "",
  productName = "",
  products = [],
  storefront = "shakti_foods",
  // "card": always a bordered card (product pages).
  // "page": no card on phones, a card from desktop width (contact page).
  frame = "card"
}) {
  const units = getWholesaleUnits(storefront);

  const brandPrefix =
    storefront === "ecoware"
      ? /^simpli\s+eco\s*ware\s+/i
      : /^shakti\s+foods\s+/i;

  const productOptions = products
    .filter((product) => product?.id)
    .map((product) => ({
      id: String(product.id),
      // "Shakti Foods Premium Basmati Rice – 10 lb" -> "Premium Basmati Rice – 10 lb"
      label: String(product.name || product.id).replace(brandPrefix, "")
    }));

  const startingForm = {
    ...initialForm,
    productId:
      productId &&
      (productOptions.length === 0 ||
        productOptions.some((option) => option.id === productId))
        ? productId
        : "",
    quantityUnit: units[0]
  };

  const [form, setForm] =
    useState(startingForm);

  const selectedProductName =
    productOptions.find((option) => option.id === form.productId)?.label ||
    (form.productId === productId ? productName : "") ||
    "Any / multiple products";

  const [status, setStatus] =
    useState(null);

  const [loading, setLoading] =
    useState(false);

  function handleChange(event) {
    const {
      name,
      value
    } = event.target;

    setForm((current) => ({
      ...current,
      [name]: value
    }));
  }

  async function handleSubmit(event) {
    event.preventDefault();

    if (loading) {
      return;
    }

    setLoading(true);
    setStatus(null);

    try {
      const response =
        await fetch(
          "/api/wholesale",
          {
            method: "POST",

            headers: {
              "Content-Type":
                "application/json"
            },

            body:
              JSON.stringify({
                productId:
                  form.productId,
                storefront,

                customerName:
                  form.customerName,

                email:
                  form.email,

                phone:
                  form.phone,

                businessName:
                  form.businessName,

                businessType:
                  form.businessType,

                estimatedQuantity:
                  form.estimatedQuantity,

                quantityUnit:
                  form.quantityUnit,

                purchaseFrequency:
                  form.purchaseFrequency,

                deliveryCity:
                  form.deliveryCity,

                deliveryState:
                  form.deliveryState,

                deliveryPostalCode:
                  form.deliveryPostalCode,

                message:
                  form.message
              })
          }
        );

      const data =
        await response.json();

      if (
        !response.ok ||
        !data.success
      ) {
        throw new Error(
          data.message ||
            "Unable to submit inquiry."
        );
      }

      // Google Analytics: a wholesale lead (mark it as a key event in GA).
      trackEvent("generate_lead", {
        lead_source: "wholesale_inquiry",
        storefront,
        ...(form.productId || productId
          ? { product_id: form.productId || productId }
          : {})
      });


      setStatus({
        type: "success",

        message:
          "Your wholesale inquiry has been received. Our team will review it and contact you soon.",

        inquiryId:
          data.inquiryId,

        mailto:
          data.mailto,

        whatsapp:
          data.whatsapp
      });

      setForm(startingForm);
    } catch (error) {
      console.error(
        "Wholesale inquiry failed:",
        error
      );

      const body = [
        `Name: ${form.customerName}`,
        `Email: ${form.email}`,
        `Phone: ${form.phone}`,
        `Business: ${form.businessName}`,
        `Business Type: ${form.businessType}`,
        `Product: ${selectedProductName}`,
        `Quantity: ${form.estimatedQuantity} ${QUANTITY_UNIT_LABELS[form.quantityUnit] || form.quantityUnit}`,
        `Purchase Frequency: ${form.purchaseFrequency}`,
        `Delivery City: ${form.deliveryCity}`,
        `Delivery State: ${form.deliveryState}`,
        `Delivery ZIP: ${form.deliveryPostalCode}`,
        `Message: ${form.message}`
      ].join("\n");

      setStatus({
        type: "error",

        message:
          error instanceof Error
            ? error.message
            : "Unable to submit inquiry.",

        mailto:
          mailtoLink(
            "Wholesale Inquiry",
            body
          ),

        whatsapp:
          whatsappLink(
            `Wholesale inquiry\n${body}`
          )
      });
    } finally {
      setLoading(false);
    }
  }

  const frameClass =
    frame === "page"
      ? "lg:rounded-[1.5rem] lg:border lg:border-black/10 lg:bg-white lg:p-6"
      : "rounded-[1.5rem] border border-black/10 bg-white p-4 sm:p-6";

  return (
    <form
      id="wholesale-inquiry"
      onSubmit={handleSubmit}
      className={`min-w-0 scroll-mt-28 text-black ${frameClass}`}
    >
      <h2 className="font-display text-2xl font-bold text-black md:text-3xl">
        Wholesale Inquiry
      </h2>

      {productName && productOptions.length === 0 ? (
        <p className="mt-2 text-sm text-black/70">
          Product: <span className="font-bold text-black">{productName}</span>
        </p>
      ) : null}

      <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-x-5 sm:gap-y-4">
        <Field label="Your name" required>
          <input
            name="customerName"
            value={form.customerName}
            onChange={handleChange}
            required
            autoComplete="name"
            className={FIELD_CLASS}
            placeholder="Full name"
          />
        </Field>

        <Field label="Business name">
          <input
            name="businessName"
            value={form.businessName}
            onChange={handleChange}
            autoComplete="organization"
            className={FIELD_CLASS}
            placeholder="Company / restaurant / store"
          />
        </Field>

        <Field label="Email" required>
          <input
            type="email"
            name="email"
            value={form.email}
            onChange={handleChange}
            required
            autoComplete="email"
            className={FIELD_CLASS}
            placeholder="you@business.com"
          />
        </Field>

        <Field label="Phone">
          <input
            type="tel"
            name="phone"
            value={form.phone}
            onChange={handleChange}
            autoComplete="tel"
            className={FIELD_CLASS}
            placeholder="Phone number"
          />
        </Field>

        <Field label="Business type">
          <Select
            name="businessType"
            value={form.businessType}
            onChange={handleChange}
          >
            <option value="">Select business type</option>
            {BUSINESS_TYPES.map(([value, label]) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </Select>
        </Field>

        <Field label="Purchase frequency">
          <Select
            name="purchaseFrequency"
            value={form.purchaseFrequency}
            onChange={handleChange}
          >
            <option value="">Select frequency</option>
            {PURCHASE_FREQUENCIES.map(([value, label]) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </Select>
        </Field>

        {/* Product, quantity and unit on one line (product on its own
            line on phones). */}
        <div className="grid grid-cols-2 gap-3 sm:col-span-2 sm:grid-cols-[minmax(0,1.7fr)_minmax(0,1fr)_minmax(0,1fr)] sm:gap-x-5">
          {productOptions.length ? (
            <Field label="Product" className="col-span-2 sm:col-span-1">
              <Select
                name="productId"
                value={form.productId}
                onChange={handleChange}
              >
                <option value="">Any / multiple products</option>
                {productOptions.map((option) => (
                  <option key={option.id} value={option.id}>
                    {option.label}
                  </option>
                ))}
              </Select>
            </Field>
          ) : null}

          <Field
            label="Quantity"
            className={productOptions.length ? "" : "sm:col-span-2"}
          >
            <input
              type="number"
              min="1"
              step="1"
              inputMode="numeric"
              name="estimatedQuantity"
              value={form.estimatedQuantity}
              onChange={handleChange}
              className={FIELD_CLASS}
              placeholder="e.g. 50"
            />
          </Field>

          <Field label="Unit">
            <Select
              name="quantityUnit"
              value={form.quantityUnit}
              onChange={handleChange}
            >
              {units.map((unit) => (
                <option key={unit} value={unit}>
                  {QUANTITY_UNIT_LABELS[unit] || unit}
                </option>
              ))}
            </Select>
          </Field>
        </div>

        <fieldset className="min-w-0 sm:col-span-2">
          <legend className={LABEL_CLASS}>Delivery location</legend>

          {/* City on its own line on phones; State and ZIP share one. */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-x-5">
            <input
              name="deliveryCity"
              value={form.deliveryCity}
              onChange={handleChange}
              autoComplete="address-level2"
              aria-label="City"
              className={`${FIELD_CLASS} col-span-2 sm:col-span-1`}
              placeholder="City"
            />

            <input
              name="deliveryState"
              value={form.deliveryState}
              onChange={handleChange}
              autoComplete="address-level1"
              aria-label="State"
              className={FIELD_CLASS}
              placeholder="State"
            />

            <input
              name="deliveryPostalCode"
              value={form.deliveryPostalCode}
              onChange={handleChange}
              autoComplete="postal-code"
              inputMode="numeric"
              aria-label="ZIP code"
              className={FIELD_CLASS}
              placeholder="ZIP code"
            />
          </div>
        </fieldset>

        <Field label="Message" className="sm:col-span-2">
          <textarea
            name="message"
            value={form.message}
            onChange={handleChange}
            rows={4}
            className="block w-full min-w-0 rounded-lg border border-black/15 bg-white px-3.5 py-2.5 text-sm text-black outline-none transition placeholder:text-black/40 focus:border-black sm:text-base"
            placeholder="Tell us about your requirements, expected volume, delivery schedule, or other details."
          />
        </Field>
      </div>

      {status ? (
        <div
          role={status.type === "success" ? "status" : "alert"}
          className={[
            "mt-4 rounded-xl px-4 py-3 text-sm",
            status.type === "success"
              ? "bg-green-50 text-green-900"
              : "bg-red-50 text-red-800"
          ].join(" ")}
        >
          <div className="font-medium">
            {status.message}
          </div>

          {status.inquiryId ? (
            <div className="mt-2 text-xs opacity-70">
              Inquiry ID:{" "}
              <span className="font-mono">
                {status.inquiryId}
              </span>
            </div>
          ) : null}

          {(status.mailto ||
            status.whatsapp) ? (
            <div className="mt-3 flex flex-wrap gap-2">
              {status.mailto ? (
                <a
                  className="rounded-full bg-black px-4 py-2 font-bold text-white"
                  href={status.mailto}
                >
                  Send Email
                </a>
              ) : null}

              {status.whatsapp ? (
                <a
                  className="rounded-full bg-[#25D366] px-4 py-2 font-bold text-white"
                  href={status.whatsapp}
                  target="_blank"
                  rel="noreferrer"
                >
                  Send WhatsApp
                </a>
              ) : null}
            </div>
          ) : null}
        </div>
      ) : null}

      <button
        type="submit"
        disabled={loading}
        className="mt-5 w-full rounded-lg bg-[#d71920] px-6 py-3 text-base font-bold text-white transition hover:bg-[#b8141a] disabled:cursor-not-allowed disabled:opacity-60 sm:text-lg"
      >
        {loading
          ? "Submitting..."
          : "Submit Wholesale Inquiry"}
      </button>
    </form>
  );
}