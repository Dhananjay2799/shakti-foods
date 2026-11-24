import AdminToaster from "@/components/admin/AdminToaster";
import { NO_INDEX_METADATA } from "@/lib/no-index";

// Private pages: keep them out of Google.
export const metadata = NO_INDEX_METADATA;

// AdminToaster: "Changes saved successfully" / "Changes not saved" on every
// admin page (see components/admin/AdminToaster.jsx).
export default function AdminLayout({ children }) {
  return <AdminToaster>{children}</AdminToaster>;
}
