"use client";

import Link from "next/link";
import {
  useEffect,
  useRef,
  useState
} from "react";

import {
  useRouter,
  useSearchParams
} from "next/navigation";

import {
  CheckCircle2,
  ShoppingCart,
  XCircle
} from "lucide-react";

import {
  useCart
} from "@/components/CartProvider";

export default function CartRecoveryClient() {
  const router =
    useRouter();

  const searchParams =
    useSearchParams();

  const {
    replaceCart,
    cartLoaded
  } = useCart();

  const recoveryStarted =
    useRef(false);

  const [state, setState] =
    useState("loading");

  const [message, setMessage] =
    useState(
      "We’re checking current product availability and pricing."
    );

  const [
    unavailableItems,
    setUnavailableItems
  ] = useState([]);

  useEffect(() => {
    /*
     * Wait until CartProvider has loaded
     * localStorage before replacing anything.
     */
    if (!cartLoaded) {
      return;
    }

    /*
     * React Strict Mode may execute effects
     * more than once during development.
     */
    if (recoveryStarted.current) {
      return;
    }

    const token =
      String(
        searchParams.get("token") ||
        ""
      ).trim();

    if (!token) {
      recoveryStarted.current = true;

      setState("error");

      setMessage(
        "This recovery link is missing or invalid."
      );

      return;
    }

    recoveryStarted.current = true;

    async function restore() {
      try {
        console.log(
          "Starting cart recovery:",
          {
            token
          }
        );

        const response =
          await fetch(
            "/api/cart/recover",
            {
              method: "POST",

              headers: {
                "Content-Type":
                  "application/json"
              },

              body:
                JSON.stringify({
                  token
                }),

              cache: "no-store"
            }
          );

        const result =
          await response.json();

        console.log(
          "Cart recovery response:",
          result
        );

        if (
          !response.ok ||
          !result?.success
        ) {
          throw new Error(
            result?.message ||
              "Unable to restore this cart."
          );
        }

        const restoredItems =
          Array.isArray(
            result.items
          )
            ? result.items
            : [];

        if (
          restoredItems.length === 0
        ) {
          throw new Error(
            "No products are currently available to restore."
          );
        }

        const replaced =
          replaceCart(
            restoredItems
          );

        if (replaced === false) {
          throw new Error(
            "Unable to save the restored cart."
          );
        }

        setUnavailableItems(
          Array.isArray(
            result.unavailableItems
          )
            ? result.unavailableItems
            : []
        );

        setState("success");

        setMessage(
          "Your cart has been restored with current pricing and availability."
        );

        /*
         * Allow CartProvider's localStorage
         * persistence effect to run before
         * navigating away.
         */
        window.setTimeout(
          () => {
            router.replace(
              "/cart"
            );
          },
          1200
        );
      } catch (error) {
        console.error(
          "Cart recovery failed:",
          error
        );

        setState("error");

        setMessage(
          error instanceof Error
            ? error.message
            : "Unable to restore this cart."
        );
      }
    }

    restore();
  }, [
    cartLoaded,
    replaceCart,
    router,
    searchParams
  ]);

  const loading =
    state === "loading";

  const success =
    state === "success";

  const failed =
    state === "error";

  return (
    <main className="min-h-[100svh] bg-brand-radial pt-24 text-black md:pt-28">
      <section className="section-pad py-14 md:py-24">
        <div className="container-brand">
          <div className="mx-auto max-w-2xl rounded-[2rem] bg-white p-7 text-center shadow-soft md:p-10">

            {loading ? (
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-[#f2eadc]">
                <ShoppingCart
                  size={24}
                />
              </div>
            ) : null}

            {success ? (
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-green-100 text-green-700">
                <CheckCircle2
                  size={26}
                />
              </div>
            ) : null}

            {failed ? (
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-red-100 text-red-700">
                <XCircle
                  size={26}
                />
              </div>
            ) : null}

            <div className="mt-6 text-xs font-black uppercase tracking-[.2em] text-black/40">
              Cart Recovery
            </div>

            <h1 className="mt-3 font-display text-4xl font-bold md:text-5xl">
              {loading
                ? "Restoring your cart..."
                : success
                  ? "Your cart is ready."
                  : "We couldn’t restore this cart."}
            </h1>

            <p className="mt-4 text-sm leading-7 text-black/60">
              {message}
            </p>

            {unavailableItems.length >
            0 ? (
              <div className="mt-6 rounded-2xl bg-amber-50 p-5 text-left">
                <div className="font-bold text-amber-900">
                  Some items were adjusted
                </div>

                <div className="mt-3 grid gap-2">
                  {unavailableItems.map(
                    (
                      item,
                      index
                    ) => (
                      <div
                        key={`${item.productId}-${index}`}
                        className="text-sm text-amber-900/75"
                      >
                        {item.name ||
                          item.productId}
                      </div>
                    )
                  )}
                </div>
              </div>
            ) : null}

            {failed ? (
              <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
                <Link
                  href="/products"
                  className="rounded-full bg-black px-6 py-3.5 text-sm font-bold text-white"
                >
                  Shop Products
                </Link>

                <Link
                  href="/cart"
                  className="rounded-full bg-[#f2eadc] px-6 py-3.5 text-sm font-bold text-black"
                >
                  View Cart
                </Link>
              </div>
            ) : null}

          </div>
        </div>
      </section>
    </main>
  );
}