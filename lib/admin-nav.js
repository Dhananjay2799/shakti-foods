/*
 * The admin sidebar for one store, in groups. Used by the store layout
 * (server) and the sidebar, breadcrumb and store switcher (client), so it
 * must stay plain data with no server-only imports.
 */

export function getAdminNavGroups(storefront) {
  const base = `/admin/${storefront.slug}`;

  const management =
    storefront.id === "ecoware"
      ? [
          { label: "Samples", href: `${base}/sample-requests`, icon: "samples" },
          { label: "Wholesale", href: `${base}/wholesale`, icon: "wholesale" },
          { label: "Reviews", href: `${base}/reviews`, icon: "reviews" }
        ]
      : [
          { label: "Subscriptions", href: `${base}/subscriptions`, icon: "subscriptions" },
          { label: "Reviews", href: `${base}/reviews`, icon: "reviews" }
        ];

  return [
    {
      label: "Workspace",
      items: [
        { label: "Dashboard", href: base, icon: "dashboard" },
        { label: "Orders", href: `${base}/orders`, icon: "orders" },
        { label: "Customers", href: `${base}/customers`, icon: "customers" }
      ]
    },
    {
      label: "Catalog",
      items: [
        { label: "Products", href: `${base}/products`, icon: "products" },
        { label: "Categories", href: `${base}/categories`, icon: "categories" },
        { label: "Inventory", href: `${base}/inventory`, icon: "inventory" },
        { label: "Stock history", href: `${base}/inventory/history`, icon: "history" }
      ]
    },
    {
      label: "Management",
      items: management
    }
  ];
}

export function getAdminNavItems(storefront) {
  return getAdminNavGroups(storefront).flatMap((group) => group.items);
}

/**
 * The nav item for the page being viewed: the most specific href that
 * matches, so the dashboard (/admin/<store>) is not active on every page and
 * Stock history (/inventory/history) does not also mark Inventory.
 */
export function getActiveNavItem(items, pathname = "") {
  return (
    items
      .filter(
        (item) =>
          pathname === item.href ||
          pathname.startsWith(`${item.href}/`)
      )
      .sort((a, b) => b.href.length - a.href.length)[0] || null
  );
}

/** First path part after /admin/<store>, e.g. "orders" (or "" for the dashboard). */
export function getAdminSection(pathname = "") {
  return String(pathname).split("/").filter(Boolean)[2] || "";
}

const SUBPAGE_LABELS = {
  new: "New",
  edit: "Edit",
  images: "Images",
  certifications: "Certifications",
  delete: "Delete",
  settings: "Settings",
  activity: "Activity",
  addresses: "Addresses",
  documents: "Documents"
};

/**
 * Breadcrumb for an admin page: store › section › detail page, e.g.
 * Shakti Foods › Products › Details › Edit.
 */
export function getAdminBreadcrumb(storefront, pathname = "") {
  const base = `/admin/${storefront.slug}`;
  const crumbs = [{ label: storefront.name, href: base }];
  const active = getActiveNavItem(getAdminNavItems(storefront), pathname);

  if (!active) {
    return crumbs;
  }

  crumbs.push({ label: active.label, href: active.href });

  const rest = pathname
    .slice(active.href.length)
    .split("/")
    .filter(Boolean);

  if (rest.length === 0) {
    return crumbs;
  }

  const first = rest[0];

  if (SUBPAGE_LABELS[first]) {
    crumbs.push({ label: SUBPAGE_LABELS[first] });
    return crumbs;
  }

  if (rest.length === 1) {
    crumbs.push({ label: "Details" });
    return crumbs;
  }

  crumbs.push({
    label: "Details",
    href: `${active.href}/${first}`
  });

  crumbs.push({
    label: SUBPAGE_LABELS[rest[rest.length - 1]] || "Details"
  });

  return crumbs;
}
