"use client";

import { useMemo, useState } from "react";
import ProductGrid from "@/components/ProductGrid";

function normalize(value) {
  return String(value ?? "")
    .trim()
    .toLowerCase();
}

function getCategory(product) {
  return (
    product.category ||
    product.categoryName ||
    product.productCategory ||
    ""
  );
}

function getPackSize(product) {
  return (
    product.packSize ||
    product.pack_size ||
    product.weightLabel ||
    product.size ||
    ""
  );
}

function getProductPrice(product) {
  const possiblePrices = [
    product.price,
    product.salePrice,
    product.sale_price,
    product.retailPrice,
    product.retail_price
  ];

  const value = possiblePrices.find(
    (item) =>
      item !== undefined &&
      item !== null &&
      item !== ""
  );

  const price = Number(value);

  return Number.isFinite(price) ? price : 0;
}

function getStockQuantity(product) {
  const possibleValues = [
    product.stockQuantity,
    product.stock_quantity,
    product.quantity,
    product.inventoryQuantity,
    product.inventory_quantity,
    product.inventory?.quantity,
    product.inventory?.stock_quantity
  ];

  const value = possibleValues.find(
    (item) =>
      item !== undefined &&
      item !== null &&
      item !== ""
  );

  if (value === undefined) {
    return null;
  }

  const quantity = Number(value);

  return Number.isFinite(quantity)
    ? quantity
    : null;
}

function getAvailability(product) {
  const quantity = getStockQuantity(product);

  if (quantity !== null) {
    if (quantity <= 0) {
      return "out-of-stock";
    }

    if (quantity <= 5) {
      return "low-stock";
    }

    return "in-stock";
  }

  const availability = normalize(
    product.availability ||
      product.stockStatus ||
      product.stock_status
  );

  if (
    availability.includes("out") ||
    product.inStock === false ||
    product.in_stock === false
  ) {
    return "out-of-stock";
  }

  if (availability.includes("low")) {
    return "low-stock";
  }

  return "in-stock";
}

function hasWholesale(product) {
  return Boolean(
    product.wholesaleAvailable ??
      product.wholesale_available ??
      product.allowWholesale ??
      product.allow_wholesale ??
      product.isWholesale ??
      product.is_wholesale
  );
}

function isBestSeller(product) {
  const badge = normalize(product.badge);

  return Boolean(
    product.bestSeller ||
      product.best_seller ||
      product.isBestSeller ||
      product.is_best_seller ||
      badge.includes("best seller")
  );
}

function isNewArrival(product) {
  const badge = normalize(product.badge);

  return Boolean(
    product.newArrival ||
      product.new_arrival ||
      product.isNewArrival ||
      product.is_new_arrival ||
      badge.includes("new arrival") ||
      badge === "new"
  );
}

function getCreatedTime(product) {
  const dateValue =
    product.createdAt ||
    product.created_at ||
    product.publishedAt ||
    product.published_at ||
    product.updatedAt ||
    product.updated_at;

  if (!dateValue) {
    return 0;
  }

  const time = new Date(dateValue).getTime();

  return Number.isFinite(time) ? time : 0;
}

function getDisplayOrder(product) {
  const value =
    product.displayOrder ??
    product.display_order ??
    product.sortOrder ??
    product.sort_order ??
    999999;

  const number = Number(value);

  return Number.isFinite(number)
    ? number
    : 999999;
}

function getSalesCount(product) {
  const value =
    product.salesCount ??
    product.sales_count ??
    product.totalSold ??
    product.total_sold ??
    product.orderCount ??
    product.order_count ??
    0;

  const number = Number(value);

  return Number.isFinite(number) ? number : 0;
}

function getProductName(product) {
  return String(
    product.name ||
      product.title ||
      ""
  );
}

function FilterCheckbox({
  label,
  checked,
  onChange,
  count
}) {
  return (
    <label className="flex cursor-pointer items-center justify-between gap-4 rounded-xl px-3 py-2 transition hover:bg-black/5">
      <span className="flex items-center gap-3">
        <input
          type="checkbox"
          checked={checked}
          onChange={onChange}
          className="h-4 w-4 rounded border-black/30 accent-black"
        />

        <span className="text-sm font-semibold text-black">
          {label}
        </span>
      </span>

      {typeof count === "number" ? (
        <span className="rounded-full bg-black/5 px-2 py-1 text-xs font-bold text-black/60">
          {count}
        </span>
      ) : null}
    </label>
  );
}

export default function ProductCatalogSearch({
  products = []
}) {
  const [query, setQuery] = useState("");
  const [sortBy, setSortBy] =
    useState("featured");

  const [
    selectedCategories,
    setSelectedCategories
  ] = useState([]);

  const [
    selectedPackSizes,
    setSelectedPackSizes
  ] = useState([]);

  const [
    selectedAvailability,
    setSelectedAvailability
  ] = useState([]);

  const [wholesaleOnly, setWholesaleOnly] =
    useState(false);

  const [bestSellerOnly, setBestSellerOnly] =
    useState(false);

  const [newArrivalOnly, setNewArrivalOnly] =
    useState(false);

  const [
    mobileFiltersOpen,
    setMobileFiltersOpen
  ] = useState(false);

  const categories = useMemo(() => {
    return Array.from(
      new Set(
        products
          .map(getCategory)
          .filter(Boolean)
      )
    ).sort((a, b) =>
      a.localeCompare(b)
    );
  }, [products]);

  const packSizes = useMemo(() => {
    return Array.from(
      new Set(
        products
          .map(getPackSize)
          .filter(Boolean)
      )
    ).sort((a, b) =>
      a.localeCompare(b, undefined, {
        numeric: true
      })
    );
  }, [products]);

  const normalizedQuery = normalize(query);

  const filteredProducts = useMemo(() => {
    return products.filter((product) => {
      const category = getCategory(product);
      const packSize = getPackSize(product);
      const availability =
        getAvailability(product);

      const searchableContent = [
        product.name,
        product.title,
        category,
        product.subcategory,
        product.subtitle,
        product.shortDescription,
        product.short_description,
        product.description,
        packSize,
        product.weightLabel,
        product.unitLabel,
        product.badge,
        product.sku
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      const matchesSearch =
        !normalizedQuery ||
        searchableContent.includes(
          normalizedQuery
        );

      const matchesCategory =
        selectedCategories.length === 0 ||
        selectedCategories.includes(category);

      const matchesPackSize =
        selectedPackSizes.length === 0 ||
        selectedPackSizes.includes(packSize);

      const matchesAvailability =
        selectedAvailability.length === 0 ||
        selectedAvailability.includes(
          availability
        );

      const matchesWholesale =
        !wholesaleOnly ||
        hasWholesale(product);

      const matchesBestSeller =
        !bestSellerOnly ||
        isBestSeller(product);

      const matchesNewArrival =
        !newArrivalOnly ||
        isNewArrival(product);

      return (
        matchesSearch &&
        matchesCategory &&
        matchesPackSize &&
        matchesAvailability &&
        matchesWholesale &&
        matchesBestSeller &&
        matchesNewArrival
      );
    });
  }, [
    products,
    normalizedQuery,
    selectedCategories,
    selectedPackSizes,
    selectedAvailability,
    wholesaleOnly,
    bestSellerOnly,
    newArrivalOnly
  ]);

  const sortedProducts = useMemo(() => {
    const sorted = [...filteredProducts];

    switch (sortBy) {
      case "best-selling":
        return sorted.sort((a, b) => {
          const bestSellerDifference =
            Number(isBestSeller(b)) -
            Number(isBestSeller(a));

          if (bestSellerDifference !== 0) {
            return bestSellerDifference;
          }

          return (
            getSalesCount(b) -
            getSalesCount(a)
          );
        });

      case "price-low-high":
        return sorted.sort(
          (a, b) =>
            getProductPrice(a) -
            getProductPrice(b)
        );

      case "price-high-low":
        return sorted.sort(
          (a, b) =>
            getProductPrice(b) -
            getProductPrice(a)
        );

      case "name-a-z":
        return sorted.sort((a, b) =>
          getProductName(a).localeCompare(
            getProductName(b)
          )
        );

      case "name-z-a":
        return sorted.sort((a, b) =>
          getProductName(b).localeCompare(
            getProductName(a)
          )
        );

      case "newest":
        return sorted.sort(
          (a, b) =>
            getCreatedTime(b) -
            getCreatedTime(a)
        );

      case "featured":
      default:
        return sorted.sort((a, b) => {
          const orderDifference =
            getDisplayOrder(a) -
            getDisplayOrder(b);

          if (orderDifference !== 0) {
            return orderDifference;
          }

          const bestSellerDifference =
            Number(isBestSeller(b)) -
            Number(isBestSeller(a));

          if (bestSellerDifference !== 0) {
            return bestSellerDifference;
          }

          return getProductName(
            a
          ).localeCompare(
            getProductName(b)
          );
        });
    }
  }, [filteredProducts, sortBy]);

  const categoryCounts = useMemo(() => {
    return Object.fromEntries(
      categories.map((category) => [
        category,
        products.filter(
          (product) =>
            getCategory(product) === category
        ).length
      ])
    );
  }, [categories, products]);

  const packSizeCounts = useMemo(() => {
    return Object.fromEntries(
      packSizes.map((packSize) => [
        packSize,
        products.filter(
          (product) =>
            getPackSize(product) === packSize
        ).length
      ])
    );
  }, [packSizes, products]);

  const availabilityCounts =
    useMemo(() => {
      return products.reduce(
        (counts, product) => {
          const status =
            getAvailability(product);

          counts[status] += 1;

          return counts;
        },
        {
          "in-stock": 0,
          "low-stock": 0,
          "out-of-stock": 0
        }
      );
    }, [products]);

  const activeFilterCount =
    selectedCategories.length +
    selectedPackSizes.length +
    selectedAvailability.length +
    Number(wholesaleOnly) +
    Number(bestSellerOnly) +
    Number(newArrivalOnly);

  function toggleArrayValue(
    value,
    setter
  ) {
    setter((currentValues) =>
      currentValues.includes(value)
        ? currentValues.filter(
            (item) => item !== value
          )
        : [...currentValues, value]
    );
  }

  function clearFilters() {
    setSelectedCategories([]);
    setSelectedPackSizes([]);
    setSelectedAvailability([]);
    setWholesaleOnly(false);
    setBestSellerOnly(false);
    setNewArrivalOnly(false);
  }

  function clearEverything() {
    setQuery("");
    setSortBy("featured");
    clearFilters();
  }

  const filters = (
    <div className="space-y-6">
      {categories.length > 1 ? (
        <div>
          <h3 className="mb-2 text-sm font-black uppercase tracking-[0.16em] text-black/50">
            Product type
          </h3>

          <div className="space-y-1">
            {categories.map((category) => (
              <FilterCheckbox
                key={category}
                label={category}
                count={
                  categoryCounts[category]
                }
                checked={selectedCategories.includes(
                  category
                )}
                onChange={() =>
                  toggleArrayValue(
                    category,
                    setSelectedCategories
                  )
                }
              />
            ))}
          </div>
        </div>
      ) : null}

      <div className="border-t border-black/10 pt-6">
        <h3 className="mb-2 text-sm font-black uppercase tracking-[0.16em] text-black/50">
          Availability
        </h3>

        <div className="space-y-1">
          <FilterCheckbox
            label="In stock"
            count={
              availabilityCounts[
                "in-stock"
              ]
            }
            checked={selectedAvailability.includes(
              "in-stock"
            )}
            onChange={() =>
              toggleArrayValue(
                "in-stock",
                setSelectedAvailability
              )
            }
          />

          <FilterCheckbox
            label="Low stock"
            count={
              availabilityCounts[
                "low-stock"
              ]
            }
            checked={selectedAvailability.includes(
              "low-stock"
            )}
            onChange={() =>
              toggleArrayValue(
                "low-stock",
                setSelectedAvailability
              )
            }
          />

          <FilterCheckbox
            label="Out of stock"
            count={
              availabilityCounts[
                "out-of-stock"
              ]
            }
            checked={selectedAvailability.includes(
              "out-of-stock"
            )}
            onChange={() =>
              toggleArrayValue(
                "out-of-stock",
                setSelectedAvailability
              )
            }
          />
        </div>
      </div>

      {packSizes.length > 0 ? (
        <div className="border-t border-black/10 pt-6">
          <h3 className="mb-2 text-sm font-black uppercase tracking-[0.16em] text-black/50">
            Pack size
          </h3>

          <div className="max-h-64 space-y-1 overflow-y-auto pr-1">
            {packSizes.map((packSize) => (
              <FilterCheckbox
                key={packSize}
                label={packSize}
                count={
                  packSizeCounts[packSize]
                }
                checked={selectedPackSizes.includes(
                  packSize
                )}
                onChange={() =>
                  toggleArrayValue(
                    packSize,
                    setSelectedPackSizes
                  )
                }
              />
            ))}
          </div>
        </div>
      ) : null}

      <div className="border-t border-black/10 pt-6">
        <h3 className="mb-2 text-sm font-black uppercase tracking-[0.16em] text-black/50">
          Shopping options
        </h3>

        <div className="space-y-1">
          <FilterCheckbox
            label="Wholesale available"
            checked={wholesaleOnly}
            onChange={() =>
              setWholesaleOnly(
                (current) => !current
              )
            }
          />

          <FilterCheckbox
            label="Best sellers"
            checked={bestSellerOnly}
            onChange={() =>
              setBestSellerOnly(
                (current) => !current
              )
            }
          />

          <FilterCheckbox
            label="New arrivals"
            checked={newArrivalOnly}
            onChange={() =>
              setNewArrivalOnly(
                (current) => !current
              )
            }
          />
        </div>
      </div>

      {activeFilterCount > 0 ? (
        <button
          type="button"
          onClick={clearFilters}
          className="w-full rounded-full border border-black px-5 py-3 text-sm font-bold text-black transition hover:bg-black hover:text-white"
        >
          Clear Filters
        </button>
      ) : null}
    </div>
  );

  return (
    <section className="pb-16 md:pb-24">
      <div className="container-brand">
        <div className="rounded-[2rem] bg-white p-4 shadow-soft md:p-6">
          <div className="relative">
            <label
              htmlFor="product-search"
              className="sr-only"
            >
              Search products
            </label>

            <span
              aria-hidden="true"
              className="pointer-events-none absolute left-5 top-1/2 -translate-y-1/2 text-lg"
            >
              🔍
            </span>

            <input
              id="product-search"
              type="search"
              value={query}
              onChange={(event) =>
                setQuery(event.target.value)
              }
              placeholder="Search Basmati rice, plates, bowls, trays..."
              autoComplete="off"
              className="h-14 w-full rounded-2xl border border-black/15 bg-[#f8f4ed] pl-12 pr-24 text-base text-black shadow-sm outline-none transition placeholder:text-black/50 focus:border-black focus:ring-2 focus:ring-black/10"
            />

            {query ? (
              <button
                type="button"
                onClick={() => setQuery("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full px-4 py-2 text-sm font-bold transition hover:bg-black/10"
              >
                Clear
              </button>
            ) : null}
          </div>

          <div className="mt-5 flex flex-wrap items-center justify-between gap-4">
            <p
              className="text-sm text-black/70"
              aria-live="polite"
            >
              Showing{" "}
              <strong className="text-black">
                {sortedProducts.length}
              </strong>{" "}
              of{" "}
              <strong className="text-black">
                {products.length}
              </strong>{" "}
              products
            </p>

            <div className="flex flex-wrap items-center gap-3">
              <label
                htmlFor="product-sort"
                className="text-sm font-bold text-black"
              >
                Sort by
              </label>

              <select
                id="product-sort"
                value={sortBy}
                onChange={(event) =>
                  setSortBy(event.target.value)
                }
                className="min-w-[190px] rounded-full border border-black/15 bg-[#f8f4ed] px-5 py-3 text-sm font-bold text-black outline-none transition focus:border-black focus:ring-2 focus:ring-black/10"
              >
                <option value="featured">
                  Featured
                </option>

                <option value="best-selling">
                  Best Selling
                </option>

                <option value="price-low-high">
                  Price: Low to High
                </option>

                <option value="price-high-low">
                  Price: High to Low
                </option>

                <option value="name-a-z">
                  Name: A to Z
                </option>

                <option value="name-z-a">
                  Name: Z to A
                </option>

                <option value="newest">
                  Newest
                </option>
              </select>

              <button
                type="button"
                onClick={() =>
                  setMobileFiltersOpen(
                    (current) => !current
                  )
                }
                className="rounded-full bg-black px-5 py-3 text-sm font-bold text-white lg:hidden"
              >
                Filters
                {activeFilterCount > 0
                  ? ` (${activeFilterCount})`
                  : ""}
              </button>
            </div>
          </div>

          {mobileFiltersOpen ? (
            <div className="mt-6 border-t border-black/10 pt-6 lg:hidden">
              {filters}
            </div>
          ) : null}
        </div>

        <div className="mt-8 grid gap-8 lg:grid-cols-[250px_minmax(0,1fr)]">
          <aside className="hidden self-start rounded-[2rem] bg-white p-6 shadow-soft lg:sticky lg:top-28 lg:block">
            <div className="mb-6 flex items-center justify-between gap-3">
              <h2 className="font-display text-2xl font-bold">
                Filters
              </h2>

              {activeFilterCount > 0 ? (
                <span className="rounded-full bg-black px-3 py-1 text-xs font-bold text-white">
                  {activeFilterCount}
                </span>
              ) : null}
            </div>

            {filters}
          </aside>

          <div className="min-w-0">
            {sortedProducts.length > 0 ? (
              <ProductGrid
                products={sortedProducts}
              />
            ) : (
              <div className="rounded-[2rem] bg-white px-6 py-16 text-center shadow-soft">
                <div className="text-4xl">
                  📦
                </div>

                <h2 className="mt-4 font-display text-3xl font-bold">
                  No products found
                </h2>

                <p className="mx-auto mt-3 max-w-xl leading-7 text-black/70">
                  No products match your current
                  search and filters. Try another
                  keyword or remove one of the
                  selected filters.
                </p>

                <button
                  type="button"
                  onClick={clearEverything}
                  className="mt-6 rounded-full bg-black px-6 py-3 font-bold text-white transition hover:bg-[#333333]"
                >
                  Clear Search and Filters
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}