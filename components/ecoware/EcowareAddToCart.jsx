"use client";

import {
  useState
} from "react";

import {
  useCart
} from "@/components/CartProvider";

export default function EcowareAddToCart({
  product,
  availableStock,
  disabled = false
}) {
  const {
    addItem
  } = useCart();

  const [
    message,
    setMessage
  ] = useState("");

  function handleAddToCart() {
    setMessage("");

    if (disabled) {
      return;
    }

    const added =
      addItem(
        {
          ...product,

          storefront:
            "ecoware"
        },
        {
          availableStock,

          storefront:
            "ecoware"
        }
      );

    if (
      added?.reason ===
      "storefront_mismatch"
    ) {
      setMessage(
        "Your cart contains Shakti Foods products. Clear the cart before adding Simpli Ecoware products."
      );

      return;
    }

    if (
      added?.reason ===
      "out_of_stock"
    ) {
      setMessage(
        "This product is currently out of stock."
      );

      return;
    }

    if (
      added?.reason ===
      "stock_limit"
    ) {
      setMessage(
        "You have reached the available stock limit."
      );

      return;
    }

    if (
      added?.success ===
      false
    ) {
      setMessage(
        "Unable to add this product to your cart."
      );

      return;
    }

    setMessage(
      "Added to cart."
    );
  }

  return (
    <div>
      <button
        type="button"
        onClick={
          handleAddToCart
        }
        disabled={disabled}
        className="w-full rounded-full bg-black px-7 py-4 text-sm font-bold text-white disabled:cursor-not-allowed disabled:bg-black/30"
      >
        {disabled
          ? "Out of Stock"
          : "Add to Cart"}
      </button>

      {message ? (
        <p className="mt-3 text-center text-sm text-black/55">
          {message}
        </p>
      ) : null}
    </div>
  );
}