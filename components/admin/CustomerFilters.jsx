"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { ChevronDown, LoaderCircle, Search, X } from "lucide-react";

const TYPE_OPTIONS = [
  ["all", "All types"],
  ["retail", "Retail"],
  ["wholesale", "Wholesale"],
  ["business", "Business"]
];

const STATUS_OPTIONS = [
  ["all", "All statuses"],
  ["active", "Active"],
  ["inactive", "Inactive"],
  ["blocked", "Blocked"]
];

const SORT_OPTIONS = [
  ["value", "Highest value"],
  ["recent", "Most recent order"],
  ["orders", "Most orders"],
  ["name", "Name (A–Z)"],
  ["oldest", "Oldest customer"]
];

function Select({ label, name, value, options, onChange }) {
  return (
    <label className="relative block min-w-0">
      <span className="sr-only">{label}</span>

      <select
        name={name}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-10 w-full min-w-0 appearance-none rounded-xl border border-black/10 bg-white pl-3 pr-9 text-sm font-semibold text-black outline-none transition focus:border-black focus:ring-2 focus:ring-black/10"
      >
        {options.map(([optionValue, optionLabel]) => (
          <option key={optionValue} value={optionValue}>
            {optionLabel}
          </option>
        ))}
      </select>

      <ChevronDown
        size={16}
        className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-black/45"
        aria-hidden="true"
      />
    </label>
  );
}

/*
 * Search box and filters for the admin customer list. Changes apply right
 * away (search after a short pause) by updating the URL, so the results are
 * shareable and the list stays server-rendered. Enter also submits.
 */
export default function CustomerFilters({
  query = "",
  customerType = "all",
  status = "all",
  sort = "value"
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [pending, startTransition] = useTransition();

  const [values, setValues] = useState({
    q: query,
    type: customerType,
    status,
    sort
  });

  const lastApplied = useRef(query.trim());

  // Follow the URL (Back/Forward, Clear filters).
  useEffect(() => {
    lastApplied.current = query.trim();
    setValues({ q: query, type: customerType, status, sort });
  }, [query, customerType, status, sort]);

  function navigate(next) {
    const params = new URLSearchParams();

    if (next.q.trim()) params.set("q", next.q.trim());
    if (next.type !== "all") params.set("type", next.type);
    if (next.status !== "all") params.set("status", next.status);
    if (next.sort !== "value") params.set("sort", next.sort);

    lastApplied.current = next.q.trim();
    const qs = params.toString();

    startTransition(() => {
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    });
  }

  function update(field, value) {
    const next = { ...values, [field]: value };
    setValues(next);

    if (field !== "q") {
      navigate(next);
    }
  }

  // Search a moment after typing stops.
  useEffect(() => {
    if (values.q.trim() === lastApplied.current) {
      return undefined;
    }

    const timer = setTimeout(() => navigate(values), 350);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [values.q]);

  const filtered =
    Boolean(query) || customerType !== "all" || status !== "all" || sort !== "value";

  return (
    <form
      method="get"
      action={pathname}
      onSubmit={(event) => {
        event.preventDefault();
        navigate(values);
      }}
      className="grid gap-3"
      role="search"
      aria-label="Filter customers"
    >
      <label className="relative block">
        <span className="sr-only">Search customers</span>

        {pending ? (
          <LoaderCircle
            size={17}
            className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 animate-spin text-black/40"
            aria-hidden="true"
          />
        ) : (
          <Search
            size={17}
            className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-black/40"
            aria-hidden="true"
          />
        )}

        <input
          type="search"
          name="q"
          value={values.q}
          onChange={(event) => update("q", event.target.value)}
          placeholder="Search name, email, phone, or company…"
          className="h-11 w-full rounded-xl border border-black/10 bg-white pl-10 pr-4 text-sm text-black outline-none transition placeholder:text-black/40 focus:border-black focus:ring-2 focus:ring-black/10"
        />
      </label>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <Select label="Customer type" name="type" value={values.type} options={TYPE_OPTIONS} onChange={(v) => update("type", v)} />
        <Select label="Customer status" name="status" value={values.status} options={STATUS_OPTIONS} onChange={(v) => update("status", v)} />
        <Select label="Sort customers" name="sort" value={values.sort} options={SORT_OPTIONS} onChange={(v) => update("sort", v)} />
      </div>

      {filtered ? (
        <button
          type="button"
          onClick={() => navigate({ q: "", type: "all", status: "all", sort: "value" })}
          className="inline-flex w-fit items-center gap-1.5 text-sm font-semibold text-black/60 transition hover:text-black"
        >
          <X size={14} aria-hidden="true" />
          Clear filters
        </button>
      ) : null}

      <button type="submit" className="sr-only">
        Apply filters
      </button>
    </form>
  );
}
