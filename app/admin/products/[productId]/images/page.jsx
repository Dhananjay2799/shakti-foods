import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowDown,
  ArrowLeft,
  ArrowUp,
  Check,
  CircleOff,
  Edit3,
  ExternalLink,
  ImageIcon,
  Images,
  Plus,
  Save,
  Star,
  Trash2,
  Upload,
  X
} from "lucide-react";
import { createSupabaseAdmin } from "@/lib/supabase-admin";
import {
  deleteProductImage,
  moveProductImageDown,
  moveProductImageUp,
  setPrimaryProductImage,
  toggleProductImageStatus,
  updateProductImage,
  uploadProductImage
} from "@/app/admin/products/image-actions";

export const dynamic = "force-dynamic";

const IMAGE_TYPES = [
  {
    value: "primary",
    label: "Primary"
  },
  {
    value: "gallery",
    label: "Gallery"
  },
  {
    value: "thumbnail",
    label: "Thumbnail"
  },
  {
    value: "lifestyle",
    label: "Lifestyle"
  },
  {
    value: "packaging",
    label: "Packaging"
  }
];

function formatImageType(type) {
  const matchingType = IMAGE_TYPES.find(
    (imageType) => imageType.value === type
  );

  return (
    matchingType?.label ||
    String(type || "gallery")
      .replaceAll("_", " ")
      .replace(/\b\w/g, (letter) =>
        letter.toUpperCase()
      )
  );
}

function formatFileSize(bytes) {
  const value = Number(bytes || 0);

  if (value < 1024) {
    return `${value} B`;
  }

  if (value < 1024 * 1024) {
    return `${(value / 1024).toFixed(1)} KB`;
  }

  return `${(
    value /
    (1024 * 1024)
  ).toFixed(1)} MB`;
}

function formatDateTime(value) {
  if (!value) {
    return "Unknown";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Unknown";
  }

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit"
  }).format(date);
}

function SuccessMessage({ children }) {
  return (
    <div className="rounded-2xl border border-green-200 bg-green-50 px-5 py-4 text-sm font-semibold text-green-800">
      <span className="inline-flex items-center gap-2">
        <Check size={17} />
        {children}
      </span>
    </div>
  );
}

function UploadImageForm({
  productId,
  productName,
  cancelHref,
  hasPrimaryImage
}) {
  return (
    <form
      action={uploadProductImage}
      encType="multipart/form-data"
      className="grid gap-5"
    >
      <input
        type="hidden"
        name="productId"
        value={productId}
      />

      <section className="rounded-[1.75rem] border border-black/5 bg-white p-5 shadow-sm md:p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-black/40">
              Product Image Upload
            </p>

            <h1 className="mt-2 font-display text-3xl font-bold text-black">
              Upload Image
            </h1>

            <p className="mt-2 text-sm leading-6 text-black/50">
              Add an image for {productName}. Accepted
              formats are JPG, JPEG, PNG, and WebP.
              Maximum file size is 8 MB.
            </p>
          </div>

          <Link
            href={cancelHref}
            className="inline-flex items-center gap-2 rounded-full bg-[#f1eadf] px-4 py-2.5 text-sm font-bold text-black transition hover:bg-[#e6dac7]"
          >
            <X size={16} />
            Cancel
          </Link>
        </div>

        <div className="mt-6 grid gap-5 md:grid-cols-2">
          <label className="grid gap-2 md:col-span-2">
            <span className="text-sm font-bold text-black">
              Image file
            </span>

            <input
              type="file"
              name="file"
              required
              accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp"
              className="block w-full rounded-2xl border border-dashed border-black/20 bg-[#faf8f4] px-4 py-5 text-sm text-black file:mr-4 file:rounded-full file:border-0 file:bg-black file:px-4 file:py-2 file:text-sm file:font-bold file:text-white"
            />

            <span className="text-xs leading-5 text-black/45">
              Use clear, high-resolution product images
              with a clean background whenever possible.
            </span>
          </label>

          <label className="grid gap-2">
            <span className="text-sm font-bold text-black">
              Image type
            </span>

            <select
              name="imageType"
              defaultValue={
                hasPrimaryImage
                  ? "gallery"
                  : "primary"
              }
              required
              className="h-12 rounded-2xl border border-black/10 bg-[#faf8f4] px-4 text-sm font-semibold text-black outline-none focus:border-black"
            >
              {IMAGE_TYPES.map((type) => (
                <option
                  key={type.value}
                  value={type.value}
                >
                  {type.label}
                </option>
              ))}
            </select>
          </label>

          <label className="grid gap-2">
            <span className="text-sm font-bold text-black">
              Image title
            </span>

            <input
              type="text"
              name="title"
              placeholder="Example: Front package view"
              className="h-12 rounded-2xl border border-black/10 bg-[#faf8f4] px-4 text-sm text-black outline-none focus:border-black"
            />
          </label>

          <label className="grid gap-2 md:col-span-2">
            <span className="text-sm font-bold text-black">
              Alternative text
            </span>

            <input
              type="text"
              name="altText"
              required
              placeholder={`Example: ${productName} front package`}
              className="h-12 rounded-2xl border border-black/10 bg-[#faf8f4] px-4 text-sm text-black outline-none focus:border-black"
            />

            <span className="text-xs leading-5 text-black/45">
              Describe the image for accessibility and
              search engines.
            </span>
          </label>

          <label className="flex items-start gap-3 rounded-2xl border border-black/10 bg-[#faf8f4] p-4 md:col-span-2">
            <input
              type="checkbox"
              name="isPrimary"
              defaultChecked={!hasPrimaryImage}
              className="mt-1 h-4 w-4"
            />

            <span>
              <span className="block text-sm font-bold text-black">
                Set as primary image
              </span>

              <span className="mt-1 block text-xs leading-5 text-black/50">
                The primary image is used as the main
                storefront product image. Selecting this
                replaces the current primary image.
              </span>
            </span>
          </label>
        </div>

        {!hasPrimaryImage ? (
          <div className="mt-6 rounded-2xl bg-amber-50 p-4 text-sm leading-6 text-amber-900">
            This product does not have a primary image.
            The first uploaded image will automatically
            become primary.
          </div>
        ) : null}
      </section>

      <div className="rounded-[1.75rem] border border-black/5 bg-white p-4 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Link
            href={cancelHref}
            className="rounded-full border border-black/10 bg-white px-6 py-3 text-sm font-bold text-black transition hover:bg-[#f1eadf]"
          >
            Cancel
          </Link>

          <button
            type="submit"
            className="inline-flex items-center justify-center gap-2 rounded-full bg-black px-7 py-3 text-sm font-bold text-white transition hover:bg-black/80"
          >
            <Upload size={17} />
            Upload Image
          </button>
        </div>
      </div>
    </form>
  );
}

function EditImageForm({
  productId,
  productName,
  image,
  imageUrl,
  cancelHref
}) {
  return (
    <form
      action={updateProductImage}
      className="grid gap-5"
    >
      <input
        type="hidden"
        name="productId"
        value={productId}
      />

      <input
        type="hidden"
        name="imageId"
        value={image.id}
      />

      <section className="rounded-[1.75rem] border border-black/5 bg-white p-5 shadow-sm md:p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-black/40">
              Product Image Editor
            </p>

            <h1 className="mt-2 font-display text-3xl font-bold text-black">
              Edit Image
            </h1>

            <p className="mt-2 text-sm text-black/50">
              {productName}
            </p>
          </div>

          <Link
            href={cancelHref}
            className="inline-flex items-center gap-2 rounded-full bg-[#f1eadf] px-4 py-2.5 text-sm font-bold text-black transition hover:bg-[#e6dac7]"
          >
            <X size={16} />
            Cancel
          </Link>
        </div>

        <div className="mt-6 grid gap-6 lg:grid-cols-[280px_minmax(0,1fr)]">
          <div>
            <div className="overflow-hidden rounded-2xl bg-[#faf8f4]">
              {imageUrl ? (
                <img
                  src={imageUrl}
                  alt={image.alt_text}
                  className="aspect-square h-full w-full object-contain p-4"
                />
              ) : (
                <div className="flex aspect-square items-center justify-center">
                  <ImageIcon
                    size={42}
                    className="text-black/25"
                  />
                </div>
              )}
            </div>

            <p className="mt-3 break-words text-xs text-black/45">
              {image.original_filename}
            </p>

            <p className="mt-1 text-xs text-black/35">
              {formatFileSize(
                image.file_size_bytes
              )}
              {" · "}
              {image.mime_type}
            </p>
          </div>

          <div className="grid gap-5">
            <div className="grid gap-5 md:grid-cols-2">
              <label className="grid gap-2">
                <span className="text-sm font-bold text-black">
                  Image type
                </span>

                <select
                  name="imageType"
                  defaultValue={image.image_type}
                  required
                  className="h-12 rounded-2xl border border-black/10 bg-[#faf8f4] px-4 text-sm font-semibold text-black outline-none focus:border-black"
                >
                  {IMAGE_TYPES.map((type) => (
                    <option
                      key={type.value}
                      value={type.value}
                    >
                      {type.label}
                    </option>
                  ))}
                </select>
              </label>

              <label className="grid gap-2">
                <span className="text-sm font-bold text-black">
                  Sort order
                </span>

                <input
                  type="number"
                  name="sortOrder"
                  min="0"
                  defaultValue={
                    image.sort_order || 0
                  }
                  className="h-12 rounded-2xl border border-black/10 bg-[#faf8f4] px-4 text-sm text-black outline-none focus:border-black"
                />
              </label>
            </div>

            <label className="grid gap-2">
              <span className="text-sm font-bold text-black">
                Image title
              </span>

              <input
                type="text"
                name="title"
                defaultValue={image.title || ""}
                placeholder="Image title"
                className="h-12 rounded-2xl border border-black/10 bg-[#faf8f4] px-4 text-sm text-black outline-none focus:border-black"
              />
            </label>

            <label className="grid gap-2">
              <span className="text-sm font-bold text-black">
                Alternative text
              </span>

              <input
                type="text"
                name="altText"
                required
                defaultValue={image.alt_text}
                placeholder="Describe the image"
                className="h-12 rounded-2xl border border-black/10 bg-[#faf8f4] px-4 text-sm text-black outline-none focus:border-black"
              />
            </label>

            <div className="grid gap-3 sm:grid-cols-2">
              <label className="flex items-start gap-3 rounded-2xl border border-black/10 bg-[#faf8f4] p-4">
                <input
                  type="checkbox"
                  name="isPrimary"
                  defaultChecked={
                    image.is_primary === true
                  }
                  className="mt-1 h-4 w-4"
                />

                <span>
                  <span className="block text-sm font-bold text-black">
                    Primary image
                  </span>

                  <span className="mt-1 block text-xs leading-5 text-black/50">
                    Use as the main storefront image.
                  </span>
                </span>
              </label>

              <label className="flex items-start gap-3 rounded-2xl border border-black/10 bg-[#faf8f4] p-4">
                <input
                  type="checkbox"
                  name="isActive"
                  defaultChecked={
                    image.is_active === true
                  }
                  className="mt-1 h-4 w-4"
                />

                <span>
                  <span className="block text-sm font-bold text-black">
                    Active image
                  </span>

                  <span className="mt-1 block text-xs leading-5 text-black/50">
                    Display this image in product
                    workflows.
                  </span>
                </span>
              </label>
            </div>
          </div>
        </div>
      </section>

      <div className="rounded-[1.75rem] border border-black/5 bg-white p-4 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Link
            href={cancelHref}
            className="rounded-full border border-black/10 bg-white px-6 py-3 text-sm font-bold text-black transition hover:bg-[#f1eadf]"
          >
            Cancel
          </Link>

          <button
            type="submit"
            className="inline-flex items-center justify-center gap-2 rounded-full bg-black px-7 py-3 text-sm font-bold text-white transition hover:bg-black/80"
          >
            <Save size={17} />
            Save Image
          </button>
        </div>
      </div>
    </form>
  );
}

export default async function ProductImagesPage({
  params,
  searchParams
}) {
  const resolvedParams =
    await Promise.resolve(params || {});

  const resolvedSearchParams =
    await Promise.resolve(searchParams || {});

  const productId = String(
    resolvedParams.productId || ""
  ).trim();

  if (!productId) {
    notFound();
  }

  const showUploadForm =
    String(
      resolvedSearchParams.new || ""
    ) === "1";

  const editImageId = String(
    resolvedSearchParams.edit || ""
  ).trim();

  const uploaded =
    String(
      resolvedSearchParams.uploaded || ""
    ) === "1";

  const updated =
    String(
      resolvedSearchParams.updated || ""
    ) === "1";

  const deleted =
    String(
      resolvedSearchParams.deleted || ""
    ) === "1";

  const primaryChanged =
    String(
      resolvedSearchParams.primaryChanged ||
        ""
    ) === "1";

  const statusChanged =
    String(
      resolvedSearchParams.statusChanged ||
        ""
    ) === "1";

  const reordered =
    String(
      resolvedSearchParams.reordered || ""
    ) === "1";

  const supabase = createSupabaseAdmin();

  const [productResult, imagesResult] =
    await Promise.all([
      supabase
        .from("inventory")
        .select(
          `
            product_id,
            product_name,
            is_active
          `
        )
        .eq("product_id", productId)
        .maybeSingle(),

      supabase
        .from("product_images")
        .select("*")
        .eq("product_id", productId)
        .order("is_primary", {
          ascending: false
        })
        .order("sort_order", {
          ascending: true
        })
        .order("created_at", {
          ascending: true
        })
    ]);

  if (
    productResult.error ||
    !productResult.data
  ) {
    console.error(
      "Unable to load product:",
      productResult.error
    );

    notFound();
  }

  if (imagesResult.error) {
    console.error(
      "Unable to load product images:",
      imagesResult.error
    );
  }

  const product = productResult.data;
  const images = imagesResult.data || [];

  const imagesWithUrls = images.map(
    (image) => {
      const { data } = supabase.storage
        .from(image.storage_bucket)
        .getPublicUrl(image.storage_path);

      return {
        ...image,
        publicUrl:
          data?.publicUrl || null
      };
    }
  );

  const editingImage = editImageId
    ? imagesWithUrls.find(
        (image) =>
          image.id === editImageId
      )
    : null;

  if (editImageId && !editingImage) {
    notFound();
  }

  const primaryImage =
    imagesWithUrls.find(
      (image) =>
        image.is_primary &&
        image.is_active
    ) || null;

  const activeImages =
    imagesWithUrls.filter(
      (image) => image.is_active
    );

  const basePath =
    `/admin/products/${productId}/images`;

  if (showUploadForm) {
    return (
      <main className="min-h-screen bg-[#f8f6f1]">
        <div className="mx-auto max-w-5xl px-5 py-8 md:px-8">
          <UploadImageForm
            productId={productId}
            productName={product.product_name}
            cancelHref={basePath}
            hasPrimaryImage={Boolean(
              primaryImage
            )}
          />
        </div>
      </main>
    );
  }

  if (editingImage) {
    return (
      <main className="min-h-screen bg-[#f8f6f1]">
        <div className="mx-auto max-w-5xl px-5 py-8 md:px-8">
          <EditImageForm
            productId={productId}
            productName={product.product_name}
            image={editingImage}
            imageUrl={editingImage.publicUrl}
            cancelHref={basePath}
          />
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#f8f6f1]">
      <div className="mx-auto max-w-6xl px-5 py-8 md:px-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Link
            href={`/admin/products/${productId}`}
            className="inline-flex items-center gap-2 rounded-full bg-white px-5 py-3 text-sm font-bold text-black shadow-sm transition hover:bg-[#f1eadf]"
          >
            <ArrowLeft size={17} />
            Back to Product
          </Link>

          <Link
            href="/admin/products"
            className="rounded-full bg-[#f1eadf] px-5 py-3 text-sm font-bold text-black transition hover:bg-[#e6dac7]"
          >
            All Products
          </Link>
        </div>

        <section className="mt-6 rounded-[1.75rem] border border-black/5 bg-white p-5 shadow-sm md:p-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-black/40">
                Product Management
              </p>

              <h1 className="mt-2 font-display text-3xl font-bold text-black md:text-4xl">
                Product Images
              </h1>

              <p className="mt-2 text-sm text-black/55">
                {product.product_name}
              </p>

              <p className="mt-1 text-xs text-black/40">
                Product ID: {product.product_id}
              </p>
            </div>

            <Link
              href={`${basePath}?new=1`}
              className="inline-flex items-center gap-2 rounded-full bg-black px-5 py-3 text-sm font-bold text-white transition hover:bg-black/80"
            >
              <Plus size={17} />
              Upload Image
            </Link>
          </div>

          <div className="mt-5 grid gap-3 sm:grid-cols-3">
            <div className="rounded-2xl bg-[#faf8f4] p-4">
              <p className="text-xs font-bold uppercase tracking-[0.1em] text-black/40">
                Total
              </p>

              <p className="mt-2 text-2xl font-bold text-black">
                {imagesWithUrls.length}
              </p>
            </div>

            <div className="rounded-2xl bg-[#faf8f4] p-4">
              <p className="text-xs font-bold uppercase tracking-[0.1em] text-black/40">
                Active
              </p>

              <p className="mt-2 text-2xl font-bold text-black">
                {activeImages.length}
              </p>
            </div>

            <div className="rounded-2xl bg-[#faf8f4] p-4">
              <p className="text-xs font-bold uppercase tracking-[0.1em] text-black/40">
                Primary
              </p>

              <p className="mt-2 text-2xl font-bold text-black">
                {primaryImage ? "Set" : "Missing"}
              </p>
            </div>
          </div>
        </section>

        {uploaded ? (
          <div className="mt-5">
            <SuccessMessage>
              Product image was uploaded successfully.
            </SuccessMessage>
          </div>
        ) : null}

        {updated ? (
          <div className="mt-5">
            <SuccessMessage>
              Product image was updated successfully.
            </SuccessMessage>
          </div>
        ) : null}

        {deleted ? (
          <div className="mt-5">
            <SuccessMessage>
              Product image was deleted successfully.
            </SuccessMessage>
          </div>
        ) : null}

        {primaryChanged ? (
          <div className="mt-5">
            <SuccessMessage>
              Primary product image was updated.
            </SuccessMessage>
          </div>
        ) : null}

        {statusChanged ? (
          <div className="mt-5">
            <SuccessMessage>
              Product image status was updated.
            </SuccessMessage>
          </div>
        ) : null}

        {reordered ? (
          <div className="mt-5">
            <SuccessMessage>
              Product image order was updated.
            </SuccessMessage>
          </div>
        ) : null}

        {imagesWithUrls.length === 0 ? (
          <section className="mt-5 rounded-[1.75rem] border border-black/5 bg-white px-6 py-16 text-center shadow-sm">
            <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-[#f1eadf] text-black">
              <Images size={28} />
            </span>

            <h2 className="mt-5 text-xl font-bold text-black">
              No product images
            </h2>

            <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-black/50">
              Upload a primary image and additional
              gallery images for this product.
            </p>

            <Link
              href={`${basePath}?new=1`}
              className="mt-5 inline-flex items-center gap-2 rounded-full bg-black px-5 py-3 text-sm font-bold text-white"
            >
              <Upload size={17} />
              Upload First Image
            </Link>
          </section>
        ) : (
          <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {imagesWithUrls.map(
              (image, index) => (
                <article
                  key={image.id}
                  className={[
                    "rounded-[1.75rem] border bg-white p-5 shadow-sm",
                    image.is_primary
                      ? "border-black/20"
                      : "border-black/5",
                    image.is_active
                      ? ""
                      : "opacity-60"
                  ].join(" ")}
                >
                  <div className="relative overflow-hidden rounded-2xl bg-[#faf8f4]">
                    {image.publicUrl ? (
                      <img
                        src={image.publicUrl}
                        alt={image.alt_text}
                        className="aspect-square h-full w-full object-contain p-4"
                      />
                    ) : (
                      <div className="flex aspect-square items-center justify-center">
                        <ImageIcon
                          size={42}
                          className="text-black/25"
                        />
                      </div>
                    )}

                    <div className="absolute left-3 top-3 flex flex-wrap gap-2">
                      <span className="rounded-full bg-white/95 px-3 py-1 text-xs font-bold text-black shadow-sm">
                        {formatImageType(
                          image.image_type
                        )}
                      </span>

                      {image.is_primary ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-black px-3 py-1 text-xs font-bold text-white">
                          <Star size={12} />
                          Primary
                        </span>
                      ) : null}
                    </div>
                  </div>

                  <div className="mt-4">
                    <h2 className="break-words text-lg font-bold text-black">
                      {image.title ||
                        image.original_filename}
                    </h2>

                    <p className="mt-2 text-sm leading-6 text-black/55">
                      {image.alt_text}
                    </p>

                    <p className="mt-2 break-words text-xs text-black/35">
                      {image.original_filename}
                    </p>

                    <p className="mt-1 text-xs text-black/35">
                      {formatFileSize(
                        image.file_size_bytes
                      )}
                      {" · "}
                      {image.mime_type}
                    </p>
                  </div>

                  <div className="mt-4 grid grid-cols-2 gap-3">
                    <div className="rounded-xl bg-[#faf8f4] p-3">
                      <p className="text-xs font-bold uppercase tracking-[0.08em] text-black/40">
                        Sort Order
                      </p>

                      <p className="mt-1 font-bold text-black">
                        {image.sort_order}
                      </p>
                    </div>

                    <div className="rounded-xl bg-[#faf8f4] p-3">
                      <p className="text-xs font-bold uppercase tracking-[0.08em] text-black/40">
                        Uploaded
                      </p>

                      <p className="mt-1 text-xs font-bold text-black">
                        {formatDateTime(
                          image.created_at
                        )}
                      </p>
                    </div>
                  </div>

                  <div className="mt-5 flex flex-wrap gap-2 border-t border-black/5 pt-4">
                    {image.publicUrl ? (
                      <a
                        href={image.publicUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1.5 rounded-full bg-black px-3 py-2 text-xs font-bold text-white"
                      >
                        <ExternalLink size={14} />
                        Preview
                      </a>
                    ) : null}

                    <Link
                      href={`${basePath}?edit=${image.id}`}
                      className="inline-flex items-center gap-1.5 rounded-full bg-[#f1eadf] px-3 py-2 text-xs font-bold text-black transition hover:bg-[#e6dac7]"
                    >
                      <Edit3 size={14} />
                      Edit
                    </Link>

                    {!image.is_primary ? (
                      <form
                        action={
                          setPrimaryProductImage
                        }
                      >
                        <input
                          type="hidden"
                          name="productId"
                          value={productId}
                        />

                        <input
                          type="hidden"
                          name="imageId"
                          value={image.id}
                        />

                        <button
                          type="submit"
                          className="inline-flex items-center gap-1.5 rounded-full bg-blue-100 px-3 py-2 text-xs font-bold text-blue-800"
                        >
                          <Star size={14} />
                          Set Primary
                        </button>
                      </form>
                    ) : null}

                    <form
                      action={
                        toggleProductImageStatus
                      }
                    >
                      <input
                        type="hidden"
                        name="productId"
                        value={productId}
                      />

                      <input
                        type="hidden"
                        name="imageId"
                        value={image.id}
                      />

                      <input
                        type="hidden"
                        name="nextActive"
                        value={
                          image.is_active
                            ? "false"
                            : "true"
                        }
                      />

                      <button
                        type="submit"
                        className={[
                          "inline-flex items-center gap-1.5 rounded-full px-3 py-2 text-xs font-bold",
                          image.is_active
                            ? "bg-amber-100 text-amber-800"
                            : "bg-green-100 text-green-800"
                        ].join(" ")}
                      >
                        <CircleOff size={14} />

                        {image.is_active
                          ? "Deactivate"
                          : "Activate"}
                      </button>
                    </form>

                    <form
                      action={deleteProductImage}
                    >
                      <input
                        type="hidden"
                        name="productId"
                        value={productId}
                      />

                      <input
                        type="hidden"
                        name="imageId"
                        value={image.id}
                      />

                      <button
                        type="submit"
                        className="inline-flex items-center gap-1.5 rounded-full bg-red-100 px-3 py-2 text-xs font-bold text-red-800"
                      >
                        <Trash2 size={14} />
                        Delete
                      </button>
                    </form>
                  </div>

                  <div className="mt-3 flex flex-wrap gap-2">
                    <form
                      action={moveProductImageUp}
                    >
                      <input
                        type="hidden"
                        name="productId"
                        value={productId}
                      />

                      <input
                        type="hidden"
                        name="imageId"
                        value={image.id}
                      />

                      <button
                        type="submit"
                        disabled={index === 0}
                        className="inline-flex items-center gap-1.5 rounded-full border border-black/10 bg-white px-3 py-2 text-xs font-bold text-black disabled:cursor-not-allowed disabled:opacity-30"
                      >
                        <ArrowUp size={14} />
                        Move Up
                      </button>
                    </form>

                    <form
                      action={moveProductImageDown}
                    >
                      <input
                        type="hidden"
                        name="productId"
                        value={productId}
                      />

                      <input
                        type="hidden"
                        name="imageId"
                        value={image.id}
                      />

                      <button
                        type="submit"
                        disabled={
                          index ===
                          imagesWithUrls.length - 1
                        }
                        className="inline-flex items-center gap-1.5 rounded-full border border-black/10 bg-white px-3 py-2 text-xs font-bold text-black disabled:cursor-not-allowed disabled:opacity-30"
                      >
                        <ArrowDown size={14} />
                        Move Down
                      </button>
                    </form>
                  </div>

                  <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                    <span
                      className={[
                        "rounded-full px-3 py-1 text-xs font-bold",
                        image.is_active
                          ? "bg-green-100 text-green-800"
                          : "bg-gray-100 text-gray-600"
                      ].join(" ")}
                    >
                      {image.is_active
                        ? "Active"
                        : "Inactive"}
                    </span>

                    {image.uploaded_by_email ? (
                      <span className="text-xs font-semibold text-black/35">
                        By {image.uploaded_by_email}
                      </span>
                    ) : null}
                  </div>
                </article>
              )
            )}
          </div>
        )}
      </div>
    </main>
  );
}