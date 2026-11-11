"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createSupabaseAdmin } from "@/lib/supabase-admin";
import { getAdminStorefront } from "@/lib/admin-storefronts";
import {
  categoryWithDescendants,
  orderCategoryTree
} from "@/lib/admin-categories";

async function requireAdmin() {
  const authClient = await createClient();

  const {
    data: { user },
    error
  } = await authClient.auth.getUser();

  if (error || !user) {
    redirect("/admin/login");
  }

  return user;
}

function requiredText(formData, fieldName) {
  return String(formData.get(fieldName) || "").trim();
}

function optionalText(formData, fieldName) {
  const value = String(formData.get(fieldName) || "").trim();
  return value || null;
}

function normalizeIdentifier(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function getStorefrontFromForm(formData) {
  const storefrontSlug = requiredText(formData, "storefrontSlug");
  const storefrontId = requiredText(formData, "storefrontId");
  const storefront = getAdminStorefront(storefrontSlug);

  if (!storefront || storefront.id !== storefrontId) {
    throw new Error("Invalid storefront.");
  }

  return storefront;
}

function categoriesPath(storefront, query = "") {
  return `/admin/${storefront.slug}/categories${query}`;
}

function refreshCategoryPages(storefront) {
  const basePath = `/admin/${storefront.slug}`;

  revalidatePath(basePath);
  revalidatePath(`${basePath}/categories`);
  revalidatePath(`${basePath}/products`);
  revalidatePath(`${basePath}/products/new`);
  revalidatePath("/products");
}

async function loadCategories(supabase, storefrontId) {
  const { data, error } = await supabase
    .from("product_categories")
    .select("id, name, sort_order, parent_category_id")
    .eq("storefront", storefrontId);

  if (error) {
    throw new Error(error.message || "Unable to load categories.");
  }

  return data || [];
}

async function getCategoryById(supabase, categoryRecordId, storefrontId) {
  const { data, error } = await supabase
    .from("product_categories")
    .select("*")
    .eq("id", categoryRecordId)
    .eq("storefront", storefrontId)
    .maybeSingle();

  if (error) {
    throw new Error(error.message || "Unable to load category.");
  }

  if (!data) {
    throw new Error("Category was not found for this storefront.");
  }

  return data;
}

/**
 * Writes sort_order 1, 2, 3 … in tree order (each category followed by its
 * subcategories), so the store's list matches the admin. Only changed rows
 * are updated.
 */
async function saveTreeOrder(supabase, storefrontId, categories, saved = categories) {
  const ordered = orderCategoryTree(categories);
  // Compare with what is stored, not with the rearranged copy.
  const storedOrder = new Map(
    saved.map((category) => [category.id, Number(category.sort_order)])
  );

  for (let index = 0; index < ordered.length; index += 1) {
    const category = ordered[index];
    const sortOrder = index + 1;

    if (storedOrder.get(category.id) === sortOrder) {
      continue;
    }

    const { error } = await supabase
      .from("product_categories")
      .update({ sort_order: sortOrder })
      .eq("id", category.id)
      .eq("storefront", storefrontId);

    if (error) {
      throw new Error(error.message || "Unable to save category order.");
    }
  }
}

/** The parent from the form, checked: same store, and not itself or below itself. */
function readParentId(formData, categories, categoryRecordId = null) {
  const parentId = optionalText(formData, "parentCategoryId");

  if (!parentId) {
    return null;
  }

  if (!categories.some((category) => category.id === parentId)) {
    throw new Error("Choose a parent category from this store.");
  }

  if (
    categoryRecordId &&
    categoryWithDescendants(categories, categoryRecordId).has(parentId)
  ) {
    throw new Error("A category can't be placed inside itself or one of its subcategories.");
  }

  return parentId;
}

function friendlySaveError(error, fallback) {
  if (error?.code === "23505") {
    return new Error(
      "That category ID or URL slug is already in use. Category IDs and slugs must be unique across both stores."
    );
  }

  return new Error(error?.message || fallback);
}

async function createCategoryRecord(formData) {
  await requireAdmin();

  const storefront = getStorefrontFromForm(formData);
  const name = requiredText(formData, "name");
  const categoryId = normalizeIdentifier(requiredText(formData, "categoryId") || name);
  const slug = normalizeIdentifier(requiredText(formData, "slug") || categoryId);

  if (!name) {
    throw new Error("Category name is required.");
  }

  if (!categoryId) {
    throw new Error("Category ID is required.");
  }

  if (!slug) {
    throw new Error("Category slug is required.");
  }

  const supabase = createSupabaseAdmin();
  const categories = await loadCategories(supabase, storefront.id);
  const parentId = readParentId(formData, categories);

  const nextSortOrder =
    categories.reduce((max, category) => Math.max(max, Number(category.sort_order || 0)), 0) + 1;

  const { data: created, error } = await supabase
    .from("product_categories")
    .insert({
      category_id: categoryId,
      name,
      slug,
      description: optionalText(formData, "description"),
      parent_category_id: parentId,
      sort_order: nextSortOrder,
      is_active: formData.get("isActive") === "on",
      storefront: storefront.id
    })
    .select("id, name, sort_order, parent_category_id")
    .single();

  if (error) {
    console.error("Unable to create category:", error);
    throw friendlySaveError(error, "Unable to create category.");
  }

  // A new subcategory goes to the end of its parent's group.
  await saveTreeOrder(supabase, storefront.id, [...categories, created]);

  refreshCategoryPages(storefront);

  return { storefront, name };
}

async function updateCategoryRecord(formData) {
  await requireAdmin();

  const storefront = getStorefrontFromForm(formData);
  const categoryRecordId = requiredText(formData, "categoryRecordId");
  const name = requiredText(formData, "name");
  const categoryId = normalizeIdentifier(requiredText(formData, "categoryId"));
  const slug = normalizeIdentifier(requiredText(formData, "slug"));

  if (!categoryRecordId || !name || !categoryId || !slug) {
    throw new Error("Category name, ID, and URL slug are required.");
  }

  const supabase = createSupabaseAdmin();
  const existingCategory = await getCategoryById(supabase, categoryRecordId, storefront.id);
  const categories = await loadCategories(supabase, storefront.id);
  const parentId = readParentId(formData, categories, categoryRecordId);

  const { error } = await supabase
    .from("product_categories")
    .update({
      category_id: categoryId,
      name,
      slug,
      description: optionalText(formData, "description"),
      parent_category_id: parentId,
      is_active: formData.get("isActive") === "on"
    })
    .eq("id", categoryRecordId)
    .eq("storefront", storefront.id);

  if (error) {
    throw friendlySaveError(error, "Unable to update category.");
  }

  if (existingCategory.category_id !== categoryId) {
    const { error: productsUpdateError } = await supabase
      .from("products")
      .update({ category: categoryId })
      .eq("category", existingCategory.category_id)
      .eq("storefront", storefront.id)
      .is("deleted_at", null);

    if (productsUpdateError) {
      throw new Error(
        productsUpdateError.message || "Linked products could not be updated."
      );
    }
  }

  if ((existingCategory.parent_category_id || null) !== parentId) {
    // Moved under another parent: it joins the end of that group.
    await saveTreeOrder(
      supabase,
      storefront.id,
      categories.map((category) =>
        category.id === categoryRecordId
          ? { ...category, parent_category_id: parentId, sort_order: Number.MAX_SAFE_INTEGER }
          : category
      ),
      categories
    );
  }

  refreshCategoryPages(storefront);

  return { storefront, name };
}

/**
 * Add / Edit category dialog (useFormState). Returns { ok, message } or
 * { error } instead of leaving the page, so the dialog can show problems
 * such as a category ID that is already taken.
 */
export async function saveCategory(previousState, formData) {
  const editing = Boolean(requiredText(formData, "categoryRecordId"));

  try {
    const { name } = editing
      ? await updateCategoryRecord(formData)
      : await createCategoryRecord(formData);

    return {
      ok: true,
      message: editing ? `“${name}” saved.` : `“${name}” added.`,
      at: Date.now()
    };
  } catch (error) {
    // Let Next.js handle its own redirects (e.g. to the login page).
    if (String(error?.digest || "").startsWith("NEXT_REDIRECT")) {
      throw error;
    }

    return {
      ok: false,
      error: error?.message || "Unable to save category.",
      at: Date.now()
    };
  }
}

async function moveCategory(formData, direction) {
  await requireAdmin();

  const storefront = getStorefrontFromForm(formData);
  const categoryRecordId = requiredText(formData, "categoryRecordId");

  if (!categoryRecordId) {
    throw new Error("Category information is missing.");
  }

  const supabase = createSupabaseAdmin();
  const categories = await loadCategories(supabase, storefront.id);
  const ordered = orderCategoryTree(categories);
  const current = ordered.find((category) => category.id === categoryRecordId);

  if (!current) {
    throw new Error("Category was not found for this storefront.");
  }

  // Only categories with the same parent swap places.
  const siblings = ordered.filter((category) => category.parentKey === current.parentKey);
  const index = siblings.findIndex((category) => category.id === current.id);
  const target = siblings[direction === "up" ? index - 1 : index + 1];

  if (!target) {
    redirect(categoriesPath(storefront, direction === "up" ? "?position=first" : "?position=last"));
  }

  await saveTreeOrder(
    supabase,
    storefront.id,
    categories.map((category) => {
      if (category.id === current.id) {
        return { ...category, sort_order: target.sort_order };
      }

      if (category.id === target.id) {
        return { ...category, sort_order: current.sort_order };
      }

      return category;
    }),
    categories
  );

  refreshCategoryPages(storefront);
  redirect(categoriesPath(storefront, "?reordered=1"));
}

export async function moveCategoryUp(formData) {
  await moveCategory(formData, "up");
}

export async function moveCategoryDown(formData) {
  await moveCategory(formData, "down");
}

export async function deleteCategory(formData) {
  await requireAdmin();

  const storefront = getStorefrontFromForm(formData);
  const categoryRecordId = requiredText(formData, "categoryRecordId");

  if (!categoryRecordId) {
    throw new Error("Category information is missing.");
  }

  const supabase = createSupabaseAdmin();
  const category = await getCategoryById(supabase, categoryRecordId, storefront.id);

  const { count: productCount, error: productCheckError } = await supabase
    .from("products")
    .select("product_id", { count: "exact", head: true })
    .eq("category", category.category_id)
    .eq("storefront", storefront.id)
    .is("deleted_at", null);

  if (productCheckError) {
    throw new Error(productCheckError.message || "Unable to check category products.");
  }

  if (Number(productCount || 0) > 0) {
    redirect(categoriesPath(storefront, "?error=has-products"));
  }

  // Subcategories move up to the top level (the database sets their parent to empty).
  const { error } = await supabase
    .from("product_categories")
    .delete()
    .eq("id", categoryRecordId)
    .eq("storefront", storefront.id);

  if (error) {
    throw new Error(error.message || "Unable to delete category.");
  }

  const remaining = await loadCategories(supabase, storefront.id);
  await saveTreeOrder(
    supabase,
    storefront.id,
    remaining.map((item) =>
      item.parent_category_id === categoryRecordId
        ? { ...item, parent_category_id: null }
        : item
    )
  );

  refreshCategoryPages(storefront);
  redirect(categoriesPath(storefront, "?deleted=1"));
}
