"use client";

import { useState } from "react";
import {
  site,
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

const FIELD_CLASS =
  "h-12 w-full min-w-0 rounded-2xl border border-black/10 bg-[#faf8f4] px-4 outline-none focus:border-black";

/*
 * products: [{ id, name }] for the store, shown in the Product dropdown.
 * productId / productName: preselect a product (e.g. from a product page).
 */
export default function WholesaleInquiryForm({
  productId = "",
  productName = "",
  products = [],
  storefront = "shakti_foods"
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

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-[2rem] bg-white p-5 text-black shadow-soft ring-1 ring-black/5 md:p-6"
    >
      <div className="text-xs font-bold uppercase tracking-[.18em] text-black/45">
        B2B / Wholesale
      </div>

      <div className="mt-2 font-display text-3xl font-bold text-black">
        Wholesale Inquiry
      </div>

      <p className="mt-2 text-sm leading-6 text-black/65">
        Request pricing for bulk orders,
        restaurant supply, catering,
        institutional purchasing, or
        distribution.
      </p>

      {productName && productOptions.length === 0 ? (
        <div className="mt-5 rounded-2xl bg-[#f8f6f1] p-4">
          <div className="text-xs font-bold uppercase tracking-[.14em] text-black/40">
            Product
          </div>

          <div className="mt-2 font-bold text-black">
            {productName}
          </div>
        </div>
      ) : null}

      <div className="mt-6 grid gap-4">
        <div className="grid gap-4 md:grid-cols-2">
          <label className="grid gap-2">
            <span className="text-sm font-bold">
              Your Name *
            </span>

            <input
              name="customerName"
              value={form.customerName}
              onChange={handleChange}
              required
              autoComplete="name"
              className="h-12 rounded-2xl border border-black/10 bg-[#faf8f4] px-4 outline-none focus:border-black"
              placeholder="Full name"
            />
          </label>

          <label className="grid gap-2">
            <span className="text-sm font-bold">
              Business Name
            </span>

            <input
              name="businessName"
              value={form.businessName}
              onChange={handleChange}
              autoComplete="organization"
              className="h-12 rounded-2xl border border-black/10 bg-[#faf8f4] px-4 outline-none focus:border-black"
              placeholder="Company / restaurant / store"
            />
          </label>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <label className="grid gap-2">
            <span className="text-sm font-bold">
              Business Type
            </span>

            <select
              name="businessType"
              value={form.businessType}
              onChange={handleChange}
              className="h-12 rounded-2xl border border-black/10 bg-[#faf8f4] px-4 outline-none focus:border-black"
            >
              <option value="">
                Select business type
              </option>
              <option value="restaurant">
                Restaurant
              </option>
              <option value="caterer">
                Caterer
              </option>
              <option value="event">
                Event / Wedding
              </option>
              <option value="school">
                School / Institution
              </option>
              <option value="food-truck">
                Food Truck
              </option>
              <option value="distributor">
                Distributor / Wholesaler
              </option>
              <option value="retailer">
                Retailer
              </option>
              <option value="other">
                Other
              </option>
            </select>
          </label>

          <label className="grid gap-2">
            <span className="text-sm font-bold">
              Purchase Frequency
            </span>

            <select
              name="purchaseFrequency"
              value={form.purchaseFrequency}
              onChange={handleChange}
              className="h-12 rounded-2xl border border-black/10 bg-[#faf8f4] px-4 outline-none focus:border-black"
            >
              <option value="">
                Select frequency
              </option>
              <option value="one-time">
                One-time order
              </option>
              <option value="weekly">
                Weekly
              </option>
              <option value="biweekly">
                Every 2 weeks
              </option>
              <option value="monthly">
                Monthly
              </option>
              <option value="quarterly">
                Quarterly
              </option>
              <option value="ongoing">
                Ongoing / Variable
              </option>
            </select>
          </label>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <label className="grid gap-2">
            <span className="text-sm font-bold">
              Email *
            </span>

            <input
              type="email"
              name="email"
              value={form.email}
              onChange={handleChange}
              required
              autoComplete="email"
              className="h-12 rounded-2xl border border-black/10 bg-[#faf8f4] px-4 outline-none focus:border-black"
              placeholder="you@business.com"
            />
          </label>

          <label className="grid gap-2">
            <span className="text-sm font-bold">
              Phone
            </span>

            <input
              type="tel"
              name="phone"
              value={form.phone}
              onChange={handleChange}
              autoComplete="tel"
              className="h-12 rounded-2xl border border-black/10 bg-[#faf8f4] px-4 outline-none focus:border-black"
              placeholder="Phone number"
            />
          </label>
        </div>

        {/* Product, quantity and unit on one line (product on its own
            line on phones). */}
        <div className="grid grid-cols-2 gap-4 md:grid-cols-[minmax(0,1.7fr)_minmax(0,1fr)_minmax(0,1fr)]">
          {productOptions.length ? (
            <label className="col-span-2 grid min-w-0 gap-2 md:col-span-1">
              <span className="text-sm font-bold">
                Product
              </span>

              <select
                name="productId"
                value={form.productId}
                onChange={handleChange}
                className={FIELD_CLASS}
              >
                <option value="">
                  Any / multiple products
                </option>

                {productOptions.map((option) => (
                  <option key={option.id} value={option.id}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
          ) : null}

          <label
            className={[
              "grid min-w-0 gap-2",
              productOptions.length ? "" : "md:col-span-2"
            ].join(" ")}
          >
            <span className="text-sm font-bold">
              Quantity
            </span>

            <input
              type="number"
              min="1"
              step="1"
              inputMode="numeric"
              name="estimatedQuantity"
              value={
                form.estimatedQuantity
              }
              onChange={handleChange}
              className={FIELD_CLASS}
              placeholder="e.g. 50"
            />
          </label>

          <label className="grid min-w-0 gap-2">
            <span className="text-sm font-bold">
              Unit
            </span>

            <select
              name="quantityUnit"
              value={form.quantityUnit}
              onChange={handleChange}
              className={FIELD_CLASS}
            >
              {units.map((unit) => (
                <option key={unit} value={unit}>
                  {QUANTITY_UNIT_LABELS[unit] || unit}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="border-t border-black/10 pt-5">
          <div className="text-sm font-bold uppercase tracking-[.14em]">
            Delivery Location
          </div>

          <div className="mt-4 grid gap-4 md:grid-cols-3">
            <input
              name="deliveryCity"
              value={form.deliveryCity}
              onChange={handleChange}
              className="h-12 rounded-2xl border border-black/10 bg-[#faf8f4] px-4 outline-none focus:border-black"
              placeholder="City"
            />

            <input
              name="deliveryState"
              value={form.deliveryState}
              onChange={handleChange}
              className="h-12 rounded-2xl border border-black/10 bg-[#faf8f4] px-4 outline-none focus:border-black"
              placeholder="State"
            />

            <input
              name="deliveryPostalCode"
              value={
                form.deliveryPostalCode
              }
              onChange={handleChange}
              className="h-12 rounded-2xl border border-black/10 bg-[#faf8f4] px-4 outline-none focus:border-black"
              placeholder="ZIP code"
            />
          </div>
        </div>

        <label className="grid gap-2">
          <span className="text-sm font-bold">
            Message
          </span>

          <textarea
            name="message"
            value={form.message}
            onChange={handleChange}
            rows={5}
            className="rounded-2xl border border-black/10 bg-[#faf8f4] px-4 py-4 outline-none focus:border-black"
            placeholder="Tell us about your requirements, expected volume, delivery schedule, or other details."
          />
        </label>
      </div>

      {status ? (
        <div
          className={[
            "mt-5 rounded-2xl px-4 py-4 text-sm",
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
        className="mt-5 w-full rounded-full bg-black px-6 py-4 font-bold text-white transition hover:bg-[#333333] disabled:cursor-not-allowed disabled:opacity-60"
      >
        {loading
          ? "Submitting..."
          : "Submit Wholesale Inquiry"}
      </button>

      <p className="mt-4 text-xs leading-5 text-black/45">
        Prefer to speak with us? Call{" "}
        <a
          className="font-bold underline"
          href={`tel:${site.phoneRaw}`}
        >
          {site.phone}
        </a>
        .
      </p>
    </form>
  );
}