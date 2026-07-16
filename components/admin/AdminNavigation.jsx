"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Boxes,
  ClipboardList,
  History,
  LayoutDashboard
} from "lucide-react";

const navigationItems = [
  {
    label: "Dashboard",
    href: "/admin",
    icon: LayoutDashboard
  },
  {
    label: "Orders",
    href: "/admin/orders",
    icon: ClipboardList
  },
  {
    label: "Inventory",
    href: "/admin/inventory",
    icon: Boxes
  },
  {
    label: "History",
    href: "/admin/inventory/history",
    icon: History
  }
];

function isCurrentRoute(pathname, href) {
  if (href === "/admin") {
    return pathname === "/admin";
  }

  return pathname.startsWith(href);
}

export default function AdminNavigation() {
  const pathname = usePathname();

  return (
    <nav className="border-b border-black/10 bg-white">
      <div className="mx-auto flex max-w-7xl gap-2 overflow-x-auto px-5 py-3 md:px-8">
        {navigationItems.map((item) => {
          const Icon = item.icon;
          const isActive = isCurrentRoute(
            pathname,
            item.href
          );

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`inline-flex shrink-0 items-center gap-2 rounded-full px-4 py-2 text-sm font-bold transition ${
                isActive
                  ? "bg-black text-white"
                  : "bg-[#f3ede3] text-black hover:bg-[#e5d9c8]"
              }`}
            >
              <Icon size={17} />

              {item.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}