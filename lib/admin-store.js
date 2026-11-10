import { cookies } from "next/headers";
import { notFound, redirect } from "next/navigation";

import {
  ADMIN_STORE_COOKIE,
  getAdminStorefront,
  getAdminStorefrontById
} from "@/lib/admin-storefronts";
import { createSupabaseAdmin } from "@/lib/supabase-admin";

/*
 * Keeps the admin separated by store. Every admin page lives under
 * /admin/<store>/… (shakti-foods or ecoware) and only shows that store's
 * records. The old shared URLs (/admin/products, /admin/orders/<id> …)
 * redirect into the right store.
 */

/** The store for an /admin/[storefront] route, or a 404. */
export function requireAdminStore(slug) {
  const storefront = getAdminStorefront(slug);

  if (!storefront) {
    notFound();
  }

  return storefront;
}

export function adminProductsPath(storefront, productId = "", suffix = "") {
  const base = `/admin/${storefront.slug}/products`;

  return productId
    ? `${base}/${encodeURIComponent(productId)}${suffix}`
    : base;
}

/**
 * Loads a product for /admin/<store>/products/<productId>/… and makes sure
 * it belongs to that store. A product from the other store is opened in its
 * own store instead; an unknown product is a 404.
 */
export async function requireStoreProduct({
  storefront,
  productId,
  suffix = "",
  select = "*"
}) {
  const id = String(productId || "").trim();

  if (!id) {
    notFound();
  }

  const columns = select === "*" ? "*" : `${select}, storefront`;

  const { data, error } = await createSupabaseAdmin()
    .from("products")
    .select(columns)
    .eq("product_id", id)
    .maybeSingle();

  if (error) {
    console.error("Unable to load product for admin:", {
      productId: id,
      message: error.message
    });

    throw new Error(error.message || "Unable to load product.");
  }

  if (!data) {
    notFound();
  }

  if (data.storefront !== storefront.id) {
    const owner = getAdminStorefrontById(data.storefront);

    if (owner) {
      redirect(adminProductsPath(owner, id, suffix));
    }

    notFound();
  }

  return data;
}

function queryString(searchParams) {
  const params = new URLSearchParams();

  for (const [key, value] of Object.entries(searchParams || {})) {
    if (Array.isArray(value)) {
      value.forEach((entry) => params.append(key, String(entry)));
    } else if (value !== undefined && value !== null) {
      params.set(key, String(value));
    }
  }

  const text = params.toString();
  return text ? `?${text}` : "";
}

/** The store last opened in the admin (from the admin_store cookie). */
export function getRememberedAdminStore() {
  try {
    return getAdminStorefront(cookies().get(ADMIN_STORE_COOKIE)?.value) || null;
  } catch {
    return null;
  }
}

/**
 * Old shared admin URL → the same page in the store last opened, or the
 * store picker when no store has been opened yet.
 */
export function redirectToRememberedStore(path = "", searchParams = {}) {
  const storefront = getRememberedAdminStore();

  if (!storefront) {
    redirect("/admin/select-store");
  }

  redirect(`/admin/${storefront.slug}${path}${queryString(searchParams)}`);
}

/**
 * Old shared admin URL for one record → that record's own store. Falls back
 * to the store last opened when the record has no store or is not found
 * (the store page then shows its normal "not found").
 */
export async function redirectToRecordStore({
  table,
  column = "id",
  value,
  path,
  searchParams = {},
  fixedStorefrontId = null
}) {
  let storefront = fixedStorefrontId
    ? getAdminStorefrontById(fixedStorefrontId)
    : null;

  if (!storefront && value) {
    try {
      const { data } = await createSupabaseAdmin()
        .from(table)
        .select("storefront")
        .eq(column, value)
        .maybeSingle();

      storefront = getAdminStorefrontById(data?.storefront);
    } catch (error) {
      console.error("Unable to find the store for an admin link:", {
        table,
        message: error?.message || String(error)
      });
    }
  }

  if (storefront) {
    redirect(`/admin/${storefront.slug}${path}${queryString(searchParams)}`);
  }

  redirectToRememberedStore(path, searchParams);
}

/**
 * A path inside the store the admin is working in (for server actions that
 * redirect after saving). Falls back to the shared URL, which redirects.
 */
export function adminStorePath(path) {
  const storefront = getRememberedAdminStore();

  return storefront
    ? `/admin/${storefront.slug}${path}`
    : `/admin${path}`;
}
