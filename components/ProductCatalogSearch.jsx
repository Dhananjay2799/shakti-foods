"use client";

import { useMemo, useState } from "react";
import {
  ChevronDown,
  Search,
  SlidersHorizontal
} from "lucide-react";

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
    product.unitPrice,
    product.unit_price,
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
    <label
      className="
        group
        flex
        cursor-pointer
        items-center
        justify-between
        gap-4
        rounded-xl
        px-2
        py-2
        transition
        hover:bg-[#fff8ed]
      "
    >
      <span className="flex min-w-0 items-center gap-3">
        <input
          type="checkbox"
          checked={checked}
          onChange={onChange}
          className="
            h-[17px]
            w-[17px]
            shrink-0
            rounded
            border-[#bcb1a4]
            accent-[#d1081b]
          "
        />

        <span
          className="
            text-[13px]
            font-semibold
            text-[#332c27]
          "
        >
          {label}
        </span>
      </span>

      {typeof count === "number" ? (
        <span
          className="
            rounded-full
            bg-[#f5eee4]
            px-2
            py-1
            text-[10px]
            font-bold
            text-[#766d64]
          "
        >
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
  const [sortBy, setSortBy] = useState("featured");

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

  const [wholesaleOnly, setWholesaleOnly] = useState(false);
  const [bestSellerOnly, setBestSellerOnly] = useState(false);
  const [newArrivalOnly, setNewArrivalOnly] = useState(false);

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
      const availability = getAvailability(product);

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
        selectedAvailability.includes(availability);

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

          return getProductName(a).localeCompare(
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

  const availabilityCounts = useMemo(() => {
    return products.reduce(
      (counts, product) => {
        const status = getAvailability(product);
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

  function toggleArrayValue(value, setter) {
    setter((currentValues) =>
      currentValues.includes(value)
        ? currentValues.filter((item) => item !== value)
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
                count={categoryCounts[category]}
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
            count={availabilityCounts["in-stock"]}
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
            count={availabilityCounts["low-stock"]}
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
            count={availabilityCounts["out-of-stock"]}
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
                count={packSizeCounts[packSize]}
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
              setWholesaleOnly((current) => !current)
            }
          />

          <FilterCheckbox
            label="Best sellers"
            checked={bestSellerOnly}
            onChange={() =>
              setBestSellerOnly((current) => !current)
            }
          />

          <FilterCheckbox
            label="New arrivals"
            checked={newArrivalOnly}
            onChange={() =>
              setNewArrivalOnly((current) => !current)
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
    <section
      className="
        relative
        bg-[#fffaf2]
        pb-6
        pt-4
        md:pb-8
        lg:pt-5
      "
    >
      <div className="container-brand">
        {/* =================================================
            SEARCH + SORT TOOLBAR
        ================================================== */}

        <div className="mb-5">
          {/* DESKTOP: EXACT SINGLE ROW */}
          <div className="hidden items-center gap-3 lg:flex">
            {/* SEARCH */}
            <div className="relative min-w-0 flex-1">
              <label htmlFor="product-search" className="sr-only">
                Search rice
              </label>

              <Search
                aria-hidden="true"
                size={18}
                strokeWidth={1.9}
                className="
                  pointer-events-none
                  absolute
                  left-[18px]
                  top-1/2
                  -translate-y-1/2
                  text-[#d1081b]
                "
              />

              <input
                id="product-search"
                type="search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search Basmati rice, plates, bowls, trays..."
                autoComplete="off"
                className="
                  h-[50px]
                  w-full
                  rounded-[18px]
                  border
                  border-[#eadfd2]
                  bg-[#fbf7f1]
                  pl-[48px]
                  pr-16
                  text-[13px]
                  text-[#17120f]
                  outline-none
                  transition
                  placeholder:text-[#8f857c]
                  focus:border-[#d8a548]
                  focus:ring-2
                  focus:ring-[#d8a548]/10
                "
              />

              {query ? (
                <button
                  type="button"
                  onClick={() => setQuery("")}
                  className="
                    absolute
                    right-3
                    top-1/2
                    -translate-y-1/2
                    rounded-full
                    px-3
                    py-1.5
                    text-[11px]
                    font-bold
                    text-[#d1081b]
                    transition
                    hover:bg-[#d1081b]/5
                  "
                >
                  Clear
                </button>
              ) : null}
            </div>

            {/* SORT LABEL */}
            <div
              className="
                flex
                h-[50px]
                shrink-0
                items-center
                justify-center
                rounded-[18px]
                bg-[#fffaf4]
                px-[18px]
                text-[12px]
                font-extrabold
                text-[#332c27]
              "
            >
              Sort by
            </div>

            {/* SORT SELECT */}
            <div className="relative shrink-0">
              <label htmlFor="product-sort" className="sr-only">
                Sort products
              </label>

              <select
                id="product-sort"
                value={sortBy}
                onChange={(event) => setSortBy(event.target.value)}
                className="
                  h-[50px]
                  min-w-[160px]
                  appearance-none
                  rounded-[18px]
                  border
                  border-[#eadfd2]
                  bg-[#f6ede2]
                  pl-5
                  pr-11
                  text-[12px]
                  font-semibold
                  text-[#332c27]
                  outline-none
                  transition
                  focus:border-[#d8a548]
                  focus:ring-2
                  focus:ring-[#d8a548]/10
                "
              >
                <option value="featured">Featured</option>
                <option value="best-selling">Best Selling</option>
                <option value="price-low-high">
                  Price: Low to High
                </option>
                <option value="price-high-low">
                  Price: High to Low
                </option>
                <option value="name-a-z">Name: A to Z</option>
                <option value="name-z-a">Name: Z to A</option>
                <option value="newest">Newest</option>
              </select>

              <ChevronDown
                size={15}
                aria-hidden="true"
                className="
                  pointer-events-none
                  absolute
                  right-4
                  top-1/2
                  -translate-y-1/2
                  text-[#9c7427]
                "
              />
            </div>
          </div>

          {/* =====================================================
              MOBILE SEARCH + FILTER + SORT
          ====================================================== */}
          <div className="lg:hidden">
            {/* SEARCH */}
            <div
              className="
                rounded-[22px]
                border
                border-[#eee5da]
                bg-white
                p-[7px]
                shadow-[0_5px_18px_rgba(68,43,20,0.035)]
              "
            >
              <div className="relative">
                <label
                  htmlFor="product-search-mobile"
                  className="sr-only"
                >
                  Search products
                </label>

                <Search
                  aria-hidden="true"
                  size={19}
                  strokeWidth={2}
                  className="
                    pointer-events-none
                    absolute
                    left-[15px]
                    top-1/2
                    z-10
                    -translate-y-1/2
                    text-[#7f1d1d]
                  "
                />

                <input
                  id="product-search-mobile"
                  type="search"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Search Basmati rice, plates, bowls, trays..."
                  autoComplete="off"
                  className="
                    h-[48px]
                    w-full
                    rounded-[17px]
                    border
                    border-[#eee5da]
                    bg-[#fbf8f3]
                    pl-[46px]
                    pr-14
                    text-[13px]
                    font-medium
                    text-[#17120f]
                    outline-none
                    transition
                    placeholder:font-normal
                    placeholder:text-[#8b8179]
                    focus:border-[#d7b77e]
                    focus:ring-2
                    focus:ring-[#d8a548]/10
                  "
                />

                {query ? (
                  <button
                    type="button"
                    onClick={() => setQuery("")}
                    className="
                      absolute
                      right-3
                      top-1/2
                      -translate-y-1/2
                      rounded-full
                      px-2
                      py-1
                      text-[10px]
                      font-extrabold
                      text-[#d1081b]
                    "
                  >
                    Clear
                  </button>
                ) : null}
              </div>
            </div>

            {/* FILTER + SORT ROW */}
            <div
              className="
                mt-3
                grid
                grid-cols-[0.95fr_1.05fr]
                gap-2
              "
            >
              {/* FILTER BUTTON */}
              <button
                type="button"
                onClick={() =>
                  setMobileFiltersOpen((current) => !current)
                }
                className="
                  relative
                  flex
                  h-[54px]
                  items-center
                  justify-center
                  gap-3
                  rounded-[22px]
                  border
                  border-[#eee5da]
                  bg-white
                  px-3
                  text-[#17120f]
                  shadow-[0_4px_14px_rgba(68,43,20,0.025)]
                  transition
                  active:scale-[0.98]
                "
              >
                <SlidersHorizontal
                  size={18}
                  strokeWidth={2}
                  className="text-[#7f1d1d]"
                />

                <span
                  className="
                    text-[13px]
                    font-extrabold
                  "
                >
                  Filters
                </span>

                {activeFilterCount > 0 ? (
                  <span
                    className="
                      absolute
                      right-2
                      top-2
                      flex
                      h-[18px]
                      min-w-[18px]
                      items-center
                      justify-center
                      rounded-full
                      bg-[#d1081b]
                      px-1
                      text-[9px]
                      font-black
                      text-white
                    "
                  >
                    {activeFilterCount}
                  </span>
                ) : null}
              </button>

              {/* SORT */}
              <div
                className="
                  relative
                  h-[54px]
                  overflow-hidden
                  rounded-[22px]
                  border
                  border-[#eadfd2]
                  bg-[#f5ede3]
                "
              >
                <label
                  htmlFor="product-sort-mobile"
                  className="
                    pointer-events-none
                    absolute
                    left-[17px]
                    top-[8px]
                    z-10
                    text-[10px]
                    font-medium
                    leading-none
                    text-[#7c736c]
                  "
                >
                  Sort by
                </label>

                <select
                  id="product-sort-mobile"
                  aria-label="Sort products"
                  value={sortBy}
                  onChange={(event) =>
                    setSortBy(event.target.value)
                  }
                  className="
                    absolute
                    inset-0
                    h-full
                    w-full
                    appearance-none
                    bg-transparent
                    pb-[7px]
                    pl-[17px]
                    pr-10
                    pt-[21px]
                    text-[12px]
                    font-extrabold
                    text-[#17120f]
                    outline-none
                  "
                >
                  <option value="featured">Featured</option>

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

                <ChevronDown
                  size={16}
                  strokeWidth={2}
                  aria-hidden="true"
                  className="
                    pointer-events-none
                    absolute
                    right-[15px]
                    top-1/2
                    -translate-y-1/2
                    text-[#17120f]
                  "
                />
              </div>
            </div>

            {/* PRODUCT COUNT */}
            <p
              className="
                mt-[10px]
                px-[2px]
                text-left
                text-[11px]
                leading-none
                text-[#766d64]
              "
              aria-live="polite"
            >
              Showing{" "}
              <strong className="font-extrabold text-[#17120f]">
                {sortedProducts.length}
              </strong>{" "}
              of{" "}
              <strong className="font-extrabold text-[#17120f]">
                {products.length}
              </strong>{" "}
              products
            </p>
          </div>

          {/* MOBILE FILTER PANEL */}
          {mobileFiltersOpen ? (
            <div
              className="
                mt-5
                border-t
                border-[#eee4d7]
                pt-5
                lg:hidden
              "
            >
              {filters}
            </div>
          ) : null}
        </div>

        {/* =================================================
            PRODUCTS + DESKTOP FILTERS
        ================================================== */}

        <div
          className="
            mt-4
            grid
            gap-8
            lg:mt-7
            lg:grid-cols-[235px_minmax(0,1fr)]
            xl:grid-cols-[250px_minmax(0,1fr)]
          "
        >
          {/* DESKTOP FILTER SIDEBAR */}
          <aside
            className="
              hidden
              self-start
              rounded-[26px]
              border
              border-[#eee4d7]
              bg-white
              p-5
              shadow-[0_12px_36px_rgba(73,48,24,0.06)]

              lg:sticky
              lg:top-[112px]
              lg:block
            "
          >
            <div
              className="
                mb-5
                flex
                items-center
                justify-between
                gap-3
              "
            >
              <div>
                <span
                  className="
                    text-[9px]
                    font-black
                    uppercase
                    tracking-[0.2em]
                    text-[#d1081b]
                  "
                >
                  Refine
                </span>

                <h2
                  className="
                    mt-1
                    font-display
                    text-[27px]
                    font-bold
                    text-[#17120f]
                  "
                >
                  Filters
                </h2>
              </div>

              {activeFilterCount > 0 ? (
                <span
                  className="
                    flex
                    h-7
                    min-w-7
                    items-center
                    justify-center
                    rounded-full
                    bg-[#d1081b]
                    px-2
                    text-[11px]
                    font-bold
                    text-white
                  "
                >
                  {activeFilterCount}
                </span>
              ) : null}
            </div>

            {filters}
          </aside>

          {/* PRODUCT GRID */}
          <div className="min-w-0">
            {sortedProducts.length > 0 ? (
              <ProductGrid
                products={sortedProducts}
              />
            ) : (
              <div
                className="
                  rounded-[28px]
                  border
                  border-[#eee4d7]
                  bg-white
                  px-6
                  py-16
                  text-center
                  shadow-[0_12px_36px_rgba(73,48,24,0.06)]
                "
              >
                <Search
                  size={36}
                  strokeWidth={1.5}
                  className="mx-auto text-[#d1081b]"
                />

                <h2
                  className="
                    mt-5
                    font-display
                    text-3xl
                    font-bold
                    text-[#17120f]
                  "
                >
                  No rice products found
                </h2>

                <p
                  className="
                    mx-auto
                    mt-3
                    max-w-xl
                    text-[13px]
                    leading-7
                    text-[#766d64]
                  "
                >
                  No products match your current search and
                  filters. Try another keyword or remove one
                  of the selected filters.
                </p>

                <button
                  type="button"
                  onClick={clearEverything}
                  className="
                    mt-6
                    rounded-full
                    bg-[#d1081b]
                    px-7
                    py-3
                    text-sm
                    font-bold
                    text-white
                    transition
                    hover:bg-[#b80718]
                  "
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