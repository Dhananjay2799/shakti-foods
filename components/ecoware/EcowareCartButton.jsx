"use client";

import Link from "next/link";
import { ShoppingBag } from "lucide-react";

import {
  useCart
} from "@/components/CartProvider";

export default function EcowareCartButton() {
  const {
    itemCount
  } = useCart();

  return (
    <Link
      href="/cart"
      aria-label="Cart"
      className="relative grid h-10 w-10 place-items-center rounded-full border border-black/15 bg-white text-black transition hover:bg-black hover:text-white"
    >
      <ShoppingBag size={18} />

      {itemCount > 0 ? (
        <span className="absolute -right-1 -top-1 grid h-5 min-w-5 place-items-center rounded-full bg-black px-1 text-xs font-bold text-white">
          {itemCount}
        </span>
      ) : null}
    </Link>
  );
}