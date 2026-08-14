"use client";

import { useState } from "react";

export default function SampleRequestForm({
  productId,
  productName
}) {
  const [form, setForm] = useState({
    customerName: "",
    businessName: "",
    businessType: "",
    email: "",
    phone: "",
    estimatedMonthlyQuantity: "",
    addressLine1: "",
    addressLine2: "",
    city: "",
    state: "",
    postalCode: "",
    country: "US",
    notes: ""
  });

  const [loading, setLoading] =
    useState(false);

  const [error, setError] =
    useState("");

  const [success, setSuccess] =
    useState(null);

  function updateField(event) {
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
    setError("");
    setSuccess(null);

    try {
      const response =
        await fetch(
          "/api/sample-requests",
          {
            method: "POST",

            headers: {
              "Content-Type":
                "application/json"
            },

            body:
              JSON.stringify({
                productId,

                customerName:
                  form.customerName,

                businessName:
                  form.businessName,

                businessType:
                  form.businessType,

                email:
                  form.email,

                phone:
                  form.phone,

                estimatedMonthlyQuantity:
                  form.estimatedMonthlyQuantity,

                addressLine1:
                  form.addressLine1,

                addressLine2:
                  form.addressLine2,

                city:
                  form.city,

                state:
                  form.state,

                postalCode:
                  form.postalCode,

                country:
                  form.country,

                notes:
                  form.notes
              })
          }
        );

      const result =
        await response.json();

      if (
        !response.ok ||
        !result.success
      ) {
        throw new Error(
          result.message ||
            "Unable to submit sample request."
        );
      }

      setSuccess({
        requestId:
          result.requestId
      });

      setForm({
        customerName: "",
        businessName: "",
        businessType: "",
        email: "",
        phone: "",
        estimatedMonthlyQuantity: "",
        addressLine1: "",
        addressLine2: "",
        city: "",
        state: "",
        postalCode: "",
        country: "US",
        notes: ""
      });
    } catch (err) {
      console.error(
        "Sample request failed:",
        err
      );

      setError(
        err instanceof Error
          ? err.message
          : "Unable to submit sample request."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <section
      id="sample-request"
      className="rounded-[2rem] bg-white p-5 shadow-soft md:p-6"
    >
      <div className="text-xs font-bold uppercase tracking-[.18em] text-black/50">
        B2B Sample Program
      </div>

      <h2 className="mt-2 font-display text-3xl font-bold text-black">
        Request a Free Sample
      </h2>

      <p className="mt-3 leading-7 text-black/70">
        Interested in testing{" "}
        <strong className="text-black">
          {productName}
        </strong>{" "}
        for your restaurant, catering business,
        school, event company, food truck, or
        organization? Submit a request and our
        team will review it.
      </p>

      {success ? (
        <div className="mt-6 rounded-[1.5rem] border border-green-200 bg-green-50 p-5">
          <div className="font-bold text-green-900">
            Sample request submitted
          </div>

          <p className="mt-2 text-sm leading-6 text-green-900/80">
            Thank you. Your request has been
            received and is now pending review.
          </p>

          <div className="mt-3 text-xs text-green-900/70">
            Request ID:{" "}
            <span className="font-mono">
              {success.requestId}
            </span>
          </div>
        </div>
      ) : (
        <form
          onSubmit={handleSubmit}
          className="mt-6 grid gap-4"
        >
          <div className="grid gap-4 md:grid-cols-2">
            <label className="grid gap-2">
              <span className="text-sm font-bold text-black">
                Your Name *
              </span>

              <input
                name="customerName"
                value={form.customerName}
                onChange={updateField}
                required
                autoComplete="name"
                className="h-12 rounded-2xl border border-black/10 bg-[#faf8f4] px-4 text-black outline-none transition focus:border-black"
                placeholder="Full name"
              />
            </label>

            <label className="grid gap-2">
              <span className="text-sm font-bold text-black">
                Business Name
              </span>

              <input
                name="businessName"
                value={form.businessName}
                onChange={updateField}
                autoComplete="organization"
                className="h-12 rounded-2xl border border-black/10 bg-[#faf8f4] px-4 text-black outline-none transition focus:border-black"
                placeholder="Business or organization"
              />
            </label>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <label className="grid gap-2">
              <span className="text-sm font-bold text-black">
                Business Type
              </span>

              <select
                name="businessType"
                value={form.businessType}
                onChange={updateField}
                className="h-12 rounded-2xl border border-black/10 bg-[#faf8f4] px-4 text-black outline-none transition focus:border-black"
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
              <span className="text-sm font-bold text-black">
                Estimated Monthly Quantity
              </span>

              <input
                type="number"
                min="1"
                step="1"
                name="estimatedMonthlyQuantity"
                value={
                  form.estimatedMonthlyQuantity
                }
                onChange={updateField}
                className="h-12 rounded-2xl border border-black/10 bg-[#faf8f4] px-4 text-black outline-none transition focus:border-black"
                placeholder="e.g. 500"
              />
            </label>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <label className="grid gap-2">
              <span className="text-sm font-bold text-black">
                Email *
              </span>

              <input
                type="email"
                name="email"
                value={form.email}
                onChange={updateField}
                required
                autoComplete="email"
                className="h-12 rounded-2xl border border-black/10 bg-[#faf8f4] px-4 text-black outline-none transition focus:border-black"
                placeholder="you@business.com"
              />
            </label>

            <label className="grid gap-2">
              <span className="text-sm font-bold text-black">
                Phone
              </span>

              <input
                type="tel"
                name="phone"
                value={form.phone}
                onChange={updateField}
                autoComplete="tel"
                className="h-12 rounded-2xl border border-black/10 bg-[#faf8f4] px-4 text-black outline-none transition focus:border-black"
                placeholder="Phone number"
              />
            </label>
          </div>

          <div className="border-t border-black/10 pt-5">
            <div className="text-sm font-bold uppercase tracking-[.15em] text-black">
              Sample Shipping Address
            </div>

            <div className="mt-4 grid gap-4">
              <label className="grid gap-2">
                <span className="text-sm font-bold text-black">
                  Address Line 1 *
                </span>

                <input
                  name="addressLine1"
                  value={form.addressLine1}
                  onChange={updateField}
                  required
                  autoComplete="address-line1"
                  className="h-12 rounded-2xl border border-black/10 bg-[#faf8f4] px-4 text-black outline-none transition focus:border-black"
                  placeholder="Street address"
                />
              </label>

              <label className="grid gap-2">
                <span className="text-sm font-bold text-black">
                  Address Line 2
                </span>

                <input
                  name="addressLine2"
                  value={form.addressLine2}
                  onChange={updateField}
                  autoComplete="address-line2"
                  className="h-12 rounded-2xl border border-black/10 bg-[#faf8f4] px-4 text-black outline-none transition focus:border-black"
                  placeholder="Suite, unit, etc."
                />
              </label>

              <div className="grid gap-4 md:grid-cols-3">
                <label className="grid gap-2">
                  <span className="text-sm font-bold text-black">
                    City *
                  </span>

                  <input
                    name="city"
                    value={form.city}
                    onChange={updateField}
                    required
                    autoComplete="address-level2"
                    className="h-12 rounded-2xl border border-black/10 bg-[#faf8f4] px-4 text-black outline-none transition focus:border-black"
                    placeholder="City"
                  />
                </label>

                <label className="grid gap-2">
                  <span className="text-sm font-bold text-black">
                    State *
                  </span>

                  <input
                    name="state"
                    value={form.state}
                    onChange={updateField}
                    required
                    autoComplete="address-level1"
                    className="h-12 rounded-2xl border border-black/10 bg-[#faf8f4] px-4 text-black outline-none transition focus:border-black"
                    placeholder="State"
                  />
                </label>

                <label className="grid gap-2">
                  <span className="text-sm font-bold text-black">
                    ZIP Code *
                  </span>

                  <input
                    name="postalCode"
                    value={form.postalCode}
                    onChange={updateField}
                    required
                    autoComplete="postal-code"
                    className="h-12 rounded-2xl border border-black/10 bg-[#faf8f4] px-4 text-black outline-none transition focus:border-black"
                    placeholder="ZIP"
                  />
                </label>
              </div>

              <input
                type="hidden"
                name="country"
                value="US"
              />
            </div>
          </div>

          <label className="grid gap-2">
            <span className="text-sm font-bold text-black">
              Notes
            </span>

            <textarea
              name="notes"
              value={form.notes}
              onChange={updateField}
              rows={4}
              className="rounded-2xl border border-black/10 bg-[#faf8f4] px-4 py-3 text-black outline-none transition focus:border-black"
              placeholder="Tell us about your use case, expected order size, or sample requirements."
            />
          </label>

          {error ? (
            <div
              role="alert"
              className="rounded-2xl bg-red-50 px-4 py-3 text-sm font-medium text-red-800"
            >
              {error}
            </div>
          ) : null}

          <button
            type="submit"
            disabled={loading}
            className="mt-2 w-full rounded-full bg-black px-6 py-4 font-bold text-white transition hover:bg-[#333333] disabled:cursor-not-allowed disabled:opacity-60 md:w-auto"
          >
            {loading
              ? "Submitting Request..."
              : "Request Free Sample"}
          </button>
        </form>
      )}
    </section>
  );
}