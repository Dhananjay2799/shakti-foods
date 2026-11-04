/*
 * Simpli Ecoware volume pricing table.
 *
 * Mirrors the "Buy More, Save More" table on Shakti Foods product pages, using
 * the same product_price_tiers rows. Checkout and the cart apply these tiers
 * automatically, so this table is display-only.
 */

function formatPrice(amount) {
  const value = Number(amount);

  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD"
  }).format(Number.isFinite(value) ? value : 0);
}

function quantityLabel(tier) {
  const min = Number(tier.min_quantity);

  if (tier.max_quantity === null || tier.max_quantity === undefined) {
    return `${min}+`;
  }

  return `${min}–${Number(tier.max_quantity)}`;
}

export default function EcowareVolumePricing({
  priceTiers = [],
  regularUnitPrice = 0
}) {
  const tiers = [...priceTiers]
    .filter((tier) => Number(tier.unit_price_cents) > 0)
    .sort(
      (a, b) => Number(a.min_quantity) - Number(b.min_quantity)
    );

  if (!tiers.length) {
    return null;
  }

  const regular = Number(regularUnitPrice) || 0;
  const firstMin = Number(tiers[0].min_quantity);

  return (
    <div className="mt-4 rounded-[22px] border border-black/10 bg-white p-4 sm:p-5">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.24em] text-[#4d7c2f]">
            Volume pricing
          </p>

          <p className="mt-1 text-base font-black tracking-[-0.02em]">
            Buy more, save more
          </p>
        </div>

        <p className="text-xs font-medium text-black/45">
          Applied automatically in your cart.
        </p>
      </div>

      <div className="mt-4 overflow-hidden rounded-2xl border border-black/10">
        <table className="w-full text-left text-sm">
          <thead className="bg-[#173a18] text-[11px] font-black uppercase tracking-[0.12em] text-white">
            <tr>
              <th scope="col" className="px-4 py-3">
                Quantity
              </th>
              <th scope="col" className="px-4 py-3">
                Price each
              </th>
              <th scope="col" className="px-4 py-3 text-right">
                Savings
              </th>
            </tr>
          </thead>

          <tbody>
            {regular > 0 && firstMin > 1 ? (
              <tr className="border-t border-black/10">
                <td className="px-4 py-3 text-black/70">
                  1–{firstMin - 1}
                </td>
                <td className="px-4 py-3 font-bold">
                  {formatPrice(regular)}
                </td>
                <td className="px-4 py-3 text-right text-black/40">—</td>
              </tr>
            ) : null}

            {tiers.map((tier) => {
              const tierPrice = Number(tier.unit_price_cents) / 100;
              const savings =
                regular > 0
                  ? Math.max(
                      Math.round(((regular - tierPrice) / regular) * 100),
                      0
                    )
                  : 0;

              return (
                <tr
                  key={tier.id || `${tier.min_quantity}-${tier.max_quantity}`}
                  className="border-t border-black/10"
                >
                  <td className="px-4 py-3 text-black/70">
                    {quantityLabel(tier)}
                    {tier.tier_name ? (
                      <span className="ml-2 text-xs font-semibold text-black/40">
                        {tier.tier_name}
                      </span>
                    ) : null}
                  </td>
                  <td className="px-4 py-3 font-bold">
                    {formatPrice(tierPrice)}
                  </td>
                  <td
                    className={`px-4 py-3 text-right ${
                      savings > 0
                        ? "font-black text-[#397221]"
                        : "text-black/40"
                    }`}
                  >
                    {savings > 0 ? `${savings}%` : "—"}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
