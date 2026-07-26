"use client";

import {
  ChevronLeft,
  ChevronRight
} from "lucide-react";
import {
  useEffect,
  useMemo,
  useState
} from "react";

const PLACEHOLDER_IMAGE =
  "/images/product-placeholder.png";

export default function ProductImageGallery({
  images = [],
  productName = "Product"
}) {
  const normalizedImages = useMemo(() => {
    const uniqueUrls = new Set();

    return images
      .filter((image) => image?.url)
      .filter((image) => {
        if (uniqueUrls.has(image.url)) {
          return false;
        }

        uniqueUrls.add(image.url);
        return true;
      });
  }, [images]);

  const [selectedIndex, setSelectedIndex] =
    useState(0);

  useEffect(() => {
    setSelectedIndex(0);
  }, [normalizedImages]);

  const galleryImages =
    normalizedImages.length > 0
      ? normalizedImages
      : [
          {
            id: "placeholder",
            url: PLACEHOLDER_IMAGE,
            altText: productName
          }
        ];

  const selectedImage =
    galleryImages[selectedIndex] ||
    galleryImages[0];

  function showPrevious() {
    setSelectedIndex((current) =>
      current === 0
        ? galleryImages.length - 1
        : current - 1
    );
  }

  function showNext() {
    setSelectedIndex((current) =>
      current ===
      galleryImages.length - 1
        ? 0
        : current + 1
    );
  }

  return (
    <div className="grid gap-4">
      <div className="group relative overflow-hidden rounded-[2rem] bg-[#faf6ee] shadow-soft">
        <div className="relative aspect-square min-h-[320px] w-full md:min-h-[520px]">
          <img
            key={selectedImage.url}
            src={selectedImage.url}
            alt={
              selectedImage.altText ||
              productName
            }
            className="h-full w-full object-contain p-6 transition duration-300 group-hover:scale-[1.04] md:p-10"
          />
        </div>

        {galleryImages.length > 1 ? (
          <>
            <button
              type="button"
              onClick={showPrevious}
              aria-label="Previous product image"
              className="absolute left-4 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-white/95 text-black shadow transition hover:bg-black hover:text-white"
            >
              <ChevronLeft size={21} />
            </button>

            <button
              type="button"
              onClick={showNext}
              aria-label="Next product image"
              className="absolute right-4 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-white/95 text-black shadow transition hover:bg-black hover:text-white"
            >
              <ChevronRight size={21} />
            </button>

            <div className="absolute bottom-4 right-4 rounded-full bg-black/75 px-3 py-1.5 text-xs font-bold text-white backdrop-blur">
              {selectedIndex + 1} /{" "}
              {galleryImages.length}
            </div>
          </>
        ) : null}
      </div>

      {galleryImages.length > 1 ? (
        <div className="flex gap-3 overflow-x-auto pb-2">
          {galleryImages.map(
            (image, index) => {
              const selected =
                index === selectedIndex;

              return (
                <button
                  key={
                    image.id ||
                    `${image.url}-${index}`
                  }
                  type="button"
                  onClick={() =>
                    setSelectedIndex(index)
                  }
                  aria-label={`View product image ${
                    index + 1
                  }`}
                  className={[
                    "relative h-24 w-24 shrink-0 overflow-hidden rounded-2xl bg-[#faf6ee] transition",
                    selected
                      ? "ring-2 ring-black ring-offset-2"
                      : "ring-1 ring-black/10 hover:ring-black/40"
                  ].join(" ")}
                >
                  <img
                    src={image.url}
                    alt={
                      image.altText ||
                      `${productName} image ${
                        index + 1
                      }`
                    }
                    className="h-full w-full object-contain p-2"
                    loading="lazy"
                  />

                  {image.isPrimary ? (
                    <span className="absolute bottom-1 left-1 rounded-full bg-black px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide text-white">
                      Primary
                    </span>
                  ) : null}
                </button>
              );
            }
          )}
        </div>
      ) : null}
    </div>
  );
}