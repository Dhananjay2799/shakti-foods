"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createSupabaseAdmin } from "@/lib/supabase-admin";
import { createCustomerActivityLog } from "@/app/admin/customers/activity-log";

const allowedCustomerTypes = [
  "retail",
  "wholesale",
  "business"
];

const allowedStatuses = [
  "active",
  "inactive",
  "blocked"
];

async function requireAdmin() {
  const supabase = await createClient();

  const {
    data: { user },
    error
  } = await supabase.auth.getUser();

  if (error || !user) {
    redirect("/admin/login");
  }

  return user;
}

function getRequiredText(formData, fieldName) {
  return String(
    formData.get(fieldName) || ""
  ).trim();
}

function getOptionalText(formData, fieldName) {
  const value = String(
    formData.get(fieldName) || ""
  ).trim();

  return value || null;
}

function parseTags(value) {
  const rawValue = String(value || "");

  const uniqueTags = new Set(
    rawValue
      .split(",")
      .map((tag) => tag.trim())
      .filter(Boolean)
      .map((tag) => tag.slice(0, 50))
  );

  return Array.from(uniqueTags).slice(0, 20);
}

export async function updateCustomer(formData) {
  // Capture the authenticated admin user credentials for the activity logger
  const user = await requireAdmin();

  const customerId = getRequiredText(
    formData,
    "customerId"
  );

  const fullName = getOptionalText(
    formData,
    "fullName"
  );

  const phone = getOptionalText(
    formData,
    "phone"
  );

  const companyName = getOptionalText(
    formData,
    "companyName"
  );

  const customerType = getRequiredText(
    formData,
    "customerType"
  );

  const status = getRequiredText(
    formData,
    "status"
  );

  const notes = getOptionalText(
    formData,
    "notes"
  );

  const tags = parseTags(
    formData.get("tags")
  );

  const isWholesale =
    formData.get("isWholesale") === "on";

  if (!customerId) {
    throw new Error(
      "Customer ID is required."
    );
  }

  if (
    !allowedCustomerTypes.includes(
      customerType
    )
  ) {
    throw new Error(
      "Invalid customer type."
    );
  }

  if (!allowedStatuses.includes(status)) {
    throw new Error(
      "Invalid customer status."
    );
  }

  const normalizedWholesale =
    customerType === "wholesale"
      ? true
      : isWholesale;

  const supabase = createSupabaseAdmin();

  // Updated query to pull the historical state before the delta overwrite
  const { data: existingCustomer, error: readError } =
    await supabase
      .from("customers")
      .select(`
        id,
        full_name,
        phone,
        company_name,
        customer_type,
        status,
        is_wholesale,
        tags,
        notes
      `)
      .eq("id", customerId)
      .maybeSingle();

  if (readError) {
    console.error(
      "Unable to verify customer:",
      readError
    );

    throw new Error(
      readError.message ||
        "Unable to verify customer."
    );
  }

  if (!existingCustomer) {
    throw new Error(
      "Customer record was not found."
    );
  }

  const { error: updateError } =
    await supabase
      .from("customers")
      .update({
        full_name: fullName,
        phone,
        company_name: companyName,
        customer_type: customerType,
        status,
        is_wholesale: normalizedWholesale,
        tags,
        notes
      })
      .eq("id", customerId);

  if (updateError) {
    console.error(
      "Unable to update customer:",
      updateError
    );

    throw new Error(
      updateError.message ||
        "Unable to update customer."
    );
  }

  // Calculate and store data differences for the audit trail
  const changes = {};
  function recordChange(field, previousValue, nextValue) {
    const previous = previousValue ?? null;
    const next = nextValue ?? null;
    if (JSON.stringify(previous) !== JSON.stringify(next)) {
      changes[field] = {
        from: previous,
        to: next
      };
    }
  }

  recordChange("full_name", existingCustomer.full_name, fullName);
  recordChange("phone", existingCustomer.phone, phone);
  recordChange("company_name", existingCustomer.company_name, companyName);
  recordChange("customer_type", existingCustomer.customer_type, customerType);
  recordChange("status", existingCustomer.status, status);
  recordChange("is_wholesale", existingCustomer.is_wholesale, normalizedWholesale);
  recordChange("tags", existingCustomer.tags || [], tags);
  recordChange("notes", existingCustomer.notes, notes);

  if (Object.keys(changes).length > 0) {
    await createCustomerActivityLog({
      customerId,
      activityType: "customer_updated",
      title: "Customer settings updated",
      description: "Customer profile or CRM settings were changed.",
      entityType: "customer",
      entityId: customerId,
      performedByUserId: user.id,
      performedByEmail: user.email,
      metadata: {
        changes
      }
    });
  }

  revalidatePath("/admin");
  revalidatePath("/admin/customers");
  revalidatePath(`/admin/customers/${customerId}`);
  revalidatePath(`/admin/customers/${customerId}/settings`);

  redirect(`/admin/customers/${customerId}/settings?updated=1`);
}