import Link from "next/link";
import { notFound } from "next/navigation";
import {
  Building2,
  Save,
  ShieldCheck,
  Tag,
  UserRound
} from "lucide-react";
import { createSupabaseAdmin } from "@/lib/supabase-admin";
import { updateCustomer } from "@/app/admin/customers/customer-actions";

export const dynamic = "force-dynamic";

function formatCustomerType(type) {
  switch (type) {
    case "wholesale":
      return "Wholesale";

    case "business":
      return "Business";

    default:
      return "Retail";
  }
}

function formatStatus(status) {
  return String(status || "active")
    .replaceAll("_", " ")
    .replace(/\b\w/g, (letter) =>
      letter.toUpperCase()
    );
}

export default async function CustomerGeneralSettingsPage({
  params,
  searchParams
}) {
  const resolvedParams = await Promise.resolve(
    params || {}
  );

  const resolvedSearchParams =
    await Promise.resolve(searchParams || {});

  const customerId = String(
    resolvedParams.customerId || ""
  ).trim();

  const updated =
    String(
      resolvedSearchParams.updated || ""
    ) === "1";

  if (!customerId) {
    notFound();
  }

  const supabase = createSupabaseAdmin();

  const { data: customer, error } =
    await supabase
      .from("customers")
      .select("*")
      .eq("id", customerId)
      .maybeSingle();

  if (error || !customer) {
    console.error(
      "Unable to load general customer settings:",
      error
    );

    notFound();
  }

  return (
    <div className="grid gap-5">
      <div className="rounded-[1.75rem] border border-black/5 bg-white p-5 shadow-sm md:p-6">
        <p className="text-xs font-bold uppercase tracking-[0.16em] text-black/40">
          General Settings
        </p>

        <h2 className="mt-2 font-display text-3xl font-bold text-black">
          Customer Information
        </h2>

        <p className="mt-2 text-sm leading-6 text-black/50">
          Update customer identity, account classification, wholesale access, and internal CRM information.
        </p>
      </div>

      {updated ? (
        <div className="rounded-2xl border border-green-200 bg-green-50 px-5 py-4 text-sm font-semibold text-green-800">
          Customer settings were updated successfully.
        </div>
      ) : null}

      <form
        action={updateCustomer}
        className="grid gap-5"
      >
        <input
          type="hidden"
          name="customerId"
          value={customer.id}
        />

        <section className="rounded-[1.75rem] border border-black/5 bg-white p-5 shadow-sm md:p-6">
          <div className="flex items-center gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#f1eadf] text-black">
              <UserRound size={21} />
            </span>

            <div>
              <h3 className="font-display text-2xl font-bold text-black">
                Customer Information
              </h3>

              <p className="mt-1 text-sm text-black/50">
                Update customer identity and contact details.
              </p>
            </div>
          </div>

          <div className="mt-5 grid gap-5 md:grid-cols-2">
            <label className="grid gap-2">
              <span className="text-sm font-bold text-black">
                Full name
              </span>

              <input
                type="text"
                name="fullName"
                defaultValue={
                  customer.full_name || ""
                }
                placeholder="Customer name"
                className="h-12 rounded-2xl border border-black/10 bg-[#faf8f4] px-4 text-sm text-black outline-none transition focus:border-black"
              />
            </label>

            <label className="grid gap-2">
              <span className="text-sm font-bold text-black">
                Phone
              </span>

              <input
                type="tel"
                name="phone"
                defaultValue={
                  customer.phone || ""
                }
                placeholder="+1 954 000 0000"
                className="h-12 rounded-2xl border border-black/10 bg-[#faf8f4] px-4 text-sm text-black outline-none transition focus:border-black"
              />
            </label>

            <label className="grid gap-2 md:col-span-2">
              <span className="text-sm font-bold text-black">
                Company name
              </span>

              <input
                type="text"
                name="companyName"
                defaultValue={
                  customer.company_name || ""
                }
                placeholder="Business or organization"
                className="h-12 rounded-2xl border border-black/10 bg-[#faf8f4] px-4 text-sm text-black outline-none transition focus:border-black"
              />
            </label>
          </div>
        </section>

        <section className="rounded-[1.75rem] border border-black/5 bg-white p-5 shadow-sm md:p-6">
          <div className="flex items-center gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#f1eadf] text-black">
              <Building2 size={21} />
            </span>

            <div>
              <h3 className="font-display text-2xl font-bold text-black">
                Classification
              </h3>

              <p className="mt-1 text-sm text-black/50">
                Control account type, status, and wholesale access.
              </p>
            </div>
          </div>

          <div className="mt-5 grid gap-5 md:grid-cols-2">
            <label className="grid gap-2">
              <span className="text-sm font-bold text-black">
                Customer type
              </span>

              <select
                name="customerType"
                defaultValue={
                  customer.customer_type ||
                  "retail"
                }
                className="h-12 rounded-2xl border border-black/10 bg-[#faf8f4] px-4 text-sm font-semibold text-black outline-none transition focus:border-black"
              >
                <option value="retail">
                  Retail
                </option>

                <option value="wholesale">
                  Wholesale
                </option>

                <option value="business">
                  Business
                </option>
              </select>
            </label>

            <label className="grid gap-2">
              <span className="text-sm font-bold text-black">
                Account status
              </span>

              <select
                name="status"
                defaultValue={
                  customer.status || "active"
                }
                className="h-12 rounded-2xl border border-black/10 bg-[#faf8f4] px-4 text-sm font-semibold text-black outline-none transition focus:border-black"
              >
                <option value="active">
                  Active
                </option>

                <option value="inactive">
                  Inactive
                </option>

                <option value="blocked">
                  Blocked
                </option>
              </select>
            </label>
          </div>

          <label className="mt-5 flex items-start gap-3 rounded-2xl border border-black/10 bg-[#faf8f4] p-4">
            <input
              type="checkbox"
              name="isWholesale"
              defaultChecked={
                customer.is_wholesale === true
              }
              className="mt-1 h-4 w-4"
            />

            <span>
              <span className="flex items-center gap-2 text-sm font-bold text-black">
                <ShieldCheck size={16} />
                Wholesale customer
              </span>

              <span className="mt-1 block text-xs leading-5 text-black/50">
                Enable wholesale pricing and future B2B workflows for this customer.
              </span>
            </span>
          </label>

          <div className="mt-5 rounded-2xl bg-[#faf8f4] p-4 text-sm text-black/60">
            Current classification:{" "}
            <strong className="text-black">
              {formatCustomerType(
                customer.customer_type
              )}
            </strong>
            {" · "}
            <strong className="text-black">
              {formatStatus(customer.status)}
            </strong>
          </div>
        </section>

        <section className="rounded-[1.75rem] border border-black/5 bg-white p-5 shadow-sm md:p-6">
          <div className="flex items-center gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#f1eadf] text-black">
              <Tag size={21} />
            </span>

            <div>
              <h3 className="font-display text-2xl font-bold text-black">
                CRM Information
              </h3>

              <p className="mt-1 text-sm text-black/50">
                Maintain private customer tags and notes.
              </p>
            </div>
          </div>

          <div className="mt-5 grid gap-5">
            <label className="grid gap-2">
              <span className="text-sm font-bold text-black">
                Tags
              </span>

              <input
                type="text"
                name="tags"
                defaultValue={
                  Array.isArray(customer.tags)
                    ? customer.tags.join(", ")
                    : ""
                }
                placeholder="vip, restaurant, repeat buyer"
                className="h-12 rounded-2xl border border-black/10 bg-[#faf8f4] px-4 text-sm text-black outline-none transition focus:border-black"
              />

              <span className="text-xs leading-5 text-black/45">
                Separate multiple tags with commas.
              </span>
            </label>

            <label className="grid gap-2">
              <span className="text-sm font-bold text-black">
                Internal notes
              </span>

              <textarea
                name="notes"
                defaultValue={
                  customer.notes || ""
                }
                rows={7}
                placeholder="Add private notes about this customer..."
                className="resize-y rounded-2xl border border-black/10 bg-[#faf8f4] px-4 py-3 text-sm leading-6 text-black outline-none transition focus:border-black"
              />
            </label>

            <div className="rounded-2xl bg-amber-50 p-4 text-sm leading-6 text-amber-900">
              Tags and notes are visible only inside the admin portal.
            </div>
          </div>
        </section>

        <div className="rounded-[1.75rem] border border-black/5 bg-white p-4 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <Link
              href={`/admin/customers/${customerId}`}
              className="rounded-full border border-black/10 bg-white px-6 py-3 text-sm font-bold text-black transition hover:bg-[#f1eadf]"
            >
              Cancel
            </Link>

            <button
              type="submit"
              className="inline-flex items-center justify-center gap-2 rounded-full bg-black px-7 py-3 text-sm font-bold text-white transition hover:bg-black/80"
            >
              <Save size={17} />
              Save General Settings
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}