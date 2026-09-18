"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createSupabaseAdmin } from "@/lib/supabase-admin";
import { createCustomerActivityLog } from "@/app/admin/customers/activity-log";

const allowedAddressTypes = [
  "shipping",
  "billing"
];

async function requireAdmin() {
  const authClient = await createClient();

  const {
    data: { user },
    error
  } = await authClient.auth.getUser();

  if (error || !user) {
    redirect("/admin/login");
  }

  return user;
}

function requiredText(formData, fieldName) {
  return String(
    formData.get(fieldName) || ""
  ).trim();
}

function optionalText(formData, fieldName) {
  const value = String(
    formData.get(fieldName) || ""
  ).trim();

  return value || null;
}

function checkboxValue(formData, fieldName) {
  return formData.get(fieldName) === "on";
}

function validateAddressType(value) {
  if (!allowedAddressTypes.includes(value)) {
    throw new Error("Invalid address type.");
  }
}

function refreshAddressPages(customerId) {
  revalidatePath("/admin/customers");
  revalidatePath(`/admin/customers/${customerId}`);
  revalidatePath(`/admin/customers/${customerId}/settings`);
  revalidatePath(`/admin/customers/${customerId}/settings/addresses`);
}

async function verifyCustomer(supabase, customerId) {
  const { data, error } = await supabase
    .from("customers")
    .select("id")
    .eq("id", customerId)
    .maybeSingle();

  if (error) {
    console.error("Unable to verify customer:", error);
    throw new Error(error.message || "Unable to verify customer.");
  }

  if (!data) {
    throw new Error("Customer record was not found.");
  }
}

async function assignReplacementDefault({ supabase, customerId, addressType }) {
  const { data: currentDefault } = await supabase
    .from("customer_addresses")
    .select("id")
    .eq("customer_id", customerId)
    .eq("address_type", addressType)
    .eq("is_default", true)
    .limit(1)
    .maybeSingle();

  if (currentDefault) {
    return;
  }

  const { data: replacement, error } = await supabase
    .from("customer_addresses")
    .select("id")
    .eq("customer_id", customerId)
    .eq("address_type", addressType)
    .eq("is_active", true)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error("Unable to find replacement default address:", error);
    return;
  }

  if (replacement) {
    await supabase
      .from("customer_addresses")
      .update({ is_default: true })
      .eq("id", replacement.id);
  }
}

export async function saveCustomerAddress(formData) {
  const user = await requireAdmin();

  const customerId = requiredText(formData, "customerId");
  const addressId = optionalText(formData, "addressId");
  const addressType = requiredText(formData, "addressType");
  const addressLine1 = requiredText(formData, "addressLine1");
  const city = requiredText(formData, "city");
  const state = requiredText(formData, "state");
  const postalCode = requiredText(formData, "postalCode");
  const country = requiredText(formData, "country") || "US";

  if (!customerId) {
    throw new Error("Customer ID is required.");
  }

  validateAddressType(addressType);

  if (!addressLine1) {
    throw new Error("Address line 1 is required.");
  }
  if (!city) {
    throw new Error("City is required.");
  }
  if (!state) {
    throw new Error("State or province is required.");
  }
  if (!postalCode) {
    throw new Error("Postal code is required.");
  }

  const supabase = createSupabaseAdmin();
  await verifyCustomer(supabase, customerId);

  const isDefault = checkboxValue(formData, "isDefault");
  const isActive = formData.has("isActive") ? checkboxValue(formData, "isActive") : true;

  const addressData = {
    customer_id: customerId,
    address_type: addressType,
    label: optionalText(formData, "label"),
    recipient_name: optionalText(formData, "recipientName"),
    company_name: optionalText(formData, "companyName"),
    phone: optionalText(formData, "phone"),
    address_line_1: addressLine1,
    address_line_2: optionalText(formData, "addressLine2"),
    city,
    state,
    postal_code: postalCode,
    country: country.toUpperCase(),
    is_default: isDefault,
    is_active: isActive,
    delivery_instructions: optionalText(formData, "deliveryInstructions")
  };

  if (addressId) {
    const { data: existingAddress, error: readError } = await supabase
      .from("customer_addresses")
      .select("id, address_type, is_default")
      .eq("id", addressId)
      .eq("customer_id", customerId)
      .maybeSingle();

    if (readError) {
      console.error("Unable to load address before update:", readError);
      throw new Error(readError.message || "Unable to verify address.");
    }

    if (!existingAddress) {
      throw new Error("Address record was not found.");
    }

    const { error: updateError } = await supabase
      .from("customer_addresses")
      .update(addressData)
      .eq("id", addressId)
      .eq("customer_id", customerId);

    if (updateError) {
      console.error("Unable to update address:", updateError);
      throw new Error(updateError.message || "Unable to update address.");
    }

    if (existingAddress.address_type !== addressType) {
      await assignReplacementDefault({
        supabase,
        customerId,
        addressType: existingAddress.address_type
      });
    }

    // A. Log address updates
    await createCustomerActivityLog({
      customerId,
      activityType: "address_updated",
      title: "Customer address updated",
      description: `${addressData.label || "Address"} was updated.`,
      entityType: "customer_address",
      entityId: addressId,
      performedByUserId: user.id,
      performedByEmail: user.email,
      metadata: {
        address_type: addressType,
        label: addressData.label,
        city,
        state,
        postal_code: postalCode,
        is_default: isDefault,
        is_active: isActive
      }
    });

  } else {
    const { count, error: countError } = await supabase
      .from("customer_addresses")
      .select("id", { count: "exact", head: true })
      .eq("customer_id", customerId)
      .eq("address_type", addressType);

    if (countError) {
      console.error("Unable to count addresses:", countError);
    }

    const shouldBeDefault = isDefault || Number(count || 0) === 0;

    // Modified insert sequence to return the active single record reference back
    const { data: createdAddress, error: insertError } = await supabase
      .from("customer_addresses")
      .insert({
        ...addressData,
        is_default: shouldBeDefault
      })
      .select("id")
      .single();

    if (insertError) {
      console.error("Unable to create address:", insertError);
      throw new Error(insertError.message || "Unable to create address.");
    }

    // B. Log address creation
    await createCustomerActivityLog({
      customerId,
      activityType: "address_created",
      title: "Customer address added",
      description: `${addressData.label || "Address"} was added as a ${addressType === "billing" ? "billing" : "shipping"} address.`,
      entityType: "customer_address",
      entityId: createdAddress?.id || null,
      performedByUserId: user.id,
      performedByEmail: user.email,
      metadata: {
        address_type: addressType,
        label: addressData.label,
        city,
        state,
        postal_code: postalCode,
        is_default: shouldBeDefault
      }
    });
  }

  refreshAddressPages(customerId);

  redirect(`/admin/customers/${customerId}/settings/addresses?saved=1`);
}

export async function setDefaultCustomerAddress(formData) {
  const user = await requireAdmin();

  const customerId = requiredText(formData, "customerId");
  const addressId = requiredText(formData, "addressId");

  if (!customerId || !addressId) {
    throw new Error("Missing address information.");
  }

  const supabase = createSupabaseAdmin();

  const { data: address, error: readError } = await supabase
    .from("customer_addresses")
    .select("id, address_type, is_active")
    .eq("id", addressId)
    .eq("customer_id", customerId)
    .maybeSingle();

  if (readError || !address) {
    console.error("Unable to verify default address:", readError);
    throw new Error("Address record was not found.");
  }

  const { error } = await supabase
    .from("customer_addresses")
    .update({
      is_default: true,
      is_active: true
    })
    .eq("id", addressId)
    .eq("customer_id", customerId);

  if (error) {
    console.error("Unable to set default address:", error);
    throw new Error(error.message || "Unable to set default address.");
  }

  // C. Log default changes
  await createCustomerActivityLog({
    customerId,
    activityType: "address_default_changed",
    title: "Default address changed",
    description: `A ${address.address_type === "billing" ? "billing" : "shipping"} address was set as default.`,
    entityType: "customer_address",
    entityId: addressId,
    performedByUserId: user.id,
    performedByEmail: user.email,
    metadata: {
      address_type: address.address_type
    }
  });

  refreshAddressPages(customerId);

  redirect(`/admin/customers/${customerId}/settings/addresses?defaulted=1`);
}

export async function toggleCustomerAddressStatus(formData) {
  const user = await requireAdmin();

  const customerId = requiredText(formData, "customerId");
  const addressId = requiredText(formData, "addressId");
  const nextActive = requiredText(formData, "nextActive") === "true";

  if (!customerId || !addressId) {
    throw new Error("Missing address information.");
  }

  const supabase = createSupabaseAdmin();

  const { data: address, error: readError } = await supabase
    .from("customer_addresses")
    .select("id, address_type, is_default")
    .eq("id", addressId)
    .eq("customer_id", customerId)
    .maybeSingle();

  if (readError || !address) {
    console.error("Unable to verify address status:", readError);
    throw new Error("Address record was not found.");
  }

  const updateData = {
    is_active: nextActive
  };

  if (!nextActive && address.is_default) {
    updateData.is_default = false;
  }

  const { error } = await supabase
    .from("customer_addresses")
    .update(updateData)
    .eq("id", addressId)
    .eq("customer_id", customerId);

  if (error) {
    console.error("Unable to change address status:", error);
    throw new Error(error.message || "Unable to change address status.");
  }

  if (!nextActive && address.is_default) {
    await assignReplacementDefault({
      supabase,
      customerId,
      addressType: address.address_type
    });
  }

  // D. Log activation changes
  await createCustomerActivityLog({
    customerId,
    activityType: nextActive ? "address_activated" : "address_deactivated",
    title: nextActive ? "Customer address activated" : "Customer address deactivated",
    description: nextActive ? "A saved customer address was activated." : "A saved customer address was deactivated.",
    entityType: "customer_address",
    entityId: addressId,
    performedByUserId: user.id,
    performedByEmail: user.email,
    metadata: {
      address_type: address.address_type,
      was_default: address.is_default
    }
  });

  refreshAddressPages(customerId);

  redirect(`/admin/customers/${customerId}/settings/addresses?statusChanged=1`);
}

export async function deleteCustomerAddress(formData) {
  const user = await requireAdmin();

  const customerId = requiredText(formData, "customerId");
  const addressId = requiredText(formData, "addressId");

  if (!customerId || !addressId) {
    throw new Error("Missing address information.");
  }

  const supabase = createSupabaseAdmin();

  const { data: address, error: readError } = await supabase
    .from("customer_addresses")
    .select("id, address_type, is_default")
    .eq("id", addressId)
    .eq("customer_id", customerId)
    .maybeSingle();

  if (readError || !address) {
    console.error("Unable to verify address deletion:", readError);
    throw new Error("Address record was not found.");
  }

  const { error } = await supabase
    .from("customer_addresses")
    .delete()
    .eq("id", addressId)
    .eq("customer_id", customerId);

  if (error) {
    console.error("Unable to delete address:", error);
    throw new Error(error.message || "Unable to delete address.");
  }

  if (address.is_default) {
    await assignReplacementDefault({
      supabase,
      customerId,
      addressType: address.address_type
    });
  }

  // E. Log deletion updates
  await createCustomerActivityLog({
    customerId,
    activityType: "address_deleted",
    title: "Customer address deleted",
    description: `A ${address.address_type === "billing" ? "billing" : "shipping"} address was deleted.`,
    entityType: "customer_address",
    entityId: addressId,
    performedByUserId: user.id,
    performedByEmail: user.email,
    metadata: {
      address_type: address.address_type,
      was_default: address.is_default
    }
  });

  refreshAddressPages(customerId);

  redirect(`/admin/customers/${customerId}/settings/addresses?deleted=1`);
}