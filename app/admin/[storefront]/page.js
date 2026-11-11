import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowUpRight,
  CalendarDays,
  ChevronRight,
  History,
  Package,
  PackagePlus,
  ShoppingBag
} from "lucide-react";
import DashboardStats from "@/components/admin/DashboardStats";
import RecentOrders from "@/components/admin/RecentOrders";
import LowStockProducts from "@/components/admin/LowStockProducts";
import AdminLiveRefresh from "@/components/admin/AdminLiveRefresh";
import { createSupabaseAdmin } from "@/lib/supabase-admin";
import {
  getAdminStorefront
} from "@/lib/admin-storefronts";

export const dynamic = "force-dynamic";

export default async function StorefrontAdminDashboard({
  params
}) {
  const resolvedParams =
    await Promise.resolve(params);

  const storefront =
    getAdminStorefront(
      resolvedParams.storefront
    );

  if (!storefront) {
    notFound();
  }

  const supabase =
    createSupabaseAdmin();

  const [
    ordersCountResult,
    revenueResult,
    inventoryResult,
    recentOrdersResult
  ] = await Promise.all([
    supabase
      .from("orders")
      .select("id", {
        count: "exact",
        head: true
      })
      .eq("storefront", storefront.id),

    supabase
      .from("orders")
      .select("total_amount")
      .eq("storefront", storefront.id)
      .eq("payment_status", "paid"),

    supabase
      .from("inventory")
      .select(`
        product_id,
        product_name,
        stock_quantity,
        reserved_quantity,
        low_stock_threshold,
        is_active
      `)
      .eq("storefront", storefront.id)
      .order("product_name"),

    supabase
      .from("orders")
      .select(`
        id,
        customer_name,
        customer_email,
        payment_status,
        fulfillment_status,
        total_amount,
        created_at
      `)
      .eq("storefront", storefront.id)
      .order("created_at", {
        ascending: false
      })
      .limit(6)
  ]);

  const errors = [
    ordersCountResult.error,
    revenueResult.error,
    inventoryResult.error,
    recentOrdersResult.error
  ].filter(Boolean);

  if (errors.length > 0) {
    console.error(
      `${storefront.name} dashboard query errors:`,
      errors
    );
  }

  const inventory =
    inventoryResult.data || [];

  const lowStockProducts =
    inventory.filter((item) => {
      const stockQuantity =
        Number(
          item.stock_quantity || 0
        );

      const reservedQuantity =
        Number(
          item.reserved_quantity || 0
        );

      const threshold =
        Number(
          item.low_stock_threshold || 0
        );

      const available =
        stockQuantity -
        reservedQuantity;

      return (
        item.is_active &&
        available <= threshold
      );
    });

  const totalRevenue = (
    revenueResult.data || []
  ).reduce(
    (sum, order) =>
      sum +
      Number(order.total_amount || 0),
    0
  );

  const stats = {
    totalOrders:
      ordersCountResult.count || 0,

    totalRevenue,

    totalProducts:
      inventory.length,

    lowStockProducts:
      lowStockProducts.length
  };

  const basePath =
    `/admin/${storefront.slug}`;

  const quickLinks = [
    {
      label: "Product catalog",
      href: `${basePath}/products`,
      icon: Package
    },
    {
      label: "Manage orders",
      href: `${basePath}/orders`,
      icon: ShoppingBag
    },
    {
      label: "Add a product",
      href: `${basePath}/products/new`,
      icon: PackagePlus
    },
    {
      label: "Stock history",
      href: `${basePath}/inventory/history`,
      icon: History
    }
  ];

  return (
    <div className="grid gap-6">
      <AdminLiveRefresh />

      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-4xl font-bold text-black">
            Dashboard
          </h1>

          <p className="mt-1.5 text-sm text-black/55">
            A clear view of your {storefront.name} orders, sales, and inventory.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <span className="inline-flex items-center gap-2 rounded-xl border border-black/10 bg-white px-3.5 py-2 text-sm font-semibold text-black/60">
            <CalendarDays size={16} aria-hidden="true" />
            All time
          </span>

          <Link
            href={`${basePath}/orders`}
            className="inline-flex items-center gap-2 rounded-xl bg-black px-4 py-2 text-sm font-bold text-white transition hover:bg-black/85"
          >
            View orders
            <ArrowUpRight size={16} />
          </Link>
        </div>
      </header>

      <DashboardStats
        stats={stats}
      />

      <RecentOrders
        basePath={basePath}
        orders={
          recentOrdersResult.data || []
        }
      />

      <div className="grid gap-6 md:grid-cols-2">
        <LowStockProducts
          products={
            lowStockProducts
          }
          inventoryHref={`${basePath}/inventory`}
        />

        <section className="rounded-2xl border border-black/10 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-bold text-black">
            Quick access
          </h2>

          <ul className="mt-3 divide-y divide-black/[0.07]">
            {quickLinks.map((link) => {
              const Icon = link.icon;

              return (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="group flex items-center gap-3 py-3 text-sm font-semibold text-black"
                  >
                    <Icon size={18} className="text-black/45" aria-hidden="true" />
                    <span className="flex-1">{link.label}</span>
                    <ChevronRight
                      size={16}
                      className="text-black/35 transition group-hover:translate-x-0.5 group-hover:text-black"
                    />
                  </Link>
                </li>
              );
            })}
          </ul>
        </section>
      </div>
    </div>
  );
}