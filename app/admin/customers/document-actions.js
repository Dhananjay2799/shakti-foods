"use server";

import { randomUUID } from "crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createSupabaseAdmin } from "@/lib/supabase-admin";
import { createCustomerActivityLog } from "@/app/admin/customers/activity-log";

const STORAGE_BUCKET = "customer-documents";
const MAX_FILE_SIZE = 10 * 1024 * 1024;

const allowedDocumentTypes = [
  "resale_certificate",
  "tax_exemption_form",
  "wholesale_agreement",
  "credit_application",
  "business_license",
  "w9",
  "identity_document",
  "other"
];

const allowedVerificationStatuses = [
  "pending",
  "verified",
  "rejected",
  "expired"
];

const allowedMimeTypes = new Map([
  ["application/pdf", "pdf"],
  ["image/jpeg", "jpg"],
  ["image/png", "png"]
]);

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

function normalizeDocumentType(value) {
  if (!allowedDocumentTypes.includes(value)) {
    throw new Error("Invalid document type.");
  }

  return value;
}

function normalizeVerificationStatus(value) {
  if (
    !allowedVerificationStatuses.includes(
      value
    )
  ) {
    throw new Error(
      "Invalid verification status."
    );
  }

  return value;
}

function getValidatedFile(formData) {
  const uploadedFile = formData.get("file");

  if (
    !uploadedFile ||
    typeof uploadedFile !== "object" ||
    typeof uploadedFile.arrayBuffer !== "function"
  ) {
    throw new Error(
      "Select a document to upload."
    );
  }

  if (!uploadedFile.name) {
    throw new Error(
      "The selected file has no filename."
    );
  }

  if (uploadedFile.size <= 0) {
    throw new Error(
      "The selected file is empty."
    );
  }

  if (uploadedFile.size > MAX_FILE_SIZE) {
    throw new Error(
      "The document cannot exceed 10 MB."
    );
  }

  const extension = allowedMimeTypes.get(
    uploadedFile.type
  );

  if (!extension) {
    throw new Error(
      "Only PDF, JPG, JPEG, and PNG documents are allowed."
    );
  }

  return {
    file: uploadedFile,
    extension
  };
}

function cleanFilename(filename) {
  const normalized = String(
    filename || "document"
  )
    .trim()
    .replace(/[^\w.\-() ]+/g, "_")
    .replace(/\s+/g, " ");

  return normalized.slice(0, 255);
}

function getStoragePath({
  customerId,
  documentType,
  extension
}) {
  const year = new Date()
    .getUTCFullYear()
    .toString();

  return [
    customerId,
    year,
    documentType,
    `${randomUUID()}.${extension}`
  ].join("/");
}

function refreshDocumentPages(customerId) {
  revalidatePath("/admin/customers");

  revalidatePath(
    `/admin/customers/${customerId}`
  );

  revalidatePath(
    `/admin/customers/${customerId}/settings`
  );

  revalidatePath(
    `/admin/customers/${customerId}/settings/documents`
  );

  revalidatePath(
    `/admin/customers/${customerId}/settings/activity`
  );
}

async function verifyCustomer(
  supabase,
  customerId
) {
  const { data, error } = await supabase
    .from("customers")
    .select("id, full_name, email")
    .eq("id", customerId)
    .maybeSingle();

  if (error) {
    console.error(
      "Unable to verify customer:",
      error
    );

    throw new Error(
      error.message ||
        "Unable to verify customer."
    );
  }

  if (!data) {
    throw new Error(
      "Customer record was not found."
    );
  }

  return data;
}

async function getCustomerDocument({
  supabase,
  customerId,
  documentId
}) {
  const { data, error } = await supabase
    .from("customer_documents")
    .select("*")
    .eq("id", documentId)
    .eq("customer_id", customerId)
    .maybeSingle();

  if (error) {
    console.error(
      "Unable to load customer document:",
      error
    );

    throw new Error(
      error.message ||
        "Unable to verify document."
    );
  }

  if (!data) {
    throw new Error(
      "Document record was not found."
    );
  }

  return data;
}

export async function uploadCustomerDocument(
  formData
) {
  const user = await requireAdmin();

  const customerId = requiredText(
    formData,
    "customerId"
  );

  const documentType =
    normalizeDocumentType(
      requiredText(
        formData,
        "documentType"
      )
    );

  const title = requiredText(
    formData,
    "title"
  );

  const verificationStatus =
    normalizeVerificationStatus(
      requiredText(
        formData,
        "verificationStatus"
      ) || "pending"
    );

  if (!customerId) {
    throw new Error(
      "Customer ID is required."
    );
  }

  if (!title) {
    throw new Error(
      "Document title is required."
    );
  }

  const { file, extension } =
    getValidatedFile(formData);

  const supabase = createSupabaseAdmin();

  await verifyCustomer(
    supabase,
    customerId
  );

  const storagePath = getStoragePath({
    customerId,
    documentType,
    extension
  });

  const fileBuffer =
    await file.arrayBuffer();

  const {
    error: storageUploadError
  } = await supabase.storage
    .from(STORAGE_BUCKET)
    .upload(
      storagePath,
      fileBuffer,
      {
        contentType: file.type,
        cacheControl: "3600",
        upsert: false
      }
    );

  if (storageUploadError) {
    console.error(
      "Unable to upload customer document:",
      storageUploadError
    );

    throw new Error(
      storageUploadError.message ||
        "Unable to upload document."
    );
  }

  const documentData = {
    customer_id: customerId,
    document_type: documentType,
    title,

    description: optionalText(
      formData,
      "description"
    ),

    storage_bucket: STORAGE_BUCKET,
    storage_path: storagePath,

    original_filename: cleanFilename(
      file.name
    ),

    mime_type: file.type,
    file_size_bytes: file.size,

    document_number: optionalText(
      formData,
      "documentNumber"
    ),

    issued_date: optionalText(
      formData,
      "issuedDate"
    ),

    expiration_date: optionalText(
      formData,
      "expirationDate"
    ),

    verification_status:
      verificationStatus,

    is_active: true,

    uploaded_by_user_id: user.id,
    uploaded_by_email:
      user.email || null,

    notes: optionalText(
      formData,
      "notes"
    )
  };

  const {
    data: createdDocument,
    error: databaseError
  } = await supabase
    .from("customer_documents")
    .insert(documentData)
    .select(
      `
        id,
        title,
        document_type,
        original_filename,
        verification_status,
        expiration_date
      `
    )
    .single();

  if (databaseError) {
    console.error(
      "Unable to save document metadata:",
      databaseError
    );

    /*
     * The storage upload succeeded, but the database
     * insert failed. Remove the orphaned file.
     */
    const { error: cleanupError } =
      await supabase.storage
        .from(STORAGE_BUCKET)
        .remove([storagePath]);

    if (cleanupError) {
      console.error(
        "Unable to remove orphaned document:",
        cleanupError
      );
    }

    throw new Error(
      databaseError.message ||
        "Unable to save document information."
    );
  }

  await createCustomerActivityLog({
    customerId,
    activityType: "document_uploaded",
    title: "Customer document uploaded",
    description: `${title} was uploaded to the customer record.`,
    entityType: "customer_document",
    entityId: createdDocument.id,
    performedByUserId: user.id,
    performedByEmail: user.email,
    metadata: {
      document_type: documentType,
      title,
      original_filename:
        createdDocument.original_filename,
      mime_type: file.type,
      file_size_bytes: file.size,
      verification_status:
        verificationStatus,
      expiration_date:
        createdDocument.expiration_date
    }
  });

  refreshDocumentPages(customerId);

  redirect(
    `/admin/customers/${customerId}/settings/documents?uploaded=1`
  );
}

export async function updateCustomerDocument(
  formData
) {
  const user = await requireAdmin();

  const customerId = requiredText(
    formData,
    "customerId"
  );

  const documentId = requiredText(
    formData,
    "documentId"
  );

  const documentType =
    normalizeDocumentType(
      requiredText(
        formData,
        "documentType"
      )
    );

  const verificationStatus =
    normalizeVerificationStatus(
      requiredText(
        formData,
        "verificationStatus"
      )
    );

  const title = requiredText(
    formData,
    "title"
  );

  if (!customerId || !documentId) {
    throw new Error(
      "Missing document information."
    );
  }

  if (!title) {
    throw new Error(
      "Document title is required."
    );
  }

  const supabase = createSupabaseAdmin();

  const existingDocument =
    await getCustomerDocument({
      supabase,
      customerId,
      documentId
    });

  const updatedDocumentData = {
    document_type: documentType,
    title,

    description: optionalText(
      formData,
      "description"
    ),

    document_number: optionalText(
      formData,
      "documentNumber"
    ),

    issued_date: optionalText(
      formData,
      "issuedDate"
    ),

    expiration_date: optionalText(
      formData,
      "expirationDate"
    ),

    verification_status:
      verificationStatus,

    is_active: checkboxValue(
      formData,
      "isActive"
    ),

    notes: optionalText(
      formData,
      "notes"
    )
  };

  const { error } = await supabase
    .from("customer_documents")
    .update(updatedDocumentData)
    .eq("id", documentId)
    .eq("customer_id", customerId);

  if (error) {
    console.error(
      "Unable to update customer document:",
      error
    );

    throw new Error(
      error.message ||
        "Unable to update document."
    );
  }

  const changes = {};

  function recordChange(
    field,
    previousValue,
    nextValue
  ) {
    const previous =
      previousValue ?? null;

    const next = nextValue ?? null;

    if (
      JSON.stringify(previous) !==
      JSON.stringify(next)
    ) {
      changes[field] = {
        from: previous,
        to: next
      };
    }
  }

  recordChange(
    "document_type",
    existingDocument.document_type,
    documentType
  );

  recordChange(
    "title",
    existingDocument.title,
    title
  );

  recordChange(
    "description",
    existingDocument.description,
    updatedDocumentData.description
  );

  recordChange(
    "document_number",
    existingDocument.document_number,
    updatedDocumentData.document_number
  );

  recordChange(
    "issued_date",
    existingDocument.issued_date,
    updatedDocumentData.issued_date
  );

  recordChange(
    "expiration_date",
    existingDocument.expiration_date,
    updatedDocumentData.expiration_date
  );

  recordChange(
    "verification_status",
    existingDocument.verification_status,
    verificationStatus
  );

  recordChange(
    "is_active",
    existingDocument.is_active,
    updatedDocumentData.is_active
  );

  recordChange(
    "notes",
    existingDocument.notes,
    updatedDocumentData.notes
  );

  if (Object.keys(changes).length > 0) {
    await createCustomerActivityLog({
      customerId,
      activityType: "document_updated",
      title: "Customer document updated",
      description: `${title} was updated.`,
      entityType: "customer_document",
      entityId: documentId,
      performedByUserId: user.id,
      performedByEmail: user.email,
      metadata: {
        changes
      }
    });
  }

  refreshDocumentPages(customerId);

  redirect(
    `/admin/customers/${customerId}/settings/documents?updated=1`
  );
}

export async function updateCustomerDocumentStatus(
  formData
) {
  const user = await requireAdmin();

  const customerId = requiredText(
    formData,
    "customerId"
  );

  const documentId = requiredText(
    formData,
    "documentId"
  );

  const verificationStatus =
    normalizeVerificationStatus(
      requiredText(
        formData,
        "verificationStatus"
      )
    );

  if (!customerId || !documentId) {
    throw new Error(
      "Missing document information."
    );
  }

  const supabase = createSupabaseAdmin();

  const existingDocument =
    await getCustomerDocument({
      supabase,
      customerId,
      documentId
    });

  const { error } = await supabase
    .from("customer_documents")
    .update({
      verification_status:
        verificationStatus
    })
    .eq("id", documentId)
    .eq("customer_id", customerId);

  if (error) {
    console.error(
      "Unable to change document status:",
      error
    );

    throw new Error(
      error.message ||
        "Unable to change document status."
    );
  }

  await createCustomerActivityLog({
    customerId,
    activityType:
      "document_status_changed",
    title: "Document verification changed",
    description: `${
      existingDocument.title
    } was marked as ${verificationStatus}.`,
    entityType: "customer_document",
    entityId: documentId,
    performedByUserId: user.id,
    performedByEmail: user.email,
    metadata: {
      previous_status:
        existingDocument.verification_status,
      verification_status:
        verificationStatus
    }
  });

  refreshDocumentPages(customerId);

  redirect(
    `/admin/customers/${customerId}/settings/documents?statusChanged=1`
  );
}

export async function deleteCustomerDocument(
  formData
) {
  const user = await requireAdmin();

  const customerId = requiredText(
    formData,
    "customerId"
  );

  const documentId = requiredText(
    formData,
    "documentId"
  );

  if (!customerId || !documentId) {
    throw new Error(
      "Missing document information."
    );
  }

  const supabase = createSupabaseAdmin();

  const document =
    await getCustomerDocument({
      supabase,
      customerId,
      documentId
    });

  const {
    error: storageDeleteError
  } = await supabase.storage
    .from(document.storage_bucket)
    .remove([document.storage_path]);

  if (storageDeleteError) {
    console.error(
      "Unable to delete stored document:",
      storageDeleteError
    );

    throw new Error(
      storageDeleteError.message ||
        "Unable to delete the stored file."
    );
  }

  const { error: databaseDeleteError } =
    await supabase
      .from("customer_documents")
      .delete()
      .eq("id", documentId)
      .eq("customer_id", customerId);

  if (databaseDeleteError) {
    console.error(
      "Unable to delete document record:",
      databaseDeleteError
    );

    throw new Error(
      databaseDeleteError.message ||
        "The file was removed, but the document record could not be deleted."
    );
  }

  await createCustomerActivityLog({
    customerId,
    activityType: "document_deleted",
    title: "Customer document deleted",
    description: `${document.title} was deleted.`,
    entityType: "customer_document",
    entityId: documentId,
    performedByUserId: user.id,
    performedByEmail: user.email,
    metadata: {
      document_type:
        document.document_type,
      original_filename:
        document.original_filename,
      storage_path:
        document.storage_path
    }
  });

  refreshDocumentPages(customerId);

  redirect(
    `/admin/customers/${customerId}/settings/documents?deleted=1`
  );
}