import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowDown,
  ArrowUp,
  Eye,
  EyeOff,
  ImageIcon,
  ImagePlus,
  Images,
  Pencil,
  Save,
  Star,
  Trash2,
  Upload
} from "lucide-react";
import { createSupabaseAdmin } from "@/lib/supabase-admin";
import {
  adminProductsPath,
  requireAdminStore,
  requireStoreProduct
} from "@/lib/admin-store";
import { getStorefrontPageUrl } from "@/lib/storefront-config";
import {
  deleteProductImage,
  moveProductImageDown,
  moveProductImageUp,
  setPrimaryProductImage,
  toggleProductImageStatus,
  updateProductImage,
  uploadProductImage
} from "@/app/admin/products/image-actions";
import {
  ConfirmSubmitButton,
  SubmitButton
} from "@/components/admin/ProductFormClient";
import {
  BUTTON_PRIMARY,
  BUTTON_SECONDARY,
  Badge,
  Check,
  Field,
  PageHeader,
  Panel,
  ProductActionsCard,
  SelectField,
  SuccessNotice
} from "@/components/admin/product-ui";

export const dynamic = "force-dynamic";

const IMAGE_TYPES = [
  { value: "primary", label: "Primary" },
  { value: "gallery", label: "Gallery" },
  { value: "thumbnail", label: "Thumbnail" },
  { value: "lifestyle", label: "Lifestyle" },
  { value: "packaging", label: "Packaging" }
];

const NOTICES = {
  uploaded: "Image uploaded.",
  updated: "Image saved.",
  deleted: "Image deleted.",
  primaryChanged: "Primary image updated.",
  statusChanged: "Image visibility updated.",
  reordered: "Image order updated."
};

const ICON_BUTTON =
  "inline-flex h-8 w-8 items-center justify-center rounded-lg text-black/55 transition hover:bg-black/[0.05] hover:text-black disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:bg-transparent";

function formatImageType(type) {
  const matchingType = IMAGE_TYPES.find((imageType) => imageType.value === type);

  return (
    matchingType?.label ||
    String(type || "gallery")
      .replaceAll("_", " ")
      .replace(/\b\w/g, (letter) => letter.toUpperCase())
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

  return `${(value / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDate(value) {
  const date = new Date(value || "");

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric"
  }).format(date);
}

function fileMeta(image) {
  return [
    formatFileSize(image.file_size_bytes),
    String(image.mime_type || "").replace("image/", "").toUpperCase(),
    formatDate(image.created_at)
  ]
    .filter(Boolean)
    .join(" · ");
}

/** Hidden fields every image action needs. */
function ImageFields({ productId, imageId }) {
  return (
    <>
      <input type="hidden" name="productId" value={productId} />
      <input type="hidden" name="imageId" value={imageId} />
    </>
  );
}

function ImagePreview({ src, alt, className = "" }) {
  return (
    <div className={`overflow-hidden bg-[#faf8f4] ${className}`}>
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={src}
          alt={alt || ""}
          className="aspect-square h-full w-full object-contain p-4"
        />
      ) : (
        <div className="flex aspect-square items-center justify-center">
          <ImageIcon size={40} className="text-black/25" aria-hidden="true" />
        </div>
      )}
    </div>
  );
}

function UploadImageView({ productId, productTitle, cancelHref, hasPrimaryImage }) {
  return (
    <form
      action={uploadProductImage}
      encType="multipart/form-data"
      className="grid grid-cols-1 gap-5"
    >
      <input type="hidden" name="productId" value={productId} />

      <PageHeader
        title="Upload image"
        subtitle={productTitle}
        actions={
          <>
            <Link href={cancelHref} className={BUTTON_SECONDARY}>
              Cancel
            </Link>
            <SubmitButton pendingLabel="Uploading…">
              <Upload size={16} aria-hidden="true" />
              Upload image
            </SubmitButton>
          </>
        }
      />

      <Panel icon={ImagePlus} title="Image file" bodyClassName="grid gap-2">
        <label
          htmlFor="field-file"
          className="text-sm font-semibold text-black"
        >
          Choose an image
          <span className="ml-0.5 text-red-600" aria-hidden="true">*</span>
        </label>
        <input
          id="field-file"
          type="file"
          name="file"
          required
          accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp"
          className="block w-full cursor-pointer rounded-xl border border-dashed border-black/20 bg-[#faf8f4] px-4 py-6 text-sm text-black/70 transition file:mr-4 file:cursor-pointer file:rounded-lg file:border-0 file:bg-black file:px-4 file:py-2 file:text-sm file:font-bold file:text-white hover:border-black/40"
        />
        <p className="text-xs leading-5 text-black/50">
          JPG, PNG, or WebP, up to 8 MB. A clear photo on a plain background works best.
        </p>
      </Panel>

      <Panel icon={ImageIcon} title="Image details" bodyClassName="grid gap-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <SelectField
            label="Image type"
            name="imageType"
            required
            defaultValue={hasPrimaryImage ? "gallery" : "primary"}
          >
            {IMAGE_TYPES.map((type) => (
              <option key={type.value} value={type.value}>
                {type.label}
              </option>
            ))}
          </SelectField>

          <Field
            label="Image title"
            name="title"
            optional
            placeholder="Front of the bag"
          />
        </div>

        <Field
          label="Alternative text"
          name="altText"
          required
          placeholder={`${productTitle} – front of the bag`}
          help="Describes the image for screen readers and search engines."
        />

        <Check
          name="isPrimary"
          title="Set as primary image"
          description="Shown first on the store. This replaces the current primary image."
          defaultChecked={!hasPrimaryImage}
        />

        {!hasPrimaryImage ? (
          <p className="rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-900">
            This product has no primary image yet, so this one will become the primary image.
          </p>
        ) : null}
      </Panel>
    </form>
  );
}

function EditImageView({ productId, productTitle, image, cancelHref }) {
  return (
    <form action={updateProductImage} className="grid grid-cols-1 gap-5">
      <ImageFields productId={productId} imageId={image.id} />

      <PageHeader
        title="Edit image"
        subtitle={productTitle}
        actions={
          <>
            <Link href={cancelHref} className={BUTTON_SECONDARY}>
              Cancel
            </Link>
            <SubmitButton pendingLabel="Saving…">
              <Save size={16} aria-hidden="true" />
              Save image
            </SubmitButton>
          </>
        }
      />

      <div className="grid grid-cols-1 gap-5 md:grid-cols-[17rem_minmax(0,1fr)] md:items-start">
        <section className="min-w-0 overflow-hidden rounded-2xl border border-black/10 bg-white shadow-sm">
          <ImagePreview src={image.publicUrl} alt={image.alt_text} />
          <div className="border-t border-black/[0.07] px-4 py-3">
            <p className="break-words text-sm font-semibold text-black">
              {image.original_filename || "Image"}
            </p>
            <p className="mt-0.5 text-xs text-black/50">{fileMeta(image)}</p>
          </div>
        </section>

        <Panel icon={ImageIcon} title="Image details" bodyClassName="grid gap-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <SelectField
              label="Image type"
              name="imageType"
              required
              defaultValue={image.image_type}
            >
              {IMAGE_TYPES.map((type) => (
                <option key={type.value} value={type.value}>
                  {type.label}
                </option>
              ))}
            </SelectField>

            <Field
              label="Sort order"
              name="sortOrder"
              type="number"
              min="0"
              inputMode="numeric"
              defaultValue={image.sort_order || 0}
              help="Lower numbers show first."
            />
          </div>

          <Field
            label="Image title"
            name="title"
            optional
            defaultValue={image.title || ""}
            placeholder="Front of the bag"
          />

          <Field
            label="Alternative text"
            name="altText"
            required
            defaultValue={image.alt_text || ""}
            placeholder="Describe the image"
            help="Describes the image for screen readers and search engines."
          />

          <div className="grid gap-3 sm:grid-cols-2">
            <Check
              name="isPrimary"
              title="Primary image"
              description="Shown first on the store."
              defaultChecked={image.is_primary === true}
            />
            <Check
              name="isActive"
              title="Visible"
              description="Show this image on the store."
              defaultChecked={image.is_active === true}
            />
          </div>
        </Panel>
      </div>
    </form>
  );
}

function ImageCard({ image, index, total, productId, basePath }) {
  return (
    <article
      className={`flex min-w-0 flex-col overflow-hidden rounded-xl border bg-white ${
        image.is_primary ? "border-black/30" : "border-black/10"
      }`}
    >
      <div className="relative">
        {image.publicUrl ? (
          <a
            href={image.publicUrl}
            target="_blank"
            rel="noreferrer"
            aria-label={`Open ${image.title || "image"} full size`}
          >
            <ImagePreview
              src={image.publicUrl}
              alt={image.alt_text}
              className={image.is_active ? "" : "opacity-50"}
            />
          </a>
        ) : (
          <ImagePreview src={null} />
        )}

        <div className="pointer-events-none absolute left-3 top-3 flex flex-wrap gap-1.5">
          {image.is_primary ? (
            <span className="inline-flex items-center gap-1 rounded-md bg-black px-2 py-0.5 text-xs font-semibold text-white">
              <Star size={12} aria-hidden="true" />
              Primary
            </span>
          ) : null}
          {!(image.is_primary && image.image_type === "primary") ? (
            <span className="rounded-md bg-white/95 px-2 py-0.5 text-xs font-semibold text-black shadow-sm ring-1 ring-black/5">
              {formatImageType(image.image_type)}
            </span>
          ) : null}
        </div>

        {!image.is_active ? (
          <Badge className="absolute right-3 top-3 bg-white">Hidden</Badge>
        ) : null}
      </div>

      <div className="flex-1 px-4 pt-3.5">
        <h3 className="truncate text-sm font-bold text-black">
          {image.title || image.original_filename || "Untitled image"}
        </h3>
        <p className="mt-0.5 line-clamp-2 text-sm text-black/55">
          {image.alt_text || "No alternative text"}
        </p>
        <p className="mt-1.5 text-xs text-black/40">{fileMeta(image)}</p>
      </div>

      <div className="mt-3 flex flex-wrap items-center justify-between gap-1 border-t border-black/[0.07] px-2.5 py-2">
        <div className="flex items-center gap-1">
          <Link
            href={`${basePath}?edit=${encodeURIComponent(image.id)}`}
            className="inline-flex h-8 items-center gap-1.5 rounded-lg px-2.5 text-sm font-semibold text-black transition hover:bg-black/[0.05]"
          >
            <Pencil size={14} aria-hidden="true" />
            Edit
          </Link>

          {!image.is_primary ? (
            <form action={setPrimaryProductImage}>
              <ImageFields productId={productId} imageId={image.id} />
              <button
                type="submit"
                className="inline-flex h-8 items-center gap-1.5 rounded-lg px-2.5 text-sm font-semibold text-black transition hover:bg-black/[0.05]"
              >
                <Star size={14} aria-hidden="true" />
                Make primary
              </button>
            </form>
          ) : null}
        </div>

        <div className="ml-auto flex items-center">
          <form action={moveProductImageUp}>
            <ImageFields productId={productId} imageId={image.id} />
            <button
              type="submit"
              disabled={index === 0}
              className={ICON_BUTTON}
              aria-label="Move earlier"
              title="Move earlier"
            >
              <ArrowUp size={16} aria-hidden="true" />
            </button>
          </form>

          <form action={moveProductImageDown}>
            <ImageFields productId={productId} imageId={image.id} />
            <button
              type="submit"
              disabled={index === total - 1}
              className={ICON_BUTTON}
              aria-label="Move later"
              title="Move later"
            >
              <ArrowDown size={16} aria-hidden="true" />
            </button>
          </form>

          <form action={toggleProductImageStatus}>
            <ImageFields productId={productId} imageId={image.id} />
            <input type="hidden" name="nextActive" value={image.is_active ? "false" : "true"} />
            <button
              type="submit"
              className={ICON_BUTTON}
              aria-label={image.is_active ? "Hide from the store" : "Show on the store"}
              title={image.is_active ? "Hide from the store" : "Show on the store"}
            >
              {image.is_active ? (
                <EyeOff size={16} aria-hidden="true" />
              ) : (
                <Eye size={16} aria-hidden="true" />
              )}
            </button>
          </form>

          <form action={deleteProductImage}>
            <ImageFields productId={productId} imageId={image.id} />
            <ConfirmSubmitButton
              message="Delete this image? This cannot be undone."
              className={`${ICON_BUTTON} hover:bg-red-50 hover:text-red-700`}
              aria-label="Delete image"
              title="Delete image"
            >
              <Trash2 size={16} aria-hidden="true" />
            </ConfirmSubmitButton>
          </form>
        </div>
      </div>
    </article>
  );
}

export default async function ProductImagesPage({ params, searchParams }) {
  const resolvedParams = await Promise.resolve(params || {});
  const resolvedSearchParams = await Promise.resolve(searchParams || {});

  const productId = decodeURIComponent(
    String(resolvedParams.productId || "").trim()
  );

  if (!productId) {
    notFound();
  }

  // Only this store's products; another store's product opens in its store.
  const storefront = requireAdminStore(resolvedParams.storefront);

  const product = await requireStoreProduct({
    storefront,
    productId,
    suffix: "/images",
    select: "product_id, title, slug"
  });

  const productBase = adminProductsPath(storefront, productId);
  const basePath = `${productBase}/images`;
  const productTitle = product.title || product.product_id;

  const showUploadForm = String(resolvedSearchParams.new || "") === "1";
  const editImageId = String(resolvedSearchParams.edit || "").trim();
  const noticeKey = Object.keys(NOTICES).find(
    (key) => String(resolvedSearchParams[key] || "") === "1"
  );

  const supabase = createSupabaseAdmin();

  const { data: images, error: imagesError } = await supabase
    .from("product_images")
    .select("*")
    .eq("product_id", productId)
    .order("is_primary", { ascending: false })
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });

  if (imagesError) {
    console.error("Unable to load product images:", imagesError);
  }

  const imagesWithUrls = (images || []).map((image) => {
    const { data } = supabase.storage
      .from(image.storage_bucket)
      .getPublicUrl(image.storage_path);

    return { ...image, publicUrl: data?.publicUrl || null };
  });

  const editingImage = editImageId
    ? imagesWithUrls.find((image) => image.id === editImageId)
    : null;

  if (editImageId && !editingImage) {
    notFound();
  }

  const primaryImage =
    imagesWithUrls.find((image) => image.is_primary && image.is_active) || null;
  const activeCount = imagesWithUrls.filter((image) => image.is_active).length;

  if (showUploadForm) {
    return (
      <UploadImageView
        productId={productId}
        productTitle={productTitle}
        cancelHref={basePath}
        hasPrimaryImage={Boolean(primaryImage)}
      />
    );
  }

  if (editingImage) {
    return (
      <EditImageView
        productId={productId}
        productTitle={productTitle}
        image={editingImage}
        cancelHref={basePath}
      />
    );
  }

  const links = {
    edit: `${productBase}/edit`,
    certifications: `${productBase}/certifications`,
    storefront: product.slug
      ? getStorefrontPageUrl(storefront.id, `/products/${product.slug}`)
      : null,
    delete: `${productBase}/delete`
  };

  return (
    <div className="grid grid-cols-1 gap-5">
      <PageHeader
        title="Manage images"
        subtitle={productTitle}
        actions={
          <Link href={`${basePath}?new=1`} className={BUTTON_PRIMARY}>
            <Upload size={16} aria-hidden="true" />
            Upload image
          </Link>
        }
      >
        <div className="mt-2.5 flex flex-wrap gap-1.5">
          <Badge>
            {imagesWithUrls.length} {imagesWithUrls.length === 1 ? "image" : "images"}
          </Badge>
          <Badge tone={activeCount ? "green" : "neutral"}>{activeCount} visible</Badge>
          {primaryImage ? (
            <Badge tone="green">Primary image set</Badge>
          ) : (
            <Badge tone="amber">No primary image</Badge>
          )}
        </div>
      </PageHeader>

      {noticeKey ? <SuccessNotice>{NOTICES[noticeKey]}</SuccessNotice> : null}

      <Panel
        icon={Images}
        title="Images"
        description="The primary image is shown first on the store. Use the arrows to change the order."
        bodyClassName={imagesWithUrls.length ? "grid gap-4 sm:grid-cols-2 xl:grid-cols-3" : ""}
      >
        {imagesWithUrls.length === 0 ? (
          <div className="px-2 py-10 text-center">
            <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-[#f1eadf] text-black">
              <Images size={24} aria-hidden="true" />
            </span>
            <h3 className="mt-4 text-lg font-bold text-black">No images yet</h3>
            <p className="mx-auto mt-1.5 max-w-md text-sm text-black/55">
              Upload a primary photo first, then add more angles, packaging, or lifestyle shots.
            </p>
            <Link href={`${basePath}?new=1`} className={`${BUTTON_PRIMARY} mt-5`}>
              <Upload size={16} aria-hidden="true" />
              Upload first image
            </Link>
          </div>
        ) : (
          imagesWithUrls.map((image, index) => (
            <ImageCard
              key={image.id}
              image={image}
              index={index}
              total={imagesWithUrls.length}
              productId={productId}
              basePath={basePath}
            />
          ))
        )}
      </Panel>

      <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
        <ProductActionsCard
          links={links}
          storefrontName={storefront.name}
          current="images"
        />
      </div>
    </div>
  );
}
