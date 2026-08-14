"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  ShoppingBag,
  Users,
  Package,
  FolderTree,
  Boxes,
  ClipboardList,
  Handshake,
  Star,
  History
} from "lucide-react";

const iconMap = {
  dashboard: LayoutDashboard,
  orders: ShoppingBag,
  customers: Users,
  products: Package,
  categories: FolderTree,
  inventory: Boxes,
  samples: ClipboardList,
  wholesale: Handshake,
  reviews: Star,
  history: History
};

export default function AdminNavigation({ navItems = [] }) {
  const pathname = usePathname();

  const isRouteActive = (href) => {
    // Dashboard should only be active on /admin
    if (href === "/admin") {
      return pathname === "/admin";
    }

    return pathname.startsWith(href);
  };

  return (
    <nav
      className="border-b border-black/10 bg-[#f8f6f1]"
      aria-label="Admin Navigation"
    >
      <div className="mx-auto max-w-7xl overflow-x-auto px-5 md:px-8">
        <div className="flex min-w-max items-center gap-2 py-3">
          {navItems.map((item) => {
            const Icon =
              iconMap[item.icon] ||
              LayoutDashboard;

            const active = isRouteActive(item.href);

            return (
              <Link
                key={item.href}
                href={item.href}
                prefetch={true}
                aria-current={
                  active ? "page" : undefined
                }
                className={[
                  "inline-flex items-center gap-2 rounded-full",
                  "px-4 py-2.5",
                  "text-sm font-bold",
                  "transition-all duration-200",
                  "whitespace-nowrap",
                  active
                    ? "bg-black text-white shadow-md"
                    : "bg-white text-black hover:bg-[#f1eadf] hover:shadow"
                ].join(" ")}
              >
                <Icon size={16} />

                <span>{item.label}</span>
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
}