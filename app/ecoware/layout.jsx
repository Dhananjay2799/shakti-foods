import Link from "next/link";

import EcowareCartButton from "@/components/ecoware/EcowareCartButton";
import { CartProvider } from "@/components/CartProvider";

export const metadata = {
  title: {
    default: "Simpli Ecoware",
    template: "%s | Simpli Ecoware"
  },
  description:
    "Sustainable tableware and food-service packaging for homes, events, restaurants, and wholesale buyers."
};

export default function EcowareLayout({ children }) {
  return (
    <CartProvider>
      <div className="min-h-screen bg-[#f8f6ef] text-black">
        <header className="border-b border-black/10 bg-white">
          <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
            <Link
              href="/ecoware"
              className="text-xl font-black tracking-tight"
            >
              SIMPLI ECOWARE
            </Link>

            <div className="flex items-center gap-6">
              <nav className="flex items-center gap-6 text-sm font-semibold">
                <Link href="/ecoware">Home</Link>

                <Link href="/ecoware/products">Products</Link>

                <Link href="/ecoware#wholesale">Wholesale</Link>

                <Link href="/ecoware#samples">Samples</Link>

                <Link
                  href="/"
                  className="rounded-full border border-black px-4 py-2"
                >
                  Shakti Foods
                </Link>
              </nav>

              <EcowareCartButton />
            </div>
          </div>
        </header>

        <main>{children}</main>

        <footer className="mt-20 border-t border-black/10 bg-white">
          <div className="mx-auto flex max-w-7xl flex-col gap-6 px-6 py-10 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="font-black">SIMPLI ECOWARE</p>

              <p className="mt-1 text-sm text-black/55">
                Sustainable food-service solutions.
              </p>
            </div>

            <div className="flex gap-5 text-sm">
              <Link href="/ecoware/products">Products</Link>

              <Link href="/">Visit Shakti Foods</Link>
            </div>
          </div>
        </footer>
      </div>
    </CartProvider>
  );
}