"use client";

import { useEffect } from "react";
import { useFormStatus } from "react-dom";

// Same rule the server uses for product IDs and URL slugs.
function toIdentifier(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/**
 * Small helpers for the product form, attached to <form id={formId}>:
 * - Add product: fills Product ID and URL slug from the title until the
 *   admin types in those boxes.
 * - Opens a collapsed section when a field inside it fails validation.
 * - Live character counts for fields with a data-count target.
 */
export function ProductFormHelpers({ formId, suggestIdentifiers = false }) {
  useEffect(() => {
    const form = document.getElementById(formId);

    if (!form) {
      return undefined;
    }

    const cleanups = [];
    const listen = (target, type, handler, options) => {
      target.addEventListener(type, handler, options);
      cleanups.push(() => target.removeEventListener(type, handler, options));
    };

    if (suggestIdentifiers) {
      const title = form.elements.namedItem("title");
      const linked = ["productId", "slug"]
        .map((name) => form.elements.namedItem(name))
        .filter(Boolean);

      linked.forEach((field) => {
        field.dataset.auto = field.value ? "false" : "true";
        listen(field, "input", () => {
          field.dataset.auto = field.value ? "false" : "true";
        });
      });

      if (title) {
        listen(title, "input", () => {
          const suggestion = toIdentifier(title.value);

          linked.forEach((field) => {
            if (field.dataset.auto === "true") {
              field.value = suggestion;
            }
          });
        });
      }
    }

    listen(
      form,
      "invalid",
      (event) => {
        const section = event.target.closest?.("details");

        if (section && !section.open) {
          section.open = true;
        }
      },
      true
    );

    form.querySelectorAll("[data-count]").forEach((counter) => {
      const field = form.elements.namedItem(counter.dataset.count);

      if (!field) {
        return;
      }

      const update = () => {
        counter.textContent = `${field.value.length} characters`;
      };

      update();
      listen(field, "input", update);
    });

    return () => cleanups.forEach((cleanup) => cleanup());
  }, [formId, suggestIdentifiers]);

  return null;
}

export function SubmitButton({ children, pendingLabel, className = "" }) {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      aria-disabled={pending}
      className={[
        "inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-black px-4 text-sm font-bold text-white transition hover:bg-black/80 disabled:cursor-wait disabled:opacity-70",
        className
      ].join(" ")}
    >
      {pending ? pendingLabel : children}
    </button>
  );
}

/**
 * A submit button that asks "Are you sure?" first, for actions that
 * cannot be undone (deleting an image, removing a certification).
 */
export function ConfirmSubmitButton({ message, children, pendingLabel, className = "", ...props }) {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      onClick={(event) => {
        if (!window.confirm(message)) {
          event.preventDefault();
        }
      }}
      className={className}
      {...props}
    >
      {pending && pendingLabel ? pendingLabel : children}
    </button>
  );
}
