"use client";

import { startTransition, useEffect } from "react";
import { useRouter } from "next/navigation";
import { CircleAlert } from "lucide-react";

/*
 * Shown when an admin page or a save fails (app/admin/error.js and
 * app/admin/[storefront]/error.jsx), instead of the blank
 * "Application error" screen. The red "Changes not saved" message comes
 * from AdminToaster.
 */
export default function AdminErrorPanel({ error, reset }) {
  const router = useRouter();

  useEffect(() => {
    console.error("Admin error:", error);
  }, [error]);

  function tryAgain() {
    startTransition(() => {
      router.refresh();
      reset();
    });
  }

  return (
    <div className="mx-auto w-full max-w-xl px-4 py-10">
      <div className="rounded-2xl border border-red-200 bg-white p-6 shadow-sm">
        <div className="flex items-start gap-3">
          <CircleAlert size={24} aria-hidden="true" className="mt-0.5 shrink-0 text-red-600" />
          <div>
            <h1 className="text-xl font-bold text-black">Changes not saved</h1>
            <p className="mt-2 text-sm leading-6 text-black/65">
              Something went wrong, so this didn&apos;t go through. Check what you entered and try
              again. If it keeps happening, share this code with your developer:{" "}
              <span className="font-mono text-black">{error?.digest || "unknown"}</span>
            </p>
          </div>
        </div>

        <div className="mt-6 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={tryAgain}
            className="rounded-full bg-black px-5 py-2.5 text-sm font-bold text-white transition hover:bg-black/80"
          >
            Try again
          </button>
          <button
            type="button"
            onClick={() => window.history.back()}
            className="rounded-full border border-black/15 px-5 py-2.5 text-sm font-bold text-black transition hover:bg-black/5"
          >
            Go back
          </button>
        </div>
      </div>
    </div>
  );
}
