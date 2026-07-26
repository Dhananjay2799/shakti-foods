import Link from "next/link";
import { notFound } from "next/navigation";
import { createSupabaseAdmin } from "@/lib/supabase-admin";
import { products as catalogProducts } from "@/lib/data";
import { saveProductSpecifications } from "@/app/admin/products/actions";

export const dynamic = "force-dynamic";

function NumberField({
  label,
  name,
  value,
  step = "1",
  min = "0",
  placeholder
}) {
  return (
    <label className="grid gap-2">
      <span className="text-sm font-bold text-black">
        {label}
      </span>
      <input
        type="number"
        name={name}
        defaultValue={value ?? ""}
        step={step}
        min={min}
        placeholder={placeholder}
        className="rounded-2xl border border-black/15 bg-white px-4 py-3 text-black outline-none focus:border-black"
      />
    </label>
  );
}

function TextField({
  label,
  name,
  value,
  placeholder
}) {
  return (
    <label className="grid gap-2">
      <span className="text-sm font-bold text-black">
        {label}
      </span>
      <input
        type="text"
        name={name}
        defaultValue={value ?? ""}
        placeholder={placeholder}
        className="rounded-2xl border border-black/15 bg-white px-4 py-3 text-black outline-none focus:border-black"
      />
    </label>
  );
}

function CheckboxField({
  label,
  name,
  checked
}) {
  return (
    <label className="flex items-center gap-3 rounded-2xl bg-[#faf7f1] px-4 py-4">
      <input
        type="checkbox"
        name={name}
        defaultChecked={Boolean(checked)}
        className="h-5 w-5"
      />
      <span className="font-bold text-black">
        {label}
      </span>
    </label>
  );
}

export default async function AdminProductEditorPage({ params }) {
  const resolvedParams = await Promise.resolve(params || {});
  const productId = resolvedParams.productId;

  const supabase = createSupabaseAdmin();

  const [
    inventoryResult,
    specificationsResult
  ] = await Promise.all([
    supabase
      .from("inventory")
      .select(
        `
          product_id,
          product_name,
          stock_quantity,
          reserved_quantity,
          is_active
        `
      )
      .eq("product_id", productId)
      .maybeSingle(),

    supabase
      .from("product_specifications")
      .select("*")
      .eq("product_id", productId)
      .maybeSingle()
  ]);

  if (
    inventoryResult.error ||
    !inventoryResult.data
  ) {
    console.error(
      "Unable to load product:",
      inventoryResult.error
    );
    notFound();
  }

  if (specificationsResult.error) {
    console.error(
      "Unable to load specifications:",
      specificationsResult.error
    );
  }

  const inventory = inventoryResult.data;
  const specifications = specificationsResult.data || {};

  const catalogProduct = catalogProducts.find(
    (product) => product.id === productId
  );

  return (
    <main className="min-h-screen bg-[#f8f6f1]">
      <div className="mx-auto max-w-6xl px-5 py-10 md:px-8 md:py-12">
        
        {/* Step 5: Expanded header block containing the newly introduced 'Manage Images' target */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <Link
            href="/admin/products"
            className="inline-flex rounded-full bg-white px-5 py-3 font-bold text-black shadow transition hover:bg-[#f1eadf]"
          >
            ← Back to Products
          </Link>

          <div className="flex flex-wrap gap-3">
            <Link
              href={`/admin/products/${productId}/edit`}
              className="inline-flex rounded-full bg-black px-5 py-3 font-bold text-white transition hover:bg-black/80"
            >
              Edit Product
            </Link>

            <Link
              href={`/admin/products/${productId}/images`}
              className="inline-flex rounded-full bg-[#f1eadf] px-5 py-3 font-bold text-black transition hover:bg-[#e6dac7]"
            >
              Manage Images
            </Link>
            
            <Link
              href={`/admin/products/${productId}/certifications`}
              className="inline-flex rounded-full bg-black px-5 py-3 font-bold text-white transition hover:bg-black/80"
            >
              Manage Certifications
            </Link>
          </div>
        </div>

        <div className="mt-7">
          <div className="text-sm font-bold uppercase tracking-[.18em] text-black/50">
            Product Specification Editor
          </div>

          <h1 className="mt-2 font-display text-4xl font-bold text-black md:text-6xl">
            {inventory.product_name}
          </h1>

          <p className="mt-2 text-black/60">
            Product ID: {inventory.product_id}
          </p>
        </div>

        <form
          action={saveProductSpecifications}
          className="mt-10 grid gap-6"
        >
          <input
            type="hidden"
            name="productId"
            value={productId}
          />

          <input
            type="hidden"
            name="productSlug"
            value={catalogProduct?.slug || ""}
          />

          <section className="rounded-[2rem] bg-white p-5 shadow md:p-7">
            <h2 className="font-display text-3xl font-bold text-black">
              Basic Information
            </h2>

            <div className="mt-6 grid gap-5 md:grid-cols-2">
              <TextField
                label="Material"
                name="material"
                value={specifications.material}
                placeholder="Sugarcane bagasse fiber"
              />

              <TextField
                label="Color"
                name="color"
                value={specifications.color}
                placeholder="Natural white"
              />

              <TextField
                label="Manufacturing country"
                name="manufacturingCountry"
                value={specifications.manufacturing_country}
                placeholder="United States"
              />
            </div>
          </section>

          <section className="rounded-[2rem] bg-white p-5 shadow md:p-7">
            <h2 className="font-display text-3xl font-bold text-black">
              Dimensions and Packaging
            </h2>

            <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              <NumberField
                label="Width, inches"
                name="widthInches"
                value={specifications.width_inches}
                step="0.01"
              />

              <NumberField
                label="Length, inches"
                name="lengthInches"
                value={specifications.length_inches}
                step="0.01"
              />

              <NumberField
                label="Diameter, inches"
                name="diameterInches"
                value={specifications.diameter_inches}
                step="0.01"
              />

              <NumberField
                label="Depth, inches"
                name="depthInches"
                value={specifications.depth_inches}
                step="0.01"
              />

              <NumberField
                label="Height, inches"
                name="heightInches"
                value={specifications.height_inches}
                step="0.01"
              />

              <NumberField
                label="Capacity, ml"
                name="capacityMl"
                value={specifications.capacity_ml}
              />

              <NumberField
                label="Pieces per pack"
                name="piecesPerPack"
                value={specifications.pieces_per_pack}
              />

              <NumberField
                label="Packs per case"
                name="packsPerCase"
                value={specifications.packs_per_case}
              />
            </div>
          </section>

          <section className="rounded-[2rem] bg-white p-5 shadow md:p-7">
            <h2 className="font-display text-3xl font-bold text-black">
              Product Properties
            </h2>

            <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <CheckboxField
                label="Microwave safe"
                name="microwaveSafe"
                checked={specifications.microwave_safe}
              />

              <CheckboxField
                label="Freezer safe"
                name="freezerSafe"
                checked={specifications.freezer_safe}
              />

              <CheckboxField
                label="Oil resistant"
                name="oilResistant"
                checked={specifications.oil_resistant}
              />

              <CheckboxField
                label="Leak resistant"
                name="leakResistant"
                checked={specifications.leak_resistant}
              />

              <CheckboxField
                label="Compostable"
                name="compostable"
                checked={specifications.compostable}
              />

              <CheckboxField
                label="Biodegradable"
                name="biodegradable"
                checked={specifications.biodegradable}
              />
            </div>
          </section>

          <section className="rounded-[2rem] bg-white p-5 shadow md:p-7">
            <h2 className="font-display text-3xl font-bold text-black">
              Handling Instructions
            </h2>

            <div className="mt-6 grid gap-5">
              <label className="grid gap-2">
                <span className="text-sm font-bold text-black">
                  Disposal instructions
                </span>
                <textarea
                  name="disposalInstructions"
                  rows="4"
                  defaultValue={specifications.disposal_instructions || ""}
                  className="rounded-2xl border border-black/15 bg-white px-4 py-3 text-black outline-none focus:border-black"
                />
              </label>

              <label className="grid gap-2">
                <span className="text-sm font-bold text-black">
                  Storage instructions
                </span>
                <textarea
                  name="storageInstructions"
                  rows="4"
                  defaultValue={specifications.storage_instructions || ""}
                  className="rounded-2xl border border-black/15 bg-white px-4 py-3 text-black outline-none focus:border-black"
                />
              </label>
            </div>
          </section>

          <div className="sticky bottom-5 z-20 rounded-[2rem] bg-white/95 p-4 shadow-xl backdrop-blur">
            <button
              type="submit"
              className="w-full rounded-full bg-black px-6 py-4 font-bold text-white transition hover:bg-black/80"
            >
              Save Specifications
            </button>
          </div>
        </form>
      </div>
    </main>
  );
}