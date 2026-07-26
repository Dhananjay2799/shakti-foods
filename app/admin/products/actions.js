"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createSupabaseAdmin } from "@/lib/supabase-admin";

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

function optionalText(formData, field) {
  const value = String(
    formData.get(field) || ""
  ).trim();

  return value || null;
}

function optionalNumber(formData, field) {
  const rawValue = String(
    formData.get(field) || ""
  ).trim();

  if (!rawValue) {
    return null;
  }

  const number = Number(rawValue);

  if (!Number.isFinite(number)) {
    throw new Error(
      `${field} must be a valid number.`
    );
  }

  return number;
}

function optionalInteger(formData, field) {
  const value = optionalNumber(
    formData,
    field
  );

  if (value === null) {
    return null;
  }

  if (!Number.isInteger(value) || value < 0) {
    throw new Error(
      `${field} must be a positive whole number.`
    );
  }

  return value;
}

export async function saveProductSpecifications(
  formData
) {
  await requireAdmin();

  const productId = String(
    formData.get("productId") || ""
  ).trim();

  const productSlug = String(
    formData.get("productSlug") || ""
  ).trim();

  if (!productId) {
    throw new Error("Missing product ID.");
  }

  const specifications = {
    product_id: productId,

    material: optionalText(
      formData,
      "material"
    ),

    color: optionalText(
      formData,
      "color"
    ),

    width_inches: optionalNumber(
      formData,
      "widthInches"
    ),

    length_inches: optionalNumber(
      formData,
      "lengthInches"
    ),

    diameter_inches: optionalNumber(
      formData,
      "diameterInches"
    ),

    depth_inches: optionalNumber(
      formData,
      "depthInches"
    ),

    height_inches: optionalNumber(
      formData,
      "heightInches"
    ),

    capacity_ml: optionalInteger(
      formData,
      "capacityMl"
    ),

    pieces_per_pack: optionalInteger(
      formData,
      "piecesPerPack"
    ),

    packs_per_case: optionalInteger(
      formData,
      "packsPerCase"
    ),

    microwave_safe:
      formData.get("microwaveSafe") === "on",

    freezer_safe:
      formData.get("freezerSafe") === "on",

    oil_resistant:
      formData.get("oilResistant") === "on",

    leak_resistant:
      formData.get("leakResistant") === "on",

    compostable:
      formData.get("compostable") === "on",

    biodegradable:
      formData.get("biodegradable") === "on",

    manufacturing_country: optionalText(
      formData,
      "manufacturingCountry"
    ),

    disposal_instructions: optionalText(
      formData,
      "disposalInstructions"
    ),

    storage_instructions: optionalText(
      formData,
      "storageInstructions"
    )
  };

  const supabase = createSupabaseAdmin();

  const { error } = await supabase
    .from("product_specifications")
    .upsert(specifications, {
      onConflict: "product_id"
    });

  if (error) {
    console.error(
      "Unable to save specifications:",
      error
    );

    throw new Error(
      error.message ||
        "Unable to save product specifications."
    );
  }

  revalidatePath("/admin/products");
  revalidatePath(
    `/admin/products/${productId}`
  );

  if (productSlug) {
    revalidatePath(
      `/products/${productSlug}`
    );
  }
}