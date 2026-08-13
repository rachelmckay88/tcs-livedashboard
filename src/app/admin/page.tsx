import Link from "next/link";
import { ClockArrowUp, ExternalLink, History } from "lucide-react";
import { AdminLogin } from "@/components/admin/AdminLogin";
import {
  DashboardAdminForm,
  type AdminFormValues,
} from "@/components/admin/DashboardAdminForm";
import { LogoutButton } from "@/components/admin/LogoutButton";
import { isAdminAuthenticated } from "@/lib/auth";
import { getDashboardRecordByDate } from "@/lib/dashboard/service";
import { addDaysToDateKey, formatFullDate, isValidDateKey, todaySydneyDateKey } from "@/lib/dates";
import { OVERALL_STATUSES, type OverallStatus } from "@/lib/dashboard/types";

export const dynamic = "force-dynamic";

/** Blank -> "" so inputs stay controlled and empty means "not entered". */
const asText = (value: string | null) => value ?? "";
const asNumberText = (value: number | null) => (value === null ? "" : String(value));

export default async function AdminPage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string }>;
}) {
  if (!(await isAdminAuthenticated())) {
    return <AdminLogin />;
  }

  const today = todaySydneyDateKey();
  // /history can deep-link a past day for editing: /admin?date=2026-08-11
  const requested = (await searchParams).date;
  const dateKey = requested && isValidDateKey(requested) ? requested : today;
  const isToday = dateKey === today;

  const record = await getDashboardRecordByDate(dateKey);

  // Yesterday's record seeds sensible defaults for a brand-new day, so the
  // admin usually only has to change the numbers, not re-enter everything.
  const previous = record ? null : await getDashboardRecordByDate(addDaysToDateKey(dateKey, -1));

  const status = (
    record && (OVERALL_STATUSES as readonly string[]).includes(record.overallStatus)
      ? record.overallStatus
      : "ON_TRACK"
  ) as OverallStatus;

  // Yesterday's roster is the usual starting point — most days the same people
  // are in. Always leave one blank row so there is somewhere to type.
  const staffSource = record?.staff.length ? record.staff : (previous?.staff ?? []);
  const staff = staffSource.map((member) => ({ name: member.name, role: member.role }));
  if (staff.length === 0) staff.push({ name: "", role: "" });

  const initialValues: AdminFormValues = {
    dashboardDate: dateKey,
    overallStatus: status,
    updatedBy: asText(record?.updatedBy ?? previous?.updatedBy ?? null),
    staff,

    // Batch dates default to "the day before" — the common warehouse pattern —
    // but stay fully editable.
    personalisingOrderDate: asText(
      record?.personalisingOrderDate ?? (previous ? addDaysToDateKey(dateKey, -1) : null),
    ),
    personalisedOrderCount: asNumberText(record?.personalisedOrderCount ?? null),
    personalisedItemCount: asNumberText(record?.personalisedItemCount ?? null),
    nonPersonalisedOrderCount: asNumberText(record?.nonPersonalisedOrderCount ?? null),

    shippingOrderDate: asText(
      record?.shippingOrderDate ?? (previous ? addDaysToDateKey(dateKey, -2) : null),
    ),
    shippingOrderCount: asNumberText(record?.shippingOrderCount ?? null),
    shippingItemCount: asNumberText(record?.shippingItemCount ?? null),
    // Cut-off rarely changes day to day, so carry it forward.
    courierCutoff: asText(record?.courierCutoff ?? previous?.courierCutoff ?? null),

    expressCount: asNumberText(record?.expressCount ?? null),
    priorityCount: asNumberText(record?.priorityCount ?? null),
    redoCount: asNumberText(record?.redoCount ?? null),
    onHoldCount: asNumberText(record?.onHoldCount ?? null),

    dailyMessage: asText(record?.dailyMessage ?? null),
    secondaryMessage: asText(record?.secondaryMessage ?? null),
  };

  return (
    <div className="tcs-stage min-h-screen">
      <header className="border-b border-rule">
        <div className="mx-auto flex max-w-4xl flex-wrap items-center justify-between gap-4 px-5 py-6 sm:px-6">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-gold-deep">
              THE CELEBRATION SOCIETY
            </p>
            <h1 className="mt-1.5 text-2xl font-bold tracking-tight text-ink sm:text-3xl">
              {isToday ? "Morning update" : "Edit past day"}
            </h1>
            <p className="mt-1.5 text-ink-muted">{formatFullDate(dateKey)}</p>
          </div>

          <nav className="flex flex-wrap items-center gap-2">
            <Link
              href="/admin/check-in"
              className="inline-flex items-center gap-2 rounded-xl border border-gold-deep bg-gold-wash px-4 py-2.5 text-sm font-semibold text-ink transition hover:bg-gold-soft"
            >
              <ClockArrowUp className="size-4" aria-hidden="true" />
              Check-in
            </Link>
            <Link
              href="/"
              className="inline-flex items-center gap-2 rounded-xl border border-rule px-4 py-2.5 text-sm font-semibold text-ink-muted transition hover:border-gold hover:text-ink"
            >
              <ExternalLink className="size-4" aria-hidden="true" />
              Display
            </Link>
            <Link
              href="/history"
              className="inline-flex items-center gap-2 rounded-xl border border-rule px-4 py-2.5 text-sm font-semibold text-ink-muted transition hover:border-gold/50 hover:text-ink"
            >
              <History className="size-4" aria-hidden="true" />
              History
            </Link>
            <LogoutButton />
          </nav>
        </div>
      </header>

      {!isToday ? (
        <div className="mx-auto max-w-4xl px-5 pt-6 sm:px-6">
          <p className="rounded-2xl border border-busy/50 bg-busy-wash px-5 py-4 text-ink-soft">
            You are editing <strong>{formatFullDate(dateKey)}</strong>, not today.{" "}
            <Link href="/admin" className="font-semibold text-gold-deep underline underline-offset-4">
              Switch to today
            </Link>
          </p>
        </div>
      ) : null}

      <DashboardAdminForm initialValues={initialValues} isToday={isToday} />
    </div>
  );
}
