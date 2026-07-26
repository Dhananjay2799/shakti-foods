import AdminNavigation from "@/components/admin/AdminNavigation";
import { logoutAdmin } from "@/app/admin/actions";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function AdminLayout({ children }) {
  const supabase = await createClient();

  const {
    data: { user },
    error
  } = await supabase.auth.getUser();

  if (error) {
    console.error("Unable to load admin user:", error);
  }

  const navItems = [
    {
      label: "Dashboard",
      href: "/admin",
      icon: "dashboard"
    },
    {
      label: "Orders",
      href: "/admin/orders",
      icon: "orders"
    },
    {
      label: "Customers",
      href: "/admin/customers",
      icon: "customers"
    },
    {
      label: "Products",
      href: "/admin/products",
      icon: "products"
    },
    {
      label: "Categories",
      href: "/admin/categories",
      icon: "categories"
    },
    {
      label: "Inventory",
      href: "/admin/inventory",
      icon: "inventory"
    },
    {
      label: "History",
      href: "/admin/inventory/history",
      icon: "history"
    }
  ];

  return (
    <div className="min-h-screen bg-[#f8f6f1] text-black">
      <div className="sticky top-0 z-40 bg-[#f8f6f1]/95 backdrop-blur">
        <div className="border-b border-black/10 bg-white">
          <div className="mx-auto flex max-w-7xl items-center justify-between gap-6 px-5 py-5 md:px-8">
            <div className="min-w-0">
              <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-black/45">
                Shakti Foods
              </p>

              <h1 className="mt-1 font-display text-2xl font-bold leading-none text-black md:text-3xl">
                Admin Portal
              </h1>

              <p className="mt-2 truncate text-xs text-black/45">
                {user?.email || "Administrator"}
              </p>
            </div>

            <form action={logoutAdmin}>
              <button
                type="submit"
                className="rounded-full bg-black px-5 py-2.5 text-sm font-bold text-white transition hover:bg-black/80"
              >
                Sign Out
              </button>
            </form>
          </div>
        </div>

        <AdminNavigation navItems={navItems} />
      </div>

      <div className="mx-auto max-w-7xl px-5 py-6 md:px-8">
        {children}
      </div>
    </div>
  );
}