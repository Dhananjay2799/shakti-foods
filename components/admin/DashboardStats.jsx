"use client";

import {
  AlertTriangle,
  DollarSign,
  Package,
  ShoppingCart
} from "lucide-react";

function formatRevenue(cents) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD"
  }).format(Number(cents || 0) / 100);
}

export default function DashboardStats({ stats }) {
  const cards = [
    {
      title: "Total Orders",
      value: stats.totalOrders,
      icon: ShoppingCart
    },
    {
      title: "Revenue",
      value: formatRevenue(stats.totalRevenue),
      icon: DollarSign
    },
    {
      title: "Products",
      value: stats.totalProducts,
      icon: Package
    },
    {
      title: "Low Stock",
      value: stats.lowStockProducts,
      icon: AlertTriangle
    }
  ];

  return (
    <div className="mt-10 grid gap-6 md:grid-cols-2 xl:grid-cols-4">
      {cards.map((card) => {
        const Icon = card.icon;

        return (
          <div
            key={card.title}
            className="rounded-3xl bg-white p-6 shadow"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">
                  {card.title}
                </p>

                <h2 className="mt-3 text-4xl font-bold text-black">
                  {card.value}
                </h2>
              </div>

              <div className="rounded-full bg-black p-3">
                <Icon
                  className="text-white"
                  size={28}
                />
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}