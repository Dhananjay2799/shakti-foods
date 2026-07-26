"use client";

import {
  AlertTriangle,
  DollarSign,
  Package,
  ShoppingCart
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
  const cards = [
    {
      title: "Total Orders",
      value: formatNumber(stats.totalOrders),
      icon: ShoppingCart,
      description: "All customer orders"
    },
    {
      title: "Revenue",
      value: formatCurrency(stats.totalRevenue),
      icon: DollarSign,
      description: "Completed sales"
    },
    {
      title: "Products",
      value: formatNumber(stats.totalProducts),
      icon: Package,
      description: "Products in catalog"
    },
    {
      title: "Low Stock",
      value: formatNumber(stats.lowStockProducts),
      icon: AlertTriangle,
      description: "Need restocking"
    }
  ];

  return (
    <section
      aria-label="Dashboard statistics"
      className="mt-10 grid gap-6 md:grid-cols-2 xl:grid-cols-4"
    >
      {cards.map((card) => {
        const Icon = card.icon;

        return (
          <article
            key={card.title}
            className="rounded-3xl bg-white p-6 shadow transition-all duration-200 hover:-translate-y-1 hover:shadow-lg"
          >
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-semibold uppercase tracking-wide text-gray-500">
                  {card.title}
                </p>

                <h2 className="mt-3 text-4xl font-bold text-black">
                  {card.value}
                </h2>

                <p className="mt-2 text-sm text-gray-500">
                  {card.description}
                </p>
              </div>

              <div className="rounded-full bg-black p-3">
                <Icon
                  size={28}
                  className="text-white"
                />
              </div>
            </div>
          </article>
        );
      })}
    </section>
  );
}