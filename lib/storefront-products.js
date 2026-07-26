import { createSupabaseAdmin } from "@/lib/supabase-admin";
import { products as legacyProducts } from "@/lib/data";

const PRODUCT_IMAGE_BUCKET = "product-images";
const PLACEHOLDER_IMAGE =
  "/images/product-placeholder.png";

function createLegacyMap() {
  return new Map(
    legacyProducts.map((product) => [
      product.id,
      product
    ])
  );
}

function getPublicImageUrl(
  supabase,
  image,
  fallbackImage
) {
  if (!image) {
    return fallbackImage || PLACEHOLDER_IMAGE;
  }

  if (image.storage_path) {
    const bucket =
      image.storage_bucket ||
      PRODUCT_IMAGE_BUCKET;

    const { data } = supabase.storage
      .from(bucket)
      .getPublicUrl(image.storage_path);

    if (data?.publicUrl) {
      return data.publicUrl;
    }
  }

  if (image.public_url) {
    return image.public_url;
  }

  if (image.url) {
    return image.url;
  }

  return fallbackImage || PLACEHOLDER_IMAGE;
}

function buildProductImages({
  supabase,
  images,
  fallbackImage,
  productName
}) {
  const resolvedImages = (images || []).map(
    (image) => ({
      id: image.id,
      url: getPublicImageUrl(
        supabase,
        image,
        fallbackImage
      ),
      altText:
        image.alt_text ||
        productName ||
        "Product image",
      isPrimary: Boolean(image.is_primary),
      sortOrder: Number(
        image.sort_order || 0
      )
    })
  );

  const uniqueUrls = new Set();

  const uniqueImages =
    resolvedImages.filter((image) => {
      if (
        !image.url ||
        uniqueUrls.has(image.url)
      ) {
        return false;
      }

      uniqueUrls.add(image.url);
      return true;
    });

  if (
    fallbackImage &&
    !uniqueUrls.has(fallbackImage)
  ) {
    uniqueImages.push({
      id: "legacy-fallback",
      url: fallbackImage,
      altText:
        productName || "Product image",
      isPrimary: uniqueImages.length === 0,
      sortOrder: 9999
    });
  }

  return uniqueImages.sort(
    (first, second) => {
      if (
        first.isPrimary !==
        second.isPrimary
      ) {
        return first.isPrimary ? -1 : 1;
      }

      return (
        first.sortOrder -
        second.sortOrder
      );
    }
  );
}

function getCompareAtPrice(product) {
  /*
   * New schema:
   * compare_at_price is stored in dollars.
   */
  const dollarValue = Number(
    product.compare_at_price || 0
  );

  if (
    Number.isFinite(dollarValue) &&
    dollarValue > 0
  ) {
    return dollarValue;
  }

  /*
   * Compatibility with the previous
   * cents-based field, if it still exists.
   */
  const centsValue = Number(
    product.compare_at_price_cents || 0
  );

  if (
    Number.isFinite(centsValue) &&
    centsValue > 0
  ) {
    return centsValue / 100;
  }

  return null;
}

function mapDatabaseProduct({
  product,
  inventory,
  category,
  image,
  fallbackProduct,
  supabase
}) {
  const priceCents = Number(
    product.price_cents || 0
  );

  const stockQuantity = Number(
    inventory?.stock_quantity || 0
  );

  const reservedQuantity = Number(
    inventory?.reserved_quantity || 0
  );

  const availableStock = Math.max(
    stockQuantity - reservedQuantity,
    0
  );

  const imageUrl = getPublicImageUrl(
    supabase,
    image,
    fallbackProduct?.image
  );

  const featured = Boolean(
    product.featured ??
      product.is_featured ??
      false
  );

  const bestSeller = Boolean(
    product.best_seller ?? false
  );

  const newArrival = Boolean(
    product.new_arrival ?? false
  );

  const displayOrder = Number(
    product.display_order ?? 999
  );

  const compareAtPrice =
    getCompareAtPrice(product);

  const wholesaleAvailable = Boolean(
    product.wholesale_available ??
      product.allow_wholesale ??
      fallbackProduct?.wholesale ??
      true
  );

  const productStatus =
    product.status || "draft";

  const productIsActive =
    product.is_active !== false;

  const inventoryIsActive =
    inventory?.is_active !== false;

  return {
    id: product.product_id,
    productId: product.product_id,
    slug:
      product.slug ||
      product.product_id,
    sku: product.sku || null,

    name:
      product.title ||
      inventory?.product_name ||
      "Untitled Product",

    title:
      product.title ||
      inventory?.product_name ||
      "Untitled Product",

    category:
      category?.name ||
      product.category ||
      "Uncategorized",

    categoryId:
      product.category ||
      "uncategorized",

    categorySlug:
      category?.slug || null,

    subcategory:
      product.subcategory || null,

    image: imageUrl,

    subtitle:
      product.short_description ||
      fallbackProduct?.subtitle ||
      "Product details will be available soon.",

    shortDescription:
      product.description ||
      product.short_description ||
      fallbackProduct?.shortDescription ||
      "",

    description:
      product.description ||
      fallbackProduct?.shortDescription ||
      "",

    badge:
      product.weight_label ||
      product.pack_size ||
      fallbackProduct?.badge ||
      "Product",

    packSize:
      product.pack_size ||
      fallbackProduct?.packSize ||
      "",

    weightLabel:
      product.weight_label || null,

    unitLabel:
      product.unit_label || null,

    unitPrice:
      priceCents > 0
        ? priceCents / 100
        : null,

    price:
      priceCents > 0
        ? priceCents / 100
        : null,

    compareAtPrice,
    compare_at_price: compareAtPrice,

    currency:
      product.currency || "USD",

    canCheckout:
      productStatus === "active" &&
      productIsActive &&
      inventoryIsActive &&
      availableStock > 0 &&
      priceCents > 0,

    wholesale: wholesaleAvailable,
    wholesaleAvailable,
    wholesale_available:
      wholesaleAvailable,

    featured,
    isFeatured: featured,
    is_featured: featured,

    bestSeller,
    best_seller: bestSeller,
    isBestSeller: bestSeller,

    newArrival,
    new_arrival: newArrival,
    isNewArrival: newArrival,

    displayOrder,
    display_order: displayOrder,

    taxable: Boolean(
      product.taxable
    ),

    requiresShipping: Boolean(
      product.requires_shipping
    ),

    status: productStatus,

    createdAt:
      product.created_at || null,

    created_at:
      product.created_at || null,

    updatedAt:
      product.updated_at || null,

    updated_at:
      product.updated_at || null,

    bestFor:
      fallbackProduct?.bestFor || "",

    features:
      fallbackProduct?.features || [],

    seo: {
      title:
        product.seo_title ||
        fallbackProduct?.seo?.title ||
        product.title,

      description:
        product.seo_description ||
        fallbackProduct?.seo
          ?.description ||
        product.short_description ||
        "",

      keywords:
        fallbackProduct?.seo?.keywords ||
        []
    },

    inventory: {
      stock_quantity: stockQuantity,
      reserved_quantity:
        reservedQuantity,
      available_quantity:
        availableStock,
      low_stock_threshold: Number(
        inventory?.low_stock_threshold ||
          0
      ),
      is_active: inventoryIsActive
    },

    stockQuantity,
    stock_quantity: stockQuantity,
    reservedQuantity,
    reserved_quantity:
      reservedQuantity,
    availableQuantity:
      availableStock,
    inventoryQuantity:
      availableStock,
    inStock:
      inventoryIsActive &&
      availableStock > 0
  };
}

async function loadStorefrontData() {
  const supabase =
    createSupabaseAdmin();

  const [
    productsResult,
    inventoryResult,
    imagesResult,
    categoriesResult
  ] = await Promise.all([
    supabase
      .from("products")
      .select("*")
      .is("deleted_at", null)
      .eq("status", "active")
      .eq("is_active", true)
      .order("featured", {
        ascending: false
      })
      .order("display_order", {
        ascending: true
      })
      .order("best_seller", {
        ascending: false
      })
      .order("new_arrival", {
        ascending: false
      })
      .order("created_at", {
        ascending: false
      }),

    supabase
      .from("inventory")
      .select(`
        product_id,
        product_name,
        stock_quantity,
        reserved_quantity,
        low_stock_threshold,
        is_active
      `),

    supabase
      .from("product_images")
      .select("*")
      .eq("is_active", true)
      .order("is_primary", {
        ascending: false
      })
      .order("sort_order", {
        ascending: true
      }),

    supabase
      .from("product_categories")
      .select(`
        id,
        category_id,
        name,
        slug,
        sort_order,
        is_active
      `)
      .eq("is_active", true)
      .order("sort_order", {
        ascending: true
      })
  ]);

  if (productsResult.error) {
    console.error(
      "Unable to load storefront products:",
      productsResult.error
    );

    throw new Error(
      productsResult.error.message ||
        "Unable to load storefront products."
    );
  }

  if (inventoryResult.error) {
    console.error(
      "Unable to load storefront inventory:",
      inventoryResult.error
    );
  }

  if (imagesResult.error) {
    console.error(
      "Unable to load storefront images:",
      imagesResult.error
    );
  }

  if (categoriesResult.error) {
    console.error(
      "Unable to load storefront categories:",
      categoriesResult.error
    );
  }

  return {
    supabase,
    products:
      productsResult.data || [],
    inventory:
      inventoryResult.data || [],
    images:
      imagesResult.data || [],
    categories:
      categoriesResult.data || []
  };
}

export async function getStorefrontProducts() {
  const {
    supabase,
    products,
    inventory,
    images,
    categories
  } = await loadStorefrontData();

  const legacyById =
    createLegacyMap();

  const inventoryByProductId =
    new Map(
      inventory.map((item) => [
        item.product_id,
        item
      ])
    );

  const categoryById =
    new Map(
      categories.map((category) => [
        category.category_id,
        category
      ])
    );

  const imagesByProductId =
    new Map();

  for (const image of images) {
    const existingImages =
      imagesByProductId.get(
        image.product_id
      ) || [];

    existingImages.push(image);

    imagesByProductId.set(
      image.product_id,
      existingImages
    );
  }

  return products.map((product) => {
    const productId =
      product.product_id;

    const fallbackProduct =
      legacyById.get(productId) ||
      null;

    const databaseImages =
      imagesByProductId.get(
        productId
      ) || [];

    const productImages =
      buildProductImages({
        supabase,
        images: databaseImages,
        fallbackImage:
          fallbackProduct?.image ||
          null,
        productName:
          product.title
      });

    const mappedProduct =
      mapDatabaseProduct({
        product,
        inventory:
          inventoryByProductId.get(
            productId
          ) || null,
        category:
          categoryById.get(
            product.category
          ) || null,
        image:
          databaseImages[0] ||
          null,
        fallbackProduct,
        supabase
      });

    return {
      ...mappedProduct,
      image:
        productImages[0]?.url ||
        mappedProduct.image,
      images: productImages
    };
  });
}

export async function getStorefrontProductBySlug(
  slug
) {
  const products =
    await getStorefrontProducts();

  return (
    products.find(
      (product) =>
        product.slug === slug
    ) || null
  );
}

export async function getStorefrontCategories() {
  const supabase =
    createSupabaseAdmin();

  const { data, error } =
    await supabase
      .from("product_categories")
      .select(`
        id,
        category_id,
        name,
        slug,
        description,
        sort_order
      `)
      .eq("is_active", true)
      .order("sort_order", {
        ascending: true
      })
      .order("name", {
        ascending: true
      });

  if (error) {
    console.error(
      "Unable to load categories:",
      error
    );

    return [];
  }

  return data || [];
}