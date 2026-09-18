import Link from "next/link";
import { redirect } from "next/navigation";
import { requireAuthenticatedAdmin } from "@/lib/admin-auth";
import {
  ADMIN_STOREFRONTS
} from "@/lib/admin-storefronts";

export const dynamic = "force-dynamic";

export default async function SelectAdminStorePage() {
  const user =
    await requireAuthenticatedAdmin();

  if (!user) {
    redirect("/admin/login");
  }

  const shakti =
    ADMIN_STOREFRONTS.shakti_foods;

  const ecoware =
    ADMIN_STOREFRONTS.ecoware;

  return (
    <main className="min-h-screen bg-[#f8f6f1] px-5 py-12 text-black md:py-20">
      <div className="mx-auto max-w-6xl">
        <div className="text-center">
          <div className="text-xs font-black uppercase tracking-[.22em] text-black/45">
            Commerce Administration
          </div>

          <h1 className="mt-4 font-display text-5xl font-bold md:text-6xl">
            Choose a storefront
          </h1>

          <p className="mx-auto mt-4 max-w-2xl text-base leading-7 text-black/60">
            Select the business you want to
            manage. You can switch between
            storefronts at any time.
          </p>

          <p className="mt-3 text-sm text-black/40">
            Signed in as {user.email}
          </p>
        </div>

        <div className="mt-12 grid gap-6 md:grid-cols-2">
          <Link
            href="/admin/shakti-foods"
            className="group rounded-[2rem] bg-white p-8 shadow transition duration-300 hover:-translate-y-1 hover:shadow-xl md:p-10"
          >
            <div className="text-xs font-black uppercase tracking-[.2em] text-black/40">
              Storefront 01
            </div>

            <h2 className="mt-5 font-display text-4xl font-bold">
              {shakti.name}
            </h2>

            <p className="mt-4 min-h-[84px] leading-7 text-black/60">
              {shakti.description}
            </p>

            <div className="mt-8 inline-flex rounded-full bg-black px-6 py-3 font-bold text-white">
              Manage Shakti Foods →
            </div>
          </Link>

          <Link
            href="/admin/ecoware"
            className="group rounded-[2rem] bg-[#eee7db] p-8 shadow transition duration-300 hover:-translate-y-1 hover:shadow-xl md:p-10"
          >
            <div className="text-xs font-black uppercase tracking-[.2em] text-black/40">
              Storefront 02
            </div>

            <h2 className="mt-5 font-display text-4xl font-bold">
              {ecoware.name}
            </h2>

            <p className="mt-4 min-h-[84px] leading-7 text-black/60">
              {ecoware.description}
            </p>

            <div className="mt-8 inline-flex rounded-full bg-black px-6 py-3 font-bold text-white">
              Manage Ecoware →
            </div>
          </Link>
        </div>

        <div className="mt-10 text-center">
          <Link
            href="/"
            className="text-sm font-bold underline"
          >
            Return to Shakti Foods website
          </Link>
        </div>
      </div>
    </main>
  );
}