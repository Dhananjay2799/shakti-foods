"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import {
  Boxes,
  Check,
  ChevronRight,
  ChevronsUpDown,
  ClipboardList,
  FolderTree,
  Handshake,
  History,
  LayoutDashboard,
  LayoutGrid,
  LogOut,
  Menu,
  Package,
  Repeat,
  ShoppingBag,
  Star,
  Store,
  Users,
  X
} from "lucide-react";

import { logoutAdmin } from "@/app/admin/actions";
import { ADMIN_STOREFRONTS } from "@/lib/admin-storefronts";
import {
  getActiveNavItem,
  getAdminBreadcrumb,
  getAdminNavGroups,
  getAdminNavItems,
  getAdminSection
} from "@/lib/admin-nav";

const ICONS = {
  dashboard: LayoutDashboard,
  orders: ShoppingBag,
  customers: Users,
  products: Package,
  categories: FolderTree,
  inventory: Boxes,
  history: History,
  subscriptions: Repeat,
  reviews: Star,
  samples: ClipboardList,
  wholesale: Handshake
};

const STORES = Object.values(ADMIN_STOREFRONTS);

function getStore(storefrontId) {
  return ADMIN_STOREFRONTS[storefrontId] || STORES[0];
}

/*
 * Admin frame for one store: a sidebar (a drawer on phones) and a top bar
 * with the breadcrumb and the store switcher. Pages render in a centred
 * content column so wide screens don't stretch tables and forms.
 */
export default function AdminShell({ storefrontId, user, children }) {
  const pathname = usePathname() || "";
  const storefront = getStore(storefrontId);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!menuOpen) return undefined;

    const onKey = (event) => {
      if (event.key === "Escape") setMenuOpen(false);
    };

    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [menuOpen]);

  return (
    <div className="min-h-screen bg-[#f8f6f1] text-black">
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 border-r border-black/10 bg-white lg:flex">
        <SidebarContent
          storefront={storefront}
          pathname={pathname}
          user={user}
        />
      </aside>

      {menuOpen ? (
        <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true" aria-label="Admin menu">
          <button
            type="button"
            aria-label="Close menu"
            onClick={() => setMenuOpen(false)}
            className="absolute inset-0 bg-black/40"
          />

          <div className="absolute inset-y-0 left-0 flex w-72 max-w-[85vw] bg-white shadow-2xl">
            <SidebarContent
              storefront={storefront}
              pathname={pathname}
              user={user}
              onClose={() => setMenuOpen(false)}
            />
          </div>
        </div>
      ) : null}

      <div className="flex min-h-screen min-w-0 flex-col lg:pl-64">
        <header className="sticky top-0 z-30 border-b border-black/10 bg-[#f8f6f1]/90 backdrop-blur">
          <div className="mx-auto flex h-16 w-full max-w-6xl items-center gap-3 px-4 md:px-8">
            <button
              type="button"
              onClick={() => setMenuOpen(true)}
              className="-ml-1 inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-black transition hover:bg-black/5 lg:hidden"
              aria-label="Open menu"
            >
              <Menu size={20} />
            </button>

            <Breadcrumb storefront={storefront} pathname={pathname} />

            <StoreSwitcher storefront={storefront} pathname={pathname} />
          </div>
        </header>

        <main className="mx-auto w-full min-w-0 max-w-6xl flex-1 px-4 py-6 md:px-8 md:py-8">
          {children}
        </main>
      </div>
    </div>
  );
}

function SidebarContent({ storefront, pathname, user, onClose }) {
  const groups = getAdminNavGroups(storefront);
  const active = getActiveNavItem(getAdminNavItems(storefront), pathname);

  return (
    <div className="flex min-h-0 w-full flex-col">
      <div className="flex items-center gap-3 px-5 pb-5 pt-6">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-black/10 bg-[#f8f6f1] p-1">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={storefront.logo}
            alt=""
            className="h-full w-full object-contain"
          />
        </span>

        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-extrabold uppercase tracking-[0.08em] text-black">
            {storefront.name}
          </p>
          <p className="text-xs text-black/50">Store administration</p>
        </div>

        {onClose ? (
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-black/60 transition hover:bg-black/5 hover:text-black"
            aria-label="Close menu"
          >
            <X size={18} />
          </button>
        ) : null}
      </div>

      <nav aria-label="Admin" className="min-h-0 flex-1 overflow-y-auto px-3 pb-4">
        {groups.map((group) => (
          <div key={group.label} className="mb-5">
            <p className="px-3 pb-2 text-[11px] font-bold uppercase tracking-[0.16em] text-black/40">
              {group.label}
            </p>

            <ul className="grid gap-0.5">
              {group.items.map((item) => {
                const Icon = ICONS[item.icon] || LayoutDashboard;
                const isActive = active?.href === item.href;

                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      aria-current={isActive ? "page" : undefined}
                      className={[
                        "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition",
                        isActive
                          ? "bg-[#f1eadf] font-bold text-black"
                          : "font-medium text-black/65 hover:bg-black/[0.04] hover:text-black"
                      ].join(" ")}
                    >
                      <Icon
                        size={18}
                        className={isActive ? "text-black" : "text-black/45"}
                      />
                      <span>{item.label}</span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      <div className="border-t border-black/10 p-3">
        <div className="flex items-center gap-3 rounded-xl px-2 py-2">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#f1eadf] text-xs font-bold text-black">
            {user?.initials || "A"}
          </span>

          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-bold text-black" title={user?.email || undefined}>
              {user?.name || user?.email || "Administrator"}
            </p>
            <p className="text-xs text-black/50">Administrator</p>
          </div>

          <form action={logoutAdmin}>
            <button
              type="submit"
              className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-black/55 transition hover:bg-black/5 hover:text-black"
              title="Sign out"
            >
              <LogOut size={18} />
              <span className="sr-only">Sign out</span>
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

function Breadcrumb({ storefront, pathname }) {
  const crumbs = getAdminBreadcrumb(storefront, pathname);

  return (
    <nav aria-label="Breadcrumb" className="min-w-0 flex-1">
      <ol className="flex min-w-0 items-center gap-1.5 text-sm">
        {crumbs.map((crumb, index) => {
          const isLast = index === crumbs.length - 1;

          return (
            <li
              key={`${crumb.label}-${index}`}
              className={[
                "flex min-w-0 items-center gap-1.5",
                // On phones show only the last two steps.
                index < crumbs.length - 2 ? "hidden sm:flex" : ""
              ].join(" ")}
            >
              {index > 0 ? (
                <ChevronRight
                  size={14}
                  className={[
                    "shrink-0 text-black/30",
                    // First step shown on phones gets no leading arrow.
                    index === crumbs.length - 2 ? "hidden sm:block" : ""
                  ].join(" ")}
                />
              ) : null}

              {isLast || !crumb.href ? (
                <span
                  className={[
                    "truncate",
                    isLast ? "font-bold text-black" : "text-black/55"
                  ].join(" ")}
                  aria-current={isLast ? "page" : undefined}
                >
                  {crumb.label}
                </span>
              ) : (
                <Link
                  href={crumb.href}
                  className="truncate text-black/55 transition hover:text-black"
                >
                  {crumb.label}
                </Link>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

/** Same section in the other store when it has one, else its dashboard. */
function getSwitchHref(store, pathname) {
  const section = getAdminSection(pathname);
  const target = `/admin/${store.slug}${section ? `/${section}` : ""}`;

  return getAdminNavItems(store).some((item) => item.href === target)
    ? target
    : `/admin/${store.slug}`;
}

function StoreSwitcher({ storefront, pathname }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!open) return undefined;

    const onPointer = (event) => {
      if (ref.current && !ref.current.contains(event.target)) {
        setOpen(false);
      }
    };

    const onKey = (event) => {
      if (event.key === "Escape") setOpen(false);
    };

    document.addEventListener("mousedown", onPointer);
    document.addEventListener("keydown", onKey);

    return () => {
      document.removeEventListener("mousedown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={ref} className="relative shrink-0">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-haspopup="menu"
        aria-expanded={open}
        className="inline-flex items-center gap-2 rounded-xl border border-black/10 bg-white px-3 py-2 text-sm font-bold text-black shadow-sm transition hover:bg-black/[0.03]"
      >
        <Store size={16} className="text-black/60" />
        <span className="hidden sm:inline">Switch storefront</span>
        <span className="sm:hidden">Store</span>
        <ChevronsUpDown size={15} className="text-black/45" />
      </button>

      {open ? (
        <div
          role="menu"
          className="absolute right-0 top-full z-50 mt-2 w-64 overflow-hidden rounded-2xl border border-black/10 bg-white p-1.5 shadow-xl"
        >
          <p className="px-3 pb-1 pt-2 text-[11px] font-bold uppercase tracking-[0.16em] text-black/40">
            Stores
          </p>

          {STORES.map((store) => {
            const isCurrent = store.id === storefront.id;

            return (
              <Link
                key={store.id}
                role="menuitem"
                href={isCurrent ? pathname || `/admin/${store.slug}` : getSwitchHref(store, pathname)}
                onClick={() => setOpen(false)}
                className={[
                  "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition",
                  isCurrent ? "bg-[#f1eadf] font-bold" : "font-medium hover:bg-black/[0.04]"
                ].join(" ")}
              >
                <span className="flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-black/10 bg-[#f8f6f1] p-0.5">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={store.logo} alt="" className="h-full w-full object-contain" />
                </span>

                <span className="min-w-0 flex-1 truncate">{store.name}</span>

                {isCurrent ? <Check size={16} className="text-black" /> : null}
              </Link>
            );
          })}

          <div className="my-1.5 border-t border-black/10" />

          <Link
            role="menuitem"
            href="/admin/select-store"
            onClick={() => setOpen(false)}
            className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-black/70 transition hover:bg-black/[0.04] hover:text-black"
          >
            <LayoutGrid size={16} className="text-black/45" />
            All stores
          </Link>
        </div>
      ) : null}
    </div>
  );
}
