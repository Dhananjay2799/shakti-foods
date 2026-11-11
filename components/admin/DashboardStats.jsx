import {
  Boxes,
  DollarSign,
  Package,
  ShoppingBag
} from "lucide-react";

function formatCurrency(cents = 0) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2
  }).format(Number(cents) / 100);
}

function formatNumber(value = 0) {
  return new Intl.NumberFormat("en-US").format(
    Number(value)
  );
}

export default function DashboardStats({
  stats = {}
}) {
  const lowStock = Number(stats.lowStockProducts || 0);

  const cards = [
    {
      title: "Total orders",
      value: formatNumber(stats.totalOrders),
      icon: ShoppingBag,
      description: "All customer orders"
    },
    {
      title: "Revenue",
      value: formatCurrency(stats.totalRevenue),
      icon: DollarSign,
      description: "From paid orders"
    },
    {
      title: "Products",
      value: formatNumber(stats.totalProducts),
      icon: Package,
      description: "In your catalog"
    },
    {
      title: "Low stock",
      value: formatNumber(lowStock),
      icon: Boxes,
      description:
        lowStock === 0
          ? "No restocking alerts"
          : `${formatNumber(lowStock)} need${lowStock === 1 ? "s" : ""} restocking`,
      tone: lowStock === 0 ? "text-emerald-700" : "text-amber-700"
    }
  ];

  return (
    <section
      aria-label="Dashboard statistics"
      className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4"
    >
      {cards.map((card) => {
        const Icon = card.icon;

        return (
          <article
            key={card.title}
            className="min-w-0 rounded-2xl border border-black/10 bg-white p-4 shadow-sm sm:p-5"
          >
            <div className="flex items-start justify-between gap-3">
              <p className="text-sm font-semibold text-black/60">
                {card.title}
              </p>

              <Icon size={18} className="shrink-0 text-black/40" aria-hidden="true" />
            </div>

            <p className="mt-3 truncate text-2xl font-bold tracking-tight text-black sm:text-3xl">
              {card.value}
            </p>

            <p className={`mt-1.5 text-xs sm:text-sm ${card.tone || "text-black/55"}`}>
              {card.description}
            </p>
          </article>
        );
      })}
    </section>
  );
}
