/*
 * Category tree helpers for the admin Categories page and its actions.
 *
 * Categories are shown as a tree: each top-level category is followed by
 * its subcategories. sort_order is kept in that same order (1, 2, 3 …), so
 * the store's flat category list matches what the admin sees. The arrows
 * move a category among the categories that share its parent.
 */

function compareCategories(a, b) {
  return (
    Number(a.sort_order || 0) - Number(b.sort_order || 0) ||
    String(a.name || "").localeCompare(String(b.name || ""))
  );
}

/**
 * Categories in tree order. Each entry gets `depth` (0 = top level) and
 * `parentKey` (the parent's id, or null when it has no parent in this
 * list). A missing parent or a loop never hides a category.
 */
export function orderCategoryTree(categories = []) {
  const byId = new Map(categories.map((category) => [category.id, category]));
  const children = new Map();
  const roots = [];

  for (const category of categories) {
    const parentId = category.parent_category_id;
    const hasParent = parentId && parentId !== category.id && byId.has(parentId);

    if (hasParent) {
      if (!children.has(parentId)) {
        children.set(parentId, []);
      }
      children.get(parentId).push(category);
    } else {
      roots.push(category);
    }
  }

  const ordered = [];
  const visited = new Set();

  function visit(category, depth, parentKey) {
    if (visited.has(category.id)) {
      return;
    }

    visited.add(category.id);
    ordered.push({ ...category, depth, parentKey });

    [...(children.get(category.id) || [])]
      .sort(compareCategories)
      .forEach((child) => visit(child, depth + 1, category.id));
  }

  [...roots].sort(compareCategories).forEach((root) => visit(root, 0, null));

  // Categories caught in a parent loop: show them at the top level.
  [...categories]
    .filter((category) => !visited.has(category.id))
    .sort(compareCategories)
    .forEach((category) => visit(category, 0, null));

  return ordered;
}

/** The ids of a category and every category below it. */
export function categoryWithDescendants(categories = [], categoryId) {
  const ids = new Set([categoryId]);
  let added = true;

  while (added) {
    added = false;

    for (const category of categories) {
      if (
        category.parent_category_id &&
        ids.has(category.parent_category_id) &&
        !ids.has(category.id)
      ) {
        ids.add(category.id);
        added = true;
      }
    }
  }

  return ids;
}
