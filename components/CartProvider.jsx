"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState
} from "react";

const CartContext = createContext(null);

export function CartProvider({ children }) {
  const [items, setItems] = useState([]);
  const [cartLoaded, setCartLoaded] = useState(false);

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

    let result = {
      success: true
    };

    setItems((currentItems) => {
      const existingStorefront =
        currentItems[0]?.storefront || "shakti_foods";

      if (
        currentItems.length > 0 &&
        existingStorefront !== incomingStorefront
      ) {
        result = {
          success: false,
          reason: "storefront_mismatch"
        };
        return currentItems;
      }

      const existingItem = currentItems.find(
        (item) => item.id === product.id
      );

      const currentQuantity = existingItem?.quantity || 0;

      if (
        Number.isFinite(availableStock) &&
        currentQuantity >= availableStock
      ) {
        alert(`Only ${availableStock} item(s) available in stock.`);
        result = {
          success: false,
          reason: "stock_limit"
        };
        return currentItems;
      }

      if (existingItem) {
        return currentItems.map((item) =>
          item.id === product.id
            ? {
                ...item,
                storefront: incomingStorefront,
                quantity: item.quantity + 1,
                availableStock
              }
            : item
        );
      }

      return [
        ...currentItems,
        {
          ...product,
          storefront: incomingStorefront,
          quantity: 1,
          availableStock
        }
      ];
    });

    return result;
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