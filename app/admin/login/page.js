import Link from "next/link";
import { loginAdmin } from "@/app/admin/actions";

export const dynamic = "force-dynamic";

export default function AdminLoginPage({
  searchParams
}) {
  const error =
    typeof searchParams?.error === "string"
      ? searchParams.error
      : "";

  return (
    <main className="min-h-screen bg-[#f7f3eb] px-5 py-24 text-black">
      <div className="mx-auto max-w-md rounded-[2rem] bg-white p-6 shadow-soft md:p-8">
        <div className="text-sm font-bold uppercase tracking-[.18em]">
          Shakti Foods Admin
        </div>

        <h1 className="mt-3 font-display text-4xl font-bold">
          Admin login
        </h1>

        <p className="mt-3 leading-7 text-black/70">
          Sign in with the admin account you created in Supabase.
        </p>

        {error ? (
          <div className="mt-5 rounded-2xl bg-red-50 px-4 py-3 text-sm font-semibold text-red-800">
            {error}
          </div>
        ) : null}

        <form
          action={loginAdmin}
          className="mt-7 grid gap-5"
        >
          <label className="grid gap-2">
            <span className="text-sm font-bold">
              Email address
            </span>

            <input
              type="email"
              name="email"
              required
              autoComplete="email"
              placeholder="admin@example.com"
              className="rounded-2xl border border-black/15 bg-white px-4 py-3 outline-none transition focus:border-black"
            />
          </label>

          <label className="grid gap-2">
            <span className="text-sm font-bold">
              Password
            </span>

            <input
              type="password"
              name="password"
              required
              autoComplete="current-password"
              placeholder="Enter your password"
              className="rounded-2xl border border-black/15 bg-white px-4 py-3 outline-none transition focus:border-black"
            />
          </label>

          <button
            type="submit"
            className="rounded-full bg-black px-6 py-4 font-bold text-white transition hover:bg-[#333333]"
          >
            Sign In
          </button>
        </form>

        <Link
          href="/"
          className="mt-6 block text-center text-sm font-bold underline"
        >
          Return to storefront
        </Link>
      </div>
    </main>
  );
}