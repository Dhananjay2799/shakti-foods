"use client";

import { useCallback, useEffect, useState } from "react";

export function useInventory() {
  const [inventory, setInventory] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const refreshInventory = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      const response = await fetch("/api/inventory", {
        cache: "no-store"
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.message || "Unable to load inventory.");
      }

      const inventoryMap = {};

      for (const item of result.inventory) {
        inventoryMap[item.product_id] = item;
      }

      setInventory(inventoryMap);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshInventory();
  }, [refreshInventory]);

  function getStock(productId) {
    return inventory[productId] || null;
  }

  return {
    inventory,
    loading,
    error,
    getStock,
    refreshInventory
  };
}