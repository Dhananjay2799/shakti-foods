import dotenv from "dotenv";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";
import { products } from "../lib/data.js";

// Calculate absolute path to project root and .env.local
const currentFilePath = fileURLToPath(
  import.meta.url
);

const currentDirectory = path.dirname(
  currentFilePath
);

const projectRoot = path.resolve(
  currentDirectory,
  ".."
);

const envResult = dotenv.config({
  path: path.join(
    projectRoot,
    ".env.local"
  )
});

if (envResult.error) {
  throw new Error(
    `Unable to load .env.local: ${envResult.error.message}`
  );
}

const supabaseUrl =
  process.env.NEXT_PUBLIC_SUPABASE_URL;

const serviceRoleKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl) {
  throw new Error(
    "NEXT_PUBLIC_SUPABASE_URL is missing from .env.local."
  );
}

if (!serviceRoleKey) {
  throw new Error(
    "SUPABASE_SERVICE_ROLE_KEY is missing from .env.local."
  );
}

const supabase = createClient(
  supabaseUrl,
  serviceRoleKey,
  {
    auth: {
      persistSession: false,
      autoRefreshToken: false
    }
  }
);

function normalizeCategory(category) {
  const value = String(
    category || "uncategorized"
  )
    .trim()
    .toLowerCase();

  if (value === "ecoware") {
    return "tableware";
  }

  if (value === "rice") {
    return "rice";
  }

  return value
    .replace(/[^a-z0-9_-]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function priceToCents(value) {
  const amount = Number(value);

  if (!Number.isFinite(amount)) {
    return 0;
  }

  return Math.round(amount * 100);
}

/**
 * Returns a valid positive number or null.
 */
function optionalPositiveNumber(value) {
  if (
    value === null ||
    value === undefined ||
    value === ""
  ) {
    return null;
  }

  const number = Number(value);

  if (
    !Number.isFinite(number) ||
    number <= 0
  ) {
    return null;
  }

  return number;
}

function getWeightLabel(product) {
  if (
    product.category === "Rice" &&
    product.badge
  ) {
    return product.badge;
  }

  return null;
}

function getPackSize(product) {
  return (
    product.packSize ||
    product.badge ||
    null
  );
}

/**
 * Supports either:
 *
 * product.shipping.weightLb
 * product.shipping.lengthIn
 * product.shipping.widthIn
 * product.shipping.heightIn
 *
 * or:
 *
 * product.shippingWeightLb
 * product.shippingLengthIn
 * product.shippingWidthIn
 * product.shippingHeightIn
 */
function getShippingMeasurements(product) {
  return {
    weight:
      optionalPositiveNumber(
        product.shipping?.weightLb
      ) ??
      optionalPositiveNumber(
        product.shippingWeightLb
      ),

    length:
      optionalPositiveNumber(
        product.shipping?.lengthIn
      ) ??
      optionalPositiveNumber(
        product.shippingLengthIn
      ),

    width:
      optionalPositiveNumber(
        product.shipping?.widthIn
      ) ??
      optionalPositiveNumber(
        product.shippingWidthIn
      ),

    height:
      optionalPositiveNumber(
        product.shipping?.heightIn
      ) ??
      optionalPositiveNumber(
        product.shippingHeightIn
      )
  };
}

/**
 * Only includes shipping columns when a valid
 * measurement exists in lib/data.js.
 *
 * This prevents rerunning the migration from
 * replacing existing database measurements
 * with null.
 */
function buildShippingPayload(product) {
  const shipping =
    getShippingMeasurements(product);

  const payload = {};

  if (shipping.weight !== null) {
    payload.shipping_weight_lb =
      shipping.weight;
  }

  if (shipping.length !== null) {
    payload.shipping_length_in =
      shipping.length;
  }

  if (shipping.width !== null) {
    payload.shipping_width_in =
      shipping.width;
  }

  if (shipping.height !== null) {
    payload.shipping_height_in =
      shipping.height;
  }

  return payload;
}

async function ensureCategory({
  categoryId,
  categoryName,
  sortOrder
}) {
  const slug = categoryId;

  const { error } = await supabase
    .from("product_categories")
    .upsert(
      {
        category_id: categoryId,
        name: categoryName,
        slug,
        description:
          categoryId === "rice"
            ? "Premium basmati rice products."
            : "Compostable foodservice tableware and packaging.",
        sort_order: sortOrder,
        is_active: true
      },
      {
        onConflict: "category_id"
      }
    );

  if (error) {
    throw new Error(
      `Unable to create category ${categoryId}: ${error.message}`
    );
  }
}

async function migrateProduct(product) {
  const productId = product.id;

  const categoryId =
    normalizeCategory(product.category);

  const shippingPayload =
    buildShippingPayload(product);

  const productPayload = {
    product_id: productId,
    slug: product.slug,
    sku: null,
    title: product.name,

    short_description:
      product.subtitle || null,

    description:
      product.shortDescription ||
      product.subtitle ||
      null,

    category: categoryId,
    subcategory: null,

    price_cents:
      priceToCents(product.unitPrice),

    compare_at_price_cents: null,
    cost_cents: null,
    currency: "USD",

    pack_size:
      getPackSize(product),

    unit_label:
      product.category === "Rice"
        ? "bag"
        : "pack",

    weight_label:
      getWeightLabel(product),

    status: "active",
    is_active: true,

    is_featured:
      product.id === "rice-20",

    taxable: true,
    requires_shipping: true,

    seo_title:
      product.seo?.title ||
      product.name,

    seo_description:
      product.seo?.description ||
      product.subtitle ||
      null,

    deleted_at: null,
    archived_at: null,

    // Add shipping fields only when present.
    ...shippingPayload
  };

  const { error: productError } =
    await supabase
      .from("products")
      .upsert(productPayload, {
        onConflict: "product_id"
      });

  if (productError) {
    throw new Error(
      `Unable to migrate ${productId}: ${productError.message}`
    );
  }

  /*
   * Safe inventory check:
   * do not overwrite stock if inventory
   * already exists.
   */
  const {
    data: existingInventory,
    error: inventoryReadError
  } = await supabase
    .from("inventory")
    .select("product_id")
    .eq("product_id", productId)
    .maybeSingle();

  if (inventoryReadError) {
    throw new Error(
      `Unable to check inventory for ${productId}: ${inventoryReadError.message}`
    );
  }

  if (!existingInventory) {
    const {
      error: inventoryError
    } = await supabase
      .from("inventory")
      .insert({
        product_id: productId,
        product_name: product.name,
        stock_quantity: 100,
        reserved_quantity: 0,
        low_stock_threshold: 10,
        is_active: true
      });

    if (inventoryError) {
      throw new Error(
        `Unable to migrate inventory for ${productId}: ${inventoryError.message}`
      );
    }
  }

  /*
   * Existing catalog images are served
   * via public/images using lib/data.js
   * fallbacks.
   *
   * Images managed dynamically through
   * Admin are inserted into product_images.
   */

  const shippingFieldCount =
    Object.keys(shippingPayload).length;

  if (shippingFieldCount > 0) {
    console.log(
      `Migrated: ${productId} with shipping measurements`
    );
  } else {
    console.log(
      `Migrated: ${productId}`
    );
  }
}

async function run() {
  console.log(
    `Starting migration for ${products.length} products...`
  );

  await ensureCategory({
    categoryId: "rice",
    categoryName: "Rice",
    sortOrder: 1
  });

  await ensureCategory({
    categoryId: "tableware",
    categoryName:
      "Eco-Friendly Tableware",
    sortOrder: 2
  });

  for (const product of products) {
    await migrateProduct(product);
  }

  console.log(
    "Static product migration completed."
  );
}

run().catch((error) => {
  console.error(
    "Migration failed:",
    error
  );

  process.exit(1);
});