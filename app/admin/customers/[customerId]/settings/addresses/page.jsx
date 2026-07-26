import Link from "next/link";
import { notFound } from "next/navigation";
import {
  Check,
  CircleOff,
  Edit3,
  MapPin,
  Plus,
  ReceiptText,
  Save,
  Star,
  Trash2,
  Truck,
  X
} from "lucide-react";
import { createSupabaseAdmin } from "@/lib/supabase-admin";
import {
  deleteCustomerAddress,
  saveCustomerAddress,
  setDefaultCustomerAddress,
  toggleCustomerAddressStatus
} from "@/app/admin/customers/address-actions";

export const dynamic = "force-dynamic";

function formatAddress(address) {
  return [
    address.address_line_1,
    address.address_line_2,
    [
      address.city,
      address.state,
      address.postal_code
    ]
      .filter(Boolean)
      .join(", "),
    address.country
  ]
    .filter(Boolean)
    .join("\n");
}

function AddressTypeBadge({ type }) {
  const isBilling = type === "billing";

  return (
    <span
      className={[
        "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold",
        isBilling
          ? "bg-blue-100 text-blue-800"
          : "bg-green-100 text-green-800"
      ].join(" ")}
    >
      {isBilling ? (
        <ReceiptText size={13} />
      ) : (
        <Truck size={13} />
      )}

      {isBilling ? "Billing" : "Shipping"}
    </span>
  );
}

function SuccessMessage({
  children
}) {
  return (
    <div className="rounded-2xl border border-green-200 bg-green-50 px-5 py-4 text-sm font-semibold text-green-800">
      <span className="inline-flex items-center gap-2">
        <Check size={17} />
        {children}
      </span>
    </div>
  );
}

function AddressForm({
  customerId,
  address,
  cancelHref
}) {
  const isEditing = Boolean(address);

  return (
    <form
      action={saveCustomerAddress}
      className="grid gap-5"
    >
      <input
        type="hidden"
        name="customerId"
        value={customerId}
      />

      <input
        type="hidden"
        name="addressId"
        value={address?.id || ""}
      />

      <section className="rounded-[1.75rem] border border-black/5 bg-white p-5 shadow-sm md:p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-black/40">
              {isEditing
                ? "Edit Address"
                : "New Address"}
            </p>

            <h3 className="mt-2 font-display text-3xl font-bold text-black">
              {isEditing
                ? address.label ||
                  "Saved Address"
                : "Add Customer Address"}
            </h3>

            <p className="mt-2 text-sm leading-6 text-black/50">
              Enter a shipping or billing location for this customer.
            </p>
          </div>

          <Link
            href={cancelHref}
            className="inline-flex items-center gap-2 rounded-full bg-[#f1eadf] px-4 py-2.5 text-sm font-bold text-black transition hover:bg-[#e6dac7]"
          >
            <X size={16} />
            Cancel
          </Link>
        </div>

        <div className="mt-6 grid gap-5 md:grid-cols-2">
          <label className="grid gap-2">
            <span className="text-sm font-bold text-black">
              Address type
            </span>

            <select
              name="addressType"
              defaultValue={
                address?.address_type ||
                "shipping"
              }
              required
              className="h-12 rounded-2xl border border-black/10 bg-[#faf8f4] px-4 text-sm font-semibold text-black outline-none transition focus:border-black"
            >
              <option value="shipping">
                Shipping
              </option>

              <option value="billing">
                Billing
              </option>
            </select>
          </label>

          <label className="grid gap-2">
            <span className="text-sm font-bold text-black">
              Address label
            </span>

            <input
              type="text"
              name="label"
              defaultValue={
                address?.label || ""
              }
              placeholder="Home, Office, Restaurant"
              className="h-12 rounded-2xl border border-black/10 bg-[#faf8f4] px-4 text-sm text-black outline-none transition focus:border-black"
            />
          </label>

          <label className="grid gap-2">
            <span className="text-sm font-bold text-black">
              Recipient name
            </span>

            <input
              type="text"
              name="recipientName"
              defaultValue={
                address?.recipient_name || ""
              }
              placeholder="Recipient name"
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
                address?.phone || ""
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
                address?.company_name || ""
              }
              placeholder="Business or organization"
              className="h-12 rounded-2xl border border-black/10 bg-[#faf8f4] px-4 text-sm text-black outline-none transition focus:border-black"
            />
          </label>

          <label className="grid gap-2 md:col-span-2">
            <span className="text-sm font-bold text-black">
              Address line 1
            </span>

            <input
              type="text"
              name="addressLine1"
              required
              defaultValue={
                address?.address_line_1 || ""
              }
              placeholder="Street address"
              className="h-12 rounded-2xl border border-black/10 bg-[#faf8f4] px-4 text-sm text-black outline-none transition focus:border-black"
            />
          </label>

          <label className="grid gap-2 md:col-span-2">
            <span className="text-sm font-bold text-black">
              Address line 2
            </span>

            <input
              type="text"
              name="addressLine2"
              defaultValue={
                address?.address_line_2 || ""
              }
              placeholder="Apartment, suite, unit, building"
              className="h-12 rounded-2xl border border-black/10 bg-[#faf8f4] px-4 text-sm text-black outline-none transition focus:border-black"
            />
          </label>

          <label className="grid gap-2">
            <span className="text-sm font-bold text-black">
              City
            </span>

            <input
              type="text"
              name="city"
              required
              defaultValue={
                address?.city || ""
              }
              placeholder="City"
              className="h-12 rounded-2xl border border-black/10 bg-[#faf8f4] px-4 text-sm text-black outline-none transition focus:border-black"
            />
          </label>

          <label className="grid gap-2">
            <span className="text-sm font-bold text-black">
              State or province
            </span>

            <input
              type="text"
              name="state"
              required
              defaultValue={
                address?.state || ""
              }
              placeholder="FL"
              className="h-12 rounded-2xl border border-black/10 bg-[#faf8f4] px-4 text-sm text-black outline-none transition focus:border-black"
            />
          </label>

          <label className="grid gap-2">
            <span className="text-sm font-bold text-black">
              Postal code
            </span>

            <input
              type="text"
              name="postalCode"
              required
              defaultValue={
                address?.postal_code || ""
              }
              placeholder="33331"
              className="h-12 rounded-2xl border border-black/10 bg-[#faf8f4] px-4 text-sm text-black outline-none transition focus:border-black"
            />
          </label>

          <label className="grid gap-2">
            <span className="text-sm font-bold text-black">
              Country code
            </span>

            <input
              type="text"
              name="country"
              required
              maxLength={2}
              defaultValue={
                address?.country || "US"
              }
              placeholder="US"
              className="h-12 rounded-2xl border border-black/10 bg-[#faf8f4] px-4 text-sm uppercase text-black outline-none transition focus:border-black"
            />
          </label>

          <label className="grid gap-2 md:col-span-2">
            <span className="text-sm font-bold text-black">
              Delivery instructions
            </span>

            <textarea
              name="deliveryInstructions"
              rows={4}
              defaultValue={
                address?.delivery_instructions ||
                ""
              }
              placeholder="Gate code, loading dock, delivery hours, or other instructions..."
              className="resize-y rounded-2xl border border-black/10 bg-[#faf8f4] px-4 py-3 text-sm leading-6 text-black outline-none transition focus:border-black"
            />
          </label>
        </div>

        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          <label className="flex items-start gap-3 rounded-2xl border border-black/10 bg-[#faf8f4] p-4">
            <input
              type="checkbox"
              name="isDefault"
              defaultChecked={
                address?.is_default === true
              }
              className="mt-1 h-4 w-4"
            />

            <span>
              <span className="block text-sm font-bold text-black">
                Default address
              </span>

              <span className="mt-1 block text-xs leading-5 text-black/50">
                Make this the default address for its selected type.
              </span>
            </span>
          </label>

          <label className="flex items-start gap-3 rounded-2xl border border-black/10 bg-[#faf8f4] p-4">
            <input
              type="checkbox"
              name="isActive"
              defaultChecked={
                address
                  ? address.is_active === true
                  : true
              }
              className="mt-1 h-4 w-4"
            />

            <span>
              <span className="block text-sm font-bold text-black">
                Active address
              </span>

              <span className="mt-1 block text-xs leading-5 text-black/50">
                Allow this address to be used for customer operations.
              </span>
            </span>
          </label>
        </div>
      </section>

      <div className="rounded-[1.75rem] border border-black/5 bg-white p-4 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Link
            href={cancelHref}
            className="rounded-full border border-black/10 bg-white px-6 py-3 text-sm font-bold text-black transition hover:bg-[#f1eadf]"
          >
            Cancel
          </Link>

          <button
            type="submit"
            className="inline-flex items-center justify-center gap-2 rounded-full bg-black px-7 py-3 text-sm font-bold text-white transition hover:bg-black/80"
          >
            <Save size={17} />
            {isEditing
              ? "Update Address"
              : "Save Address"}
          </button>
        </div>
      </div>
    </form>
  );
}

export default async function CustomerAddressesPage({
  params,
  searchParams
}) {
  const resolvedParams =
    await Promise.resolve(params || {});

  const resolvedSearchParams =
    await Promise.resolve(
      searchParams || {}
    );

  const customerId = String(
    resolvedParams.customerId || ""
  ).trim();

  if (!customerId) {
    notFound();
  }

  const editAddressId = String(
    resolvedSearchParams.edit || ""
  ).trim();

  const showNewForm =
    String(
      resolvedSearchParams.new || ""
    ) === "1";

  const saved =
    String(
      resolvedSearchParams.saved || ""
    ) === "1";

  const deleted =
    String(
      resolvedSearchParams.deleted || ""
    ) === "1";

  const defaulted =
    String(
      resolvedSearchParams.defaulted || ""
    ) === "1";

  const statusChanged =
    String(
      resolvedSearchParams.statusChanged ||
        ""
    ) === "1";

  const supabase = createSupabaseAdmin();

  const [customerResult, addressesResult] =
    await Promise.all([
      supabase
        .from("customers")
        .select(
          "id, full_name, email, phone, company_name"
        )
        .eq("id", customerId)
        .maybeSingle(),

      supabase
        .from("customer_addresses")
        .select("*")
        .eq("customer_id", customerId)
        .order("is_default", {
          ascending: false
        })
        .order("is_active", {
          ascending: false
        })
        .order("created_at", {
          ascending: false
        })
    ]);

  if (
    customerResult.error ||
    !customerResult.data
  ) {
    console.error(
      "Unable to load customer for addresses:",
      customerResult.error
    );

    notFound();
  }

  if (addressesResult.error) {
    console.error(
      "Unable to load customer addresses:",
      addressesResult.error
    );
  }

  const customer = customerResult.data;
  const addresses =
    addressesResult.data || [];

  const editingAddress = editAddressId
    ? addresses.find(
        (address) =>
          address.id === editAddressId
      )
    : null;

  if (
    editAddressId &&
    !editingAddress
  ) {
    notFound();
  }

  const basePath =
    `/admin/customers/${customerId}/settings/addresses`;

  if (showNewForm || editingAddress) {
    const addressForForm =
      editingAddress || {
        recipient_name:
          customer.full_name || "",
        company_name:
          customer.company_name || "",
        phone: customer.phone || "",
        country: "US",
        address_type: "shipping",
        is_active: true,
        is_default: false
      };

    return (
      <div className="grid gap-5">
        <AddressForm
          customerId={customerId}
          address={
            editingAddress
              ? addressForForm
              : null
          }
          cancelHref={basePath}
        />
      </div>
    );
  }

  const shippingAddresses =
    addresses.filter(
      (address) =>
        address.address_type ===
        "shipping"
    );

  const billingAddresses =
    addresses.filter(
      (address) =>
        address.address_type ===
        "billing"
    );

  return (
    <div className="grid gap-5">
      <div className="rounded-[1.75rem] border border-black/5 bg-white p-5 shadow-sm md:p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-black/40">
              Customer Settings
            </p>

            <h2 className="mt-2 font-display text-3xl font-bold text-black">
              Addresses
            </h2>

            <p className="mt-2 text-sm leading-6 text-black/50">
              Manage shipping and billing locations for this customer.
            </p>
          </div>

          <Link
            href={`${basePath}?new=1`}
            className="inline-flex items-center gap-2 rounded-full bg-black px-5 py-3 text-sm font-bold text-white transition hover:bg-black/80"
          >
            <Plus size={17} />
            Add Address
          </Link>
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-3">
          <div className="rounded-2xl bg-[#faf8f4] p-4">
            <p className="text-xs font-bold uppercase tracking-[0.1em] text-black/40">
              Total
            </p>

            <p className="mt-2 text-2xl font-bold text-black">
              {addresses.length}
            </p>
          </div>

          <div className="rounded-2xl bg-[#faf8f4] p-4">
            <p className="text-xs font-bold uppercase tracking-[0.1em] text-black/40">
              Shipping
            </p>

            <p className="mt-2 text-2xl font-bold text-black">
              {shippingAddresses.length}
            </p>
          </div>

          <div className="rounded-2xl bg-[#faf8f4] p-4">
            <p className="text-xs font-bold uppercase tracking-[0.1em] text-black/40">
              Billing
            </p>

            <p className="mt-2 text-2xl font-bold text-black">
              {billingAddresses.length}
            </p>
          </div>
        </div>
      </div>

      {saved ? (
        <SuccessMessage>
          Address was saved successfully.
        </SuccessMessage>
      ) : null}

      {deleted ? (
        <SuccessMessage>
          Address was deleted successfully.
        </SuccessMessage>
      ) : null}

      {defaulted ? (
        <SuccessMessage>
          Default address was updated successfully.
        </SuccessMessage>
      ) : null}

      {statusChanged ? (
        <SuccessMessage>
          Address status was updated successfully.
        </SuccessMessage>
      ) : null}

      {addresses.length === 0 ? (
        <section className="rounded-[1.75rem] border border-black/5 bg-white px-6 py-16 text-center shadow-sm">
          <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-[#f1eadf] text-black">
            <MapPin size={28} />
          </span>

          <h3 className="mt-5 text-xl font-bold text-black">
            No saved addresses
          </h3>

          <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-black/50">
            Add a shipping or billing address for this customer.
          </p>

          <Link
            href={`${basePath}?new=1`}
            className="mt-5 inline-flex items-center gap-2 rounded-full bg-black px-5 py-3 text-sm font-bold text-white"
          >
            <Plus size={17} />
            Add First Address
          </Link>
        </section>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {addresses.map((address) => (
            <article
              key={address.id}
              className={[
                "rounded-[1.75rem] border bg-white p-5 shadow-sm",
                address.is_default
                  ? "border-black/20"
                  : "border-black/5",
                address.is_active
                  ? ""
                  : "opacity-65"
              ].join(" ")}
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.12em] text-black/40">
                    {address.label ||
                      "Saved address"}
                  </p>

                  <h3 className="mt-2 text-lg font-bold text-black">
                    {address.recipient_name ||
                      customer.full_name ||
                      "Customer"}
                  </h3>
                </div>

                <div className="flex flex-wrap gap-2">
                  <AddressTypeBadge
                    type={address.address_type}
                  />

                  {address.is_default ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-black px-3 py-1 text-xs font-bold text-white">
                      <Star size={12} />
                      Default
                    </span>
                  ) : null}
                </div>
              </div>

              {address.company_name ? (
                <p className="mt-3 text-sm font-semibold text-black/65">
                  {address.company_name}
                </p>
              ) : null}

              <p className="mt-4 whitespace-pre-line text-sm leading-7 text-black/65">
                {formatAddress(address)}
              </p>

              {address.phone ? (
                <p className="mt-3 text-sm text-black/50">
                  {address.phone}
                </p>
              ) : null}

              {address.delivery_instructions ? (
                <div className="mt-4 rounded-2xl bg-[#faf8f4] p-4">
                  <p className="text-xs font-bold uppercase tracking-[0.1em] text-black/40">
                    Delivery Instructions
                  </p>

                  <p className="mt-2 text-sm leading-6 text-black/60">
                    {
                      address.delivery_instructions
                    }
                  </p>
                </div>
              ) : null}

              <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-black/5 pt-4">
                <span
                  className={[
                    "rounded-full px-3 py-1 text-xs font-bold",
                    address.is_active
                      ? "bg-green-100 text-green-800"
                      : "bg-gray-100 text-gray-600"
                  ].join(" ")}
                >
                  {address.is_active
                    ? "Active"
                    : "Inactive"}
                </span>

                <div className="flex flex-wrap gap-2">
                  <Link
                    href={`${basePath}?edit=${address.id}`}
                    className="inline-flex items-center gap-1.5 rounded-full bg-[#f1eadf] px-3 py-2 text-xs font-bold text-black transition hover:bg-[#e6dac7]"
                  >
                    <Edit3 size={14} />
                    Edit
                  </Link>

                  {!address.is_default ? (
                    <form
                      action={
                        setDefaultCustomerAddress
                      }
                    >
                      <input
                        type="hidden"
                        name="customerId"
                        value={customerId}
                      />

                      <input
                        type="hidden"
                        name="addressId"
                        value={address.id}
                      />

                      <button
                        type="submit"
                        className="inline-flex items-center gap-1.5 rounded-full bg-blue-100 px-3 py-2 text-xs font-bold text-blue-800"
                      >
                        <Star size={14} />
                        Set Default
                      </button>
                    </form>
                  ) : null}

                  <form
                    action={
                      toggleCustomerAddressStatus
                    }
                  >
                    <input
                      type="hidden"
                      name="customerId"
                      value={customerId}
                    />

                    <input
                      type="hidden"
                      name="addressId"
                      value={address.id}
                    />

                    <input
                      type="hidden"
                      name="nextActive"
                      value={
                        address.is_active
                          ? "false"
                          : "true"
                      }
                    />

                    <button
                      type="submit"
                      className={[
                        "inline-flex items-center gap-1.5 rounded-full px-3 py-2 text-xs font-bold",
                        address.is_active
                          ? "bg-amber-100 text-amber-800"
                          : "bg-green-100 text-green-800"
                      ].join(" ")}
                    >
                      <CircleOff size={14} />

                      {address.is_active
                        ? "Deactivate"
                        : "Activate"}
                    </button>
                  </form>

                  <form
                    action={
                      deleteCustomerAddress
                    }
                  >
                    <input
                      type="hidden"
                      name="customerId"
                      value={customerId}
                    />

                    <input
                      type="hidden"
                      name="addressId"
                      value={address.id}
                    />

                    <button
                      type="submit"
                      className="inline-flex items-center gap-1.5 rounded-full bg-red-100 px-3 py-2 text-xs font-bold text-red-800"
                    >
                      <Trash2 size={14} />
                      Delete
                    </button>
                  </form>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}