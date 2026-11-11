"use client";

import Link from "next/link";
import { useEffect, useId, useRef, useState } from "react";
import { useFormStatus } from "react-dom";
import {
  Archive,
  ArchiveRestore,
  ExternalLink,
  MoreHorizontal,
  Trash2
} from "lucide-react";
import {
  archiveProduct,
  restoreProduct
} from "@/app/admin/products/product-actions";

const ITEM =
  "flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm font-semibold transition";

function SubmitItem({ icon: Icon, label, pendingLabel }) {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      role="menuitem"
      disabled={pending}
      className={`${ITEM} text-black hover:bg-black/[0.05] disabled:opacity-60`}
    >
      <Icon size={16} aria-hidden="true" className="text-black/55" />
      {pending ? pendingLabel : label}
    </button>
  );
}

/*
 * The "⋯" menu on a product row: Archive (or Restore), and Delete.
 * Archive and Restore keep the admin on the product list.
 */
export default function ProductRowMenu({
  productId,
  title,
  storefrontSlug,
  archived = false,
  openHref,
  deleteHref
}) {
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef(null);
  const buttonRef = useRef(null);
  const menuId = useId();

  useEffect(() => {
    if (!open) {
      return undefined;
    }

    function onPointerDown(event) {
      if (!wrapperRef.current?.contains(event.target)) {
        setOpen(false);
      }
    }

    function onKeyDown(event) {
      if (event.key === "Escape") {
        setOpen(false);
        buttonRef.current?.focus();
      }
    }

    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);

    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  useEffect(() => {
    if (open) {
      wrapperRef.current
        ?.querySelector('[role="menuitem"]')
        ?.focus();
    }
  }, [open]);

  function onMenuKeyDown(event) {
    if (event.key !== "ArrowDown" && event.key !== "ArrowUp") {
      return;
    }

    event.preventDefault();

    const items = [
      ...wrapperRef.current.querySelectorAll('[role="menuitem"]')
    ];
    const index = items.indexOf(document.activeElement);
    const next =
      event.key === "ArrowDown"
        ? (index + 1) % items.length
        : (index - 1 + items.length) % items.length;

    items[next]?.focus();
  }

  const hidden = (
    <>
      <input type="hidden" name="productId" value={productId} />
      <input type="hidden" name="storefrontSlug" value={storefrontSlug} />
      <input type="hidden" name="returnTo" value="list" />
    </>
  );

  return (
    <div ref={wrapperRef} className="relative">
      <button
        ref={buttonRef}
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        aria-label={`More actions for ${title}`}
        className={[
          "flex h-9 w-9 items-center justify-center rounded-lg text-black/60 transition hover:bg-black/[0.05] hover:text-black",
          open ? "bg-black/[0.05] text-black" : ""
        ].join(" ")}
      >
        <MoreHorizontal size={18} aria-hidden="true" />
      </button>

      {open ? (
        <div
          id={menuId}
          role="menu"
          aria-label={`Actions for ${title}`}
          onKeyDown={onMenuKeyDown}
          className="absolute right-0 top-full z-30 mt-1.5 w-48 rounded-xl border border-black/10 bg-white p-1.5 shadow-lg"
        >
          {archived ? (
            <>
              <form action={restoreProduct}>
                {hidden}
                <input type="hidden" name="restoreAs" value="draft" />
                <SubmitItem
                  icon={ArchiveRestore}
                  label="Restore as draft"
                  pendingLabel="Restoring…"
                />
              </form>

              <Link
                href={openHref}
                role="menuitem"
                className={`${ITEM} text-black hover:bg-black/[0.05]`}
              >
                <ExternalLink size={16} aria-hidden="true" className="text-black/55" />
                Open product
              </Link>
            </>
          ) : (
            <form action={archiveProduct}>
              {hidden}
              <SubmitItem
                icon={Archive}
                label="Archive"
                pendingLabel="Archiving…"
              />
            </form>
          )}

          <div className="my-1 h-px bg-black/[0.07]" role="none" />

          <Link
            href={deleteHref}
            role="menuitem"
            className={`${ITEM} text-red-700 hover:bg-red-50`}
          >
            <Trash2 size={16} aria-hidden="true" />
            Delete
          </Link>
        </div>
      ) : null}
    </div>
  );
}
