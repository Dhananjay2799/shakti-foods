import Link from "next/link";
import { notFound } from "next/navigation";
import AdminNavigation from "@/components/admin/AdminNavigation";
import { logoutAdmin } from "@/app/admin/actions";
import { createClient } from "@/lib/supabase/server";
import {
  getAdminStorefront
} from "@/lib/admin-storefronts";

export const dynamic = "force-dynamic";

export default async function StorefrontAdminLayout({
  children,
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

  const supabase = await createClient();

  const {
    data: { user }
  } = await supabase.auth.getUser();

  const basePath =
    `/admin/${storefront.slug}`;

  const navItems = [
    {
      label: "Dashboard",
      href: basePath,
      icon: "dashboard"
    },
    {
      label: "Orders",
      href: `${basePath}/orders`,
      icon: "orders"
    },
    {
      label: "Customers",
      href: `${basePath}/customers`,
      icon: "customers"
    },
    {
      label: "Products",
      href: `${basePath}/products`,
      icon: "products"
    },
    {
      label: "Categories",
      href: `${basePath}/categories`,
      icon: "categories"
    },
    {
      label: "Inventory",
      href: `${basePath}/inventory`,
      icon: "inventory"
    }
  ];

  if (storefront.id === "shakti_foods") {
    navItems.push({
      label: "Subscriptions",
      href: `${basePath}/subscriptions`,
      icon: "subscriptions"
    });

    navItems.push({
      label: "Reviews",
      href: `${basePath}/reviews`,
      icon: "reviews"
    });
  }

  if (storefront.id === "ecoware") {
    navItems.push({
      label: "Samples",
      href: `${basePath}/sample-requests`,
      icon: "samples"
    });

    navItems.push({
      label: "Wholesale",
      href: `${basePath}/wholesale`,
      icon: "wholesale"
    });

    navItems.push({
      label: "Reviews",
      href: `${basePath}/reviews`,
      icon: "reviews"
    });
  }

  navItems.push({
    label: "History",
    href: `${basePath}/inventory/history`,
    icon: "history"
  });

  return (
    <div className="min-h-screen bg-[#f8f6f1] text-black">
      <div className="sticky top-0 z-40 bg-[#f8f6f1]/95 backdrop-blur">
        <div className="border-b border-black/10 bg-white">
          <div className="mx-auto flex max-w-7xl items-center justify-between gap-6 px-5 py-5 md:px-8">
            <div className="min-w-0">
              <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-black/45">
                {storefront.name}
              </p>

              <h1 className="mt-1 font-display text-2xl font-bold leading-none text-black md:text-3xl">
                Admin Portal
              </h1>

              <p className="mt-2 truncate text-xs text-black/45">
                {user?.email || "Administrator"}
              </p>
            </div>

            <div className="flex items-center gap-3">
              <Link
                href="/admin/select-store"
                className="rounded-full bg-[#eadfce] px-5 py-2.5 text-sm font-bold text-black transition hover:bg-[#dfd1bc]"
              >
                Switch Storefront
              </Link>

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
        </div>

        <AdminNavigation
          navItems={navItems}
        />
      </div>

      <div className="mx-auto max-w-7xl px-5 py-6 md:px-8">
        {children}
      </div>
    </div>
  );
}