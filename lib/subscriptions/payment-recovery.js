import { createSupabaseAdmin } from "@/lib/supabase-admin";

// Record only provider-confirmed successful payment events. Never change
// an existing recovery record (including ones already marked resolved).
export async function recordSubscriptionPaymentRecovery({
  subscriptionId,
  paymentProvider,
  paymentReference,
  amountCents,
  currency,
  providerEventId,
  error
}) {
  if (!subscriptionId || !paymentReference ||
      !["stripe", "paypal"].includes(paymentProvider) ||
      !Number.isSafeInteger(amountCents) || amountCents < 0 ||
      !/^[A-Z]{3}$/.test(currency)) {
    throw new Error("Cannot record recovery: required payment metadata is invalid.");
  }

  const supabase = createSupabaseAdmin();
  const { error: writeError } = await supabase
    .from("subscription_payment_recovery")
    .upsert({
      subscription_id: subscriptionId,
      payment_provider: paymentProvider,
      payment_reference: paymentReference,
      amount_cents: amountCents,
      currency,
      status: "needs_attention",
      failure_reason: String(error?.message || error || "Recurring fulfillment failed").slice(0, 2000),
      provider_event_id: providerEventId || null
    }, {
      onConflict: "payment_provider,payment_reference",
      ignoreDuplicates: true
    });

  if (writeError) {
    throw new Error(`Recurring payment could not be fulfilled AND recovery logging failed: ${writeError.message}`);
  }
}
