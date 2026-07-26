"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createSupabaseAdmin } from "@/lib/supabase-admin";

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
  return String(
    formData.get(fieldName) || ""
  ).trim();
}

function optionalText(formData, fieldName) {
  const value = String(
    formData.get(fieldName) || ""
  ).trim();

  return value || null;
}

function normalizeIdentifier(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function refreshCategoryPages() {
  revalidatePath("/admin");
  revalidatePath("/admin/categories");
  revalidatePath("/admin/products");
  revalidatePath("/admin/products/new");
  revalidatePath("/products");
}

async function getNextSortOrder(supabase) {
  const { data, error } = await supabase
    .from("product_categories")
    .select("sort_order")
    .order("sort_order", {
      ascending: false
    })
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error(
      "Unable to calculate category sort order:",
      error
    );

    throw new Error(
      error.message ||
        "Unable to calculate category position."
    );
  }

  return Number(data?.sort_order || 0) + 1;
}

async function getCategoryById(
  supabase,
  categoryRecordId
) {
  const { data, error } = await supabase
    .from("product_categories")
    .select("*")
    .eq("id", categoryRecordId)
    .maybeSingle();

  if (error) {
    throw new Error(
      error.message ||
        "Unable to load category."
    );
  }

  if (!data) {
    throw new Error(
      "Category was not found."
    );
  }

  return data;
}

async function normalizeCategorySortOrders(
  supabase
) {
  const { data, error } = await supabase
    .from("product_categories")
    .select("id, sort_order, name")
    .order("sort_order", {
      ascending: true
    })
    .order("name", {
      ascending: true
    });

  if (error) {
    throw new Error(
      error.message ||
        "Unable to normalize category order."
    );
  }

  const categories = data || [];

  for (
    let index = 0;
    index < categories.length;
    index += 1
  ) {
    const desiredSortOrder = index + 1;
    const category = categories[index];

    if (
      Number(category.sort_order) ===
      desiredSortOrder
    ) {
      continue;
    }

    const { error: updateError } =
      await supabase
        .from("product_categories")
        .update({
          sort_order: desiredSortOrder
        })
        .eq("id", category.id);

    if (updateError) {
      throw new Error(
        updateError.message ||
          "Unable to normalize category order."
      );
    }
  }
}

export async function createCategory(
  formData
) {
  await requireAdmin();

  const name = requiredText(
    formData,
    "name"
  );

  const categoryId =
    normalizeIdentifier(
      requiredText(
        formData,
        "categoryId"
      ) || name
    );

  const slug =
    normalizeIdentifier(
      requiredText(
        formData,
        "slug"
      ) || categoryId
    );

  if (!name) {
    throw new Error(
      "Category name is required."
    );
  }

  if (!categoryId) {
    throw new Error(
      "Category ID is required."
    );
  }

  if (!slug) {
    throw new Error(
      "Category slug is required."
    );
  }

  const supabase =
    createSupabaseAdmin();

  const nextSortOrder =
    await getNextSortOrder(supabase);

  const { error } = await supabase
    .from("product_categories")
    .insert({
      category_id: categoryId,
      name,
      slug,

      description: optionalText(
        formData,
        "description"
      ),

      parent_category_id:
        optionalText(
          formData,
          "parentCategoryId"
        ),

      sort_order: nextSortOrder,
      is_active: true
    });

  if (error) {
    console.error(
      "Unable to create category:",
      error
    );

    if (error.code === "23505") {
      throw new Error(
        "That category ID or slug is already in use."
      );
    }

    throw new Error(
      error.message ||
        "Unable to create category."
    );
  }

  refreshCategoryPages();

  redirect(
    "/admin/categories?created=1"
  );
}

export async function updateCategory(
  formData
) {
  await requireAdmin();

  const categoryRecordId =
    requiredText(
      formData,
      "categoryRecordId"
    );

  const name = requiredText(
    formData,
    "name"
  );

  const categoryId =
    normalizeIdentifier(
      requiredText(
        formData,
        "categoryId"
      )
    );

  const slug =
    normalizeIdentifier(
      requiredText(
        formData,
        "slug"
      )
    );

  if (
    !categoryRecordId ||
    !name ||
    !categoryId ||
    !slug
  ) {
    throw new Error(
      "Category ID, name, and slug are required."
    );
  }

  const supabase =
    createSupabaseAdmin();

  const existingCategory =
    await getCategoryById(
      supabase,
      categoryRecordId
    );

  const { error } = await supabase
    .from("product_categories")
    .update({
      category_id: categoryId,
      name,
      slug,

      description: optionalText(
        formData,
        "description"
      ),

      parent_category_id:
        optionalText(
          formData,
          "parentCategoryId"
        ),

      is_active:
        formData.get("isActive") === "on"
    })
    .eq("id", categoryRecordId);

  if (error) {
    console.error(
      "Unable to update category:",
      error
    );

    if (error.code === "23505") {
      throw new Error(
        "That category ID or slug is already in use."
      );
    }

    throw new Error(
      error.message ||
        "Unable to update category."
    );
  }

  if (
    existingCategory.category_id !==
    categoryId
  ) {
    const {
      error: productsUpdateError
    } = await supabase
      .from("products")
      .update({
        category: categoryId
      })
      .eq(
        "category",
        existingCategory.category_id
      )
      .is("deleted_at", null);

    if (productsUpdateError) {
      console.error(
        "Unable to update linked products:",
        productsUpdateError
      );

      const {
        error: rollbackError
      } = await supabase
        .from("product_categories")
        .update({
          category_id:
            existingCategory.category_id,
          name:
            existingCategory.name,
          slug:
            existingCategory.slug,
          description:
            existingCategory.description,
          parent_category_id:
            existingCategory.parent_category_id,
          is_active:
            existingCategory.is_active
        })
        .eq(
          "id",
          categoryRecordId
        );

      if (rollbackError) {
        console.error(
          "Unable to roll back category update:",
          rollbackError
        );
      }

      throw new Error(
        productsUpdateError.message ||
          "Linked products could not be updated."
      );
    }
  }

  refreshCategoryPages();

  redirect(
    "/admin/categories?updated=1"
  );
}

export async function moveCategoryUp(formData) {
  await requireAdmin();

  const categoryRecordId = requiredText(
    formData,
    "categoryRecordId"
  );

  if (!categoryRecordId) {
    throw new Error("Category information is missing.");
  }

  const supabase = createSupabaseAdmin();

  await normalizeCategorySortOrders(supabase);

  const currentCategory = await getCategoryById(
    supabase,
    categoryRecordId
  );

  const {
    data: previousCategory,
    error: previousError,
  } = await supabase
    .from("product_categories")
    .select("id, sort_order")
    .lt("sort_order", currentCategory.sort_order)
    .order("sort_order", {
      ascending: false,
    })
    .limit(1)
    .maybeSingle();

  if (previousError) {
    throw new Error(
      previousError.message || "Unable to move category."
    );
  }

  if (!previousCategory) {
    redirect("/admin/categories?position=first");
  }

  const temporarySortOrder = 0;

  const { error: tempError } = await supabase
    .from("product_categories")
    .update({
      sort_order: temporarySortOrder,
    })
    .eq("id", currentCategory.id);

  if (tempError) {
    throw new Error(tempError.message);
  }

  const { error: previousUpdateError } = await supabase
    .from("product_categories")
    .update({
      sort_order: currentCategory.sort_order,
    })
    .eq("id", previousCategory.id);

  if (previousUpdateError) {
    await supabase
      .from("product_categories")
      .update({
        sort_order: currentCategory.sort_order,
      })
      .eq("id", currentCategory.id);

    throw new Error(previousUpdateError.message);
  }

  const { error: currentUpdateError } = await supabase
    .from("product_categories")
    .update({
      sort_order: previousCategory.sort_order,
    })
    .eq("id", currentCategory.id);

  if (currentUpdateError) {
    await supabase
      .from("product_categories")
      .update({
        sort_order: previousCategory.sort_order,
      })
      .eq("id", previousCategory.id);

    await supabase
      .from("product_categories")
      .update({
        sort_order: currentCategory.sort_order,
      })
      .eq("id", currentCategory.id);

    throw new Error(currentUpdateError.message);
  }

  refreshCategoryPages();

  redirect("/admin/categories?reordered=1");
}

export async function moveCategoryDown(formData) {
  await requireAdmin();

  const categoryRecordId = requiredText(
    formData,
    "categoryRecordId"
  );

  if (!categoryRecordId) {
    throw new Error("Category information is missing.");
  }

  const supabase = createSupabaseAdmin();

  await normalizeCategorySortOrders(supabase);

  const currentCategory = await getCategoryById(
    supabase,
    categoryRecordId
  );

  const {
    data: nextCategory,
    error: nextError,
  } = await supabase
    .from("product_categories")
    .select("id, sort_order")
    .gt("sort_order", currentCategory.sort_order)
    .order("sort_order", {
      ascending: true,
    })
    .limit(1)
    .maybeSingle();

  if (nextError) {
    throw new Error(
      nextError.message || "Unable to move category."
    );
  }

  if (!nextCategory) {
    redirect("/admin/categories?position=last");
  }

  const temporarySortOrder = 0;

  const { error: tempError } = await supabase
    .from("product_categories")
    .update({
      sort_order: temporarySortOrder,
    })
    .eq("id", currentCategory.id);

  if (tempError) {
    throw new Error(tempError.message);
  }

  const { error: nextUpdateError } = await supabase
    .from("product_categories")
    .update({
      sort_order: currentCategory.sort_order,
    })
    .eq("id", nextCategory.id);

  if (nextUpdateError) {
    await supabase
      .from("product_categories")
      .update({
        sort_order: currentCategory.sort_order,
      })
      .eq("id", currentCategory.id);

    throw new Error(nextUpdateError.message);
  }

  const { error: currentUpdateError } = await supabase
    .from("product_categories")
    .update({
      sort_order: nextCategory.sort_order,
    })
    .eq("id", currentCategory.id);

  if (currentUpdateError) {
    await supabase
      .from("product_categories")
      .update({
        sort_order: nextCategory.sort_order,
      })
      .eq("id", nextCategory.id);

    await supabase
      .from("product_categories")
      .update({
        sort_order: currentCategory.sort_order,
      })
      .eq("id", currentCategory.id);

    throw new Error(currentUpdateError.message);
  }

  refreshCategoryPages();

  redirect("/admin/categories?reordered=1");
}

export async function deleteCategory(
  formData
) {
  await requireAdmin();

  const categoryRecordId =
    requiredText(
      formData,
      "categoryRecordId"
    );

  const categoryId =
    requiredText(
      formData,
      "categoryId"
    );

  if (
    !categoryRecordId ||
    !categoryId
  ) {
    throw new Error(
      "Category information is missing."
    );
  }

  const supabase =
    createSupabaseAdmin();

  const {
    count: productCount,
    error: productCheckError
  } = await supabase
    .from("products")
    .select("product_id", {
      count: "exact",
      head: true
    })
    .eq("category", categoryId)
    .is("deleted_at", null);

  if (productCheckError) {
    throw new Error(
      productCheckError.message ||
        "Unable to check category products."
    );
  }

  if (Number(productCount || 0) > 0) {
    throw new Error(
      "This category contains products. Move those products to another category before deleting it."
    );
  }

  const { error } = await supabase
    .from("product_categories")
    .delete()
    .eq("id", categoryRecordId);

  if (error) {
    throw new Error(
      error.message ||
        "Unable to delete category."
    );
  }

  await normalizeCategorySortOrders(
    supabase
  );

  refreshCategoryPages();

  redirect(
    "/admin/categories?deleted=1"
  );
}