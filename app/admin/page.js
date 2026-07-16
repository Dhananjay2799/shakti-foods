import Link from "next/link";
import DashboardStats from "@/components/admin/DashboardStats";
import RecentOrders from "@/components/admin/RecentOrders";
import LowStockProducts from "@/components/admin/LowStockProducts";
import AdminLiveRefresh from "@/components/admin/AdminLiveRefresh";
import { createSupabaseAdmin } from "@/lib/supabase-admin";

export const dynamic = "force-dynamic";

export default async function AdminDashboard() {
  const supabase = createSupabaseAdmin();

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
      }),

    supabase
      .from("orders")
      .select("total_amount")
      .eq("payment_status", "paid"),

    supabase
      .from("inventory")
      .select(
        `
          product_id,
          product_name,
          stock_quantity,
          reserved_quantity,
          low_stock_threshold,
          is_active
        `
      )
      .order("product_name"),

    supabase
      .from("orders")
      .select(
        `
          id,
          customer_name,
          customer_email,
          payment_status,
          fulfillment_status,
          total_amount,
          created_at
        `
      )
      .order("created_at", {
        ascending: false
      })
      .limit(8)
  ]);

  const errors = [
    ordersCountResult.error,
    revenueResult.error,
    inventoryResult.error,
    recentOrdersResult.error
  ].filter(Boolean);

  if (errors.length > 0) {
    console.error(
      "Admin dashboard query errors:",
      errors
    );
  }

  const inventory =
    inventoryResult.data || [];

  const lowStockProducts = inventory.filter(
    (item) => {
      const stockQuantity = Number(
        item.stock_quantity || 0
      );

      const reservedQuantity = Number(
        item.reserved_quantity || 0
      );

      const lowStockThreshold = Number(
        item.low_stock_threshold || 0
      );

      const availableStock =
        stockQuantity - reservedQuantity;

      return (
        item.is_active &&
        availableStock <= lowStockThreshold
      );
    }
  );

  const totalRevenue = (
    revenueResult.data || []
  ).reduce(
    (sum, order) =>
      sum + Number(order.total_amount || 0),
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

  return (
    <main className="min-h-screen bg-[#f8f6f1]">
      <AdminLiveRefresh />

      <div className="mx-auto max-w-7xl px-5 py-10 md:px-8 md:py-12">
        <div className="flex flex-wrap items-end justify-between gap-5">
          <div>
            <div className="text-sm font-bold uppercase tracking-[.18em] text-black/50">
              Admin Overview
            </div>

            <h1 className="mt-2 font-display text-5xl font-bold text-black">
              Dashboard
            </h1>

            <p className="mt-2 text-black/60">
              Live overview of Shakti Foods orders
              and inventory.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <Link
              href="/admin/orders"
              className="rounded-full bg-black px-5 py-3 font-bold text-white transition hover:bg-[#333333]"
            >
              View Orders
            </Link>

            <Link
              href="/admin/inventory"
              className="rounded-full bg-[#eadfce] px-5 py-3 font-bold text-black transition hover:bg-[#ded1bf]"
            >
              Manage Inventory
            </Link>

            <Link
              href="/admin/inventory/history"
              className="rounded-full bg-white px-5 py-3 font-bold text-black shadow transition hover:bg-[#faf7f1]"
            >
              Transaction History
            </Link>
          </div>
        </div>

        <DashboardStats stats={stats} />

        <div className="mt-8 grid gap-6 xl:grid-cols-[1.45fr_.8fr]">
          <RecentOrders
            orders={
              recentOrdersResult.data || []
            }
          />

          <div className="grid gap-6">
            <LowStockProducts
              products={lowStockProducts}
            />
          </div>
        </div>
      </div>
    </main>
  );
}