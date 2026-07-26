import { notFound } from "next/navigation";
import {
  Activity,
  Building2,
  CircleUserRound,
  MapPin,
  ShieldCheck,
  Trash2
} from "lucide-react";
import { createSupabaseAdmin } from "@/lib/supabase-admin";

export const dynamic = "force-dynamic";

function formatDateTime(value) {
  if (!value) {
    return "Unknown time";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Unknown time";
  }

  return new Intl.DateTimeFormat(
    "en-US",
    {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit"
    }
  ).format(date);
}

function formatActivityType(type) {
  return String(type || "activity")
    .replaceAll("_", " ")
    .replace(/\b\w/g, (letter) =>
      letter.toUpperCase()
    );
}

function getActivityIcon(type) {
  if (
    type === "address_deleted"
  ) {
    return Trash2;
  }

  if (
    String(type).startsWith(
      "address_"
    )
  ) {
    return MapPin;
  }

  if (
    type === "customer_updated"
  ) {
    return CircleUserRound;
  }

  if (
    type === "wholesale_updated"
  ) {
    return Building2;
  }

  return Activity;
}

function getActivityStyles(type) {
  if (
    type === "address_deleted"
  ) {
    return "bg-red-100 text-red-800";
  }

  if (
    type === "address_default_changed"
  ) {
    return "bg-blue-100 text-blue-800";
  }

  if (
    type === "address_deactivated"
  ) {
    return "bg-amber-100 text-amber-800";
  }

  if (
    type === "address_activated" ||
    type === "address_created"
  ) {
    return "bg-green-100 text-green-800";
  }

  return "bg-[#f1eadf] text-black";
}

function ChangedFields({ metadata }) {
  const changes =
    metadata &&
    typeof metadata === "object"
      ? metadata.changes
      : null;

  if (
    !changes ||
    typeof changes !== "object"
  ) {
    return null;
  }

  const entries =
    Object.entries(changes);

  if (entries.length === 0) {
    return null;
  }

  return (
    <div className="mt-4 rounded-2xl bg-[#faf8f4] p-4">
      <p className="text-xs font-bold uppercase tracking-[0.1em] text-black/40">
        Changes
      </p>

      <div className="mt-3 grid gap-3">
        {entries.map(
          ([field, change]) => (
            <div
              key={field}
              className="rounded-xl bg-white p-3"
            >
              <p className="text-xs font-bold capitalize text-black">
                {field.replaceAll("_", " ")}
              </p>

              <p className="mt-1 break-words text-xs leading-5 text-black/50">
                <span className="font-semibold">
                  From:
                </span>{" "}
                {JSON.stringify(
                  change?.from ?? null
                )}
              </p>

              <p className="mt-1 break-words text-xs leading-5 text-black/50">
                <span className="font-semibold">
                  To:
                </span>{" "}
                {JSON.stringify(
                  change?.to ?? null
                )}
              </p>
            </div>
          )
        )}
      </div>
    </div>
  );
}

export default async function CustomerActivityPage({
  params
}) {
  const resolvedParams =
    await Promise.resolve(params || {});

  const customerId = String(
    resolvedParams.customerId || ""
  ).trim();

  if (!customerId) {
    notFound();
  }

  const supabase = createSupabaseAdmin();

  const [
    customerResult,
    activityResult
  ] = await Promise.all([
    supabase
      .from("customers")
      .select("id, full_name, email")
      .eq("id", customerId)
      .maybeSingle(),

    supabase
      .from("customer_activity_logs")
      .select("*")
      .eq("customer_id", customerId)
      .order("created_at", {
        ascending: false
      })
      .limit(100)
  ]);

  if (
    customerResult.error ||
    !customerResult.data
  ) {
    console.error(
      "Unable to load customer activity:",
      customerResult.error
    );

    notFound();
  }

  if (activityResult.error) {
    console.error(
      "Unable to load activity logs:",
      activityResult.error
    );
  }

  const activities =
    activityResult.data || [];

  return (
    <div className="grid gap-5">
      <div className="rounded-[1.75rem] border border-black/5 bg-white p-5 shadow-sm md:p-6">
        <div className="flex items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#f1eadf] text-black">
            <Activity size={21} />
          </span>

          <div>
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-black/40">
              Customer Settings
            </p>

            <h2 className="mt-1 font-display text-3xl font-bold text-black">
              Activity History
            </h2>

            <p className="mt-2 text-sm leading-6 text-black/50">
              Review customer changes and administrative actions.
            </p>
          </div>
        </div>

        <div className="mt-5 rounded-2xl bg-[#faf8f4] p-4">
          <div className="flex items-center gap-3">
            <ShieldCheck
              size={18}
              className="text-black"
            />

            <p className="text-sm leading-6 text-black/60">
              Showing the latest{" "}
              <strong className="text-black">
                {activities.length}
              </strong>{" "}
              activity records.
            </p>
          </div>
        </div>
      </div>

      {activities.length === 0 ? (
        <section className="rounded-[1.75rem] border border-black/5 bg-white px-6 py-16 text-center shadow-sm">
          <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-[#f1eadf] text-black">
            <Activity size={28} />
          </span>

          <h3 className="mt-5 text-xl font-bold text-black">
            No activity recorded
          </h3>

          <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-black/50">
            Future customer and address changes will appear here.
          </p>
        </section>
      ) : (
        <div className="grid gap-4">
          {activities.map((activity) => {
            const Icon =
              getActivityIcon(
                activity.activity_type
              );

            return (
              <article
                key={activity.id}
                className="rounded-[1.75rem] border border-black/5 bg-white p-5 shadow-sm"
              >
                <div className="flex items-start gap-4">
                  <span
                    className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ${getActivityStyles(
                      activity.activity_type
                    )}`}
                  >
                    <Icon size={20} />
                  </span>

                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <h3 className="font-bold text-black">
                          {activity.title}
                        </h3>

                        <p className="mt-1 text-xs font-bold uppercase tracking-[0.1em] text-black/40">
                          {formatActivityType(
                            activity.activity_type
                          )}
                        </p>
                      </div>

                      <time className="text-xs font-semibold text-black/40">
                        {formatDateTime(
                          activity.created_at
                        )}
                      </time>
                    </div>

                    {activity.description ? (
                      <p className="mt-3 text-sm leading-6 text-black/60">
                        {activity.description}
                      </p>
                    ) : null}

                    <div className="mt-4 flex flex-wrap gap-2">
                      {activity.performed_by_email ? (
                        <span className="rounded-full bg-[#f1eadf] px-3 py-1 text-xs font-bold text-black">
                          By{" "}
                          {
                            activity.performed_by_email
                          }
                        </span>
                      ) : null}

                      {activity.entity_type ? (
                        <span className="rounded-full bg-black/5 px-3 py-1 text-xs font-bold capitalize text-black/60">
                          {activity.entity_type.replaceAll(
                            "_",
                            " "
                          )}
                        </span>
                      ) : null}
                    </div>

                    <ChangedFields
                      metadata={
                        activity.metadata
                      }
                    />
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}