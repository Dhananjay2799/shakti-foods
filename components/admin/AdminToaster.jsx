"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { CircleAlert, CircleCheck, X } from "lucide-react";

/*
 * Admin-wide messages, at the top of the screen for 4 seconds:
 *   green "Changes saved successfully" after any save in admin,
 *   red   "Changes not saved" after Cancel / Discard changes, or when a
 *         save fails.
 *
 * How saves are noticed: every admin form posts a Next.js server action
 * (a fetch with a "Next-Action" header). When that fetch follows a form
 * submit, its answer decides the message. Calls made from code (shipping
 * rates and the like) are not saves and show nothing.
 *
 * Opt-outs and extras (attributes on the form, link or button):
 *   data-admin-toast="manual"  the form shows its own result with
 *                              showAdminToast() (forms whose action returns
 *                              { ok: false } instead of failing)
 *   data-admin-toast="off"     no message for this form
 *   data-admin-cancel          also counts as Cancel (e.g. a Close link)
 */

const EVENT = "admin-toast";
const STORE_KEY = "admin-toast";
const SHOW_MS = 4000;
const SUBMIT_WINDOW_MS = 2000;

export const SAVED_TEXT = "Changes saved successfully";
export const NOT_SAVED_TEXT = "Changes not saved";
const FAILED_TEXT = "Changes not saved. Please try again.";

/** tone: "success" | "error". */
export function showAdminToast(tone = "success", text) {
  if (typeof window === "undefined") {
    return;
  }

  window.dispatchEvent(
    new CustomEvent(EVENT, {
      detail: { tone, text: text || (tone === "success" ? SAVED_TEXT : FAILED_TEXT) }
    })
  );
}

// The form submit that a server-action request belongs to.
let lastSubmit = null;
let fetchPatched = false;

function patchFetch() {
  if (fetchPatched || typeof window === "undefined") {
    return;
  }

  fetchPatched = true;
  const originalFetch = window.fetch;

  window.fetch = async function adminFetch(input, init) {
    let isAction = false;

    try {
      const headers = new Headers(init?.headers || (input instanceof Request ? input.headers : undefined));
      isAction = headers.has("next-action");
    } catch {
      isAction = false;
    }

    const submit = isAction && lastSubmit && Date.now() - lastSubmit.at < SUBMIT_WINDOW_MS ? lastSubmit : null;

    if (submit) {
      lastSubmit = null;
    }

    const track = Boolean(submit && !submit.optOut);

    try {
      const response = await originalFetch.apply(this, arguments);

      if (track) {
        const redirect = response.headers.get("x-action-redirect") || "";

        // Signed out (or signed in): not a save.
        if (!redirect.includes("/admin/login")) {
          showAdminToast(response.status < 400 ? "success" : "error");
        }
      }

      return response;
    } catch (error) {
      if (track) {
        showAdminToast("error");
      }

      throw error;
    }
  };
}

function isCancelControl(element) {
  const control = element?.closest?.("a, button");

  if (!control || !control.closest("[data-admin-root]")) {
    return false;
  }

  if (control.hasAttribute("data-admin-cancel")) {
    return true;
  }

  // A submit button named Cancel runs an action (e.g. cancel an order).
  if (control.tagName === "BUTTON" && control.type === "submit") {
    return false;
  }

  const label = (control.textContent || "").replace(/\s+/g, " ").trim().toLowerCase();
  return label === "cancel" || label === "discard changes" || label === "discard";
}

function readStored() {
  try {
    const stored = JSON.parse(window.sessionStorage.getItem(STORE_KEY) || "null");
    return stored && Date.now() - stored.at < 8000 ? stored : null;
  } catch {
    return null;
  }
}

function writeStored(value) {
  try {
    if (value) {
      window.sessionStorage.setItem(STORE_KEY, JSON.stringify(value));
    } else {
      window.sessionStorage.removeItem(STORE_KEY);
    }
  } catch {
    // Private mode etc.: the message just won't survive a full reload.
  }
}

export default function AdminToaster({ children }) {
  const pathname = usePathname() || "";
  const [toast, setToast] = useState(null);
  const timerRef = useRef(null);

  const hide = useCallback(() => {
    window.clearTimeout(timerRef.current);
    setToast(null);
    writeStored(null);
  }, []);

  const show = useCallback(
    ({ tone, text }) => {
      const next = { tone, text, at: Date.now() };

      // Kept for a few seconds so it survives a full page reload.
      writeStored(next);
      setToast(next);
      window.clearTimeout(timerRef.current);
      timerRef.current = window.setTimeout(hide, SHOW_MS);
    },
    [hide]
  );

  useEffect(() => {
    patchFetch();

    const stored = readStored();

    if (stored) {
      show(stored);
    }

    function onToast(event) {
      show(event.detail);
    }

    function onSubmit(event) {
      const form = event.target;

      if (!(form instanceof HTMLFormElement) || !form.closest("[data-admin-root]")) {
        return;
      }

      const mode = form.closest("[data-admin-toast]")?.getAttribute("data-admin-toast");

      lastSubmit = {
        at: Date.now(),
        optOut: mode === "off" || mode === "manual" || window.location.pathname.startsWith("/admin/login")
      };
    }

    function onClick(event) {
      if (isCancelControl(event.target)) {
        show({ tone: "error", text: NOT_SAVED_TEXT });
      }
    }

    window.addEventListener(EVENT, onToast);
    document.addEventListener("submit", onSubmit, true);
    document.addEventListener("click", onClick, true);

    return () => {
      window.removeEventListener(EVENT, onToast);
      document.removeEventListener("submit", onSubmit, true);
      document.removeEventListener("click", onClick, true);
      window.clearTimeout(timerRef.current);
    };
  }, [show]);

  const success = toast?.tone === "success";
  const Icon = success ? CircleCheck : CircleAlert;

  return (
    <div data-admin-root="" className="contents">
      {children}

      {toast && !pathname.startsWith("/admin/login") ? (
        <div
          key={toast.at}
          role={success ? "status" : "alert"}
          aria-live={success ? "polite" : "assertive"}
          data-admin-toast-message={toast.tone}
          className={`fixed inset-x-4 top-4 z-[100] mx-auto flex max-w-sm items-center gap-3 rounded-2xl px-4 py-3 text-sm font-semibold text-white shadow-lg sm:top-6 ${
            success ? "bg-emerald-600" : "bg-red-600"
          }`}
        >
          <Icon size={20} aria-hidden="true" className="shrink-0" />
          <span className="flex-1">{toast.text}</span>
          <button
            type="button"
            onClick={hide}
            aria-label="Close message"
            className="-mr-1 grid h-8 w-8 shrink-0 place-items-center rounded-full transition hover:bg-white/15"
          >
            <X size={16} aria-hidden="true" />
          </button>
        </div>
      ) : null}
    </div>
  );
}
