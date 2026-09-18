import Link from "next/link";
import { notFound } from "next/navigation";

import {
  getStorefrontProductBySlug,
  PUBLIC_STOREFRONTS
} from "@/lib/storefront-products";
import EcowareAddToCart from "@/components/ecoware/EcowareAddToCart";

function formatPrice(amount) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD"
  }).format(Number(amount || 0));
}

export async function generateMetadata({ params }) {
  const resolvedParams = await Promise.resolve(params);

  const slug = String(resolvedParams.slug || "").trim();

  const product = await getStorefrontProductBySlug(
    slug,
    PUBLIC_STOREFRONTS.ECOWARE
  );

  if (!product) {
    return {
      title: "Product Not Found"
    };
  }

  return {
    title: product.title,
    description:
      product.short_description ||
      product.description ||
      `Shop ${product.title} from Simpli Ecoware.`
  };
}

export default async function EcowareProductPage({ params }) {
  const resolvedParams = await Promise.resolve(params);

  const slug = String(resolvedParams.slug || "").trim();

  if (!slug) {
    notFound();
  }

  const product = await getStorefrontProductBySlug(
    slug,
    PUBLIC_STOREFRONTS.ECOWARE
  );

  if (!product) {
    notFound();
  }

  const availableQuantity = Math.max(
    Number(product.inventory?.stock_quantity || 0) -
      Number(product.inventory?.reserved_quantity || 0),
    0
  );

  const inStock = availableQuantity > 0;

  return (
    <section className="mx-auto max-w-7xl px-6 py-14">
      <Link
        href="/ecoware/products"
        className="text-sm font-bold text-black/55 hover:text-black"
      >
        ← Back to Products
      </Link>

      <div className="mt-8 grid gap-12 lg:grid-cols-2">
        <div>
          <div className="overflow-hidden rounded-[2rem] bg-[#f1eee5]">
            <div className="aspect-square">
              {product.image ? (
                <img
                  src={product.image}
                  alt={product.title}
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="flex h-full items-center justify-center text-sm text-black/35">
                  Product image unavailable
                </div>
              )}
            </div>
          </div>

          {Array.isArray(product.images) && product.images.length > 1 && (
            <div className="mt-4 grid grid-cols-4 gap-3">
              {product.images.map((image, index) => {
                const imageUrl =
                  typeof image === "string"
                    ? image
                    : image.url || image.image_url || image.src || "";

                return (
                  <div
                    key={
                      image.id ||
                      imageUrl ||
                      `${product.slug}-image-${index}`
                    }
                    className="overflow-hidden rounded-2xl border border-black/10 bg-white"
                  >
                    {imageUrl ? (
                      <img
                        src={imageUrl}
                        alt={`${product.title} ${index + 1}`}
                        className="aspect-square h-full w-full object-cover"
                      />
                    ) : null}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="lg:py-6">
          <p className="text-xs font-black uppercase tracking-[0.2em] text-black/40">
            Simpli Ecoware
          </p>

          <h1 className="mt-4 text-4xl font-black leading-tight md:text-5xl">
            {product.title}
          </h1>

          <p className="mt-5 text-2xl font-black">
            {formatPrice(product.unitPrice)}
          </p>

          <div className="mt-5">
            {inStock ? (
              <span className="inline-flex rounded-full bg-green-100 px-4 py-2 text-sm font-bold text-green-800">
                In Stock
              </span>
            ) : (
              <span className="inline-flex rounded-full bg-red-100 px-4 py-2 text-sm font-bold text-red-800">
                Out of Stock
              </span>
            )}
          </div>

          {product.short_description && (
            <p className="mt-7 text-lg leading-8 text-black/65">
              {product.short_description}
            </p>
          )}

          {product.description && (
            <div className="mt-6 whitespace-pre-line leading-7 text-black/60">
              {product.description}
            </div>
          )}

          <div className="mt-8 grid gap-3 border-y border-black/10 py-6 sm:grid-cols-2">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.14em] text-black/35">
                Category
              </p>

              <p className="mt-1 font-semibold">
                {product.category_name || product.category || "Ecoware"}
              </p>
            </div>

            <div>
              <p className="text-xs font-bold uppercase tracking-[0.14em] text-black/35">
                Availability
              </p>

              <p className="mt-1 font-semibold">
                {inStock
                  ? `${availableQuantity} available`
                  : "Currently unavailable"}
              </p>
            </div>
          </div>

          <div className="mt-8">
            <EcowareAddToCart
              product={{
                id: product.id || product.product_id,
                slug: product.slug,
                name: product.name || product.title,
                title: product.title || product.name,
                image: product.image,
                unitPrice: Number(product.unitPrice || 0),
                storefront: "ecoware"
              }}
              availableStock={availableQuantity}
              disabled={!inStock}
            />
          </div>

          <div className="mt-8 grid gap-3 sm:grid-cols-2">
            <Link
              href="/sample-request"
              className="rounded-2xl border border-black/10 bg-white p-5"
            >
              <p className="font-bold">Request a Sample</p>

              <p className="mt-1 text-sm text-black/50">
                Evaluate this product before ordering in volume.
              </p>
            </Link>

            <Link
              href="/wholesale"
              className="rounded-2xl border border-black/10 bg-white p-5"
            >
              <p className="font-bold">Wholesale Pricing</p>

              <p className="mt-1 text-sm text-black/50">
                Request commercial or bulk pricing.
              </p>
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}