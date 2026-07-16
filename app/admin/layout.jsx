import AdminNavigation from "@/components/admin/AdminNavigation";
import { logoutAdmin } from "@/app/admin/actions";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function AdminLayout({
  children
}) {
  const supabase = await createClient();

  const {
    data: { user }
  } = await supabase.auth.getUser();

  return (
    <div className="min-h-screen bg-[#f8f6f1] text-black">
      <div className="sticky top-0 z-40 bg-[#f8f6f1]/95 pt-20 backdrop-blur md:pt-24">
        <div className="border-y border-black/10 bg-white">
          <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-5 py-4 md:px-8">
            <div>
              <div className="text-xs font-bold uppercase tracking-[.18em] text-black/50">
                Shakti Foods
              </div>

              <div className="font-display text-2xl font-bold">
                Admin Portal
              </div>

              <div className="mt-1 text-xs text-black/55">
                {user?.email || "Administrator"}
              </div>
            </div>

            <form action={logoutAdmin}>
              <button
                type="submit"
                className="rounded-full bg-black px-5 py-3 text-sm font-bold text-white transition hover:bg-[#333333]"
              >
                Sign Out
              </button>
            </form>
          </div>
        </div>

        <AdminNavigation />
      </div>

      {children}
    </div>
  );
}