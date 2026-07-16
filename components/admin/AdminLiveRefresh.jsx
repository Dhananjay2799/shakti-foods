"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function AdminLiveRefresh() {
  const router = useRouter();

  useEffect(() => {
    const supabase = createClient();
    let refreshTimer;

    function refreshDashboard(payload) {
      console.log("Admin realtime change:", payload);

      window.clearTimeout(refreshTimer);

      refreshTimer = window.setTimeout(() => {
        router.refresh();
      }, 300);
    }

    const channel = supabase
      .channel("admin-dashboard-changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "orders"
        },
        refreshDashboard
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "inventory"
        },
        refreshDashboard
      )
      .subscribe((status, error) => {
        console.log("Admin realtime status:", status);

        if (error) {
          console.error(
            "Admin realtime subscription error:",
            error
          );
        }
      });

    return () => {
      window.clearTimeout(refreshTimer);
      supabase.removeChannel(channel);
    };
  }, [router]);

  return null;
}