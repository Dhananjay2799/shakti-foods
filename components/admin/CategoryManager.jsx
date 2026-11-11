"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useId, useRef, useState } from "react";
import { useFormState } from "react-dom";
import {
  ArrowDown,
  ArrowUp,
  CheckCircle2,
  ChevronRight,
  CornerDownRight,
  Folder,
  FolderTree,
  Info,
  MoreHorizontal,
  Package,
  Plus,
  Trash2,
  TriangleAlert,
  X
} from "lucide-react";
import {
  deleteCategory,
  moveCategoryDown,
  moveCategoryUp,
  saveCategory
} from "@/app/admin/[storefront]/categories/actions";
import {
  ConfirmSubmitButton,
  SubmitButton
} from "@/components/admin/ProductFormClient";
import {
  BUTTON_PRIMARY,
  BUTTON_SECONDARY,
  Badge,
  Field,
  PageHeader,
  Panel,
  SelectField,
  TextAreaField
} from "@/components/admin/product-ui";

// Same rule the server uses for category IDs and slugs.
function toIdentifier(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function descendantIds(categories, id) {
  const ids = new Set([id]);
  let added = true;

  while (added) {
    added = false;
    for (const category of categories) {
      if (category.parentId && ids.has(category.parentId) && !ids.has(category.id)) {
        ids.add(category.id);
        added = true;
      }
    }
  }

  return ids;
}

const ARROW_BUTTON =
  "inline-flex h-8 w-8 items-center justify-center rounded-lg border border-black/10 bg-white text-black/60 transition hover:bg-black/[0.04] hover:text-black disabled:cursor-not-allowed disabled:opacity-35 disabled:hover:bg-white";

const NOTICE_STYLES = {
  success: { box: "border-emerald-600/15 bg-emerald-50 text-emerald-800", icon: CheckCircle2 },
  info: { box: "border-sky-600/15 bg-sky-50 text-sky-800", icon: Info },
  error: { box: "border-red-600/15 bg-red-50 text-red-800", icon: TriangleAlert }
};

function Notice({ tone = "success", children }) {
  const style = NOTICE_STYLES[tone] || NOTICE_STYLES.success;
  const Icon = style.icon;

  return (
    <div
      role={tone === "error" ? "alert" : "status"}
      className={`flex items-start gap-2.5 rounded-xl border px-4 py-3 text-sm font-semibold ${style.box}`}
    >
      <Icon size={18} className="mt-px shrink-0" aria-hidden="true" />
      <div>{children}</div>
    </div>
  );
}

/** A native modal dialog: Escape and a click outside close it. */
function Modal({ title, onClose, initialFocus, children, wide = false }) {
  const ref = useRef(null);
  const titleId = useId();

  useEffect(() => {
    const dialog = ref.current;

    if (dialog && !dialog.open) {
      dialog.showModal();
      if (initialFocus) {
        dialog.querySelector(initialFocus)?.focus();
      }
    }
  }, [initialFocus]);

  return (
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      onClose={onClose}
      onClick={(event) => {
        if (event.target === ref.current) {
          ref.current.close();
        }
      }}
      className={`m-auto max-h-[calc(100dvh-2rem)] w-[calc(100%-2rem)] overflow-y-auto rounded-2xl border border-black/10 bg-white p-0 text-black shadow-2xl backdrop:bg-black/40 ${
        wide ? "max-w-lg" : "max-w-md"
      }`}
    >
      <div className="flex items-center justify-between gap-3 border-b border-black/[0.07] px-5 py-4">
        <h2 id={titleId} className="text-lg font-bold text-black">
          {title}
        </h2>
        <button
          type="button"
          onClick={() => ref.current?.close()}
          aria-label="Close"
          className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-black/10 text-black/60 transition hover:bg-black/[0.04] hover:text-black"
        >
          <X size={16} aria-hidden="true" />
        </button>
      </div>

      {children}
    </dialog>
  );
}

function CategoryDialog({ storefront, categories, category, onClose, onSaved }) {
  const editing = Boolean(category);
  const [state, formAction] = useFormState(saveCategory, null);
  const formRef = useRef(null);
  const autoRef = useRef({ categoryId: !editing, slug: !editing });
  const onSavedRef = useRef(onSaved);
  onSavedRef.current = onSaved;

  // Saved: close the dialog and show the message on the page.
  useEffect(() => {
    if (state?.ok) {
      onSavedRef.current(state.message);
    }
  }, [state]);

  // Parent choices: not itself, and not one of its own subcategories.
  const blocked = editing ? descendantIds(categories, category.id) : new Set();
  const parentOptions = categories.filter((item) => !blocked.has(item.id));

  function suggestFromName(event) {
    const form = formRef.current;
    const suggestion = toIdentifier(event.target.value);

    ["categoryId", "slug"].forEach((name) => {
      if (autoRef.current[name]) {
        form.elements.namedItem(name).value = suggestion;
      }
    });
  }

  function trackManual(event) {
    autoRef.current[event.target.name] = !editing && event.target.value === "";
  }

  return (
    <Modal
      title={editing ? "Edit category" : "Add category"}
      onClose={onClose}
      initialFocus='input[name="name"]'
      wide
    >
      <form ref={formRef} action={formAction}>
        <input type="hidden" name="storefrontId" value={storefront.id} />
        <input type="hidden" name="storefrontSlug" value={storefront.slug} />
        {editing ? <input type="hidden" name="categoryRecordId" value={category.id} /> : null}

        <div className="grid gap-4 px-5 py-5">
          {state?.error ? <Notice tone="error">{state.error}</Notice> : null}

          <Field
            label="Category name"
            name="name"
            required
            defaultValue={category?.name || ""}
            placeholder="e.g. Basmati rice"
            autoComplete="off"
            onInput={editing ? undefined : suggestFromName}
          />

          <SelectField
            label="Parent category"
            name="parentCategoryId"
            defaultValue={category?.parentId || ""}
          >
            <option value="">No parent category</option>
            {parentOptions.map((item) => (
              <option key={item.id} value={item.id}>
                {`${"— ".repeat(item.depth)}${item.name}`}
              </option>
            ))}
          </SelectField>

          <div className="grid gap-1.5">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field
                label="Category ID"
                name="categoryId"
                required
                defaultValue={category?.categoryId || ""}
                placeholder="basmati-rice"
                autoComplete="off"
                spellCheck={false}
                onInput={trackManual}
              />
              <Field
                label="URL slug"
                name="slug"
                required
                defaultValue={category?.slug || ""}
                placeholder="basmati-rice"
                autoComplete="off"
                spellCheck={false}
                onInput={trackManual}
              />
            </div>
            <p className="text-xs leading-5 text-black/50">
              {editing
                ? "Changing the category ID updates its linked products."
                : "The name suggests an ID and URL slug. You can edit both."}
            </p>
          </div>

          <TextAreaField
            label="Description"
            name="description"
            rows={3}
            defaultValue={category?.description || ""}
            placeholder="Describe this category"
          />

          <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-black/10 px-3.5 py-3 transition hover:bg-[#faf7f2] has-[:checked]:bg-[#faf7f2]">
            <input
              type="checkbox"
              name="isActive"
              defaultChecked={category ? category.isActive : true}
              className="h-4 w-4 accent-black"
            />
            <span className="text-sm font-semibold text-black">Active on storefront</span>
          </label>
        </div>

        <div className="flex items-center justify-end gap-2 border-t border-black/[0.07] px-5 py-4">
          <button
            type="button"
            onClick={(event) => event.currentTarget.closest("dialog")?.close()}
            className={BUTTON_SECONDARY}
          >
            Cancel
          </button>
          <SubmitButton pendingLabel="Saving…">
            {editing ? "Save category" : "Create category"}
          </SubmitButton>
        </div>
      </form>
    </Modal>
  );
}

function ProductsDialog({ storefront, category, products, onClose }) {
  const items = products.filter((product) => product.category === category.categoryId);

  return (
    <Modal title={`Products in ${category.name}`} onClose={onClose}>
      <div className="px-5 py-2">
        {items.length === 0 ? (
          <p className="py-6 text-center text-sm text-black/55">
            No products in this category yet.
          </p>
        ) : (
          <ul className="divide-y divide-black/[0.07]">
            {items.map((product) => (
              <li key={product.id}>
                <Link
                  href={`/admin/${storefront.slug}/products/${encodeURIComponent(product.id)}/edit`}
                  className="group flex items-center justify-between gap-3 py-3"
                >
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-bold text-black group-hover:underline group-hover:underline-offset-4">
                      {product.title}
                    </span>
                    <span className="block truncate text-xs text-black/50">{product.id}</span>
                  </span>
                  <span className="flex shrink-0 items-center gap-2">
                    {product.status !== "active" ? (
                      <Badge tone={product.status === "archived" ? "amber" : "neutral"}>
                        {product.status === "archived" ? "Archived" : "Draft"}
                      </Badge>
                    ) : null}
                    <ChevronRight size={16} aria-hidden="true" className="text-black/35" />
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </Modal>
  );
}

function RowMenu({ storefront, category, onViewProducts }) {
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef(null);
  const menuId = useId();

  useEffect(() => {
    if (!open) {
      return undefined;
    }

    const onPointerDown = (event) => {
      if (!wrapperRef.current?.contains(event.target)) {
        setOpen(false);
      }
    };
    const onKeyDown = (event) => {
      if (event.key === "Escape") {
        setOpen(false);
      }
    };

    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    wrapperRef.current?.querySelector('[role="menuitem"]')?.focus();

    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  const hasProducts = category.productCount > 0;
  const confirmText = `Delete “${category.name}”?${
    category.childCount ? " Its subcategories will move to the top level." : ""
  } This cannot be undone.`;

  return (
    <div ref={wrapperRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        aria-label={`More actions for ${category.name}`}
        className={`inline-flex h-8 w-8 items-center justify-center rounded-lg border border-black/10 text-black/60 transition hover:bg-black/[0.04] hover:text-black ${
          open ? "bg-black/[0.04] text-black" : "bg-white"
        }`}
      >
        <MoreHorizontal size={16} aria-hidden="true" />
      </button>

      {open ? (
        <div
          id={menuId}
          role="menu"
          aria-label={`Actions for ${category.name}`}
          className="absolute bottom-full right-0 z-30 mb-1.5 w-52 rounded-xl border border-black/10 bg-white p-1.5 shadow-lg"
        >
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              setOpen(false);
              onViewProducts();
            }}
            className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm font-semibold text-black transition hover:bg-black/[0.05]"
          >
            <Package size={16} aria-hidden="true" className="text-black/55" />
            View products
          </button>

          <div className="my-1 h-px bg-black/[0.07]" role="none" />

          <form action={deleteCategory}>
            <input type="hidden" name="storefrontId" value={storefront.id} />
            <input type="hidden" name="storefrontSlug" value={storefront.slug} />
            <input type="hidden" name="categoryRecordId" value={category.id} />
            <ConfirmSubmitButton
              role="menuitem"
              message={confirmText}
              pendingLabel="Deleting…"
              disabled={hasProducts}
              title={hasProducts ? "Move its products to another category first" : undefined}
              className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm font-semibold text-red-700 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:text-black/35 disabled:hover:bg-transparent"
            >
              <Trash2 size={16} aria-hidden="true" />
              Delete category
            </ConfirmSubmitButton>
          </form>

          {hasProducts ? (
            <p className="px-3 pb-1.5 pt-0.5 text-xs leading-5 text-black/50">
              Move its {category.productCount} {category.productCount === 1 ? "product" : "products"} to another category first.
            </p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

function MoveForm({ action, storefront, category, disabled, label, children }) {
  return (
    <form action={action}>
      <input type="hidden" name="storefrontId" value={storefront.id} />
      <input type="hidden" name="storefrontSlug" value={storefront.slug} />
      <input type="hidden" name="categoryRecordId" value={category.id} />
      <button type="submit" disabled={disabled} aria-label={label} title={label} className={ARROW_BUTTON}>
        {children}
      </button>
    </form>
  );
}

export default function CategoryManager({
  storefront,
  categories,
  products,
  notice,
  openAdd = false
}) {
  const searchParams = useSearchParams();
  const urlKey = searchParams.toString();
  const [dialog, setDialog] = useState(openAdd ? { type: "add" } : null);
  const [flash, setFlash] = useState(null);

  // A new page message (after a move or delete) replaces a saved message.
  useEffect(() => {
    setFlash(null);
  }, [urlKey]);

  const current = dialog?.id
    ? categories.find((category) => category.id === dialog.id) || null
    : null;
  const closeDialog = () => setDialog(null);
  const shownNotice = flash ? { tone: "success", text: flash.text } : notice;

  return (
    <div className="grid grid-cols-1 gap-5">
      <PageHeader
        title="Categories"
        subtitle="Manage category hierarchy and storefront display order."
        actions={
          <>
            <Link href={`/admin/${storefront.slug}/products`} className={BUTTON_SECONDARY}>
              <Package size={16} aria-hidden="true" />
              View products
            </Link>
            <button type="button" onClick={() => setDialog({ type: "add" })} className={BUTTON_PRIMARY}>
              <Plus size={16} aria-hidden="true" />
              Add category
            </button>
          </>
        }
      />

      {shownNotice ? (
        <Notice key={flash?.at || urlKey} tone={shownNotice.tone}>
          {shownNotice.text}
        </Notice>
      ) : null}

      <Panel
        icon={FolderTree}
        title="Category order"
        description="Use the arrows to reorder categories within the same parent."
        badge={
          <Badge>
            {categories.length} {categories.length === 1 ? "category" : "categories"}
          </Badge>
        }
      >
        {categories.length === 0 ? (
          <div className="border-t border-black/[0.07] px-6 py-12 text-center">
            <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-[#f1eadf] text-black">
              <Folder size={24} aria-hidden="true" />
            </span>
            <h3 className="mt-4 text-lg font-bold text-black">No categories yet</h3>
            <p className="mx-auto mt-1.5 max-w-md text-sm text-black/55">
              Add a category, then choose it when you add or edit a product.
            </p>
            <button type="button" onClick={() => setDialog({ type: "add" })} className={`${BUTTON_PRIMARY} mt-5`}>
              <Plus size={16} aria-hidden="true" />
              Add category
            </button>
          </div>
        ) : (
          // Re-created after each page change so no menu stays open.
          <ul key={urlKey} className="divide-y divide-black/[0.07] border-t border-black/[0.07]">
            {categories.map((category) => (
              <li key={category.id} className="py-4 last:pb-0">
                <div style={{ paddingLeft: `${Math.min(category.depth, 4) * 1.75}rem` }}>
                  <div className="flex items-start gap-3">
                    <span
                      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#f1eadf] text-black/70"
                      aria-hidden="true"
                    >
                      {category.depth ? <CornerDownRight size={17} /> : <Folder size={17} />}
                    </span>

                    <div className="min-w-0 flex-1">
                      <h3 className="break-words font-bold text-black">{category.name}</h3>
                      <p className="text-xs text-black/50">
                        ID {category.categoryId}
                        {category.parentName ? ` · in ${category.parentName}` : ""}
                      </p>
                      {category.description ? (
                        <p className="mt-1 line-clamp-2 text-sm text-black/60">{category.description}</p>
                      ) : null}
                    </div>
                  </div>

                  <dl className="mt-4 grid max-w-xl grid-cols-2 gap-4">
                    <div>
                      <dt className="text-xs text-black/50">Products</dt>
                      <dd className="mt-0.5">
                        <button
                          type="button"
                          onClick={() => setDialog({ type: "products", id: category.id })}
                          className="text-sm font-bold tabular-nums text-black underline decoration-black/15 underline-offset-4 hover:decoration-black"
                          aria-label={`${category.productCount} products in ${category.name}. Show them.`}
                        >
                          {category.productCount}
                        </button>
                      </dd>
                    </div>
                    <div>
                      <dt className="text-xs text-black/50">Status</dt>
                      <dd className="mt-1">
                        {category.isActive ? (
                          <Badge tone="green">
                            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" aria-hidden="true" />
                            Active
                          </Badge>
                        ) : (
                          <Badge>
                            <span className="h-1.5 w-1.5 rounded-full bg-black/35" aria-hidden="true" />
                            Inactive
                          </Badge>
                        )}
                      </dd>
                    </div>
                  </dl>

                  <div className="mt-3 flex flex-wrap items-end justify-between gap-3">
                    <div>
                      <p className="text-xs text-black/50">Order</p>
                      <div className="mt-1 flex items-center gap-1.5">
                        <span
                          className="inline-flex h-8 min-w-8 items-center justify-center rounded-lg bg-black/[0.05] px-2 text-sm font-semibold tabular-nums text-black/70"
                          title={`Position ${category.position} of ${category.siblingCount}`}
                        >
                          {category.position}
                        </span>
                        <MoveForm
                          action={moveCategoryUp}
                          storefront={storefront}
                          category={category}
                          disabled={category.position === 1}
                          label={`Move ${category.name} up`}
                        >
                          <ArrowUp size={15} aria-hidden="true" />
                        </MoveForm>
                        <MoveForm
                          action={moveCategoryDown}
                          storefront={storefront}
                          category={category}
                          disabled={category.position === category.siblingCount}
                          label={`Move ${category.name} down`}
                        >
                          <ArrowDown size={15} aria-hidden="true" />
                        </MoveForm>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => setDialog({ type: "edit", id: category.id })}
                        className="inline-flex h-8 items-center rounded-lg px-3 text-sm font-bold text-black transition hover:bg-black/[0.05]"
                        aria-label={`Edit ${category.name}`}
                      >
                        Edit
                      </button>
                      <RowMenu
                        storefront={storefront}
                        category={category}
                        onViewProducts={() => setDialog({ type: "products", id: category.id })}
                      />
                    </div>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Panel>

      {dialog?.type === "add" ? (
        <CategoryDialog
          storefront={storefront}
          categories={categories}
          category={null}
          onClose={closeDialog}
          onSaved={(text) => {
            setFlash({ text, at: Date.now() });
            setDialog(null);
          }}
        />
      ) : null}

      {dialog?.type === "edit" && current ? (
        <CategoryDialog
          key={current.id}
          storefront={storefront}
          categories={categories}
          category={current}
          onClose={closeDialog}
          onSaved={(text) => {
            setFlash({ text, at: Date.now() });
            setDialog(null);
          }}
        />
      ) : null}

      {dialog?.type === "products" && current ? (
        <ProductsDialog
          storefront={storefront}
          category={current}
          products={products}
          onClose={closeDialog}
        />
      ) : null}
    </div>
  );
}
