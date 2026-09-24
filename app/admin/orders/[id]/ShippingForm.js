"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  getCalculatedParcel,
  getShippingRates,
  buyShippingLabel,
} from "../shipping-actions";

export default function ShippingForm({ order }) {
  const router = useRouter();

  const [weight, setWeight] = useState("");
  const [length, setLength] = useState("");
  const [width, setWidth] = useState("");
  const [height, setHeight] = useState("");

  const [rates, setRates] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [buyingRateId, setBuyingRateId] = useState("");
  const [labelResult, setLabelResult] = useState(null);
  const [shipmentId, setShipmentId] = useState("");

  const [calculatingParcel, setCalculatingParcel] =
    useState(true);

  const [
    parcelCalculationError,
    setParcelCalculationError,
  ] = useState("");

  const hasExistingLabel = Boolean(
    order.shippo_transaction_id ||
      order.label_url ||
      order.tracking_number
  );

  const sortedRates = [...rates].sort(
    (firstRate, secondRate) =>
      Number(firstRate.amount || 0) -
      Number(secondRate.amount || 0)
  );
  
  useEffect(() => {
    let isActive = true;

    async function loadCalculatedParcel() {
      setCalculatingParcel(true);
      setParcelCalculationError("");

      try {
        const result = await getCalculatedParcel(order.id);

        if (!result.success) {
          throw new Error(
            result.error ||
              "Unable to calculate parcel measurements."
          );
        }

        if (!isActive) {
          return;
        }

        setWeight(result.parcel.weight || "");
        setLength(result.parcel.length || "");
        setWidth(result.parcel.width || "");
        setHeight(result.parcel.height || "");
      } catch (calculationError) {
        if (!isActive) {
          return;
        }

        setParcelCalculationError(
          calculationError instanceof Error
            ? calculationError.message
            : "Unable to calculate parcel measurements."
        );
      } finally {
        if (isActive) {
          setCalculatingParcel(false);
        }
      }
    }

    if (!hasExistingLabel) {
      loadCalculatedParcel();
    } else {
      setCalculatingParcel(false);
    }

    return () => {
      isActive = false;
    };
  }, [order.id, hasExistingLabel]);

  function clearRateResults() {
    setRates([]);
    setShipmentId("");
    setLabelResult(null);
  }

  function handleParcelChange(setValue, value) {
    setValue(value);
    clearRateResults();
    setError("");
  }

  async function handleGetRates(event) {
    event.preventDefault();

    setLoading(true);
    setError("");
    setRates([]);
    setLabelResult(null);
    setShipmentId("");

    try {
      const numericWeight = Number(weight);
      const numericLength = Number(length);
      const numericWidth = Number(width);
      const numericHeight = Number(height);

      if (
        !Number.isFinite(numericWeight) ||
        numericWeight <= 0
      ) {
        throw new Error(
          "Enter a valid parcel weight."
        );
      }

      if (
        !Number.isFinite(numericLength) ||
        numericLength <= 0 ||
        !Number.isFinite(numericWidth) ||
        numericWidth <= 0 ||
        !Number.isFinite(numericHeight) ||
        numericHeight <= 0
      ) {
        throw new Error(
          "Enter valid parcel dimensions."
        );
      }

      const shippingAddress =
        order?.shipping_address;

      if (!shippingAddress) {
        throw new Error(
          "This order does not have a shipping address."
        );
      }

      if (
        !shippingAddress.line1 ||
        !shippingAddress.city ||
        !shippingAddress.state ||
        !shippingAddress.postal_code
      ) {
        throw new Error(
          "The order shipping address is incomplete."
        );
      }

      const senderAddress = {
        street1:
          process.env
            .NEXT_PUBLIC_SHIPPING_STREET,

        city:
          process.env
            .NEXT_PUBLIC_SHIPPING_CITY,

        state:
          process.env
            .NEXT_PUBLIC_SHIPPING_STATE,

        zip:
          process.env
            .NEXT_PUBLIC_SHIPPING_ZIP,

        phone:
          process.env
            .NEXT_PUBLIC_SHIPPING_PHONE,

        email:
          process.env
            .NEXT_PUBLIC_SHIPPING_EMAIL,
      };

      if (
        !senderAddress.street1 ||
        !senderAddress.city ||
        !senderAddress.state ||
        !senderAddress.zip ||
        !senderAddress.email
      ) {
        throw new Error(
          "The Shakti Foods shipping address is not configured."
        );
      }

      const shipmentData = {
        address_from: {
          name: "Shakti Foods",
          company: "Shakti Foods",
          street1: senderAddress.street1,
          city: senderAddress.city,
          state: senderAddress.state,
          zip: senderAddress.zip,
          country: "US",
          phone: senderAddress.phone || "",
          email: senderAddress.email,
        },

        address_to: {
          name:
            order.customer_name || "Customer",

          street1:
            shippingAddress.line1,

          street2:
            shippingAddress.line2 || "",

          city:
            shippingAddress.city,

          state:
            shippingAddress.state,

          zip:
            shippingAddress.postal_code,

          country:
            shippingAddress.country || "US",

          phone:
            order.customer_phone || "",

          email:
            order.customer_email || "",
        },

        parcels: [
          {
            length: String(numericLength),
            width: String(numericWidth),
            height: String(numericHeight),
            distance_unit: "in",
            weight: String(numericWeight),
            mass_unit: "lb",
          },
        ],

        async: false,
      };

      const result =
        await getShippingRates(
          shipmentData
        );

      if (!result.success) {
        throw new Error(
          result.error ||
            "Unable to retrieve shipping rates."
        );
      }

      const returnedRates =
        result.rates || [];

      if (returnedRates.length === 0) {
        throw new Error(
          "Shippo did not return any shipping rates."
        );
      }

      setShipmentId(
        result.shipment?.object_id || ""
      );

      setRates(returnedRates);
    } catch (rateError) {
      setError(
        rateError instanceof Error
          ? rateError.message
          : "Unable to retrieve shipping rates."
      );
    } finally {
      setLoading(false);
    }
  }

  async function handleBuyLabel(rate) {
    const serviceName =
      rate.servicelevel?.name ||
      rate.servicelevel?.token ||
      "Shipping service";

    const confirmed = window.confirm(
      `Create a TEST shipping label for ${
        rate.provider
      } ${serviceName} at $${Number(
        rate.amount
      ).toFixed(2)}?`
    );

    if (!confirmed) {
      return;
    }

    setBuyingRateId(rate.object_id);
    setError("");
    setLabelResult(null);

    try {
      const result =
        await buyShippingLabel({
          orderId: order.id,
          rateObjectId: rate.object_id,
          shipmentObjectId: shipmentId,
          provider: rate.provider,
          service: serviceName,
          amount: rate.amount,

          parcel: {
            weight,
            length,
            width,
            height,
          },
        });

      if (!result.success) {
        throw new Error(
          result.error ||
            "Unable to create shipping label."
        );
      }

      const transaction =
        result.transaction;

      if (
        !transaction ||
        transaction.status !== "SUCCESS"
      ) {
        const shippoMessage =
          transaction?.messages?.[0]?.text ||
          transaction?.messages?.[0]?.message ||
          (transaction?.status === "QUEUED"
            ? "The label is still being generated. Please try again shortly."
            : "Shippo could not create the label.");

        throw new Error(shippoMessage);
      }

      setLabelResult({
        provider: rate.provider,
        service: serviceName,
        amount: rate.amount,
        currency: rate.currency,

        trackingNumber:
          transaction.tracking_number,

        trackingUrl:
          transaction.tracking_url_provider,

        labelUrl:
          transaction.label_url,

        transactionId:
          transaction.object_id,

        test:
          transaction.test,

        emailSent:
          result.emailSent,

        emailError:
          result.emailError,
      });

      router.refresh();
    } catch (labelError) {
      setError(
        labelError instanceof Error
          ? labelError.message
          : "Unable to create shipping label."
      );
    } finally {
      setBuyingRateId("");
    }
  }

  if (hasExistingLabel) {
    return (
      <section className="rounded-3xl border border-green-200 bg-green-50 p-5 md:p-6">
        <div className="flex items-start gap-4">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-green-700 text-xl font-bold text-white">
            ✓
          </div>

          <div className="min-w-0">
            <h2 className="font-display text-2xl font-bold text-green-950">
              Shipping Label Created
            </h2>

            <p className="mt-1 text-sm leading-6 text-green-900/70">
              This order already has a shipping
              label. Creating another label is
              disabled to prevent duplicate
              charges.
            </p>
          </div>
        </div>

        <div className="mt-6 grid gap-3 rounded-2xl bg-white p-4 text-sm shadow-sm">
          <div className="flex items-start justify-between gap-4">
            <span className="font-semibold text-black/55">
              Carrier
            </span>

            <span className="text-right font-bold uppercase text-black">
              {order.shipping_carrier ||
                "Not available"}
            </span>
          </div>

          <div className="flex items-start justify-between gap-4">
            <span className="font-semibold text-black/55">
              Service
            </span>

            <span className="text-right font-bold text-black">
              {order.shipping_service ||
                order.shipping_method ||
                "Not available"}
            </span>
          </div>

          <div className="flex items-start justify-between gap-4">
            <span className="font-semibold text-black/55">
              Tracking number
            </span>

            <span className="max-w-[65%] break-all text-right font-bold text-black">
              {order.tracking_number ||
                "Not available"}
            </span>
          </div>

          {order.shipping_cost !== null &&
          order.shipping_cost !== undefined ? (
            <div className="flex items-start justify-between gap-4">
              <span className="font-semibold text-black/55">
                Label cost
              </span>

              <span className="text-right font-bold text-black">
                $
                {Number(
                  order.shipping_cost
                ).toFixed(2)}
              </span>
            </div>
          ) : null}
        </div>

        <p className="mt-4 text-xs font-semibold leading-5 text-green-900/60">
          To replace this label later, we will add
          a proper Shippo void-and-recreate
          workflow.
        </p>
      </section>
    );
  }

  return (
    <section className="rounded-3xl border border-black/10 bg-white p-5 md:p-6">
      <div>
        <h2 className="font-display text-2xl font-bold text-black">
          Shipping Label
        </h2>

        <p className="mt-2 text-sm leading-6 text-black/60">
          Parcel measurements are calculated from
          the ordered products. You can adjust
          them before retrieving shipping rates.
        </p>
      </div>

      {calculatingParcel ? (
        <div className="mt-5 flex items-center gap-3 rounded-2xl bg-[#faf7f1] px-4 py-3 text-sm font-semibold text-black/65">
          <span
            aria-hidden="true"
            className="h-4 w-4 animate-spin rounded-full border-2 border-black/20 border-t-black"
          />

          Calculating parcel measurements…
        </div>
      ) : null}

      {parcelCalculationError ? (
        <div className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-800">
          {parcelCalculationError}

          <div className="mt-1 font-normal">
            Enter the parcel measurements
            manually or add shipping measurements
            to the product.
          </div>
        </div>
      ) : null}

      <form
        onSubmit={handleGetRates}
        className="mt-6 grid gap-5"
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="grid gap-2">
            <span className="text-sm font-bold text-black">
              Weight
            </span>

            <div className="relative">
              <input
                type="number"
                min="0.1"
                step="0.1"
                required
                disabled={calculatingParcel}
                value={weight}
                onChange={(event) =>
                  handleParcelChange(
                    setWeight,
                    event.target.value
                  )
                }
                placeholder="0.00"
                className="w-full rounded-2xl border border-black/15 bg-[#faf7f1] px-4 py-3 pr-12 text-base font-semibold text-black outline-none transition focus:border-black focus:bg-white disabled:cursor-wait disabled:opacity-60"
              />

              <span className="pointer-events-none absolute inset-y-0 right-4 flex items-center text-sm font-bold text-black/45">
                lb
              </span>
            </div>
          </label>

          <label className="grid gap-2">
            <span className="text-sm font-bold text-black">
              Length
            </span>

            <div className="relative">
              <input
                type="number"
                min="0.1"
                step="0.1"
                required
                disabled={calculatingParcel}
                value={length}
                onChange={(event) =>
                  handleParcelChange(
                    setLength,
                    event.target.value
                  )
                }
                placeholder="0.00"
                className="w-full rounded-2xl border border-black/15 bg-[#faf7f1] px-4 py-3 pr-12 text-base font-semibold text-black outline-none transition focus:border-black focus:bg-white disabled:cursor-wait disabled:opacity-60"
              />

              <span className="pointer-events-none absolute inset-y-0 right-4 flex items-center text-sm font-bold text-black/45">
                in
              </span>
            </div>
          </label>

          <label className="grid gap-2">
            <span className="text-sm font-bold text-black">
              Width
            </span>

            <div className="relative">
              <input
                type="number"
                min="0.1"
                step="0.1"
                required
                disabled={calculatingParcel}
                value={width}
                onChange={(event) =>
                  handleParcelChange(
                    setWidth,
                    event.target.value
                  )
                }
                placeholder="0.00"
                className="w-full rounded-2xl border border-black/15 bg-[#faf7f1] px-4 py-3 pr-12 text-base font-semibold text-black outline-none transition focus:border-black focus:bg-white disabled:cursor-wait disabled:opacity-60"
              />

              <span className="pointer-events-none absolute inset-y-0 right-4 flex items-center text-sm font-bold text-black/45">
                in
              </span>
            </div>
          </label>

          <label className="grid gap-2">
            <span className="text-sm font-bold text-black">
              Height
            </span>

            <div className="relative">
              <input
                type="number"
                min="0.1"
                step="0.1"
                required
                disabled={calculatingParcel}
                value={height}
                onChange={(event) =>
                  handleParcelChange(
                    setHeight,
                    event.target.value
                  )
                }
                placeholder="0.00"
                className="w-full rounded-2xl border border-black/15 bg-[#faf7f1] px-4 py-3 pr-12 text-base font-semibold text-black outline-none transition focus:border-black focus:bg-white disabled:cursor-wait disabled:opacity-60"
              />

              <span className="pointer-events-none absolute inset-y-0 right-4 flex items-center text-sm font-bold text-black/45">
                in
              </span>
            </div>
          </label>
        </div>

        <button
          type="submit"
          disabled={
            calculatingParcel ||
            loading ||
            Boolean(buyingRateId)
          }
          className="inline-flex w-full items-center justify-center gap-3 rounded-full bg-black px-6 py-4 text-base font-bold text-white transition hover:bg-[#333333] disabled:cursor-not-allowed disabled:opacity-50"
        >
          {calculatingParcel ? (
            <>
              <span
                aria-hidden="true"
                className="h-5 w-5 animate-spin rounded-full border-2 border-white/35 border-t-white"
              />

              Calculating Parcel...
            </>
          ) : loading ? (
            <>
              <span
                aria-hidden="true"
                className="h-5 w-5 animate-spin rounded-full border-2 border-white/35 border-t-white"
              />

              Getting Shipping Rates...
            </>
          ) : (
            "Get Shipping Rates"
          )}
        </button>
      </form>

      {error ? (
        <div
          role="alert"
          className="mt-5 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700"
        >
          {error}
        </div>
      ) : null}

      {sortedRates.length > 0 ? (
        <div className="mt-8 grid gap-4">
          <div>
            <h3 className="text-xl font-bold text-black">
              Available Rates
            </h3>

            <p className="mt-1 text-sm leading-6 text-black/55">
              Rates are arranged from the lowest
              price to the highest.
            </p>
          </div>

          {sortedRates.map(
            (rate, index) => {
              const serviceName =
                rate.servicelevel?.name ||
                rate.servicelevel?.token ||
                "Shipping service";

              const isLowestPrice =
                index === 0;

              return (
                <article
                  key={rate.object_id}
                  className="relative overflow-hidden rounded-2xl border border-black/10 bg-[#faf7f1] p-5"
                >
                  {isLowestPrice ? (
                    <div className="absolute right-0 top-0 rounded-bl-2xl bg-green-700 px-3 py-2 text-xs font-bold uppercase tracking-[0.1em] text-white">
                      Lowest Price
                    </div>
                  ) : null}

                  <div className="flex items-start gap-4">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-black text-sm font-bold uppercase text-white">
                      {String(
                        rate.provider || "SH"
                      ).slice(0, 2)}
                    </div>

                    <div className="min-w-0 flex-1 pr-20">
                      <div className="font-bold text-black">
                        {rate.provider}
                      </div>

                      <div className="mt-1 text-sm font-semibold text-black/65">
                        {serviceName}
                      </div>
                    </div>
                  </div>

                  <div className="mt-5 grid grid-cols-2 gap-3">
                    <div className="rounded-xl bg-white p-3">
                      <div className="text-xs font-bold uppercase tracking-[0.12em] text-black/40">
                        Price
                      </div>

                      <div className="mt-1 text-xl font-bold text-black">
                        $
                        {Number(
                          rate.amount
                        ).toFixed(2)}
                      </div>
                    </div>

                    <div className="rounded-xl bg-white p-3">
                      <div className="text-xs font-bold uppercase tracking-[0.12em] text-black/40">
                        Delivery
                      </div>

                      <div className="mt-1 font-bold text-black">
                        {rate.estimated_days
                          ? `${
                              rate.estimated_days
                            } day${
                              Number(
                                rate.estimated_days
                              ) === 1
                                ? ""
                                : "s"
                            }`
                          : "Not provided"}
                      </div>
                    </div>
                  </div>

                  <button
                    type="button"
                    disabled={Boolean(
                      buyingRateId
                    )}
                    onClick={() =>
                      handleBuyLabel(rate)
                    }
                    className="mt-4 inline-flex w-full items-center justify-center gap-3 rounded-full bg-black px-5 py-3 font-bold text-white transition hover:bg-[#333333] disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {buyingRateId ===
                    rate.object_id ? (
                      <>
                        <span
                          aria-hidden="true"
                          className="h-5 w-5 animate-spin rounded-full border-2 border-white/35 border-t-white"
                        />

                        Creating Test Label...
                      </>
                    ) : (
                      `Buy Label for $${Number(
                        rate.amount
                      ).toFixed(2)}`
                    )}
                  </button>
                </article>
              );
            }
          )}
        </div>
      ) : null}

      {labelResult ? (
        <div className="mt-7 rounded-2xl border border-green-200 bg-green-50 p-5">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-green-700 font-bold text-white">
              ✓
            </div>

            <h3 className="text-lg font-bold text-green-950">
              Test Label Created
            </h3>
          </div>

          <p className="mt-3 text-sm text-green-900/70">
            The shipment information has been
            saved to the order.
          </p>

          {labelResult.emailSent ? (
            <p className="mt-2 text-sm font-semibold text-green-800">
              Shipment email sent to the customer.
            </p>
          ) : labelResult.emailError ? (
            <p className="mt-2 text-sm font-semibold text-amber-700">
              The label was saved, but the email
              was not sent:{" "}
              {labelResult.emailError}
            </p>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}