import Link from "next/link";
import { notFound } from "next/navigation";
import { createSupabaseAdmin } from "@/lib/supabase-admin";
import { getAdminStorefront } from "@/lib/admin-storefronts";

export const dynamic = "force-dynamic";

function formatDate(value) {
  if (!value) {
    return "Unknown";
  }

  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "America/New_York"
  }).format(new Date(value));
}

function formatTransactionType(value) {
  if (!value) {
    return "Unknown";
  }

  return value
    .replaceAll("_", " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function getQuantityStyle(quantity) {
  const amount = Number(quantity || 0);

  if (amount > 0) {
    return "bg-green-100 text-green-800";
  }

  if (amount < 0) {
    return "bg-red-100 text-red-800";
  }

  return "bg-gray-100 text-gray-700";
}

function formatQuantity(quantity) {
  const amount = Number(quantity || 0);

  if (amount > 0) {
    return `+${amount}`;
  }

  return String(amount);
}

export default async function InventoryHistoryPage({
  params,
  searchParams
}) {
  const resolvedParams = await Promise.resolve(params);

  const storefront = getAdminStorefront(resolvedParams.storefront);

  if (!storefront) {
    notFound();
  }

  const basePath = `/admin/${storefront.slug}`;

  const queryParams = await Promise.resolve(searchParams || {});

  const supabase = createSupabaseAdmin();

  const selectedProduct =
    typeof queryParams?.product === "string"
      ? queryParams.product.trim()
      : "";

  let transactionQuery = supabase
    .from("inventory_transactions")
    .select(
      `
        id,
        product_id,
        transaction_type,
        quantity_change,
        quantity_before,
        quantity_after,
        notes,
        created_at
      `
    )
    .eq("storefront", storefront.id)
    .order("created_at", {
      ascending: false
    })
    .limit(250);

  if (selectedProduct) {
    transactionQuery = transactionQuery.eq(
      "product_id",
      selectedProduct
    );
  }

  const [
    transactionsResult,
    inventoryResult
  ] = await Promise.all([
    transactionQuery,

    supabase
      .from("inventory")
      .select("product_id, product_name")
      .eq("storefront", storefront.id)
      .order("product_name")
  ]);

  if (transactionsResult.error) {
    console.error(
      "Unable to load inventory transactions:",
      transactionsResult.error
    );
  }

  if (inventoryResult.error) {
    console.error(
      "Unable to load inventory products:",
      inventoryResult.error
    );
  }

  const transactions = transactionsResult.data || [];
  const products = inventoryResult.data || [];

  const productNames = new Map(
    products.map((product) => [
      product.product_id,
      product.product_name
    ])
  );

  return (
    <main className="min-h-screen bg-[#f8f6f1]">
      <div className="mx-auto max-w-7xl px-5 py-10 md:px-8 md:py-12">
        <div className="flex flex-wrap items-end justify-between gap-5">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-black/40">
              {storefront.name} Inventory
            </p>

            <h1 className="mt-2 text-3xl font-bold">
              Inventory History
            </h1>

            <p className="mt-2 text-sm text-black/55">
              Review inventory movements for {storefront.name}.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <Link
              href={`${basePath}/inventory`}
              className="rounded-full bg-black px-5 py-3 font-bold text-white"
            >
              Manage Inventory
            </Link>

            <Link
              href={basePath}
              className="rounded-full bg-[#eadfce] px-5 py-3 font-bold text-black"
            >
              Dashboard
            </Link>
          </div>
        </div>

        <section className="mt-10 rounded-[2rem] bg-white p-5 shadow md:p-7">
          <div className="flex flex-wrap items-end justify-between gap-5">
            <form
              method="GET"
              className="flex flex-wrap items-end gap-3"
            >
              <label className="grid gap-2">
                <span className="text-sm font-bold text-black">
                  Filter by product
                </span>

                <select
                  name="product"
                  defaultValue={selectedProduct}
                  className="min-w-[260px] rounded-2xl border border-black/15 bg-white px-4 py-3 text-black outline-none focus:border-black"
                >
                  <option value="">
                    All products
                  </option>

                  {products.map((product) => (
                    <option
                      key={product.product_id}
                      value={product.product_id}
                    >
                      {product.product_name}
                    </option>
                  ))}
                </select>
              </label>

              <button
                type="submit"
                className="rounded-full bg-black px-5 py-3 font-bold text-white"
              >
                Apply Filter
              </button>

              {selectedProduct ? (
                <Link
                  href={`${basePath}/inventory/history`}
                  className="rounded-full bg-[#eadfce] px-5 py-3 font-bold text-black"
                >
                  Clear
                </Link>
              ) : null}
            </form>

            <span className="rounded-full bg-black px-4 py-2 text-sm font-bold text-white">
              {transactions.length} records
            </span>
          </div>

          {transactions.length === 0 ? (
            <div className="mt-8 rounded-2xl bg-[#faf7f1] p-6 text-black/60">
              No inventory transactions were found.
            </div>
          ) : (
            <div className="mt-8 overflow-x-auto">
              <table className="w-full min-w-[1050px] text-left">
                <thead>
                  <tr className="border-b border-black/10 text-sm text-black/50">
                    <th className="pb-4 pr-5">
                      Date
                    </th>

                    <th className="pb-4 pr-5">
                      Product
                    </th>

                    <th className="pb-4 pr-5">
                      Type
                    </th>

                    <th className="pb-4 pr-5">
                      Change
                    </th>

                    <th className="pb-4 pr-5">
                      Before
                    </th>

                    <th className="pb-4 pr-5">
                      After
                    </th>

                    <th className="pb-4">
                      Notes
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {transactions.map((transaction) => (
                    <tr
                      key={transaction.id}
                      className="border-b border-black/5"
                    >
                      <td className="py-5 pr-5 text-sm text-black/60">
                        {formatDate(
                          transaction.created_at
                        )}
                      </td>

                      <td className="py-5 pr-5">
                        <div className="font-bold text-black">
                          {productNames.get(
                            transaction.product_id
                          ) ||
                            transaction.product_id ||
                            "Unknown product"}
                        </div>

                        <div className="mt-1 text-xs text-black/50">
                          {transaction.product_id}
                        </div>
                      </td>

                      <td className="py-5 pr-5">
                        <span className="rounded-full bg-[#eee7db] px-3 py-1 text-sm font-bold text-black">
                          {formatTransactionType(
                            transaction.transaction_type
                          )}
                        </span>
                      </td>

                      <td className="py-5 pr-5">
                        <span
                          className={`inline-flex min-w-14 justify-center rounded-full px-3 py-1 text-sm font-bold ${getQuantityStyle(
                            transaction.quantity_change
                          )}`}
                        >
                          {formatQuantity(
                            transaction.quantity_change
                          )}
                        </span>
                      </td>

                      <td className="py-5 pr-5 font-semibold text-black">
                        {transaction.quantity_before ??
                          "—"}
                      </td>

                      <td className="py-5 pr-5 font-semibold text-black">
                        {transaction.quantity_after ??
                          "—"}
                      </td>

                      <td className="max-w-[280px] py-5 text-sm leading-6 text-black/60">
                        {transaction.notes ||
                          "No notes provided"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}