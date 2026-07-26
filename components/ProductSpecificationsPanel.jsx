import {
  Check,
  CircleSlash2
} from "lucide-react";

function SpecificationRow({ label, value }) {
  if (
    value === null ||
    value === undefined ||
    value === ""
  ) {
    return null;
  }

  return (
    <div className="flex items-start justify-between gap-5 border-b border-black/10 py-3 last:border-b-0">
      <span className="text-sm text-black/60">
        {label}
      </span>

      <span className="max-w-[62%] text-right text-sm font-bold text-black">
        {value}
      </span>
    </div>
  );
}

function FeatureBadge({ label, enabled }) {
  return (
    <div
      className={`flex items-center gap-2 rounded-xl px-3 py-3 ${
        enabled
          ? "bg-green-50 text-green-900"
          : "bg-gray-100 text-gray-500"
      }`}
    >
      <span
        className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full ${
          enabled
            ? "bg-green-100 text-green-800"
            : "bg-gray-200 text-gray-500"
        }`}
      >
        {enabled ? (
          <Check size={14} strokeWidth={3} />
        ) : (
          <CircleSlash2 size={13} />
        )}
      </span>

      <span className="text-xs font-bold sm:text-sm">
        {label}
      </span>
    </div>
  );
}

function measurement(value, unit = "in") {
  if (
    value === null ||
    value === undefined ||
    value === ""
  ) {
    return null;
  }

  return `${Number(value)} ${unit}`;
}

export default function ProductSpecificationsPanel({
  specifications
}) {
  if (!specifications) {
    return null;
  }

  const dimensions = [
    specifications.width_inches
      ? `Width ${measurement(
          specifications.width_inches
        )}`
      : null,

    specifications.length_inches
      ? `Length ${measurement(
          specifications.length_inches
        )}`
      : null,

    specifications.diameter_inches
      ? `Diameter ${measurement(
          specifications.diameter_inches
        )}`
      : null,

    specifications.depth_inches
      ? `Depth ${measurement(
          specifications.depth_inches
        )}`
      : null,

    specifications.height_inches
      ? `Height ${measurement(
          specifications.height_inches
        )}`
      : null
  ].filter(Boolean);

  return (
    <section className="rounded-[1.75rem] bg-white p-5 text-black shadow-soft ring-1 ring-black/5 md:rounded-[2rem] md:p-8">
      <div className="text-xs font-bold uppercase tracking-[0.18em] text-green-800">
        Product Information
      </div>

      <h2 className="mt-2 font-display text-3xl font-bold text-black md:text-4xl">
        Specifications
      </h2>

      <div className="mt-5 grid gap-6 lg:grid-cols-[0.95fr_1.05fr]">
        <div>
          <SpecificationRow
            label="Material"
            value={specifications.material}
          />

          <SpecificationRow
            label="Color"
            value={specifications.color}
          />

          <SpecificationRow
            label="Dimensions"
            value={
              dimensions.length
                ? dimensions.join(" × ")
                : null
            }
          />

          <SpecificationRow
            label="Capacity"
            value={
              specifications.capacity_ml
                ? `${specifications.capacity_ml} ml`
                : null
            }
          />

          <SpecificationRow
            label="Pieces per pack"
            value={
              specifications.pieces_per_pack
            }
          />

          <SpecificationRow
            label="Packs per case"
            value={
              specifications.packs_per_case
            }
          />

          <SpecificationRow
            label="Made in"
            value={
              specifications.manufacturing_country
            }
          />
        </div>

        <div>
          <div className="grid gap-2 sm:grid-cols-2">
            <FeatureBadge
              label="Microwave safe"
              enabled={
                specifications.microwave_safe
              }
            />

            <FeatureBadge
              label="Freezer safe"
              enabled={
                specifications.freezer_safe
              }
            />

            <FeatureBadge
              label="Oil resistant"
              enabled={
                specifications.oil_resistant
              }
            />

            <FeatureBadge
              label="Leak resistant"
              enabled={
                specifications.leak_resistant
              }
            />

            <FeatureBadge
              label="Compostable"
              enabled={
                specifications.compostable
              }
            />

            <FeatureBadge
              label="Biodegradable"
              enabled={
                specifications.biodegradable
              }
            />
          </div>

          {specifications.disposal_instructions ? (
            <div className="mt-4 rounded-2xl bg-green-50 p-4">
              <h3 className="text-sm font-bold text-green-900">
                Disposal instructions
              </h3>

              <p className="mt-1 text-sm leading-6 text-green-900/75">
                {
                  specifications.disposal_instructions
                }
              </p>
            </div>
          ) : null}

          {specifications.storage_instructions ? (
            <div className="mt-3 rounded-2xl bg-[#faf7f1] p-4">
              <h3 className="text-sm font-bold text-black">
                Storage
              </h3>

              <p className="mt-1 text-sm leading-6 text-black/65">
                {
                  specifications.storage_instructions
                }
              </p>
            </div>
          ) : null}
        </div>
      </div>
    </section>
  );
}