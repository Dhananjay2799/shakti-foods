import Link from "next/link";
import {
  ArrowUpRight,
  ChevronDown,
  ChevronRight,
  Trash2
} from "lucide-react";

/*
 * Shared building blocks for the admin product pages (Add product, Edit
 * product, Images, Certifications). Plain components with no hooks, so
 * both server and client components can use them.
 */

export const INPUT =
  "h-11 w-full rounded-xl border border-black/10 bg-[#faf8f4] px-3.5 text-sm text-black outline-none transition placeholder:text-black/35 focus:border-black focus:bg-white disabled:cursor-not-allowed disabled:bg-black/[0.04] disabled:text-black/55";

export const TEXTAREA =
  "w-full resize-y rounded-xl border border-black/10 bg-[#faf8f4] px-3.5 py-3 text-sm leading-6 text-black outline-none transition placeholder:text-black/35 focus:border-black focus:bg-white";

export const READ_ONLY_INPUT =
  "h-11 w-full cursor-not-allowed rounded-xl border border-black/[0.06] bg-black/[0.04] px-3.5 text-sm text-black/50 outline-none";

export const BUTTON_PRIMARY =
  "inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-black px-4 text-sm font-bold text-white transition hover:bg-black/80 disabled:cursor-not-allowed disabled:opacity-60";

export const BUTTON_SECONDARY =
  "inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-black/10 bg-white px-4 text-sm font-semibold text-black transition hover:bg-black/[0.03] disabled:cursor-not-allowed disabled:opacity-50";

export const TIER_QUANTITIES = [5, 10, 25, 50, 100];

export function centsToDollars(value) {
  if (value === null || value === undefined || value === "") {
    return "";
  }

  return (Number(value) / 100).toFixed(2);
}

export function moneyValue(value) {
  if (value === null || value === undefined || value === "") {
    return "";
  }

  const amount = Number(value);

  return Number.isFinite(amount) ? amount.toFixed(2) : "";
}

export function formatMoney(dollars) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD"
  }).format(Number(dollars || 0));
}

/** Up to three tier rows: the saved tiers first, then unused presets. */
export function buildTierRows(priceTiers = []) {
  const saved = [...priceTiers]
    .sort((a, b) => Number(a.min_quantity) - Number(b.min_quantity))
    .slice(0, 3)
    .map((tier) => ({ quantity: Number(tier.min_quantity), tier }));

  for (const quantity of [5, 10, 25]) {
    if (saved.length >= 3) {
      break;
    }

    if (!saved.some((row) => row.quantity === quantity)) {
      saved.push({ quantity, tier: null });
    }
  }

  return saved;
}

const BADGE_TONES = {
  neutral: "bg-black/[0.05] text-black/60 ring-black/10",
  green: "bg-emerald-50 text-emerald-700 ring-emerald-600/20",
  amber: "bg-amber-50 text-amber-800 ring-amber-600/25",
  red: "bg-red-50 text-red-700 ring-red-600/20",
  blue: "bg-sky-50 text-sky-700 ring-sky-600/20"
};

export function Badge({ tone = "neutral", children, className = "" }) {
  return (
    <span
      className={`inline-flex items-center gap-1 whitespace-nowrap rounded-md px-2 py-0.5 text-xs font-semibold ring-1 ring-inset ${BADGE_TONES[tone] || BADGE_TONES.neutral} ${className}`}
    >
      {children}
    </span>
  );
}

/** Page title row: heading, a line under it, and buttons on the right. */
export function PageHeader({ title, subtitle, children, actions }) {
  return (
    <header className="flex flex-wrap items-start justify-between gap-4">
      <div className="min-w-0">
        <h1 className="font-display text-4xl font-bold text-black">{title}</h1>
        {subtitle ? (
          <p className="mt-1.5 truncate text-sm text-black/60">{subtitle}</p>
        ) : null}
        {children}
      </div>

      {actions ? (
        <div className="flex flex-wrap items-center gap-2">{actions}</div>
      ) : null}
    </header>
  );
}

/** A white card with an icon + title header, optional badge and footer. */
export function Panel({
  icon: Icon,
  title,
  badge,
  description,
  footer,
  after,
  className = "",
  bodyClassName = "",
  children
}) {
  return (
    <section
      className={`min-w-0 rounded-2xl border border-black/10 bg-white shadow-sm ${className}`}
    >
      <div className="flex items-center justify-between gap-3 px-5 pt-5">
        <div className="flex min-w-0 items-center gap-3">
          {Icon ? (
            <span
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#f1eadf] text-black/75"
              aria-hidden="true"
            >
              <Icon size={18} />
            </span>
          ) : null}

          <div className="min-w-0">
            <h2 className="text-base font-bold text-black">{title}</h2>
            {description ? (
              <p className="text-sm text-black/55">{description}</p>
            ) : null}
          </div>
        </div>

        {badge}
      </div>

      {children ? <div className={`p-5 ${bodyClassName}`}>{children}</div> : null}

      {after}

      {footer ? (
        <div className="flex items-center justify-between gap-3 border-t border-black/[0.07] px-5 py-3.5 text-sm">
          {footer}
        </div>
      ) : null}
    </section>
  );
}

export function FieldLabel({ htmlFor, children, required, optional }) {
  return (
    <label htmlFor={htmlFor} className="text-sm font-semibold text-black">
      {children}
      {required ? (
        <span className="ml-0.5 text-red-600" aria-hidden="true">
          *
        </span>
      ) : null}
      {optional ? (
        <span className="ml-1.5 text-xs font-medium text-black/40">
          Optional
        </span>
      ) : null}
    </label>
  );
}

export function Help({ children, id }) {
  return (
    <p id={id} className="text-xs leading-5 text-black/50">
      {children}
    </p>
  );
}

function HelpRow({ help, helpId, counter, name }) {
  if (!help && !counter) {
    return null;
  }

  return (
    <div className="flex items-start justify-between gap-3">
      {help ? <Help id={helpId}>{help}</Help> : <span />}
      {counter ? (
        <span
          data-count={name}
          className="shrink-0 text-xs tabular-nums text-black/40"
          aria-hidden="true"
        />
      ) : null}
    </div>
  );
}

export function Field({
  label,
  name,
  id,
  required = false,
  optional = false,
  help,
  counter = false,
  prefix,
  className = "",
  inputClassName = "",
  ...inputProps
}) {
  const fieldId = id || `field-${name}`;
  const helpId = help ? `${fieldId}-help` : undefined;

  return (
    <div className={`grid min-w-0 content-start gap-1.5 ${className}`}>
      <FieldLabel htmlFor={fieldId} required={required} optional={optional}>
        {label}
      </FieldLabel>

      {prefix ? (
        // The box is drawn by the wrapper so the prefix ($, /products/)
        // sits right before the typed text at any width.
        <div className="flex h-11 min-w-0 items-center rounded-xl border border-black/10 bg-[#faf8f4] transition focus-within:border-black focus-within:bg-white">
          <span
            className="select-none whitespace-nowrap pl-3.5 pr-1 text-sm font-semibold text-black/45"
            aria-hidden="true"
          >
            {prefix}
          </span>
          <input
            id={fieldId}
            name={name}
            required={required}
            aria-describedby={helpId}
            className={`h-full w-full min-w-0 rounded-r-xl bg-transparent pr-3.5 text-sm text-black outline-none placeholder:text-black/35 ${inputClassName}`}
            {...inputProps}
          />
        </div>
      ) : (
        <input
          id={fieldId}
          name={name}
          required={required}
          aria-describedby={helpId}
          className={`${inputProps.readOnly ? READ_ONLY_INPUT : INPUT} ${inputClassName}`}
          {...inputProps}
        />
      )}

      <HelpRow help={help} helpId={helpId} counter={counter} name={name} />
    </div>
  );
}

export function TextAreaField({
  label,
  name,
  help,
  counter = false,
  optional = false,
  className = "",
  ...props
}) {
  const id = `field-${name}`;
  const helpId = help ? `${id}-help` : undefined;

  return (
    <div className={`grid min-w-0 gap-1.5 ${className}`}>
      <FieldLabel htmlFor={id} optional={optional}>
        {label}
      </FieldLabel>

      <textarea
        id={id}
        name={name}
        aria-describedby={helpId}
        className={TEXTAREA}
        {...props}
      />

      <HelpRow help={help} helpId={helpId} counter={counter} name={name} />
    </div>
  );
}

/** A native select with the admin's chevron. */
export function SelectField({
  label,
  name,
  required = false,
  optional = false,
  help,
  className = "",
  children,
  ...selectProps
}) {
  const id = `field-${name}`;
  const helpId = help ? `${id}-help` : undefined;

  return (
    <div className={`grid min-w-0 content-start gap-1.5 ${className}`}>
      {label ? (
        <FieldLabel htmlFor={id} required={required} optional={optional}>
          {label}
        </FieldLabel>
      ) : null}

      <div className="relative">
        <select
          id={id}
          name={name}
          required={required}
          aria-describedby={helpId}
          className={`${INPUT} appearance-none pr-10 font-medium`}
          {...selectProps}
        >
          {children}
        </select>
        <ChevronDown
          size={16}
          aria-hidden="true"
          className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-black/45"
        />
      </div>

      {help ? <Help id={helpId}>{help}</Help> : null}
    </div>
  );
}

/** A checkbox in its own box, with an optional line of description. */
export function Check({ name, title, description, defaultChecked = false, className = "" }) {
  return (
    <label
      className={`flex cursor-pointer gap-3 rounded-xl border border-black/10 px-3.5 py-3 transition hover:bg-[#faf7f2] has-[:checked]:border-black/25 has-[:checked]:bg-[#faf7f2] ${description ? "items-start" : "items-center"} ${className}`}
    >
      <input
        type="checkbox"
        name={name}
        defaultChecked={defaultChecked}
        className={`h-4 w-4 shrink-0 accent-black ${description ? "mt-0.5" : ""}`}
      />
      <span className="min-w-0">
        <span className="block text-sm font-semibold text-black">{title}</span>
        {description ? (
          <span className="mt-0.5 block text-xs leading-5 text-black/50">
            {description}
          </span>
        ) : null}
      </span>
    </label>
  );
}

/** One row of a definition-style list: label on the left, value on the right. */
export function StatRow({ label, children }) {
  return (
    <div className="flex items-center justify-between gap-3 py-3 text-sm">
      <span className="text-black/55">{label}</span>
      <span className="text-right font-semibold text-black">{children}</span>
    </div>
  );
}

/**
 * Links shared by Edit product, Images and Certifications. `current`
 * ("edit" | "images" | "certifications") is shown as the page you are on.
 */
export function ProductActionsCard({ links, storefrontName, current, className = "" }) {
  const rows = [
    { key: "edit", label: "Edit product", href: links.edit },
    { key: "images", label: "Manage images", href: links.images },
    { key: "certifications", label: "Certifications", href: links.certifications }
  ].filter((row) => row.href && row.key !== current);

  return (
    <section
      className={`min-w-0 rounded-2xl border border-black/10 bg-white shadow-sm ${className}`}
    >
      <h2 className="px-5 pt-5 text-base font-bold text-black">Product actions</h2>

      <div className="grid divide-y divide-black/[0.07] px-5 pb-2 pt-2">
        {rows.map((row) => (
          <Link
            key={row.key}
            href={row.href}
            className="group flex items-center justify-between gap-3 py-3 text-sm font-semibold text-black"
          >
            {row.label}
            <ChevronRight
              size={16}
              aria-hidden="true"
              className="text-black/40 transition group-hover:translate-x-0.5 group-hover:text-black"
            />
          </Link>
        ))}

        {links.storefront ? (
          <a
            href={links.storefront}
            target="_blank"
            rel="noreferrer"
            className="group flex items-center justify-between gap-3 py-3 text-sm font-semibold text-black"
          >
            View on {storefrontName}
            <ArrowUpRight
              size={16}
              aria-hidden="true"
              className="text-black/40 transition group-hover:text-black"
            />
          </a>
        ) : null}

        {links.delete ? (
          <Link
            href={links.delete}
            className="group flex items-center justify-between gap-3 py-3 text-sm font-semibold text-red-700"
          >
            Delete product
            <Trash2 size={16} aria-hidden="true" className="text-red-600/70 group-hover:text-red-700" />
          </Link>
        ) : null}
      </div>
    </section>
  );
}

/** Green confirmation line shown after a save. */
export function SuccessNotice({ children }) {
  return (
    <div
      role="status"
      className="rounded-xl border border-emerald-600/15 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-800"
    >
      {children}
    </div>
  );
}
