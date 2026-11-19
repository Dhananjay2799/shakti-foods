import { NO_INDEX_METADATA } from "@/lib/no-index";

// Private pages: keep them out of Google.
export const metadata = NO_INDEX_METADATA;

export default function NoIndexLayout({ children }) {
  return children;
}
