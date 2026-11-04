"use client";

import { useState } from "react";

import SampleRequestForm from "@/components/SampleRequestForm";

/*
 * Lets a visitor choose which Simpli Ecoware product to sample, then shows the
 * existing sample request form (the same one used on product pages).
 */
export default function EcowareSampleRequestPicker({
  products = [],
  initialProductId = ""
}) {
  const [productId, setProductId] = useState(
    products.some((product) => product.id === initialProductId)
      ? initialProductId
      : products[0]?.id || ""
  );

  const selectedProduct =
    products.find((product) => product.id === productId) || null;

  if (!products.length) {
    return (
      <div className="rounded-[22px] border border-black/10 bg-white p-6 text-sm leading-6 text-black/60">
        No products are available for sampling right now. Please check back
        soon, or request wholesale pricing and our team will get in touch.
      </div>
    );
  }

  return (
    <div className="grid gap-5">
      <div className="rounded-[22px] border border-black/10 bg-white p-5 sm:p-6">
        <label
          htmlFor="sample-product"
          className="text-[10px] font-black uppercase tracking-[0.24em] text-[#4d7c2f]"
        >
          Step 1 · Choose a product
        </label>

        <div className="mt-4 grid gap-3 sm:grid-cols-[96px_minmax(0,1fr)] sm:items-center">
          <div className="hidden h-24 w-24 items-center justify-center overflow-hidden rounded-2xl border border-black/10 bg-[#f0ede3] sm:flex">
            {selectedProduct?.image ? (
              <img
                src={selectedProduct.image}
                alt={selectedProduct.name}
                className="h-full w-full object-contain"
              />
            ) : null}
          </div>

          <select
            id="sample-product"
            value={productId}
            onChange={(event) => setProductId(event.target.value)}
            className="min-h-[52px] w-full rounded-2xl border border-black/15 bg-white px-4 text-sm font-semibold text-black outline-none focus:border-[#4d7c2f]"
          >
            {products.map((product) => (
              <option key={product.id} value={product.id}>
                {product.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Sans headings to match Ecoware; let the form's columns shrink. */}
      {selectedProduct ? (
        <div
          className="min-w-0 [&_input]:w-full [&_input]:min-w-0 [&_label]:min-w-0 [&_select]:min-w-0"
          style={{
            "--font-display": "var(--font-inter), system-ui, sans-serif"
          }}
        >
          {/* Not keyed by product, so typed details survive a product change. */}
          <SampleRequestForm
            productId={selectedProduct.id}
            productName={selectedProduct.name}
          />
        </div>
      ) : null}
    </div>
  );
}
