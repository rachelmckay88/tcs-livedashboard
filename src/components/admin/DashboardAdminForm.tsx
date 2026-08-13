"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  CalendarDays,
  Check,
  Megaphone,
  Plus,
  Sparkles,
  TriangleAlert,
  Truck,
  Users,
  X,
} from "lucide-react";
import { saveDashboardSchema, toFieldErrors, type FieldErrors } from "@/lib/dashboard/schema";
import { OVERALL_STATUSES, STATUS_LABELS, type OverallStatus } from "@/lib/dashboard/types";
import { formatFullDate } from "@/lib/dates";

/**
 * The morning update form.
 *
 * Design goal: about 90 seconds, tab-through, no database feel. All fields are
 * plain strings in state — exactly what the inputs give us — and are handed to
 * the shared Zod schema, which does the coercion. That keeps one definition of
 * "valid" for the browser and the server.
 */
export type StaffRow = { name: string; role: string };

export type AdminFormValues = {
  dashboardDate: string;
  overallStatus: OverallStatus;
  updatedBy: string;
  staff: StaffRow[];
  personalisingOrderDate: string;
  personalisedOrderCount: string;
  personalisedItemCount: string;
  nonPersonalisedOrderCount: string;
  shippingOrderDate: string;
  shippingOrderCount: string;
  shippingItemCount: string;
  courierCutoff: string;
  expressCount: string;
  priorityCount: string;
  redoCount: string;
  onHoldCount: string;
  dailyMessage: string;
  secondaryMessage: string;
};

type SaveState =
  | { status: "idle" }
  | { status: "saving" }
  | { status: "saved"; at: string }
  | { status: "error"; message: string };

export function DashboardAdminForm({
  initialValues,
  isToday,
}: {
  initialValues: AdminFormValues;
  /** False when editing a past day from /history — changes the wording. */
  isToday: boolean;
}) {
  const [values, setValues] = useState<AdminFormValues>(initialValues);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [saveState, setSaveState] = useState<SaveState>({ status: "idle" });
  const errorSummaryRef = useRef<HTMLDivElement>(null);

  // Compared against current values to detect unsaved work.
  const [savedSnapshot, setSavedSnapshot] = useState(() => JSON.stringify(initialValues));
  const isDirty = useMemo(
    () => JSON.stringify(values) !== savedSnapshot,
    [values, savedSnapshot],
  );

  /** Guard against closing the tab mid-update and losing the morning's entry. */
  useEffect(() => {
    if (!isDirty) return;
    const handler = (event: BeforeUnloadEvent) => event.preventDefault();
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [isDirty]);

  function setField<K extends keyof AdminFormValues>(key: K, value: AdminFormValues[K]) {
    setValues((current) => ({ ...current, [key]: value }));
    // Clear the error as soon as the field is touched — stale red is annoying.
    setErrors((current) => (current[key] ? { ...current, [key]: undefined } : current));
    setSaveState((current) => (current.status === "saved" ? { status: "idle" } : current));
  }

  function setStaffField(index: number, key: keyof StaffRow, value: string) {
    setValues((current) => {
      const staff = current.staff.map((member, i) =>
        i === index ? { ...member, [key]: value } : member,
      );
      return { ...current, staff };
    });
    setErrors((current) => (current.staff ? { ...current, staff: undefined } : current));
    setSaveState((current) => (current.status === "saved" ? { status: "idle" } : current));
  }

  function addStaffRow() {
    setValues((current) => ({ ...current, staff: [...current.staff, { name: "", role: "" }] }));
  }

  function removeStaffRow(index: number) {
    setValues((current) => {
      const staff = current.staff.filter((_, i) => i !== index);
      // Always leave one blank row so there is somewhere to type.
      return { ...current, staff: staff.length > 0 ? staff : [{ name: "", role: "" }] };
    });
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();

    // Client-side pass first for instant feedback.
    const parsed = saveDashboardSchema.safeParse(values);
    if (!parsed.success) {
      const fieldErrors = toFieldErrors(parsed.error);
      setErrors(fieldErrors);
      setSaveState({ status: "error", message: "Please check the highlighted fields." });
      errorSummaryRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }

    setErrors({});
    setSaveState({ status: "saving" });

    try {
      const response = await fetch("/api/dashboard", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });

      if (response.ok) {
        setSavedSnapshot(JSON.stringify(values));
        setSaveState({
          status: "saved",
          at: new Intl.DateTimeFormat("en-AU", {
            timeZone: "Australia/Sydney",
            hour: "numeric",
            minute: "2-digit",
            hour12: true,
          }).format(new Date()),
        });
        return;
      }

      if (response.status === 401) {
        setSaveState({
          status: "error",
          message: "Your session has expired. Refresh the page and sign in again.",
        });
        return;
      }

      const data = (await response.json().catch(() => ({}))) as {
        error?: string;
        fieldErrors?: FieldErrors;
      };
      if (data.fieldErrors) setErrors(data.fieldErrors);
      setSaveState({ status: "error", message: data.error ?? "Could not save. Please try again." });
      errorSummaryRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
    } catch {
      setSaveState({
        status: "error",
        message: "Could not reach the server. Your entries are still here — try again.",
      });
    }
  }

  const isSaving = saveState.status === "saving";

  return (
    <form onSubmit={handleSubmit} noValidate className="pb-40">
      <div className="mx-auto max-w-4xl space-y-6 px-5 py-8 sm:px-6 lg:py-10">
        {/* --- Today's status ------------------------------------------- */}
        <Section title="TODAY'S STATUS" Icon={CalendarDays}>
          <Field label="Dashboard date" htmlFor="dashboardDate" error={errors.dashboardDate}>
            <input
              id="dashboardDate"
              type="date"
              className="tcs-field"
              value={values.dashboardDate}
              onChange={(event) => setField("dashboardDate", event.target.value)}
              aria-invalid={errors.dashboardDate ? true : undefined}
            />
            <p className="mt-2 text-sm text-ink-faint">
              {values.dashboardDate ? formatFullDate(values.dashboardDate) : "Pick a date"}
            </p>
          </Field>

          <fieldset>
            <legend className="text-base font-semibold text-ink-soft">Overall status</legend>
            <div className="mt-3 grid gap-3 sm:grid-cols-3">
              {OVERALL_STATUSES.map((status) => {
                const isSelected = values.overallStatus === status;
                return (
                  <label
                    key={status}
                    className={`flex cursor-pointer items-center justify-center rounded-xl border px-4 py-4 text-center text-sm font-bold tracking-wide transition ${
                      isSelected
                        ? "border-gold-deep bg-gold-wash text-gold-deep"
                        : "border-rule bg-surface text-ink-muted hover:border-gold hover:text-ink-soft"
                    }`}
                  >
                    <input
                      type="radio"
                      name="overallStatus"
                      value={status}
                      checked={isSelected}
                      onChange={() => setField("overallStatus", status)}
                      className="sr-only"
                    />
                    {STATUS_LABELS[status]}
                  </label>
                );
              })}
            </div>
          </fieldset>

          <Field label="Updated by" htmlFor="updatedBy" error={errors.updatedBy}>
            <input
              id="updatedBy"
              type="text"
              className="tcs-field"
              placeholder="Your name"
              autoComplete="name"
              value={values.updatedBy}
              onChange={(event) => setField("updatedBy", event.target.value)}
              aria-invalid={errors.updatedBy ? true : undefined}
            />
          </Field>
        </Section>

        {/* --- Who's on today --------------------------------------------- */}
        <Section title="ON DECK TODAY" Icon={Users}>
          <p className="-mt-1 text-sm text-ink-muted">
            Who is in and what they are on. Shown on the warehouse screen.
          </p>

          <div className="space-y-3">
            {values.staff.map((member, index) => (
              <div key={index} className="flex items-center gap-3">
                <input
                  type="text"
                  className="tcs-field flex-1"
                  placeholder="Name"
                  aria-label={`Person ${index + 1} name`}
                  value={member.name}
                  onChange={(event) => setStaffField(index, "name", event.target.value)}
                />
                <input
                  type="text"
                  className="tcs-field flex-1"
                  placeholder="Role today"
                  aria-label={`Person ${index + 1} role`}
                  value={member.role}
                  onChange={(event) => setStaffField(index, "role", event.target.value)}
                />
                <button
                  type="button"
                  onClick={() => removeStaffRow(index)}
                  aria-label={`Remove ${member.name || `person ${index + 1}`}`}
                  className="shrink-0 rounded-lg border border-rule p-3 text-ink-muted transition hover:border-action/50 hover:text-action"
                >
                  <X className="size-4" aria-hidden="true" />
                </button>
              </div>
            ))}
          </div>

          {errors.staff ? (
            <p role="alert" className="text-sm font-medium text-action">
              {errors.staff}
            </p>
          ) : null}

          <button
            type="button"
            onClick={addStaffRow}
            className="inline-flex items-center gap-2 rounded-xl border border-rule px-4 py-3 text-sm font-semibold text-ink-soft transition hover:border-gold hover:text-ink"
          >
            <Plus className="size-4" aria-hidden="true" />
            Add another person
          </button>
        </Section>

        {/* --- Personalising --------------------------------------------- */}
        <Section title="PERSONALISING TODAY" Icon={Sparkles}>
          <Field
            label="Orders from date"
            htmlFor="personalisingOrderDate"
            error={errors.personalisingOrderDate}
            hint="The order batch production is working on today"
          >
            <input
              id="personalisingOrderDate"
              type="date"
              className="tcs-field"
              value={values.personalisingOrderDate}
              onChange={(event) => setField("personalisingOrderDate", event.target.value)}
              aria-invalid={errors.personalisingOrderDate ? true : undefined}
            />
          </Field>

          <div className="grid gap-5 sm:grid-cols-3">
            <NumberField
              label="Personalised orders"
              id="personalisedOrderCount"
              hint="Today's target"
              value={values.personalisedOrderCount}
              error={errors.personalisedOrderCount}
              onChange={(value) => setField("personalisedOrderCount", value)}
            />
            <NumberField
              label="Personalised items"
              id="personalisedItemCount"
              value={values.personalisedItemCount}
              error={errors.personalisedItemCount}
              onChange={(value) => setField("personalisedItemCount", value)}
            />
            <NumberField
              label="Non-personalised orders"
              id="nonPersonalisedOrderCount"
              value={values.nonPersonalisedOrderCount}
              error={errors.nonPersonalisedOrderCount}
              onChange={(value) => setField("nonPersonalisedOrderCount", value)}
            />
          </div>
        </Section>

        {/* --- Shipping --------------------------------------------------- */}
        <Section title="SHIPPING TODAY" Icon={Truck}>
          <Field
            label="Orders from date"
            htmlFor="shippingOrderDate"
            error={errors.shippingOrderDate}
            hint="The order batch going out the door today"
          >
            <input
              id="shippingOrderDate"
              type="date"
              className="tcs-field"
              value={values.shippingOrderDate}
              onChange={(event) => setField("shippingOrderDate", event.target.value)}
              aria-invalid={errors.shippingOrderDate ? true : undefined}
            />
          </Field>

          <div className="grid gap-5 sm:grid-cols-3">
            <NumberField
              label="Orders shipping"
              id="shippingOrderCount"
              hint="Today's target"
              value={values.shippingOrderCount}
              error={errors.shippingOrderCount}
              onChange={(value) => setField("shippingOrderCount", value)}
            />
            <NumberField
              label="Items shipping"
              id="shippingItemCount"
              value={values.shippingItemCount}
              error={errors.shippingItemCount}
              onChange={(value) => setField("shippingItemCount", value)}
            />
            <Field label="Courier cut-off" htmlFor="courierCutoff" error={errors.courierCutoff}>
              <input
                id="courierCutoff"
                type="time"
                className="tcs-field"
                value={values.courierCutoff}
                onChange={(event) => setField("courierCutoff", event.target.value)}
                aria-invalid={errors.courierCutoff ? true : undefined}
              />
            </Field>
          </div>
        </Section>

        {/* --- Exceptions ------------------------------------------------- */}
        <Section title="EXCEPTIONS" Icon={TriangleAlert}>
          <div className="grid grid-cols-2 gap-5 sm:grid-cols-4">
            <NumberField
              label="Express"
              id="expressCount"
              value={values.expressCount}
              error={errors.expressCount}
              onChange={(value) => setField("expressCount", value)}
            />
            <NumberField
              label="Priority"
              id="priorityCount"
              value={values.priorityCount}
              error={errors.priorityCount}
              onChange={(value) => setField("priorityCount", value)}
            />
            <NumberField
              label="Redos"
              id="redoCount"
              value={values.redoCount}
              error={errors.redoCount}
              onChange={(value) => setField("redoCount", value)}
            />
            <NumberField
              label="On hold"
              id="onHoldCount"
              value={values.onHoldCount}
              error={errors.onHoldCount}
              onChange={(value) => setField("onHoldCount", value)}
            />
          </div>
        </Section>

        {/* --- Heads up ---------------------------------------------------- */}
        <Section title="TODAY'S HEADS UP" Icon={Megaphone}>
          <Field
            label="Primary message"
            htmlFor="dailyMessage"
            error={errors.dailyMessage}
            hint="Shown large on the warehouse screen. One instruction per line works well."
          >
            <textarea
              id="dailyMessage"
              rows={5}
              className="tcs-field resize-y"
              placeholder="e.g. Complete express Santa sacks first. Red ribbon stock is running low."
              value={values.dailyMessage}
              onChange={(event) => setField("dailyMessage", event.target.value)}
              aria-invalid={errors.dailyMessage ? true : undefined}
            />
            <CharacterCount value={values.dailyMessage} max={600} />
          </Field>

          <Field
            label="Secondary message (optional)"
            htmlFor="secondaryMessage"
            error={errors.secondaryMessage}
          >
            <textarea
              id="secondaryMessage"
              rows={3}
              className="tcs-field resize-y"
              placeholder="Anything else the team should know"
              value={values.secondaryMessage}
              onChange={(event) => setField("secondaryMessage", event.target.value)}
              aria-invalid={errors.secondaryMessage ? true : undefined}
            />
            <CharacterCount value={values.secondaryMessage} max={400} />
          </Field>
        </Section>

        {/* --- Feedback ---------------------------------------------------- */}
        <div ref={errorSummaryRef} aria-live="polite">
          {saveState.status === "error" ? (
            <div
              role="alert"
              className="flex items-start gap-3 rounded-2xl border border-action/50 bg-action-wash p-5"
            >
              <TriangleAlert className="mt-0.5 size-5 shrink-0 text-action" aria-hidden="true" />
              <p className="font-medium text-ink">{saveState.message}</p>
            </div>
          ) : null}

          {saveState.status === "saved" ? (
            <div className="rounded-2xl border border-ontrack/45 bg-ontrack-wash p-5">
              <p className="flex items-center gap-3 font-semibold text-ontrack">
                <Check className="size-5 shrink-0" aria-hidden="true" />
                Published at {saveState.at}. The warehouse screen will update within 20 seconds.
              </p>
              <Link
                href="/"
                className="mt-4 inline-flex items-center gap-2 rounded-xl border border-ontrack/45 px-5 py-3 font-bold tracking-wide text-ontrack transition hover:bg-ontrack-wash"
              >
                VIEW WAREHOUSE DASHBOARD
                <ArrowRight className="size-4" aria-hidden="true" />
              </Link>
            </div>
          ) : null}
        </div>
      </div>

      {/* Sticky publish bar — always reachable, on mobile too. */}
      <div className="fixed inset-x-0 bottom-0 border-t border-rule bg-ivory/95 backdrop-blur">
        <div className="mx-auto flex max-w-4xl items-center gap-4 px-5 py-4 sm:px-6">
          <p className="hidden flex-1 text-sm text-ink-faint sm:block">
            {isDirty ? "Unsaved changes" : saveState.status === "saved" ? "All changes published" : "No changes yet"}
          </p>
          <button
            type="submit"
            disabled={isSaving}
            className="flex-1 rounded-xl bg-ink px-6 py-4 text-base font-bold tracking-wide text-white transition hover:bg-gold-deep disabled:cursor-not-allowed disabled:opacity-60 sm:flex-none sm:px-10"
          >
            {isSaving
              ? "PUBLISHING…"
              : isToday
                ? "PUBLISH TODAY'S DASHBOARD"
                : "SAVE CHANGES"}
          </button>
        </div>
      </div>
    </form>
  );
}

/* -------------------------------------------------------------------------- */
/* Small form primitives                                                       */
/* -------------------------------------------------------------------------- */

function Section({
  title,
  Icon,
  children,
}: {
  title: string;
  Icon: React.ComponentType<{ className?: string; "aria-hidden"?: boolean }>;
  children: React.ReactNode;
}) {
  return (
    <section className="tcs-panel rounded-3xl p-6 sm:p-8">
      <h2 className="flex items-center gap-3 text-sm font-bold uppercase tracking-[0.22em] text-gold-deep">
        <Icon className="size-5 shrink-0" aria-hidden={true} />
        {title}
      </h2>
      <div className="mt-6 space-y-5">{children}</div>
    </section>
  );
}

function Field({
  label,
  htmlFor,
  error,
  hint,
  children,
}: {
  label: string;
  htmlFor: string;
  error?: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label htmlFor={htmlFor} className="block text-base font-semibold text-ink-soft">
        {label}
      </label>
      {hint ? <p className="mt-1 text-sm text-ink-faint">{hint}</p> : null}
      <div className="mt-2">{children}</div>
      {error ? (
        <p role="alert" className="mt-2 text-sm font-medium text-action">
          {error}
        </p>
      ) : null}
    </div>
  );
}

/**
 * Number entry tuned for fast keyboard/keypad use: numeric keyboard on mobile,
 * no scroll-wheel surprises, and blank stays blank (never coerced to 0).
 */
function NumberField({
  label,
  id,
  value,
  error,
  hint,
  onChange,
}: {
  label: string;
  id: string;
  value: string;
  error?: string;
  hint?: string;
  onChange: (value: string) => void;
}) {
  return (
    <Field label={label} htmlFor={id} error={error} hint={hint}>
      <input
        id={id}
        type="number"
        inputMode="numeric"
        min={0}
        step={1}
        placeholder="—"
        className="tcs-field text-2xl font-bold [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        // Stops an accidental wheel scroll silently changing a published count.
        onWheel={(event) => event.currentTarget.blur()}
        aria-invalid={error ? true : undefined}
      />
    </Field>
  );
}

function CharacterCount({ value, max }: { value: string; max: number }) {
  const remaining = max - value.length;
  if (remaining > max * 0.25) return null;
  return (
    <p className={`mt-1.5 text-sm ${remaining < 0 ? "text-action" : "text-ink-faint"}`}>
      {remaining < 0 ? `${Math.abs(remaining)} characters over the limit` : `${remaining} characters left`}
    </p>
  );
}
