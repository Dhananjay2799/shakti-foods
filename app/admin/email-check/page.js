import Link from "next/link";
import { requireAuthenticatedAdmin } from "@/lib/admin-auth";
import EmailCheckClient from "./EmailCheckClient";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Email Check"
};

export default async function AdminEmailCheckPage() {
  // Middleware already restricts /admin to administrators.
  const user = await requireAuthenticatedAdmin();

  return (
    <main className="min-h-screen bg-[#f8f6f1] px-5 py-12 text-black md:py-16">
      <div className="mx-auto max-w-4xl">
        <Link
          href="/admin/select-store"
          className="text-sm font-bold text-black/50 hover:text-black"
        >
          ← Admin
        </Link>

        <div className="mt-6 text-xs font-black uppercase tracking-[.22em] text-black/45">
          Commerce Administration
        </div>

        <h1 className="mt-3 font-display text-4xl font-bold md:text-5xl">
          Order email check
        </h1>

        <p className="mt-3 max-w-2xl leading-7 text-black/60">
          Shows how this deployment sends order emails for each store, and
          lets you send yourself a sample confirmation without placing an
          order. Test emails go only to {user.email}.
        </p>

        <EmailCheckClient />
      </div>
    </main>
  );
}
