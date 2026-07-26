import { createSupabaseAdmin } from "@/lib/supabase-admin";

function cleanOptionalText(value) {
  const normalized = String(value || "").trim();

  return normalized || null;
}

function cleanMetadata(metadata) {
  if (
    !metadata ||
    typeof metadata !== "object" ||
    Array.isArray(metadata)
  ) {
    return {};
  }

  return metadata;
}

export async function createCustomerActivityLog({
  customerId,
  activityType,
  title,
  description = null,
  entityType = null,
  entityId = null,
  performedByUserId = null,
  performedByEmail = null,
  metadata = {}
}) {
  if (!customerId) {
    console.error(
      "Unable to create customer activity log: missing customer ID."
    );

    return null;
  }

  if (!activityType || !title) {
    console.error(
      "Unable to create customer activity log: missing type or title."
    );

    return null;
  }

  const supabase = createSupabaseAdmin();

  const { data, error } = await supabase
    .from("customer_activity_logs")
    .insert({
      customer_id: customerId,
      activity_type: String(
        activityType
      ).trim(),
      title: String(title).trim(),
      description:
        cleanOptionalText(description),
      entity_type:
        cleanOptionalText(entityType),
      entity_id: entityId || null,
      performed_by_user_id:
        performedByUserId || null,
      performed_by_email:
        cleanOptionalText(
          performedByEmail
        ),
      metadata: cleanMetadata(metadata)
    })
    .select("id")
    .single();

  if (error) {
    /*
     * Activity logging should not break the main
     * customer or address operation.
     */
    console.error(
      "Unable to create customer activity log:",
      error
    );

    return null;
  }

  return data;
}