import Link from "next/link";
import { notFound } from "next/navigation";
import {
  Activity,
  ArrowLeft,
  BrainCircuit,
  ChevronRight,
  FileText,
  MapPin,
  Settings,
  UserRound
} from "lucide-react";
import { createSupabaseAdmin } from "@/lib/supabase-admin";

export const dynamic = "force-dynamic";

function getInitials(name, email) {
  const source = String(name || email || "Customer").trim();
  return source
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word.charAt(0).toUpperCase())
    .join("");
}

function SettingsLink({
  href,
  icon: Icon,
  title,
  description
}) {
  return (
    <Link
      href={href}
      className="group flex items-center gap-3 rounded-2xl border border-black/5 bg-[#faf8f4] p-4 transition hover:border-black/10 hover:bg-[#f1eadf]"
    >
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white text-black shadow-sm">
        <Icon size={18} />
      </span>

      <span className="min-w-0 flex-1">
        <span className="block text-sm font-bold text-black">
          {title}
        </span>

        <span className="mt-1 block text-xs leading-5 text-black/45">
          {description}
        </span>
      </span>

      <ChevronRight
        size={16}
        className="shrink-0 text-black/30 transition group-hover:translate-x-0.5 group-hover:text-black"
      />
    </Link>
  );
}

function DisabledSettingsItem({
  icon: Icon,
  title,
  description
}) {
  return (
    <div className="flex cursor-not-allowed items-center gap-3 rounded-2xl border border-black/5 bg-black/[0.025] p-4 opacity-55">
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white text-black/50 shadow-sm">
        <Icon size={18} />
      </span>

      <span className="min-w-0 flex-1">
        <span className="flex flex-wrap items-center gap-2">
          <span className="text-sm font-bold text-black/65">
            {title}
          </span>

          <span className="rounded-full bg-black/5 px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.08em] text-black/45">
            Coming soon
          </span>
        </span>

        <span className="mt-1 block text-xs leading-5 text-black/40">
          {description}
        </span>
      </span>
    </div>
  );
}

export default async function CustomerSettingsLayout({
  children,
  params
}) {
  const resolvedParams = await Promise.resolve(params || {});
  const customerId = String(resolvedParams.customerId || "").trim();

  if (!customerId) {
    notFound();
  }

  const supabase = createSupabaseAdmin();

  const { data: customer, error } = await supabase
    .from("customers")
    .select(
      `
        id,
        full_name,
        email,
        company_name,
        customer_type,
        status,
        is_wholesale
      `
    )
    .eq("id", customerId)
    .maybeSingle();

  if (error || !customer) {
    console.error("Unable to load customer settings layout:", error);
    notFound();
  }

  return (
    <main className="min-h-screen bg-[#f8f6f1]">
      <div className="mx-auto max-w-6xl px-5 py-6 md:px-8 md:py-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Link
            href={`/admin/customers/${customerId}`}
            className="inline-flex items-center gap-2 rounded-full bg-white px-4 py-2.5 text-sm font-bold text-black shadow-sm transition hover:bg-[#f1eadf]"
          >
            <ArrowLeft size={16} />
            Back to Profile
          </Link>

          <Link
            href="/admin/customers"
            className="inline-flex rounded-full bg-[#f1eadf] px-4 py-2.5 text-sm font-bold text-black transition hover:bg-[#e6dac7]"
          >
            All Customers
          </Link>
        </div>

        <header className="mt-6 rounded-[1.75rem] border border-black/5 bg-white p-5 shadow-sm md:p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
            <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-black text-lg font-bold text-white">
              {getInitials(customer.full_name, customer.email)}
            </span>

            <div className="min-w-0 flex-1">
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-black/40">
                Customer Management
              </p>

              <h1 className="mt-1 font-display text-3xl font-bold leading-tight text-black md:text-4xl">
                Customer Settings
              </h1>

              <p className="mt-1 break-words text-sm text-black/55">
                {customer.full_name || "Unnamed Customer"}
                {" · "}
                {customer.email}
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <span className="rounded-full bg-[#f1eadf] px-3 py-1.5 text-xs font-bold capitalize text-black">
                {customer.customer_type || "retail"}
              </span>

              <span className="rounded-full bg-green-100 px-3 py-1.5 text-xs font-bold capitalize text-green-800">
                {customer.status || "active"}
              </span>

              {customer.is_wholesale ? (
                <span className="rounded-full bg-purple-100 px-3 py-1.5 text-xs font-bold text-purple-800">
                  Wholesale enabled
                </span>
              ) : null}
            </div>
          </div>
        </header>

        <div className="mt-6 grid items-start gap-6 lg:grid-cols-[280px_minmax(0,1fr)]">
          <aside className="rounded-[1.75rem] border border-black/5 bg-white p-4 shadow-sm lg:sticky lg:top-5">
            <div className="px-2 pb-4">
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-black/40">
                Settings Menu
              </p>

              <p className="mt-2 text-sm leading-6 text-black/50">
                Manage this customer’s information and business relationship.
              </p>
            </div>

            <nav className="grid gap-2">
              <SettingsLink
                href={`/admin/customers/${customerId}/settings`}
                icon={UserRound}
                title="General"
                description="Identity, classification, tags, and notes."
              />

              <SettingsLink
                href={`/admin/customers/${customerId}/settings/addresses`}
                icon={MapPin}
                title="Addresses"
                description="Shipping and billing locations."
              />

              {/* Step 4: Enabled Documents route list link */}
              <SettingsLink
                href={`/admin/customers/${customerId}/settings/documents`}
                icon={FileText}
                title="Documents"
                description="Tax forms, agreements, and customer files."
              />

              <SettingsLink
                href={`/admin/customers/${customerId}/settings/activity`}
                icon={Activity}
                title="Activity"
                description="Customer changes and administrative history."
              />

              <DisabledSettingsItem
                icon={BrainCircuit}
                title="AI Insights"
                description="Predictions, segments, and recommended actions."
              />
            </nav>

            <div className="mt-4 rounded-2xl bg-amber-50 p-4">
              <div className="flex items-start gap-3">
                <Settings
                  size={17}
                  className="mt-0.5 shrink-0 text-amber-800"
                />

                <p className="text-xs leading-5 text-amber-900">
                  Additional customer modules will appear here as they are completed.
                </p>
              </div>
            </div>
          </aside>

          <section className="min-w-0">
            {children}
          </section>
        </div>
      </div>
    </main>
  );
}