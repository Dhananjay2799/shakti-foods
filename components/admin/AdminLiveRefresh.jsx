"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

const REFRESH_DELAY = 300;

export default function AdminLiveRefresh() {
  const router = useRouter();

  useEffect(() => {
    const supabase = createClient();

    let refreshTimer = null;
    let isRefreshing = false;

    const scheduleRefresh = (payload) => {
      if (process.env.NODE_ENV === "development") {
        console.log("Admin realtime change:", payload);
      }

      if (refreshTimer) {
        clearTimeout(refreshTimer);
      }

      refreshTimer = window.setTimeout(async () => {
        if (isRefreshing) return;

        isRefreshing = true;

        try {
          router.refresh();
        } finally {
          isRefreshing = false;
        }
      }, REFRESH_DELAY);
    };

    const channel = supabase
      .channel("admin-dashboard-changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "orders"
        },
        scheduleRefresh
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "inventory"
        },
        scheduleRefresh
      )
      .subscribe((status, error) => {
        if (process.env.NODE_ENV === "development") {
          console.log("Admin realtime status:", status);
        }

        if (error) {
          console.error(
            "Admin realtime subscription error:",
            error
          );
        }
      });

    return () => {
      if (refreshTimer) {
        clearTimeout(refreshTimer);
      }

      supabase.removeChannel(channel);
    };
  }, [router]);

  return null;
}