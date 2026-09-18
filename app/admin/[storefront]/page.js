import Link from "next/link";
import { notFound } from "next/navigation";
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

  return (
    <main className="min-h-screen bg-[#f8f6f1]">
      <AdminLiveRefresh />

      <div className="mx-auto max-w-7xl px-5 py-10 md:px-8 md:py-12">
        <div className="flex flex-wrap items-end justify-between gap-5">
          <div>
            <div className="text-sm font-bold uppercase tracking-[.18em] text-black/50">
              {storefront.name} Admin
            </div>

            <h1 className="mt-2 font-display text-5xl font-bold text-black">
              Dashboard
            </h1>

            <p className="mt-2 text-black/60">
              Live overview of{" "}
              {storefront.name} orders and
              inventory.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <Link
              href={`${basePath}/orders`}
              className="rounded-full bg-black px-5 py-3 font-bold text-white"
            >
              View Orders
            </Link>

            <Link
              href={`${basePath}/inventory`}
              className="rounded-full bg-[#eadfce] px-5 py-3 font-bold text-black"
            >
              Manage Inventory
            </Link>

            <Link
              href="/admin/select-store"
              className="rounded-full bg-white px-5 py-3 font-bold text-black shadow"
            >
              Switch Storefront
            </Link>
          </div>
        </div>

        <DashboardStats
          stats={stats}
        />

        <div className="mt-8 grid gap-6 xl:grid-cols-[1.45fr_.8fr]">
          <RecentOrders
            orders={
              recentOrdersResult.data || []
            }
          />

          <LowStockProducts
            products={
              lowStockProducts
            }
          />
        </div>
      </div>
    </main>
  );
}