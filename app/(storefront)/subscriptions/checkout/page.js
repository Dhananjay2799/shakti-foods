import { notFound } from "next/navigation";

import SubscriptionCheckoutClient
  from "@/components/SubscriptionCheckoutClient";

import {
  prepareSubscription
} from "@/lib/subscriptions/prepare-subscription";

export const dynamic =
  "force-dynamic";

export default async function SubscriptionCheckoutPage({
  searchParams
}) {
  const resolvedSearchParams =
    await Promise.resolve(
      searchParams || {}
    );

  const productId =
    String(
      resolvedSearchParams
        ?.productId || ""
    ).trim();

  const frequencyId =
    String(
      resolvedSearchParams
        ?.frequencyId || ""
    ).trim();

  const quantity =
    String(
      resolvedSearchParams
        ?.quantity || "1"
    ).trim();

  if (
    !productId ||
    !frequencyId
  ) {
    notFound();
  }

  let prepared;

  try {
    prepared =
      await prepareSubscription({
        productId,
        frequencyId,
        quantity
      });
  } catch (error) {
    console.error(
      "Unable to prepare subscription checkout page:",
      error
    );

    notFound();
  }

  return (
    <SubscriptionCheckoutClient
      prepared={prepared}
    />
  );
}