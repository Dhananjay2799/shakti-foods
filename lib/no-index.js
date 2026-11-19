/*
 * Metadata for pages that should never appear in Google: cart, checkout,
 * order confirmation, subscription checkout and admin. Used by those
 * sections' layout files (a page's own robots setting replaces this one).
 */
export const NO_INDEX_METADATA = {
  robots: {
    index: false,
    follow: false
  }
};
