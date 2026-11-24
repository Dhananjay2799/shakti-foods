"use client";

import AdminErrorPanel from "@/components/admin/AdminErrorPanel";

export default function AdminError({ error, reset }) {
  return <AdminErrorPanel error={error} reset={reset} />;
}
