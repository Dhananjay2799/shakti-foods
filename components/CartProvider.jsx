"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState
} from "react";
import CartToast from "@/components/CartToast";
import { playAddToCartSound } from "@/lib/cart-sound";

const CartContext = createContext(null);

const CART_PAGES = {
  shakti_foods: "/cart",
  ecoware: "/ecoware/cart"
};

export function CartProvider({ children }) {
  const [items, setItems] = useState([]);
  const [cartLoaded, setCartLoaded] = useState(false);
  const [toast, setToast] = useState(null);

  // The cart as of the last change, so addItem can decide right away
  // (React may run a setItems updater later, after addItem has returned).
  const itemsRef = useRef(items);
  const pendingToastRef = useRef(null);

  useEffect(() => {
    itemsRef.current = items;
  }, [items]);

  const closeToast = useCallback(() => setToast(null), []);

  // One click can call addItem several times (quantity 3 on the product
  // page); those become one pop-up and one sound.
  function announce(entry) {
    const pending = pendingToastRef.current;

    if (pending) {
      if (entry.type === "added") {
        pending.quantityAdded += 1;
        pending.cartQuantity = entry.cartQuantity;
      } else if (pending.type === "added") {
        pending.limitReached = true;
      }
      return;
    }

    pendingToastRef.current = {
      ...entry,
      quantityAdded: entry.type === "added" ? 1 : 0
    };

    if (entry.type === "added") {
      playAddToCartSound();
    }

    queueMicrotask(() => {
      const next = pendingToastRef.current;
      pendingToastRef.current = null;

      if (next) {
        setToast({ ...next, id: `${Date.now()}-${Math.random()}` });
      }
    });
  }

  useEffect(() => {
    try {
      const savedCart = window.localStorage.getItem("shakti-cart");

      if (savedCart) {
        const parsedCart = JSON.parse(savedCart);

        if (Array.isArray(parsedCart)) {
          setItems(parsedCart);
        }
      }
    } catch (error) {
      console.error("Unable to load cart:", error);
      setItems([]);
    } finally {
      setCartLoaded(true);
    }
  }, []);

  useEffect(() => {
    if (!cartLoaded) return;

    try {
      window.localStorage.setItem("shakti-cart", JSON.stringify(items));
    } catch (error) {
      console.error("Unable to save cart:", error);
    }
  }, [items, cartLoaded]);

  function addItem(product, options = {}) {
    const availableStock = Number(options.availableStock);

    const incomingStorefront = String(
      product.storefront || options.storefront || "shakti_foods"
    ).trim();

    if (
      incomingStorefront !== "shakti_foods" &&
      incomingStorefront !== "ecoware"
    ) {
      return {
        success: false,
        reason: "invalid_storefront"
      };
    }

    if (
      product.unitPrice === null ||
      product.unitPrice === undefined ||
      product.unitPrice <= 0
    ) {
      return {
        success: false,
        reason: "invalid_price"
      };
    }

    if (Number.isFinite(availableStock) && availableStock <= 0) {
      return {
        success: false,
        reason: "out_of_stock"
      };
    }

    const currentItems = itemsRef.current;

    const existingStorefront =
      currentItems[0]?.storefront || "shakti_foods";

    if (
      currentItems.length > 0 &&
      existingStorefront !== incomingStorefront
    ) {
      return {
        success: false,
        reason: "storefront_mismatch"
      };
    }

    const existingItem = currentItems.find(
      (item) => item.id === product.id
    );

    const currentQuantity = existingItem?.quantity || 0;

    if (
      Number.isFinite(availableStock) &&
      currentQuantity >= availableStock
    ) {
      announce({
        type: "error",
        message: `Only ${availableStock} in stock, and ${
          availableStock === 1 ? "it's" : "they're all"
        } already in your cart.`,
        cartHref: CART_PAGES[incomingStorefront]
      });

      return {
        success: false,
        reason: "stock_limit"
      };
    }

    const nextItems = existingItem
      ? currentItems.map((item) =>
          item.id === product.id
            ? {
                ...item,
                storefront: incomingStorefront,
                quantity: item.quantity + 1,
                availableStock
              }
            : item
        )
      : [
          ...currentItems,
          {
            ...product,
            storefront: incomingStorefront,
            quantity: 1,
            availableStock
          }
        ];

    itemsRef.current = nextItems;
    setItems(nextItems);

    announce({
      type: "added",
      item: product,
      cartQuantity: currentQuantity + 1,
      cartHref: CART_PAGES[incomingStorefront]
    });

    return {
      success: true
    };
  }

  function removeItem(id) {
    setItems((currentItems) =>
      currentItems.filter((item) => item.id !== id)
    );
  }

  function increase(id, availableStock) {
    const stockLimit = Number(availableStock);

    setItems((currentItems) =>
      currentItems.map((item) => {
        if (item.id !== id) {
          return item;
        }

        if (
          Number.isFinite(stockLimit) &&
          item.quantity >= stockLimit
        ) {
          alert(`Only ${stockLimit} item(s) available in stock.`);
          return item;
        }

        return {
          ...item,
          quantity: item.quantity + 1
        };
      })
    );
  }

  function decrease(id) {
    setItems((currentItems) =>
      currentItems.map((item) =>
        item.id === id
          ? { ...item, quantity: Math.max(1, item.quantity - 1) }
          : item
      )
    );
  }

  function clearCart() {
    setItems([]);

    try {
      window.localStorage.removeItem("shakti-cart");
    } catch (error) {
      console.error("Unable to remove saved cart:", error);
    }
  }

  function replaceCart(nextItems) {
    if (!Array.isArray(nextItems)) {
      return false;
    }

    const normalizedItems = nextItems
      .filter(
        (item) =>
          item &&
          item.id &&
          Number(item.quantity) > 0
      )
      .map((item) => ({
        ...item,
        quantity: Math.max(
          1,
          Math.floor(Number(item.quantity))
        )
      }));

    setItems(normalizedItems);

    return true;
  }

  const subtotal = useMemo(
    () =>
      items.reduce(
        (total, item) => total + item.unitPrice * item.quantity,
        0
      ),
    [items]
  );

  const itemCount = useMemo(
    () => items.reduce((total, item) => total + item.quantity, 0),
    [items]
  );

  return (
    <CartContext.Provider
      value={{
        items,
        addItem,
        removeItem,
        increase,
        decrease,
        clearCart,
        replaceCart,
        subtotal,
        itemCount,
        cartLoaded
      }}
    >
      {children}
      <CartToast toast={toast} onClose={closeToast} />
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);

  if (!context) {
    throw new Error("useCart must be used inside CartProvider");
  }

  return context;
}