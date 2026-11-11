import { notFound } from "next/navigation";
import { createSupabaseAdmin } from "@/lib/supabase-admin";
import { getAdminStorefront } from "@/lib/admin-storefronts";
import { orderCategoryTree } from "@/lib/admin-categories";
import CategoryManager from "@/components/admin/CategoryManager";

export const dynamic = "force-dynamic";

const NOTICES = {
  deleted: { tone: "success", text: "Category deleted." },
  reordered: { tone: "success", text: "Category order updated." }
};

function readNotice(query) {
  if (String(query.error || "") === "has-products") {
    return {
      tone: "error",
      text: "That category still has products. Move them to another category first, then delete it."
    };
  }

  if (query.position === "first") {
    return { tone: "info", text: "That category is already first in its group." };
  }

  if (query.position === "last") {
    return { tone: "info", text: "That category is already last in its group." };
  }

  const key = Object.keys(NOTICES).find((name) => String(query[name] || "") === "1");
  return key ? NOTICES[key] : null;
}

export default async function CategoriesPage({ params, searchParams }) {
  const resolvedParams = await Promise.resolve(params);
  const storefront = getAdminStorefront(resolvedParams.storefront);

  if (!storefront) {
    notFound();
  }

  const query = await Promise.resolve(searchParams || {});
  const supabase = createSupabaseAdmin();

  const [categoriesResult, productsResult] = await Promise.all([
    supabase
      .from("product_categories")
      .select("*")
      .eq("storefront", storefront.id)
      .order("sort_order", { ascending: true })
      .order("name", { ascending: true }),

    supabase
      .from("products")
      .select("product_id, title, category, status")
      .eq("storefront", storefront.id)
      .is("deleted_at", null)
      .order("title", { ascending: true })
  ]);

  if (categoriesResult.error) {
    throw new Error(categoriesResult.error.message || "Unable to load categories.");
  }

  if (productsResult.error) {
    throw new Error(productsResult.error.message || "Unable to load category products.");
  }

  const products = productsResult.data || [];
  const productCounts = products.reduce((counts, product) => {
    const key = product.category || "uncategorized";
    counts[key] = (counts[key] || 0) + 1;
    return counts;
  }, {});

  const ordered = orderCategoryTree(categoriesResult.data || []);
  const nameById = new Map(ordered.map((category) => [category.id, category.name]));

  // Position among categories with the same parent (what the arrows move).
  const siblingGroups = new Map();
  for (const category of ordered) {
    const group = siblingGroups.get(category.parentKey) || [];
    group.push(category.id);
    siblingGroups.set(category.parentKey, group);
  }

  const categories = ordered.map((category) => {
    const group = siblingGroups.get(category.parentKey) || [];

    return {
      id: category.id,
      categoryId: category.category_id,
      name: category.name,
      slug: category.slug,
      description: category.description || "",
      parentId: category.parent_category_id || "",
      parentName: category.parentKey ? nameById.get(category.parentKey) || "" : "",
      isActive: category.is_active !== false,
      depth: category.depth,
      position: group.indexOf(category.id) + 1,
      siblingCount: group.length,
      productCount: productCounts[category.category_id] || 0,
      childCount: ordered.filter((item) => item.parentKey === category.id).length
    };
  });

  return (
    <CategoryManager
      storefront={{ id: storefront.id, slug: storefront.slug, name: storefront.name }}
      categories={categories}
      products={products.map((product) => ({
        id: product.product_id,
        title: product.title || product.product_id,
        category: product.category || "",
        status: product.status || "draft"
      }))}
      notice={readNotice(query)}
      openAdd={String(query.new || "") === "1"}
    />
  );
}
